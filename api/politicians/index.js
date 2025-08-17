const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_ANON_KEY não encontrada');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente admin para operações que precisam contornar RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração de CORS
const allowedOrigins = [
  'https://direitai.com',
  'https://www.direitai.com',
  'https://direitai.vercel.app',
  'http://localhost:5121',
  'http://localhost:5120'
];

const corsHeaders = {
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
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  try {
    if (req.method === 'GET') {
      // Listar políticos com filtros opcionais
      const { state, party, position, search } = req.query;
      
      let query = supabase
        .from('politicians')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Aplicar filtros
      if (state) {
        query = query.eq('state', state.toUpperCase());
      }
      if (party) {
        query = query.eq('party', party);
      }
      if (position) {
        query = query.eq('position', position);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,short_bio.ilike.%${search}%`);
      }

      const { data: politicians, error } = await query;

      if (error) {
        console.error('Erro ao buscar políticos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      return res.status(200).json({
        success: true,
        data: politicians,
        count: politicians.length
      });
    }

    if (req.method === 'POST') {
      // Verificar autenticação e permissão de admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin usando service role para evitar RLS
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar políticos.' });
      }

      // Criar novo político
      const {
        name,
        position,
        state,
        party,
        photo_url,
        short_bio,
        social_links,
        government_plan,
        government_plan_pdf_url,
        main_ideologies
      } = req.body;

      if (!name || !position) {
        return res.status(400).json({ error: 'Nome e cargo são obrigatórios' });
      }

      const { data: politician, error: createError } = await supabase
        .from('politicians')
        .insert({
          name,
          position,
          state: state?.toUpperCase(),
          party,
          photo_url,
          short_bio,
          social_links: social_links || {},
          government_plan,
          government_plan_pdf_url,
          main_ideologies: main_ideologies || []
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar político:', createError);
        return res.status(500).json({ error: 'Erro ao criar político' });
      }

      return res.status(201).json({
        success: true,
        data: politician,
        message: 'Político criado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de políticos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};