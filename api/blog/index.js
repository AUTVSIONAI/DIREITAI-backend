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

  try {
    if (req.method === 'GET') {
      // Listar posts do blog com filtros
      const {
        page = 1,
        limit = 10,
        politician_id,
        tag,
        search,
        status = 'published'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabase
        .from('politician_posts')
        .select(`
          *,
          politicians (
            id,
            name,
            position,
            state,
            party,
            photo_url
          ),
          politician_tags (
            tag_name
          )
        `, { count: 'exact' })
        .eq('status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (politician_id) {
        query = query.eq('politician_id', politician_id);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
      }

      const { data: posts, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar posts:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Filtrar por tag se especificada
      let filteredPosts = posts;
      if (tag) {
        filteredPosts = posts.filter(post => 
          post.politician_tags.some(t => t.tag_name.toLowerCase() === tag.toLowerCase())
        );
      }

      return res.status(200).json({
        success: true,
        data: filteredPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      });
    }

    if (req.method === 'POST') {
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
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores e jornalistas podem criar posts.' });
      }

      // Criar novo post
      const {
        politician_id,
        title,
        content,
        excerpt,
        featured_image_url,
        tags = [],
        status = 'draft'
      } = req.body;

      if (!politician_id || !title || !content) {
        return res.status(400).json({ error: 'ID do político, título e conteúdo são obrigatórios' });
      }

      // Verificar se o político existe
      const { data: politician, error: politicianError } = await supabase
        .from('politicians')
        .select('id, name')
        .eq('id', politician_id)
        .eq('is_active', true)
        .single();

      if (politicianError || !politician) {
        return res.status(404).json({ error: 'Político não encontrado ou inativo' });
      }

      // Gerar slug do título
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens duplicados
        .trim('-');

      // Verificar se o slug já existe
      const { data: existingPost } = await supabase
        .from('politician_posts')
        .select('id')
        .eq('slug', slug)
        .single();

      let finalSlug = slug;
      if (existingPost) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      // Criar o post
      const { data: post, error: createError } = await supabase
        .from('politician_posts')
        .insert({
          politician_id,
          title,
          slug: finalSlug,
          content,
          excerpt: excerpt || content.substring(0, 200) + '...',
          featured_image_url,
          status,
          author_id: user.id
        })
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

      if (createError) {
        console.error('Erro ao criar post:', createError);
        return res.status(500).json({ error: 'Erro ao criar post' });
      }

      // Adicionar tags se fornecidas
      if (tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          post_id: post.id,
          tag_name: tag.trim()
        }));

        const { error: tagError } = await supabase
          .from('politician_tags')
          .insert(tagInserts);

        if (tagError) {
          console.error('Erro ao adicionar tags:', tagError);
          // Não retornar erro para não afetar a criação do post
        }
      }

      return res.status(201).json({
        success: true,
        data: post,
        message: 'Post criado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API do blog:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};