import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurar CORS
const allowedOrigins = [
  'https://direitai.com',
  'https://www.direitai.com',
  'https://direitai.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5120',
  'http://localhost:5121'
];

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

export default async function handler(req, res) {
  // Configurar CORS dinamicamente
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id: politicianId } = req.query;

  if (!politicianId) {
    return res.status(400).json({ error: 'ID do político é obrigatório' });
  }

  try {
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

    // Buscar avaliação do usuário para este político
    const { data: userRating, error } = await supabase
      .from('politician_ratings')
      .select('*')
      .eq('politician_id', politicianId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao buscar avaliação do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(200).json({
      success: true,
      data: userRating || null,
      hasRated: !!userRating
    });

  } catch (error) {
    console.error('Erro na API de avaliação do usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}