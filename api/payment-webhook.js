
const { createClient } = require('@supabase/supabase-js');

function createSupabaseAdmin() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase service credentials are not configured.');
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function parseRequestBody(body) {
    if (!body) return {};
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (err) {
            console.error('Failed to parse webhook body:', err);
            return {};
        }
    }
    return body;
}

async function processSucceededPayment(notification) {
    console.log('--- НАЧАЛО ОБРАБОТКИ УСПЕШНОГО ПЛАТЕЖА (v3) ---');
    const payment = notification.object;
    const metadata = payment.metadata || {};
    const { userId, tariffId, payment_type } = metadata; // Добавили payment_type
    const paymentAmount = Number.parseFloat(payment.amount?.value ?? '0');
    const yookassaPaymentId = payment.id;

    const supabaseAdmin = createSupabaseAdmin();
    // +++ ВСТАВИТЬ ЭТОТ БЛОК +++
    // =================================================================
    // === ШАГ 1: ВСЕГДА ПРОВЕРЯЕМ И СОХРАНЯЕМ НОВЫЙ МЕТОД ОПЛАТЫ ===
    // =================================================================
    if (payment.payment_method?.saved && userId) {
        console.log(`[СОХРАНЕНИЕ МЕТОДА] Обнаружен новый сохраненный метод для userId: ${userId}`);
        const paymentMethodId = payment.payment_method.id;
        const paymentMethodDetails = payment.payment_method;

        const { data: clientData } = await supabaseAdmin.from('clients').select('extra').eq('id', userId).single();
        const extra = clientData.extra || {};
        extra.payment_method_details = paymentMethodDetails;

        const { error } = await supabaseAdmin
            .from('clients')
            .update({
                yookassa_payment_method_id: paymentMethodId,
                autopay_enabled: true,
                extra: extra
            })
            .eq('id', userId);

        if (error) {
            console.error(`[СОХРАНЕНИЕ МЕТОДА] Ошибка сохранения для userId ${userId}:`, error.message);
        } else {
            console.log(`[СОХРАНЕНИЕ МЕТОДА] Метод ${paymentMethodId} успешно сохранен для userId ${userId}.`);
        }
    }

    // Если это был платеж чисто для привязки карты, просто завершаем.
    if (payment_type === 'save_card') {
        console.log('[ЗАВЕРШЕНИЕ] Это был платеж только для привязки карты. Обработка завершена.');
        return;
    }

    // --- Логика для аренды (если есть tariffId) ---
    if (tariffId) {
        console.log(`[АРЕНДА] userId: ${userId}, tariffId: ${tariffId}`);

        // 1. Найти случайный свободный велосипед с нужным тарифом
        console.log(`[АРЕНДА] Поиск свободного велосипеда для тарифа ${tariffId}...`);
        const { data: availableBikes, error: bikesError } = await supabaseAdmin
            .from('bikes')
            .select('id')
            .eq('status', 'available')
            .eq('tariff_id', tariffId);

        if (bikesError) throw new Error(`Ошибка при поиске велосипедов: ${bikesError.message}`);

        if (!availableBikes || availableBikes.length === 0) {
            console.error(`[КРИТИЧЕСКАЯ ОШИБКА] Нет свободных велосипедов для тарифа ${tariffId}! Инициирую возврат.`);
            // Если велосипедов нет, нужно вернуть деньги
            const auth = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64');
            await fetch('https://api.yookassa.ru/v3/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, 'Idempotence-Key': crypto.randomUUID() },
                body: JSON.stringify({ payment_id: yookassaPaymentId, amount: { value: paymentAmount.toFixed(2), currency: 'RUB' }, description: 'Нет свободных велосипедов' })
            });
            // Отправляем уведомление пользователю
            const { data: client } = await supabaseAdmin.from('clients').select('extra').eq('id', userId).single();
            if (client?.extra?.telegram_user_id) {
                await sendTelegramMessage(client.extra.telegram_user_id, '❌ К сожалению, все велосипеды по вашему тарифу оказались заняты. Мы уже оформили полный возврат средств.');
            }
            throw new Error(`Нет свободных велосипедов для тарифа ${tariffId}. Платеж ${yookassaPaymentId} будет возвращен.`);
        }

        const randomBike = availableBikes[Math.floor(Math.random() * availableBikes.length)];
        const bikeId = randomBike.id;
        console.log(`[АРЕНДА] Найден и выбран велосипед #${bikeId}`);

        // 2. Обновить статус велосипеда на 'rented'
        const { error: bikeUpdateError } = await supabaseAdmin.from('bikes').update({ status: 'rented' }).eq('id', bikeId);
        if (bikeUpdateError) throw new Error(`Не удалось обновить статус велосипеда #${bikeId}: ${bikeUpdateError.message}`);
        console.log(`[АРЕНДА] Статус велосипеда #${bikeId} обновлен на 'rented'.`);

        // 3. Создать запись об аренде со статусом 'awaiting_contract_signing'
        const { data: tariffData } = await supabaseAdmin.from('tariffs').select('duration_days').eq('id', tariffId).single();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (tariffData?.duration_days || 7));

        const { data: newRental, error: rentalError } = await supabaseAdmin
            .from('rentals')
            .insert({
                user_id: userId,
                bike_id: bikeId,
                tariff_id: tariffId,
                starts_at: startDate.toISOString(),
                current_period_ends_at: endDate.toISOString(),
                status: 'awaiting_contract_signing', // Новый статус!
                total_paid_rub: paymentAmount
            })
            .select('id')
            .single();

        if (rentalError) {
            // Откатываем статус велосипеда, если не удалось создать аренду
            await supabaseAdmin.from('bikes').update({ status: 'available' }).eq('id', bikeId);
            throw new Error(`Не удалось создать аренду: ${rentalError.message}`);
        }
        console.log(`[АРЕНДА] Создана аренда #${newRental.id} со статусом 'awaiting_contract_signing'.`);

        // 4. Записать платеж в историю
        const { error: paymentError } = await supabaseAdmin.from('payments').insert({
            client_id: userId,
            rental_id: newRental.id,
            amount_rub: paymentAmount,
            status: 'succeeded',
            payment_type: 'initial',
            yookassa_payment_id: yookassaPaymentId
        });
        if (paymentError) throw new Error(`Не удалось записать платеж: ${paymentError.message}`);

        console.log(`[АРЕНДА] Платеж ${yookassaPaymentId} успешно обработан и связан с арендой #${newRental.id}.`);
        return; // Завершаем после обработки аренды
    }

    // --- Логика для стандартных пополнений (если это не аренда и не привязка карты) ---
    console.log(`Платеж ${yookassaPaymentId} обрабатывается как пополнение баланса.`);
    if (!userId) {
        console.warn('Webhook lacked userId metadata; skipping balance update.');
        return;
    }

    const { error: balanceError } = await supabaseAdmin.rpc('add_to_balance', {
        client_id_to_update: userId,
        amount_to_add: paymentAmount
    });

    if (balanceError) console.error(`Failed to credit balance for client ${userId}:`, balanceError.message);

    await supabaseAdmin.from('payments').insert({
        client_id: userId,
        amount_rub: paymentAmount,
        status: 'succeeded',
        payment_type: 'top-up',
        yookassa_payment_id: yookassaPaymentId
    });
}
async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const notification = parseRequestBody(req.body);

        if (notification.event !== 'payment.succeeded' || notification.object?.status !== 'succeeded') {
            res.status(200).send('OK. Event ignored.');
            return;
        }

        await processSucceededPayment(notification);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = handler;
module.exports.default = handler;
