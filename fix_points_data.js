const { supabase } = require('./config/supabase');

async function fixPointsData() {
  try {
    console.log('🔧 Corrigindo dados de pontos...');
    
    // Primeiro, vamos ver qual user_id funciona na tabela points
    const { data: existingPoints, error: pointsError } = await supabase
      .from('points')
      .select('user_id')
      .limit(1);
    
    if (pointsError) {
      console.log('❌ Erro ao buscar pontos existentes:', pointsError);
      return;
    }
    
    if (existingPoints.length > 0) {
      const workingUserId = existingPoints[0].user_id;
      console.log('✅ User ID que funciona:', workingUserId);
      
      // Verificar se este user_id existe na tabela users
      const { data: workingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', workingUserId)
        .limit(1);
      
      if (userError) {
        console.log('❌ Erro ao buscar usuário que funciona:', userError);
      } else if (workingUser.length > 0) {
        console.log('✅ Usuário que funciona:', workingUser[0].email);
      } else {
        console.log('❌ Usuário que funciona não encontrado na tabela users');
      }
    }
    
    // Agora vamos tentar uma abordagem diferente: atualizar os pontos existentes
    // para o nosso usuário de teste
    const ourUserId = 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6';
    
    console.log('\n🔄 Tentando atualizar pontos existentes para nosso usuário...');
    
    // Primeiro, vamos limpar pontos antigos se existirem
    const { error: deleteError } = await supabase
      .from('points')
      .delete()
      .eq('user_id', ourUserId);
    
    if (deleteError) {
      console.log('⚠️ Aviso ao deletar pontos antigos:', deleteError.message);
    }
    
    // Agora vamos tentar uma inserção direta usando SQL
    console.log('\n💾 Tentando inserção direta...');
    
    const { data: sqlResult, error: sqlError } = await supabase.rpc('insert_test_points', {
      p_user_id: ourUserId,
      p_amount: 100,
      p_reason: 'Teste de pontos',
      p_source: 'system'
    });
    
    if (sqlError) {
      console.log('❌ Erro na função SQL:', sqlError);
      
      // Se a função não existe, vamos tentar uma abordagem mais simples
      console.log('\n🔄 Tentando abordagem alternativa...');
      
      // Vamos verificar se podemos inserir usando o auth_id em vez do id
      const { data: userByAuth, error: authError } = await supabase
        .from('users')
        .select('auth_id')
        .eq('email', 'maumautremeterra@gmail.com')
        .limit(1);
      
      if (!authError && userByAuth.length > 0) {
        console.log('🔑 Auth ID do usuário:', userByAuth[0].auth_id);
        
        // Tentar inserir usando auth_id
        const testPointWithAuth = {
          user_id: userByAuth[0].auth_id,
          amount: 100,
          reason: 'Teste com auth_id',
          source: 'system'
        };
        
        const { data: authResult, error: authInsertError } = await supabase
          .from('points')
          .insert([testPointWithAuth])
          .select();
        
        if (authInsertError) {
          console.log('❌ Erro com auth_id também:', authInsertError);
        } else {
          console.log('✅ Sucesso com auth_id!', authResult);
        }
      }
    } else {
      console.log('✅ Função SQL executada com sucesso:', sqlResult);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixPointsData();