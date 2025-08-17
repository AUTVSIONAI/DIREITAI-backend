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
    .eq('id', user.id)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  return userData;
};

// Integração real com OpenRouter API
const generateAIResponse = async (message, context = null) => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    console.warn('OPENROUTER_API_KEY não configurada, usando resposta de fallback');
    return 'Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.';
  }

  try {
    const systemPrompt = `Você é o DireitaGPT, um assistente de IA com perspectiva conservadora brasileira. 
Suas características:
- Defende valores tradicionais, família e livre mercado
- Tem conhecimento sobre política brasileira
- É respeitoso e educado
- Foca em soluções práticas e realistas
- Valoriza a história e tradições do Brasil

Responda de forma clara, objetiva e sempre mantendo uma perspectiva conservadora equilibrada.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://direitai.com',
        'X-Title': 'DireitaGPT - Assistente IA Conservador'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
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
        const { smartDispatcher } = require('../../services/aiService');
        const result = await smartDispatcher(message, systemPrompt);
        
        return result.content;
      } catch (dispatcherError) {
        console.error('Erro no dispatcher inteligente:', dispatcherError.message);
        return 'Desculpe, estou temporariamente indisponível. Nossa equipe está trabalhando para resolver isso. Tente novamente em alguns minutos.';
      }
      
      throw new Error('Erro na API de IA');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
    
  } catch (error) {
    console.error('Erro ao gerar resposta da IA:', error);
    
    // Fallback para respostas conservadoras básicas
    const fallbackResponses = [
      "Como conservador, acredito que é importante defender nossos valores tradicionais e a família brasileira.",
      "A economia brasileira precisa de mais liberdade econômica e menos intervenção estatal para prosperar.",
      "A segurança pública deve ser prioridade, com apoio às forças policiais e justiça eficiente.",
      "Precisamos valorizar nossa história, tradições e a soberania nacional do Brasil.",
      "A educação deve focar em conhecimento sólido e valores cívicos para formar cidadãos responsáveis."
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://direitai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      console.log('💬 Processing AI chat request');
      
      const user = await authenticateUser(req);
      const { message, conversation_id, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log('👤 User:', user.email);
      console.log('💭 Message:', message);

      // Gerar resposta da IA
      const aiResponse = await generateAIResponse(message, context);

      // Salvar mensagem do usuário
      const userMessageData = {
        conversation_id: conversation_id || null,
        user_id: user.id,
        message: message,
        sender: 'user',
        created_at: new Date().toISOString()
      };

      const { data: userMessage, error: userMessageError } = await supabase
        .from('ai_messages')
        .insert(userMessageData)
        .select()
        .single();

      if (userMessageError) {
        console.error('❌ Error saving user message:', userMessageError);
      }

      // Salvar resposta da IA
      const aiMessageData = {
        conversation_id: conversation_id || null,
        role: 'assistant',
        content: aiResponse,
        tokens: 0,
        created_at: new Date().toISOString()
      };

      const { data: aiMessage, error: aiMessageError } = await supabase
        .from('ai_messages')
        .insert(aiMessageData)
        .select()
        .single();

      if (aiMessageError) {
        console.error('❌ Error saving AI message:', aiMessageError);
      }

      // Atualizar conversa se conversation_id existir
      if (conversation_id) {
        await supabase
          .from('ai_conversations')
          .update({ 
            response: aiResponse,
            tokens_used: 0,
            created_at: new Date().toISOString()
          })
          .eq('id', conversation_id);
      }

      console.log('✅ Chat processed successfully');
      return res.json({
        response: aiResponse,
        message_id: aiMessage?.id,
        conversation_id: conversation_id
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};