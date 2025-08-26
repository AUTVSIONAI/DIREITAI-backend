const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5120';

async function testUploadOnly() {
  try {
    console.log('🔍 Testando apenas upload de imagem...');
    
    // 1. Obter token válido
    console.log('🔐 Obtendo token válido...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'maumautremeterra@gmail.com',
      password: 'TempPassword123!'
    });
    
    const token = loginResponse.data.session.access_token;
    console.log('✅ Token obtido:', token.substring(0, 50) + '...');
    
    // 2. Testar upload de imagem
    console.log('\n🔍 Testando POST /api/upload/image...');
    
    // Criar um arquivo de teste simples
    const testImagePath = path.join(__dirname, 'test-image-temp.jpg');
    fs.writeFileSync(testImagePath, 'fake image content for testing');
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    
    try {
      const uploadResponse = await axios.post(`${BASE_URL}/api/upload/image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      });
      
      console.log('✅ Upload bem-sucedido:', uploadResponse.status);
      console.log('📋 Resposta:', JSON.stringify(uploadResponse.data, null, 2));
      
    } catch (uploadError) {
      console.log('❌ Erro no upload:', uploadError.response?.status, uploadError.response?.data);
      if (uploadError.response?.status === 500) {
        console.log('🔍 Detalhes do erro 500:', uploadError.response.data);
      }
    }
    
    // Limpar arquivo temporário
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('📋 Resposta do erro:', error.response.data);
    }
  }
}

testUploadOnly();