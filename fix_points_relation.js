const { supabase } = require('./config/supabase');

// Script para corrigir a relação entre tabelas points e users
async function fixPointsRelation() {
  try {
    console.log('🔍 Verificando estrutura das tabelas...');
    
    // Verificar se a tabela points existe e sua estrutura
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('*')
      .limit(1);
    
    console.log('✅ Tabela points existe:', !pointsError);
    if (pointsError) {
      console.log('❌ Erro na tabela points:', pointsError);
    }
    
    // Verificar se a tabela users existe
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id, email')
      .limit(1);
    
    console.log('✅ Tabela users existe:', !usersError);
    if (usersError) {
      console.log('❌ Erro na tabela users:', usersError);
    }
    
    // Testar query com join manual
    console.log('\n🔍 Testando join manual entre points e users...');
    
    const { data: allPoints, error: allPointsError } = await supabase
      .from('points')
      .select('*');
    
    if (allPointsError) {
      console.log('❌ Erro ao buscar pontos:', allPointsError);
      return;
    }
    
    console.log('📊 Total de registros de pontos:', allPoints?.length || 0);
    
    if (allPoints && allPoints.length > 0) {
      // Para cada ponto, buscar o usuário correspondente
      const pointsWithUsers = [];
      
      for (const point of allPoints) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, auth_id, email, full_name, username')
          .eq('auth_id', point.user_id)
          .single();
        
        if (!userError && user) {
          pointsWithUsers.push({
            ...point,
            user: user
          });
        } else {
          console.log(`⚠️ Usuário não encontrado para user_id: ${point.user_id}`);
        }
      }
      
      console.log('✅ Pontos com usuários encontrados:', pointsWithUsers.length);
      
      // Calcular ranking
      const userPointsMap = {};
      pointsWithUsers.forEach(point => {
        const userId = point.user_id;
        if (!userPointsMap[userId]) {
          userPointsMap[userId] = {
            user: point.user,
            totalPoints: 0,
            transactions: []
          };
        }
        userPointsMap[userId].totalPoints += point.amount;
        userPointsMap[userId].transactions.push({
          amount: point.amount,
          reason: point.reason,
          created_at: point.created_at
        });
      });
      
      // Converter para array e ordenar por pontos
      const ranking = Object.values(userPointsMap)
        .sort((a, b) => b.totalPoints - a.totalPoints);
      
      console.log('\n📊 RANKING CALCULADO:');
      ranking.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.user.email || entry.user.username || 'Usuário'} - ${entry.totalPoints} pontos`);
      });
      
      console.log('\n📋 DETALHES DOS PONTOS:');
      ranking.forEach(entry => {
        console.log(`\n👤 ${entry.user.email}:`);
        entry.transactions.forEach(transaction => {
          console.log(`  • ${transaction.amount} pontos - ${transaction.reason} (${transaction.created_at})`);
        });
      });
      
    } else {
      console.log('⚠️ Nenhum ponto encontrado no banco de dados');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixPointsRelation();