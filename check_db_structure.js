const { supabase } = require('./config/supabase');

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estrutura do banco de dados...');
    
    // Verificar tabela users
    console.log('\n👥 Tabela USERS:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Erro ao buscar users:', usersError);
    } else {
      console.log('✅ Usuário encontrado:', users[0]);
    }
    
    // Verificar tabela points
    console.log('\n🎯 Tabela POINTS:');
    const { data: points, error: pointsError } = await supabase
      .from('points')
      .select('*')
      .limit(5);
    
    if (pointsError) {
      console.log('❌ Erro ao buscar points:', pointsError);
    } else {
      console.log('✅ Pontos encontrados:', points.length);
      if (points.length > 0) {
        console.log('📊 Exemplo de ponto:', points[0]);
      }
    }
    
    // Tentar inserir um ponto simples
    console.log('\n💾 Tentando inserir ponto de teste...');
    const testPoint = {
      user_id: users[0]?.id,
      amount: 10,
      reason: 'Teste de inserção',
      source: 'test'
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('points')
      .insert([testPoint])
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir ponto de teste:', insertError);
      
      // Verificar se existe uma tabela user_points ou similar
      console.log('\n🔍 Verificando outras tabelas relacionadas...');
      
      try {
        const { data: userPoints, error: userPointsError } = await supabase
          .from('user_points')
          .select('*')
          .limit(1);
        
        if (!userPointsError) {
          console.log('✅ Tabela user_points encontrada');
        }
      } catch (e) {
        console.log('❌ Tabela user_points não existe');
      }
      
      try {
        const { data: gamification, error: gamificationError } = await supabase
          .from('gamification')
          .select('*')
          .limit(1);
        
        if (!gamificationError) {
          console.log('✅ Tabela gamification encontrada');
        }
      } catch (e) {
        console.log('❌ Tabela gamification não existe');
      }
      
    } else {
      console.log('✅ Ponto de teste inserido com sucesso:', insertResult);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkDatabaseStructure();