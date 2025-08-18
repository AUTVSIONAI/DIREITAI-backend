const { supabase } = require('../config/supabase');

// Função para analisar metadados de imagem sem enviar o conteúdo completo
function analyzeImageMetadata(dataUrl) {
  try {
    // Extrair informações do data URL
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:image\/(\w+)/);
    const format = mimeMatch ? mimeMatch[1].toUpperCase() : 'UNKNOWN';
    
    // Calcular tamanho aproximado
    const sizeBytes = Math.round((base64Data.length * 3) / 4);
    const sizeKB = Math.round(sizeBytes / 1024);
    const size = sizeKB > 1024 ? `${Math.round(sizeKB / 1024)}MB` : `${sizeKB}KB`;
    
    // Verificar se contém indicadores de C2PA nos metadados
    // C2PA geralmente aparece em formatos como JPEG, PNG, WebP
    const hasC2PA = base64Data.includes('c2pa') || 
                    base64Data.includes('C2PA') || 
                    base64Data.includes('contentauthenticity') ||
                    header.includes('c2pa');
    
    return {
      format,
      size,
      hasC2PA,
      sizeBytes
    };
  } catch (error) {
    console.error('Erro ao analisar metadados da imagem:', error);
    return {
      format: 'UNKNOWN',
      size: 'UNKNOWN',
      hasC2PA: false,
      sizeBytes: 0
    };
  }
}

// Limites de uso por plano
const PLAN_LIMITS = {
  gratuito: {
    daily_fake_news_checks: 1,
    daily_ai_creative: 3,
    daily_political_agents: 1,
    daily_ai_uses: 5, // Total geral para outras funcionalidades
    monthly_ai_uses: 150,
    constitution_access: true
  },
  engajado: {
    daily_fake_news_checks: 5,
    daily_ai_creative: 20,
    daily_political_agents: 3,
    daily_ai_uses: 50,
    monthly_ai_uses: 1500,
    constitution_access: true,
    premium_models: false
  },
  lider: {
    daily_fake_news_checks: 10,
    daily_ai_creative: 50,
    daily_political_agents: -1, // Ilimitado
    daily_ai_uses: 100,
    monthly_ai_uses: 3000,
    constitution_access: true,
    premium_models: true,
    api_calls_daily: 100
  },
  supremo: {
    daily_fake_news_checks: 20,
    daily_ai_creative: -1, // Ilimitado
    daily_political_agents: -1, // Ilimitado
    daily_ai_uses: -1, // Ilimitado
    monthly_ai_uses: -1, // Ilimitado
    constitution_access: true,
    premium_models: true,
    exclusive_models: true,
    api_calls_daily: 1000,
    consultation_hours: 1
  }
};

// Preços para créditos avulsos
const CREDIT_PRICES = {
  fake_news_check: 150, // R$ 1,50 em centavos
  ai_creative_message: 50, // R$ 0,50 em centavos
  political_agent_conversation: 100 // R$ 1,00 em centavos
};

// Função para verificar limites do usuário por funcionalidade
async function checkUserLimits(userId, userPlan = 'gratuito', feature = 'ai_uses') {
  try {
    const today = new Date().toISOString().split('T')[0];
    const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.gratuito;
    
    // Mapear funcionalidades para campos de limite
    const featureMap = {
      'fake_news': 'daily_fake_news_checks',
      'ai_creative': 'daily_ai_creative', 
      'political_agents': 'daily_political_agents',
      'ai_uses': 'daily_ai_uses'
    };
    
    const limitField = featureMap[feature] || 'daily_ai_uses';
    const limit = planLimits[limitField];
    
    // Se o limite é -1, significa ilimitado
    if (limit === -1) {
      return {
        canUse: true,
        remaining: -1,
        limit: -1,
        used: 0,
        unlimited: true
      };
    }
    
    // Buscar uso do dia atual baseado na funcionalidade
    let query = supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);
    
    // Filtrar por tipo de funcionalidade se especificado
    if (feature === 'fake_news') {
      query = query.eq('conversation_type', 'fake_news_check');
    } else if (feature === 'ai_creative') {
      query = query.eq('conversation_type', 'creative_ai');
    } else if (feature === 'political_agents') {
      query = query.eq('conversation_type', 'political_agent');
    }
    
    const { data: todayUsage, error } = await query;

    if (error) {
      console.error('Erro ao verificar limites:', error);
      return { canUse: false, remaining: 0, limit: 0 };
    }

    const usedToday = todayUsage?.length || 0;
    const remaining = Math.max(0, limit - usedToday);

    return {
      canUse: remaining > 0,
      remaining,
      limit,
      used: usedToday,
      unlimited: false
    };
  } catch (error) {
    console.error('Erro ao verificar limites do usuário:', error);
    return { canUse: false, remaining: 0, limit: 0 };
  }
}

