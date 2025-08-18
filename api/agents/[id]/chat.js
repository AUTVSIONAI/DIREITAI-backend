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

// Função para chamar a API da OpenRouter
async function callOpenRouterAPI(prompt, userMessage) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    throw new Error('OPENROUTER_API_KEY não configurada');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://direitai.com',
      'X-Title': 'Direitaí - Agente Político IA'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Erro na OpenRouter API:', errorData);
    
    // Usar sistema de dispatcher inteligente para múltiplas LLMs
    console.log('🚀 Iniciando sistema de dispatcher inteligente para fallback...');
    try {
      const { smartDispatcher } = require('../../../services/aiService');
      const result = await smartDispatcher(userMessage, prompt);
      
      return result.content;
    } catch (dispatcherError) {
      console.error('Erro no dispatcher inteligente:', dispatcherError.message);
      return 'Desculpe, estou temporariamente indisponível. Nossa equipe está trabalhando para resolver isso. Tente novamente em alguns minutos.';
    }
    
    throw new Error('Erro na API de IA');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id: agentId } = req.query;
  const { message, session_id } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'ID do agente é obrigatório' });
  }

  if (!message || !session_id) {
    return res.status(400).json({ error: 'Mensagem e session_id são obrigatórios' });
  }

  try {
    // Buscar o agente e o político
    const { data: agent, error: agentError } = await supabase
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
          short_bio,
          government_plan,
          main_ideologies
        )
      `)
      .eq('id', agentId)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agente não encontrado ou inativo' });
    }

    if (!agent.politicians?.is_active) {
      return res.status(404).json({ error: 'Político associado não está ativo' });
    }

    // Verificar autenticação (opcional para conversas)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const startTime = Date.now();

    try {
      // Chamar a API de IA
      const aiResponse = await callOpenRouterAPI(agent.trained_prompt, message);
      const responseTime = Date.now() - startTime;

      // Salvar a conversa no banco
      const { error: conversationError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          session_id,
          user_message: message,
          agent_response: aiResponse,
          response_time_ms: responseTime,
          user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        });

      if (conversationError) {
        console.error('Erro ao salvar conversa:', conversationError);
        // Não retornar erro para não afetar a experiência do usuário
      }

      return res.status(200).json({
        success: true,
        data: {
          message: aiResponse,
          politician: {
            name: agent.politicians.name,
            position: agent.politicians.position,
            photo_url: agent.politicians.photo_url
          },
          response_time_ms: responseTime,
          session_id
        }
      });

    } catch (aiError) {
      console.error('Erro na IA:', aiError);
      
      // Resposta de fallback
      const fallbackResponse = `Olá! Sou ${agent.politicians.name}, ${agent.politicians.position}. ` +
        'No momento estou com dificuldades técnicas para responder sua pergunta, mas agradeço seu interesse. ' +
        'Tente novamente em alguns instantes ou entre em contato através dos meus canais oficiais.';

      // Salvar conversa com resposta de fallback
      const { error: conversationError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          session_id,
          user_message: message,
          agent_response: fallbackResponse,
          response_time_ms: Date.now() - startTime,
          user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        });

      return res.status(200).json({
        success: true,
        data: {
          message: fallbackResponse,
          politician: {
            name: agent.politicians.name,
            position: agent.politicians.position,
            photo_url: agent.politicians.photo_url
          },
          response_time_ms: Date.now() - startTime,
          session_id,
          fallback: true
        }
      });
    }

  } catch (error) {
    console.error('Erro na API de chat do agente:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};