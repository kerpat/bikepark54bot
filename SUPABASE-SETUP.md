# 🗄️ Настройка Supabase для браузерных пользователей

## 📋 Требуемые изменения в таблице `clients`

Для работы браузерной регистрации нужно добавить колонку `registration_type` в таблицу `clients`.

### SQL запрос для добавления колонки:

```sql
-- Добавляем колонку registration_type
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';

-- Добавляем комментарий для документации
COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';

-- (Опционально) Создаем индекс для быстрого поиска браузерных пользователей
CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
ON clients(registration_type);
```

### Как выполнить в Supabase Studio:

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект **gbabrtcnegjhherbczuj**
3. Перейдите в **SQL Editor** (слева в меню)
4. Создайте новый запрос
5. Вставьте SQL код выше
6. Нажмите **Run** (или F5)

## ✅ Проверка

После выполнения запроса проверьте:

1. Перейдите в **Table Editor** → **clients**
2. Убедитесь, что появилась колонка `registration_type`
3. Значение по умолчанию должно быть `telegram`

## 🔍 Структура таблицы `clients` (финальная)

```sql
CREATE TABLE clients (
  id BIGSERIAL PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  registration_type TEXT DEFAULT 'telegram',  -- НОВАЯ КОЛОНКА
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- другие существующие колонки...
);
```

## 📊 Примеры данных

### Telegram пользователь:
```json
{
  "id": 1,
  "telegram_id": "123456789",
  "name": "Иван Петров",
  "phone": "+79001234567",
  "balance": 500,
  "verification_status": "approved",
  "registration_type": "telegram"
}
```

### Браузерный пользователь:
```json
{
  "id": 2,
  "telegram_id": "browser_1730923456789_xk2j5n",
  "name": "Петр Сидоров",
  "phone": "+79007654321",
  "balance": 0,
  "verification_status": "approved",
  "registration_type": "browser"
}
```

## 🔐 Права доступа (RLS)

Убедитесь, что у Service Role есть полный доступ к таблице `clients`:

```sql
-- Проверьте существующие политики
SELECT * FROM pg_policies WHERE tablename = 'clients';

-- Service Role должен иметь полный доступ
-- (обычно уже настроено по умолчанию)
```

## 🚀 После настройки

После выполнения SQL запроса:

1. ✅ API `/api/browser-auth` сможет создавать браузерных пользователей
2. ✅ Данные будут сохраняться в Supabase
3. ✅ Пользователи смогут регистрироваться через браузер
4. ✅ Список пользователей будет загружаться из базы данных

## 🆘 Проблемы?

### Ошибка: "column 'registration_type' does not exist"

Выполните SQL запрос для добавления колонки.

### Ошибка: "permission denied"

Убедитесь, что используете Service Role Key, а не Anon Key в API.

### Браузерные пользователи не отображаются

Проверьте фильтр в запросе:
```sql
SELECT * FROM clients WHERE registration_type = 'browser';
```

## 📝 Дополнительные улучшения (опционально)

### Добавить email:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE email IS NOT NULL;
```

### Добавить последний вход:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
```

### Добавить аватар:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```
