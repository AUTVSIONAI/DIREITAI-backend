const { supabase } = require('./config/supabase');

async function getStatsData() {
  try {
    console.log('📊 Buscando dados de estatísticas...');

    // 1. Total de usuários ativos (com pontos > 0)
    const { data: usersWithPoints, error: usersError } = await supabase
      .from('users')
      .select('id')
      .gte('points', 1);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários com pontos:', usersError);
    }

    // 2. Total de usuários na plataforma
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, created_at');

    if (allUsersError) {
      console.error('❌ Erro ao buscar todos os usuários:', allUsersError);
    }

    // 3. Total de pontos/atividades (simulando check-ins)
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('id, created_at, amount');

    if (pointsError) {
      console.error('❌ Erro ao buscar pontos:', pointsError);
    }

    // 4. Calcular crescimento (usuários criados no último mês vs mês anterior)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const usersLastMonth = allUsers?.filter(user => {
      const createdAt = new Date(user.created_at);
      return createdAt >= lastMonth && createdAt < now;
    }).length || 0;

    const usersTwoMonthsAgo = allUsers?.filter(user => {
      const createdAt = new Date(user.created_at);
      return createdAt >= twoMonthsAgo && createdAt < lastMonth;
    }).length || 0;

    const growthPercentage = usersTwoMonthsAgo > 0 
      ? Math.round(((usersLastMonth - usersTwoMonthsAgo) / usersTwoMonthsAgo) * 100)
      : 0;

    // 5. Estatísticas por período (semana/mês)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const pointsThisWeek = pointsData?.filter(point => {
      const createdAt = new Date(point.created_at);
      return createdAt >= oneWeekAgo;
    }).length || 0;

    const pointsThisMonth = pointsData?.filter(point => {
      const createdAt = new Date(point.created_at);
      return createdAt >= oneMonthAgo;
    }).length || 0;

    console.log('\n📊 ESTATÍSTICAS DA PLATAFORMA:');
    console.log('================================');
    console.log(`👥 Total de usuários: ${allUsers?.length || 0}`);
    console.log(`⭐ Usuários com pontos: ${usersWithPoints?.length || 0}`);
    console.log(`📈 Total de atividades/pontos: ${pointsData?.length || 0}`);
    console.log(`📅 Atividades esta semana: ${pointsThisWeek}`);
    console.log(`📅 Atividades este mês: ${pointsThisMonth}`);
    console.log(`📊 Crescimento mensal: ${growthPercentage > 0 ? '+' : ''}${growthPercentage}%`);
    console.log(`📊 Usuários novos último mês: ${usersLastMonth}`);
    console.log(`📊 Usuários novos mês anterior: ${usersTwoMonthsAgo}`);

    return {
      totalUsers: allUsers?.length || 0,
      activeUsers: usersWithPoints?.length || 0,
      totalActivities: pointsData?.length || 0,
      activitiesThisWeek: pointsThisWeek,
      activitiesThisMonth: pointsThisMonth,
      growthPercentage,
      newUsersLastMonth: usersLastMonth,
      newUsersTwoMonthsAgo: usersTwoMonthsAgo
    };

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return null;
  }
}

getStatsData().then(() => {
  console.log('\n✅ Teste de estatísticas concluído!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});