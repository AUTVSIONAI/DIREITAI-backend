const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase com service_role key (mais permissões)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave com mais permissões

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  console.log('📝 Adicione no seu arquivo .env:');
  console.log('SUPABASE_URL=sua_url_do_supabase');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStoragePolicies() {
  try {
    console.log('🔧 Configurando políticas de storage para avatares...');
    
    // 1. Verificar se o bucket existe
    console.log('📁 Verificando bucket avatars...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError);
      return;
    }
    
    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (!avatarsBucket) {
      console.log('📁 Criando bucket avatars...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return;
      }
      
      console.log('✅ Bucket avatars criado com sucesso');
    } else {
      console.log('✅ Bucket avatars já existe');
    }
    
    // 2. Tentar configurar políticas via SQL com service_role
    console.log('🔐 Configurando políticas RLS...');
    
    const policies = [
      {
        name: 'Users can upload own avatars',
        sql: `
          CREATE POLICY "Users can upload own avatars" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'avatars' AND
            (auth.uid())::text = (string_to_array(name, '/'))[1]
          );
        `
      },
      {
        name: 'Public can view avatars',
        sql: `
          CREATE POLICY "Public can view avatars" ON storage.objects
          FOR SELECT USING (bucket_id = 'avatars');
        `
      },
      {
        name: 'Users can update own avatars',
        sql: `
          CREATE POLICY "Users can update own avatars" ON storage.objects
          FOR UPDATE USING (
            bucket_id = 'avatars' AND
            (auth.uid())::text = (string_to_array(name, '/'))[1]
          );
        `
      },
      {
        name: 'Users can delete own avatars',
        sql: `
          CREATE POLICY "Users can delete own avatars" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'avatars' AND
            (auth.uid())::text = (string_to_array(name, '/'))[1]
          );
        `
      }
    ];
    
    // Primeiro, remover políticas existentes
    console.log('🗑️ Removendo políticas existentes...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;',
      'DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;',
      'DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;',
      'DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;'
    ];
    
    for (const dropSql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: dropSql });
      if (error && !error.message.includes('does not exist')) {
        console.log('⚠️ Aviso ao remover política:', error.message);
      }
    }
    
    // Criar novas políticas
    for (const policy of policies) {
      console.log(`📝 Criando política: ${policy.name}`);
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      
      if (error) {
        console.error(`❌ Erro ao criar política ${policy.name}:`, error.message);
        console.log('💡 Tente configurar manualmente no Dashboard do Supabase');
      } else {
        console.log(`✅ Política ${policy.name} criada com sucesso`);
      }
    }
    
    // 3. Verificar políticas criadas
    console.log('🔍 Verificando políticas criadas...');
    const { data: policiesCheck, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname LIKE '%avatars%'
        ORDER BY policyname;
      `
    });
    
    if (policiesError) {
      console.log('⚠️ Não foi possível verificar políticas automaticamente');
      console.log('📋 Verifique manualmente no Dashboard do Supabase');
    } else if (policiesCheck && policiesCheck.length > 0) {
      console.log('✅ Políticas encontradas:');
      policiesCheck.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    console.log('\n🎉 Configuração concluída!');
    console.log('📋 Se houver erros, configure manualmente no Dashboard:');
    console.log('1. Acesse https://supabase.com/dashboard');
    console.log('2. Vá para Storage > avatars > Policies');
    console.log('3. Configure as políticas conforme o arquivo fix_avatars_bucket_rls_dashboard.sql');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('💡 Configure manualmente no Dashboard do Supabase');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupStoragePolicies();
}

module.exports = { setupStoragePolicies };