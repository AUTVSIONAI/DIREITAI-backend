-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Tabela de anúncios/banners
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    style VARCHAR(20) DEFAULT 'banner' CHECK (style IN ('banner', 'modal', 'toast', 'sidebar')),
    position VARCHAR(20) DEFAULT 'top' CHECK (position IN ('top', 'bottom', 'center')),
    is_dismissible BOOLEAN DEFAULT TRUE,
    is_persistent BOOLEAN DEFAULT FALSE,
    target_audience JSONB DEFAULT '{"type": "all"}'::jsonb,
    display_rules JSONB DEFAULT '{}'::jsonb,
    action JSONB,
    styling JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    dismiss_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para rastrear dispensas de anúncios por usuário
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- Tabela de templates de notificação
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
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fila de notificações
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_start_date ON announcements(start_date);
CREATE INDEX IF NOT EXISTS idx_announcements_end_date ON announcements(end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_id ON announcement_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_announcement_id ON announcement_dismissals(announcement_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_channel ON notification_queue(channel);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE notifications IS 'Tabela para armazenar notificações dos usuários';
COMMENT ON TABLE announcements IS 'Tabela para armazenar anúncios e banners da plataforma';
COMMENT ON TABLE announcement_dismissals IS 'Tabela para rastrear quais anúncios foram dispensados por cada usuário';
COMMENT ON TABLE notification_templates IS 'Tabela para armazenar templates de notificações';
COMMENT ON TABLE notification_queue IS 'Tabela para fila de processamento de notificações';

-- Comentários nas colunas principais
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação (info, success, warning, error, achievement, reminder, social, system)';
COMMENT ON COLUMN notifications.category IS 'Categoria da notificação (event, store, ai, gamification, social, system, security, marketing)';
COMMENT ON COLUMN notifications.priority IS 'Prioridade da notificação (low, medium, high, urgent)';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais da notificação em formato JSON';

COMMENT ON COLUMN announcements.target_audience IS 'Público-alvo do anúncio em formato JSON';
COMMENT ON COLUMN announcements.display_rules IS 'Regras de exibição do anúncio em formato JSON';
COMMENT ON COLUMN announcements.action IS 'Ação do anúncio (botão, link) em formato JSON';
COMMENT ON COLUMN announcements.styling IS 'Estilos customizados do anúncio em formato JSON';

-- Inserir alguns templates padrão
INSERT INTO notification_templates (name, type, category, title, content, is_system, variables) VALUES
('Bem-vindo', 'in_app', 'system', 'Bem-vindo ao DireitAI!', 'Olá {{user_name}}, seja bem-vindo à nossa plataforma! Explore todas as funcionalidades disponíveis.', true, '[{"name": "user_name", "type": "string", "description": "Nome do usuário"}]'),
('Nova Conquista', 'in_app', 'gamification', 'Nova Conquista Desbloqueada!', 'Parabéns! Você desbloqueou a conquista "{{achievement_name}}". Continue assim!', true, '[{"name": "achievement_name", "type": "string", "description": "Nome da conquista"}]'),
('Evento Próximo', 'in_app', 'event', 'Evento se Aproximando', 'O evento "{{event_name}}" acontecerá em {{days_remaining}} dias. Não perca!', true, '[{"name": "event_name", "type": "string", "description": "Nome do evento"}, {"name": "days_remaining", "type": "number", "description": "Dias restantes"}]'),
('Limite de Uso', 'in_app', 'ai', 'Limite de Uso Atingido', 'Você atingiu {{usage_percentage}}% do seu limite mensal de {{service_name}}. Considere fazer upgrade do seu plano.', true, '[{"name": "usage_percentage", "type": "number", "description": "Porcentagem de uso"}, {"name": "service_name", "type": "string", "description": "Nome do serviço"}]')
ON CONFLICT DO NOTHING;

-- Inserir alguns anúncios de exemplo
INSERT INTO announcements (title, message, type, style, position, target_audience, display_rules, created_by) 
SELECT 
    'Bem-vindo ao DireitAI!',
    'Explore todas as funcionalidades da nossa plataforma de direito com inteligência artificial.',
    'info',
    'banner',
    'top',
    '{"type": "all"}',
    '{"max_views_per_user": 3}',
    id
FROM users 
WHERE role = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;