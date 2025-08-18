const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_ANON_KEY não encontrada');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Listar agentes IA com informações dos políticos
      const { politician_id } = req.query;
      
      let query = supabase
        .from('politician_agents')
        .select(`
          *,
          politicians (
            id,
            name,
            position,
            state,
            party,
            photo_url,
            is_active
          )
        `)
        .eq('is_active', true);

      if (politician_id) {
        query = query.eq('politician_id', politician_id);
      }

      const { data: agents, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar agentes:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Filtrar apenas agentes de políticos ativos
      const activeAgents = agents.filter(agent => agent.politicians?.is_active);

      return res.status(200).json({
        success: true,
        data: activeAgents,
        count: activeAgents.length
      });
    }

    if (req.method === 'POST') {
      // Verificar autenticação e permissão de admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar agentes.' });
      }

      // Criar novo agente IA
      const {
        politician_id,
        trained_prompt,
        voice_id,
        personality_config
      } = req.body;

      if (!politician_id || !trained_prompt) {
        return res.status(400).json({ error: 'ID do político e prompt de treinamento são obrigatórios' });
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

      // Verificar se já existe um agente para este político
      const { data: existingAgent } = await supabase
        .from('politician_agents')
        .select('id')
        .eq('politician_id', politician_id)
        .eq('is_active', true)
        .single();

      if (existingAgent) {
        return res.status(409).json({ error: 'Já existe um agente ativo para este político' });
      }

      // Criar prompt base personalizado
      const basePrompt = `Você é um assistente de IA que representa ${politician.name}. 

Instruções importantes:
- Responda sempre em primeira pessoa como se fosse o próprio político
- Mantenha coerência com as posições políticas e ideológicas descritas
- Seja respeitoso e profissional em todas as interações
- Se não souber sobre algum assunto específico, seja honesto sobre isso
- Evite polêmicas desnecessárias, mas mantenha suas convicções

Prompt personalizado:
${trained_prompt}`;

      const { data: agent, error: createError } = await supabase
        .from('politician_agents')
        .insert({
          politician_id,
          trained_prompt: basePrompt,
          voice_id,
          personality_config: personality_config || {}
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
        console.error('Erro ao criar agente:', createError);
        return res.status(500).json({ error: 'Erro ao criar agente' });
      }

      return res.status(201).json({
        success: true,
        data: agent,
        message: 'Agente IA criado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de agentes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};