// Função para verificar créditos avulsos do usuário
async function checkUserCredits(userId, feature = 'fake_news_check') {
  try {
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('credit_type', feature)
      .gt('remaining_credits', 0)
      .order('expires_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Erro ao verificar créditos:', error);
      return { hasCredits: false, remaining: 0 };
    }

    const totalCredits = credits?.reduce((sum, credit) => sum + credit.remaining_credits, 0) || 0;
    
    return {
      hasCredits: totalCredits > 0,
      remaining: totalCredits,
      credits: credits || []
    };
  } catch (error) {
    console.error('Erro ao verificar créditos do usuário:', error);
    return { hasCredits: false, remaining: 0 };
  }
}

// Função para consumir crédito avulso
async function consumeUserCredit(userId, feature = 'fake_news_check') {
  try {
    const { data: credit, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('credit_type', feature)
      .gt('remaining_credits', 0)
      .order('expires_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !credit) {
      return { success: false, message: 'Nenhum crédito disponível' };
    }

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        remaining_credits: credit.remaining_credits - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', credit.id);

    if (updateError) {
      console.error('Erro ao consumir crédito:', updateError);
      return { success: false, message: 'Erro ao consumir crédito' };
    }

    return { 
      success: true, 
      remaining: credit.remaining_credits - 1,
      message: 'Crédito consumido com sucesso'
    };
  } catch (error) {
    console.error('Erro ao consumir crédito:', error);
    return { success: false, message: 'Erro interno' };
  }
}

// Lista de modelos gratuitos da OpenRouter para fallback inteligente
const FREE_OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwq-32b:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.5-pro-exp-03-25:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-4-scout:free'
];

// Modelos atualizados para 2025 - para temas atuais
const UPDATED_2025_MODELS = [
  'google/gemini-2.5-pro-exp-03-25:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-4-scout:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat-v3-0324:free'
];

// Palavras-chave para detectar temas atuais
const CURRENT_TOPICS_KEYWORDS = [
  // Política atual
  '2025', '2024', 'eleições', 'governo atual', 'presidente', 'ministro', 'congresso',
  'senado', 'câmara', 'supremo', 'stf', 'política atual', 'reforma',
  // Economia atual
  'inflação', 'pix', 'real digital', 'economia brasileira', 'mercado financeiro',
  'bolsa de valores', 'dólar', 'juros', 'selic', 'copom',
  // Tecnologia atual
  'inteligência artificial', 'ia', 'chatgpt', 'meta', 'x twitter', 'tiktok',
  'regulamentação', 'marco civil', 'lgpd', 'fake news',
  // Eventos atuais
  'copa do mundo', 'olimpíadas', 'mundial', 'pandemia', 'covid',
  'clima', 'aquecimento global', 'sustentabilidade',
  // Questões sociais atuais
  'direitos humanos', 'igualdade', 'diversidade', 'inclusão',
  'violência', 'segurança pública', 'criminalidade'
];

// Palavras-chave para questões da plataforma
const PLATFORM_KEYWORDS = [
  'direitai', 'plataforma', 'como usar', 'funcionalidade', 'perfil',
  'pontos', 'ranking', 'gamificação', 'conquistas', 'badges',
  'quiz', 'verdade ou fake', 'chat', 'ia criativa', 'blog',
  'check-in', 'eventos', 'políticos', 'constituição', 'artigos',
  'ajuda', 'suporte', 'tutorial', 'guia', 'dúvida sobre o site'
];

