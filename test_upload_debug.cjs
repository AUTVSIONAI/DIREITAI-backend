const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5120/api';

// Credenciais de teste
const TEST_USER = {
    email: 'autvisionai@gmail.com',
    password: '12345678'
};

async function getAuthToken() {
    try {
        console.log('🔐 Fazendo login...');
        const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
        
        if (response.data.session && response.data.session.access_token) {
            console.log('✅ Login realizado com sucesso!');
            return response.data.session.access_token;
        } else {
            console.log('❌ Token não encontrado na resposta do login');
            return null;
        }
    } catch (error) {
        console.log('❌ Erro no login:', error.response?.data || error.message);
        return null;
    }
}

function createTestImage() {
    // Criar uma imagem de teste simples (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, testImageBuffer);
    return testImagePath;
}

async function testUpload() {
    console.log('🧪 Testando upload de imagem...');
    
    try {
        // Obter token de autenticação
        const token = await getAuthToken();
        if (!token) {
            console.log('❌ Não foi possível obter token de autenticação');
            return;
        }
        
        // Criar imagem de teste
        const testImagePath = createTestImage();
        console.log('📸 Imagem de teste criada:', testImagePath);
        
        // Preparar FormData
        const formData = new FormData();
        formData.append('image', fs.createReadStream(testImagePath));
        
        console.log('📤 Enviando requisição de upload...');
        
        // Testar upload
        const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000
        });
        
        console.log('✅ Upload realizado com sucesso!');
        console.log('📋 Resposta:', response.data);
        
        // Limpar arquivo de teste
        fs.unlinkSync(testImagePath);
        
    } catch (error) {
        console.log('❌ Erro no upload:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Dados:', error.response.data);
            console.log('Headers:', error.response.headers);
        } else if (error.request) {
            console.log('Erro de rede:', error.message);
            console.log('Request config:', error.config);
        } else {
            console.log('Erro:', error.message);
        }
        
        // Limpar arquivo de teste se existir
        const testImagePath = path.join(__dirname, 'test-image.png');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    }
}

// Executar teste
testUpload().then(() => {
    console.log('\n🏁 Teste de upload concluído!');
}).catch(error => {
    console.error('❌ Erro fatal:', error.message);
});