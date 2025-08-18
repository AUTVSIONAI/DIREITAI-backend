-- Configurar políticas RLS para o bucket 'avatars' no Supabase Storage
-- Execute este SQL no painel do Supabase (SQL Editor) como usuário com permissões adequadas
-- OU configure manualmente através da interface do Dashboard

-- OPÇÃO 1: Configuração Manual via Dashboard
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para Storage > avatars
-- 3. Clique em "Policies"
-- 4. Clique em "New Policy" para cada política abaixo:

-- POLÍTICA 1: INSERT - Users can upload own avatars
-- Operation: INSERT
-- Policy name: Users can upload own avatars
-- WITH CHECK expression:
-- bucket_id = 'avatars' AND (auth.uid())::text = (string_to_array(name, '/'))[1]

-- POLÍTICA 2: SELECT - Public can view avatars
-- Operation: SELECT
-- Policy name: Public can view avatars
-- USING expression:
-- bucket_id = 'avatars'

-- POLÍTICA 3: UPDATE - Users can update own avatars
-- Operation: UPDATE
-- Policy name: Users can update own avatars
-- USING expression:
-- bucket_id = 'avatars' AND (auth.uid())::text = (string_to_array(name, '/'))[1]

-- POLÍTICA 4: DELETE - Users can delete own avatars
-- Operation: DELETE
-- Policy name: Users can delete own avatars
-- USING expression:
-- bucket_id = 'avatars' AND (auth.uid())::text = (string_to_array(name, '/'))[1]

-- OPÇÃO 2: SQL alternativo (execute como superusuário ou owner)
-- Se você tem acesso como service_role ou postgres user:

-- Primeiro, verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Se não existir, criar o bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Verificar políticas existentes
SELECT policyname, cmd, qual FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
AND policyname LIKE '%avatars%';

-- INSTRUÇÕES PARA CONFIGURAÇÃO MANUAL:
-- 1. Acesse https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá para Storage no menu lateral
-- 4. Clique no bucket 'avatars'
-- 5. Clique na aba 'Policies'
-- 6. Clique em 'New Policy' e configure cada política manualmente
-- 7. Use as expressões fornecidas acima para cada operação

-- TESTE: Verificar se as políticas foram aplicadas
-- Execute este comando após configurar as políticas:
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%avatars%'
ORDER BY policyname;