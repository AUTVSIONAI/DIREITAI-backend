const axios = require('axios');
const { supabase } = require('./config/supabase');

async function addTestPointsForUser() {
  try {
    // Buscar o usuário específico pelo email
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'maumautremeterra@gmail.com')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro ao buscar usuário:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Usuário maumautremeterra@gmail.com não encontrado');
      console.log('🔍 Vamos verificar todos os usuários...');
      
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .limit(10);
      
      if (allError) {
        console.log('❌ Erro ao buscar todos os usuários:', allError);
        return;
      }
      
      console.log('👥 Usuários encontrados:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
      return;
    }
    
    const user = users[0];
    console.log('👤 Usuário encontrado:', user.email, user.full_name);
    console.log('🆔 User ID:', user.id);
    
    // Verificar se já existem pontos para este usuário
    const { data: existingPoints, error: pointsError } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', user.id);
    
    if (pointsError) {
      console.log('❌ Erro ao verificar pontos existentes:', pointsError);
      return;
    }
    
    console.log(`📊 Pontos existentes: ${existingPoints.length}`);
    
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
      },
      {
        user_id: user.id,
        amount: 30,
        reason: 'Participação em manifestação',
        source: 'event',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 dias atrás
      },
      {
        user_id: user.id,
        amount: 20,
        reason: 'Conversa com IA',
        source: 'ai_chat',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 dia atrás
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
    
    console.log('✅ Pontos inseridos com sucesso!');
    console.log('📊 Total de pontos inseridos:', insertedPoints.length);
    
    // Verificar total de pontos do usuário
    const { data: totalPoints, error: totalError } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', user.id);
    
    if (!totalError && totalPoints) {
      const total = totalPoints.reduce((sum, point) => sum + point.amount, 0);
      console.log('🎯 Total de pontos do usuário:', total);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

addTestPointsForUser();