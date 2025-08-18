-- Criar tabela para controlar downloads da Constituição por usuário
CREATE TABLE IF NOT EXISTS constitution_downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice único para garantir que cada usuário só possa baixar uma vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_constitution_downloads_user_id ON constitution_downloads(user_id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_constitution_downloads_downloaded_at ON constitution_downloads(downloaded_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE constitution_downloads ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios downloads
CREATE POLICY "Users can view their own constitution downloads" ON constitution_downloads
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem apenas seus próprios downloads
CREATE POLICY "Users can insert their own constitution downloads" ON constitution_downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE constitution_downloads IS 'Tabela para controlar downloads da Constituição Federal por usuário';
COMMENT ON COLUMN constitution_downloads.user_id IS 'ID do usuário que fez o download';
COMMENT ON COLUMN constitution_downloads.downloaded_at IS 'Data e hora do download';
COMMENT ON COLUMN constitution_downloads.points_awarded IS 'Pontos concedidos pelo download (padrão: 100)';