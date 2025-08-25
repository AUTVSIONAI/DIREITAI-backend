-- Criar tabela blog_post_likes
CREATE TABLE IF NOT EXISTS blog_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_post_id ON blog_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_user_id ON blog_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_created_at ON blog_post_likes(created_at);

-- Adicionar coluna likes_count na tabela politician_posts se não existir
ALTER TABLE politician_posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Criar função para incrementar likes
CREATE OR REPLACE FUNCTION increment_likes_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE politician_posts 
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função para decrementar likes
CREATE OR REPLACE FUNCTION decrement_likes_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE politician_posts 
  SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS (Row Level Security) na tabela blog_post_likes
ALTER TABLE blog_post_likes ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam todos os likes
CREATE POLICY "Users can view all likes" ON blog_post_likes
  FOR SELECT USING (true);

-- Política para permitir que usuários insiram seus próprios likes
CREATE POLICY "Users can insert their own likes" ON blog_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários deletem seus próprios likes
CREATE POLICY "Users can delete their own likes" ON blog_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE blog_post_likes IS 'Tabela para armazenar curtidas dos posts do blog';
COMMENT ON COLUMN blog_post_likes.post_id IS 'ID do post curtido';
COMMENT ON COLUMN blog_post_likes.user_id IS 'ID do usuário que curtiu';
COMMENT ON COLUMN blog_post_likes.created_at IS 'Data e hora da curtida';