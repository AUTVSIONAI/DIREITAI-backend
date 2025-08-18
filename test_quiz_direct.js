const { supabase } = require('./config/supabase');
const { checkAndUnlockAchievements } = require('./routes/gamification');

async function testQuizDirect() {
  try {
    console.log('🧪 Testando fluxo do quiz diretamente...');
    
    const testUserId = '7b0553e9-0571-4c74-b5e1-d44f1a7b1bb1';
    const quizData = {
      user_id: testUserId,
      quiz_type: 'constitution',
      score: 10, // Pontuação perfeita para testar conquista
      total_questions: 10,
      correct_answers: 10,
      time_spent: 120,
      points_earned: 150, // 10*10 + 40 (accuracy) + 10 (time bonus)
      answers: JSON.stringify([
        { question: 1, answer: 'A', correct: true },
        { question: 2, answer: 'B', correct: true },
        { question: 3, answer: 'C', correct: true },
        { question: 4, answer: 'A', correct: true },
        { question: 5, answer: 'B', correct: true },
        { question: 6, answer: 'C', correct: true },
        { question: 7, answer: 'A', correct: true },
        { question: 8, answer: 'B', correct: true },
        { question: 9, answer: 'C', correct: true },
        { question: 10, answer: 'A', correct: true }
      ])
    };
    
    // 1. Inserir resultado do quiz
    console.log('\n📝 Inserindo resultado do quiz...');
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .insert(quizData)
      .select()
      .single();
    
    if (quizError) {
      console.log('❌ Erro ao inserir quiz result:', quizError.message);
      return;
    }
    
    console.log('✅ Quiz result inserido:', quizResult.id);
    
    // 2. Adicionar pontos
    console.log('\n🎯 Adicionando pontos...');
    const { data: pointsResult, error: pointsError } = await supabase
      .from('points')
      .insert({
        user_id: testUserId,
        amount: quizData.points_earned,
        reason: `Quiz da Constituição - ${quizData.correct_answers}/${quizData.total_questions} acertos`,
        category: 'quiz'
      })
      .select()
      .single();
    
    if (pointsError) {
      console.log('❌ Erro ao adicionar pontos:', pointsError.message);
    } else {
      console.log('✅ Pontos adicionados:', pointsResult.amount);
    }
    
    // 3. Verificar conquistas usando a função do backend
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
      console.log('Stack:', achievementError.stack);
    }
    
    // 4. Verificar totais finais
    console.log('\n📊 Verificando totais finais...');
    
    const { data: finalPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', testUserId);
    
    const totalPoints = finalPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;
    console.log(`💰 Total de pontos: ${totalPoints}`);
    
    const { data: finalBadges } = await supabase
      .from('badges')
      .select('name')
      .eq('user_id', testUserId);
    
    console.log(`🏆 Total de badges: ${finalBadges?.length || 0}`);
    finalBadges?.forEach(badge => {
      console.log(`  - ${badge.name}`);
    });
    
    const { data: activities } = await supabase
      .from('gamification_activities')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log(`🎮 Últimas atividades: ${activities?.length || 0}`);
    activities?.forEach(activity => {
      console.log(`  - ${activity.activity_type}: ${activity.description} (+${activity.points} pts)`);
    });
    
    console.log('\n✅ Teste direto do fluxo do quiz concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQuizDirect();