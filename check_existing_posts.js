const { supabase } = require('./config/supabase');
require('dotenv').config();

async function checkExistingPosts() {
  console.log('🔍 Verificando posts existentes...');
  
  try {
    // Buscar posts existentes
    const { data: posts, error } = await supabase
      .from('politician_posts')
      .select('id, title, is_published, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Erro ao buscar posts:', error);
      return;
    }
    
    console.log('📋 Posts encontrados:', posts.length);
    
    if (posts.length > 0) {
      console.log('\n📝 Primeiros posts:');
      posts.forEach((post, index) => {
        console.log(`${index + 1}. ID: ${post.id}`);
        console.log(`   Título: ${post.title}`);
        console.log(`   Publicado: ${post.is_published}`);
        console.log(`   Criado em: ${post.created_at}`);
        console.log('---');
      });
      
      // Pegar o primeiro post para teste
      const firstPost = posts[0];
      console.log(`\n✅ Post para teste de DELETE: ${firstPost.id}`);
      console.log(`   Título: ${firstPost.title}`);
    } else {
      console.log('❌ Nenhum post encontrado na tabela politician_posts');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

checkExistingPosts();