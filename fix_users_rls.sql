-- Corrigir recursão infinita nas políticas RLS da tabela users
-- Execute este SQL no painel do Supabase

BEGIN;

-- 1. Desabilitar RLS temporariamente na tabela users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes da tabela users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Public read access" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on auth_id" ON public.users;

-- 3. Reabilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas simples e seguras (sem recursão)

-- Política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth_id = auth.uid());

-- Política para usuários atualizarem apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth_id = auth.uid());

-- Política para inserção de novos usuários (durante registro)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Política para admins (usando uma abordagem mais simples)
-- Nota: Esta política assume que admins têm is_admin = true
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (is_admin = true);

-- 5. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

COMMIT;

-- Teste: Verificar se a consulta funciona sem recursão
-- SELECT id, auth_id, email FROM public.users WHERE auth_id = auth.uid() LIMIT 1;