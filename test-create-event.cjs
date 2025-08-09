const axios = require('axios');

// Teste para criar evento
async function testCreateEvent() {
  try {
    console.log('🧪 Testando criação de evento...');
    
    // Dados de teste
    const eventData = {
      title: 'Evento de Teste',
      description: 'Descrição do evento de teste',
      event_type: 'presencial',
      category: 'politica',
      start_date: '2024-12-25T19:00:00',
      end_date: '2024-12-25T21:00:00',
      location: 'Local de Teste',
      address: 'Endereço de Teste',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      max_participants: 100,
      price: 0,
      is_free: true,
      requires_approval: false,
      tags: ['teste'],
      secret_code: 'TEST01'
    };
    
    console.log('📤 Enviando dados:', JSON.stringify(eventData, null, 2));
    
    // Fazer requisição sem token primeiro para ver se a rota existe
    const response = await axios.post('http://localhost:5120/api/events', eventData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Resposta:', response.status, response.data);
    
  } catch (error) {
    console.error('❌ Erro:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
  }
}

testCreateEvent();