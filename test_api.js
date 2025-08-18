const { supabase } = require('./config/supabase');
const axios = require('axios');

// Função para testar a API com um usuário específico
async function testAPI() {
  try {
    console.log('🔍 Testando API de gamificação...');
    
    // Buscar um usuário admin para simular autenticação
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('is_admin', true)
      .limit(1)
      .single();
    
    if (adminError || !adminUser) {
      console.error('❌ Erro ao buscar usuário admin:', adminError);
      return;
    }
    
    console.log('✅ Usuário admin encontrado:', adminUser.email);
    
    // Testar endpoint de ranking sem autenticação (se permitido)
    try {
      console.log('\n🔍 Testando /api/users/ranking...');
      const rankingResponse = await axios.get('http://localhost:5120/api/users/ranking');
      console.log('✅ Ranking response:', rankingResponse.data);
    } catch (error) {
      console.log('❌ Ranking error:', error.response?.data || error.message);
    }
    
    // Testar endpoint de pontos do usuário
    try {
      console.log('\n🔍 Testando pontos do usuário admin...');
      const { data: userPoints, error: pointsError } = await supabase
        .from('points')
        .select('*')
        .eq('user_id', adminUser.auth_id);
      
      console.log('✅ Pontos do usuário admin:', userPoints);
      
      // Calcular total de pontos
      const totalPoints = userPoints?.reduce((sum, point) => sum + point.amount, 0) || 0;
      console.log('📊 Total de pontos:', totalPoints);
      
    } catch (error) {
      console.log('❌ Erro ao buscar pontos:', error);
    }
    
    // Testar busca de todos os usuários com pontos
    try {
      console.log('\n🔍 Testando ranking de todos os usuários...');
      
      const { data: allPoints, error: allPointsError } = await supabase
        .from('points')
        .select(`
          user_id,
          amount,
          users!inner(
            id,
            auth_id,
            email,
            full_name,
            username
          )
        `);
      
      if (allPointsError) {
        console.log('❌ Erro na query de pontos:', allPointsError);
      } else {
        console.log('✅ Pontos com usuários:', allPoints);
        
        // Agrupar pontos por usuário
        const userPointsMap = {};
        allPoints?.forEach(point => {
          const userId = point.user_id;
          if (!userPointsMap[userId]) {
            userPointsMap[userId] = {
              user: point.users,
              totalPoints: 0
            };
          }
          userPointsMap[userId].totalPoints += point.amount;
        });
        
        console.log('📊 Ranking calculado:', userPointsMap);
      }
      
    } catch (error) {
      console.log('❌ Erro ao calcular ranking:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testAPI();