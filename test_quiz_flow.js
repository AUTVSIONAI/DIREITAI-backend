const { supabase } = require('./config/supabase');

async function testQuizFlow() {
  try {
    console.log('🧪 Testando fluxo completo do quiz...');
    
    // 1. Buscar um usuário existente
    console.log('\n👤 Buscando usuário existente...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ Erro ao buscar usuários:', usersError?.message || 'Nenhum usuário encontrado');
      return;
    }
    
    const testUser = users[0];
    console.log(`✅ Usuário encontrado: ${testUser.email} (${testUser.id})`);
    
    // 2. Simular dados do quiz
    const quizData = {
      user_id: testUser.id,
      quiz_type: 'constitution',
      score: 8,
      total_questions: 10,
      correct_answers: 8,
      time_spent: 120,
      points_earned: 130, // 8*10 + 40 (accuracy) + 20 (time bonus)
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
      ])
    };
    
    // 3. Inserir resultado do quiz
    console.log('\n📝 Inserindo resultado do quiz...');
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .insert(quizData)
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
        user_id: testUser.id,
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
    
    // 5. Verificar se há conquistas para desbloquear
    console.log('\n🏆 Verificando conquistas...');
    
    // Verificar se é o primeiro quiz
    const { count: quizCount } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);
    
    console.log(`📊 Total de quizzes do usuário: ${quizCount}`);
    
    // Verificar conquistas existentes
    const { data: userBadges } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', testUser.id);
    
    console.log(`🎖️ Badges atuais do usuário: ${userBadges?.length || 0}`);
    
    // Simular desbloqueio de conquista "Primeiro Quiz" se for o primeiro
    if (quizCount === 1) {
      const firstQuizBadge = userBadges?.find(b => b.badge_type === 'first_quiz');
      if (!firstQuizBadge) {
        console.log('🎉 Desbloqueando conquista "Primeiro Quiz"...');
        
        const { data: newBadge, error: badgeError } = await supabase
          .from('badges')
          .insert({
            user_id: testUser.id,
            badge_type: 'first_quiz',
            achievement_id: 'first_quiz',
            name: 'Primeiro Quiz',
            description: 'Completou seu primeiro quiz da Constituição',
            icon: 'trophy'
          })
          .select()
          .single();
        
        if (badgeError) {
          console.log('❌ Erro ao criar badge:', badgeError.message);
        } else {
          console.log('✅ Badge "Primeiro Quiz" criado:', newBadge.id);
          
          // Adicionar pontos da conquista
          await supabase
            .from('points')
            .insert({
              user_id: testUser.id,
              amount: 50,
              reason: 'Conquista: Primeiro Quiz',
              category: 'achievement'
            });
          
          console.log('✅ Pontos da conquista adicionados: +50');
          
          // Registrar atividade
          await supabase
            .from('gamification_activities')
            .insert({
              user_id: testUser.id,
              activity_type: 'achievement_unlocked',
              points: 50,
              description: 'Conquista desbloqueada: Primeiro Quiz',
              metadata: {
                achievement_id: 'first_quiz',
                achievement_name: 'Primeiro Quiz'
              }
            });
          
          console.log('✅ Atividade registrada');
        }
      } else {
        console.log('ℹ️ Usuário já possui a conquista "Primeiro Quiz"');
      }
    }
    
    // Verificar pontuação perfeita
    if (quizData.correct_answers === quizData.total_questions) {
      const perfectScoreBadge = userBadges?.find(b => b.badge_type === 'perfect_score');
      if (!perfectScoreBadge) {
        console.log('🎉 Desbloqueando conquista "Pontuação Perfeita"...');
        
        const { data: newBadge, error: badgeError } = await supabase
          .from('badges')
          .insert({
            user_id: testUser.id,
            badge_type: 'perfect_score',
            achievement_id: 'perfect_score',
            name: 'Pontuação Perfeita',
            description: 'Acertou todas as questões em um quiz',
            icon: 'star'
          })
          .select()
          .single();
        
        if (badgeError) {
          console.log('❌ Erro ao criar badge:', badgeError.message);
        } else {
          console.log('✅ Badge "Pontuação Perfeita" criado:', newBadge.id);
          
          // Adicionar pontos da conquista
          await supabase
            .from('points')
            .insert({
              user_id: testUser.id,
              amount: 100,
              reason: 'Conquista: Pontuação Perfeita',
              category: 'achievement'
            });
          
          console.log('✅ Pontos da conquista adicionados: +100');
        }
      } else {
        console.log('ℹ️ Usuário já possui a conquista "Pontuação Perfeita"');
      }
    }
    
    // 6. Verificar totais finais
    console.log('\n📊 Verificando totais finais...');
    
    const { data: finalPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', testUser.id);
    
    const totalPoints = finalPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;
    console.log(`💰 Total de pontos: ${totalPoints}`);
    
    const { data: finalBadges } = await supabase
      .from('badges')
      .select('name')
      .eq('user_id', testUser.id);
    
    console.log(`🏆 Total de badges: ${finalBadges?.length || 0}`);
    finalBadges?.forEach(badge => {
      console.log(`  - ${badge.name}`);
    });
    
    const { data: activities } = await supabase
      .from('gamification_activities')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`🎮 Últimas atividades: ${activities?.length || 0}`);
    activities?.forEach(activity => {
      console.log(`  - ${activity.activity_type}: ${activity.description} (+${activity.points} pts)`);
    });
    
    console.log('\n✅ Teste do fluxo do quiz concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

testQuizFlow();