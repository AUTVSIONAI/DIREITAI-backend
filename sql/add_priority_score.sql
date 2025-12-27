-- Add priority_score column to arena_questions if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arena_questions' AND column_name = 'priority_score') THEN 
        ALTER TABLE arena_questions ADD COLUMN priority_score INTEGER DEFAULT 0; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arena_questions' AND column_name = 'is_answered') THEN 
        ALTER TABLE arena_questions ADD COLUMN is_answered BOOLEAN DEFAULT FALSE; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arena_questions' AND column_name = 'amount') THEN 
        ALTER TABLE arena_questions ADD COLUMN amount DECIMAL(10,2) DEFAULT 0; 
    END IF;
END $$;
