const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Listar agentes
router.get('/', async (req, res) => {
  try {
    const { politician_id, is_active } = req.query;
    
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
          photo_url
        )
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (politician_id) {
      query = query.eq('politician_id', politician_id);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('Erro ao buscar agentes:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Erro na listagem de agentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar agente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: agent, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error || !agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Erro ao buscar agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar agente (apenas admin)
router.post('/', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar agentes.' });
    }

    const {
      politician_id,
      trained_prompt,
      voice_id,
      personality_config
    } = req.body;

    if (!politician_id || !trained_prompt) {
      return res.status(400).json({ error: 'ID do político e prompt são obrigatórios' });
    }

    // Verificar se o político existe
    const { data: politician, error: politicianError } = await supabase
      .from('politicians')
      .select('id')
      .eq('id', politician_id)
      .eq('is_active', true)
      .single();

    if (politicianError || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    const { data: agent, error } = await supabase
      .from('politician_agents')
      .insert({
        politician_id,
        trained_prompt,
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

    if (error) {
      console.error('Erro ao criar agente:', error);
      return res.status(500).json({ error: 'Erro ao criar agente' });
    }

    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agente criado com sucesso'
    });
  } catch (error) {
    console.error('Erro na criação de agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agente (apenas admin)
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem editar agentes.' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    const { data: agent, error } = await supabase
      .from('politician_agents')
      .update(updateData)
      .eq('id', id)
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

    if (error) {
      console.error('Erro ao atualizar agente:', error);
      return res.status(500).json({ error: 'Erro ao atualizar agente' });
    }

    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }

    res.json({
      success: true,
      data: agent,
      message: 'Agente atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro na atualização de agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agente (apenas admin)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar agentes.' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('politician_agents')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar agente:', error);
      return res.status(500).json({ error: 'Erro ao deletar agente' });
    }

    res.json({
      success: true,
      message: 'Agente removido com sucesso'
    });
  } catch (error) {
    console.error('Erro na remoção de agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Chat com agente
router.post('/:id/chat', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Buscar agente e político
    const { data: agent, error: agentError } = await supabase
      .from('politician_agents')
      .select(`
        *,
        politicians (
          name,
          position,
          state,
          party,
          government_plan,
          main_ideologies
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agente não encontrado ou inativo' });
    }

    // Gerar resposta do agente usando OpenRouter API
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    let response;

    if (!openRouterKey) {
      response = `Como ${agent.politicians.name}, ${agent.politicians.position} ${agent.politicians.state ? `de ${agent.politicians.state}` : ''}, posso dizer que: Esta é uma resposta simulada. A API de IA não está configurada no momento.`;
    } else {
      try {
        const systemPrompt = `Você é ${agent.politicians.name}, ${agent.politicians.position} ${agent.politicians.state ? `de ${agent.politicians.state}` : ''} do partido ${agent.politicians.party}.

Suas características:
- Posição política: ${agent.politicians.position}
- Estado: ${agent.politicians.state || 'Nacional'}
- Partido: ${agent.politicians.party}
- Plano de governo: ${agent.politicians.government_plan || 'Não especificado'}
- Principais ideologias: ${agent.politicians.main_ideologies || 'Conservadora'}

Responda como este político responderia, mantendo coerência com suas posições políticas e ideológicas. Seja respeitoso, político e mantenha o foco em questões relevantes para sua área de atuação.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos timeout

        const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://direitai.com',
            'X-Title': 'DireitaAI - Agentes Políticos'
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
            temperature: 0.8
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          // Usar sistema de dispatcher inteligente para múltiplas LLMs
          console.log('🚀 Iniciando sistema de dispatcher inteligente para fallback...');
          try {
            const { smartDispatcher } = require('../services/aiService');
            const result = await smartDispatcher(message, systemPrompt);
            response = result.content;
          } catch (dispatcherError) {
            console.error('Erro no dispatcher inteligente:', dispatcherError.message);
            response = `Como ${agent.politicians.name}, lamento informar que estou temporariamente indisponível devido a limitações técnicas. Nossa equipe está trabalhando para resolver isso. Tente novamente em alguns minutos.`;
          }
        } else {
          const data = await apiResponse.json();
          response = data.choices[0]?.message?.content || `Como ${agent.politicians.name}, lamento, mas não consegui processar sua mensagem no momento.`;
        }


        
      } catch (error) {
        console.error('Erro ao gerar resposta do agente:', error);
        response = `Como ${agent.politicians.name}, ${agent.politicians.position} ${agent.politicians.state ? `de ${agent.politicians.state}` : ''}, lamento informar que estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.`;
      }
    }

    // Salvar conversa no histórico (opcional)
    await supabase
      .from('agent_conversations')
      .insert({
        agent_id: id,
        user_id: req.user.id,
        user_message: message,
        agent_response: response
      });

    res.json({
      success: true,
      data: {
        message: response,
        agent: {
          id: agent.id,
          politician_name: agent.politicians.name,
          politician_position: agent.politicians.position
        }
      }
    });
  } catch (error) {
    console.error('Erro no chat com agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;