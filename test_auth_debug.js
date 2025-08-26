const { supabase, adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function testAuth() {
  console.log('🔍 Testando configuração do Supabase...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definida' : 'Não definida');
  
  // Testar conexão com admin client
  try {
    console.log('\n🔍 Testando conexão admin...');
    const { data: users, error } = await adminSupabase
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na consulta admin:', error);
    } else {
      console.log('✅ Conexão admin funcionando. Usuários encontrados:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('👤 Primeiro usuário:', users[0]);
      }
    }
  } catch (err) {
    console.error('❌ Erro no teste admin:', err);
  }
  
  // Testar geração de token válido
  try {
    console.log('\n🔍 Testando geração de token...');
    
    // Buscar um usuário existente
    const { data: existingUser, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .single();
    
    if (userError) {
      console.log('❌ Usuário não encontrado:', userError.message);
      
      // Listar alguns usuários disponíveis
      const { data: allUsers, error: listError } = await adminSupabase
        .from('users')
        .select('email, role')
        .limit(5);
      
      if (!listError && allUsers) {
        console.log('📋 Usuários disponíveis:');
        allUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.role})`);
        });
      }
    } else {
      console.log('✅ Usuário encontrado:', existingUser.email);
      
      // Tentar gerar um token usando o auth_id
      if (existingUser.auth_id) {
        console.log('🔑 Tentando validar auth_id:', existingUser.auth_id);
        
        // Usar o adminSupabase para obter dados do usuário
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(existingUser.auth_id);
        
        if (authError) {
          console.error('❌ Erro ao buscar usuário por auth_id:', authError);
        } else {
          console.log('✅ Usuário auth encontrado:', authUser.user?.email);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro no teste de token:', err);
  }
}

testAuth();