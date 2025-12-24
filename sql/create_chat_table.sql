-- Create Arena Chat table
CREATE TABLE IF NOT EXISTS arena_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_highlighted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arena_chat_arena_id ON arena_chat_messages(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_chat_created_at ON arena_chat_messages(created_at);

-- RLS Policies
ALTER TABLE arena_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read chat" ON arena_chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated insert chat" ON arena_chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
