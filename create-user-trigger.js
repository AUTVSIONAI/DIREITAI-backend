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

async function createUserTrigger() {
  try {
    console.log('🔧 Criando trigger para automatizar criação de perfis de usuário...');
    
    // 1. Criar função que será executada quando um usuário se registrar
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (
          auth_id,
          email,
          username,
          full_name,
          role,
          plan,
          billing_cycle,
          points,
          is_admin,
          banned,
          created_at,
          updated_at
        )
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'username', NULL),
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
          'user',
          'gratuito',
          'monthly',
          0,
          COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
          false,
          NEW.created_at,
          NOW()
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('📝 Criando função handle_new_user...');
    const { error: functionError } = await supabaseAdmin.rpc('exec_sql', {
      sql: createFunctionSQL
    });
    
    if (functionError) {
      console.error('❌ Erro ao criar função:', functionError.message);
      // Tentar método alternativo
      console.log('🔄 Tentando método alternativo...');
      
      const { error: altError } = await supabaseAdmin
        .from('_sql_functions')
        .insert({
          name: 'handle_new_user',
          definition: createFunctionSQL
        });
      
      if (altError) {
        console.log('⚠️ Não foi possível criar a função automaticamente.');
        console.log('📋 Execute este SQL manualmente no Supabase Dashboard:');
        console.log('\n' + createFunctionSQL);
      }
    } else {
      console.log('✅ Função handle_new_user criada com sucesso!');
    }
    
    // 2. Criar trigger que chama a função quando um usuário é inserido em auth.users
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    console.log('📝 Criando trigger on_auth_user_created...');
    const { error: triggerError } = await supabaseAdmin.rpc('exec_sql', {
      sql: createTriggerSQL
    });
    
    if (triggerError) {
      console.error('❌ Erro ao criar trigger:', triggerError.message);
      console.log('📋 Execute este SQL manualmente no Supabase Dashboard:');
      console.log('\n' + createTriggerSQL);
    } else {
      console.log('✅ Trigger on_auth_user_created criado com sucesso!');
    }
    
    // 3. Testar o trigger criando um usuário de teste
    console.log('\n🧪 Testando o trigger...');
    const testEmail = `test_${Date.now()}@direitai.com`;
    
    const { data: testUser, error: testError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'teste123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuário Teste Trigger',
        username: 'teste_trigger'
      }
    });
    
    if (testError) {
      console.error('❌ Erro ao criar usuário de teste:', testError.message);
    } else {
      console.log('✅ Usuário de teste criado:', testUser.user.email);
      
      // Aguardar um pouco para o trigger executar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se o perfil foi criado automaticamente
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_id', testUser.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Perfil não foi criado automaticamente:', profileError.message);
        console.log('⚠️ O trigger pode não estar funcionando corretamente.');
      } else {
        console.log('✅ Perfil criado automaticamente pelo trigger!');
        console.log('👤 Dados do perfil:', {
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username,
          plan: profile.plan
        });
      }
    }
    
    console.log('\n🎉 Configuração do trigger concluída!');
    console.log('\n📝 Instruções:');
    console.log('1. Se houver erros, execute os SQLs manualmente no Supabase Dashboard');
    console.log('2. Agora novos usuários terão perfis criados automaticamente');
    console.log('3. O painel admin mostrará todos os usuários corretamente');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar criação do trigger
createUserTrigger();