require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔧 Corrigindo foreign key da tabela user_goals...');
    
    // 1. Primeiro, vamos verificar a constraint atual
    console.log('\n🔍 Verificando constraint atual...');
    const { data: constraints, error: constraintError } = await adminSupabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'user_goals')
      .eq('constraint_type', 'FOREIGN KEY');
    
    if (constraintError) {
      console.log('❌ Erro ao verificar constraints:', constraintError.message);
    } else {
      console.log('📋 Constraints encontradas:', constraints?.length || 0);
    }
    
    // 2. Tentar remover a constraint usando SQL direto
    console.log('\n🔄 Tentando remover constraint existente...');
    try {
      const { error: dropError } = await adminSupabase
        .rpc('exec_sql', { query: 'ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey' });
      
      if (dropError) {
        console.log('⚠️ Não foi possível usar exec_sql:', dropError.message);
      } else {
        console.log('✅ Constraint removida');
      }
    } catch (e) {
      console.log('⚠️ exec_sql não disponível, tentando abordagem alternativa...');
    }
    
    // 3. Verificar se podemos inserir dados de teste
    console.log('\n🧪 Testando inserção na tabela user_goals...');
    const testUserId = 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6';
    
    const { data: insertTest, error: insertError } = await adminSupabase
      .from('user_goals')
      .insert({
        user_id: testUserId,
        goal_type: 'test_goal',
        target_value: 100,
        period_start: '2025-08-01',
        period_end: '2025-08-31',
        status: 'active'
      })
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir teste:', insertError.message);
      console.log('🔍 Código do erro:', insertError.code);
      
      if (insertError.code === '23503') {
        console.log('\n💡 Confirmado: Foreign key ainda aponta para auth.users');
        console.log('📝 SOLUÇÃO: Execute manualmente no Supabase Dashboard:');
        console.log('\n-- 1. Remover constraint existente');
        console.log('ALTER TABLE user_goals DROP CONSTRAINT user_goals_user_id_fkey;');
        console.log('\n-- 2. Adicionar nova constraint');
        console.log('ALTER TABLE user_goals ADD CONSTRAINT user_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;');
      }
    } else {
      console.log('✅ Inserção de teste bem-sucedida!');
      console.log('🧹 Removendo dados de teste...');
      
      // Remover o registro de teste
      await adminSupabase
        .from('user_goals')
        .delete()
        .eq('goal_type', 'test_goal');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
})();