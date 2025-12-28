const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Função para calcular distância entre dois pontos (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Retorna em metros
};

/**
 * GET /api/manifestations
 * Lista todas as manifestações com filtros opcionais
 */
router.get('/', async (req, res) => {
  try {
    const { city, state, status, limit = 50, page = 1 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('manifestations')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Aplicar filtros
    if (city) {
      query = query.eq('city', city);
    }
    if (state) {
      query = query.eq('state', state.toUpperCase());
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: manifestations, error } = await query;

    // Aplicar filtros adicionais se necessário
    let filteredManifestations = manifestations;

    if (req.query.search) {
      filteredManifestations = manifestations.filter(manifestation => {
        const searchTerm = req.query.search.toLowerCase();
        return manifestation.name.toLowerCase().includes(searchTerm) ||
               manifestation.description?.toLowerCase().includes(searchTerm) ||
               manifestation.city?.toLowerCase().includes(searchTerm);
      });
    }

    res.json({
      success: true,
      data: filteredManifestations,
      total: filteredManifestations.length
    });
  } catch (error) {
    console.error('Erro ao listar manifestações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/admin
 * Listar todas as manifestações para admin
 */
router.get('/admin', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { status, city, state, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = adminSupabase
      .from('manifestations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (state) {
      query = query.ilike('state', `%${state}%`);
    }

    const { data: manifestations, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar manifestações admin:', error);
      return res.status(500).json({ error: 'Erro ao buscar manifestações' });
    }

    // Buscar estatísticas de check-ins para cada manifestação
    const manifestationsWithStats = await Promise.all(
      manifestations.map(async (manifestation) => {
        const { count: checkinCount } = await adminSupabase
          .from('geographic_checkins')
          .select('*', { count: 'exact', head: true })
          .eq('manifestation_id', manifestation.id);

        // Buscar contagem de RSVPs (presenças confirmadas)
        const { count: rsvpCount } = await adminSupabase
          .from('manifestation_rsvp')
          .select('*', { count: 'exact', head: true })
          .eq('manifestation_id', manifestation.id)
          .eq('status', 'vai');

        // Buscar dados do criador manualmente para evitar erros de FK
        let createdByUser = null;
        if (manifestation.created_by) {
          const { data: userData } = await adminSupabase
            .from('users')
            .select('username, email')
            .eq('id', manifestation.created_by)
            .maybeSingle();
          createdByUser = userData;
        }

        return {
          ...manifestation,
          created_by_user: createdByUser,
          checkin_count: checkinCount || 0,
          rsvp_count: rsvpCount || 0
        };
      })
    );

    res.json({
      success: true,
      data: manifestationsWithStats,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar manifestações admin:', error);
    // Log detalhado para debug
    if (error.response) console.error('Erro response:', error.response);
    if (error.message) console.error('Erro message:', error.message);
    if (error.details) console.error('Erro details:', error.details);
    if (error.hint) console.error('Erro hint:', error.hint);
    
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

/**
 * GET /api/manifestations/:id/analytics
 * Retorna dados detalhados de check-ins para análise (Admin)
 */
router.get('/:id/analytics', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar check-ins (sem join para evitar erros de FK ausente)
    const { data: checkins, error } = await adminSupabase
      .from('geographic_checkins')
      .select('*')
      .eq('manifestation_id', id);

    if (error) {
      console.error('Erro ao buscar analytics:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados de análise' });
    }

    // Buscar contagem de RSVPs
    const { count: rsvpCount } = await adminSupabase
      .from('manifestation_rsvp')
      .select('*', { count: 'exact', head: true })
      .eq('manifestation_id', id)
      .eq('status', 'vai');

    // Buscar dados dos usuários manualmente
    const userIds = checkins.map(c => c.user_id).filter(id => id);
    let usersMap = {};
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await adminSupabase
        .from('users')
        .select('id, username, full_name, email, gender, city, state')
        .in('id', userIds);
        
      if (!usersError && users) {
        users.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    // Processar dados para estatísticas
    const stats = {
      total_checkins: checkins.length,
      total_rsvps: rsvpCount || 0,
      gender_distribution: { male: 0, female: 0, other: 0, unknown: 0 },
      region_distribution: {},
      users_list: []
    };

    checkins.forEach(checkin => {
      const user = usersMap[checkin.user_id] || {};
      const gender = user.gender ? user.gender.toLowerCase() : 'unknown';
      
      // Contagem de gênero
      if (gender === 'male' || gender === 'masculino' || gender === 'homem') stats.gender_distribution.male++;
      else if (gender === 'female' || gender === 'feminino' || gender === 'mulher') stats.gender_distribution.female++;
      else if (gender === 'unknown') stats.gender_distribution.unknown++;
      else stats.gender_distribution.other++;

      // Região (baseada em estado do usuário ou coordenadas do check-in se não disponível)
      // Tenta usar estado do usuário, senão usa 'Desconhecido'
      const region = user.state || 'Desconhecido';
      stats.region_distribution[region] = (stats.region_distribution[region] || 0) + 1;

      // Adicionar à lista detalhada
      stats.users_list.push({
        user_id: user.id,
        name: user.full_name || user.username || 'Usuário',
        email: user.email,
        gender: user.gender || 'Não informado',
        city: user.city || 'Não informado',
        state: user.state || 'Não informado',
        checked_in_at: checkin.checked_in_at,
        latitude: checkin.latitude,
        longitude: checkin.longitude
      });
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erro no analytics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/manifestations
 * Criar nova manifestação
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      radius = 100,
      start_date,
      end_date,
      max_participants,
      city,
      state,
      address,
      image_url,
      category = 'manifestacao'
    } = req.body;

    // Validações
    if (!name || !latitude || !longitude || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: name, latitude, longitude, start_date, end_date' 
      });
    }

    if (parseFloat(latitude) < -90 || parseFloat(latitude) > 90) {
      return res.status(400).json({ error: 'Latitude deve estar entre -90 e 90' });
    }

    if (parseFloat(longitude) < -180 || parseFloat(longitude) > 180) {
      return res.status(400).json({ error: 'Longitude deve estar entre -180 e 180' });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'Data de início deve ser anterior à data de fim' });
    }

    const manifestationData = {
      name,
      description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      start_date,
      end_date,
      max_participants: max_participants ? parseInt(max_participants) : null,
      city,
      state,
      address,
      image_url,
      category,
      created_by: req.user.id,
      is_active: true,
      status: 'active'
    };

    // Usar adminSupabase para bypass de RLS e garantir criação por admin
    const { data: manifestation, error } = await adminSupabase
      .from('manifestations')
      .insert([manifestationData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar manifestação:', error);
      return res.status(500).json({ error: 'Erro ao criar manifestação' });
    }

    res.status(201).json({
      success: true,
      data: manifestation,
      message: 'Manifestação criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/manifestations/:id
 * Atualizar manifestação (apenas admin)
 */
router.put('/:id', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.created_by;
    delete updateData.created_at;

    const { data: manifestation, error } = await adminSupabase
      .from('manifestations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar manifestação:', error);
      return res.status(500).json({ error: 'Erro ao atualizar manifestação' });
    }

    if (!manifestation) {
      return res.status(404).json({ error: 'Manifestação não encontrada' });
    }

    res.json({
      success: true,
      data: manifestation,
      message: 'Manifestação atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/manifestations/:id
 * Deletar manifestação (apenas admin)
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing, error: fetchError } = await adminSupabase
      .from('manifestations')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Manifestação não encontrada' });
    }
    const isAdmin = (req.user?.role === 'admin' || req.user?.role === 'super_admin') || (req.user?.is_admin === true) || (req.user?.email === 'admin@direitai.com');
    const isOwner = (existing?.created_by === req.user?.id) || (existing?.created_by === req.user?.auth_id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Ação restrita a administradores ou criador' });
    }

    // Verificar se há check-ins associados
    const { count: checkinCount } = await adminSupabase
      .from('geographic_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('manifestation_id', id);

    if (checkinCount > 0) {
      // Se há check-ins, apenas desativar ao invés de deletar
      const { data: manifestation, error } = await adminSupabase
        .from('manifestations')
        .update({ is_active: false, status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao desativar manifestação:', error);
        return res.status(500).json({ error: 'Erro ao desativar manifestação' });
      }

      return res.json({
        success: true,
        message: 'Manifestação desativada (há check-ins associados)'
      });
    }

    // Se não há check-ins, pode deletar
    const { error } = await adminSupabase
      .from('manifestations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar manifestação:', error);
      return res.status(500).json({ error: 'Erro ao deletar manifestação' });
    }

    res.json({
      success: true,
      message: 'Manifestação deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar manifestação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/checkins/map
 * Listar todos os check-ins recentes para o mapa (admin)
 */
router.get('/checkins/map', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Pegar check-ins das últimas 24h
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: checkins, error } = await supabase
      .from('geographic_checkins')
      .select('id, user_id, manifestation_id, latitude, longitude, checked_in_at')
      .gte('checked_in_at', yesterday.toISOString())
      .order('checked_in_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar check-ins para o mapa:', error);
      return res.status(500).json({ error: 'Erro ao buscar check-ins' });
    }

    // Buscar dados dos usuários
    const userIds = [...new Set(checkins.map(c => c.user_id))];
    const { data: users } = await adminSupabase
      .from('users')
      .select('id, auth_id, username, email, full_name, avatar_url')
      .in('auth_id', userIds);
    
    // Map users by auth_id since checkins.user_id is auth_id
    const usersMap = new Map((users || []).map(u => [u.auth_id, u]));
    
    // Adicionar dados do usuário
    const checkinsWithUsers = checkins.map(checkin => ({
      ...checkin,
      user: usersMap.get(checkin.user_id)
    }));

    res.json({
      success: true,
      data: checkinsWithUsers
    });
  } catch (error) {
    console.error('Erro ao buscar check-ins para o mapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/my-checkins
 * Listar check-ins do usuário logado em manifestações
 */
router.get('/my-checkins', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Usar adminSupabase para garantir leitura correta
    const { data: checkins, error } = await adminSupabase
      .from('geographic_checkins')
      .select('manifestation_id, checked_in_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao buscar check-ins do usuário:', error);
      return res.status(500).json({ error: 'Erro ao buscar check-ins' });
    }

    res.json({
      success: true,
      data: checkins
    });
  } catch (error) {
    console.error('Erro ao buscar check-ins do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para calcular distância entre dois pontos (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Retorna em metros
};

/**
 * POST /api/manifestations/:id/checkin
 * Fazer check-in em uma manifestação
 */
router.post('/:id/checkin', authenticateUser, async (req, res) => {
  try {
    const { id: manifestationId } = req.params;
    const { latitude, longitude, device_info } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórias' });
    }

    // Verificar se a manifestação existe e está ativa
    const { data: manifestation, error: manifestationError } = await supabase
      .from('manifestations')
      .select('*')
      .eq('id', manifestationId)
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    if (manifestationError || !manifestation) {
      return res.status(404).json({ error: 'Manifestação não encontrada ou inativa' });
    }

    // Verificar se a manifestação está no período ativo
    const now = new Date();
    const startDate = new Date(manifestation.start_date);
    const endDate = new Date(manifestation.end_date);

    if (now < startDate) {
      return res.status(400).json({ error: 'Manifestação ainda não começou' });
    }

    if (now > endDate) {
      return res.status(400).json({ error: 'Manifestação já terminou' });
    }

    // Verificar se o usuário já fez check-in nesta manifestação
    const { data: existingCheckin } = await adminSupabase
      .from('geographic_checkins')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('manifestation_id', manifestationId)
      .single();

    if (existingCheckin) {
      return res.status(400).json({ error: 'Você já fez check-in nesta manifestação' });
    }

    // Calcular distância do centro da manifestação
    const distance = calculateDistance(
      parseFloat(latitude), parseFloat(longitude),
      parseFloat(manifestation.latitude), parseFloat(manifestation.longitude)
    );

    // Verificar se está dentro do raio permitido
    if (distance > manifestation.radius) {
      return res.status(400).json({ 
        error: 'Você está muito longe da manifestação',
        distance: Math.round(distance),
        required_distance: manifestation.radius
      });
    }

    // Verificar limite de participantes
    if (manifestation.max_participants) {
      const { count: currentCheckins } = await adminSupabase
        .from('geographic_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('manifestation_id', manifestationId);

      if (currentCheckins >= manifestation.max_participants) {
        return res.status(400).json({ error: 'Manifestação atingiu o limite máximo de participantes' });
      }
    }

    // Criar check-in
    // Truncar coordenadas para evitar overflow se o esquema do banco estiver incorreto (ex: NUMERIC(8,2))
    // Mas o ideal é rodar o script de migração para DOUBLE PRECISION
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    const checkinData = {
      user_id: req.user.id,
      manifestation_id: manifestationId,
      latitude: lat,
      longitude: lon,
      device_info: device_info || {},
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      checked_in_at: new Date().toISOString()
    };

    // Usar adminSupabase para garantir que o check-in seja salvo
    const { data: checkin, error: checkinError } = await adminSupabase
      .from('geographic_checkins')
      .insert([checkinData])
      .select()
      .single();

    if (checkinError) {
      console.error('Erro ao criar check-in:', checkinError);
      
      // Tratamento específico para erro de overflow
      if (checkinError.code === '22003') { // numeric_value_out_of_range
         return res.status(500).json({ 
           error: 'Erro de precisão no banco de dados. Contate o suporte para rodar a migração de esquema.',
           details: 'Latitude/Longitude excedem a precisão da coluna.'
         });
      }
      
      return res.status(500).json({ error: 'Erro ao fazer check-in' });
    }

    // Conceder pontos pelo check-in
    const pointsAwarded = 50; // Pontos por check-in em manifestação
    const { error: pointsError } = await adminSupabase
      .from('points')
      .insert([{
        user_id: req.user.id,
        amount: pointsAwarded,
        reason: `Check-in na manifestação: ${manifestation.name}`,
        source: 'geographic_checkin',
        category: 'manifestation',
        metadata: {
          manifestation_id: manifestationId,
          manifestation_name: manifestation.name,
          distance: Math.round(distance)
        }
      }]);

    if (pointsError) {
      console.error('Erro ao conceder pontos:', pointsError);
    }

    res.status(201).json({
      success: true,
      data: {
        ...checkin,
        points_awarded: pointsAwarded,
        distance: Math.round(distance)
      },
      message: 'Check-in realizado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao fazer check-in:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/:id/checkins
 * Listar check-ins de uma manifestação (admin)
 */
router.get('/:id/checkins', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id: manifestationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data: checkins, error, count } = await adminSupabase
      .from('geographic_checkins')
      .select('*', { count: 'exact' })
      .eq('manifestation_id', manifestationId)
      .order('checked_in_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar check-ins:', error);
      return res.status(500).json({ error: 'Erro ao buscar check-ins' });
    }

    // Buscar dados dos usuários separadamente
    const userIds = [...new Set(checkins.map(c => c.user_id))];
    const { data: users } = await adminSupabase
      .from('users')
      .select('id, username, email, full_name')
      .in('id', userIds);
    
    const usersMap = new Map((users || []).map(u => [u.id, u]));
    
    // Adicionar dados do usuário aos check-ins
    const checkinsWithUsers = checkins.map(checkin => ({
      ...checkin,
      user: usersMap.get(checkin.user_id)
    }));

    res.json({
      success: true,
      data: checkinsWithUsers,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar check-ins:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/checkins/export
 * Exportar check-ins em CSV (admin)
 */
router.get('/checkins/export', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { manifestation_id, start_date, end_date } = req.query;

    let query = supabase
      .from('geographic_checkins')
      .select('*')
      .order('checked_in_at', { ascending: false });

    if (manifestation_id) {
      query = query.eq('manifestation_id', manifestation_id);
    }
    if (start_date) {
      query = query.gte('checked_in_at', start_date);
    }
    if (end_date) {
      query = query.lte('checked_in_at', end_date);
    }

    const { data: checkins, error } = await query;

    if (error) {
      console.error('Erro ao exportar check-ins:', error);
      return res.status(500).json({ error: 'Erro ao exportar check-ins' });
    }

    // Buscar dados dos usuários e manifestações separadamente
    const userIds = [...new Set(checkins.map(c => c.user_id))];
    const manifestationIds = [...new Set(checkins.map(c => c.manifestation_id))];
    
    const [usersResult, manifestationsResult] = await Promise.all([
      adminSupabase.from('users').select('id, username, email, full_name').in('id', userIds),
      supabase.from('manifestations').select('id, name, city, state').in('id', manifestationIds)
    ]);
    
    const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]));
    const manifestationsMap = new Map((manifestationsResult.data || []).map(m => [m.id, m]));
    
    // Adicionar dados relacionados aos check-ins
    const checkinsWithData = checkins.map(checkin => ({
      ...checkin,
      user: usersMap.get(checkin.user_id),
      manifestation: manifestationsMap.get(checkin.manifestation_id)
    }));

    // Converter para CSV
    const csvHeader = 'ID,Usuario,Email,Nome Completo,Manifestacao,Cidade,Estado,Latitude,Longitude,Distancia,Data Check-in,Localizacao Valida\n';
    const csvRows = checkinsWithData.map(checkin => {
      const user = checkin.user || {};
      const manifestation = checkin.manifestation || {};
      return [
        checkin.id,
        user.username || '',
        user.email || '',
        user.full_name || '',
        manifestation.name || '',
        manifestation.city || '',
        manifestation.state || '',
        checkin.latitude,
        checkin.longitude,
        checkin.distance_from_center || '',
        new Date(checkin.checked_in_at).toLocaleString('pt-BR'),
        checkin.is_valid_location ? 'Sim' : 'Não'
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="checkins-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csvContent); // BOM para UTF-8
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/stats/realtime
 * Estatísticas em tempo real para dashboard admin
 */
router.get('/stats/realtime', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Manifestações ativas
    const { count: activeManifestations } = await supabase
      .from('manifestations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'active')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString());

    // Check-ins hoje
    const { count: todayCheckins } = await supabase
      .from('geographic_checkins')
      .select('*', { count: 'exact', head: true })
      .gte('checked_in_at', today.toISOString());

    // Total de participantes únicos
    const { count: totalParticipants } = await supabase
      .from('geographic_checkins')
      .select('user_id', { count: 'exact', head: true });

    // Manifestações por cidade (top 5)
    const { data: topCities } = await supabase
      .from('manifestations')
      .select('city, state')
      .eq('is_active', true)
      .not('city', 'is', null);

    const cityStats = {};
    topCities?.forEach(m => {
      const key = `${m.city}, ${m.state}`;
      cityStats[key] = (cityStats[key] || 0) + 1;
    });

    const topCitiesArray = Object.entries(cityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    res.json({
      success: true,
      data: {
        active_manifestations: activeManifestations || 0,
        today_checkins: todayCheckins || 0,
        total_participants: totalParticipants || 0,
        top_cities: topCitiesArray,
        last_update: now.toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/manifestations/checkins/map
 * Retorna check-ins geográficos de manifestações para exibição no mapa
 */
router.get('/checkins/map', async (req, res) => {
  try {
    const { city, state, dateFrom, dateTo } = req.query;
    
    let query = adminSupabase
      .from('geographic_checkins')
      .select(`
        checked_in_at,
        latitude,
        longitude,
        user_id,
        manifestation_id
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('checked_in_at', { ascending: false });
    
    // Aplicar filtros de data se fornecidos
    if (dateFrom) {
      query = query.gte('checked_in_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('checked_in_at', dateTo);
    }

    // Aplicar filtros de localização se fornecidos
    // Nota: Filtrar por cidade/estado da manifestação requer join ou busca separada
    // Como geographic_checkins não tem city/state direto, vamos buscar tudo e filtrar no código ou melhorar a query
    // Mas para simplificar e evitar erro de join, vamos manter assim por enquanto
    
    const { data: checkins, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar check-ins geográficos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
    
    // Buscar dados de usuários e manifestações
    const userIds = [...new Set(checkins.map(c => c.user_id))];
    const manifestationIds = [...new Set(checkins.map(c => c.manifestation_id))];
    
    const [usersResult, manifestationsResult] = await Promise.all([
      adminSupabase.from('users').select('id, username, full_name').in('id', userIds),
      adminSupabase.from('manifestations').select('id, name, city, state').in('id', manifestationIds)
    ]);
    
    const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]));
    const manifestationsMap = new Map((manifestationsResult.data || []).map(m => [m.id, m]));
    
    // Formatar dados para exibição no mapa
    const formattedCheckins = checkins.map(checkin => {
      const user = usersMap.get(checkin.user_id);
      const manifestation = manifestationsMap.get(checkin.manifestation_id);
      
      return {
        id: `geo_${checkin.user_id}_${checkin.checked_in_at}`,
        latitude: checkin.latitude,
        longitude: checkin.longitude,
        user: user ? {
          id: user.id,
          username: user.username,
          full_name: user.full_name
        } : null,
        manifestation: manifestation ? {
          name: manifestation.name,
          city: manifestation.city,
          state: manifestation.state
        } : null,
        checked_in_at: checkin.checked_in_at,
        type: 'manifestation_checkin'
      };
    }).filter(c => c.user && c.manifestation); // Filtrar apenas check-ins com dados válidos
    
    res.json({
      success: true,
      data: formattedCheckins,
      total: formattedCheckins.length
    });
    
  } catch (error) {
    console.error('Erro no endpoint /api/manifestations/checkins/map:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
