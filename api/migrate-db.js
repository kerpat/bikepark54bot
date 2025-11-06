import { createClient } from '@supabase/supabase-js';

// Создание Supabase клиента с сервисной ролью
function createSupabaseAdmin() {
    const SUPABASE_URL = 'https://gbabrtcnegjhherbczuj.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWJydGNuZWdqaGhlcmJjenVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEzNDQxMCwiZXhwIjoyMDc0NzEwNDEwfQ.UEsU_2fIR-K0UgeZecggsKuUM4WgwRNgm40cu8i4UGk';
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createSupabaseAdmin();
    const { action, secret } = req.body;

    // Простая защита - требуем секретный ключ
    const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'bikepark54_migration_key_2024';
    if (secret !== MIGRATION_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        if (action === 'add-registration-type') {
            console.log('🔧 Выполняем миграцию: добавление registration_type');

            // Выполняем SQL напрямую через Supabase
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: `
                    ALTER TABLE clients 
                    ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';
                    
                    COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';
                    
                    CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
                    ON clients(registration_type);
                `
            });

            if (error) {
                // Если RPC функция не существует, пробуем альтернативный метод
                console.error('RPC error:', error);
                console.log('📝 Пробуем альтернативный метод через REST API...');

                // Используем REST API напрямую
                const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabase.supabaseKey,
                        'Authorization': `Bearer ${supabase.supabaseKey}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        query: `
                            DO $$ 
                            BEGIN
                                IF NOT EXISTS (
                                    SELECT 1 FROM information_schema.columns 
                                    WHERE table_name = 'clients' 
                                    AND column_name = 'registration_type'
                                ) THEN
                                    ALTER TABLE clients 
                                    ADD COLUMN registration_type TEXT DEFAULT 'telegram';
                                    
                                    COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';
                                END IF;

                                CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
                                ON clients(registration_type);
                            END $$;
                        `
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to execute migration via REST API');
                }

                return res.status(200).json({
                    success: true,
                    message: 'Миграция выполнена успешно (через REST API)',
                    details: {
                        column_added: true,
                        index_created: true
                    }
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Миграция выполнена успешно',
                details: {
                    column_added: true,
                    index_created: true,
                    data: data
                }
            });
        }

        if (action === 'check-status') {
            // Проверяем, существует ли колонка
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
        console.error('Migration error:', error);
        return res.status(500).json({ 
            error: 'Ошибка миграции', 
            details: error.message,
            instruction: 'Выполните SQL вручную в Supabase Dashboard → SQL Editor'
        });
    }
}
