-- =====================================================
-- CRIAR TABELAS PARA CHECKPOINT GEOGRÁFICO - MANIFESTAÇÕES
-- Execute este SQL no painel do Supabase
-- =====================================================

-- Criar tabela manifestations para eventos geográficos
CREATE TABLE IF NOT EXISTS manifestations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER NOT NULL DEFAULT 100, -- raio em metros
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos adicionais para controle
    city VARCHAR(100),
    state VARCHAR(50),
    address TEXT,
    image_url TEXT,
    category VARCHAR(50) DEFAULT 'manifestacao',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    -- Metadados em JSON para flexibilidade
    metadata JSONB DEFAULT '{}'
);

-- Criar tabela geographic_checkins para check-ins geográficos
CREATE TABLE IF NOT EXISTS geographic_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manifestation_id UUID NOT NULL REFERENCES manifestations(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos para validação geográfica
    distance_from_center DECIMAL(8, 2), -- distância em metros do centro da manifestação
    is_valid_location BOOLEAN DEFAULT true,
    
    -- Campos para controle de duplicação
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}',
    
    -- Constraint para evitar check-ins duplicados do mesmo usuário na mesma manifestação
    UNIQUE(user_id, manifestation_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_manifestations_location ON manifestations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_manifestations_active ON manifestations(is_active, status);
CREATE INDEX IF NOT EXISTS idx_manifestations_dates ON manifestations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_manifestations_created_by ON manifestations(created_by);
CREATE INDEX IF NOT EXISTS idx_manifestations_city_state ON manifestations(city, state);

CREATE INDEX IF NOT EXISTS idx_geographic_checkins_user ON geographic_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_geographic_checkins_manifestation ON geographic_checkins(manifestation_id);
CREATE INDEX IF NOT EXISTS idx_geographic_checkins_location ON geographic_checkins(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_geographic_checkins_time ON geographic_checkins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_geographic_checkins_valid ON geographic_checkins(is_valid_location);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_manifestations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_manifestations_updated_at ON manifestations;
CREATE TRIGGER update_manifestations_updated_at
    BEFORE UPDATE ON manifestations
    FOR EACH ROW
    EXECUTE FUNCTION update_manifestations_updated_at();

-- Função para calcular distância entre dois pontos geográficos (em metros)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371000; -- raio da Terra em metros
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql;

-- Função para validar se um check-in está dentro do raio da manifestação
CREATE OR REPLACE FUNCTION validate_checkin_location(
    manifestation_id_param UUID,
    checkin_lat DECIMAL,
    checkin_lon DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    manifestation_lat DECIMAL;
    manifestation_lon DECIMAL;
    manifestation_radius INTEGER;
    distance DECIMAL;
BEGIN
    -- Buscar dados da manifestação
    SELECT latitude, longitude, radius 
    INTO manifestation_lat, manifestation_lon, manifestation_radius
    FROM manifestations 
    WHERE id = manifestation_id_param;
    
    -- Se não encontrou a manifestação, retorna false
    IF manifestation_lat IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Calcular distância
    distance := calculate_distance(manifestation_lat, manifestation_lon, checkin_lat, checkin_lon);
    
    -- Verificar se está dentro do raio
    RETURN distance <= manifestation_radius;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar localização automaticamente no check-in
CREATE OR REPLACE FUNCTION validate_geographic_checkin()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular distância do centro da manifestação
    SELECT calculate_distance(
        m.latitude, m.longitude, 
        NEW.latitude, NEW.longitude
    ) INTO NEW.distance_from_center
    FROM manifestations m 
    WHERE m.id = NEW.manifestation_id;
    
    -- Validar se está dentro do raio permitido
    NEW.is_valid_location := validate_checkin_location(
        NEW.manifestation_id, 
        NEW.latitude, 
        NEW.longitude
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_geographic_checkin_trigger ON geographic_checkins;
CREATE TRIGGER validate_geographic_checkin_trigger
    BEFORE INSERT OR UPDATE ON geographic_checkins
    FOR EACH ROW
    EXECUTE FUNCTION validate_geographic_checkin();

-- Habilitar RLS (Row Level Security)
ALTER TABLE manifestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_checkins ENABLE ROW LEVEL SECURITY;

-- Políticas para manifestations
-- Todos podem ver manifestações ativas
CREATE POLICY "Anyone can view active manifestations" ON manifestations
    FOR SELECT USING (is_active = true AND status = 'active');

-- Admins podem ver todas as manifestações
CREATE POLICY "Admins can view all manifestations" ON manifestations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admins podem criar manifestações
CREATE POLICY "Admins can create manifestations" ON manifestations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admins podem atualizar manifestações
CREATE POLICY "Admins can update manifestations" ON manifestations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Políticas para geographic_checkins
-- Usuários podem ver seus próprios check-ins
CREATE POLICY "Users can view own checkins" ON geographic_checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todos os check-ins
CREATE POLICY "Admins can view all checkins" ON geographic_checkins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Usuários autenticados podem fazer check-in
CREATE POLICY "Authenticated users can checkin" ON geographic_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE manifestations IS 'Tabela para armazenar manifestações/eventos geográficos';
COMMENT ON COLUMN manifestations.radius IS 'Raio em metros para validação de check-in';
COMMENT ON COLUMN manifestations.latitude IS 'Latitude do centro da manifestação';
COMMENT ON COLUMN manifestations.longitude IS 'Longitude do centro da manifestação';

COMMENT ON TABLE geographic_checkins IS 'Tabela para armazenar check-ins geográficos em manifestações';
COMMENT ON COLUMN geographic_checkins.distance_from_center IS 'Distância em metros do centro da manifestação';
COMMENT ON COLUMN geographic_checkins.is_valid_location IS 'Se o check-in está dentro do raio válido';

-- Inserir dados de exemplo para teste (opcional)
/*
INSERT INTO manifestations (name, description, latitude, longitude, radius, start_date, end_date, created_by, city, state) VALUES
('Manifestação pela Democracia', 'Grande manifestação em defesa da democracia', -23.5505, -46.6333, 200, NOW(), NOW() + INTERVAL '4 hours', (SELECT id FROM auth.users LIMIT 1), 'São Paulo', 'SP'),
('Ato Público Centro', 'Ato público no centro da cidade', -22.9068, -43.1729, 150, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', (SELECT id FROM auth.users LIMIT 1), 'Rio de Janeiro', 'RJ');
*/

SELECT 'Tabelas de manifestações e check-ins geográficos criadas com sucesso!' as status;