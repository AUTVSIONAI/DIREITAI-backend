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

async function diagnoseUserCreation() {
  try {
    console.log('🔍 Diagnosticando problema de criação de usuários...');
    
    // 1. Verificar usuários no auth.users
    console.log('\n📋 Verificando usuários no auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários do auth:', authError.message);
      return;
    }
    
    console.log(`✅ Encontrados ${authUsers.users.length} usuários no auth.users`);
    authUsers.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });
    
    // 2. Verificar usuários na tabela 'users'
    console.log('\n📋 Verificando usuários na tabela users...');
    const { data: dbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (dbError) {
      console.error('❌ Erro ao buscar usuários da tabela users:', dbError.message);
    } else {
      console.log(`✅ Encontrados ${dbUsers.length} usuários na tabela users`);
      dbUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (Auth ID: ${user.auth_id || user.id})`);
      });
    }
    
    // 3. Verificar se existe tabela 'user_profiles'
    console.log('\n📋 Verificando tabela user_profiles...');
    const { data: profileUsers, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profileError) {
      console.log('❌ Tabela user_profiles não existe ou erro:', profileError.message);
    } else {
      console.log(`✅ Encontrados ${profileUsers.length} usuários na tabela user_profiles`);
      profileUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
      });
    }
    
    // 4. Identificar usuários órfãos (no auth mas não na tabela users)
    console.log('\n🔍 Identificando usuários órfãos...');
    const orphanUsers = authUsers.users.filter(authUser => {
      return !dbUsers.some(dbUser => 
        dbUser.auth_id === authUser.id || dbUser.id === authUser.id
      );
    });
    
    if (orphanUsers.length > 0) {
      console.log(`⚠️ Encontrados ${orphanUsers.length} usuários órfãos (no auth mas não na tabela users):`);
      orphanUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
      });
      
      // 5. Criar perfis para usuários órfãos
      console.log('\n🔧 Criando perfis para usuários órfãos...');
      for (const orphanUser of orphanUsers) {
        try {
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              auth_id: orphanUser.id,
              email: orphanUser.email,
              username: orphanUser.user_metadata?.username || null,
              full_name: orphanUser.user_metadata?.full_name || orphanUser.user_metadata?.name || null,
              role: 'user',
              plan: 'gratuito',
              billing_cycle: 'monthly',
              points: 0,
              is_admin: false,
              banned: false,
              created_at: orphanUser.created_at,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error(`❌ Erro ao criar perfil para ${orphanUser.email}:`, createError.message);
          } else {
            console.log(`✅ Perfil criado para ${orphanUser.email}`);
          }
        } catch (error) {
          console.error(`❌ Erro geral ao criar perfil para ${orphanUser.email}:`, error.message);
        }
      }
    } else {
      console.log('✅ Nenhum usuário órfão encontrado!');
    }
    
    // 6. Verificar novamente após correção
    console.log('\n📋 Verificação final da tabela users...');
    const { data: finalUsers, error: finalError } = await supabaseAdmin
      .from('users')
      .select('email, auth_id, full_name, is_admin, created_at')
      .order('created_at', { ascending: false });
    
    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError.message);
    } else {
      console.log(`✅ Total de usuários na tabela users: ${finalUsers.length}`);
      finalUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.full_name || 'Sem nome'} (Admin: ${user.is_admin ? 'Sim' : 'Não'})`);
      });
    }
    
    console.log('\n🎉 Diagnóstico concluído!');
    console.log('\n📝 Resumo:');
    console.log(`   - Usuários no auth: ${authUsers.users.length}`);
    console.log(`   - Usuários na tabela users: ${finalUsers?.length || dbUsers.length}`);
    console.log(`   - Usuários órfãos corrigidos: ${orphanUsers.length}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar diagnóstico
diagnoseUserCreation();