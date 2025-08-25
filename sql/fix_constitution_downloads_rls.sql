-- Corrigir políticas RLS da tabela constitution_downloads
-- O problema é que as políticas estão usando auth.uid() mas o user_id na tabela
-- se refere ao ID da tabela users, não ao auth.users.id

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their own constitution downloads" ON constitution_downloads;
DROP POLICY IF EXISTS "Users can insert their own constitution downloads" ON constitution_downloads;

-- Criar novas políticas que funcionam com o sistema atual
-- Política para usuários verem apenas seus próprios downloads
CREATE POLICY "Users can view their own constitution downloads" ON constitution_downloads
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Política para usuários inserirem apenas seus próprios downloads
CREATE POLICY "Users can insert their own constitution downloads" ON constitution_downloads
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Política para admins verem todos os downloads
CREATE POLICY "Admins can view all constitution downloads" ON constitution_downloads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND (role = 'admin' OR is_admin = true)
        )
    );

-- Comentário para documentação
COMMENT ON TABLE constitution_downloads IS 'Tabela para controlar downloads da Constituição Federal por usuário - RLS corrigido para usar users.id';