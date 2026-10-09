const { supabase, adminSupabase } = require('../config/supabase');

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

// Limites por plano
const PLAN_LIMITS = {
  gratuito: -1, // ilimitado para chat básico
  patriota: -1,
  cidadao: -1,
  engajado: -1,
  premium: -1,
  pro: -1,
  elite: -1,
  vip: -1,
  lider: -1
};

// Verificar limites de uso do usuário
async function checkUserLimits(userId, userPlan = 'gratuito') {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Contar conversas de hoje
    // Usando adminSupabase para contornar políticas RLS
    const { count: todayUsage, error } = await adminSupabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    if (error) {
      console.error('Error checking user limits:', error);
      return {
        canUse: false,
        used: 0,
        limit: 0,
        remaining: 0
      };
    }

    const limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.gratuito;
    const used = todayUsage || 0;
    
    // Se o limite é -1, significa ilimitado
    if (limit === -1) {
      return {
        canUse: true,
        used,
        limit: -1,
        remaining: -1 // -1 indica ilimitado
      };
    }
    
    const remaining = Math.max(0, limit - used);
    const canUse = used < limit;

    return {
      canUse,
      used,
      limit,
      remaining
    };
  } catch (error) {
    console.error('Error in checkUserLimits:', error);
    return {
      canUse: false,
      used: 0,
      limit: 0,
      remaining: 0
    };
  }
}

// Lista de modelos gratuitos da OpenRouter para fallback inteligente
const OPENROUTER_MODELS = [
  'anthropic/claude-haiku-5.5',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'thinkingmachines/inkling:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-26b-a4b-it:free',
  'thinkingmachines/inkling-small:free',
  'nvidia/nemotron-3.5-lightning:free'
];

// Função para chamar OpenRouter com modelo específico
const DEFAULT_MAX_TOKENS = 500;
const FAKE_NEWS_MAX_TOKENS = 2000;

async function callOpenRouterModel(message, systemPrompt, model, maxTokens = DEFAULT_MAX_TOKENS) {
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
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: maxTokens,
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
      finishReason: data.choices[0]?.finish_reason,
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
async function callTogetherAPI(message, systemPrompt, maxTokens = DEFAULT_MAX_TOKENS) {
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
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: maxTokens,
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
    finishReason: data.choices[0]?.finish_reason,
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    provider: 'together',
    cost: 0
  };
}

// Sistema de dispatcher inteligente que tenta múltiplas LLMs
async function smartDispatcher(message, systemPrompt, maxTokens = DEFAULT_MAX_TOKENS) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  
  // Se Claude falhou ou não há chave OpenRouter, tenta modelos gratuitos da OpenRouter
  if (openRouterKey) {
    console.log('💡 Tentando modelos da OpenRouter...');
    
    for (const model of OPENROUTER_MODELS) {
      try {
        console.log(`🔄 Tentando ${model}...`);
        const result = await callOpenRouterModel(message, systemPrompt, model, maxTokens);
        console.log(`✅ ${model} funcionou!`);
        return result;
      } catch (modelError) {
        console.log(`❌ ${model} falhou:`, modelError.message);
        continue; // Tenta o próximo modelo
      }
    }
    
    console.log('⚠️ Todos os modelos da OpenRouter falharam');
  }
  
  // Se OpenRouter falhou completamente, tenta Together.ai como último recurso
  if (togetherKey) {
    try {
      console.log('🔄 Tentando Together.ai como fallback final...');
      const result = await callTogetherAPI(message, systemPrompt, maxTokens);
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
    // Usando adminSupabase para contornar políticas RLS
    const { error: conversationError } = await adminSupabase
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
      console.log('✅ Conversa salva com sucesso em ai_conversations');
    }

    // Tentar salvar na nova estrutura (v2) para compatibilidade futura
    try {
      // 1. Garantir que a conversa existe na tabela pai (ai_conversations_v2)
      const { data: existingConv } = await adminSupabase
        .from('ai_conversations_v2')
        .select('id')
        .eq('id', conversationId)
        .single();

      if (!existingConv) {
        // Criar nova conversa v2
        await adminSupabase.from('ai_conversations_v2').insert({
          id: conversationId,
          user_id: userId,
          title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
          updated_at: new Date().toISOString()
        });
      } else {
        // Atualizar timestamp
        await adminSupabase.from('ai_conversations_v2')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

      // 2. Salvar mensagens individuais em ai_messages
      const { error: messagesError } = await adminSupabase
        .from('ai_messages')
        .insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: userMessage
          },
          {
            conversation_id: conversationId,
            role: 'assistant',
            content: aiResponse
          }
        ]);

      if (messagesError) {
        console.error('⚠️ Erro ao salvar mensagens em ai_messages:', messagesError);
      } else {
        console.log('✅ Mensagens salvas com sucesso em ai_messages (v2)');
      }
    } catch (v2Error) {
      console.error('⚠️ Erro no fluxo v2 de salvamento:', v2Error);
      // Não falhar o request se o fluxo v2 der erro, pois o v1 já salvou
    }

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
    // Usando adminSupabase para contornar políticas RLS
    const { data: conversations, error } = await adminSupabase
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

    // Agrupar por conversation_id e criar resumo de cada conversa
    const conversationGroups = {};
    conversations?.forEach(conv => {
      const convId = conv.conversation_id;
      if (!conversationGroups[convId]) {
        conversationGroups[convId] = {
          id: convId,
          conversation_id: convId,
          title: conv.message?.substring(0, 50) + '...' || 'Conversa sem título',
          created_at: conv.created_at,
          updated_at: conv.created_at,
          message_count: 0,
          last_message_preview: '',
          archived: false
        };
      }
      conversationGroups[convId].message_count += 2; // pergunta + resposta
      conversationGroups[convId].last_message_preview = conv.response?.substring(0, 100) || '';
      // Atualizar com a data mais recente
      if (new Date(conv.created_at) > new Date(conversationGroups[convId].updated_at)) {
        conversationGroups[convId].updated_at = conv.created_at;
      }
    });

    const formattedConversations = Object.values(conversationGroups);

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

