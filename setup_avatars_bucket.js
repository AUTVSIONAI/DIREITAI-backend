require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔧 Configurando bucket de avatares...');
    
    // 1. Criar o bucket 'avatars' se não existir
    console.log('📁 Criando bucket avatars...');
    const { data: bucket, error: bucketError } = await adminSupabase.storage
      .createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.log('❌ Erro ao criar bucket:', bucketError.message);
    } else {
      console.log('✅ Bucket avatars criado/verificado com sucesso');
    }
    
    // 2. Verificar se o bucket existe
    const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
    if (listError) {
      console.log('❌ Erro ao listar buckets:', listError.message);
      return;
    }
    
    const avatarsBucket = buckets.find(b => b.id === 'avatars');
    if (!avatarsBucket) {
      console.log('❌ Bucket avatars não foi encontrado');
      return;
    }
    
    console.log('✅ Bucket avatars configurado:', {
      id: avatarsBucket.id,
      name: avatarsBucket.name,
      public: avatarsBucket.public
    });
    
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse o Supabase Dashboard');
    console.log('2. Vá para Storage > avatars');
    console.log('3. Clique em "Policies" e configure as seguintes políticas:');
    console.log('\n   - INSERT: Users can upload own avatars');
    console.log('     WITH CHECK: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
    console.log('\n   - SELECT: Public can view avatars');
    console.log('     USING: bucket_id = \'avatars\'');
    console.log('\n   - UPDATE: Users can update own avatars');
    console.log('     USING: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
    console.log('\n   - DELETE: Users can delete own avatars');
    console.log('     USING: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
    
    console.log('\n🔧 Ou execute o arquivo fix_avatars_bucket_rls.sql no SQL Editor do Supabase');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
})();