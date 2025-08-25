-- =====================================================
-- SQL PARA CRIAR TABELA DE COMENTÁRIOS DO BLOG
-- Execute este SQL no painel do Supabase (SQL Editor)
-- =====================================================

-- Criar tabela blog_comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES politician_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_approved ON blog_comments(is_approved);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
    BEFORE UPDATE ON blog_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Todos podem ver comentários aprovados
CREATE POLICY "Anyone can view approved comments" ON blog_comments
    FOR SELECT USING (is_approved = true);

-- Usuários autenticados podem criar comentários
CREATE POLICY "Authenticated users can create comments" ON blog_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem editar seus próprios comentários
CREATE POLICY "Users can edit their own comments" ON blog_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
CREATE POLICY "Users can delete their own comments" ON blog_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Admins podem gerenciar todos os comentários
CREATE POLICY "Admins can manage all comments" ON blog_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Comentários na tabela
COMMENT ON TABLE blog_comments IS 'Tabela para armazenar comentários dos posts do blog';
COMMENT ON COLUMN blog_comments.post_id IS 'ID do post ao qual o comentário pertence';
COMMENT ON COLUMN blog_comments.user_id IS 'ID do usuário que fez o comentário';
COMMENT ON COLUMN blog_comments.content IS 'Conteúdo do comentário';
COMMENT ON COLUMN blog_comments.is_approved IS 'Se o comentário foi aprovado para exibição';
COMMENT ON COLUMN blog_comments.likes_count IS 'Número de curtidas do comentário';

SELECT '✅ Tabela blog_comments criada com sucesso!' as status;