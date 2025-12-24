
-- Create Arena Participants table
CREATE TABLE IF NOT EXISTS arena_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('host', 'moderator', 'journalist', 'guest', 'viewer')),
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'rejected', 'joined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(arena_id, user_id)
);

-- Enable RLS
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read participants" ON arena_participants FOR SELECT USING (true);

CREATE POLICY "Admin/Host manage participants" ON arena_participants FOR ALL USING (
  auth.uid() IN (
    SELECT politician_id FROM arenas WHERE id = arena_participants.arena_id
    UNION
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Users can update their own status" ON arena_participants FOR UPDATE USING (
  auth.uid() = user_id
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_arena_participants_arena_id ON arena_participants(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_participants_user_id ON arena_participants(user_id);
