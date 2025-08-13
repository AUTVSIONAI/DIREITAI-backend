const { supabase } = require('../../config/supabase');

// Middleware de autenticação simplificado para Vercel
const authenticateUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  return userData;
};

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://direitai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      console.log('📋 Getting AI conversations');
      
      const user = await authenticateUser(req);
      const { limit = 50, userId } = req.query;
      
      // Use userId from query if provided, otherwise use authenticated user
      const targetUserId = userId || user.id;
      
      console.log('🔍 Fetching conversations for user:', targetUserId);
      
      let query = supabase
        .from('ai_conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          message_count,
          last_message_preview
        `)
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (limit) {
        query = query.limit(parseInt(limit));
      }

      const { data: conversations, error } = await query;

      if (error) {
        console.error('❌ Error fetching conversations:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
      }

      console.log('✅ Conversations retrieved successfully:', conversations?.length || 0);
      return res.json({ 
        conversations: conversations || [],
        total: conversations?.length || 0
      });
    }

    if (req.method === 'POST') {
      console.log('📝 Creating new AI conversation');
      
      const user = await authenticateUser(req);
      const { title, first_message } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const conversationData = {
        user_id: user.id,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: first_message ? 1 : 0,
        last_message_preview: first_message ? first_message.substring(0, 100) : null
      };

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert(conversationData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating conversation:', error);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      console.log('✅ Conversation created successfully');
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('AI conversations endpoint error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};