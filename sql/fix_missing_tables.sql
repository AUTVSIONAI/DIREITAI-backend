-- Fix Missing Tables and Policies Script (Idempotent)
-- Run this in Supabase SQL Editor

-- 1. Create Tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS arena_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('host', 'moderator', 'journalist', 'guest', 'viewer')),
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'rejected', 'joined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(arena_id, user_id)
);

CREATE TABLE IF NOT EXISTS arena_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'normal',
  amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  priority_score INTEGER DEFAULT 0,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES arena_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

CREATE TABLE IF NOT EXISTS politician_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Safe to run multiple times)
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_points ENABLE ROW LEVEL SECURITY;

-- 3. Manage Policies (Drop and Recreate to avoid conflicts)
DO $$ 
BEGIN
    -- Arena Participants Policies
    DROP POLICY IF EXISTS "Public read participants" ON arena_participants;
    DROP POLICY IF EXISTS "Authenticated insert participants" ON arena_participants;
    DROP POLICY IF EXISTS "Users update own participant status" ON arena_participants;
    DROP POLICY IF EXISTS "Admin/Host manage participants" ON arena_participants;
    
    CREATE POLICY "Public read participants" ON arena_participants FOR SELECT USING (true);
    CREATE POLICY "Authenticated insert participants" ON arena_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Users update own participant status" ON arena_participants FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Admin/Host manage participants" ON arena_participants FOR ALL USING (
      auth.uid() IN (
        SELECT politician_id FROM arenas WHERE id = arena_participants.arena_id
        UNION
        SELECT id FROM users WHERE role = 'admin'
      )
    );

    -- Arena Questions Policies
    DROP POLICY IF EXISTS "Public read questions" ON arena_questions;
    DROP POLICY IF EXISTS "Authenticated insert questions" ON arena_questions;
    
    CREATE POLICY "Public read questions" ON arena_questions FOR SELECT USING (true);
    CREATE POLICY "Authenticated insert questions" ON arena_questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    -- Arena Chat Policies
    DROP POLICY IF EXISTS "Public read chat" ON arena_chat_messages;
    DROP POLICY IF EXISTS "Authenticated insert chat" ON arena_chat_messages;
    
    CREATE POLICY "Public read chat" ON arena_chat_messages FOR SELECT USING (true);
    CREATE POLICY "Authenticated insert chat" ON arena_chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    -- Arena Votes Policies
    DROP POLICY IF EXISTS "Public read votes" ON arena_votes;
    DROP POLICY IF EXISTS "Authenticated insert votes" ON arena_votes;
    
    CREATE POLICY "Public read votes" ON arena_votes FOR SELECT USING (true);
    CREATE POLICY "Authenticated insert votes" ON arena_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    -- Politician Points Policies
    DROP POLICY IF EXISTS "Public read points" ON politician_points;
    
    CREATE POLICY "Public read points" ON politician_points FOR SELECT USING (true);
END $$;
