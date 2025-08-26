const { adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function checkUserAuth() {
  console.log('🔍 Verificando dados de autenticação do usuário...');
  
  try {
    // Buscar o usuário na tabela auth.users usando admin
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById('0155ccb7-e67f-41dc-a133-188f97996b73');
    
    if (authError) {
      console.error('❌ Erro ao buscar usuário auth:', authError);
      return;
    }
    
    console.log('✅ Usuário auth encontrado:');
    console.log('📧 Email:', authUser.user?.email);
    console.log('🔐 Email confirmado:', authUser.user?.email_confirmed_at ? 'Sim' : 'Não');
    console.log('📱 Telefone:', authUser.user?.phone || 'Não definido');
    console.log('🔑 Provedor:', authUser.user?.app_metadata?.provider);
    console.log('🔑 Provedores:', authUser.user?.app_metadata?.providers);
    console.log('👤 Metadados:', JSON.stringify(authUser.user?.user_metadata, null, 2));
    console.log('🏢 App metadata:', JSON.stringify(authUser.user?.app_metadata, null, 2));
    console.log('🕐 Criado em:', authUser.user?.created_at);
    console.log('🕐 Último login:', authUser.user?.last_sign_in_at);
    
    // Verificar se o usuário tem senha definida
    console.log('\n🔍 Verificando método de autenticação...');
    
    if (authUser.user?.app_metadata?.providers?.includes('email')) {
      console.log('✅ Usuário usa autenticação por email/senha');
      
      // Tentar resetar a senha para criar uma nova
      console.log('\n🔄 Tentando resetar senha...');
      const { data: resetData, error: resetError } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: authUser.user.email
      });
      
      if (resetError) {
        console.error('❌ Erro ao gerar link de reset:', resetError);
      } else {
        console.log('✅ Link de reset gerado:', resetData.properties?.action_link);
      }
      
      // Tentar definir uma senha diretamente
      console.log('\n🔑 Tentando definir senha diretamente...');
      const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
        '0155ccb7-e67f-41dc-a133-188f97996b73',
        { password: 'TempPassword123!' }
      );
      
      if (updateError) {
        console.error('❌ Erro ao definir senha:', updateError);
      } else {
        console.log('✅ Senha definida com sucesso!');
        
        // Agora tentar fazer login
        console.log('\n🔐 Tentando login com nova senha...');
        const { createClient } = require('@supabase/supabase-js');
        const testClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        
        const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
          email: authUser.user.email,
          password: 'TempPassword123!'
        });
        
        if (loginError) {
          console.error('❌ Erro no login:', loginError.message);
        } else {
          console.log('✅ Login bem-sucedido!');
          console.log('🎫 Token:', loginData.session.access_token.substring(0, 50) + '...');
          
          // Testar o token
          const { data: tokenTest, error: tokenError } = await adminSupabase.auth.getUser(loginData.session.access_token);
          
          if (tokenError) {
            console.error('❌ Token inválido:', tokenError.message);
          } else {
            console.log('✅ Token válido! Usuário:', tokenTest.user?.email);
          }
        }
      }
    } else {
      console.log('⚠️ Usuário não usa autenticação por email/senha');
      console.log('🔍 Provedores disponíveis:', authUser.user?.app_metadata?.providers);
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

checkUserAuth();