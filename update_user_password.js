const { adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function updateUserPassword() {
  console.log('🔍 Atualizando senha do usuário...');
  
  try {
    // Buscar o usuário pelo email
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      return;
    }
    
    const user = users.users.find(u => u.email === 'maumautremeterra@gmail.com');
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:', user.email);
    console.log('🔑 ID do usuário:', user.id);
    
    // Atualizar a senha do usuário
    const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        password: '12345678'
      }
    );
    
    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError.message);
      return;
    }
    
    console.log('✅ Senha atualizada com sucesso!');
    console.log('📧 Email do usuário:', updateData.user.email);
    
    // Testar o login com a nova senha
    console.log('\n🔍 Testando login com nova senha...');
    
    const { createClient } = require('@supabase/supabase-js');
    const testClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email: 'maumautremeterra@gmail.com',
      password: '12345678'
    });
    
    if (loginError) {
      console.error('❌ Erro no teste de login:', loginError.message);
    } else {
      console.log('✅ Login funcionando com nova senha!');
      console.log('🎫 Token gerado:', loginData.session.access_token.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

updateUserPassword().catch(console.error);