-- Script de verificação e criação de tabelas/colunas faltantes
-- Rode este script no Editor SQL do Supabase para garantir que tudo funcione

-- 1. Tabela de Chat Público
CREATE TABLE IF NOT EXISTS arena_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_highlighted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices do Chat
CREATE INDEX IF NOT EXISTS idx_arena_chat_arena_id ON arena_chat_messages(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_chat_created_at ON arena_chat_messages(created_at);

-- RLS do Chat
ALTER TABLE arena_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read chat" ON arena_chat_messages;
CREATE POLICY "Public read chat" ON arena_chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert chat" ON arena_chat_messages;
CREATE POLICY "Authenticated insert chat" ON arena_chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Colunas de Vínculo Usuário-Político
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS politician_id UUID REFERENCES public.politicians(id);
ALTER TABLE public.politicians ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- 3. Colunas de Ranking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.politicians ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- 4. Correção de permissões para ranking (opcional, mas recomendado)
-- Permite leitura pública de pontos (se já não estiver permitido)
-- (O backend agora usa adminSupabase, então isso é menos crítico, mas bom para consistência)

-- 5. Atualização de dados de exemplo (opcional)
-- Garante que alguns usuários tenham pontos para aparecer no ranking
UPDATE public.users SET points = FLOOR(RANDOM() * 1000) WHERE points IS NULL OR points = 0;
UPDATE public.politicians SET popularity_score = FLOOR(RANDOM() * 1000) WHERE popularity_score IS NULL OR popularity_score = 0;
