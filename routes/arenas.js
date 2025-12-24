const express = require('express');
const router = express.Router();
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

// Middleware para verificar permissão de admin/moderador
const checkModPermission = async (req, res, next) => {
  if (!req.user || !['admin', 'moderator', 'journalist'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
  }
  next();
};

const checkAdminPermission = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// --- ARENAS ---

// Listar Arenas (Público)
router.get('/', async (req, res) => {
  try {
    const { status, politician_id } = req.query;
    
    let query = supabase
      .from('arenas')
      .select('*, politicians(name, photo_url, party)');
    
    if (status) {
      query = query.eq('status', status);
    } else {
      // Por padrão, mostrar scheduled e live, a menos que politician_id seja fornecido
      if (!politician_id) {
        query = query.in('status', ['scheduled', 'live', 'ended']);
      }
    }

    if (politician_id) {
      query = query.eq('politician_id', politician_id);
    }

    query = query.order('scheduled_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao listar arenas:', error);
    res.status(500).json({ error: 'Erro ao buscar arenas' });
  }
});

// Detalhes da Arena
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('arenas')
      .select('*, politicians(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Arena não encontrada' });

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar arena:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da arena' });
  }
});

// Criar Arena (Admin)
router.post('/', authenticateUser, checkAdminPermission, async (req, res) => {
  try {
    const { title, description, politician_id, scheduled_at, duration_minutes, rules, superchat_config } = req.body;

    const { data, error } = await adminSupabase
      .from('arenas')
      .insert({
        title,
        description,
        politician_id,
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        rules,
        superchat_config,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar arena:', error);
    res.status(500).json({ error: 'Erro ao criar arena' });
  }
});

// Atualizar Arena (Admin)
router.put('/:id', authenticateUser, checkAdminPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar status anterior para pontuação
    let statusChangedToEnded = false;
    if (updates.status === 'ended') {
      const { data: currentArena } = await supabase.from('arenas').select('status, politician_id').eq('id', id).single();
      if (currentArena && currentArena.status !== 'ended') {
        statusChangedToEnded = true;
      }
    }

    // Evitar atualização de campos sensíveis ou imutáveis se necessário
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await adminSupabase
      .from('arenas')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Se a arena foi encerrada, pontuar participação (+50)
    if (statusChangedToEnded && data) {
       await adminSupabase.from('politician_points').insert({
          politician_id: data.politician_id,
          points: 50,
          reason: 'arena_participation',
          reference_id: id
       });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar arena:', error);
    res.status(500).json({ error: 'Erro ao atualizar arena' });
  }
});

// --- PERGUNTAS ---

// Listar Perguntas de uma Arena
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sort } = req.query; // sort: recent, popular

    let query = supabase
      .from('arena_questions')
      .select('*, users(full_name, avatar_url, role)')
      .eq('arena_id', id);

    if (status) {
      query = query.eq('status', status);
    } else {
      // Por padrão não mostrar removidas/ignoradas para o público geral, a menos que seja mod
      // Mas aqui vamos filtrar no frontend ou assumir que 'pending', 'approved', 'answered' são públicas
      query = query.in('status', ['pending', 'approved', 'answered']);
    }

    if (sort === 'popular') {
      query = query.order('priority_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Verificar votos do usuário atual se autenticado (opcional, complexo para fazer em uma query só)
    // Frontend pode buscar votos separadamente

    res.json(data);
  } catch (error) {
    console.error('Erro ao listar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

// Enviar Pergunta
router.post('/:id/questions', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type, amount } = req.body;
    const userId = req.user.id; // ID da tabela users obtido pelo middleware

    // Validações básicas
    if (!content) return res.status(400).json({ error: 'Conteúdo obrigatório' });

    // Se for SuperChat, verificar pagamento (simulado aqui, idealmente validaria transaction_id)
    // TODO: Integrar com sistema de pagamentos real para validar o amount

    const initialStatus = 'pending';
    
    // Calcular prioridade inicial
    let priorityScore = 0;
    if (type === 'superchat' && amount) {
      priorityScore = amount * 2; // Exemplo de lógica
    }

    const { data, error } = await adminSupabase
      .from('arena_questions')
      .insert({
        arena_id: id,
        user_id: userId,
        content,
        type: type || 'normal',
        amount: amount || 0,
        status: initialStatus,
        priority_score: priorityScore
      })
      .select('*, users(full_name, avatar_url)')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao enviar pergunta:', error);
    res.status(500).json({ error: 'Erro ao enviar pergunta' });
  }
});

