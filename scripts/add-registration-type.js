/**
 * Скрипт для добавления колонки registration_type в таблицу clients
 * Запуск: node scripts/add-registration-type.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gbabrtcnegjhherbczuj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWJydGNuZWdqaGhlcmJjenVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEzNDQxMCwiZXhwIjoyMDc0NzEwNDEwfQ.UEsU_2fIR-K0UgeZecggsKuUM4WgwRNgm40cu8i4UGk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🔧 Начинаем миграцию...\n');

    try {
        // Шаг 1: Проверяем, существует ли колонка
        console.log('📋 Шаг 1: Проверка существования колонки...');
        
        const { data: checkData, error: checkError } = await supabase
            .from('clients')
            .select('registration_type')
            .limit(1);

        if (checkError) {
            if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
                console.log('⚠️  Колонка registration_type не существует. Продолжаем миграцию.\n');
            } else {
                throw checkError;
            }
        } else {
            console.log('✅ Колонка registration_type уже существует!');
            console.log('ℹ️  Миграция не требуется.\n');
            return;
        }

        // Шаг 2: Выполняем SQL через raw query
        console.log('📋 Шаг 2: Добавление колонки registration_type...');
        
        // Используем fetch для выполнения SQL напрямую
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
                query: `
                    DO $$ 
                    BEGIN
                        -- Добавляем колонку если не существует
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'clients' 
                            AND column_name = 'registration_type'
                        ) THEN
                            ALTER TABLE clients 
                            ADD COLUMN registration_type TEXT DEFAULT 'telegram';
                            
                            COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';
                            
                            RAISE NOTICE 'Колонка registration_type добавлена';
                        ELSE
                            RAISE NOTICE 'Колонка registration_type уже существует';
                        END IF;

                        -- Создаем индекс
                        CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
                        ON clients(registration_type);
                        
                        RAISE NOTICE 'Индекс idx_clients_registration_type создан';
                    END $$;
                `
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка выполнения SQL:', errorText);
            console.log('\n📝 Попробуйте выполнить SQL вручную в Supabase Dashboard:\n');
            console.log(`
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';

COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';

CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
ON clients(registration_type);
            `);
            return;
        }

        console.log('✅ SQL выполнен успешно!\n');

        // Шаг 3: Проверяем результат
        console.log('📋 Шаг 3: Проверка результата...');
        
        const { data: verifyData, error: verifyError } = await supabase
            .from('clients')
            .select('id, telegram_id, name, registration_type')
            .limit(5);

        if (verifyError) {
            throw verifyError;
        }

        console.log('✅ Колонка успешно добавлена!');
        console.log('\n📊 Пример данных:');
        console.table(verifyData);

        // Шаг 4: Обновляем существующие записи
        console.log('\n📋 Шаг 4: Установка типа регистрации для существующих пользователей...');
        
        const { data: updateData, error: updateError } = await supabase
            .from('clients')
            .update({ registration_type: 'telegram' })
            .is('registration_type', null)
            .select();

        if (updateError) {
            console.warn('⚠️  Предупреждение при обновлении:', updateError.message);
        } else if (updateData && updateData.length > 0) {
            console.log(`✅ Обновлено ${updateData.length} существующих записей`);
        } else {
            console.log('ℹ️  Все записи уже имеют тип регистрации');
        }

        console.log('\n✨ Миграция завершена успешно!');
        console.log('✅ Теперь браузерная регистрация будет работать корректно.\n');

    } catch (error) {
        console.error('\n❌ Ошибка миграции:', error.message);
        console.log('\n📝 Выполните SQL вручную в Supabase Dashboard → SQL Editor:\n');
        console.log(`
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';

COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';

CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
ON clients(registration_type);
        `);
        process.exit(1);
    }
}

main();
