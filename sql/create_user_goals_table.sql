-- Criar tabela para metas mensais dos usuários
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL DEFAULT 'monthly_points',
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  auto_generated BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_period ON user_goals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_goals_type ON user_goals(goal_type);

-- Constraint para evitar metas duplicadas no mesmo período
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goals_unique_period 
  ON user_goals(user_id, goal_type, period_start, period_end) 
  WHERE status = 'active';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_goals_updated_at();

-- RLS (Row Level Security)
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias metas
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários atualizarem apenas suas próprias metas
CREATE POLICY "Users can update own goals" ON user_goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para admins verem todas as metas
CREATE POLICY "Admins can view all goals" ON user_goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Política para inserção de metas (sistema/admin)
CREATE POLICY "System can insert goals" ON user_goals
    FOR INSERT WITH CHECK (true);

-- Política para atualização de metas (sistema/admin)
CREATE POLICY "System can update goals" ON user_goals
    FOR UPDATE USING (true);

-- Comentários para documentação
COMMENT ON TABLE user_goals IS 'Tabela para armazenar metas mensais e outros tipos de metas dos usuários';
COMMENT ON COLUMN user_goals.user_id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN user_goals.goal_type IS 'Tipo da meta (monthly_points, weekly_points, etc.)';
COMMENT ON COLUMN user_goals.target_value IS 'Valor alvo da meta';
COMMENT ON COLUMN user_goals.current_value IS 'Valor atual da meta';
COMMENT ON COLUMN user_goals.period_start IS 'Data de início do período da meta';
COMMENT ON COLUMN user_goals.period_end IS 'Data de fim do período da meta';
COMMENT ON COLUMN user_goals.status IS 'Status da meta (active, completed, failed, paused)';
COMMENT ON COLUMN user_goals.auto_generated IS 'Se a meta foi gerada automaticamente pelo sistema';
COMMENT ON COLUMN user_goals.metadata IS 'Dados adicionais em formato JSON';

-- Função para criar meta mensal automaticamente
CREATE OR REPLACE FUNCTION create_monthly_goal_for_user(p_user_id UUID, p_user_level INTEGER DEFAULT 1)
RETURNS UUID AS $$
DECLARE
  v_goal_id UUID;
  v_target_value INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calcular período do mês atual
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Calcular meta baseada no nível do usuário
  v_target_value := GREATEST(500, p_user_level * 100);
  
  -- Verificar se já existe uma meta ativa para este período
  SELECT id INTO v_goal_id
  FROM user_goals
  WHERE user_id = p_user_id
    AND goal_type = 'monthly_points'
    AND period_start = v_period_start
    AND period_end = v_period_end
    AND status = 'active';
  
  -- Se não existe, criar nova meta
  IF v_goal_id IS NULL THEN
    INSERT INTO user_goals (
      user_id,
      goal_type,
      target_value,
      current_value,
      period_start,
      period_end,
      status,
      auto_generated
    ) VALUES (
      p_user_id,
      'monthly_points',
      v_target_value,
      0,
      v_period_start,
      v_period_end,
      'active',
      true
    ) RETURNING id INTO v_goal_id;
  END IF;
  
  RETURN v_goal_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar progresso da meta
CREATE OR REPLACE FUNCTION update_goal_progress(p_user_id UUID, p_goal_type VARCHAR(50), p_current_value INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := false;
BEGIN
  UPDATE user_goals
  SET 
    current_value = p_current_value,
    status = CASE 
      WHEN p_current_value >= target_value THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND goal_type = p_goal_type
    AND status = 'active'
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

SELECT 'Tabela user_goals criada com sucesso!' as status;