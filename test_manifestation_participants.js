const { supabase } = require('./config/supabase');

(async () => {
  try {
    console.log('🔍 Testando API corrigida de participantes de manifestações...');
    
    const manifestationId = '61026b63-f613-40b1-a8b8-a5769eb1617c'; // ID da manifestação que tem RSVP
    
    console.log(`📋 Testando com manifestação ID: ${manifestationId}`);
    
    // Primeiro buscar os RSVPs
    const { data: rsvps, error: rsvpError } = await supabase
      .from('manifestation_rsvp')
      .select('*')
      .eq('manifestation_id', manifestationId);
    
    if (rsvpError) {
      console.log('❌ Erro ao buscar RSVPs:', rsvpError.message);
      return;
    }
    
    console.log(`📊 RSVPs encontrados: ${rsvps?.length || 0}`);
    
    if (!rsvps || rsvps.length === 0) {
      console.log('ℹ️ Nenhum RSVP encontrado');
      return;
    }
    
    // Buscar dados dos usuários
    const userIds = rsvps.map(rsvp => rsvp.user_id);
    console.log('🔍 Buscando usuários com auth_ids:', userIds);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('auth_id, id, username, full_name, email, avatar_url')
      .in('auth_id', userIds);
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }
    
    console.log(`👥 Usuários encontrados: ${users?.length || 0}`);
    
    // Combinar os dados
    const participantsWithUsers = rsvps.map(rsvp => {
      const user = users?.find(u => u.auth_id === rsvp.user_id);
      return {
        ...rsvp,
        user_name: user?.full_name || user?.username || 'Usuário',
        user_email: user?.email || '',
        user_avatar: user?.avatar_url || null
      };
    });
    
    console.log('\n📋 Participantes com dados dos usuários:');
    participantsWithUsers.forEach((participant, i) => {
      console.log(`${i+1}. ${participant.user_name} (${participant.user_email}) - Status: ${participant.status}`);
    });
    
  } catch (e) {
    console.log('❌ Erro:', e.message);
  }
})();