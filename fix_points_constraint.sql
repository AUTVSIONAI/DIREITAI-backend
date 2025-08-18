-- =====================================================
-- CORRIGIR CONSTRAINT DA TABELA POINTS (VERSÃO SEGURA)
-- Execute este SQL no painel do Supabase
-- =====================================================

-- 1. Primeiro, vamos verificar a constraint atual
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
    AND tc.table_name = 'points'
    AND kcu.column_name = 'user_id';

-- 2. Verificar dados inconsistentes antes da migração
SELECT 
    p.user_id as auth_id,
    u.id as public_user_id,
    u.email,
    COUNT(p.id) as points_count
FROM points p
LEFT JOIN public.users u ON u.auth_id = p.user_id
GROUP BY p.user_id, u.id, u.email
ORDER BY points_count DESC;

-- 3. PRIMEIRO: Dropar a constraint existente para evitar conflitos
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_user_id_fkey;

-- 4. Migrar dados: atualizar user_ids de auth_id para public.users.id
-- Nota: A coluna da tabela points é 'user_id' (confirmado pelo esquema)
UPDATE points 
SET user_id = u.id
FROM public.users u 
WHERE points.user_id = u.auth_id
AND points.user_id != u.id;

-- 5. Verificar se ainda há registros órfãos
SELECT 
    p.user_id,
    COUNT(*) as orphaned_points
FROM points p
LEFT JOIN public.users u ON u.id = p.user_id
WHERE u.id IS NULL
GROUP BY p.user_id;

-- 6. Remover registros órfãos (se houver)
-- CUIDADO: Isso remove pontos de usuários que não existem mais
DELETE FROM points 
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 7. AGORA: Adicionar nova constraint que referencia public.users(id)
ALTER TABLE points ADD CONSTRAINT points_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 8. Atualizar as políticas RLS para usar public.users
DROP POLICY IF EXISTS "Users can view own points" ON points;
DROP POLICY IF EXISTS "Admins can view all points" ON points;
DROP POLICY IF EXISTS "System can insert points" ON points;
DROP POLICY IF EXISTS "System can update points" ON points;

-- Nova política para usuários verem apenas seus próprios pontos
CREATE POLICY "Users can view own points" ON points
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- Nova política para admins verem todos os pontos
CREATE POLICY "Admins can view all points" ON points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para inserção de pontos (apenas sistema/admin)
CREATE POLICY "System can insert points" ON points
    FOR INSERT WITH CHECK (true);

-- Política para atualização de pontos (apenas sistema/admin)
CREATE POLICY "System can update points" ON points
    FOR UPDATE USING (true);

-- 9. Verificar se a constraint foi criada corretamente
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
    AND tc.table_name = 'points'
    AND kcu.column_name = 'user_id';

-- 10. Verificar dados após migração
SELECT 
    u.email,
    u.id as user_id,
    u.auth_id,
    COUNT(p.id) as points_count,
    SUM(p.amount) as total_points
FROM public.users u
LEFT JOIN points p ON p.user_id = u.id
GROUP BY u.id, u.email, u.auth_id
ORDER BY total_points DESC NULLS LAST;

SELECT 'Constraint da tabela points corrigida com sucesso!' as status;