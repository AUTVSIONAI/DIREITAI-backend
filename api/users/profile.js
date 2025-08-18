const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    .eq('auth_id', user.id)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  return userData;
};

module.exports = async (req, res) => {
  // Configurar CORS
  const allowedOrigins = ['https://direitai.com', 'http://localhost:5121'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      console.log('📋 Getting profile for user');
      
      const user = await authenticateUser(req);
      
      // Remover campos sensíveis
      const profile = {
        ...user,
        // Não expor campos sensíveis se existirem
      };
      
      console.log('✅ Profile retrieved successfully');
      return res.json(profile);
    }

    if (req.method === 'PUT') {
      console.log('🔍 REQUEST: PUT /api/users/profile');
      
      const user = await authenticateUser(req);
      console.log('📝 Profile update request for user:', user.id);
      console.log('📝 Request body:', req.body);
      
      const { username, full_name, bio, city, state, phone, birth_date, avatar_url } = req.body;

      // Validate required fields
      if (!username || !full_name) {
        console.log('❌ Missing required fields: username or full_name');
        return res.status(400).json({ error: 'Username and full name are required' });
      }

      const updateData = {
        username,
        full_name,
        bio: bio || null,
        city: city || null,
        state: state || null,
        phone: phone || null,
        birth_date: birth_date && birth_date.trim() !== '' ? birth_date : null,
        updated_at: new Date().toISOString(),
      };

      // Add avatar_url if provided
      if (avatar_url) {
        updateData.avatar_url = avatar_url;
      }
      
      console.log('📝 Update data:', updateData);
      console.log('🔍 User ID from req.user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase update error:', error);
        // Return more specific error for debugging
        if (error.code === '22007') {
          return res.status(400).json({ error: 'Invalid date format. Please check your birth date.' });
        }
        return res.status(500).json({ error: 'Failed to update profile', details: error.message });
      }

      console.log('✅ Profile updated successfully');
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Profile endpoint error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};