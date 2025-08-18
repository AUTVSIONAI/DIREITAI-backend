const { supabase } = require('./config/supabase');

async function checkBadgesData() {
  try {
    console.log('🔍 Verificando dados na tabela badges...');
    
    // 1. Verificar estrutura da tabela badges
    console.log('\n📋 Estrutura da tabela badges:');
    const { data: structure, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'badges' })
      .select();
    
    if (structureError) {
      console.log('❌ Erro ao obter estrutura:', structureError.message);
    } else {
      console.log('✅ Estrutura obtida com sucesso');
    }
    
    // 2. Contar total de badges
    console.log('\n📊 Total de badges na tabela:');
    const { count: totalBadges, error: countError } = await supabase
      .from('badges')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Erro ao contar badges:', countError.message);
    } else {
      console.log(`✅ Total de badges: ${totalBadges}`);
    }
    
    // 3. Buscar últimos 10 badges
    console.log('\n🏆 Últimos 10 badges criados:');
    const { data: recentBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (badgesError) {
      console.log('❌ Erro ao buscar badges:', badgesError.message);
    } else {
      console.log(`✅ Encontrados ${recentBadges?.length || 0} badges:`);
      recentBadges?.forEach((badge, index) => {
        console.log(`${index + 1}. ${badge.name} - ${badge.badge_type} (${badge.earned_at})`);
      });
    }
    
    // 4. Verificar badges por usuário
    console.log('\n👥 Badges por usuário:');
    const { data: badgesByUser, error: userBadgesError } = await supabase
      .from('badges')
      .select('user_id, name, badge_type, earned_at')
      .order('user_id', { ascending: true });
    
    if (userBadgesError) {
      console.log('❌ Erro ao buscar badges por usuário:', userBadgesError.message);
    } else {
      const userGroups = {};
      badgesByUser?.forEach(badge => {
        if (!userGroups[badge.user_id]) {
          userGroups[badge.user_id] = [];
        }
        userGroups[badge.user_id].push(badge);
      });
      
      Object.keys(userGroups).forEach(userId => {
        console.log(`\n👤 Usuário ${userId}:`);
        userGroups[userId].forEach(badge => {
          console.log(`  - ${badge.name} (${badge.badge_type}) - ${badge.earned_at}`);
        });
      });
    }
    
    // 5. Verificar quiz_results
    console.log('\n📝 Verificando tabela quiz_results:');
    const { count: quizCount, error: quizCountError } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true });
    
    if (quizCountError) {
      console.log('❌ Erro ao contar quiz_results:', quizCountError.message);
    } else {
      console.log(`✅ Total de quiz_results: ${quizCount}`);
    }
    
    // 6. Buscar últimos quiz results
    const { data: recentQuizzes, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (quizError) {
      console.log('❌ Erro ao buscar quiz_results:', quizError.message);
    } else {
      console.log(`✅ Últimos ${recentQuizzes?.length || 0} quiz results:`);
      recentQuizzes?.forEach((quiz, index) => {
        console.log(`${index + 1}. Usuário: ${quiz.user_id}, Pontuação: ${quiz.score}/${quiz.total_questions}, Pontos: ${quiz.points_earned}`);
      });
    }
    
    // 7. Verificar gamification_activities
    console.log('\n🎮 Verificando atividades de gamificação:');
    const { count: activitiesCount, error: activitiesCountError } = await supabase
      .from('gamification_activities')
      .select('*', { count: 'exact', head: true });
    
    if (activitiesCountError) {
      console.log('❌ Erro ao contar atividades:', activitiesCountError.message);
    } else {
      console.log(`✅ Total de atividades: ${activitiesCount}`);
    }
    
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('gamification_activities')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (activitiesError) {
      console.log('❌ Erro ao buscar atividades:', activitiesError.message);
    } else {
      console.log(`✅ Últimas ${recentActivities?.length || 0} atividades:`);
      recentActivities?.forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.type}: ${activity.title} (${activity.points} pts)`);
      });
    }
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkBadgesData();