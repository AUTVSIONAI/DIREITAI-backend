-- Tabela de campanhas de email
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('newsletter', 'promotional', 'transactional', 'announcement', 'reminder')),
    target_audience JSONB DEFAULT '{"type": "all", "estimated_recipients": 0}'::jsonb,
    schedule JSONB DEFAULT '{"type": "immediate"}'::jsonb,
    tracking JSONB DEFAULT '{"open_tracking": true, "click_tracking": true, "unsubscribe_tracking": true}'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0
);

-- Tabela de estatísticas detalhadas de campanhas
CREATE TABLE IF NOT EXISTS email_campaign_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'bounced', 'opened', 'clicked', 'unsubscribed', 'complained')),
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, user_id, status)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON email_campaigns(sent_at);

CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_campaign_id ON email_campaign_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_user_id ON email_campaign_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_status ON email_campaign_stats(status);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_created_at ON email_campaign_stats(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança (RLS)
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_stats ENABLE ROW LEVEL SECURITY;

-- Políticas para email_campaigns
CREATE POLICY "Admins can manage email campaigns" ON email_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Políticas para email_campaign_stats
CREATE POLICY "Admins can view campaign stats" ON email_campaign_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "System can insert campaign stats" ON email_campaign_stats
    FOR INSERT WITH CHECK (true);

-- Comentários
COMMENT ON TABLE email_campaigns IS 'Tabela para armazenar campanhas de email marketing';
COMMENT ON TABLE email_campaign_stats IS 'Tabela para armazenar estatísticas detalhadas das campanhas de email';

COMMENT ON COLUMN email_campaigns.target_audience IS 'Configuração do público-alvo em formato JSON';
COMMENT ON COLUMN email_campaigns.schedule IS 'Configuração de agendamento em formato JSON';
COMMENT ON COLUMN email_campaigns.tracking IS 'Configuração de rastreamento em formato JSON';
COMMENT ON COLUMN email_campaigns.attachments IS 'Lista de anexos em formato JSON';

SELECT '✅ Tabela de campanhas de email criada com sucesso!' as status;