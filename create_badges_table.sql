-- =====================================================
-- CRIAR TABELA BADGES PARA SISTEMA DE GAMIFICAÇÃO
-- Execute este SQL no painel do Supabase
-- =====================================================

-- Criar tabela badges se não existir
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_type VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    achievement_id VARCHAR(100),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_earned_at ON badges(earned_at);
CREATE INDEX IF NOT EXISTS idx_badges_achievement_id ON badges(achievement_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_badges_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios badges
CREATE POLICY "Users can view own badges" ON badges
    FOR SELECT USING (auth.uid() = user_id);

-- Política para inserir badges (apenas sistema)
CREATE POLICY "System can insert badges" ON badges
    FOR INSERT WITH CHECK (true);

-- Política para atualizar badges (apenas sistema)
CREATE POLICY "System can update badges" ON badges
    FOR UPDATE USING (true);

-- Badges serão criados dinamicamente pelo sistema quando necessário
-- Não inserir dados de exemplo aqui

COMMIT;