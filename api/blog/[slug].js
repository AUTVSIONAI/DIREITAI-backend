const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_ANON_KEY não encontrada');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://direitai.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Slug do post é obrigatório' });
  }

  try {
    if (req.method === 'GET') {
      // Buscar post específico por slug
      const { data: post, error } = await supabase
        .from('politician_posts')
        .select(`
          *,
          politicians (
            id,
            name,
            position,
            state,
            party,
            photo_url,
            short_bio,
            social_media
          ),
          politician_tags (
            tag_name
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !post) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      // Incrementar visualizações
      const { error: updateError } = await supabase
        .from('politician_posts')
        .update({ views: (post.views || 0) + 1 })
        .eq('id', post.id);

      if (updateError) {
        console.error('Erro ao incrementar visualizações:', updateError);
      }

      // Buscar posts relacionados do mesmo político
      const { data: relatedPosts } = await supabase
        .from('politician_posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          created_at
        `)
        .eq('politician_id', post.politician_id)
        .eq('status', 'published')
        .neq('id', post.id)
        .order('created_at', { ascending: false })
        .limit(3);

      return res.status(200).json({
        success: true,
        data: {
          ...post,
          views: (post.views || 0) + 1,
          related_posts: relatedPosts || []
        }
      });
    }

    if (req.method === 'PUT') {
      // Verificar autenticação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin ou jornalista
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || !['admin', 'journalist'].includes(userProfile.role)) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores e jornalistas podem editar posts.' });
      }

      // Buscar o post atual
      const { data: currentPost, error: fetchError } = await supabase
        .from('politician_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError || !currentPost) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      // Verificar se o usuário pode editar este post (admin ou autor)
      if (userProfile.role !== 'admin' && currentPost.author_id !== user.id) {
        return res.status(403).json({ error: 'Você só pode editar seus próprios posts' });
      }

      // Atualizar post
      const {
        title,
        content,
        excerpt,
        featured_image_url,
        status,
        tags = []
      } = req.body;

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (title) {
        updateData.title = title;
        // Gerar novo slug se o título mudou
        if (title !== currentPost.title) {
          const newSlug = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
          
          // Verificar se o novo slug já existe
          const { data: existingPost } = await supabase
            .from('politician_posts')
            .select('id')
            .eq('slug', newSlug)
            .neq('id', currentPost.id)
            .single();

          updateData.slug = existingPost ? `${newSlug}-${Date.now()}` : newSlug;
        }
      }

      if (content) updateData.content = content;
      if (excerpt) updateData.excerpt = excerpt;
      if (featured_image_url !== undefined) updateData.featured_image_url = featured_image_url;
      if (status) updateData.status = status;

      const { data: updatedPost, error: updateError } = await supabase
        .from('politician_posts')
        .update(updateData)
        .eq('id', currentPost.id)
        .select(`
          *,
          politicians (
            id,
            name,
            position,
            state,
            party,
            photo_url
          )
        `)
        .single();

      if (updateError) {
        console.error('Erro ao atualizar post:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar post' });
      }

      // Atualizar tags se fornecidas
      if (tags.length >= 0) {
        // Remover tags existentes
        await supabase
          .from('politician_tags')
          .delete()
          .eq('post_id', currentPost.id);

        // Adicionar novas tags
        if (tags.length > 0) {
          const tagInserts = tags.map(tag => ({
            post_id: currentPost.id,
            tag_name: tag.trim()
          }));

          const { error: tagError } = await supabase
            .from('politician_tags')
            .insert(tagInserts);

          if (tagError) {
            console.error('Erro ao atualizar tags:', tagError);
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: updatedPost,
        message: 'Post atualizado com sucesso'
      });
    }

    if (req.method === 'DELETE') {
      // Verificar autenticação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin ou jornalista
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || !['admin', 'journalist'].includes(userProfile.role)) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores e jornalistas podem deletar posts.' });
      }

      // Buscar o post
      const { data: post, error: fetchError } = await supabase
        .from('politician_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError || !post) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      // Verificar se o usuário pode deletar este post (admin ou autor)
      if (userProfile.role !== 'admin' && post.author_id !== user.id) {
        return res.status(403).json({ error: 'Você só pode deletar seus próprios posts' });
      }

      // Soft delete - marcar como deletado
      const { error: deleteError } = await supabase
        .from('politician_posts')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (deleteError) {
        console.error('Erro ao deletar post:', deleteError);
        return res.status(500).json({ error: 'Erro ao deletar post' });
      }

      return res.status(200).json({
        success: true,
        message: 'Post deletado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API do post:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};