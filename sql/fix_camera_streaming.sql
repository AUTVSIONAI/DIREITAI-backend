-- 1. Add politician_id to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS politician_id UUID REFERENCES public.politicians(id);

-- 2. Add user_id to politicians table if it doesn't exist
ALTER TABLE public.politicians ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- 3. Link 'Padre Kelmon' user to politician profile
UPDATE public.users 
SET politician_id = 'e4adb343-59ed-43fc-91d8-bdc313c3e7aa'
WHERE email = 'deppadrekelmon@direitai.com';

UPDATE public.politicians 
SET user_id = (SELECT id FROM public.users WHERE email = 'deppadrekelmon@direitai.com' LIMIT 1)
WHERE id = 'e4adb343-59ed-43fc-91d8-bdc313c3e7aa';