// Modelos que suportam análise de imagem
const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.5-pro-exp-03-25:free'
];

// Função para detectar se a pergunta é sobre temas atuais
function isCurrentTopicQuery(message) {
  const messageText = typeof message === 'string' ? message.toLowerCase() : 
    (message.content ? JSON.stringify(message.content).toLowerCase() : '');
  
  // Verifica se contém palavras-chave de temas atuais
  const hasCurrentTopics = CURRENT_TOPICS_KEYWORDS.some(keyword => 
    messageText.includes(keyword.toLowerCase())
  );
  
  // Verifica se NÃO é sobre a plataforma
  const isPlatformQuery = PLATFORM_KEYWORDS.some(keyword => 
    messageText.includes(keyword.toLowerCase())
  );
  
  return hasCurrentTopics && !isPlatformQuery;
}

// Função para detectar se é pergunta sobre a plataforma
function isPlatformQuery(message) {
  const messageText = typeof message === 'string' ? message.toLowerCase() : 
    (message.content ? JSON.stringify(message.content).toLowerCase() : '');
  
  return PLATFORM_KEYWORDS.some(keyword => 
    messageText.includes(keyword.toLowerCase())
  );
}

// Função para chamar OpenRouter com modelo específico
async function callOpenRouterModel(message, systemPrompt, model) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    throw new Error('OPENROUTER_API_KEY não configurada');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://direitai.com',
        'X-Title': 'DireitaGPT - Assistente IA Conservador'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          // Se message é um objeto (para imagens), usar diretamente; senão, criar estrutura simples
          typeof message === 'object' && message.role ? message : {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Erro no modelo ${model}:`, response.status, errorData);
      throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.',
      tokensUsed: data.usage?.total_tokens || 100,
      model: model,
      provider: 'openrouter',
      cost: 0
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Função para chamar Together.ai API como fallback final
async function callTogetherAPI(message, systemPrompt) {
  const togetherKey = process.env.TOGETHER_API_KEY;
  
  if (!togetherKey) {
    throw new Error('TOGETHER_API_KEY não configurada');
  }

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${togetherKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        // Se message é um objeto (para imagens), usar diretamente; senão, criar estrutura simples
        typeof message === 'object' && message.role ? message : {
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
    console.error('Erro na Together.ai API:', response.status, errorData);
    throw new Error(`Together API Error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.',
    tokensUsed: data.usage?.total_tokens || 100,
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    provider: 'together',
    cost: 0
  };
}

