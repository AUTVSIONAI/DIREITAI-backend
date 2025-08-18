require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRankingData() {
  console.log('🔍 Testando dados para o ranking...');
  
  try {
    // Buscar usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, full_name, email, points')
      .limit(20);
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    console.log(`✅ Encontrados ${users?.length || 0} usuários`);
    
    // Buscar pontos da tabela points
    const userIds = users.map(u => u.id);
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('user_id, amount, reason, created_at')
      .in('user_id', userIds);
    
    if (pointsError) {
      console.error('❌ Erro ao buscar pontos:', pointsError);
    } else {
      console.log(`✅ Encontrados ${pointsData?.length || 0} registros de pontos`);
    }
    
    // Calcular pontos totais por usuário
    const userPoints = {};
    if (pointsData) {
      pointsData.forEach(point => {
        if (!userPoints[point.user_id]) {
          userPoints[point.user_id] = 0;
        }
        userPoints[point.user_id] += point.amount;
      });
    }
    
    // Criar ranking
    const rankings = users
      .map(user => ({
        id: user.id,
        username: user.username || user.full_name || 'Usuário',
        email: user.email,
        points: userPoints[user.id] || user.points || 0
      }))
      .filter(user => user.points > 0)
      .sort((a, b) => b.points - a.points);
    
    console.log('\n🏆 RANKING DOS PATRIOTAS:');
    console.log('=' .repeat(50));
    
    if (rankings.length === 0) {
      console.log('❌ Nenhum usuário com pontos encontrado');
    } else {
      rankings.forEach((user, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '  ';
        console.log(`${medal} #${position.toString().padStart(2)} - ${user.username.padEnd(20)} - ${user.points.toString().padStart(4)} pts`);
      });
    }
    
    console.log('\n📊 ESTATÍSTICAS:');
    console.log(`- Total de usuários: ${users.length}`);
    console.log(`- Usuários com pontos: ${rankings.length}`);
    console.log(`- Total de registros de pontos: ${pointsData?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testRankingData();