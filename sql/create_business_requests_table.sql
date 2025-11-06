-- Создание таблицы для заявок от бизнеса
CREATE TABLE IF NOT EXISTS public.business_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    contact_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    inn TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    industry TEXT NOT NULL,
    fleet_size TEXT NOT NULL,
    purpose TEXT NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_business_requests_status ON public.business_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_requests_created_at ON public.business_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_requests_user_id ON public.business_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_business_requests_company_name ON public.business_requests(company_name);

-- Включение Row Level Security
ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи могут создавать свои заявки
CREATE POLICY "Users can insert their own business requests"
ON public.business_requests
FOR INSERT
WITH CHECK (true);

-- Политика: Пользователи могут просматривать свои заявки
CREATE POLICY "Users can view their own business requests"
ON public.business_requests
FOR SELECT
USING (auth.uid()::text = user_id OR auth.role() = 'authenticated');

-- Политика: Админы могут просматривать все заявки
CREATE POLICY "Admins can view all business requests"
ON public.business_requests
FOR SELECT
USING (true);

-- Политика: Админы могут обновлять статус заявок
CREATE POLICY "Admins can update business request status"
ON public.business_requests
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_business_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
CREATE TRIGGER update_business_requests_updated_at_trigger
BEFORE UPDATE ON public.business_requests
FOR EACH ROW
EXECUTE FUNCTION update_business_requests_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.business_requests IS 'Заявки от бизнеса на корпоративную аренду велосипедов';
COMMENT ON COLUMN public.business_requests.user_id IS 'ID пользователя, отправившего заявку';
COMMENT ON COLUMN public.business_requests.status IS 'Статус заявки: pending, approved, rejected';
COMMENT ON COLUMN public.business_requests.fleet_size IS 'Планируемый размер парка велосипедов';
COMMENT ON COLUMN public.business_requests.purpose IS 'Цель аренды (для курьеров, сотрудников и т.д.)';
