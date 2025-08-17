const { supabase } = require('./config/supabase');

(async () => {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');
    
    // Verificar alguns usuários na tabela users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
    } else {
      console.log('📊 Usuários encontrados:', users?.length || 0);
      if (users && users.length > 0) {
        users.forEach((user, i) => {
          console.log(`${i+1}. ID: ${user.id} - Auth ID: ${user.auth_id} - Nome: ${user.name || user.full_name || 'N/A'}`);
        });
      }
    }
    
    console.log('\n🔍 Verificando usuários na tabela auth.users...');
    
    // Tentar verificar auth.users (pode não funcionar devido a RLS)
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .limit(3);
    
    if (authError) {
      console.log('❌ Erro ao buscar auth.users:', authError.message);
    } else {
      console.log('📊 Auth users encontrados:', authUsers?.length || 0);
    }
    
    console.log('\n🔍 Verificando RSVP com user_id específico...');
    
    // Buscar o RSVP que sabemos que existe
    const { data: rsvp, error: rsvpError } = await supabase
      .from('manifestation_rsvp')
      .select('*')
      .eq('user_id', '0155ccb7-e67f-41dc-a133-188f97996b73')
      .single();
    
    if (rsvpError) {
      console.log('❌ Erro ao buscar RSVP:', rsvpError.message);
    } else {
      console.log('📋 RSVP encontrado:', rsvp);
      
      // Tentar buscar o usuário correspondente na tabela users
      const { data: correspondingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', rsvp.user_id)
        .single();
      
      if (userError) {
        console.log('❌ Erro ao buscar usuário correspondente:', userError.message);
      } else {
        console.log('👤 Usuário correspondente:', correspondingUser);
      }
    }
    
  } catch (e) {
    console.log('❌ Erro:', e.message);
  }
})();