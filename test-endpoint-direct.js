const axios = require('axios');
const jwt = require('jsonwebtoken');

// Criar um token JWT de teste simulando o que o Supabase geraria
const testPayload = {
  sub: 'ec22dbbf-d154-4f5e-8620-46de8db93471', // Auth ID do usuário de teste
  email: 'teste@direitai.com',
  aud: 'authenticated',
  role: 'authenticated',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
};

// Usar uma chave secreta simples para teste (não é seguro em produção)
const testSecret = 'test-secret-key';
const testToken = jwt.sign(testPayload, testSecret);

async function testEndpointDirect() {
  try {
    console.log('🔑 Token de teste criado:', testToken.substring(0, 50) + '...');
    
    // Testar endpoint local
    console.log('\n🌐 Testando endpoint local /users/profile...');
    
    try {
      const localResponse = await axios.get('http://localhost:5120/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Endpoint local funcionando!');
      console.log('📊 Status:', localResponse.status);
      console.log('👤 Dados do usuário:', localResponse.data);
      
    } catch (localError) {
      console.error('❌ Erro no endpoint local:', localError.message);
      if (localError.response) {
        console.error('📊 Status:', localError.response.status);
        console.error('📄 Dados:', localError.response.data);
      }
    }
    
    // Testar endpoint de health
    console.log('\n🏥 Testando endpoint de health...');
    
    try {
      const healthResponse = await axios.get('http://localhost:5120/health', {
        timeout: 5000
      });
      
      console.log('✅ Health endpoint funcionando!');
      console.log('📊 Status:', healthResponse.status);
      console.log('📄 Dados:', healthResponse.data);
      
    } catch (healthError) {
      console.error('❌ Erro no health endpoint:', healthError.message);
      if (healthError.response) {
        console.error('📊 Status:', healthError.response.status);
        console.error('📄 Dados:', healthError.response.data);
      }
    }
    
    // Testar sem token
    console.log('\n🚫 Testando endpoint sem token...');
    
    try {
      const noTokenResponse = await axios.get('http://localhost:5120/api/users/profile', {
        timeout: 5000
      });
      
      console.log('⚠️ Endpoint funcionou sem token (não deveria)!');
      console.log('📊 Status:', noTokenResponse.status);
      
    } catch (noTokenError) {
      console.log('✅ Endpoint corretamente rejeitou requisição sem token');
      console.log('📊 Status:', noTokenError.response?.status || 'Sem resposta');
      console.log('📄 Mensagem:', noTokenError.response?.data?.message || noTokenError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testEndpointDirect();