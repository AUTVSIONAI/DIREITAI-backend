const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5120';

async function testAuth() {
  try {
    console.log('=== TESTE DE AUTENTICAÇÃO ===');
    
    // 1. Fazer login
    console.log('\n1. Fazendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'teste.checkout.flow@gmail.com',
      password: 'TesteCheckout123!'
    });
    
    if (loginResponse.status !== 200) {
      console.error('❌ Login falhou:', loginResponse.status, loginResponse.data);
      return;
    }
    
    const { session, user } = loginResponse.data;
    const token = session?.access_token;
    console.log('✅ Login bem-sucedido!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Token (primeiros 20 chars):', token ? token.substring(0, 20) + '...' : 'Token não encontrado');
    
    // 2. Testar rota protegida simples
    console.log('\n2. Testando rota protegida (/users/profile)...');
    const profileResponse = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (profileResponse.status === 200) {
      console.log('✅ Rota protegida funcionando!');
      console.log('👤 Dados do usuário:', {
        id: profileResponse.data.id,
        email: profileResponse.data.email,
        role: profileResponse.data.role
      });
    } else {
      console.error('❌ Rota protegida falhou:', profileResponse.status, profileResponse.data);
    }
    
    // 3. Testar rota da loja (GET /store/products)
    console.log('\n3. Testando rota da loja (GET /store/products)...');
    const productsResponse = await axios.get(`${BASE_URL}/api/store/products`);
    
    if (productsResponse.status === 200) {
      console.log('✅ Produtos carregados!');
      console.log('📦 Número de produtos:', productsResponse.data.length);
      if (productsResponse.data.length > 0) {
        console.log('🛍️ Primeiro produto:', {
          id: productsResponse.data[0].id,
          name: productsResponse.data[0].name,
          price: productsResponse.data[0].price
        });
      }
    } else {
      console.error('❌ Falha ao carregar produtos:', productsResponse.status, productsResponse.data);
    }
    
    // 4. Testar rota do carrinho (GET /store/cart)
    console.log('\n4. Testando rota do carrinho (GET /store/cart)...');
    const cartResponse = await axios.get(`${BASE_URL}/api/store/cart`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (cartResponse.status === 200) {
      console.log('✅ Carrinho acessível!');
      console.log('🛒 Itens no carrinho:', cartResponse.data.length);
    } else {
      console.error('❌ Falha ao acessar carrinho:', cartResponse.status, cartResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('❌ Stack trace:', error.stack);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Dados:', error.response.data);
    }
    if (error.code) {
      console.error('📋 Código do erro:', error.code);
    }
  }
}

testAuth();