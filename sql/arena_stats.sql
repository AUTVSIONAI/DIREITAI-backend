-- Tabela para Likes nas Arenas
CREATE TABLE IF NOT EXISTS arena_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(arena_id, user_id)
);

-- Habilitar RLS
ALTER TABLE arena_likes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'arena_likes' AND policyname = 'Public read likes') THEN
        CREATE POLICY "Public read likes" ON arena_likes FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'arena_likes' AND policyname = 'Authenticated insert like') THEN
        CREATE POLICY "Authenticated insert like" ON arena_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'arena_likes' AND policyname = 'Users delete own like') THEN
        CREATE POLICY "Users delete own like" ON arena_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Colunas de estatísticas na tabela Arenas (para cache/display rápido)
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS shares_count INT DEFAULT 0;
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS viewers_count INT DEFAULT 0;

-- Função Trigger para atualizar contador de likes
CREATE OR REPLACE FUNCTION update_arena_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE arenas SET likes_count = likes_count + 1 WHERE id = NEW.arena_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE arenas SET likes_count = likes_count - 1 WHERE id = OLD.arena_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_arena_likes_count ON arena_likes;
CREATE TRIGGER trigger_update_arena_likes_count
AFTER INSERT OR DELETE ON arena_likes
FOR EACH ROW EXECUTE FUNCTION update_arena_likes_count();
