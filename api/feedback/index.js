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
      // Listar feedback (apenas para admins)
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
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem visualizar feedback.' });
      }

      const {
        page = 1,
        limit = 20,
        agent_id,
        rating,
        feedback_type
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabase
        .from('user_feedback')
        .select(`
          *,
          politician_agents (
            id,
            politicians (
              name,
              position
            )
          ),
          users (
            email,
            full_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (agent_id) {
        query = query.eq('agent_id', agent_id);
      }

      if (rating) {
        query = query.eq('rating', parseInt(rating));
      }

      if (feedback_type) {
        query = query.eq('feedback_type', feedback_type);
      }

      const { data: feedback, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar feedback:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      return res.status(200).json({
        success: true,
        data: feedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      });
    }

    if (req.method === 'POST') {
      // Criar novo feedback
      const {
        agent_id,
        conversation_id,
        rating,
        feedback_type,
        comment,
        session_id
      } = req.body;

      if (!agent_id || !rating || !feedback_type) {
        return res.status(400).json({ 
          error: 'ID do agente, avaliação e tipo de feedback são obrigatórios' 
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ 
          error: 'Avaliação deve ser entre 1 e 5' 
        });
      }

      const validFeedbackTypes = ['conversation', 'agent_quality', 'technical_issue', 'suggestion', 'complaint'];
      if (!validFeedbackTypes.includes(feedback_type)) {
        return res.status(400).json({ 
          error: 'Tipo de feedback inválido' 
        });
      }

      // Verificar se o agente existe
      const { data: agent, error: agentError } = await supabase
        .from('politician_agents')
        .select('id')
        .eq('id', agent_id)
        .eq('is_active', true)
        .single();

      if (agentError || !agent) {
        return res.status(404).json({ error: 'Agente não encontrado ou inativo' });
      }

      // Verificar autenticação (opcional)
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Verificar se já existe feedback para esta conversa (evitar spam)
      if (conversation_id) {
        const { data: existingFeedback } = await supabase
          .from('user_feedback')
          .select('id')
          .eq('conversation_id', conversation_id)
          .single();

        if (existingFeedback) {
          return res.status(409).json({ 
            error: 'Feedback já enviado para esta conversa' 
          });
        }
      }

      // Criar feedback
      const { data: feedback, error: createError } = await supabase
        .from('user_feedback')
        .insert({
          agent_id,
          conversation_id,
          user_id: userId,
          rating,
          feedback_type,
          comment: comment || null,
          session_id,
          user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar feedback:', createError);
        return res.status(500).json({ error: 'Erro ao enviar feedback' });
      }

      return res.status(201).json({
        success: true,
        data: feedback,
        message: 'Feedback enviado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de feedback:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};