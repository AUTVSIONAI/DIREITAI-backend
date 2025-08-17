const express = require('express');
const { supabase } = require('../config/supabase');
const aiService = require('../services/aiService');
const { authenticateUser } = require('../middleware/auth');
const { randomUUID } = require('crypto');
const router = express.Router();

// DireitaGPT Chat com APIs reais
router.post('/chat', authenticateUser, async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    const authId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // User data is already available from middleware
    const userId = req.user.id;
    const userProfile = req.user;

    const userPlan = userProfile?.plan || 'free';
    
    // Check user limits
    const limits = await aiService.checkUserLimits(userId, userPlan);
    
    if (!limits.canUse) {
      return res.status(429).json({ 
        error: 'Daily usage limit reached',
        limit: limits.limit,
        used: limits.used,
        remaining: limits.remaining
      });
    }

    // Generate AI response using real APIs
    const aiResult = await aiService.generateResponse(message);

    if (!aiResult.success) {
      return res.status(500).json({ 
        error: 'Failed to generate AI response',
        details: aiResult.error
      });
    }

    // Generate conversation ID if not provided
    const finalConversationId = conversation_id || randomUUID();

    // Save conversation to database
    const saveResult = await aiService.saveConversation(
      userId,
      finalConversationId,
      message,
      aiResult.content,
      aiResult.tokensUsed || 0,
      aiResult.model,
      aiResult.provider
    );

    if (!saveResult.success) {
      console.error('Error saving conversation:', saveResult.error);
    }

    // Get updated usage
    const updatedLimits = await aiService.checkUserLimits(userId, userPlan);

    res.json({
      response: aiResult.content,
      conversation_id: finalConversationId,
      model: aiResult.model,
      provider: aiResult.provider,
      tokens_used: aiResult.tokensUsed,
      usage: {
        used: updatedLimits.used,
        limit: updatedLimits.limit,
        remaining: updatedLimits.remaining
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user usage statistics
router.get('/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userPlan = req.user.plan || 'Gratuito';

    const limits = await aiService.checkUserLimits(userId, userPlan);

    res.json({
      dailyUsage: limits.used,
      planLimit: limits.limit,
      remaining: limits.remaining,
      plan: userPlan
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Creative AI usage statistics
router.get('/creative-ai/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userPlan = req.user.plan || 'gratuito';
    const today = new Date().toISOString().split('T')[0];

    // Today's generation usage
    const { count: todayGenerations } = await supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    // Total generation usage
    const { count: totalGenerations } = await supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const generationLimits = {
      gratuito: 0,
      engajado: 20,
      premium: -1,
    };

    const limit = generationLimits[userPlan] || generationLimits.gratuito;
    const used = todayGenerations || 0;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    res.json({
      plan: userPlan,
      today: {
        generations: used,
      },
      total: {
        generations: totalGenerations || 0,
      },
      limits: {
        generations: limit,
      },
      remaining: remaining,
      canUse: limit === -1 || used < limit
    });
  } catch (error) {
    console.error('Creative AI usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user conversation history
router.get('/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const result = await aiService.getUserConversations(userId, parseInt(limit));

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to fetch conversations',
        details: result.error
      });
    }

    res.json({
      conversations: result.data,
      total: result.data.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Creative AI Content Generation
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { type, prompt, tone, length, template } = req.body;
    const userId = req.user.id;

    if (!type || !prompt) {
      return res.status(400).json({ error: 'Type and prompt are required' });
    }

    // Get user profile to check plan access
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    // Check if user has access to Creative AI
    if (userProfile?.plan === 'gratuito') {
      return res.status(403).json({ 
        error: 'Creative AI requires Engajado or Premium plan'
      });
    }

    // Check usage limits
    const today = new Date().toISOString().split('T')[0];
    const { count: todayUsage } = await supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    const limits = {
      engajado: 20,
      premium: -1, // unlimited
    };

    const userLimit = limits[userProfile?.plan] || 0;
    if (userLimit !== -1 && todayUsage >= userLimit) {
      return res.status(429).json({ 
        error: 'Daily generation limit reached',
        limit: userLimit,
        usage: todayUsage
      });
    }

    // Generate content based on type
    const generatedContent = generateCreativeContent(type, prompt, tone, length, template);

    // Save generation
    const { data: generation, error: generationError } = await supabase
      .from('ai_generations')
      .insert([
        {
          user_id: userId,
          type,
          prompt,
          tone,
          length,
          template,
          generated_content: generatedContent,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (generationError) {
      console.error('Error saving generation:', generationError);
    }

    res.json({
      content: generatedContent,
      type,
      generation_id: generation?.id,
      usage: {
        today: todayUsage + 1,
        limit: userLimit,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota duplicada removida - usando a implementação anterior com aiService

// Get generation history
router.get('/generations', authenticateUser, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    const userId = req.user.id;

    let query = supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: generations, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ generations });
  } catch (error) {
    console.error('Get generations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI usage statistics
router.get('/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Today's chat usage
    const { count: todayChats } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    // Today's generation usage
    const { count: todayGenerations } = await supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    // Total usage
    const { count: totalChats } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalGenerations } = await supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get user plan for limits
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    const chatLimits = {
      gratuito: 10,
      engajado: 50,
      premium: -1,
    };

    const generationLimits = {
      gratuito: 0,
      engajado: 20,
      premium: -1,
    };

    res.json({
      today: {
        chats: todayChats || 0,
        generations: todayGenerations || 0,
      },
      total: {
        chats: totalChats || 0,
        generations: totalGenerations || 0,
      },
      limits: {
        chats: chatLimits[userProfile?.plan] || chatLimits.gratuito,
        generations: generationLimits[userProfile?.plan] || generationLimits.gratuito,
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages from a specific conversation
router.get('/conversations/:conversationId/messages', authenticateUser, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Verificar se a conversa pertence ao usuário
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .single();

    if (!conversation || conversation.user_id !== userId) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Buscar mensagens da conversa
    const offset = (page - 1) * limit;
    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function generateConversationId() {
  return randomUUID();
}

function generateDireitaGPTResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Conservative-themed responses based on keywords
  if (lowerMessage.includes('economia') || lowerMessage.includes('econômica')) {
    return 'A economia brasileira precisa de mais liberdade econômica e menos intervenção estatal. O livre mercado é fundamental para o crescimento sustentável e a geração de empregos. Políticas que reduzam a burocracia e incentivem o empreendedorismo são essenciais.';
  }
  
  if (lowerMessage.includes('família') || lowerMessage.includes('valores')) {
    return 'A família é a base da sociedade e deve ser protegida e fortalecida. Os valores tradicionais como respeito, responsabilidade e trabalho são fundamentais para uma sociedade próspera. É importante preservar esses princípios para as futuras gerações.';
  }
  
  if (lowerMessage.includes('educação') || lowerMessage.includes('escola')) {
    return 'A educação deve focar no ensino de qualidade, com ênfase em disciplinas fundamentais como português, matemática, ciências e história. É importante que as escolas ensinem valores cívicos e preparem os jovens para serem cidadãos responsáveis e produtivos.';
  }
  
  if (lowerMessage.includes('política') || lowerMessage.includes('governo')) {
    return 'Um governo eficiente deve ser limitado, transparente e focado em suas funções essenciais: segurança, justiça e infraestrutura básica. A descentralização do poder e o fortalecimento das instituições democráticas são fundamentais para uma sociedade livre.';
  }
  
  if (lowerMessage.includes('segurança') || lowerMessage.includes('violência')) {
    return 'A segurança pública é um direito fundamental de todos os cidadãos. É necessário fortalecer as forças policiais, melhorar o sistema judiciário e garantir que as leis sejam cumpridas. A prevenção através da educação e oportunidades também é essencial.';
  }
  
  // Default response
  return 'Obrigado por sua pergunta! Como DireitaGPT, estou aqui para discutir temas importantes para o Brasil com base em princípios conservadores de liberdade, responsabilidade e valores tradicionais. Como posso ajudá-lo a entender melhor esses conceitos?';
}

function generateCreativeContent(type, prompt, tone, length, template) {
  const toneAdjectives = {
    formal: 'respeitoso e profissional',
    casual: 'descontraído e acessível',
    inspirational: 'motivador e inspirador',
    humorous: 'bem-humorado e cativante'
  };

  const lengthWords = {
    short: '50-100 palavras',
    medium: '150-300 palavras',
    long: '400-600 palavras'
  };

  switch (type) {
    case 'social_post':
      return `🇧🇷 ${prompt}\n\nNossos valores conservadores nos guiam para um Brasil melhor! 💪\n\n#Brasil #ValoresConservadores #Patriotismo #DireitaBrasil`;
    
    case 'meme':
      return `[MEME CONCEPT]\n\nTítulo: "${prompt}"\n\nImagem sugerida: Foto do Brasil com bandeira tremulando\n\nTexto superior: "QUANDO VOCÊ DEFENDE"\nTexto inferior: "OS VALORES TRADICIONAIS BRASILEIROS"\n\nTom: ${toneAdjectives[tone] || 'inspirador'}`;
    
    case 'video_script':
      return `ROTEIRO DE VÍDEO\n\nTema: ${prompt}\n\nDuração estimada: ${length === 'short' ? '30-60 segundos' : length === 'medium' ? '2-3 minutos' : '5-8 minutos'}\n\nINTRODUÇÃO:\n"Olá, patriotas! Hoje vamos falar sobre ${prompt}..."\n\nDESENVOLVIMENTO:\n- Contextualização do tema\n- Apresentação dos valores conservadores relacionados\n- Exemplos práticos\n\nCONCLUSÃO:\n"Juntos, podemos construir um Brasil melhor baseado em nossos valores tradicionais!"\n\nTom: ${toneAdjectives[tone] || 'inspirador'}`;
    
    case 'speech':
      return `DISCURSO: ${prompt}\n\n"Caros brasileiros,\n\nEstamos aqui reunidos porque acreditamos em um Brasil forte, próspero e baseado em valores sólidos. ${prompt} representa tudo aquilo que defendemos: família, trabalho, fé e pátria.\n\nNosso país tem um potencial imenso, mas precisamos de liderança que respeite nossas tradições e promova a liberdade responsável. Cada um de nós tem o dever de contribuir para essa transformação.\n\nJuntos, com determinação e fé, construiremos o Brasil que nossos filhos merecem!\n\nViva o Brasil!"\n\nTom: ${toneAdjectives[tone] || 'inspirador'}\nExtensão: ${lengthWords[length] || 'média'}`;
    
    default:
      return `Conteúdo gerado para: ${prompt}\n\nTipo: ${type}\nTom: ${toneAdjectives[tone] || 'neutro'}\nTamanho: ${lengthWords[length] || 'médio'}\n\nEste conteúdo foi criado com base nos valores conservadores brasileiros, promovendo família, trabalho, fé e pátria.`;
  }
}

module.exports = router;