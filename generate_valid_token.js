const { adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function generateValidToken() {
  try {
    console.log('🔍 Gerando token válido...');
    
    // Buscar o usuário
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return;
    }
    
    console.log('✅ Usuário encontrado:', user.email);
    console.log('🔑 Auth ID:', user.auth_id);
    
    // Tentar fazer login usando o admin client para obter um token válido
    console.log('🔐 Tentando fazer login administrativo...');
    
    // Usar o admin client para fazer sign in
    const { data: signInData, error: signInError } = await adminSupabase.auth.admin.createUser({
      email: user.email,
      password: 'temp_password_123',
      email_confirm: true
    });
    
    if (signInError && !signInError.message.includes('already registered')) {
      console.error('❌ Erro no sign in:', signInError);
    }
    
    // Tentar obter um token usando o método correto
    try {
      const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email
      });
      
      if (sessionError) {
        console.error('❌ Erro ao gerar link:', sessionError);
      } else {
        console.log('✅ Link gerado:', sessionData);
      }
    } catch (linkErr) {
      console.log('⚠️ Método generateLink não disponível:', linkErr.message);
    }
    
    // Vamos tentar uma abordagem diferente - usar um token JWT válido manualmente
    console.log('\n🔍 Testando com token JWT manual...');
    
    // Criar um payload JWT básico
    const jwt = require('jsonwebtoken');
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hora
      iat: Math.floor(Date.now() / 1000),
      iss: process.env.SUPABASE_URL,
      sub: user.auth_id,
      email: user.email,
      role: 'authenticated'
    };
    
    // Usar a chave do Supabase para assinar (isso pode não funcionar, mas vamos tentar)
    const testToken = jwt.sign(payload, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('🎫 Token manual gerado:', testToken.substring(0, 50) + '...');
    
    // Testar o token manual
    const { data: validationData, error: validationError } = await adminSupabase.auth.getUser(testToken);
    
    if (validationError) {
      console.error('❌ Token manual inválido:', validationError);
      
      // Vamos tentar usar o service role key diretamente
      console.log('\n🔍 Testando com service role key...');
      const { data: serviceData, error: serviceError } = await adminSupabase.auth.getUser();
      
      if (serviceError) {
        console.error('❌ Service role também falhou:', serviceError);
      } else {
        console.log('✅ Service role funcionou:', serviceData);
      }
    } else {
      console.log('✅ Token manual válido! Usuário:', validationData.user?.email);
      return testToken;
    }
    
    return null;
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

generateValidToken();