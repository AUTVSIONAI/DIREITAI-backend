-- Corrigir foreign key da tabela user_goals
-- Execute este SQL no painel do Supabase

-- 1. Remover a constraint existente
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;

-- 2. Adicionar nova constraint referenciando public.users
ALTER TABLE user_goals ADD CONSTRAINT user_goals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Atualizar as políticas RLS para usar public.users
DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON user_goals;

-- 4. Criar novas políticas usando public.users
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own goals" ON user_goals
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own goals" ON user_goals
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- 5. Política para admins
CREATE POLICY "Admins can manage all goals" ON user_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() AND is_admin = true
        )
    );

COMMIT;