-- Script para verificar se as tabelas de gamificação foram criadas corretamente
-- Execute este script após executar o create_gamification_tables.sql

-- 1. Verificar se todas as tabelas existem
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_results', 'gamification_activities', 'achievements', 'user_achievements')
ORDER BY tablename;

-- 2. Verificar estrutura da tabela quiz_results
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quiz_results'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela gamification_activities
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gamification_activities'
ORDER BY ordinal_position;

-- 4. Verificar estrutura da tabela achievements
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'achievements'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela user_achievements
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_achievements'
ORDER BY ordinal_position;

-- 6. Verificar conquistas inseridas
SELECT 
    name,
    description,
    category,
    points_reward,
    requirements
FROM public.achievements
ORDER BY category, points_reward;

-- 7. Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_results', 'gamification_activities', 'achievements', 'user_achievements')
ORDER BY tablename, indexname;

-- 8. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_results', 'gamification_activities', 'achievements', 'user_achievements')
ORDER BY tablename, policyname;

-- 9. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_results', 'gamification_activities', 'achievements', 'user_achievements')
ORDER BY tablename;

-- 10. Contar registros em cada tabela
SELECT 'quiz_results' as tabela, COUNT(*) as total FROM public.quiz_results
UNION ALL
SELECT 'gamification_activities' as tabela, COUNT(*) as total FROM public.gamification_activities
UNION ALL
SELECT 'achievements' as tabela, COUNT(*) as total FROM public.achievements
UNION ALL
SELECT 'user_achievements' as tabela, COUNT(*) as total FROM public.user_achievements
ORDER BY tabela;

SELECT 'Verificação das tabelas de gamificação concluída!' as status;