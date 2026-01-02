-- Tabela para logs de uso de voz (custos e estatísticas)
CREATE TABLE IF NOT EXISTS voice_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Quem solicitou (opcional se for chamada pública)
  agent_id UUID REFERENCES politician_agents(id), -- Qual agente falou
  provider TEXT NOT NULL, -- 'minimax', 'elevenlabs', etc.
  voice_id TEXT NOT NULL, -- ID da voz utilizada
  text_length INT NOT NULL, -- Tamanho do texto gerado
  cost NUMERIC(10, 4), -- Custo estimado da geração
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_voice_logs_created_at ON voice_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_logs_user_id ON voice_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_provider ON voice_usage_logs(provider);

-- Opcional: Tabela para gerenciar clones de voz (se quiser histórico)
CREATE TABLE IF NOT EXISTS voice_clones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  politician_id UUID REFERENCES politicians(id),
  voice_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  file_id TEXT, -- ID do arquivo no provider
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
