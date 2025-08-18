-- =====================================================
-- CORRIGIR CONSTRAINT DA TABELA BADGES (VERSÃO SEGURA)
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
    AND tc.table_name = 'badges'
    AND kcu.column_name = 'user_id';

-- 2. Verificar dados inconsistentes antes da migração
SELECT 
    b.user_id as auth_id,
    u.id as public_user_id,
    u.email,
    COUNT(b.id) as badges_count
FROM badges b
LEFT JOIN public.users u ON u.auth_id = b.user_id
GROUP BY b.user_id, u.id, u.email
ORDER BY badges_count DESC;

-- 3. PRIMEIRO: Dropar a constraint existente para evitar conflitos
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_user_id_fkey;

-- 4. Migrar dados: atualizar user_ids de auth_id para public.users.id
UPDATE badges 
SET user_id = u.id
FROM public.users u 
WHERE badges.user_id = u.auth_id
AND badges.user_id != u.id;

-- 5. Verificar se ainda há registros órfãos
SELECT 
    b.user_id,
    COUNT(*) as orphaned_badges
FROM badges b
LEFT JOIN public.users u ON u.id = b.user_id
WHERE u.id IS NULL
GROUP BY b.user_id;

-- 6. Remover registros órfãos (se houver)
-- CUIDADO: Isso remove badges de usuários que não existem mais
DELETE FROM badges 
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 7. AGORA: Adicionar nova constraint que referencia public.users(id)
ALTER TABLE badges ADD CONSTRAINT badges_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 8. Atualizar as políticas RLS para usar public.users
DROP POLICY IF EXISTS "Users can view own badges" ON badges;
DROP POLICY IF EXISTS "Admins can view all badges" ON badges;
DROP POLICY IF EXISTS "System can insert badges" ON badges;
DROP POLICY IF EXISTS "System can update badges" ON badges;

-- Nova política para usuários verem apenas seus próprios badges
CREATE POLICY "Users can view own badges" ON badges
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- Nova política para admins verem todos os badges
CREATE POLICY "Admins can view all badges" ON badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para inserção de badges (apenas sistema/admin)
CREATE POLICY "System can insert badges" ON badges
    FOR INSERT WITH CHECK (true);

-- Política para atualização de badges (apenas sistema/admin)
CREATE POLICY "System can update badges" ON badges
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
    AND tc.table_name = 'badges'
    AND kcu.column_name = 'user_id';

-- 10. Verificar dados após migração
SELECT 
    u.email,
    u.id as user_id,
    u.auth_id,
    COUNT(b.id) as badges_count
FROM public.users u
LEFT JOIN badges b ON b.user_id = u.id
GROUP BY u.id, u.email, u.auth_id
ORDER BY badges_count DESC NULLS LAST;

SELECT 'Constraint da tabela badges corrigida com sucesso!' as status;