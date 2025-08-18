-- =====================================================
-- SQL PARA CONFIGURAR SISTEMA DE FEEDBACK DE FAKE NEWS
-- Execute este SQL no painel do Supabase
-- =====================================================

-- 1. Criar tabela fake_news_feedback se não existir
CREATE TABLE IF NOT EXISTS public.fake_news_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id UUID NOT NULL REFERENCES public.fake_news_checks(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tipo_feedback VARCHAR(20) NOT NULL CHECK (tipo_feedback IN ('concordo', 'discordo', 'denuncia')),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(check_id, usuario_id) -- Um usuário só pode dar um feedback por verificação
);

-- 2. Adicionar colunas de contadores na tabela fake_news_checks se não existirem
ALTER TABLE public.fake_news_checks 
ADD COLUMN IF NOT EXISTS feedback_positivo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS feedback_negativo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS denuncias INTEGER DEFAULT 0;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_fake_news_feedback_check_id ON public.fake_news_feedback(check_id);
CREATE INDEX IF NOT EXISTS idx_fake_news_feedback_usuario_id ON public.fake_news_feedback(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fake_news_feedback_tipo ON public.fake_news_feedback(tipo_feedback);

-- 4. Criar função RPC para incrementar feedback positivo
CREATE OR REPLACE FUNCTION public.increment_feedback_positivo(check_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.fake_news_checks 
    SET feedback_positivo = feedback_positivo + 1,
        updated_at = NOW()
    WHERE id = check_id;
END;
$$;

-- 5. Criar função RPC para incrementar feedback negativo
CREATE OR REPLACE FUNCTION public.increment_feedback_negativo(check_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.fake_news_checks 
    SET feedback_negativo = feedback_negativo + 1,
        updated_at = NOW()
    WHERE id = check_id;
END;
$$;

-- 6. Criar função RPC para incrementar denúncias
CREATE OR REPLACE FUNCTION public.increment_denuncias(check_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.fake_news_checks 
    SET denuncias = denuncias + 1,
        updated_at = NOW()
    WHERE id = check_id;
END;
$$;

-- 7. Configurar RLS (Row Level Security) para fake_news_feedback
ALTER TABLE public.fake_news_feedback ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios feedbacks
CREATE POLICY "Users can view own feedback" ON public.fake_news_feedback
    FOR SELECT USING (usuario_id = auth.uid());

-- Política para usuários inserirem apenas seus próprios feedbacks
CREATE POLICY "Users can insert own feedback" ON public.fake_news_feedback
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Política para usuários atualizarem apenas seus próprios feedbacks
CREATE POLICY "Users can update own feedback" ON public.fake_news_feedback
    FOR UPDATE USING (usuario_id = auth.uid());

-- Política para admins verem todos os feedbacks
CREATE POLICY "Admins can view all feedback" ON public.fake_news_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fake_news_feedback_updated_at 
    BEFORE UPDATE ON public.fake_news_feedback 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Inserir dados de exemplo (opcional - remover em produção)
-- INSERT INTO public.fake_news_feedback (check_id, usuario_id, tipo_feedback, comentario)
-- VALUES 
--     ('exemplo-uuid-check', 'exemplo-uuid-user', 'concordo', 'Análise muito precisa!'),
--     ('exemplo-uuid-check-2', 'exemplo-uuid-user-2', 'discordo', 'Não concordo com a análise');

COMMIT;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- 1. Execute este SQL no painel do Supabase (SQL Editor)
-- 2. Verifique se todas as tabelas e funções foram criadas
-- 3. Teste o sistema de feedback na aplicação
-- =====================================================