// Moderar Pergunta (Mod/Admin)
router.put('/questions/:id/status', authenticateUser, checkModPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_answered } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (is_answered !== undefined) updates.is_answered = is_answered;

    const { data, error } = await adminSupabase
      .from('arena_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Se foi respondida, pontuar o político
    if (is_answered === true) {
        // Buscar arena para pegar o politician_id
        const { data: question } = await supabase.from('arena_questions').select('arena_id').eq('id', id).single();
        if (question) {
            const { data: arena } = await supabase.from('arenas').select('politician_id').eq('id', question.arena_id).single();
            if (arena) {
                // Dar pontos ao político
                await adminSupabase.from('politician_points').insert({
                    politician_id: arena.politician_id,
                    points: 10,
                    reason: 'answered_question',
                    reference_id: id
                });
            }
        }
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao moderar pergunta:', error);
    res.status(500).json({ error: 'Erro ao moderar pergunta' });
  }
});

// Votar em Pergunta
router.post('/questions/:id/vote', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Definir peso do voto baseado no plano do usuário
    let weight = 1;
    if (req.user.plan === 'premium') weight = 2;
    if (req.user.plan === 'elite') weight = 3;

    // Verificar se já votou
    const { data: existingVote } = await supabase
      .from('arena_votes')
      .select('*')
      .eq('question_id', id)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      return res.status(400).json({ error: 'Você já votou nesta pergunta' });
    }

    // Inserir voto
    const { error } = await adminSupabase
      .from('arena_votes')
      .insert({
        question_id: id,
        user_id: userId,
        weight
      });

    if (error) throw error;

    // Trigger no banco deve atualizar o priority_score, mas se não tiver trigger:
    // Calcular novo score e atualizar manualmente (fallback)
    /*
    const { count } = await supabase.from('arena_votes').select('*', { count: 'exact' }).eq('question_id', id);
    await adminSupabase.from('arena_questions').update({ priority_score: count }).eq('id', id);
    */

    res.json({ success: true, message: 'Voto computado' });
  } catch (error) {
    console.error('Erro ao votar:', error);
    res.status(500).json({ error: 'Erro ao computar voto' });
  }
});

// --- CHAT ---

// Listar mensagens do chat
router.get('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('arena_chat_messages')
      .select('*, users(full_name, avatar_url, role)')
      .eq('arena_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Retorna invertido para exibir corretamente no frontend (mais antigas no topo se for append, mas geralmente chat pega as ultimas)
    res.json(data.reverse());
  } catch (error) {
    console.error('Erro ao buscar chat:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Enviar mensagem no chat
router.post('/:id/chat', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ error: 'Conteúdo obrigatório' });

    const { data, error } = await adminSupabase
      .from('arena_chat_messages')
      .insert({
        arena_id: id,
        user_id: userId,
        content
      })
      .select('*, users(full_name, avatar_url, role)')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

module.exports = router;

// --- PARTICIPANTS ---

// List Participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('arena_participants')
      .select('*, users(id, full_name, avatar_url, role)')
      .eq('arena_id', id);

    if (error) {
        // Se a tabela nao existir ainda, retorna vazio
        if (error.code === '42P01') return res.json([]);
        throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Error fetching participants' });
  }
});

// Invite User (Admin/Host)
router.post('/:id/invite', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;
    
    // Check permission (User must be admin or the politician of the arena)
    if (req.user.role !== 'admin' && req.user.role !== 'politician') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    const { data, error } = await adminSupabase
      .from('arena_participants')
      .insert({
        arena_id: id,
        user_id,
        role: role || 'guest',
        status: 'invited'
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Error inviting user' });
  }
});

// Update Status (Accept/Reject)
router.put('/:id/invite/status', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'rejected'

        const { data, error } = await adminSupabase
            .from('arena_participants')
            .update({ status })
            .eq('arena_id', id)
            .eq('user_id', req.user.id)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating invite:', error);
        res.status(500).json({ error: 'Error updating invite' });
    }
});

// Search Users for Invite (Helper route)
router.get('/users/search', authenticateUser, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, role, email')
            .ilike('full_name', `%${q}%`)
            .limit(10);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Error searching users' });
    }
});

module.exports = router;

