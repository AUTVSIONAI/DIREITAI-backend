const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware de autenticação simplificado
function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // Aqui você pode adicionar validação JWT se necessário
  return { token };
}

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://direitai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const user = authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 10 } = req.query;
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Buscar checkins do usuário
    const { data: checkins, error } = await supabase
      .from('checkins')
      .select(`
        *,
        events (
          id,
          title,
          description,
          date,
          location,
          city,
          state,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch checkins' });
    }

    res.json({ checkins: checkins || [] });
  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};