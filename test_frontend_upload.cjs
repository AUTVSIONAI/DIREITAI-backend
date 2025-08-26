const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configurações
const API_BASE_URL = 'http://localhost:5120/api';
const TEST_USER = {
  email: 'autvisionai@gmail.com',
  password: '12345678'
};

// Função para fazer login e obter token
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.session && response.data.session.access_token) {
      console.log('✅ Login bem-sucedido');
      return response.data.session.access_token;
    } else {
      console.log('📋 Resposta completa do login:', JSON.stringify(response.data, null, 2));
      throw new Error('Token não encontrado na resposta');
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

// Função para criar uma imagem de teste simples (PNG mínimo válido)
function createTestImage() {
  // PNG mínimo válido de 1x1 pixel transparente
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return pngData;
}

// Função para testar upload de imagem genérica (blog)
async function testBlogImageUpload(token) {
  try {
    console.log('\n📸 Testando upload de imagem do blog...');
    
    const imageBuffer = createTestImage();
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'test-blog-image.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Upload do blog bem-sucedido:', {
      success: response.data.success,
      filename: response.data.data?.filename,
      url: response.data.data?.url
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro no upload do blog:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// Função para testar upload de imagem de produto (loja)
async function testProductImageUpload(token) {
  try {
    console.log('\n🛍️ Testando upload de imagem de produto...');
    
    const imageBuffer = createTestImage();
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'test-product-image.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post(`${API_BASE_URL}/upload/product-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Upload de produto bem-sucedido:', {
      success: response.data.success,
      filename: response.data.data?.filename,
      url: response.data.data?.url
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro no upload de produto:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// Função principal de teste
async function testFrontendUpload() {
  try {
    console.log('🚀 Iniciando teste de upload do frontend...');
    console.log('🌐 API Base URL:', API_BASE_URL);
    
    // 1. Fazer login
    const token = await login();
    
    // 2. Testar upload de imagem do blog
    await testBlogImageUpload(token);
    
    // 3. Testar upload de imagem de produto
    await testProductImageUpload(token);
    
    console.log('\n🎉 Todos os testes de upload foram bem-sucedidos!');
    
  } catch (error) {
    console.error('\n💥 Teste falhou:', error.message);
    process.exit(1);
  }
}

// Executar teste
testFrontendUpload();