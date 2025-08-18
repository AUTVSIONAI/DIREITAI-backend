const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Verificando se existe tabela public.users...');
    
    // Verificar se a tabela public.users existe
    const { data: publicUsersTable, error: tableError } = await adminSupabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Tabela public.users não existe ou erro:', tableError.message);
      console.log('🔧 Criando tabela public.users...');
      
      // Criar tabela public.users
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
          email VARCHAR(255) UNIQUE NOT NULL,
          full_name VARCHAR(255),
          username VARCHAR(100),
          avatar_url TEXT,
          bio TEXT,
          role VARCHAR(50) DEFAULT 'user',
          is_admin BOOLEAN DEFAULT false,
          is_email_verified BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          last_login_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
        
        -- Função para atualizar updated_at
        CREATE OR REPLACE FUNCTION update_users_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        -- Trigger para atualizar updated_at
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION update_users_updated_at_column();
      `;
      
      const { error: createError } = await adminSupabase.rpc('exec_sql', {
        query: createTableSQL
      });
      
      if (createError) {
        console.log('❌ Erro ao criar tabela public.users:', createError.message);
        console.log('🔧 Tentando criar via SQL direto...');
        
        // Tentar criar usando múltiplas queries
        const queries = [
          `CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            username VARCHAR(100),
            avatar_url TEXT,
            bio TEXT,
            role VARCHAR(50) DEFAULT 'user',
            is_admin BOOLEAN DEFAULT false,
            is_email_verified BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            last_login_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`,
          `CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);`,
          `CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);`,
          `CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);`
        ];
        
        for (const query of queries) {
          try {
            const { error } = await adminSupabase.rpc('exec_sql', { query });
            if (error) {
              console.log('❌ Erro na query:', query.substring(0, 50) + '...', error.message);
            } else {
              console.log('✅ Query executada:', query.substring(0, 50) + '...');
            }
          } catch (err) {
            console.log('❌ Erro ao executar query:', err.message);
          }
        }
      } else {
        console.log('✅ Tabela public.users criada com sucesso!');
      }
    } else {
      console.log('✅ Tabela public.users já existe!');
    }
    
    console.log('\n🔧 Criando função e trigger para sincronizar usuários...');
    
    // Criar função para sincronizar usuários
    const syncFunctionSQL = `
      CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (
          auth_id,
          email,
          full_name,
          username,
          avatar_url,
          role,
          is_email_verified,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url',
          'user',
          NEW.email_confirmed_at IS NOT NULL,
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (auth_id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          username = EXCLUDED.username,
          avatar_url = EXCLUDED.avatar_url,
          is_email_verified = EXCLUDED.is_email_verified,
          updated_at = NOW();
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: functionError } = await adminSupabase.rpc('exec_sql', {
      query: syncFunctionSQL
    });
    
    if (functionError) {
      console.log('❌ Erro ao criar função de sincronização:', functionError.message);
    } else {
      console.log('✅ Função de sincronização criada!');
    }
    
    // Criar trigger
    const triggerSQL = `
      DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
      CREATE TRIGGER sync_auth_user_trigger
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION sync_auth_user_to_public();
    `;
    
    const { error: triggerError } = await adminSupabase.rpc('exec_sql', {
      query: triggerSQL
    });
    
    if (triggerError) {
      console.log('❌ Erro ao criar trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger criado!');
    }
    
    console.log('\n🔧 Sincronizando usuários existentes...');
    
    // Buscar usuários do auth.users e sincronizar
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Erro ao buscar usuários do auth:', authError.message);
    } else {
      console.log(`📊 Encontrados ${authUsers.users.length} usuários no auth.users`);
      
      for (const authUser of authUsers.users) {
        try {
          const { error: insertError } = await adminSupabase
            .from('users')
            .upsert({
              auth_id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.email,
              username: authUser.user_metadata?.username || authUser.email.split('@')[0],
              avatar_url: authUser.user_metadata?.avatar_url,
              role: 'user',
              is_email_verified: !!authUser.email_confirmed_at,
              created_at: authUser.created_at,
              updated_at: authUser.updated_at
            }, {
              onConflict: 'auth_id'
            });
          
          if (insertError) {
            console.log(`❌ Erro ao sincronizar usuário ${authUser.email}:`, insertError.message);
          } else {
            console.log(`✅ Usuário sincronizado: ${authUser.email}`);
          }
        } catch (err) {
          console.log(`❌ Erro ao processar usuário ${authUser.email}:`, err.message);
        }
      }
    }
    
    console.log('\n✅ Sincronização concluída!');
    
    // Verificar se o usuário específico agora existe na tabela public.users
    const { data: specificUser, error: specificError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .single();
    
    if (specificError) {
      console.log('❌ Usuário específico não encontrado:', specificError.message);
    } else {
      console.log('✅ Usuário específico encontrado na public.users:', specificUser.id);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();