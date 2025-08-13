const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfileEndpoint() {
  try {
    console.log('🔑 Fazendo login...');
    
    // Fazer login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'teste@direitai.com',
      password: 'teste123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token:', loginData.session.access_token.substring(0, 50) + '...');
    
    // Testar endpoint local
    console.log('\n🌐 Testando endpoint local /users/profile...');
    
    try {
      const localResponse = await axios.get('http://localhost:5120/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${loginData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Endpoint local funcionando!');
      console.log('📊 Status:', localResponse.status);
      console.log('👤 Dados do usuário:', {
        email: localResponse.data.email,
        username: localResponse.data.username,
        full_name: localResponse.data.full_name,
        is_admin: localResponse.data.is_admin
      });
      
    } catch (localError) {
      console.error('❌ Erro no endpoint local:', localError.message);
      if (localError.response) {
        console.error('📊 Status:', localError.response.status);
        console.error('📄 Dados:', localError.response.data);
      }
    }
    
    // Testar endpoint de produção
    console.log('\n🌍 Testando endpoint de produção /users/profile...');
    
    try {
      const prodResponse = await axios.get('https://direitai-backend.vercel.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${loginData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Endpoint de produção funcionando!');
      console.log('📊 Status:', prodResponse.status);
      console.log('👤 Dados do usuário:', {
        email: prodResponse.data.email,
        username: prodResponse.data.username,
        full_name: prodResponse.data.full_name,
        is_admin: prodResponse.data.is_admin
      });
      
    } catch (prodError) {
      console.error('❌ Erro no endpoint de produção:', prodError.message);
      if (prodError.response) {
        console.error('📊 Status:', prodError.response.status);
        console.error('📄 Dados:', prodError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testProfileEndpoint();