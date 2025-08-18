const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function generateTestToken() {
  try {
    console.log('🔐 Gerando token de teste...');
    
    // Fazer login com um usuário de teste
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: '12345678'
    });
    
    if (error) {
      console.error('❌ Erro ao fazer login:', error.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('🎫 Token de acesso:', data.session.access_token);
    console.log('👤 Usuário:', data.user.email);
    console.log('🆔 Auth ID:', data.user.id);
    
    return data.session.access_token;
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

if (require.main === module) {
  generateTestToken();
}

module.exports = { generateTestToken };