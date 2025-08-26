const axios = require('axios');
const { adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function testBlogRoutes() {
  console.log('🔍 Testando rotas do blog...');
  
  try {
    // Primeiro, obter um token válido
    console.log('🔐 Obtendo token válido...');
    const { createClient } = require('@supabase/supabase-js');
    const testClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: 'TempPassword123!'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      return;
    }
    
    const token = loginData.session.access_token;
    console.log('✅ Token obtido:', token.substring(0, 50) + '...');
    
    // Testar DELETE do blog
    console.log('\n🔍 Testando DELETE /api/blog/:id...');
    try {
      const deleteResponse = await axios.delete(
        'http://localhost:5120/api/blog/e77f3ca7-4d05-4fa4-ad7b-ed3b2cff8ffc',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ DELETE bem-sucedido:', deleteResponse.status);
      console.log('📋 Resposta:', deleteResponse.data);
    } catch (deleteError) {
      console.error('❌ Erro no DELETE:', deleteError.response?.status, deleteError.response?.data || deleteError.message);
    }
    
    // Testar upload de imagem
    console.log('\n🔍 Testando POST /api/upload/image...');
    
    // Criar um FormData com uma imagem fake
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Criar um arquivo de teste temporário
    const testImagePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(testImagePath, 'fake image content for testing');
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath), {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg'
    });
    
    try {
      const uploadResponse = await axios.post(
        'http://localhost:5120/api/upload/image',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
          }
        }
      );
      
      console.log('✅ Upload bem-sucedido:', uploadResponse.status);
      console.log('📋 Resposta:', uploadResponse.data);
    } catch (uploadError) {
      console.error('❌ Erro no upload:', uploadError.response?.status, uploadError.response?.data || uploadError.message);
    }
    
    // Limpar arquivo de teste
    try {
      fs.unlinkSync(testImagePath);
    } catch (cleanupError) {
      console.log('⚠️ Erro ao limpar arquivo de teste:', cleanupError.message);
    }
    
    // Testar GET do blog para verificar se está funcionando
    console.log('\n🔍 Testando GET /api/blog...');
    try {
      const getResponse = await axios.get('http://localhost:5120/api/blog');
      console.log('✅ GET bem-sucedido:', getResponse.status);
      console.log('📋 Posts encontrados:', getResponse.data?.data?.length || 0);
    } catch (getError) {
      console.error('❌ Erro no GET:', getError.response?.status, getError.response?.data || getError.message);
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

testBlogRoutes();