-- Configurar políticas RLS para o bucket 'avatars' no Supabase Storage
-- Execute este SQL no painel do Supabase (SQL Editor)

-- 1. Primeiro, remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- 2. Criar o bucket 'avatars' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar RLS no storage.objects se não estiver habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Criar política para permitir que usuários façam upload de seus próprios avatares
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- 5. Criar política para permitir que usuários vejam todos os avatares (leitura pública)
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 6. Criar política para permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- 7. Criar política para permitir que usuários deletem seus próprios avatares
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- 8. Verificar se as políticas foram criadas
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatars%';

-- 9. Testar se o bucket está funcionando
SELECT * FROM storage.buckets WHERE id = 'avatars';