// Buscar conversa específica
async function getConversation(userId, conversationId) {
  try {
    const { data: conversations, error } = await adminSupabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation:', error);
      return {
        success: false,
        error: error.message
      };
    }

    if (!conversations || conversations.length === 0) {
      return {
        success: false,
        error: 'Conversation not found'
      };
    }

    // Formatar conversa com metadados
    const firstMessage = conversations[0];
    const conversation = {
      id: conversationId,
      conversation_id: conversationId,
      title: firstMessage.message?.substring(0, 50) + '...' || 'Conversa sem título',
      created_at: firstMessage.created_at,
      updated_at: conversations[conversations.length - 1].created_at,
      message_count: conversations.length * 2,
      archived: false
    };

    return {
      success: true,
      data: conversation
    };
  } catch (error) {
    console.error('Error in getConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Criar nova conversa
async function createConversation(userId, title = null) {
  try {
    const conversationId = require('crypto').randomUUID();
    const now = new Date().toISOString();

    const conversation = {
      id: conversationId,
      conversation_id: conversationId,
      title: title || 'Nova Conversa',
      created_at: now,
      updated_at: now,
      message_count: 0,
      archived: false
    };

    return {
      success: true,
      data: conversation
    };
  } catch (error) {
    console.error('Error in createConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Atualizar conversa
async function updateConversation(userId, conversationId, updates) {
  try {
    // Para esta implementação simples, apenas retornamos sucesso
    // Em uma implementação completa, você salvaria os metadados em uma tabela separada
    console.log(`Updating conversation ${conversationId} for user ${userId}:`, updates);

    return {
      success: true,
      data: {
        id: conversationId,
        conversation_id: conversationId,
        ...updates,
        updated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error in updateConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Deletar conversa
async function deleteConversation(userId, conversationId) {
  try {
    const { error } = await adminSupabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Buscar mensagens de uma conversa
async function getConversationMessages(userId, conversationId) {
  try {
    const { data: conversations, error } = await adminSupabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Transformar em formato de mensagens
    const messages = [];
    conversations?.forEach(conv => {
      // Mensagem do usuário
      messages.push({
        id: `${conv.id}_user`,
        type: 'user',
        content: conv.message,
        timestamp: conv.created_at
      });
      // Resposta da IA
      messages.push({
        id: `${conv.id}_ai`,
        type: 'bot',
        content: conv.response,
        timestamp: conv.created_at,
        model: conv.model_used,
        provider: conv.provider_used,
        tokens_used: conv.tokens_used
      });
    });

    return {
      success: true,
      data: messages
    };
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
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
    const result = await smartDispatcher(finalPrompt, 'Você é um especialista em verificação de fatos. Analise o conteúdo fornecido e responda no formato JSON solicitado.', FAKE_NEWS_MAX_TOKENS);
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
      console.warn('Erro ao fazer parse do JSON, usando fallback:', parseError.message, {
        model: result.model,
        finishReason: result.finishReason,
        content: result.content
      });
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

// Gerar conteúdo criativo usando LLM real
async function generateCreativeContent(type, prompt, tone, length) {
  try {
    // Mapear tipos para descrições mais claras
    const typeDescriptions = {
      'social_post': 'post para redes sociais',
      'meme': 'conceito de meme',
      'video_script': 'roteiro de vídeo',
      'speech': 'discurso',
      'article': 'artigo',
      'video': 'roteiro de vídeo'
    };

    // Mapear tons para instruções
    const toneInstructions = {
      'profissional': 'tom profissional, respeitoso e formal',
      'inspirador': 'tom inspirador, motivacional e patriótico',
      'educativo': 'tom educativo, didático e informativo',
      'combativo': 'tom firme, determinado e assertivo',
      'familiar': 'tom caloroso, próximo e acolhedor',
      'formal': 'tom formal e respeitoso',
      'casual': 'tom descontraído e acessível',
      'inspirational': 'tom inspirador e motivacional',
      'humorous': 'tom bem-humorado e cativante'
    };

    // Mapear tamanhos para instruções
    const lengthInstructions = {
      'curto': 'formato curto (50-100 palavras ou 1-2 parágrafos)',
      'medio': 'formato médio (150-300 palavras ou 3-4 parágrafos)',
      'longo': 'formato longo (400-600 palavras ou 5+ parágrafos)',
      'short': 'formato curto (50-100 palavras)',
      'medium': 'formato médio (150-300 palavras)',
      'long': 'formato longo (400-600 palavras)'
    };

    const contentType = typeDescriptions[type] || 'conteúdo';
    const toneInstruction = toneInstructions[tone] || 'tom neutro';
    const lengthInstruction = lengthInstructions[length] || 'formato médio';

    // Criar prompt específico para cada tipo de conteúdo
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'social_post':
        systemPrompt = `Você é um especialista em criação de conteúdo para redes sociais com foco em valores conservadores e patrióticos brasileiros. Crie posts engajantes que promovam valores como família, trabalho, fé e pátria.`;
        userPrompt = `Crie um ${contentType} sobre "${prompt}" com ${toneInstruction} e ${lengthInstruction}. Inclua hashtags relevantes e emojis apropriados. O conteúdo deve ser autêntico e engajante.`;
        break;

      case 'meme':
        systemPrompt = `Você é um criador de conceitos de memes com foco em valores conservadores brasileiros. Crie conceitos criativos e respeitosos que transmitam mensagens positivas.`;
        userPrompt = `Crie um conceito de meme sobre "${prompt}" com ${toneInstruction}. Descreva a imagem sugerida, o texto superior e inferior, e o estilo visual. O meme deve ser criativo e respeitoso.`;
        break;

      case 'video_script':
      case 'video':
        systemPrompt = `Você é um roteirista especializado em conteúdo educativo e inspirador com valores conservadores brasileiros. Crie roteiros estruturados e envolventes.`;
        userPrompt = `Crie um roteiro de vídeo sobre "${prompt}" com ${toneInstruction} e ${lengthInstruction}. Inclua introdução, desenvolvimento e conclusão. Adicione dicas de produção e sugestões visuais.`;
        break;

      case 'speech':
        systemPrompt = `Você é um especialista em oratória e discursos com foco em valores conservadores e patrióticos brasileiros. Crie discursos inspiradores e bem estruturados.`;
        userPrompt = `Crie um discurso sobre "${prompt}" com ${toneInstruction} e ${lengthInstruction}. Inclua abertura impactante, desenvolvimento consistente e fechamento memorável. Adicione orientações para apresentação.`;
        break;

      case 'article':
        systemPrompt = `Você é um jornalista e escritor especializado em conteúdo conservador brasileiro. Crie artigos informativos e bem fundamentados.`;
        userPrompt = `Escreva um artigo sobre "${prompt}" com ${toneInstruction} e ${lengthInstruction}. Inclua introdução, desenvolvimento com argumentos sólidos e conclusão. O artigo deve ser informativo e bem estruturado.`;
        break;

      default:
        systemPrompt = `Você é um criador de conteúdo especializado em valores conservadores brasileiros.`;
        userPrompt = `Crie conteúdo sobre "${prompt}" com ${toneInstruction} e ${lengthInstruction}.`;
    }

    // Usar o sistema de IA existente para gerar o conteúdo
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const aiResult = await generateResponse(fullPrompt);

    if (!aiResult.success) {
      throw new Error(`Falha ao gerar conteúdo: ${aiResult.error}`);
    }

    return {
      success: true,
      content: aiResult.content,
      model: aiResult.model,
      provider: aiResult.provider,
      tokensUsed: aiResult.tokensUsed
    };

  } catch (error) {
    console.error('Erro na geração de conteúdo criativo:', error);
    return {
      success: false,
      error: error.message,
      content: null
    };
  }
}

module.exports = {
  checkUserLimits,
  generateResponse,
  saveConversation,
  getUserConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getConversationMessages,
  smartDispatcher,
  OPENROUTER_MODELS,
  analyzeFakeNews,
  generateCreativeContent
};