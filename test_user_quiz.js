const { supabase } = require('./config/supabase');
const { checkAndUnlockAchievements } = require('./routes/gamification');

async function testUserQuiz() {
  try {
    console.log('🧪 Testando quiz para usuário específico...');
    
    // Usar o usuário que está relatando o problema
    const testUserId = 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6'; // maumautremeterra@gmail.com
    
    console.log('👤 Testando com usuário:', testUserId);
    
    // 1. Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (userError) {
      console.log('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    console.log('✅ Usuário encontrado:', user.email);
    
    // 2. Simular dados do quiz (usando estrutura correta da tabela)
    const quizData = {
      quiz_type: 'constitution',
      score: 85,
      total_questions: 10,
      correct_answers: 8,
      time_spent: 120,
      points_earned: 85,
      answers: JSON.stringify([
        { question: 1, answer: 'A', correct: true },
        { question: 2, answer: 'B', correct: true },
        { question: 3, answer: 'C', correct: false },
        { question: 4, answer: 'A', correct: true },
        { question: 5, answer: 'B', correct: true },
        { question: 6, answer: 'C', correct: true },
        { question: 7, answer: 'A', correct: false },
        { question: 8, answer: 'B', correct: true },
        { question: 9, answer: 'C', correct: true },
        { question: 10, answer: 'A', correct: true }
      ]),
      metadata: { test: true }
    };
    
    // 3. Inserir resultado do quiz
    console.log('📝 Inserindo resultado do quiz...');
    const quizDataWithUser = {
      ...quizData,
      user_id: testUserId
    };
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .insert(quizDataWithUser)
      .select()
      .single();
    
    if (quizError) {
      console.log('❌ Erro ao inserir quiz result:', quizError.message);
      console.log('Detalhes:', quizError);
      return;
    }
    
    console.log('✅ Quiz result inserido:', quizResult.id);
    
    // 4. Adicionar pontos
    console.log('\n🎯 Adicionando pontos...');
    const { data: pointsResult, error: pointsError } = await supabase
      .from('points')
      .insert({
        user_id: testUserId,
        amount: quizData.points_earned,
        reason: `Quiz da Constituição - ${quizData.correct_answers}/${quizData.total_questions} acertos`,
        category: 'quiz',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (pointsError) {
      console.log('❌ Erro ao adicionar pontos:', pointsError.message);
      console.log('Detalhes:', pointsError);
    } else {
      console.log('✅ Pontos adicionados:', pointsResult.amount);
    }
    
    // 5. Verificar conquistas
    console.log('\n🏆 Verificando conquistas...');
    try {
      const newAchievements = await checkAndUnlockAchievements(testUserId, 'quiz_completed', {
        score: (quizData.correct_answers / quizData.total_questions) * 100,
        correctAnswers: quizData.correct_answers,
        totalQuestions: quizData.total_questions,
        timeSpent: quizData.time_spent
      });
      
      console.log('✅ Função checkAndUnlockAchievements executada');
      console.log('🎖️ Novas conquistas:', newAchievements?.length || 0);
      
      if (newAchievements && newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
          console.log(`  - ${achievement.name}: ${achievement.description}`);
        });
      }
      
    } catch (achievementError) {
      console.log('❌ Erro ao verificar conquistas:', achievementError.message);
      console.log('Detalhes:', achievementError);
    }
    
    // 6. Verificar totais do usuário
    console.log('\n📊 Verificando totais do usuário...');
    
    const { data: userPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', testUserId);
    
    const totalPoints = userPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;
    console.log(`💰 Total de pontos: ${totalPoints}`);
    
    const { data: userBadges } = await supabase
      .from('badges')
      .select('name')
      .eq('user_id', testUserId);
    
    console.log(`🏆 Total de badges: ${userBadges?.length || 0}`);
    userBadges?.forEach(badge => {
      console.log(`  - ${badge.name}`);
    });
    
    const { data: activities } = await supabase
      .from('gamification_activities')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`🎮 Últimas atividades: ${activities?.length || 0}`);
    activities?.forEach(activity => {
      console.log(`  - ${activity.activity_type}: ${activity.description} (+${activity.points} pts)`);
    });
    
    console.log('\n✅ Teste do usuário específico concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

testUserQuiz();