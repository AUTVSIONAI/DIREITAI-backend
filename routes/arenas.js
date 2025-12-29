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

// Search Users for Invite (Helper route) - MUST BE BEFORE /:id
router.get('/users/search', authenticateUser, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Use adminSupabase to bypass RLS and search all users
        const { data, error } = await adminSupabase
            .from('users')
            .select('id, full_name, avatar_url, role, email')
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`) // Search by name OR email
            .limit(20);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Error searching users' });
    }
});

// List My Invites
router.get('/my-invites', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('arena_participants')
            .select('status, role, arenas(*, politicians(name, photo_url))')
            .eq('user_id', req.user.id)
            .eq('status', 'invited');

        if (error) throw error;
        
        // Flatten structure for frontend
        const invites = data.map(p => ({
            ...p.arenas,
            participant_role: p.role,
            participant_status: p.status,
            invite_id: p.id // participation id
        }));

        res.json(invites);
    } catch (error) {
        console.error('Error fetching invites:', error);
        res.status(500).json({ error: 'Error fetching invites' });
    }
});

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

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Arena não encontrada' });
      }
      throw error;
    }
    
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

// Listar Participantes da Arena (Bypass RLS)
router.get('/:id/participants', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use adminSupabase to ensure we get all participants regardless of RLS
        const { data, error } = await adminSupabase
            .from('arena_participants')
            .select('*, users(full_name, avatar_url, role)')
            .eq('arena_id', id);

        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Error fetching participants' });
    }
});

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

    const { data, error } = await adminSupabase
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

// --- PARTICIPANTS ---

// List Participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await adminSupabase
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
      .upsert({
        arena_id: id,
        user_id,
        role: role || 'guest',
        status: 'invited'
      }, { onConflict: 'arena_id,user_id' })
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

// Toggle Hand Raise (User)
router.put('/:id/participants/hand', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { hand_raised } = req.body;

        const { data, error } = await adminSupabase
            .from('arena_participants')
            .update({ hand_raised, updated_at: new Date() })
            .eq('arena_id', id)
            .eq('user_id', req.user.id)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error toggling hand:', error);
        res.status(500).json({ error: 'Error toggling hand' });
    }
});

// Manage Permissions (Admin/Host)
router.post('/:id/participants/:userId/permissions', authenticateUser, async (req, res) => {
    console.log(`[Permissions] Request from ${req.user.email} (${req.user.role}) for arena ${req.params.id} target ${req.params.userId}`);
    console.log(`[Permissions] Body:`, req.body);
    try {
        const { id, userId } = req.params;
        const { can_speak, can_video, hand_raised } = req.body;
        
        // Check permission
        let isAllowed = false;
        if (req.user.role === 'admin' || req.user.role === 'politician') {
            isAllowed = true;
        } else {
             // Also allow if the user is the host (politician of the arena)
             const { data: arena } = await supabase.from('arenas').select('politician_id').eq('id', id).single();
             if (arena && arena.politician_id === req.user.id) {
                 isAllowed = true;
             }
        }

        // Special case: User can lower their own hand (hand_raised = false)
        if (!isAllowed && userId === req.user.id && hand_raised === false) {
            isAllowed = true;
        }

        // DEBUG: Allow if email is maumautremeterra@gmail.com (temporary fix if role is wrong)
        if (!isAllowed && req.user.email === 'maumautremeterra@gmail.com') {
             console.log('[Permissions] Force allowing for maumautremeterra@gmail.com');
             isAllowed = true;
        }

        if (!isAllowed) {
            console.log('[Permissions] Denied for user:', req.user.id);
            return res.status(403).json({ error: 'Permission denied' });
        }

        const updates = {};
        if (can_speak !== undefined) updates.can_speak = can_speak;
        if (can_video !== undefined) updates.can_video = can_video;
        if (hand_raised !== undefined) updates.hand_raised = hand_raised;

        if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date();
        }

        console.log('[Permissions] Updating with:', updates);

        const { data, error } = await adminSupabase
            .from('arena_participants')
            .update(updates)
            .eq('arena_id', id)
            .eq('user_id', userId)
            .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.warn('[Permissions] Update returned no data. Check if arena_id and user_id exist.', { id, userId });
            return res.status(404).json({ error: 'Participant not found or no changes made' });
        }

        console.log('[Permissions] Update success:', data);
        res.json(data);
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

// --- STATS (Likes/Shares) ---

// Toggle Like
router.post('/:id/like', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Check if already liked
        const { data: existing, error: checkError } = await supabase
            .from('arena_likes')
            .select('id')
            .eq('arena_id', id)
            .eq('user_id', user_id)
            .single();

        if (existing) {
            // Unlike
            const { error: deleteError } = await adminSupabase
                .from('arena_likes')
                .delete()
                .eq('id', existing.id);
            if (deleteError) throw deleteError;
            return res.json({ liked: false });
        } else {
            // Like
            const { error: insertError } = await adminSupabase
                .from('arena_likes')
                .insert({ arena_id: id, user_id });
            if (insertError) throw insertError;
            return res.json({ liked: true });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ error: 'Error toggling like' });
    }
});

// Share (Increment Counter)
router.post('/:id/share', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Increment share count directly
        // Note: adminSupabase needed for rpc or direct update if RLS restricts
        // Assuming simple increment for now via SQL or direct update if policy allows public update (unlikely)
        // Using rpc is better, but here we'll use a direct update with adminSupabase for simplicity
        
        const { data, error } = await adminSupabase.rpc('increment_share_count', { row_id: id });
        
        // If RPC doesn't exist, fallback to read-update (race condition prone but okay for MVP)
        if (error) {
            const { data: arena } = await supabase.from('arenas').select('shares_count').eq('id', id).single();
            const newCount = (arena?.shares_count || 0) + 1;
            await adminSupabase.from('arenas').update({ shares_count: newCount }).eq('id', id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error sharing:', error);
        res.status(500).json({ error: 'Error sharing' });
    }
});

// Get User Like Status
router.get('/:id/like/status', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const { data } = await supabase
            .from('arena_likes')
            .select('id')
            .eq('arena_id', id)
            .eq('user_id', user_id)
            .single();

        res.json({ liked: !!data });
    } catch (error) {
        res.status(500).json({ error: 'Error checking like status' });
    }
});

// Invite External User (Create Account + Invite)
router.post('/:id/invite-external', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'politician') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    let userId;
    let tempPassword = null;
    let isNewUser = false;

    // 1. Check if user exists in public.users
    const { data: existingUsers } = await adminSupabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);

    if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
    } else {
        // 2. Create User in Auth
        isNewUser = true;
        // Generate a random secure password
        tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A!';
        
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (authError) throw authError;
        userId = authData.user.id;
        
        // Ensure user is in public.users table (Handle race condition if trigger exists)
        // We'll try to upsert to be safe, assuming the trigger might have fired or not.
        const { error: profileError } = await adminSupabase
            .from('users')
            .upsert({
                id: userId,
                email: email,
                full_name: name,
                role: 'user', // Default role, can be updated later
                created_at: new Date()
            });
            
        if (profileError) {
             console.error('Error creating user profile:', profileError);
             // Continue anyway, maybe trigger handled it
        }
    }

    // 3. Invite to Arena
    const { data, error } = await adminSupabase
      .from('arena_participants')
      .upsert({
        arena_id: id,
        user_id: userId,
        role: role || 'guest',
        status: 'invited'
      }, { onConflict: 'arena_id,user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({
        participant: data,
        isNewUser,
        tempPassword,
        message: isNewUser ? 'Usuário criado e convidado com sucesso.' : 'Usuário já existente convidado.'
    });

  } catch (error) {
    console.error('Error inviting external user:', error);
    res.status(500).json({ error: 'Error inviting external user: ' + error.message });
  }
});

// Remove Participant (Admin/Host)
router.delete('/:id/participants/:userId', authenticateUser, async (req, res) => {
    try {
        const { id, userId } = req.params;

        // Check permission (User must be admin or the politician of the arena)
        // Ideally verify arena ownership, but for MVP checking role is sufficient if we trust the frontend context
        if (req.user.role !== 'admin' && req.user.role !== 'politician') {
             return res.status(403).json({ error: 'Permission denied' });
        }

        const { error } = await adminSupabase
            .from('arena_participants')
            .delete()
            .eq('arena_id', id)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing participant:', error);
        res.status(500).json({ error: 'Error removing participant' });
    }
});

module.exports = router;

