const axios = require('axios');

async function testLocalAPI() {
  const userId = '75ed8ec0-dba2-476b-a15f-8df7e0dcc7b1';
  
  console.log('🧪 Testando API local...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5120/health');
    console.log('✅ Health OK:', healthResponse.status);
  } catch (error) {
    console.log('❌ Health falhou:', error.response?.status, error.response?.data || error.message);
  }
  
  try {
    // Test goals endpoint
    const goalsResponse = await axios.get(
      `http://localhost:5120/api/gamification/users/${userId}/goals?type=daily&period=current`,
      { headers: { 'Authorization': 'Bearer test-token' } }
    );
    console.log('✅ Goals OK:', goalsResponse.status, 'Metas encontradas:', goalsResponse.data.length || 0);
    console.log('📋 Dados:', JSON.stringify(goalsResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Goals falhou:', error.response?.status, error.response?.data || error.message);
  }
}

testLocalAPI();