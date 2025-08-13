// Teste simples sem dependências externas

// Função para testar login e obter token
async function testLoginAndChat() {
  console.log('🧪 Testando login e API de chat...');
  
  try {
    // 1. Fazer login para obter token
    console.log('\n1. Fazendo login...');
    const loginResponse = await fetch('https://direitai-backend.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@direitai.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Erro no login:', loginResponse.status, await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login realizado com sucesso!');
    console.log('📋 Dados do login:', JSON.stringify(loginData, null, 2));
    
    const token = loginData.session?.access_token || loginData.access_token;
    
    if (!token) {
      console.log('❌ Token não encontrado na resposta do login');
      return;
    }
    
    console.log('🔑 Token obtido:', token.substring(0, 20) + '...');
    
    // 2. Testar API de chat com token
    console.log('\n2. Testando API de chat com token...');
    const chatResponse = await fetch('https://direitai-backend.vercel.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'Olá, como você está?',
        conversation_id: 'test-conversation'
      })
    });
    
    console.log('📊 Status da resposta:', chatResponse.status);
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ API de chat funcionando!');
      console.log('🤖 Resposta da IA:', JSON.stringify(chatData, null, 2));
    } else {
      const errorText = await chatResponse.text();
      console.log('❌ Erro na API de chat:', chatResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testLoginAndChat();