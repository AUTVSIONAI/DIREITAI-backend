const { supabase } = require('./config/supabase');

// Teste de autenticação
async function testAuth() {
  try {
    console.log('🔍 Testando autenticação...');
    
    // Tentar fazer login com o usuário de teste
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: '12345678'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token completo:', loginData.session.access_token);
    console.log('👤 Usuário:', loginData.user.email);
    console.log('🆔 Auth ID:', loginData.user.id);
    
    // Testar se o token é válido
    const { data: userData, error: userError } = await supabase.auth.getUser(loginData.session.access_token);
    
    if (userError) {
      console.error('❌ Token inválido:', userError.message);
    } else {
      console.log('✅ Token válido para:', userData.user.email);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testAuth();