// Sistema de dispatcher inteligente que tenta múltiplas LLMs
async function smartDispatcher(message, systemPrompt) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  
  // Verificar se a mensagem contém imagem
  const hasImage = typeof message === 'object' && message.content && 
    Array.isArray(message.content) && 
    message.content.some(item => item.type === 'image_url');
  
  // Para imagens, usar apenas modelos que suportam visão
  if (hasImage) {
    console.log('🖼️ Detectada imagem, usando modelos de visão...');
    
    if (openRouterKey) {
      for (const model of VISION_MODELS) {
        try {
          console.log(`🔄 Tentando modelo de visão ${model}...`);
          const result = await callOpenRouterModel(message, systemPrompt, model);
          console.log(`✅ ${model} funcionou!`);
          return result;
        } catch (modelError) {
          console.log(`❌ ${model} falhou:`, modelError.message);
          continue;
        }
      }
      console.log('⚠️ Todos os modelos de visão falharam');
    }
  } else {
    // Detectar tipo de pergunta para roteamento inteligente
    const isCurrentTopic = isCurrentTopicQuery(message);
    const isPlatform = isPlatformQuery(message);
    
    console.log(`🧠 Análise da pergunta: Tema atual: ${isCurrentTopic}, Plataforma: ${isPlatform}`);
    
    if (openRouterKey) {
      // Para temas atuais, usar modelos atualizados 2025
      if (isCurrentTopic) {
        console.log('📰 Detectado tema atual, usando modelos atualizados 2025...');
        
        for (const model of UPDATED_2025_MODELS) {
          try {
            console.log(`🔄 Tentando modelo atualizado ${model}...`);
            const result = await callOpenRouterModel(message, systemPrompt, model);
            console.log(`✅ ${model} funcionou para tema atual!`);
            return result;
          } catch (modelError) {
            console.log(`❌ ${model} falhou:`, modelError.message);
            continue;
          }
        }
        console.log('⚠️ Todos os modelos atualizados falharam, tentando Claude...');
      }
      
      // Para questões da plataforma ou fallback, usar modelos gratuitos
      if (isPlatform || isCurrentTopic) {
        console.log('🏠 Usando modelos gratuitos para questão da plataforma ou fallback...');
        
        for (const model of FREE_OPENROUTER_MODELS) {
          try {
            console.log(`🔄 Tentando modelo gratuito ${model}...`);
            const result = await callOpenRouterModel(message, systemPrompt, model);
            console.log(`✅ ${model} funcionou!`);
            return result;
          } catch (modelError) {
            console.log(`❌ ${model} falhou:`, modelError.message);
            continue;
          }
        }
        console.log('⚠️ Todos os modelos gratuitos falharam');
      } else {
        // Para outras perguntas, tentar Claude primeiro
        try {
          console.log('🎯 Tentando Claude 3.5 Sonnet...');
          const result = await callOpenRouterModel(message, systemPrompt, 'anthropic/claude-3.5-sonnet');
          console.log('✅ Claude 3.5 Sonnet funcionou!');
          return result;
        } catch (error) {
          console.log('❌ Claude 3.5 Sonnet falhou:', error.message);
          
          // Se for erro 402 (sem créditos), tenta os modelos gratuitos
          if (error.message.includes('402')) {
            console.log('💡 Tentando modelos gratuitos da OpenRouter...');
            
            for (const model of FREE_OPENROUTER_MODELS) {
              try {
                console.log(`🔄 Tentando ${model}...`);
                const result = await callOpenRouterModel(message, systemPrompt, model);
                console.log(`✅ ${model} funcionou!`);
                return result;
              } catch (modelError) {
                console.log(`❌ ${model} falhou:`, modelError.message);
                continue;
              }
            }
            
            console.log('⚠️ Todos os modelos gratuitos da OpenRouter falharam');
          }
        }
      }
    }
  }
  
  // Se OpenRouter falhou completamente, tenta Together.ai
  if (togetherKey) {
    try {
      console.log('🔄 Tentando Together.ai como fallback...');
      const result = await callTogetherAPI(message, systemPrompt);
      console.log('✅ Together.ai funcionou!');
      return result;
    } catch (error) {
      console.log('❌ Together.ai também falhou:', error.message);
    }
  }
  
  // Se tudo falhou, retorna fallback interno
  console.log('🆘 Usando fallback interno');
  throw new Error('Todos os provedores de IA falharam');
}

// Gerar resposta da IA usando sistema de dispatcher inteligente
async function generateResponse(message) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  
  if (!openRouterKey && !togetherKey) {
    console.warn('Nenhuma chave de API configurada, usando resposta de fallback');
    const fallbackResponses = [
      "Como conservador, acredito que é importante defender nossos valores tradicionais e a família como base da sociedade.",
      "O livre mercado e a iniciativa privada são fundamentais para o crescimento econômico sustentável do Brasil.",
      "A segurança pública deve ser prioridade, com fortalecimento das forças policiais e do sistema judiciário.",
      "Nossos valores cristãos e tradições brasileiras devem ser preservados e respeitados.",
      "A educação de qualidade e o empreendedorismo são chaves para o desenvolvimento nacional."
    ];
    
    return {
      success: true,
      content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      model: 'direitaGPT-fallback',
      provider: 'internal',
      tokensUsed: 50
    };
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

    console.log('🚀 Iniciando sistema de dispatcher inteligente...');
    const result = await smartDispatcher(message, systemPrompt);
    
    return {
      success: true,
      content: result.content,
      model: result.model,
      provider: result.provider,
      tokensUsed: result.tokensUsed,
      cost: result.cost || 0
    };
    
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
    
    return {
      success: true,
      content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      model: 'direitaGPT-fallback',
      provider: 'fallback',
      tokensUsed: 50
    };
  }
}

