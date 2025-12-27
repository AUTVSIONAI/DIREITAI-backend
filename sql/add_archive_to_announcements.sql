-- Adicionar colunas de arquivamento na tabela de anúncios
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_announcements_is_archived ON announcements(is_archived);

-- Atualizar políticas de RLS se necessário (admins podem ver tudo, usuários apenas não arquivados)
-- Nota: Isso depende das políticas existentes. Geralmente admins têm acesso total.
