const { supabase } = require('./config/supabase');
require('dotenv').config();

async function getFreshToken() {
  console.log('🔍 Fazendo login para obter token fresco...');
  
  try {
    // Fazer login com credenciais de teste
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: 'Mauricio123@' // Senha de teste
    });
    
    if (error) {
      console.error('❌ Erro no login:', error);
      return;
    }
    
    if (data.session) {
      console.log('✅ Login realizado com sucesso!');
      console.log('🔑 Token fresco:', data.session.access_token);
      console.log('📅 Expira em:', new Date(data.session.expires_at * 1000));
      
      // Testar o token
      const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
      
      if (userError) {
        console.error('❌ Erro ao validar token:', userError);
      } else {
        console.log('✅ Token válido para:', userData.user?.email);
      }
    } else {
      console.log('❌ Nenhuma sessão retornada');
    }
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

getFreshToken();