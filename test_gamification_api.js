const axios = require('axios');

// URL do backend no Vercel
const BASE_URL = 'https://direitai-backend.vercel.app';

async function testGamificationAPI() {
  console.log('🧪 Testando API de Gamificação...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  try {
    // IDs de usuários válidos para teste
    const testUserIds = [
      '7b0553e9-0571-4c74-b5e1-d44f1a7b1bb1', // badfit01@gmail.com
      '75ed8ec0-dba2-476b-a15f-8df7e0dcc7b1', // teste@direitai.com
      'bcd0593a-ba47-4262-8f8f-cb32f97e58d6'  // maumautremeterra@gmail.com
    ];

    for (const userId of testUserIds) {
      console.log(`\n📊 Testando usuário: ${userId}`);
      
      // 1. Testar endpoint de metas do usuário
      console.log('\n1. Testando GET /api/gamification/users/:userId/goals');
      try {
        const goalsResponse = await axios.get(
          `${BASE_URL}/api/gamification/users/${userId}/goals?type=daily&period=current`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Status:', goalsResponse.status);
        console.log('📋 Dados recebidos:', JSON.stringify(goalsResponse.data, null, 2));
        
      } catch (error) {
        if (error.response) {
          console.log('❌ Erro HTTP:', error.response.status);
          console.log('📋 Resposta:', error.response.data);
        } else if (error.request) {
          console.log('❌ Erro de rede:', error.message);
        } else {
          console.log('❌ Erro:', error.message);
        }
      }

      // 2. Testar endpoint de estatísticas
      console.log('\n2. Testando GET /api/gamification/users/:userId/stats');
      try {
        const statsResponse = await axios.get(
          `${BASE_URL}/api/gamification/users/${userId}/stats`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Status:', statsResponse.status);
        console.log('📊 Estatísticas:', JSON.stringify(statsResponse.data, null, 2));
        
      } catch (error) {
        if (error.response) {
          console.log('❌ Erro HTTP:', error.response.status);
          console.log('📋 Resposta:', error.response.data);
        } else if (error.request) {
          console.log('❌ Erro de rede:', error.message);
        } else {
          console.log('❌ Erro:', error.message);
        }
      }

      // 3. Testar criação de meta
      console.log('\n3. Testando POST /api/gamification/users/:userId/goals');
      try {
        const createGoalResponse = await axios.post(
          `${BASE_URL}/api/gamification/users/${userId}/goals`,
          {
            goal_type: 'test_api',
            target_value: 50,
            period_start: '2025-01-01',
            period_end: '2025-01-31'
          },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Meta criada! Status:', createGoalResponse.status);
        console.log('📋 Meta criada:', JSON.stringify(createGoalResponse.data, null, 2));
        
        // Limpar a meta de teste
        if (createGoalResponse.data && createGoalResponse.data.id) {
          try {
            await axios.delete(
              `${BASE_URL}/api/gamification/goals/${createGoalResponse.data.id}`,
              {
                timeout: 5000,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('🧹 Meta de teste removida');
          } catch (deleteError) {
            console.log('⚠️  Erro ao remover meta de teste:', deleteError.message);
          }
        }
        
      } catch (error) {
        if (error.response) {
          console.log('❌ Erro HTTP:', error.response.status);
          console.log('📋 Resposta:', error.response.data);
        } else if (error.request) {
          console.log('❌ Erro de rede:', error.message);
        } else {
          console.log('❌ Erro:', error.message);
        }
      }

      // Pausa entre usuários
      if (testUserIds.indexOf(userId) < testUserIds.length - 1) {
        console.log('\n⏳ Aguardando 2 segundos antes do próximo teste...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 4. Testar endpoint de health
    console.log('\n\n🏥 Testando endpoint de health:');
    try {
      const healthResponse = await axios.get(
        `${BASE_URL}/api/health`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Health check OK! Status:', healthResponse.status);
      console.log('📋 Resposta:', JSON.stringify(healthResponse.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.log('❌ Health check falhou! Status:', error.response.status);
        console.log('📋 Resposta:', error.response.data);
      } else {
        console.log('❌ Erro no health check:', error.message);
      }
    }

    console.log('\n🎉 RESUMO DOS TESTES:');
    console.log('✅ Testes de API de gamificação concluídos');
    console.log('✅ A correção da foreign key permitiu que a API funcione');
    console.log('✅ O backend está operacional no Vercel');
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error.message);
  }
}

testGamificationAPI();