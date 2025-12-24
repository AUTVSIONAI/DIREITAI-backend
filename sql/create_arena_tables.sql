-- Create Arenas table
CREATE TABLE IF NOT EXISTS arenas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  rules TEXT,
  superchat_config JSONB DEFAULT '{"levels": [{"amount": 5, "label": "Apoio"}, {"amount": 10, "label": "Destaque"}, {"amount": 20, "label": "Prioridade Máxima"}]}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Arena Questions table
CREATE TABLE IF NOT EXISTS arena_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'answered', 'ignored', 'removed')),
  type VARCHAR(20) DEFAULT 'normal' CHECK (type IN ('normal', 'superchat')),
  amount DECIMAL(10, 2) DEFAULT 0,
  priority_score INTEGER DEFAULT 0,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Arena Votes table
CREATE TABLE IF NOT EXISTS arena_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES arena_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

-- Create Politician Points table
CREATE TABLE IF NOT EXISTS politician_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(255),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arenas_politician_id ON arenas(politician_id);
CREATE INDEX IF NOT EXISTS idx_arenas_status ON arenas(status);
CREATE INDEX IF NOT EXISTS idx_arena_questions_arena_id ON arena_questions(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_questions_status ON arena_questions(status);
CREATE INDEX IF NOT EXISTS idx_arena_votes_question_id ON arena_votes(question_id);
CREATE INDEX IF NOT EXISTS idx_politician_points_politician_id ON politician_points(politician_id);

-- RLS Policies
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_points ENABLE ROW LEVEL SECURITY;

-- Policies for Arenas
CREATE POLICY "Public read arenas" ON arenas FOR SELECT USING (true);
CREATE POLICY "Admin insert arenas" ON arenas FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);
CREATE POLICY "Admin update arenas" ON arenas FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Policies for Questions
CREATE POLICY "Public read questions" ON arena_questions FOR SELECT USING (true);
CREATE POLICY "Authenticated insert questions" ON arena_questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin/Mod update questions" ON arena_questions FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator', 'journalist'))
);

-- Policies for Votes
CREATE POLICY "Public read votes" ON arena_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated insert votes" ON arena_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for Politician Points
CREATE POLICY "Public read politician points" ON politician_points FOR SELECT USING (true);

-- Function to update priority score
CREATE OR REPLACE FUNCTION update_question_priority()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE arena_questions
  SET priority_score = (
    SELECT COALESCE(SUM(weight), 0)
    FROM arena_votes
    WHERE question_id = NEW.question_id
  ) + (
    SELECT CASE WHEN type = 'superchat' THEN amount * 2 ELSE 0 END
    FROM arena_questions
    WHERE id = NEW.question_id
  )
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_priority ON arena_votes;
CREATE TRIGGER trigger_update_priority
AFTER INSERT OR DELETE OR UPDATE ON arena_votes
FOR EACH ROW
EXECUTE FUNCTION update_question_priority();
