-- Ensure arenas table has stats columns
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS viewers_count INTEGER DEFAULT 0;

-- Create arena_likes table
CREATE TABLE IF NOT EXISTS arena_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(arena_id, user_id)
);

-- Create arena_participants table if not exists
CREATE TABLE IF NOT EXISTS arena_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'guest', -- journalist, guest, moderator
    status VARCHAR(50) NOT NULL DEFAULT 'invited', -- invited, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(arena_id, user_id)
);

-- RPC for incrementing shares
CREATE OR REPLACE FUNCTION increment_share_count(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE arenas
  SET shares_count = shares_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update likes_count on arena_likes changes
CREATE OR REPLACE FUNCTION update_arena_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE arenas SET likes_count = likes_count + 1 WHERE id = NEW.arena_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE arenas SET likes_count = likes_count - 1 WHERE id = OLD.arena_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_arena_likes_count ON arena_likes;
CREATE TRIGGER trigger_update_arena_likes_count
AFTER INSERT OR DELETE ON arena_likes
FOR EACH ROW EXECUTE FUNCTION update_arena_likes_count();

-- RLS Policies
ALTER TABLE arena_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;

-- Arena Likes Policies
CREATE POLICY "Public read access for arena_likes" ON arena_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert arena_likes" ON arena_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON arena_likes FOR DELETE USING (auth.uid() = user_id);

-- Arena Participants Policies
CREATE POLICY "Public read access for arena_participants" ON arena_participants FOR SELECT USING (true);
CREATE POLICY "Admins and Hosts can insert arena_participants" ON arena_participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'politician')
  )
);
CREATE POLICY "Users can update their own participant status" ON arena_participants FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON arena_likes TO authenticated;
GRANT ALL ON arena_likes TO service_role;
GRANT ALL ON arena_participants TO authenticated;
GRANT ALL ON arena_participants TO service_role;
