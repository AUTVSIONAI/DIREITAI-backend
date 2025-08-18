const axios = require('axios');
const { supabase } = require('./config/supabase');

async function addTestPoints() {
  try {
    // Buscar um usuário existente
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(1);
    
    if (error || !users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    
    const user = users[0];
    console.log('👤 Usuário encontrado:', user.email, user.full_name);
    console.log('🆔 User ID:', user.id);
    
    // Inserir pontos diretamente na tabela
    const pointsToAdd = [
      {
        user_id: user.id,
        amount: 100,
        reason: 'Bônus de boas-vindas',
        source: 'system',
        created_at: new Date().toISOString()
      },
      {
        user_id: user.id,
        amount: 50,
        reason: 'Primeiro acesso',
        source: 'system',
        created_at: new Date().toISOString()
      },
      {
        user_id: user.id,
        amount: 25,
        reason: 'Perfil completo',
        source: 'system',
        created_at: new Date().toISOString()
      }
    ];
    
    console.log('💾 Inserindo pontos...');
    const { data: insertedPoints, error: insertError } = await supabase
      .from('points')
      .insert(pointsToAdd)
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir pontos:', insertError.message);
      console.log('📋 Detalhes:', insertError);
      return;
    }
    
    console.log('✅ Pontos adicionados com sucesso!');
    console.log('📊 Total de registros:', insertedPoints?.length || 0);
    
    // Verificar total de pontos
    const { data: allPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', user.id);
    
    const totalPoints = allPoints?.reduce((sum, point) => sum + point.amount, 0) || 0;
    console.log('🎯 Total de pontos do usuário:', totalPoints);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

addTestPoints();