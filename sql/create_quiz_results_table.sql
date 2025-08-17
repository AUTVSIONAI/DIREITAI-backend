-- Criar tabela para armazenar resultados dos quizzes
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_type VARCHAR(50) NOT NULL DEFAULT 'constitution',
    score INTEGER NOT NULL CHECK (score >= 0),
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0 AND correct_answers <= total_questions),
    time_spent INTEGER NOT NULL CHECK (time_spent > 0), -- em segundos
    points_earned INTEGER NOT NULL DEFAULT 0,
    answers JSONB, -- armazenar as respostas do usuário
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_type ON quiz_results(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON quiz_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON quiz_results(score DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios resultados
CREATE POLICY "Users can view their own quiz results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem apenas seus próprios resultados
CREATE POLICY "Users can insert their own quiz results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem apenas seus próprios resultados
CREATE POLICY "Users can update their own quiz results" ON quiz_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quiz_results_updated_at
    BEFORE UPDATE ON quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE quiz_results IS 'Armazena os resultados dos quizzes realizados pelos usuários';
COMMENT ON COLUMN quiz_results.user_id IS 'ID do usuário que realizou o quiz';
COMMENT ON COLUMN quiz_results.quiz_type IS 'Tipo do quiz (constitution, etc.)';
COMMENT ON COLUMN quiz_results.score IS 'Pontuação obtida no quiz (0-100)';
COMMENT ON COLUMN quiz_results.total_questions IS 'Número total de questões do quiz';
COMMENT ON COLUMN quiz_results.correct_answers IS 'Número de respostas corretas';
COMMENT ON COLUMN quiz_results.time_spent IS 'Tempo gasto no quiz em segundos';
COMMENT ON COLUMN quiz_results.points_earned IS 'Pontos de gamificação ganhos';
COMMENT ON COLUMN quiz_results.answers IS 'JSON com as respostas do usuário';
COMMENT ON COLUMN quiz_results.completed_at IS 'Data e hora de conclusão do quiz';