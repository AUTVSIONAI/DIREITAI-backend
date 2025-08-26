const { supabase, adminSupabase } = require('./config/supabase');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testConstitutionDownload() {
  console.log('🧪 Testando funcionalidade de download da Constituição...');
  
  try {
    // 1. Fazer login para obter token
    console.log('\n1. Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: '12345678'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    const token = authData.session.access_token;
    const userId = authData.user.id;
    console.log('✅ Login realizado com sucesso');
    console.log('👤 User ID:', userId);
    
    // 2. Verificar status atual de download
    console.log('\n2. Verificando status atual de download...');
    const API_BASE_URL = 'http://localhost:5120/api';
    
    const statusResponse = await fetch(`${API_BASE_URL}/constitution-downloads/users/${userId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Status obtido:', status);
      
      if (status.hasDownloaded) {
        console.log('⚠️ Usuário já baixou a Constituição');
        
        // Limpar registro para testar novamente
        console.log('\n3. Limpando registro existente para teste...');
        
        // Primeiro, buscar o user_id correto na tabela users
        const { data: userData } = await adminSupabase
          .from('users')
          .select('id')
          .eq('auth_id', userId)
          .single();
          
        if (userData) {
          const { error: deleteError } = await adminSupabase
            .from('constitution_downloads')
            .delete()
            .eq('user_id', userData.id);
            
          if (deleteError) {
            console.error('❌ Erro ao limpar registro:', deleteError);
          } else {
            console.log('✅ Registro limpo com sucesso');
          }
        } else {
          console.error('❌ Usuário não encontrado na tabela users');
        }
      }
    } else {
      console.error('❌ Erro ao verificar status:', statusResponse.status, await statusResponse.text());
    }
    
    // 3. Tentar registrar novo download
    console.log('\n4. Tentando registrar novo download...');
    const registerResponse = await fetch(`${API_BASE_URL}/constitution-downloads/users/${userId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (registerResponse.ok) {
      const result = await registerResponse.json();
      console.log('✅ Download registrado com sucesso:', result);
    } else {
      const errorText = await registerResponse.text();
      console.error('❌ Erro ao registrar download:', registerResponse.status, errorText);
    }
    
    // 4. Verificar status após registro
    console.log('\n5. Verificando status após registro...');
    const finalStatusResponse = await fetch(`${API_BASE_URL}/constitution-downloads/users/${userId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (finalStatusResponse.ok) {
      const finalStatus = await finalStatusResponse.json();
      console.log('✅ Status final:', finalStatus);
    } else {
      console.error('❌ Erro ao verificar status final:', finalStatusResponse.status);
    }
    
    // 5. Verificar diretamente no banco
    console.log('\n6. Verificando diretamente no banco...');
    const { data: dbData, error: dbError } = await adminSupabase
      .from('constitution_downloads')
      .select('*')
      .eq('user_id', userId);
      
    if (dbError) {
      console.error('❌ Erro ao consultar banco:', dbError);
    } else {
      console.log('✅ Dados no banco:', dbData);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testConstitutionDownload();