// Salvar conversa no banco de dados
async function saveConversation(userId, conversationId, userMessage, aiResponse, tokensUsed, model, provider) {
  try {
    console.log('💾 Salvando conversa no banco de dados...');
    console.log('📋 Estrutura real da tabela ai_conversations: id, user_id, conversation_id, message, response, tokens_used, created_at, model_used, provider_used');
    
    // Usar a estrutura real da tabela ai_conversations
    const { error: conversationError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        message: userMessage,
        response: aiResponse,
        tokens_used: tokensUsed || 0,
        model_used: model || 'unknown',
        provider_used: provider || 'unknown',
        created_at: new Date().toISOString()
      });

    if (conversationError) {
      console.error('Error saving conversation:', conversationError);
    } else {
      console.log('✅ Conversa salva com sucesso');
      
      // Verificar conquistas relacionadas a conversas de IA
      try {
        const { checkAndUnlockAchievements } = require('../routes/gamification');
        await checkAndUnlockAchievements(userId, 'ai_conversation', {
          conversation_id: conversationId,
          message: userMessage,
          response: aiResponse
        });
      } catch (achievementError) {
        console.error('Erro ao verificar conquistas de IA:', achievementError);
      }
    }

    // Nota: A tabela ai_messages parece não ter a estrutura esperada
    // Vamos comentar por enquanto até verificarmos a estrutura correta
    console.log('⚠️ Tabela ai_messages não tem estrutura compatível - pulando salvamento de mensagens individuais');

    return {
      success: true
    };
  } catch (error) {
    console.error('Error in saveConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Buscar conversas do usuário
async function getUserConversations(userId, limit = 50) {
  try {
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('id, conversation_id, message, response, created_at, tokens_used, model_used')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversations:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Transformar os dados para o formato esperado pelo frontend
    const formattedConversations = conversations?.map(conv => ({
      id: conv.id,
      conversation_id: conv.conversation_id,
      title: conv.message?.substring(0, 50) + '...' || 'Conversa sem título',
      created_at: conv.created_at,
      updated_at: conv.created_at,
      message_count: 2, // Sempre 2 (pergunta + resposta)
      last_message_preview: conv.response?.substring(0, 100) || ''
    })) || [];

    return {
      success: true,
      data: formattedConversations
    };
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função específica para análise de fake news
async function analyzeFakeNews(content, contentType = 'texto') {
  try {
    let analysisPrompt = '';
    
    if (contentType === 'link') {
      analysisPrompt = `Você é um especialista em verificação de fatos e detecção de fake news. 
Analise o seguinte link/URL e determine se o conteúdo é:
- VERDADE: Informação verificada e confiável
- TENDENCIOSO: Parcialmente verdadeiro mas com viés
- FAKE: Informação falsa ou enganosa

Link para análise: ${content}

Responda APENAS no seguinte formato JSON:
{
  "resultado": "verdade|tendencioso|fake",
  "confianca": 85,
  "explicacao": "Explicação detalhada da análise",
  "fontes": ["fonte1.com", "fonte2.com"]
}`;
    } else if (contentType === 'imagem' && content.startsWith('data:image/')) {
      // Para imagens, usar análise visual com IA
      console.log('🖼️ Analisando imagem com IA...');
      const imageInfo = analyzeImageMetadata(content);
      console.log('📊 Metadados da imagem:', imageInfo);
      
      analysisPrompt = `Você é um especialista em verificação de fatos e análise de imagens.
Analise esta imagem e determine se é:
- VERDADE: Imagem autêntica e não manipulada
- TENDENCIOSO: Imagem real mas usada fora de contexto ou com informações parciais
- FAKE: Imagem manipulada, gerada por IA, ou completamente falsa

Descreva detalhadamente:
1. O que você vê na imagem (pessoas, objetos, cenário, etc.)
2. Sinais de manipulação digital ou geração por IA
3. Qualidade da imagem e possíveis inconsistências
4. Contexto provável da imagem

Informações técnicas: Formato ${imageInfo.format}, Tamanho: ${imageInfo.size}${imageInfo.hasC2PA ? ', Contém metadados C2PA (indicador de autenticidade)' : ', Sem metadados C2PA'}

Responda APENAS no seguinte formato JSON:
{
  "resultado": "verdade|tendencioso|fake",
  "confianca": 85,
  "explicacao": "Descrição detalhada do que foi observado na imagem e análise de autenticidade",
  "fontes": ["fonte1.com", "fonte2.com"]
}`;
    } else {
      analysisPrompt = `Você é um especialista em verificação de fatos e detecção de fake news.
Analise o seguinte conteúdo e determine se é:
- VERDADE: Informação verificada e confiável
- TENDENCIOSO: Parcialmente verdadeiro mas com viés
- FAKE: Informação falsa ou enganosa

Conteúdo para análise:
${content}

Responda APENAS no seguinte formato JSON:
{
  "resultado": "verdade|tendencioso|fake",
  "confianca": 85,
  "explicacao": "Explicação detalhada da análise baseada em fatos verificáveis",
  "fontes": ["fonte1.com", "fonte2.com"]
}`;
    }

    console.log('🔍 Iniciando análise de fake news...');
    
    // Preparar o prompt final
    let finalPrompt = analysisPrompt;
    
    // Para imagens, incluir a imagem no prompt
    if (contentType === 'imagem' && content.startsWith('data:image/')) {
      console.log('🔄 Preparando prompt com imagem para IA...');
      finalPrompt = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: analysisPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: content
            }
          }
        ]
      };
      console.log('✅ Prompt preparado, enviando para IA...');
    }
    
    console.log('📤 Enviando para análise de IA...');
    const result = await smartDispatcher(finalPrompt, 'Você é um especialista em verificação de fatos. Analise o conteúdo fornecido e responda no formato JSON solicitado.');
    console.log('📥 Resposta da IA recebida:', result);
    console.log('✅ Análise concluída:', result);
    
    // Tentar fazer parse do JSON retornado
    let analysisResult;
    try {
      // Limpar a resposta para extrair apenas o JSON
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.warn('Erro ao fazer parse do JSON, usando fallback:', parseError.message);
      // Fallback se o JSON não for válido
      analysisResult = {
        resultado: 'tendencioso',
        confianca: 50,
        explicacao: 'Não foi possível analisar completamente o conteúdo. Recomendamos verificar com fontes adicionais.',
        fontes: ['Análise automática limitada']
      };
    }

    // Validar e normalizar o resultado
    if (!['verdade', 'tendencioso', 'fake'].includes(analysisResult.resultado)) {
      analysisResult.resultado = 'tendencioso';
    }
    
    if (!analysisResult.confianca || analysisResult.confianca < 0 || analysisResult.confianca > 100) {
      analysisResult.confianca = 50;
    }
    
    if (!analysisResult.explicacao) {
      analysisResult.explicacao = 'Análise não disponível no momento.';
    }
    
    if (!Array.isArray(analysisResult.fontes)) {
      analysisResult.fontes = ['Análise baseada em IA'];
    }

    return {
      success: true,
      ...analysisResult,
      model: result.model,
      provider: result.provider,
      tokensUsed: result.tokensUsed
    };
    
  } catch (error) {
    console.error('Erro na análise de fake news:', error);
    
    // Fallback em caso de erro
    return {
      success: false,
      resultado: 'tendencioso',
      confianca: 30,
      explicacao: 'Não foi possível analisar o conteúdo no momento. Tente novamente mais tarde ou verifique manualmente com fontes confiáveis.',
      fontes: ['Sistema temporariamente indisponível'],
      error: error.message
    };
  }
}

module.exports = {
  checkUserLimits,
  checkUserCredits,
  consumeUserCredit,
  generateResponse,
  saveConversation,
  getUserConversations,
  smartDispatcher,
  analyzeFakeNews
};