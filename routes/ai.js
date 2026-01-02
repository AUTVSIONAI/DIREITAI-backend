const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
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
    // Usar id (UUID) da tabela users para ai_conversations
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
// Rota removida - usando implementação mais completa abaixo

// Get Creative AI usage statistics
router.get('/creative-ai/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userPlan = req.user.plan || 'gratuito';
    const today = new Date().toISOString().split('T')[0];

    // Today's generation usage
    const { count: todayGenerations } = await adminSupabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    // Total generation usage
    const { count: totalGenerations } = await adminSupabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const generationLimits = {
      gratuito: 5,
      patriota: 10,
      cidadao: 20,
      engajado: 50,
      premium: 50,
      pro: 100,
      elite: 100,
      vip: -1,
      lider: -1
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

// Get specific conversation
router.get('/conversations/:conversationId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await aiService.getConversation(userId, conversationId);

    if (!result.success) {
      return res.status(404).json({ 
        error: 'Conversation not found',
        details: result.error
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation
router.post('/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const result = await aiService.createConversation(userId, title);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to create conversation',
        details: result.error
      });
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation
router.put('/conversations/:conversationId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const updates = req.body;

    const result = await aiService.updateConversation(userId, conversationId, updates);

    if (!result.success) {
      return res.status(404).json({ 
        error: 'Failed to update conversation',
        details: result.error
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete conversation
router.delete('/conversations/:conversationId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await aiService.deleteConversation(userId, conversationId);

    if (!result.success) {
      return res.status(404).json({ 
        error: 'Failed to delete conversation',
        details: result.error
      });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await aiService.getConversationMessages(userId, conversationId);

    if (!result.success) {
      return res.status(404).json({ 
        error: 'Failed to fetch messages',
        details: result.error
      });
    }

    res.json({
      messages: result.data,
      total: result.data.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Creative AI Content Generation
router.post('/creative-ai/generate', authenticateUser, async (req, res) => {
  try {
    const { prompt, template, tone, length } = req.body;
    const userId = req.user.id;

    if (!prompt || !template) {
      return res.status(400).json({ error: 'Prompt and template are required' });
    }

    // Get user profile to check plan access
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    // Check usage limits
    const today = new Date().toISOString().split('T')[0];
    const { count: todayUsage } = await adminSupabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    const limits = {
      gratuito: 5,
      patriota: 10,
      cidadao: 20,
      engajado: 50,
      premium: 50,
      pro: 100,
      elite: 100,
      vip: -1,
      lider: -1
    };

    const userLimit = limits[userProfile?.plan] || 5;
    if (userLimit !== -1 && todayUsage >= userLimit) {
      return res.status(429).json({ 
        error: 'Daily generation limit reached',
        message: 'Limite diário de gerações atingido',
        limit: userLimit,
        usage: todayUsage
      });
    }

    // Generate content using real LLM
    const aiResult = await aiService.generateCreativeContent(template, prompt, tone, length);
    
    if (!aiResult.success) {
      return res.status(500).json({ 
        error: 'Failed to generate creative content',
        message: 'Falha ao gerar conteúdo criativo',
        details: aiResult.error
      });
    }
    
    const generatedContent = aiResult.content;

    // Save generation
    // Map frontend types to database enum values
    function mapTypeToEnum(frontendType) {
      const typeMapping = {
        'social_post': 'social_post',
        'meme': 'social_post', // Memes são tratados como posts sociais
        'video_script': 'speech', // Scripts são tratados como discursos
        'speech': 'speech',
        'article': 'social_post', // Artigos são tratados como posts sociais
        'video': 'social_post' // Vídeos são tratados como posts sociais
      };
      return typeMapping[frontendType] || 'social_post';
    }

    const dbType = mapTypeToEnum(template);

    const { data: generation, error: generationError } = await adminSupabase
      .from('ai_generations')
      .insert([
        {
          user_id: userId,
          type: dbType,
          prompt,
          tone,
          length,
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
      template,
      generation_id: generation?.id,
      model: aiResult.model,
      provider: aiResult.provider,
      tokens_used: aiResult.tokensUsed,
      usage: {
        today: todayUsage + 1,
        limit: userLimit,
        remaining: userLimit - (todayUsage + 1)
      },
    });
  } catch (error) {
    console.error('Creative AI generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy route for backward compatibility
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

    // Check usage limits
    const today = new Date().toISOString().split('T')[0];
    const { count: todayUsage } = await adminSupabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    const limits = {
      gratuito: 5,
      patriota: 10,
      cidadao: 20,
      engajado: 50,
      premium: 50,
      pro: 100,
      elite: 100,
      vip: -1,
      lider: -1
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

    // Map frontend types to database enum values
    function mapTypeToEnum(frontendType) {
      const typeMapping = {
        'social_post': 'social_post',
        'meme': 'social_post', // Memes são tratados como posts sociais
        'video_script': 'speech', // Scripts são tratados como discursos
        'speech': 'speech',
        'article': 'social_post', // Artigos são tratados como posts sociais
        'video': 'social_post' // Vídeos são tratados como posts sociais
      };
      return typeMapping[frontendType] || 'social_post';
    }

    const dbType = mapTypeToEnum(type);

    // Save generation
    const { data: generation, error: generationError } = await adminSupabase
      .from('ai_generations')
      .insert([
        {
          user_id: userId,
          type: dbType,
          prompt,
          tone,
          length,
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

    let query = adminSupabase
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
    const { count: todayGenerations } = await adminSupabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    // Total usage
    const { count: totalChats } = await adminSupabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalGenerations } = await adminSupabase
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
      cidadao: 20,
      premium: 50,
      pro: 100,
      elite: 100
    };

    const generationLimits = {
      gratuito: 5,
      cidadao: 20,
      premium: 50,
      pro: 100,
      elite: 100
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

    // Buscar conversas do usuário com o conversation_id específico
    const offset = (page - 1) * limit;
    const { data: conversations, error } = await adminSupabase
      .from('ai_conversations')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Converter conversas para formato de mensagens
    const messages = conversations.map(conv => ({
      id: conv.id,
      conversation_id: conv.conversation_id,
      message: conv.message,
      response: conv.response,
      created_at: conv.created_at,
      model_used: conv.model_used,
      provider_used: conv.provider_used,
      tokens_used: conv.tokens_used
    }));

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

// Helper functions for content generation
function generateSocialPost(prompt, tone, length, selectedTone, selectedLength) {
  let content = '';
  let hashtags = '#Brasil #ValoresConservadores #Patriotismo';
  
  if (tone === 'profissional') {
    content = `📋 ${prompt}\n\nÉ fundamental que mantenhamos nossos princípios e valores como base para um Brasil próspero e justo. A responsabilidade de cada cidadão é essencial para o progresso da nação.`;
  } else if (tone === 'inspirador') {
    content = `🇧🇷 ${prompt}\n\nNossos valores conservadores nos guiam para um Brasil melhor! Juntos, com fé e determinação, construiremos o futuro que nossos filhos merecem. 💪`;
    hashtags += ' #FéEDeterminação #FuturoMelhor';
  } else if (tone === 'educativo') {
    content = `📚 ${prompt}\n\nVamos entender a importância dos valores tradicionais na construção de uma sociedade sólida. A família, o trabalho e a fé são pilares fundamentais para o desenvolvimento nacional.`;
    hashtags += ' #Educação #ValoresTracionais';
  } else if (tone === 'combativo') {
    content = `⚔️ ${prompt}\n\nÉ hora de defender nossos valores! Não podemos permitir que ideologias destrutivas minem os fundamentos da nossa sociedade. Brasil acima de tudo!`;
    hashtags += ' #DefendaBrasil #BrasilAcimaDeTudo';
  } else if (tone === 'familiar') {
    content = `👨‍👩‍👧‍👦 ${prompt}\n\nA família é o coração da nossa sociedade. É em casa que aprendemos os valores que nos tornam cidadãos de bem. Vamos fortalecer nossos laços familiares!`;
    hashtags += ' #FamíliaForte #ValoresFamiliares';
  }
  
  return `${content}\n\n${hashtags}`;
}

function generateMemeContent(prompt, tone, length, selectedTone, selectedLength) {
  let concept = '';
  
  if (tone === 'profissional') {
    concept = `[CONCEITO DE MEME]\n\nTítulo: "${prompt}"\n\nImagem sugerida: Gráfico ou infográfico relacionado ao tema\n\nTexto: "Quando você entende que ${prompt.toLowerCase()} é fundamental para o progresso do país"\n\nEstilo: Informativo e respeitoso`;
  } else if (tone === 'inspirador') {
    concept = `[CONCEITO DE MEME]\n\nTítulo: "${prompt}"\n\nImagem sugerida: Bandeira do Brasil tremulando\n\nTexto superior: "QUANDO VOCÊ ACREDITA"\nTexto inferior: "EM ${prompt.toUpperCase()}"\n\nEstilo: Motivacional e patriótico`;
  } else {
    concept = `[CONCEITO DE MEME]\n\nTítulo: "${prompt}"\n\nImagem sugerida: Pessoa sorrindo ou gesto de aprovação\n\nTexto: "${prompt} é o caminho para um Brasil melhor"\n\nEstilo: ${selectedTone}`;
  }
  
  return concept;
}

function generateVideoScript(prompt, tone, length, selectedTone, selectedLength) {
  let duration = '';
  let intro = '';
  let development = '';
  let conclusion = '';
  
  if (length === 'curto') {
    duration = '30-60 segundos';
    intro = `"Olá! Vamos falar rapidamente sobre ${prompt}."\n[0-10s]`;
    development = `"${prompt} é essencial para nosso país porque..."\n[10-45s]\n- Ponto principal\n- Exemplo prático`;
    conclusion = `"Juntos, construímos um Brasil melhor!"\n[45-60s]`;
  } else if (length === 'medio') {
    duration = '2-3 minutos';
    intro = `"Olá, patriotas! Hoje vamos conversar sobre ${prompt}."\n[0-20s]`;
    development = `"Vamos entender por que ${prompt} é fundamental..."\n[20s-2m20s]\n- Contextualização\n- Valores conservadores relacionados\n- Exemplos práticos\n- Impacto na sociedade`;
    conclusion = `"Lembrem-se: cada um de nós faz a diferença!"\n[2m20s-3m]`;
  } else {
    duration = '5-8 minutos';
    intro = `"Caros brasileiros, hoje abordaremos um tema crucial: ${prompt}."\n[0-30s]`;
    development = `"Análise completa sobre ${prompt}..."\n[30s-7m]\n- Introdução ao tema\n- Contexto histórico\n- Valores conservadores\n- Exemplos nacionais e internacionais\n- Impacto social e econômico\n- Propostas de ação`;
    conclusion = `"Unidos pelos nossos valores, construiremos o Brasil dos nossos sonhos!"\n[7m-8m]`;
  }
  
  return `🎬 ROTEIRO DE VÍDEO\n\nTema: ${prompt}\nDuração: ${duration}\nTom: ${selectedTone}\n\n📝 ESTRUTURA:\n\nINTRODUÇÃO:\n${intro}\n\nDESENVOLVIMENTO:\n${development}\n\nCONCLUSÃO:\n${conclusion}\n\n💡 DICAS DE PRODUÇÃO:\n- Use imagens relacionadas ao tema\n- Mantenha o tom ${selectedTone}\n- Inclua call-to-action no final`;
}

function generateSpeech(prompt, tone, length, selectedTone, selectedLength) {
  let opening = '';
  let body = '';
  let closing = '';
  
  if (tone === 'profissional') {
    opening = `"Senhoras e senhores,\n\nÉ com grande satisfação que me dirijo a vocês para abordar um tema de extrema relevância: ${prompt}."\n\n`;
    body = `"${prompt} representa um dos pilares fundamentais da nossa sociedade. É através da compreensão e aplicação destes princípios que poderemos construir um Brasil mais justo, próspero e desenvolvido.\n\nNossa responsabilidade como cidadãos é clara: devemos trabalhar incansavelmente para promover estes valores em nossas comunidades, famílias e instituições."\n\n`;
    closing = `"Convido todos a refletirem sobre a importância de ${prompt} e a assumirem o compromisso de serem agentes de transformação positiva em nossa sociedade.\n\nMuito obrigado."`;
  } else if (tone === 'inspirador') {
    opening = `"Meus caros patriotas,\n\nEstamos aqui reunidos por um propósito maior: ${prompt}!"\n\n`;
    body = `"${prompt} não é apenas um conceito, é a chama que arde em nossos corações! É a força que nos move a lutar por um Brasil melhor, mais forte e mais próspero.\n\nCada um de nós tem o poder de fazer a diferença. Quando nos unimos em torno de nossos valores, somos invencíveis!"\n\n`;
    closing = `"Vamos em frente, com fé, coragem e determinação! Juntos, faremos do Brasil a grande nação que sempre sonhamos!\n\nViva o Brasil! Viva ${prompt}!"`;
  } else {
    opening = `"Caros brasileiros,\n\nReunimo-nos hoje para falar sobre ${prompt}."\n\n`;
    body = `"${prompt} é fundamental para o desenvolvimento da nossa nação. Nossos valores tradicionais - família, trabalho, fé e pátria - nos guiam nesta jornada.\n\nÉ nosso dever como cidadãos promover estes princípios e trabalhar para um futuro melhor."\n\n`;
    closing = `"Juntos, com união e determinação, construiremos o Brasil que nossos filhos merecem!\n\nObrigado."`;
  }
  
  return `🎤 DISCURSO: ${prompt}\n\nTom: ${selectedTone}\nExtensão: ${selectedLength}\n\n📝 CONTEÚDO:\n\n${opening}${body}${closing}\n\n💡 ORIENTAÇÕES:\n- Mantenha contato visual com a audiência\n- Use gestos apropriados ao tom ${selectedTone}\n- Faça pausas estratégicas para ênfase`;
}

function generateCreativeContent(type, prompt, tone, length, template) {
  const toneAdjectives = {
    profissional: 'respeitoso e profissional',
    inspirador: 'motivador e inspirador',
    educativo: 'didático e informativo',
    combativo: 'firme e determinado',
    familiar: 'caloroso e próximo',
    // Backward compatibility
    formal: 'respeitoso e profissional',
    casual: 'descontraído e acessível',
    inspirational: 'motivador e inspirador',
    humorous: 'bem-humorado e cativante'
  };

  const lengthWords = {
    curto: '1-2 parágrafos (50-100 palavras)',
    medio: '3-4 parágrafos (150-300 palavras)',
    longo: '5+ parágrafos (400-600 palavras)',
    // Backward compatibility
    short: '50-100 palavras',
    medium: '150-300 palavras',
    long: '400-600 palavras'
  };

  // Generate content based on tone and length
  const selectedTone = toneAdjectives[tone] || 'neutro';
  const selectedLength = lengthWords[length] || 'médio';
  
  switch (type) {
     case 'social_post':
       return generateSocialPost(prompt, selectedTone, selectedLength, selectedTone, selectedLength);
     case 'meme':
       return generateMemeContent(prompt, selectedTone, selectedLength, selectedTone, selectedLength);
     case 'video_script':
       return generateVideoScript(prompt, selectedTone, selectedLength, selectedTone, selectedLength);
     case 'speech':
       return generateSpeech(prompt, selectedTone, selectedLength, selectedTone, selectedLength);
     default:
       return `Conteúdo ${selectedTone} sobre ${prompt} (${selectedLength})`;
   }
}

module.exports = router;