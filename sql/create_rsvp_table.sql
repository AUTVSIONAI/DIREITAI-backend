-- Criar tabela para sistema de RSVP (Vai/Não Vai/Talvez)
CREATE TABLE IF NOT EXISTS event_rsvp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('vai', 'nao_vai', 'talvez')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos adicionais
    notes TEXT, -- Comentários do usuário
    notification_enabled BOOLEAN DEFAULT true, -- Se quer receber notificações
    
    -- Constraint para evitar RSVPs duplicados do mesmo usuário no mesmo evento
    UNIQUE(user_id, event_id)
);

-- Criar tabela para RSVP de manifestações
CREATE TABLE IF NOT EXISTS manifestation_rsvp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manifestation_id UUID NOT NULL REFERENCES manifestations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('vai', 'nao_vai', 'talvez')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos adicionais
    notes TEXT, -- Comentários do usuário
    notification_enabled BOOLEAN DEFAULT true, -- Se quer receber notificações
    
    -- Constraint para evitar RSVPs duplicados do mesmo usuário na mesma manifestação
    UNIQUE(user_id, manifestation_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_event_rsvp_user ON event_rsvp(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_event ON event_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_status ON event_rsvp(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_created ON event_rsvp(created_at);

CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_user ON manifestation_rsvp(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_manifestation ON manifestation_rsvp(manifestation_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_status ON manifestation_rsvp(status);
CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_created ON manifestation_rsvp(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_rsvp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_event_rsvp_updated_at ON event_rsvp;
CREATE TRIGGER update_event_rsvp_updated_at
    BEFORE UPDATE ON event_rsvp
    FOR EACH ROW
    EXECUTE FUNCTION update_rsvp_updated_at();

DROP TRIGGER IF EXISTS update_manifestation_rsvp_updated_at ON manifestation_rsvp;
CREATE TRIGGER update_manifestation_rsvp_updated_at
    BEFORE UPDATE ON manifestation_rsvp
    FOR EACH ROW
    EXECUTE FUNCTION update_rsvp_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE event_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestation_rsvp ENABLE ROW LEVEL SECURITY;

-- Políticas para event_rsvp
-- Usuários podem ver seus próprios RSVPs
CREATE POLICY "Users can view own event rsvps" ON event_rsvp
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios RSVPs
CREATE POLICY "Users can create own event rsvps" ON event_rsvp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios RSVPs
CREATE POLICY "Users can update own event rsvps" ON event_rsvp
    FOR UPDATE USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios RSVPs
CREATE POLICY "Users can delete own event rsvps" ON event_rsvp
    FOR DELETE USING (auth.uid() = user_id);

-- Admins podem ver todos os RSVPs de eventos
CREATE POLICY "Admins can view all event rsvps" ON event_rsvp
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Políticas para manifestation_rsvp
-- Usuários podem ver seus próprios RSVPs
CREATE POLICY "Users can view own manifestation rsvps" ON manifestation_rsvp
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios RSVPs
CREATE POLICY "Users can create own manifestation rsvps" ON manifestation_rsvp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios RSVPs
CREATE POLICY "Users can update own manifestation rsvps" ON manifestation_rsvp
    FOR UPDATE USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios RSVPs
CREATE POLICY "Users can delete own manifestation rsvps" ON manifestation_rsvp
    FOR DELETE USING (auth.uid() = user_id);

-- Admins podem ver todos os RSVPs de manifestações
CREATE POLICY "Admins can view all manifestation rsvps" ON manifestation_rsvp
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE event_rsvp IS 'Tabela para armazenar confirmações de presença (RSVP) em eventos';
COMMENT ON COLUMN event_rsvp.status IS 'Status da confirmação: vai, nao_vai, talvez';
COMMENT ON COLUMN event_rsvp.notification_enabled IS 'Se o usuário quer receber notificações sobre o evento';

COMMENT ON TABLE manifestation_rsvp IS 'Tabela para armazenar confirmações de presença (RSVP) em manifestações';
COMMENT ON COLUMN manifestation_rsvp.status IS 'Status da confirmação: vai, nao_vai, talvez';
COMMENT ON COLUMN manifestation_rsvp.notification_enabled IS 'Se o usuário quer receber notificações sobre a manifestação';

SELECT 'Tabelas de RSVP criadas com sucesso!' as status;