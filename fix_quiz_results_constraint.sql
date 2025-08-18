-- Corrigir foreign key da tabela quiz_results
-- Execute este SQL no painel do Supabase

-- 1. Verificar constraint atual
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
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'quiz_results'
    AND kcu.column_name = 'user_id';

-- 2. Remover a constraint existente que referencia auth.users
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;

-- 3. Adicionar nova constraint referenciando public.users
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Atualizar as políticas RLS para usar public.users
DROP POLICY IF EXISTS "Users can view their own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Users can insert their own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Users can update their own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Service role can manage all quiz results" ON quiz_results;

-- 5. Criar novas políticas usando public.users
CREATE POLICY "Users can view their own quiz results" ON quiz_results
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own quiz results" ON quiz_results
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own quiz results" ON quiz_results
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all quiz results" ON quiz_results
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Verificar se a constraint foi criada corretamente
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
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'quiz_results'
    AND kcu.column_name = 'user_id';

-- 7. Verificar dados após migração
SELECT 
    u.email,
    u.id as user_id,
    u.auth_id,
    COUNT(qr.id) as quiz_count
FROM public.users u
LEFT JOIN quiz_results qr ON qr.user_id = u.id
GROUP BY u.id, u.email, u.auth_id
ORDER BY quiz_count DESC NULLS LAST;

SELECT 'Constraint da tabela quiz_results corrigida com sucesso!' as status;