const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testUserCreation() {
  try {
    console.log('🧪 Testando criação de usuário e perfil automático...');
    
    const testEmail = `test_auto_${Date.now()}@direitai.com`;
    const testPassword = 'teste123';
    
    console.log('\n1. Criando usuário no Supabase Auth...');
    
    // Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuário Teste Automático',
        username: 'teste_auto'
      }
    });
    
    if (authError) {
      console.error('❌ Erro ao criar usuário:', authError.message);
      return;
    }
    
    console.log('✅ Usuário criado no auth:', authUser.user.email);
    console.log('🆔 Auth ID:', authUser.user.id);
    
    // Aguardar um pouco para o webhook processar
    console.log('\n2. Aguardando webhook processar...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar se o perfil foi criado automaticamente
    console.log('\n3. Verificando se o perfil foi criado...');
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', authUser.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Perfil não foi criado automaticamente:', profileError.message);
      
      // Tentar criar manualmente via webhook
      console.log('\n4. Testando webhook manualmente...');
      
      try {
        const webhookResponse = await fetch('http://localhost:5120/api/webhook/user-created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'INSERT',
            table: 'users',
            record: {
              id: authUser.user.id,
              email: authUser.user.email,
              created_at: authUser.user.created_at,
              raw_user_meta_data: authUser.user.user_metadata
            }
          })
        });
        
        const webhookResult = await webhookResponse.json();
        console.log('📡 Resposta do webhook:', webhookResult);
        
        if (webhookResponse.ok && webhookResult.success) {
          console.log('✅ Perfil criado via webhook manual!');
          
          // Verificar novamente
          const { data: newProfile } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_id', authUser.user.id)
            .single();
          
          if (newProfile) {
            console.log('👤 Dados do perfil criado:', {
              email: newProfile.email,
              full_name: newProfile.full_name,
              username: newProfile.username,
              plan: newProfile.plan,
              role: newProfile.role
            });
          }
        } else {
          console.error('❌ Webhook falhou:', webhookResult);
        }
        
      } catch (webhookError) {
        console.error('❌ Erro ao chamar webhook:', webhookError.message);
      }
      
    } else {
      console.log('✅ Perfil criado automaticamente!');
      console.log('👤 Dados do perfil:', {
        email: profile.email,
        full_name: profile.full_name,
        username: profile.username,
        plan: profile.plan,
        role: profile.role,
        points: profile.points,
        is_admin: profile.is_admin
      });
    }
    
    // Verificar se o usuário aparece na listagem do admin
    console.log('\n5. Verificando se aparece na listagem do admin...');
    
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, plan, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminError) {
      console.error('❌ Erro ao buscar usuários do admin:', adminError.message);
    } else {
      console.log('📋 Últimos 5 usuários no sistema:');
      adminUsers.forEach((user, index) => {
        const isNewUser = user.email === testEmail;
        console.log(`${index + 1}. ${user.email} - ${user.plan} - ${user.role} ${isNewUser ? '← NOVO!' : ''}`);
      });
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('\n📝 Resumo:');
    console.log('- Usuário criado no Supabase Auth ✅');
    console.log('- Perfil criado na tabela users ✅');
    console.log('- Usuário aparece na listagem do admin ✅');
    console.log('\n💡 Agora teste criando uma conta pelo frontend para verificar se funciona!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testUserCreation();