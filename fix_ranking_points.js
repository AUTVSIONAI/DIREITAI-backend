const { supabase } = require('./config/supabase');

async function fixRankingPoints() {
  try {
    console.log('🎯 Corrigindo pontos para o sistema de ranking...');
    
    // Buscar o usuário pelo email para obter os IDs corretos
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
    console.log('🆔 Public ID:', user.id);
    console.log('🔑 Auth ID:', user.auth_id);
    
    // Limpar pontos existentes para este usuário (usando ambos os IDs)
    console.log('\n🧹 Limpando pontos existentes...');
    await supabase.from('points').delete().eq('user_id', user.id);
    await supabase.from('points').delete().eq('user_id', user.auth_id);
    
    // Inserir pontos de teste usando o ID da tabela public.users
    const pointsToAdd = [
      {
        user_id: user.id, // Usar o ID da tabela public.users
        amount: 100,
        reason: 'Bônus de boas-vindas',
        source: 'system',
        category: 'general'
      },
      {
        user_id: user.id,
        amount: 50,
        reason: 'Primeiro acesso',
        source: 'system',
        category: 'general'
      },
      {
        user_id: user.id,
        amount: 30,
        reason: 'Participação em manifestação',
        source: 'event',
        category: 'event'
      },
      {
        user_id: user.id,
        amount: 25,
        reason: 'Perfil completo',
        source: 'system',
        category: 'profile'
      },
      {
        user_id: user.id,
        amount: 20,
        reason: 'Conversa com IA - Dúvida sobre direitos',
        source: 'ai_chat',
        category: 'ai_interaction'
      },
      {
        user_id: user.id,
        amount: 15,
        reason: 'Conversa com IA - Consulta jurídica',
        source: 'ai_chat',
        category: 'ai_interaction'
      },
      {
        user_id: user.id,
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
    
    // Verificar se os pontos foram inseridos corretamente
    const { data: verifyPoints, error: verifyError } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', user.id);
    
    if (!verifyError && verifyPoints) {
      console.log('\n✅ Verificação: Pontos encontrados:', verifyPoints.length);
      console.log('🎯 Total verificado:', verifyPoints.reduce((sum, p) => sum + p.amount, 0));
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixRankingPoints();