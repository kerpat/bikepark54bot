# 🔧 Руководство по миграции БД

## Добавление колонки `registration_type`

Для работы браузерной регистрации нужно добавить колонку `registration_type` в таблицу `clients`.

## 🚀 Способы выполнения миграции

### Способ 1: Через веб-интерфейс (САМЫЙ ПРОСТОЙ) ✨

1. Откройте в браузере:
   ```
   https://ваш-домен.vercel.app/migrate.html
   ```
   
   Или локально:
   ```
   http://localhost:8000/migrate.html
   ```

2. Нажмите кнопку **"Проверить статус"**

3. Если колонка не существует, нажмите **"Выполнить миграцию"**

4. Готово! ✅

**Секретный ключ по умолчанию:** `bikepark54_migration_key_2024`

---

### Способ 2: Через npm скрипт

1. Откройте терминал в папке проекта

2. Выполните команду:
   ```bash
   npm run migrate
   ```

3. Скрипт автоматически:
   - Проверит существование колонки
   - Добавит её если нужно
   - Создаст индекс
   - Покажет результат

---

### Способ 3: Через Supabase Dashboard (ручной)

1. Откройте [Supabase Dashboard](https://app.supabase.com)

2. Выберите проект **gbabrtcnegjhherbczuj**

3. Перейдите в **SQL Editor** (слева в меню)

4. Создайте новый запрос

5. Вставьте и выполните:

```sql
-- Добавляем колонку
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'telegram';

-- Добавляем комментарий
COMMENT ON COLUMN clients.registration_type IS 'Тип регистрации: telegram или browser';

-- Создаем индекс
CREATE INDEX IF NOT EXISTS idx_clients_registration_type 
ON clients(registration_type);
```

6. Нажмите **Run** или `F5`

---

### Способ 4: Через API endpoint

```bash
curl -X POST https://ваш-домен.vercel.app/api/migrate-db \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-registration-type",
    "secret": "bikepark54_migration_key_2024"
  }'
```

---

## ✅ Проверка результата

### Через веб-интерфейс:
Откройте `migrate.html` и нажмите "Проверить статус"

### Через SQL:
```sql
-- Проверить структуру таблицы
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'registration_type';

-- Проверить данные
SELECT id, telegram_id, name, registration_type 
FROM clients 
LIMIT 10;
```

### Через код:
```javascript
const { data, error } = await supabase
  .from('clients')
  .select('registration_type')
  .limit(1);

if (error) {
  console.log('Колонка не существует');
} else {
  console.log('Колонка существует!');
}
```

---

## 🗄️ Структура после миграции

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX idx_clients_registration_type ON clients(registration_type);
```

---

## 📊 Примеры данных

### Telegram пользователь:
```json
{
  "telegram_id": "123456789",
  "name": "Иван Петров",
  "registration_type": "telegram"
}
```

### Браузерный пользователь:
```json
{
  "telegram_id": "browser_1730923456789_xk2j5n",
  "name": "Петр Сидоров",
  "registration_type": "browser"
}
```

---

## 🆘 Устранение неполадок

### Ошибка: "permission denied"
**Решение:** Убедитесь, что используете Service Role Key, а не Anon Key

### Ошибка: "column already exists"
**Решение:** Миграция уже выполнена, всё OK!

### Ошибка: "relation does not exist"
**Решение:** Убедитесь, что таблица `clients` существует в БД

### Веб-интерфейс не работает
**Решение:** Используйте ручной способ через Supabase Dashboard

---

## 📝 Откат миграции (если нужно)

```sql
-- Удалить колонку (осторожно!)
ALTER TABLE clients DROP COLUMN IF EXISTS registration_type;

-- Удалить индекс
DROP INDEX IF EXISTS idx_clients_registration_type;
```

⚠️ **Внимание:** Откат удалит все данные о типе регистрации!

---

## ✨ После миграции

1. ✅ Браузерная регистрация будет работать
2. ✅ Пользователи из браузера попадут в Supabase
3. ✅ Можно различать Telegram и браузерных пользователей
4. ✅ API `/api/browser-auth` будет функционировать

**Готово! Теперь можно регистрироваться через браузер! 🎉**
