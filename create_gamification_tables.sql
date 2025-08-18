-- Script SQL para criar as tabelas do sistema de gamificação
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela quiz_results para armazenar resultados dos quizzes
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_type VARCHAR(50) NOT NULL DEFAULT 'constitution',
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    time_spent INTEGER NOT NULL DEFAULT 0, -- em segundos
    points_earned INTEGER NOT NULL DEFAULT 0,
    answers JSONB, -- array com as respostas detalhadas
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela gamification_activities para registrar todas as atividades
CREATE TABLE IF NOT EXISTS public.gamification_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'quiz_completed', 'checkin_created', 'ai_conversation', etc.
    points INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela achievements (conquistas disponíveis)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT 'trophy',
    category VARCHAR(50) DEFAULT 'general',
    requirements JSONB NOT NULL, -- critérios para desbloquear
    points_reward INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Recriar tabela user_achievements com a estrutura especificada
DROP TABLE IF EXISTS public.user_achievements;

CREATE TABLE public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_type ON public.quiz_results(quiz_type);

CREATE INDEX IF NOT EXISTS idx_gamification_activities_user_id ON public.gamification_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_activities_type ON public.gamification_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_gamification_activities_created_at ON public.gamification_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON public.user_achievements(earned_at);

CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS

-- Políticas para quiz_results
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quiz results" ON public.quiz_results
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para gamification_activities
CREATE POLICY "Users can view their own activities" ON public.gamification_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all activities" ON public.gamification_activities
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para achievements (todos podem ver)
CREATE POLICY "Anyone can view active achievements" ON public.achievements
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage achievements" ON public.achievements
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user achievements" ON public.user_achievements
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Inserir conquistas padrão
INSERT INTO public.achievements (name, description, icon, category, requirements, points_reward) VALUES
('Primeiro Quiz', 'Complete seu primeiro quiz da Constituição', 'trophy', 'quiz', '{"type": "quiz_count", "value": 1}', 50),
('Entusiasta dos Quizzes', 'Complete 5 quizzes da Constituição', 'star', 'quiz', '{"type": "quiz_count", "value": 5}', 100),
('Estudioso da Constituição', 'Complete 10 quizzes da Constituição', 'book', 'quiz', '{"type": "quiz_count", "value": 10}', 200),
('Pontuação Perfeita', 'Obtenha 100% de acertos em um quiz', 'crown', 'quiz', '{"type": "quiz_score", "value": 100}', 150),
('Primeiro Check-in', 'Faça seu primeiro check-in', 'map-pin', 'checkin', '{"type": "checkin_count", "value": 1}', 25),
('Participante Ativo', 'Faça 10 check-ins', 'calendar', 'checkin', '{"type": "checkin_count", "value": 10}', 100),
('Conversador IA', 'Tenha 5 conversas com a IA', 'message-circle', 'ai', '{"type": "ai_conversation_count", "value": 5}', 75),
('Bem-vindo!', 'Complete seu cadastro na plataforma', 'user-plus', 'registration', '{"type": "registration", "value": true}', 25),
('Primeiro Acesso', 'Faça seu primeiro login', 'log-in', 'login', '{"type": "login", "value": true}', 10)
ON CONFLICT DO NOTHING;

-- 9. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar triggers para updated_at
CREATE TRIGGER update_quiz_results_updated_at BEFORE UPDATE ON public.quiz_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Comentários nas tabelas
COMMENT ON TABLE public.quiz_results IS 'Armazena os resultados dos quizzes dos usuários';
COMMENT ON TABLE public.gamification_activities IS 'Registra todas as atividades de gamificação dos usuários';
COMMENT ON TABLE public.achievements IS 'Define as conquistas disponíveis no sistema';
COMMENT ON TABLE public.user_achievements IS 'Armazena as conquistas desbloqueadas pelos usuários';

-- Fim do script
SELECT 'Tabelas de gamificação criadas com sucesso!' as status;