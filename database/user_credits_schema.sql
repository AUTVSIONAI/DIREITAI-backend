-- Tabela para armazenar créditos avulsos dos usuários
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_type VARCHAR(50) NOT NULL, -- 'fake_news_check', 'ai_creative_message', 'political_agent_conversation'
    purchased_credits INTEGER NOT NULL DEFAULT 0,
    remaining_credits INTEGER NOT NULL DEFAULT 0,
    price_paid INTEGER NOT NULL, -- Preço pago em centavos
    payment_id VARCHAR(255), -- ID do pagamento (Stripe, PIX, etc.)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_type ON user_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_user_credits_remaining ON user_credits(remaining_credits);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires ON user_credits(expires_at);

-- RLS (Row Level Security)
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios créditos
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Política para inserção (apenas sistema pode inserir)
CREATE POLICY "System can insert credits" ON user_credits
    FOR INSERT WITH CHECK (true);

-- Política para atualização (apenas sistema pode atualizar)
CREATE POLICY "System can update credits" ON user_credits
    FOR UPDATE USING (true);

-- Função para adicionar créditos ao usuário
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_credit_type VARCHAR(50),
    p_credits INTEGER,
    p_price_paid INTEGER,
    p_payment_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credit_id UUID;
BEGIN
    INSERT INTO user_credits (
        user_id,
        credit_type,
        purchased_credits,
        remaining_credits,
        price_paid,
        payment_id
    ) VALUES (
        p_user_id,
        p_credit_type,
        p_credits,
        p_credits,
        p_price_paid,
        p_payment_id
    )
    RETURNING id INTO credit_id;
    
    RETURN credit_id;
END;
$$;

-- Função para obter créditos disponíveis do usuário
CREATE OR REPLACE FUNCTION get_user_credits(
    p_user_id UUID,
    p_credit_type VARCHAR(50)
)
RETURNS TABLE(
    total_credits INTEGER,
    active_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(purchased_credits), 0)::INTEGER as total_credits,
        COALESCE(SUM(remaining_credits), 0)::INTEGER as active_credits
    FROM user_credits 
    WHERE user_id = p_user_id 
        AND credit_type = p_credit_type
        AND expires_at > NOW()
        AND remaining_credits > 0;
END;
$$;

-- Função para consumir crédito
CREATE OR REPLACE FUNCTION consume_user_credit(
    p_user_id UUID,
    p_credit_type VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credit_record RECORD;
BEGIN
    -- Buscar o crédito mais antigo disponível
    SELECT * INTO credit_record
    FROM user_credits
    WHERE user_id = p_user_id
        AND credit_type = p_credit_type
        AND remaining_credits > 0
        AND expires_at > NOW()
    ORDER BY expires_at ASC
    LIMIT 1;
    
    -- Se não encontrou crédito disponível
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Consumir um crédito
    UPDATE user_credits
    SET remaining_credits = remaining_credits - 1,
        updated_at = NOW()
    WHERE id = credit_record.id;
    
    RETURN TRUE;
END;
$$;

-- Função para limpar créditos expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_credits
    WHERE expires_at < NOW() AND remaining_credits = 0;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE user_credits IS 'Armazena créditos avulsos comprados pelos usuários';
COMMENT ON COLUMN user_credits.credit_type IS 'Tipo de crédito: fake_news_check, ai_creative_message, political_agent_conversation';
COMMENT ON COLUMN user_credits.price_paid IS 'Preço pago em centavos (ex: 150 = R$ 1,50)';
COMMENT ON COLUMN user_credits.expires_at IS 'Data de expiração dos créditos (padrão: 1 ano)';