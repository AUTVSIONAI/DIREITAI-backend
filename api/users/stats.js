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

    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Buscar estatísticas do usuário
    const { count: checkinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: conversationsCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: messagesCount } = await supabase
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: userProfile } = await supabase
      .from('users')
      .select('points, level, created_at')
      .eq('id', userId)
      .single();

    const stats = {
      checkins: checkinsCount || 0,
      conversations: conversationsCount || 0,
      messages: messagesCount || 0,
      points: userProfile?.points || 0,
      level: userProfile?.level || 1,
      member_since: userProfile?.created_at || null
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};