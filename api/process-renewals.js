
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const crypto = require('crypto');

function createSupabaseAdmin() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase service credentials are not configured.');
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function processRenewals() {
    const supabaseAdmin = createSupabaseAdmin();
    const today = new Date().toISOString();

    const { data: rentalsToRenew = [], error: rentalsError } = await supabaseAdmin
        .from('rentals')
        .select(`
            id,
            user_id,
            total_paid_rub,
            clients ( yookassa_payment_method_id ),
            tariffs ( price_rub, duration_days )
        `)
        .eq('status', 'active')
        .lte('current_period_ends_at', today);

    if (rentalsError) throw new Error('Failed to load rentals: ' + rentalsError.message);

    if (!rentalsToRenew.length) {
        return { processed: 0, overdue: 0 };
    }

    let overdueCount = 0;

    for (const rental of rentalsToRenew) {
        const { id: rentalId, clients, tariffs } = rental;
        const paymentMethodId = clients?.yookassa_payment_method_id;
        const renewalAmount = tariffs?.price_rub;
        const rentalDuration = tariffs?.duration_days;

        if (!paymentMethodId || !renewalAmount || !rentalDuration) {
            console.warn(`Rental #${rentalId}: missing payment method or tariff data.`);
            await supabaseAdmin.from('rentals').update({ status: 'overdue' }).eq('id', rentalId);
            overdueCount += 1;
            continue;
        }

        const idempotenceKey = crypto.randomUUID();
        const authString = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64');

        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': idempotenceKey,
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify({
                amount: { value: renewalAmount.toFixed(2), currency: 'RUB' },
                capture: true,
                payment_method_id: paymentMethodId,
                description: `Rental renewal #${rentalId}`
            })
        });

        const paymentResult = await response.json();

        if (response.ok && paymentResult.status === 'succeeded') {
            console.log(`Renewed rental #${rentalId}.`);

            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + rentalDuration);

            await supabaseAdmin
                .from('rentals')
                .update({
                    current_period_ends_at: newEndDate.toISOString(),
                    total_paid_rub: (rental.total_paid_rub || 0) + renewalAmount
                })
                .eq('id', rentalId);

            await supabaseAdmin.from('payments').insert({
                rental_id: rentalId,
                client_id: rental.user_id,
                amount_rub: renewalAmount,
                status: 'succeeded',
                payment_type: 'renewal',
                yookassa_payment_id: paymentResult.id
            });
        } else {
            console.error(`Failed to renew rental #${rentalId}:`, paymentResult);
            overdueCount += 1;

            await supabaseAdmin.from('rentals').update({ status: 'overdue' }).eq('id', rentalId);

            await supabaseAdmin.from('payments').insert({
                rental_id: rentalId,
                client_id: rental.user_id,
                amount_rub: renewalAmount,
                status: 'failed',
                payment_type: 'renewal',
                yookassa_payment_id: paymentResult.id || `failed-${idempotenceKey}`
            });
        }
    }

    return { processed: rentalsToRenew.length, overdue: overdueCount };
}

async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const result = await processRenewals();
        res.status(200).json({ message: 'Renewals processed.', ...result });
    } catch (error) {
        console.error('Renewal function error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = handler;
module.exports.default = handler;
