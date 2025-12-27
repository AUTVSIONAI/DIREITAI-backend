-- Add permissions and hand raising columns to arena_participants
ALTER TABLE public.arena_participants 
ADD COLUMN IF NOT EXISTS hand_raised BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_speak BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_video BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows updates (if RLS is enabled, you might need specific policies)
-- For now, assuming standard update policies exist or this is run by admin
