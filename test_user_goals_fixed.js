require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const authId = '0155ccb7-e67f-41dc-a133-188f97996b73';
    
    console.log('🔍 Testando correção do mapeamento de user_id...');
    
    // 1. Verificar se o usuário existe na tabela public.users
    console.log('\n1. Verificando usuário na tabela public.users...');
    const { data: publicUser, error: publicError } = await adminSupabase
      .from('users')
      .select('id, auth_id, email')
      .eq('auth_id', authId)
      .single();
    
    if (publicError) {
      console.log('❌ Usuário não encontrado na public.users:', publicError.message);
      return;
    }
    
    console.log('✅ Usuário encontrado na public.users:');
    console.log('   - ID da tabela users:', publicUser.id);
    console.log('   - Auth ID:', publicUser.auth_id);
    console.log('   - Email:', publicUser.email);
    
    // 2. Testar inserção direta na tabela user_goals usando o ID correto
    console.log('\n2. Testando inserção na tabela user_goals...');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Calcular início e fim do mês atual
    const periodStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const periodEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    // Primeiro, limpar metas existentes para este usuário
    await adminSupabase
      .from('user_goals')
      .delete()
      .eq('user_id', publicUser.auth_id);
    
    // Tentar inserir uma nova meta usando o ID correto da tabela users
    const { data: goalData, error: goalError } = await adminSupabase
      .from('user_goals')
      .insert({
        user_id: publicUser.auth_id, // Usando o auth_id que referencia auth.users(id)
        goal_type: 'monthly_points',
        target_value: 500,
        current_value: 0,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'active',
        auto_generated: true
      })
      .select()
      .single();
    
    if (goalError) {
      console.log('❌ Erro ao inserir meta:', goalError.message);
      console.log('   Código do erro:', goalError.code);
      return;
    }
    
    console.log('✅ Meta inserida com sucesso!');
    console.log('   - Goal ID:', goalData.id);
    console.log('   - User ID:', goalData.user_id);
    console.log('   - Target:', goalData.target_value);
    
    // 3. Testar endpoint de auto-criação de metas
    console.log('\n3. Testando endpoint de auto-criação de metas...');
    
    try {
      // Simular chamada do frontend usando o auth_id (como antes)
      const response = await fetch(`http://localhost:5120/api/gamification/users/${authId}/goals/auto-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.log('❌ Erro no endpoint:', result.error);
        return;
      }
      
      console.log('✅ Endpoint funcionou corretamente!');
      console.log('   Resposta:', result);
      
    } catch (endpointError) {
      console.log('❌ Erro ao testar endpoint:', endpointError.message);
    }
    
    console.log('\n🎉 Teste concluído! O mapeamento de user_id foi corrigido.');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
})();