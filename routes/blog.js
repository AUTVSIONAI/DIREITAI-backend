const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para gerar slug a partir do título
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim('-'); // Remove hífens do início e fim
}

// Função para verificar se uma string é um UUID válido
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/blog - Listar todos os posts publicados
router.get('/', async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('politician_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar posts:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Adicionar slug gerado dinamicamente para cada post
    const postsWithSlugs = posts.map(post => ({
      ...post,
      slug: generateSlug(post.title)
    }));

    res.json({
      success: true,
      data: postsWithSlugs,
      total: postsWithSlugs.length
    });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/blog/posts - Listar posts (compatibilidade)
router.get('/posts', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const { data: posts, error } = await supabase
      .from('politician_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar posts:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Adicionar slug gerado dinamicamente para cada post
    const postsWithSlugs = posts.map(post => ({
      ...post,
      slug: generateSlug(post.title)
    }));

    res.json(postsWithSlugs);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/blog/posts/:identifier - Buscar post por ID ou slug (compatibilidade)
router.get('/posts/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let query;

    // Se o identificador é um UUID, busca por ID
    if (isValidUUID(identifier)) {
      query = supabase
        .from('politician_posts')
        .select('*')
        .eq('id', identifier)
        .eq('is_published', true)
        .single();
    } else {
      // Se não é UUID, busca por título que gere o mesmo slug
      const { data: allPosts, error: searchError } = await supabase
        .from('politician_posts')
        .select('*')
        .eq('is_published', true);

      if (searchError) {
        console.error('Erro ao buscar posts para slug:', searchError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Encontrar o post que gera o slug correspondente
      const matchingPost = allPosts.find(post => generateSlug(post.title) === identifier);
      
      if (!matchingPost) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      // Simular o resultado do single()
      const { data: post, error } = { data: matchingPost, error: null };
      
      if (post) {
        // Buscar posts relacionados
        const { data: relatedPosts } = await supabase
          .from('politician_posts')
          .select('id, title, summary, featured_image, published_at')
          .eq('is_published', true)
          .neq('id', post.id)
          .limit(4)
          .order('published_at', { ascending: false });

        // Adicionar slug aos posts relacionados
        const relatedPostsWithSlugs = relatedPosts ? relatedPosts.map(relatedPost => ({
          ...relatedPost,
          slug: generateSlug(relatedPost.title)
        })) : [];

        res.json({
          ...post,
          slug: generateSlug(post.title),
          related_posts: relatedPostsWithSlugs
        });
        return;
      }
    }

    const { data: post, error } = await query;

    if (error || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Buscar posts relacionados
    const { data: relatedPosts } = await supabase
      .from('politician_posts')
      .select('id, title, summary, featured_image, published_at')
      .eq('is_published', true)
      .neq('id', post.id)
      .limit(4)
      .order('published_at', { ascending: false });

    // Adicionar slug aos posts relacionados
    const relatedPostsWithSlugs = relatedPosts ? relatedPosts.map(relatedPost => ({
      ...relatedPost,
      slug: generateSlug(relatedPost.title)
    })) : [];

    res.json({
      ...post,
      slug: generateSlug(post.title),
      related_posts: relatedPostsWithSlugs
    });
  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/blog/:identifier - Buscar post por ID ou slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let query;

    // Se o identificador é um UUID, busca por ID
    if (isValidUUID(identifier)) {
      query = supabase
        .from('politician_posts')
        .select('*')
        .eq('id', identifier)
        .eq('is_published', true)
        .single();
    } else {
      // Se não é UUID, busca por título que gere o mesmo slug
      const { data: allPosts, error: searchError } = await supabase
        .from('politician_posts')
        .select('*')
        .eq('is_published', true);

      if (searchError) {
        console.error('Erro ao buscar posts para slug:', searchError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Encontrar o post que gera o slug correspondente
      const matchingPost = allPosts.find(post => generateSlug(post.title) === identifier);
      
      if (!matchingPost) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      // Simular o resultado do single()
      const { data: post, error } = { data: matchingPost, error: null };
      
      if (error) {
        console.error('Erro ao buscar post:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Adicionar slug ao post
      const postWithSlug = {
        ...post,
        slug: generateSlug(post.title)
      };

      // Buscar posts relacionados do mesmo político
      const { data: relatedPosts } = await supabase
        .from('politician_posts')
        .select('id, title, cover_image_url, published_at')
        .eq('author_id', post.author_id)
        .eq('is_published', true)
        .neq('id', post.id)
        .order('published_at', { ascending: false })
        .limit(3);

      // Adicionar slugs aos posts relacionados
      const relatedPostsWithSlugs = relatedPosts ? relatedPosts.map(relatedPost => ({
        ...relatedPost,
        slug: generateSlug(relatedPost.title)
      })) : [];

      return res.json({
        ...postWithSlug,
        related_posts: relatedPostsWithSlugs
      });
    }

    const { data: post, error } = await query;

    if (error) {
      console.error('Erro ao buscar post:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Adicionar slug ao post
    const postWithSlug = {
      ...post,
      slug: generateSlug(post.title)
    };

    // Buscar posts relacionados do mesmo político
    const { data: relatedPosts } = await supabase
      .from('politician_posts')
      .select('id, title, cover_image_url, published_at, created_at, excerpt')
      .eq('author_id', post.author_id)
      .eq('is_published', true)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3);

    // Adicionar slugs aos posts relacionados
    const relatedPostsWithSlugs = relatedPosts ? relatedPosts.map(relatedPost => ({
      ...relatedPost,
      slug: generateSlug(relatedPost.title)
    })) : [];

    res.json({
      ...postWithSlug,
      related_posts: relatedPostsWithSlugs
    });
  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/blog/:id - Atualizar post (requer autenticação)
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, cover_image_url, tags, is_published } = req.body;
    const userId = req.user.id;

    // Verificar se o usuário tem permissão (admin ou journalist)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    if (!['admin', 'journalist'].includes(user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    // Atualizar o post
    const updateData = {
      title,
      content,
      cover_image_url,
      tags: tags || [],
      is_published: is_published || false,
      updated_at: new Date().toISOString()
    };

    if (is_published) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: updatedPost, error } = await supabase
      .from('politician_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar post:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Adicionar slug ao post atualizado
    const postWithSlug = {
      ...updatedPost,
      slug: generateSlug(updatedPost.title)
    };

    res.json(postWithSlug);
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/blog/:id - Deletar post (requer autenticação)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o usuário tem permissão (admin ou journalist)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    if (!['admin', 'journalist'].includes(user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    // Soft delete - marcar como não publicado
    const { data: deletedPost, error } = await supabase
      .from('politician_posts')
      .update({ 
        is_published: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao deletar post:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ message: 'Post deletado com sucesso', post: deletedPost });
  } catch (error) {
    console.error('Erro ao deletar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/blog - Criar novo post (requer autenticação)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, content, cover_image_url, tags, politician_id, is_published } = req.body;
    const userId = req.user.id;

    // Verificar se o usuário tem permissão (admin ou journalist)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    if (!['admin', 'journalist'].includes(user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }

    // Verificar se o político existe (se fornecido)
    if (politician_id) {
      const { data: politician, error: politicianError } = await supabase
        .from('politicians')
        .select('id')
        .eq('id', politician_id)
        .single();

      if (politicianError || !politician) {
        return res.status(400).json({ error: 'Político não encontrado' });
      }
    }

    // Criar o post
    const postData = {
      title,
      content,
      cover_image_url,
      tags: tags || [],
      author_id: politician_id || userId, // Usar politician_id se fornecido, senão usar userId
      is_published: is_published || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (is_published) {
      postData.published_at = new Date().toISOString();
    }

    const { data: newPost, error } = await supabase
      .from('politician_posts')
      .insert([postData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar post:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Adicionar slug ao post criado
    const postWithSlug = {
      ...newPost,
      slug: generateSlug(newPost.title)
    };

    res.status(201).json(postWithSlug);
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS SOCIAIS ====================

// Curtir/Descurtir post
router.post('/:postId/like', authenticateUser, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Verificar se o post existe
    const { data: post, error: postError } = await supabase
      .from('politician_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Verificar se já curtiu
    const { data: existingLike } = await supabase
      .from('blog_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Descurtir
      await supabase
        .from('blog_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      // Decrementar contador
      await supabase.rpc('decrement_likes_count', { post_id: postId });
      
      res.json({ liked: false, message: 'Post descurtido' });
    } else {
      // Curtir
      await supabase
        .from('blog_post_likes')
        .insert({ post_id: postId, user_id: userId });

      // Incrementar contador
      await supabase.rpc('increment_likes_count', { post_id: postId });
      
      res.json({ liked: true, message: 'Post curtido' });
    }
  } catch (error) {
    console.error('Erro ao curtir/descurtir post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter status de curtida do usuário
router.get('/:postId/like-status', authenticateUser, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const { data: like } = await supabase
      .from('blog_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    res.json({ liked: !!like });
  } catch (error) {
    console.error('Erro ao verificar status de curtida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Compartilhar post
router.post('/:postId/share', authenticateUser, async (req, res) => {
  try {
    const { postId } = req.params;
    const { platform } = req.body;
    const userId = req.user.id;

    // Verificar se o post existe
    const { data: post, error: postError } = await supabase
      .from('politician_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Registrar compartilhamento
    await supabase
      .from('blog_post_shares')
      .insert({ 
        post_id: postId, 
        user_id: userId, 
        platform: platform || 'unknown' 
      });

    // Incrementar contador
    await supabase.rpc('increment_shares_count', { post_id: postId });
    
    res.json({ message: 'Post compartilhado com sucesso' });
  } catch (error) {
    console.error('Erro ao compartilhar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar visualização
router.post('/:postId/view', async (req, res) => {
  try {
    const { postId } = req.params;
    const { ip } = req.body;
    const userAgent = req.get('User-Agent');

    // Verificar se o post existe
    const { data: post, error: postError } = await supabase
      .from('politician_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Registrar visualização (evitar duplicatas por IP nas últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: existingView } = await supabase
      .from('blog_post_views')
      .select('id')
      .eq('post_id', postId)
      .eq('ip_address', ip || req.ip)
      .gte('created_at', oneDayAgo)
      .single();

    if (!existingView) {
      await supabase
        .from('blog_post_views')
        .insert({ 
          post_id: postId, 
          ip_address: ip || req.ip,
          user_agent: userAgent
        });

      // Incrementar contador
      await supabase.rpc('increment_views_count', { post_id: postId });
    }
    
    res.json({ message: 'Visualização registrada' });
  } catch (error) {
    console.error('Erro ao registrar visualização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE COMENTÁRIOS ====================

// Listar comentários de um post
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se o post existe
    const { data: post, error: postError } = await supabase
      .from('politician_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Buscar comentários com informações do usuário
    const { data: comments, error } = await supabase
      .from('blog_comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        likes_count,
        users!inner(
          id,
          name,
          email
        )
      `)
      .eq('post_id', postId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Contar total de comentários
    const { count } = await supabase
      .from('blog_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_approved', true);

    res.json({
      comments: comments || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar comentário
router.post('/:postId/comments', authenticateUser, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comentário muito longo (máximo 1000 caracteres)' });
    }

    // Verificar se o post existe
    const { data: post, error: postError } = await supabase
      .from('politician_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Criar comentário
    const { data: comment, error } = await supabase
      .from('blog_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        is_approved: true // Auto-aprovar por enquanto
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        likes_count,
        users!inner(
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Incrementar contador de comentários do post
    await supabase.rpc('increment_comments_count', { post_id: postId });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Curtir/Descurtir comentário
router.post('/comments/:commentId/like', authenticateUser, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Verificar se o comentário existe
    const { data: comment, error: commentError } = await supabase
      .from('blog_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Verificar se já curtiu
    const { data: existingLike } = await supabase
      .from('blog_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Descurtir
      await supabase
        .from('blog_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      // Decrementar contador
      await supabase.rpc('decrement_comment_likes_count', { comment_id: commentId });
      
      res.json({ liked: false, message: 'Comentário descurtido' });
    } else {
      // Curtir
      await supabase
        .from('blog_comment_likes')
        .insert({ comment_id: commentId, user_id: userId });

      // Incrementar contador
      await supabase.rpc('increment_comment_likes_count', { comment_id: commentId });
      
      res.json({ liked: true, message: 'Comentário curtido' });
    }
  } catch (error) {
    console.error('Erro ao curtir/descurtir comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar comentário (apenas o autor ou admin)
router.delete('/comments/:commentId', authenticateUser, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Buscar comentário
    const { data: comment, error: commentError } = await supabase
      .from('blog_comments')
      .select('id, user_id, post_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Verificar permissão (autor do comentário ou admin)
    if (comment.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para deletar este comentário' });
    }

    // Deletar comentário
    const { error: deleteError } = await supabase
      .from('blog_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      throw deleteError;
    }

    // Decrementar contador de comentários do post
    await supabase.rpc('decrement_comments_count', { post_id: comment.post_id });

    res.json({ message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;