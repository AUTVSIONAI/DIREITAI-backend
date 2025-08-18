const { supabase } = require('./config/supabase');

async function addCorrectTestPoints() {
  try {
    console.log('🎯 Adicionando pontos de teste com auth_id correto...');
    
    // Buscar o usuário pelo email para obter o auth_id
    const { data: users, error } = await supabase
      .from('users')
      .select('id, auth_id, email, full_name')
      .eq('email', 'maumautremeterra@gmail.com')
      .limit(1);
    
    if (error || !users || users.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const user = users[0];
    console.log('👤 Usuário:', user.email);
    console.log('🆔 ID:', user.id);
    console.log('🔑 Auth ID:', user.auth_id);
    
    // Limpar pontos existentes para este usuário
    console.log('\n🧹 Limpando pontos existentes...');
    const { error: deleteError } = await supabase
      .from('points')
      .delete()
      .eq('user_id', user.auth_id);
    
    if (deleteError) {
      console.log('⚠️ Aviso ao limpar pontos:', deleteError.message);
    }
    
    // Inserir pontos de teste usando auth_id
    const pointsToAdd = [
      {
        user_id: user.auth_id,
        amount: 100,
        reason: 'Bônus de boas-vindas',
        source: 'system',
        category: 'general'
      },
      {
        user_id: user.auth_id,
        amount: 50,
        reason: 'Primeiro acesso',
        source: 'system',
        category: 'general'
      },
      {
        user_id: user.auth_id,
        amount: 30,
        reason: 'Participação em manifestação',
        source: 'event',
        category: 'event'
      },
      {
        user_id: user.auth_id,
        amount: 25,
        reason: 'Perfil completo',
        source: 'system',
        category: 'profile'
      },
      {
        user_id: user.auth_id,
        amount: 20,
        reason: 'Conversa com IA - Dúvida sobre direitos',
        source: 'ai_chat',
        category: 'ai_interaction'
      },
      {
        user_id: user.auth_id,
        amount: 15,
        reason: 'Conversa com IA - Consulta jurídica',
        source: 'ai_chat',
        category: 'ai_interaction'
      },
      {
        user_id: user.auth_id,
        amount: 10,
        reason: 'Login diário',
        source: 'system',
        category: 'daily'
      }
    ];
    
    console.log('\n💾 Inserindo pontos de teste...');
    const { data: insertedPoints, error: insertError } = await supabase
      .from('points')
      .insert(pointsToAdd)
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir pontos:', insertError);
      return;
    }
    
    console.log('✅ Pontos inseridos com sucesso!');
    console.log('📊 Total de pontos inseridos:', insertedPoints.length);
    
    // Calcular total de pontos
    const totalPoints = insertedPoints.reduce((sum, point) => sum + point.amount, 0);
    console.log('🎯 Total de pontos:', totalPoints);
    
    // Atualizar o campo points na tabela users
    console.log('\n🔄 Atualizando total de pontos na tabela users...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ points: totalPoints })
      .eq('id', user.id);
    
    if (updateError) {
      console.log('⚠️ Aviso ao atualizar pontos na tabela users:', updateError);
    } else {
      console.log('✅ Pontos atualizados na tabela users!');
    }
    
    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('📋 Resumo:');
    console.log(`  - Usuário: ${user.email}`);
    console.log(`  - Total de pontos: ${totalPoints}`);
    console.log(`  - Atividades: ${insertedPoints.length}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

addCorrectTestPoints();