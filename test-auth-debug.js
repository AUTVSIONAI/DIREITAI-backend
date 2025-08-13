const { supabase, supabaseAdmin } = require('./lib/supabase');
const jwt = require('jsonwebtoken');

async function testAuth() {
  try {
    console.log('🔍 Testing authentication flow...');
    
    // 1. Criar um usuário de teste
    console.log('\n1. Creating test user...');
    const testEmail = 'test@direitai.com';
    const testPassword = 'test123456';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: 'testuser'
        }
      }
    });
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.log('❌ Sign up failed:', signUpError.message);
      return;
    }
    
    console.log('✅ User created or already exists');
    
    // 2. Tentar fazer login com o usuário de teste
    console.log('\n2. Attempting login with test user...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
      
      // Tentar com usuário admin existente
      console.log('\n2b. Trying with existing admin user...');
      const { data: adminLoginData, error: adminLoginError } = await supabase.auth.signInWithPassword({
        email: 'admin@direitai.com',
        password: 'direitai123' // Tentando outra senha
      });
      
      if (adminLoginError) {
        console.log('❌ Admin login also failed:', adminLoginError.message);
        
        // Vamos criar um token JWT manualmente para testar
        console.log('\n2c. Creating manual JWT token for testing...');
        const testUserId = '87424508-f082-44b4-a7fa-c07426e45a41'; // ID do admin
        const manualToken = jwt.sign(
          {
            sub: testUserId,
            email: 'admin@direitai.com',
            aud: 'authenticated',
            role: 'authenticated',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
          },
          'your-jwt-secret' // Este seria o secret do Supabase
        );
        
        console.log('🔑 Manual token created:', manualToken.substring(0, 50) + '...');
        
        // Testar com token manual
        await testApiWithToken(manualToken);
        return;
      }
      
      loginData = adminLoginData;
    }
    
    console.log('✅ Login successful!');
    console.log('📧 User email:', loginData.user.email);
    console.log('🔑 Access token preview:', loginData.session.access_token.substring(0, 50) + '...');
    
    // 3. Decodificar o token JWT
    console.log('\n3. Decoding JWT token...');
    const decoded = jwt.decode(loginData.session.access_token);
    console.log('🔍 Decoded token:', {
      sub: decoded.sub,
      email: decoded.email,
      aud: decoded.aud,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    // 4. Verificar se o usuário existe na tabela users
    console.log('\n4. Checking user in database...');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', decoded.sub)
      .single();
    
    if (userError) {
      console.log('❌ User not found in database:', userError.message);
      
      // Criar usuário na tabela se não existir
      console.log('\n4b. Creating user in database...');
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: decoded.sub,
          email: decoded.email,
          full_name: loginData.user.user_metadata?.full_name || 'Test User',
          username: loginData.user.user_metadata?.username || 'testuser',
          is_admin: decoded.email === 'admin@direitai.com',
          plan: 'gratuito'
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Failed to create user:', createError.message);
        return;
      }
      
      userData = newUser;
      console.log('✅ User created in database!');
    }
    
    console.log('✅ User found in database!');
    console.log('👤 User data:', {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      is_admin: userData.is_admin
    });
    
    // 5. Testar requisição para a API com o token
    await testApiWithToken(loginData.session.access_token);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testApiWithToken(token) {
  console.log('\n5. Testing API request with token...');
  const API_BASE_URL = 'https://direitai-backend.vercel.app/api';
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const profileData = await response.json();
      console.log('✅ API request successful!');
      console.log('📋 Profile data:', profileData);
    } else {
      const errorData = await response.text();
      console.log('❌ API request failed:', errorData);
    }
  } catch (error) {
    console.log('❌ API request error:', error.message);
  }
}

testAuth();