const { supabase, adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function testTokenValidation() {
  console.log('🔍 Testando validação de tokens...');
  
  // Verificar configurações
  console.log('Backend SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('Backend SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
  
  // Simular um token do frontend (usando as mesmas configurações)
  const frontendSupabaseUrl = 'https://vussgslenvyztckeuyap.supabase.co';
  const frontendAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo';
  
  console.log('\n🔍 Comparando configurações:');
  console.log('Frontend URL:', frontendSupabaseUrl);
  console.log('Backend URL:', process.env.SUPABASE_URL);
  console.log('URLs iguais:', frontendSupabaseUrl === process.env.SUPABASE_URL);
  
  console.log('Frontend ANON_KEY:', frontendAnonKey.substring(0, 50) + '...');
  console.log('Backend ANON_KEY:', process.env.SUPABASE_ANON_KEY.substring(0, 50) + '...');
  console.log('Keys iguais:', frontendAnonKey === process.env.SUPABASE_ANON_KEY);
  
  // Criar um cliente Supabase usando as configurações do frontend
  const { createClient } = require('@supabase/supabase-js');
  const frontendSupabase = createClient(frontendSupabaseUrl, frontendAnonKey);
  
  console.log('\n🔍 Testando login com cliente frontend...');
  
  try {
    // Tentar fazer login usando o cliente com configurações do frontend
    const { data: loginData, error: loginError } = await frontendSupabase.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: 'Mauricio123@'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      
      // Tentar com outras senhas possíveis
      const possiblePasswords = ['123456', 'password', 'admin123', 'Mauricio123'];
      
      for (const pwd of possiblePasswords) {
        console.log(`🔍 Tentando senha: ${pwd}`);
        const { data: testLogin, error: testError } = await frontendSupabase.auth.signInWithPassword({
          email: 'maumautremeterra@gmail.com',
          password: pwd
        });
        
        if (!testError && testLogin.session) {
          console.log('✅ Login bem-sucedido com senha:', pwd);
          console.log('🎫 Token obtido:', testLogin.session.access_token.substring(0, 50) + '...');
          
          // Testar o token no backend
          console.log('\n🔍 Testando token no backend...');
          const { data: backendValidation, error: backendError } = await supabase.auth.getUser(testLogin.session.access_token);
          
          if (backendError) {
            console.error('❌ Token inválido no backend:', backendError.message);
          } else {
            console.log('✅ Token válido no backend! Usuário:', backendValidation.user?.email);
          }
          
          return testLogin.session.access_token;
        }
      }
    } else if (loginData.session) {
      console.log('✅ Login bem-sucedido!');
      console.log('🎫 Token obtido:', loginData.session.access_token.substring(0, 50) + '...');
      
      // Testar o token no backend
      console.log('\n🔍 Testando token no backend...');
      const { data: backendValidation, error: backendError } = await supabase.auth.getUser(loginData.session.access_token);
      
      if (backendError) {
        console.error('❌ Token inválido no backend:', backendError.message);
      } else {
        console.log('✅ Token válido no backend! Usuário:', backendValidation.user?.email);
      }
      
      return loginData.session.access_token;
    }
  } catch (err) {
    console.error('❌ Erro geral no teste:', err);
  }
  
  return null;
}

testTokenValidation();