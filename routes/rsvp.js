const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();



// ===== RSVP para Eventos =====

/**
 * POST /api/rsvp/events/:eventId
 * Criar ou atualizar RSVP para um evento
 */
router.post('/events/:eventId', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, notes, notification_enabled = true } = req.body;
    const userId = req.user.auth_id; // Usar auth_id para foreign key com auth.users(id)

    // Validar se status foi enviado
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    // Validar status
    if (!['vai', 'nao_vai', 'talvez'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser: vai, nao_vai ou talvez' });
    }

    // Verificar se o evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Verificar se já existe um RSVP
    const { data: existingRsvp, error: checkError } = await supabase
      .from('event_rsvp')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    const rsvpData = {
      user_id: userId,
      event_id: eventId,
      status,
      notes: notes || null,
      notification_enabled
    };

    let result;
    if (existingRsvp) {
      // Atualizar RSVP existente
      const { data: rsvp, error: rsvpError } = await supabase
        .from('event_rsvp')
        .update(rsvpData)
        .eq('id', existingRsvp.id)
        .select()
        .single();

      if (rsvpError) {
        return res.status(400).json({ error: rsvpError.message });
      }
      result = rsvp;
    } else {
      // Criar novo RSVP
      const { data: rsvp, error: rsvpError } = await supabase
        .from('event_rsvp')
        .insert([rsvpData])
        .select()
        .single();

      if (rsvpError) {
        return res.status(400).json({ error: rsvpError.message });
      }
      result = rsvp;
    }

    res.json({
      success: true,
      message: existingRsvp ? 'RSVP atualizado com sucesso' : 'RSVP criado com sucesso',
      rsvp: result
    });
  } catch (error) {
    console.error('Erro ao criar/atualizar RSVP do evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter RSVP do usuário para um evento específico
  router.get('/events/:eventId', authenticateUser, async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.auth_id; // Usar auth_id para foreign key com auth.users(id)
      
      const { data: rsvp, error } = await supabase
      .from('event_rsvp')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      rsvp: rsvp || null
    });
  } catch (error) {
    console.error('Erro ao buscar RSVP do evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/rsvp/events/:eventId/stats
 * Obter estatísticas de RSVP para um evento (admin ou público)
 */
router.get('/events/:eventId/stats', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Contar RSVPs por status
    const { data: rsvpStats, error } = await supabase
      .from('event_rsvp')
      .select('status')
      .eq('event_id', eventId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      vai: 0,
      nao_vai: 0,
      talvez: 0,
      total: rsvpStats.length
    };

    rsvpStats.forEach(rsvp => {
      stats[rsvp.status]++;
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de RSVP do evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/rsvp/events/:eventId
 * Remover RSVP do usuário para um evento
 */
router.delete('/events/:eventId', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('event_rsvp')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'RSVP removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover RSVP do evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== RSVP para Manifestações =====

/**
 * POST /api/rsvp/manifestations/:manifestationId
 * Criar ou atualizar RSVP para uma manifestação
 */
router.post('/manifestations/:manifestationId', authenticateUser, async (req, res) => {
  try {
    const { manifestationId } = req.params;
    const { status, notes, notification_enabled = true } = req.body;
    const userId = req.user.auth_id; // Usar auth_id para foreign key com auth.users(id)

    // Validar se status foi enviado
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    // Validar status
    if (!['vai', 'nao_vai', 'talvez'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser: vai, nao_vai ou talvez' });
    }

    // Verificar se a manifestação existe
    const { data: manifestation, error: manifestationError } = await supabase
      .from('manifestations')
      .select('id, name, status')
      .eq('id', manifestationId)
      .single();

    if (manifestationError || !manifestation) {
      return res.status(404).json({ error: 'Manifestação não encontrada' });
    }

    // Verificar se já existe um RSVP
    const { data: existingRsvp, error: checkError } = await supabase
      .from('manifestation_rsvp')
      .select('*')
      .eq('user_id', userId)
      .eq('manifestation_id', manifestationId)
      .single();

    const rsvpData = {
      user_id: userId,
      manifestation_id: manifestationId,
      status,
      notes: notes || null,
      notification_enabled
    };

    let result;
    if (existingRsvp) {
      // Atualizar RSVP existente
      const { data: rsvp, error: rsvpError } = await supabase
        .from('manifestation_rsvp')
        .update(rsvpData)
        .eq('id', existingRsvp.id)
        .select()
        .single();

      if (rsvpError) {
        return res.status(400).json({ error: rsvpError.message });
      }
      result = rsvp;
    } else {
      // Criar novo RSVP
      const { data: rsvp, error: rsvpError } = await supabase
        .from('manifestation_rsvp')
        .insert([rsvpData])
        .select()
        .single();

      if (rsvpError) {
        return res.status(400).json({ error: rsvpError.message });
      }
      result = rsvp;
    }

    res.json({
      success: true,
      message: existingRsvp ? 'RSVP atualizado com sucesso' : 'RSVP criado com sucesso',
      rsvp: result
    });
  } catch (error) {
    console.error('Erro ao criar/atualizar RSVP da manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/rsvp/manifestations/:manifestationId/participants
 * Listar todos os participantes que confirmaram presença em uma manifestação (admin)
 */
router.get('/manifestations/:manifestationId/participants', authenticateUser, authenticateAdmin, async (req, res) => {
  console.log('🚀 DEBUG: Rota /manifestations/:manifestationId/participants chamada');
  console.log('🚀 DEBUG: req.params:', req.params);
  console.log('🚀 DEBUG: req.query:', req.query);
  try {
    console.log('🔍 DEBUG: Iniciando busca de participantes de manifestação');
    const { manifestationId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;
    
    // Validar e converter parâmetros
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;
    
    console.log('🔍 DEBUG: Parâmetros:', { manifestationId, status, page: pageNum, limit: limitNum, offset });
    
    // Validar manifestationId
    if (!manifestationId || typeof manifestationId !== 'string') {
      console.error('❌ DEBUG: manifestationId inválido:', manifestationId);
      return res.status(400).json({ error: 'ID da manifestação é obrigatório' });
    }

    // Primeiro buscar os RSVPs
    let rsvpQuery = supabase
      .from('manifestation_rsvp')
      .select('*', { count: 'exact' })
      .eq('manifestation_id', manifestationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) {
      rsvpQuery = rsvpQuery.eq('status', status);
    }

    console.log('🔍 DEBUG: Executando query RSVP...');
    const { data: rsvps, error: rsvpError, count } = await rsvpQuery;
    
    console.log('🔍 DEBUG: Resultado RSVP:', { rsvps: rsvps?.length, error: rsvpError, count });

    if (rsvpError) {
      console.error('❌ DEBUG: Erro na query RSVP:', rsvpError);
      return res.status(400).json({ error: rsvpError.message });
    }

    // Buscar dados dos usuários separadamente
    const userIds = rsvps?.map(rsvp => rsvp.user_id) || [];
    console.log('🔍 DEBUG: IDs de usuário para buscar:', userIds);

    let users = [];
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('auth_id, full_name, username, email, avatar_url')
        .in('auth_id', userIds);
      
      console.log('🔍 DEBUG: Resultado usuários:', { users: usersData?.length, error: usersError });
      
      if (usersError) {
        console.error('❌ DEBUG: Erro na query usuários:', usersError);
        return res.status(400).json({ error: usersError.message });
      }
      
      users = usersData || [];
    }

    // Combinar os dados
    const participantsWithUsers = rsvps?.map(rsvp => {
      const user = users?.find(u => u.auth_id === rsvp.user_id);
      return {
        ...rsvp,
        user_name: user?.full_name || user?.username || 'Usuário',
        user_email: user?.email || '',
        user_avatar: user?.avatar_url || null
      };
    }) || [];

    res.json({
      success: true,
      participants: participantsWithUsers,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    });
    return; // Early return to avoid duplicate response
  } catch (error) {
    console.error('Erro ao buscar participantes da manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter RSVP do usuário para uma manifestação específica
  router.get('/manifestations/:manifestationId', authenticateUser, async (req, res) => {
    try {
      const { manifestationId } = req.params;
      const userId = req.user.auth_id; // Usar auth_id para foreign key com auth.users(id)
      
      const { data: rsvp, error } = await supabase
      .from('manifestation_rsvp')
      .select('*')
      .eq('user_id', userId)
      .eq('manifestation_id', manifestationId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      rsvp: rsvp || null
    });
  } catch (error) {
    console.error('Erro ao buscar RSVP da manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/rsvp/manifestations/:manifestationId/stats
 * Obter estatísticas de RSVP para uma manifestação (admin ou público)
 */
router.get('/manifestations/:manifestationId/stats', async (req, res) => {
  try {
    const { manifestationId } = req.params;

    // Contar RSVPs por status
    const { data: rsvpStats, error } = await supabase
      .from('manifestation_rsvp')
      .select('status')
      .eq('manifestation_id', manifestationId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      vai: 0,
      nao_vai: 0,
      talvez: 0,
      total: rsvpStats.length
    };

    rsvpStats.forEach(rsvp => {
      stats[rsvp.status]++;
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de RSVP da manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/rsvp/manifestations/:manifestationId
 * Remover RSVP do usuário para uma manifestação
 */
router.delete('/manifestations/:manifestationId', authenticateUser, async (req, res) => {
  try {
    const { manifestationId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('manifestation_rsvp')
      .delete()
      .eq('user_id', userId)
      .eq('manifestation_id', manifestationId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'RSVP removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover RSVP da manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== Endpoints Administrativos =====

/**
 * GET /api/rsvp/events/:eventId/participants
 * Listar todos os participantes que confirmaram presença em um evento (admin)
 */
router.get('/events/:eventId/participants', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Primeiro buscar os RSVPs
    let rsvpQuery = supabase
      .from('event_rsvp')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) {
      rsvpQuery = rsvpQuery.eq('status', status);
    }

    const { data: rsvps, error: rsvpError, count } = await rsvpQuery;

    if (rsvpError) {
      return res.status(400).json({ error: rsvpError.message });
    }

    // Buscar dados dos usuários separadamente
    const userIds = rsvps?.map(rsvp => rsvp.user_id) || [];
    console.log('🔍 DEBUG: User IDs para buscar:', userIds);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('auth_id, id, username, full_name, email, avatar_url')
      .in('auth_id', userIds);

    console.log('🔍 DEBUG: Resultado users:', { users: users?.length, error: usersError });

    if (usersError) {
      console.error('❌ DEBUG: Erro na query users:', usersError);
      return res.status(400).json({ error: usersError.message });
    }

    // Combinar os dados
    const participantsWithUsers = rsvps?.map(rsvp => {
      const user = users?.find(u => u.auth_id === rsvp.user_id);
      return {
        ...rsvp,
        user_name: user?.full_name || user?.username || 'Usuário',
        user_email: user?.email || '',
        user_avatar: user?.avatar_url || null
      };
    }) || [];

    res.json({
      success: true,
      participants: participantsWithUsers,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    });
  } catch (error) {
    console.error('Erro ao buscar participantes do evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



/**
 * GET /api/rsvp/user/events
 * Obter todos os RSVPs de eventos do usuário logado
 */
router.get('/user/events', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('event_rsvp')
      .select(`
        *,
        events!inner(
          id,
          title,
          description,
          date,
          time,
          location,
          city,
          state,
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rsvps, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data: rsvps || [],
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar RSVPs de eventos do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/rsvp/user/manifestations
 * Obter todos os RSVPs de manifestações do usuário logado
 */
router.get('/user/manifestations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('manifestation_rsvp')
      .select(`
        *,
        manifestations!inner(
          id,
          name,
          description,
          start_date,
          end_date,
          city,
          state,
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rsvps, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data: rsvps || [],
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar RSVPs de manifestações do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;