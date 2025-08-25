-- =====================================================
-- SQL COMPLETO PARA TABELAS DE NOTIFICAÇÕES E CAMPANHAS
-- =====================================================

-- 1. Tabela de notificações (se não existir)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'achievement', 'reminder', 'social', 'system')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('event', 'store', 'ai', 'gamification', 'social', 'system', 'security', 'marketing')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    short_message VARCHAR(140),
    icon VARCHAR(100),
    image_url TEXT,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    data JSONB,
    action_url TEXT,
    action_label VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    is_clicked BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de templates de notificação
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('event', 'store', 'ai', 'gamification', 'social', 'system', 'security', 'marketing')),
    subject VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'pt-BR',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de fila de notificações
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'webhook')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de campanhas de email
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

-- 5. Tabela de estatísticas detalhadas de campanhas
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

-- 6. Tabela para rastrear dispensas de anúncios por usuário
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- 7. Tabela de preferências de notificação dos usuários
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "in_app": true,
        "categories": {
            "event": true,
            "store": true,
            "ai": true,
            "gamification": true,
            "social": true,
            "system": true,
            "security": true,
            "marketing": false
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Índices para notification_templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);

-- Índices para notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_channel ON notification_queue(channel);

-- Índices para email_campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON email_campaigns(sent_at);

-- Índices para email_campaign_stats
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_campaign_id ON email_campaign_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_user_id ON email_campaign_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_status ON email_campaign_stats(status);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_created_at ON email_campaign_stats(created_at DESC);

-- Índices para announcement_dismissals
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_id ON announcement_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_announcement_id ON announcement_dismissals(announcement_id);

-- Índices para user_notification_preferences
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);

-- =====================================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at 
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at 
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Políticas para notification_templates
CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Políticas para notification_queue
CREATE POLICY "Users can view their own queue items" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notification queue" ON notification_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

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

-- Políticas para announcement_dismissals
CREATE POLICY "Users can manage their own dismissals" ON announcement_dismissals
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_notification_preferences
CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- INSERIR TEMPLATES PADRÃO
-- =====================================================

-- Inserir alguns templates padrão
INSERT INTO notification_templates (name, type, category, title, content, is_system, variables) VALUES
('Bem-vindo', 'in_app', 'system', 'Bem-vindo ao DireitAI!', 'Olá {{user_name}}, seja bem-vindo à nossa plataforma! Explore todas as funcionalidades disponíveis.', true, '[{"name": "user_name", "type": "string", "description": "Nome do usuário"}]'),
('Nova Conquista', 'in_app', 'gamification', 'Nova Conquista Desbloqueada!', 'Parabéns! Você desbloqueou a conquista "{{achievement_name}}". Continue assim!', true, '[{"name": "achievement_name", "type": "string", "description": "Nome da conquista"}]'),
('Evento Próximo', 'in_app', 'event', 'Evento se Aproximando', 'O evento "{{event_name}}" acontecerá em {{days_remaining}} dias. Não perca!', true, '[{"name": "event_name", "type": "string", "description": "Nome do evento"}, {"name": "days_remaining", "type": "number", "description": "Dias restantes"}]'),
('Limite de Uso', 'in_app', 'ai', 'Limite de Uso Atingido', 'Você atingiu {{usage_percentage}}% do seu limite mensal de {{service_name}}. Considere fazer upgrade do seu plano.', true, '[{"name": "usage_percentage", "type": "number", "description": "Porcentagem de uso"}, {"name": "service_name", "type": "string", "description": "Nome do serviço"}]'),
('Newsletter Semanal', 'email', 'marketing', 'Newsletter DireitAI - Semana {{week_number}}', 'Confira as principais novidades desta semana no DireitAI: {{content}}', false, '[{"name": "week_number", "type": "number", "description": "Número da semana"}, {"name": "content", "type": "string", "description": "Conteúdo da newsletter"}]'),
('Confirmação de Cadastro', 'email', 'system', 'Confirme seu cadastro no DireitAI', 'Olá {{user_name}}, clique no link para confirmar seu cadastro: {{confirmation_link}}', true, '[{"name": "user_name", "type": "string", "description": "Nome do usuário"}, {"name": "confirmation_link", "type": "string", "description": "Link de confirmação"}]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'notifications', 
    'notification_templates', 
    'notification_queue',
    'email_campaigns',
    'email_campaign_stats',
    'announcement_dismissals', 
    'user_notification_preferences'
)
ORDER BY table_name;

SELECT '✅ Todas as tabelas de notificações e campanhas foram criadas com sucesso!' as status;