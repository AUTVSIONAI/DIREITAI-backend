-- Configurar políticas RLS para o bucket 'avatars' no Supabase Storage
-- Execute este SQL no painel do Supabase (SQL Editor)
-- VERSÃO PARA USUÁRIOS SEM PRIVILÉGIOS DE ADMIN

-- 1. Verificar se o bucket 'avatars' existe
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- 2. Se o bucket não existir, você precisa criá-lo manualmente:
-- Vá para Storage > Create bucket > Nome: 'avatars' > Public: true

-- 3. Remover políticas existentes (se houver) e criar novas
-- IMPORTANTE: Execute cada comando separadamente

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Política para permitir que usuários façam upload de seus próprios avatares
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- Política para permitir que usuários vejam todos os avatares (leitura pública)
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Política para permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- Política para permitir que usuários deletem seus próprios avatares
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- 4. Verificar se as políticas foram criadas
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatars%';

-- 5. Testar se o bucket está funcionando
SELECT * FROM storage.buckets WHERE id = 'avatars';