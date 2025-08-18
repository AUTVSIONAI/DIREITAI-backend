-- Script SQL para corrigir manualmente a foreign key da tabela user_goals
-- Execute este script no Supabase Dashboard > SQL Editor

-- PASSO 0: Limpar metas órfãs ANTES de corrigir a foreign key
-- (Metas que referenciam user_ids que não existem na tabela users)
DELETE FROM user_goals WHERE user_id = '0155ccb7-e67f-41dc-a133-188f97996b73';

-- PASSO 1: Remover a constraint existente que referencia auth.users
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;

-- PASSO 2: Adicionar nova constraint que referencia public.users(id)
ALTER TABLE user_goals 
ADD CONSTRAINT user_goals_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 3. Verificar se a constraint foi criada corretamente
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_goals'
    AND kcu.column_name = 'user_id';

-- 4. Atualizar políticas RLS se necessário
-- (Opcional) Remover políticas antigas que referenciam auth.users
DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;

-- (Opcional) Criar novas políticas que referenciam public.users
CREATE POLICY "Users can view their own goals" ON user_goals
    FOR SELECT USING (user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own goals" ON user_goals
    FOR INSERT WITH CHECK (user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
    ));

CREATE POLICY "Users can update their own goals" ON user_goals
    FOR UPDATE USING (user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own goals" ON user_goals
    FOR DELETE USING (user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
    ));

-- 5. Política para administradores (opcional)
CREATE POLICY "Admins can manage all goals" ON user_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 6. Teste final - inserir uma meta de teste com ID válido
INSERT INTO user_goals (
    user_id,
    goal_type,
    target_value,
    period_start,
    period_end,
    status
) VALUES (
    '7b0553e9-0571-4c74-b5e1-d44f1a7b1bb1', -- ID válido da tabela users (badfit01@gmail.com)
    'test_manual_fix',
    100,
    '2025-01-01',
    '2025-01-31',
    'active'
);

-- Se a inserção funcionar, remova o teste
DELETE FROM user_goals WHERE goal_type = 'test_manual_fix';

-- ESTRUTURA DA TABELA USERS PARA REFERÊNCIA:
-- public.users (
--   id uuid PRIMARY KEY,
--   auth_id uuid,
--   username varchar,
--   email varchar,
--   full_name varchar,
--   bio text,
--   avatar_url text,
--   city varchar,
--   state bpchar,
--   phone varchar,
--   birth_date date,
--   plan user_plan,
--   billing_cycle varchar,
--   points int4,
--   is_admin bool,
--   banned bool,
--   ban_reason text,
--   last_login timestamptz,
--   created_at timestamptz,
--   updated_at timestamptz,
--   latitude numeric,
--   longitude numeric,
--   subscription_id varchar,
--   stripe_customer_id varchar,
--   subscription_status varchar,
--   subscription_current_period_end timestamptz,
--   role varchar,
--   journalist_request_status varchar,
--   jornalist_requested_at timestamptz
-- )

-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Execute o PASSO 0 para limpar metas órfãs
-- 2. Execute os PASSOS 1 e 2 para corrigir a foreign key
-- 3. Execute o comando 3 para verificar se a constraint foi criada
-- 4. Execute os comandos 4 e 5 se quiser atualizar as políticas RLS
-- 5. Execute o comando 6 para testar a inserção
-- 6. Após confirmar que funciona, o backend estará compatível

-- USUÁRIOS DISPONÍVEIS PARA TESTE:
-- ID: 7b0553e9-0571-4c74-b5e1-d44f1a7b1bb1 (badfit01@gmail.com)
-- ID: 75ed8ec0-dba2-476b-a15f-8df7e0dcc7b1 (teste@direitai.com)
-- ID: bcd0593a-ba47-4262-8f8f-cb32f97e58d6 (maumautremeterra@gmail.com)
-- ID: 024bd319-6e21-445c-aa64-bc8c5a1fd6a7 (test@direitai.com)
-- ID: d67e3f2a-d08c-4cd4-97b0-a6a7e594ca54 (digitalinfluenceradm@gmail.com)