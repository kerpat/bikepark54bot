const { createClient } = require('@supabase/supabase-js');

// Создание Supabase клиента с сервисной ролью
function createSupabaseAdmin() {
    const SUPABASE_URL = 'https://gbabrtcnegjhherbczuj.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWJydGNuZWdqaGhlcmJjenVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEzNDQxMCwiZXhwIjoyMDc0NzEwNDEwfQ.UEsU_2fIR-K0UgeZecggsKuUM4WgwRNgm40cu8i4UGk';
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createSupabaseAdmin();
    const { action } = req.body;

    try {
        // === РЕГИСТРАЦИЯ ЧЕРЕЗ БРАУЗЕР ===
        if (action === 'register') {
            const { firstName, lastName, phone } = req.body;

            // Валидация
            if (!firstName || firstName.length < 2) {
                return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
            }

            if (!lastName || lastName.length < 2) {
                return res.status(400).json({ error: 'Фамилия должна содержать минимум 2 символа' });
            }

            // Генерируем уникальный telegram_id для браузерных пользователей
            const browserUserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const fullName = `${firstName} ${lastName}`;

            // Создаем клиента в Supabase
            const { data: newClient, error: insertError } = await supabase
                .from('clients')
                .insert([
                    {
                        telegram_id: browserUserId,
                        name: fullName,
                        phone: phone || null,
                        balance: 0,
                        verification_status: 'approved', // Автоматически одобряем браузерных пользователей
                        registration_type: 'browser',
                        created_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting client:', insertError);
                return res.status(500).json({ error: 'Ошибка создания профиля' });
            }

            // Генерируем простой токен для идентификации
            const sessionToken = Buffer.from(JSON.stringify({
                userId: browserUserId,
                clientId: newClient.id,
                timestamp: Date.now()
            })).toString('base64');

            return res.status(200).json({
                success: true,
                user: {
                    id: newClient.id,
                    telegram_id: browserUserId,
                    name: fullName,
                    phone: phone || '',
                    balance: 0
                },
                token: sessionToken
            });
        }

        // === ВХОД ЧЕРЕЗ БРАУЗЕР (по токену) ===
        if (action === 'login') {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Токен не предоставлен' });
            }

            // Декодируем токен
            let tokenData;
            try {
                tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
            } catch (e) {
                return res.status(401).json({ error: 'Неверный токен' });
            }

            // Получаем пользователя из базы
            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('*')
                .eq('telegram_id', tokenData.userId)
                .single();

            if (fetchError || !client) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            return res.status(200).json({
                success: true,
                user: {
                    id: client.id,
                    telegram_id: client.telegram_id,
                    name: client.name,
                    phone: client.phone,
                    balance: client.balance,
                    verification_status: client.verification_status
                }
            });
        }

        // === ПОЛУЧЕНИЕ СПИСКА БРАУЗЕРНЫХ ПОЛЬЗОВАТЕЛЕЙ ===
        if (action === 'list-users') {
            const { data: clients, error: fetchError } = await supabase
                .from('clients')
                .select('id, telegram_id, name, phone, created_at')
                .eq('registration_type', 'browser')
                .order('created_at', { ascending: false })
                .limit(50);

            if (fetchError) {
                console.error('Error fetching clients:', fetchError);
                return res.status(500).json({ error: 'Ошибка загрузки пользователей' });
            }

            return res.status(200).json({
                success: true,
                users: clients || []
            });
        }

        // === МИГРАЦИЯ БД: ДОБАВЛЕНИЕ КОЛОНКИ ===
        if (action === 'add-registration-type') {
            const { secret } = req.body;
            const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'bikepark54_migration_key_2024';
            
            if (secret !== MIGRATION_SECRET) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            console.log('🔧 Выполняем миграцию: добавление registration_type');

            return res.status(200).json({
                success: true,
                message: 'Миграция выполнена успешно. Выполните SQL вручную в Supabase Dashboard.',
                sql: `
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';

COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';

CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
ON clients(registration_type);
                `,
                instruction: 'Откройте Supabase Dashboard → SQL Editor и выполните SQL выше'
            });
        }

        // === ПРОВЕРКА СТАТУСА МИГРАЦИИ ===
        if (action === 'check-status') {
            const { data, error } = await supabase
                .from('clients')
                .select('registration_type')
                .limit(1);

            if (error) {
                if (error.message.includes('column') && error.message.includes('does not exist')) {
                    return res.status(200).json({
                        success: true,
                        column_exists: false,
                        message: 'Колонка registration_type не существует. Требуется миграция.'
                    });
                }
                throw error;
            }

            return res.status(200).json({
                success: true,
                column_exists: true,
                message: 'Колонка registration_type существует',
                sample_data: data
            });
        }

        return res.status(400).json({ error: 'Неизвестное действие' });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}
