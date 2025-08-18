require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsersAndGenerateSQL() {
  try {
    console.log('🔍 Verificando usuários na tabela public.users...');
    
    // Buscar alguns usuários existentes
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('id, auth_id, email')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado na tabela public.users');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   1. Verifique se há usuários cadastrados no sistema');
      console.log('   2. Execute o script de migração de usuários se necessário');
      return;
    }
    
    console.log(`✅ Encontrados ${users.length} usuários:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}`);
      console.log(`      AUTH_ID: ${user.auth_id}`);
      console.log(`      EMAIL: ${user.email || 'N/A'}`);
      console.log('');
    });
    
    // Gerar SQL de teste com ID válido
    const testUserId = users[0].id;
    console.log('📝 SQL DE TESTE GERADO:');
    console.log('-- Execute este SQL no Supabase Dashboard após corrigir a foreign key:');
    console.log('');
    console.log('-- Teste de inserção com ID válido');
    console.log(`INSERT INTO user_goals (`);
    console.log(`    user_id,`);
    console.log(`    goal_type,`);
    console.log(`    target_value,`);
    console.log(`    period_start,`);
    console.log(`    period_end,`);
    console.log(`    status`);
    console.log(`) VALUES (`);
    console.log(`    '${testUserId}', -- ID válido da tabela users`);
    console.log(`    'test_manual_fix',`);
    console.log(`    100,`);
    console.log(`    '2025-01-01',`);
    console.log(`    '2025-01-31',`);
    console.log(`    'active'`);
    console.log(`);`);
    console.log('');
    console.log('-- Se a inserção funcionar, remova o teste:');
    console.log(`DELETE FROM user_goals WHERE goal_type = 'test_manual_fix';`);
    console.log('');
    
    // Verificar se há metas existentes que podem ter IDs inválidos
    console.log('🔍 Verificando metas existentes...');
    const { data: existingGoals, error: goalsError } = await adminSupabase
      .from('user_goals')
      .select('id, user_id, goal_type')
      .limit(10);
    
    if (goalsError) {
      console.log('⚠️ Erro ao buscar metas existentes:', goalsError.message);
    } else if (existingGoals && existingGoals.length > 0) {
      console.log(`📊 Encontradas ${existingGoals.length} metas existentes`);
      
      // Verificar quais user_ids das metas não existem na tabela users
      const goalUserIds = [...new Set(existingGoals.map(g => g.user_id))];
      const validUserIds = users.map(u => u.id);
      const invalidUserIds = goalUserIds.filter(id => !validUserIds.includes(id));
      
      if (invalidUserIds.length > 0) {
        console.log('⚠️ ATENÇÃO: Encontradas metas com user_ids inválidos:');
        invalidUserIds.forEach(id => {
          const affectedGoals = existingGoals.filter(g => g.user_id === id);
          console.log(`   - User ID: ${id} (${affectedGoals.length} metas)`);
        });
        
        console.log('\n🔧 CORREÇÃO NECESSÁRIA:');
        console.log('   Execute este SQL para limpar metas órfãs ANTES de corrigir a foreign key:');
        console.log('');
        invalidUserIds.forEach(id => {
          console.log(`   DELETE FROM user_goals WHERE user_id = '${id}';`);
        });
        console.log('');
      } else {
        console.log('✅ Todas as metas existentes têm user_ids válidos');
      }
    } else {
      console.log('📝 Nenhuma meta existente encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkUsersAndGenerateSQL();