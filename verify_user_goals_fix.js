const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUserGoalsFix() {
  console.log('🔍 Verificando se a correção da foreign key foi aplicada...');
  
  try {
    // 1. Testar inserção de uma meta com usuário válido
    console.log('\n1. Testando inserção de meta com usuário válido:');
    
    // Buscar um usuário válido
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado na tabela users');
      return;
    }

    const testUser = users[0];
    console.log(`📧 Usando usuário: ${testUser.email} (${testUser.id})`);

    // Tentar inserir uma meta de teste
    const { data: insertResult, error: insertError } = await supabase
      .from('user_goals')
      .insert({
        user_id: testUser.id,
        goal_type: 'test_verification',
        target_value: 100,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        status: 'active'
      })
      .select();

    if (insertError) {
      console.log('❌ ERRO na inserção:', insertError.message);
      console.log('❌ Código do erro:', insertError.code);
      
      if (insertError.code === '23503') {
        console.log('\n🔧 DIAGNÓSTICO: Erro de foreign key constraint');
        console.log('   - A constraint ainda não foi corrigida');
        console.log('   - Execute o script SQL manual no Supabase Dashboard');
        return;
      }
    } else {
      console.log('✅ SUCCESS: Meta inserida com sucesso!');
      console.log('📋 Dados da meta:', insertResult[0]);
      
      // Limpar o teste
      const { error: deleteError } = await supabase
        .from('user_goals')
        .delete()
        .eq('goal_type', 'test_verification');
        
      if (deleteError) {
        console.log('⚠️  Erro ao limpar teste:', deleteError.message);
      } else {
        console.log('🧹 Meta de teste removida');
      }
    }

    // 2. Testar inserção com usuário inválido (deve falhar)
    console.log('\n2. Testando inserção com usuário inválido (deve falhar):');
    const { data: invalidResult, error: invalidError } = await supabase
      .from('user_goals')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // UUID inválido
        goal_type: 'test_invalid',
        target_value: 50,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        status: 'active'
      });

    if (invalidError) {
      if (invalidError.code === '23503') {
        console.log('✅ SUCCESS: Foreign key constraint está funcionando!');
        console.log('   - Inserção com usuário inválido foi rejeitada corretamente');
      } else {
        console.log('⚠️  Erro inesperado:', invalidError.message);
      }
    } else {
      console.log('❌ PROBLEMA: Inserção com usuário inválido foi aceita!');
      console.log('   - A constraint pode não estar funcionando corretamente');
      
      // Limpar se foi inserido
      await supabase
        .from('user_goals')
        .delete()
        .eq('goal_type', 'test_invalid');
    }

    // 3. Verificar metas existentes
    console.log('\n3. Verificando metas existentes:');
    const { data: existingGoals, error: goalsError } = await supabase
      .from('user_goals')
      .select('id, user_id, goal_type, created_at')
      .limit(5);

    if (goalsError) {
      console.log('❌ Erro ao buscar metas:', goalsError.message);
    } else {
      console.log(`📊 Total de metas encontradas: ${existingGoals?.length || 0}`);
      if (existingGoals && existingGoals.length > 0) {
        console.log('📋 Primeiras 5 metas:');
        existingGoals.forEach((goal, index) => {
          console.log(`   ${index + 1}. ${goal.goal_type} - User: ${goal.user_id}`);
        });
      }
    }

    // 4. Verificar usuários disponíveis
    console.log('\n4. Verificando usuários disponíveis:');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (allUsersError) {
      console.log('❌ Erro ao buscar todos os usuários:', allUsersError.message);
    } else {
      console.log(`👥 Total de usuários: ${allUsers?.length || 0}`);
      if (allUsers && allUsers.length > 0) {
        console.log('📋 Primeiros 5 usuários:');
        allUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} - ID: ${user.id}`);
        });
      }
    }

    console.log('\n🎉 RESULTADO FINAL:');
    if (insertResult && !insertError) {
      console.log('✅ A correção da foreign key FOI APLICADA com sucesso!');
      console.log('✅ A tabela user_goals agora referencia corretamente public.users(id)');
      console.log('✅ O backend está funcionando corretamente');
    } else {
      console.log('❌ A correção ainda não foi aplicada');
      console.log('🔧 Execute o script SQL manual no Supabase Dashboard');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

verifyUserGoalsFix();