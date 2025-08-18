require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const authId = '0155ccb7-e67f-41dc-a133-188f97996b73';
    
    console.log('🔍 Verificando usuário no auth.users...');
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(authId);
    
    if (authError) {
      console.log('❌ Erro ao buscar no auth.users:', authError.message);
      return;
    }
    
    if (!authUser?.user) {
      console.log('❌ Usuário não encontrado no auth.users');
      return;
    }
    
    console.log('✅ Usuário encontrado no auth.users:', authUser.user.email);
    
    // Verificar se existe na tabela public.users
    console.log('🔍 Verificando usuário na tabela public.users...');
    console.log('🔍 Auth ID a ser buscado:', authId);
    
    const { data: publicUser, error: publicError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();
    
    console.log('🔍 Resultado da busca - data:', publicUser);
    console.log('🔍 Resultado da busca - error:', publicError);
    
    if (publicError && publicError.code !== 'PGRST116') {
      console.log('❌ Erro ao buscar na public.users:', publicError.message);
      return;
    }
    
    if (publicUser) {
      console.log('✅ Usuário já existe na public.users:', publicUser.id);
      return;
    }
    
    // Criar usuário na tabela public.users
    console.log('🔧 Criando usuário na tabela public.users...');
    const { data: newUser, error: createError } = await adminSupabase
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || authUser.user.email,
        role: 'user',
        is_admin: false,
        is_active: true
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Erro ao criar usuário na public.users:', createError.message);
      return;
    }
    
    console.log('✅ Usuário criado na public.users:', newUser.id);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
})();