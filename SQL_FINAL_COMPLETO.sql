-- =====================================================
-- SQL COMPLETO PARA CORRIGIR TODOS OS PROBLEMAS
-- Execute este SQL no painel do Supabase
-- =====================================================

-- 1. Adicionar colunas para sincronização com APIs
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS external_id VARCHAR(50);
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'camara', 'senado'));
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS legislature_id INTEGER;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS full_name VARCHAR(500);
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Adicionar colunas para sistema de aprovação
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- 3. Atualizar registros existentes
UPDATE politicians SET 
  source = 'manual',
  status = CASE 
    WHEN is_active = true THEN 'approved'
    ELSE 'pending'
  END,
  approval_status = CASE 
    WHEN is_active = true THEN 'approved'
    ELSE 'pending'
  END,
  is_approved = is_active,
  approved_at = CASE 
    WHEN is_active = true THEN created_at
    ELSE NULL
  END
WHERE source IS NULL OR source = '';

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_politicians_external_id_source ON politicians(external_id, source);
CREATE INDEX IF NOT EXISTS idx_politicians_source ON politicians(source);
CREATE INDEX IF NOT EXISTS idx_politicians_status ON politicians(status);
CREATE INDEX IF NOT EXISTS idx_politicians_approval_status ON politicians(approval_status);
CREATE INDEX IF NOT EXISTS idx_politicians_legislature_id ON politicians(legislature_id);
CREATE INDEX IF NOT EXISTS idx_politicians_email ON politicians(email);

-- 5. Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'politicians' 
AND table_schema = 'public'
AND column_name IN ('email', 'external_id', 'source', 'full_name', 'legislature_id', 'status', 'approval_status', 'is_approved', 'approved_at', 'approved_by')
ORDER BY column_name;

-- 6. Mostrar alguns dados de exemplo para verificar
SELECT 
  id, 
  name, 
  email, 
  external_id, 
  source, 
  status, 
  approval_status, 
  is_approved, 
  is_active,
  created_at
FROM politicians 
LIMIT 3;