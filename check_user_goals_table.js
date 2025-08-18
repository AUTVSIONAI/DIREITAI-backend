const { supabase } = require('./config/supabase');

async function checkUserGoalsTable() {
  try {
    console.log('🔍 Verificando se a tabela user_goals existe...');
    
    // Tentar fazer uma query simples na tabela para verificar se existe
    const { data: testQuery, error: testError } = await supabase
      .from('user_goals')
      .select('id')
      .limit(1);
    
    if (testError) {
      if (testError.code === '42P01') {
        console.log('❌ Tabela user_goals não existe!');
        console.log('💡 Execute o SQL para criar a tabela primeiro.');
        return;
      } else {
        console.error('❌ Erro ao acessar tabela:', testError);
        return;
      }
    }
    
    console.log('✅ Tabela user_goals existe e está acessível!');
    
    // Contar registros existentes
    const { count, error: countError } = await supabase
      .from('user_goals')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📊 Total de metas na tabela: ${count || 0}`);
    }
    
    // Testar inserção de uma meta de exemplo
    console.log('\n🧪 Testando criação de meta automática...');
    
    // Buscar um usuário existente para teste
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id, level')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado para teste');
      return;
    }
    
    const testUser = users[0];
    console.log(`📝 Usando usuário de teste: ${testUser.id} (nível ${testUser.level || 1})`);
    
    // Verificar se já existe uma meta para este usuário no mês atual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const { data: existingGoals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', testUser.auth_id)
      .eq('goal_type', 'monthly_points')
      .eq('period_start', monthStart)
      .eq('period_end', monthEnd);
    
    if (existingGoals && existingGoals.length > 0) {
      console.log('✅ Meta mensal já existe para este usuário:');
      console.log(JSON.stringify(existingGoals[0], null, 2));
    } else {
      // Criar meta de teste
      const targetValue = Math.max(500, (testUser.level || 1) * 100);
      
      const { data: newGoal, error: goalError } = await supabase
        .from('user_goals')
        .insert({
          user_id: testUser.auth_id,
          goal_type: 'monthly_points',
          target_value: targetValue,
          current_value: 0,
          period_start: monthStart,
          period_end: monthEnd,
          status: 'active',
          auto_generated: true
        })
        .select()
        .single();
      
      if (goalError) {
        console.error('❌ Erro ao criar meta de teste:', goalError);
      } else {
        console.log('✅ Meta de teste criada com sucesso:');
        console.log(JSON.stringify(newGoal, null, 2));
      }
    }
    
    console.log('\n🎉 Verificação da tabela user_goals concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkUserGoalsTable();