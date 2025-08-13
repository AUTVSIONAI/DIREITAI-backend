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

// Simulação de resposta da IA (substitua por integração real)
const generateAIResponse = async (message, context = null) => {
  // Aqui você integraria com OpenAI, Claude, ou outro serviço de IA
  // Por enquanto, retornamos uma resposta simulada
  
  const responses = [
    "Como conservador, acredito que é importante defender nossos valores tradicionais.",
    "A família é a base da sociedade e devemos protegê-la.",
    "O livre mercado é fundamental para o crescimento econômico.",
    "Precisamos valorizar nossa história e tradições brasileiras.",
    "A segurança pública deve ser prioridade em qualquer governo."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
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
        user_id: user.id,
        message: aiResponse,
        sender: 'ai',
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

      // Atualizar contador de conversas se conversation_id existir
      if (conversation_id) {
        await supabase
          .from('ai_conversations')
          .update({ 
            updated_at: new Date().toISOString(),
            message_count: supabase.raw('message_count + 2'),
            last_message_preview: aiResponse.substring(0, 100)
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