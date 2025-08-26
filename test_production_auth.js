const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configurações do Supabase (mesmas do frontend)
const supabaseUrl = 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProductionAuth() {
  try {
    console.log('🔍 Testando autenticação em produção...');
    
    // 1. Tentar fazer login com diferentes credenciais
    console.log('\n1. Tentando fazer login...');
    
    const possibleCredentials = [
      { email: 'admin@direitai.com', password: 'admin123' },
      { email: 'maumautremeterra@gmail.com', password: 'admin123' },
      { email: 'maumautremeterra@gmail.com', password: '123456' },
      { email: 'maumautremeterra@gmail.com', password: 'password' },
      { email: 'maumautremeterra@gmail.com', password: 'Mauricio123' }
    ];
    
    let authData = null;
    let authError = null;
    
    for (const creds of possibleCredentials) {
      console.log(`🔍 Tentando: ${creds.email} / ${creds.password}`);
      const { data: testAuth, error: testError } = await supabase.auth.signInWithPassword(creds);
      
      if (!testError && testAuth.session) {
        console.log('✅ Login bem-sucedido!');
        authData = testAuth;
        break;
      } else {
        console.log('❌ Falhou:', testError?.message || 'Credenciais inválidas');
      }
    }
    
    if (authError) {
      console.error('❌ Erro no login:', authError);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log('Token:', authData.session?.access_token?.substring(0, 50) + '...');
    
    // 2. Testar chamada para API local
    console.log('\n2. Testando API local...');
    try {
      const localResponse = await axios.get('http://localhost:5120/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ API local funcionando:', localResponse.status);
    } catch (localError) {
      console.error('❌ Erro na API local:', localError.response?.status, localError.response?.data || localError.message);
    }
    
    // 3. Testar chamada para API de produção
    console.log('\n3. Testando API de produção...');
    try {
      const prodResponse = await axios.get('https://direitai-backend.vercel.app/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ API de produção funcionando:', prodResponse.status);
    } catch (prodError) {
      console.error('❌ Erro na API de produção:', prodError.response?.status, prodError.response?.data || prodError.message);
      
      // Verificar se é erro de CORS
      if (prodError.code === 'ENOTFOUND' || prodError.message.includes('CORS')) {
        console.log('🔍 Possível problema de CORS ou conectividade');
      }
    }
    
    // 4. Verificar dados do usuário
    console.log('\n4. Verificando dados do usuário...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro ao obter usuário:', userError);
    } else {
      console.log('✅ Usuário autenticado:', userData.user?.email);
      console.log('ID do usuário:', userData.user?.id);
    }
    
    // 5. Verificar role do usuário no banco
    console.log('\n5. Verificando role do usuário...');
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', userData.user?.id)
      .single();
    
    if (roleError) {
      console.error('❌ Erro ao verificar role:', roleError);
    } else {
      console.log('✅ Role do usuário:', roleData?.role);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testProductionAuth();