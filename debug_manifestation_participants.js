const { supabase } = require('./config/supabase');
const axios = require('axios');

async function debugManifestationParticipants() {
  try {
    console.log('🔍 Testando API de participantes de manifestações...');
    
    // Primeiro, vamos buscar uma manifestação existente
    const { data: manifestations, error: manifestationsError } = await supabase
      .from('manifestations')
      .select('id, name')
      .limit(1);
    
    if (manifestationsError) {
      console.error('❌ Erro ao buscar manifestações:', manifestationsError);
      return;
    }
    
    if (!manifestations || manifestations.length === 0) {
      console.log('❌ Nenhuma manifestação encontrada');
      return;
    }
    
    const manifestation = manifestations[0];
    console.log('✅ Manifestação encontrada:', manifestation);
    
    // Agora vamos testar a lógica da API diretamente
    const manifestationId = manifestation.id;
    const page = 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    
    console.log('🔍 Buscando RSVPs para manifestação:', manifestationId);
    
    // Primeiro buscar os RSVPs
    let rsvpQuery = supabase
      .from('manifestation_rsvp')
      .select('*')
      .eq('manifestation_id', manifestationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data: rsvps, error: rsvpError, count } = await rsvpQuery;
    
    if (rsvpError) {
      console.error('❌ Erro ao buscar RSVPs:', rsvpError);
      return;
    }
    
    console.log('✅ RSVPs encontrados:', rsvps?.length || 0);
    console.log('📊 Total count:', count);
    
    if (rsvps && rsvps.length > 0) {
      console.log('📋 Primeiro RSVP:', rsvps[0]);
      
      // Buscar dados dos usuários separadamente
      const userIds = rsvps.map(rsvp => rsvp.user_id);
      console.log('🔍 User IDs para buscar:', userIds);
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('auth_id, id, username, full_name, email, avatar_url')
        .in('auth_id', userIds);
      
      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
        return;
      }
      
      console.log('✅ Usuários encontrados:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('👤 Primeiro usuário:', users[0]);
      }
      
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
      
      console.log('✅ Participantes combinados:', participantsWithUsers.length);
      console.log('👥 Primeiro participante:', participantsWithUsers[0]);
      
      const result = {
        success: true,
        participants: participantsWithUsers,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit)
      };
      
      console.log('✅ Resultado final:', JSON.stringify(result, null, 2));
    } else {
      console.log('ℹ️ Nenhum RSVP encontrado para esta manifestação');
    }
    
    // Agora vamos testar a API HTTP diretamente
    console.log('\n🌐 Testando API HTTP...');
    try {
      const response = await axios.get(`http://localhost:5120/api/rsvp/manifestations/${manifestationId}/participants`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzQyNDUwOC1mMDgyLTQ0YjQtYTdmYS1jMDc0MjZlNDVhNDEiLCJlbWFpbCI6ImFkbWluQGRpcmVpdGFpLmNvbSIsImlhdCI6MTczNTU2NzI2NCwiZXhwIjoxNzM1NjUzNjY0fQ.somevalidtoken'
        }
      });
      console.log('✅ API HTTP funcionou:', response.data);
    } catch (httpError) {
      console.error('❌ Erro na API HTTP:', httpError.response?.data || httpError.message);
      console.error('Status:', httpError.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugManifestationParticipants();