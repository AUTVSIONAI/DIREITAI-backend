-- =====================================================
-- CRIAR TABELA SYSTEM_SETTINGS PARA CONFIGURAÇÕES DO SISTEMA
-- Execute este SQL no painel do Supabase
-- =====================================================

-- Criar tabela system_settings se não existir
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_created_at ON system_settings(created_at);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_system_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at_column();

-- Inserir configurações padrão
INSERT INTO system_settings (key, value, description) VALUES
('general', '{
  "siteName": "DireitaAI",
  "siteDescription": "Plataforma de engajamento político conservador",
  "siteLogo": null,
  "maintenanceMode": false,
  "registrationEnabled": true,
  "maxUsersPerEvent": 500
}', 'Configurações gerais do sistema'),

('ai', '{
  "dailyLimitGratuito": 10,
  "dailyLimitEngajado": 50,
  "dailyLimitLider": 200,
  "dailyLimitSupremo": -1,
  "creativeAIEnabled": true
}', 'Configurações de IA'),

('points', '{
  "checkinPoints": 10,
  "purchasePointsRatio": 0.1,
  "referralPoints": 50
}', 'Configurações do sistema de pontos'),

('store', '{
  "freeShippingThreshold": 100,
  "shippingCost": 15,
  "taxRate": 0.08
}', 'Configurações da loja'),

('security', '{
  "minPasswordLength": 8,
  "sessionTimeout": 3600,
  "twoFactorEnabled": false,
  "maxLoginAttempts": 5
}', 'Configurações de segurança'),

('notifications', '{
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "emailProvider": "smtp",
  "smsProvider": "twilio"
}', 'Configurações de notificações'),

('system', '{
  "maxFileSize": 10485760,
  "apiRateLimit": 1000,
  "backupFrequency": "daily",
  "logLevel": "info"
}', 'Configurações do sistema')

ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que apenas admins acessem as configurações
CREATE POLICY "Admin can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE system_settings IS 'Tabela para armazenar configurações do sistema';
COMMENT ON COLUMN system_settings.key IS 'Chave única da configuração';
COMMENT ON COLUMN system_settings.value IS 'Valor da configuração em formato JSON';
COMMENT ON COLUMN system_settings.description IS 'Descrição da configuração';