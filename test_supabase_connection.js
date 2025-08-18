const axios = require('axios');

// Teste de conexão com Supabase em produção
async function testSupabaseConnection() {
  console.log('🔍 Testando conexão com Supabase em produção...');
  
  try {
    // Teste do endpoint de health
    console.log('\n1. Testando endpoint de health:');
    const healthResponse = await axios.get('https://direitai-backend.vercel.app/health');
    console.log('✅ Health OK:', healthResponse.status);
    
    // Teste do endpoint de admin/overview (que usa Supabase)
    console.log('\n2. Testando endpoint admin/overview:');
    const overviewResponse = await axios.get('https://direitai-backend.vercel.app/api/admin/overview', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ Overview OK:', overviewResponse.status);
    
  } catch (error) {
    console.log('❌ Erro:', error.response?.status || error.message);
    console.log('📋 Resposta:', error.response?.data || 'Sem dados de resposta');
    
    if (error.response?.status === 500) {
      console.log('\n🚨 DIAGNÓSTICO: Erro 500 indica problema de configuração no servidor');
      console.log('💡 Possíveis causas:');
      console.log('   - Variáveis de ambiente do Supabase não configuradas no Vercel');
      console.log('   - SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
      console.log('   - Problema de conexão com o banco de dados');
    }
  }
}

// Executar teste
testSupabaseConnection();