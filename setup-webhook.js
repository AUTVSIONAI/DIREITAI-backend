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

async function setupWebhook() {
  try {
    console.log('🔧 Configurando webhook para criação automática de perfis...');
    
    // Verificar se já existe um endpoint webhook
    const webhookUrl = process.env.WEBHOOK_URL || 'https://direitai-backend.vercel.app/api/webhook/user-created';
    
    console.log('📋 Instruções para configurar o webhook no Supabase:');
    console.log('\n1. Acesse o Supabase Dashboard');
    console.log('2. Vá para Database > Webhooks');
    console.log('3. Clique em "Create a new webhook"');
    console.log('4. Configure:');
    console.log('   - Name: user-profile-creator');
    console.log('   - Table: auth.users');
    console.log('   - Events: INSERT');
    console.log(`   - Webhook URL: ${webhookUrl}`);
    console.log('   - HTTP Method: POST');
    console.log('   - HTTP Headers: Content-Type: application/json');
    console.log('\n5. Salve o webhook');
    
    // Criar endpoint webhook no backend se não existir
    console.log('\n🔧 Verificando se o endpoint webhook existe...');
    
    // Testar se o endpoint existe
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'INSERT',
          table: 'users',
          record: {
            id: 'test-id',
            email: 'test@test.com'
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Endpoint webhook já existe e está funcionando!');
      } else {
        console.log('⚠️ Endpoint webhook existe mas retornou erro:', response.status);
      }
    } catch (error) {
      console.log('❌ Endpoint webhook não encontrado. Criando...');
      
      // Criar o arquivo do webhook
      const webhookCode = `
const { createClient } = require('@supabase/supabase-js');

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { type, table, record } = req.body;
    
    // Verificar se é um evento de inserção de usuário
    if (type === 'INSERT' && table === 'users' && record) {
      console.log('📝 Criando perfil para novo usuário:', record.email);
      
      // Criar perfil na tabela users
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: record.id,
          email: record.email,
          username: record.raw_user_meta_data?.username || null,
          full_name: record.raw_user_meta_data?.full_name || record.raw_user_meta_data?.name || null,
          role: 'user',
          plan: 'gratuito',
          billing_cycle: 'monthly',
          points: 0,
          is_admin: record.raw_user_meta_data?.is_admin || false,
          banned: false,
          created_at: record.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar perfil:', error.message);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
      
      console.log('✅ Perfil criado com sucesso:', data.email);
      return res.status(200).json({ success: true, user: data });
    }
    
    return res.status(200).json({ success: true, message: 'Event processed' });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
      `;
      
      console.log('📝 Código do webhook criado. Adicione este arquivo:');
      console.log('   Arquivo: pages/api/webhook/user-created.js (Next.js)');
      console.log('   ou: api/webhook/user-created.js (Vercel)');
    }
    
    // Testar criação de usuário para verificar se o sistema está funcionando
    console.log('\n🧪 Testando criação de usuário...');
    const testEmail = `test_webhook_${Date.now()}@direitai.com`;
    
    const { data: testUser, error: testError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'teste123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuário Teste Webhook',
        username: 'teste_webhook'
      }
    });
    
    if (testError) {
      console.error('❌ Erro ao criar usuário de teste:', testError.message);
    } else {
      console.log('✅ Usuário de teste criado:', testUser.user.email);
      
      // Aguardar um pouco para o webhook executar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se o perfil foi criado
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_id', testUser.user.id)
        .single();
      
      if (profileError) {
        console.log('⚠️ Perfil não foi criado automaticamente.');
        console.log('💡 Isso é esperado se o webhook ainda não foi configurado.');
        
        // Criar perfil manualmente para este usuário
        const { data: manualProfile, error: manualError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_id: testUser.user.id,
            email: testUser.user.email,
            username: testUser.user.user_metadata?.username || null,
            full_name: testUser.user.user_metadata?.full_name || null,
            role: 'user',
            plan: 'gratuito',
            billing_cycle: 'monthly',
            points: 0,
            is_admin: false,
            banned: false,
            created_at: testUser.user.created_at,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (manualError) {
          console.error('❌ Erro ao criar perfil manualmente:', manualError.message);
        } else {
          console.log('✅ Perfil criado manualmente para o usuário de teste');
        }
      } else {
        console.log('✅ Perfil criado automaticamente pelo webhook!');
        console.log('👤 Dados do perfil:', {
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username,
          plan: profile.plan
        });
      }
    }
    
    console.log('\n🎉 Configuração concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Configure o webhook no Supabase Dashboard conforme as instruções acima');
    console.log('2. Teste criando uma nova conta no frontend');
    console.log('3. Verifique se o usuário aparece no painel admin');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar configuração
setupWebhook();