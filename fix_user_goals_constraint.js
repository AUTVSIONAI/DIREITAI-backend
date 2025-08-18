require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserGoalsConstraint() {
  try {
    console.log('🔧 Verificando e corrigindo tabela user_goals...');
    
    // 1. Verificar se a tabela existe e sua estrutura
    console.log('1. Verificando estrutura da tabela...');
    const { data: tableInfo, error: tableError } = await adminSupabase
      .from('user_goals')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Erro ao acessar tabela user_goals:', tableError.message);
      return;
    }
    
    console.log('✅ Tabela user_goals acessível');
    
    // 2. Buscar um usuário existente para teste
    console.log('2. Buscando usuário para teste...');
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('id, auth_id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado:', usersError?.message);
      return;
    }
    
    const testUser = users[0];
    console.log(`📝 Usuário de teste: ID=${testUser.id}, AUTH_ID=${testUser.auth_id}`);
    
    // 3. Limpar metas de teste existentes
    console.log('3. Limpando metas de teste...');
    await adminSupabase
      .from('user_goals')
      .delete()
      .eq('goal_type', 'test_constraint');
    
    // 4. Testar inserção com ID da tabela users
    console.log('4. Testando inserção com ID da tabela users...');
    const { data: testGoal1, error: insertError1 } = await adminSupabase
      .from('user_goals')
      .insert({
        user_id: testUser.id, // Usar ID da tabela users
        goal_type: 'test_constraint',
        target_value: 100,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        status: 'active'
      })
      .select()
      .single();
    
    if (insertError1) {
      console.log('❌ Erro ao inserir com ID da tabela users:', insertError1.message);
      console.log('   Código:', insertError1.code);
      
      // 5. Testar inserção com auth_id
      console.log('5. Testando inserção com auth_id...');
      const { data: testGoal2, error: insertError2 } = await adminSupabase
        .from('user_goals')
        .insert({
          user_id: testUser.auth_id, // Usar auth_id
          goal_type: 'test_constraint',
          target_value: 100,
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          status: 'active'
        })
        .select()
        .single();
      
      if (insertError2) {
        console.log('❌ Erro ao inserir com auth_id:', insertError2.message);
        console.log('   Código:', insertError2.code);
        
        console.log('\n💡 DIAGNÓSTICO:');
        console.log('   - A tabela user_goals não aceita nem ID da tabela users nem auth_id');
        console.log('   - Isso indica que a foreign key ainda não foi corrigida');
        console.log('\n📝 SOLUÇÃO MANUAL:');
        console.log('   Execute no Supabase Dashboard (SQL Editor):');
        console.log('   1. ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;');
        console.log('   2. ALTER TABLE user_goals ADD CONSTRAINT user_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;');
        return;
      } else {
        console.log('✅ Inserção com auth_id funcionou - tabela ainda usa auth.users');
        console.log('   Meta inserida:', testGoal2.id);
        
        // Limpar meta de teste
        await adminSupabase
          .from('user_goals')
          .delete()
          .eq('id', testGoal2.id);
        
        console.log('\n💡 DIAGNÓSTICO:');
        console.log('   - A tabela user_goals ainda referencia auth.users(id)');
        console.log('   - O código backend foi corrigido para usar public.users(id)');
        console.log('   - Há incompatibilidade entre código e banco de dados');
        console.log('\n🔧 CORREÇÃO NECESSÁRIA:');
        console.log('   - Reverter código para usar auth_id temporariamente, OU');
        console.log('   - Executar SQL manual para corrigir foreign key');
        return;
      }
    } else {
      console.log('✅ Inserção com ID da tabela users funcionou!');
      console.log('   Meta inserida:', testGoal1.id);
      
      // Limpar meta de teste
      await adminSupabase
        .from('user_goals')
        .delete()
        .eq('id', testGoal1.id);
      
      console.log('🎉 Tabela user_goals está corretamente configurada!');
      console.log('   - Foreign key aponta para public.users(id)');
      console.log('   - Código backend está compatível');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

fixUserGoalsConstraint();