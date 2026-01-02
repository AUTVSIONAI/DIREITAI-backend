const express = require('express');
const router = express.Router();
const { adminSupabase } = require('../config/supabase');
const { optionalAuthenticateUser } = require('../middleware/auth');

// Debug route
router.get('/', (req, res) => {
    res.json({ status: 'Rankings route active', timestamp: new Date() });
});

// --- USER RANKING ---
router.get('/users', optionalAuthenticateUser, async (req, res) => {
  try {
    const { period = 'all', scope = 'global', limit = 50 } = req.query;
    const currentUserId = req.user ? req.user.id : null;
    
    // For now, we only support global ranking by total points as per schema
    // If we had a user_points_log table, we could filter by period.
    // Assuming 'points' column in users is the total.

    let query = adminSupabase
      .from('users')
      .select('id, username, full_name, avatar_url, city, state, points, role')
      .order('points', { ascending: false })
      .limit(parseInt(limit));

    if (scope === 'city' && req.query.city) {
        query = query.ilike('city', req.query.city);
    }

    const { data: topUsers, error } = await query;

    if (error) throw error;

    let allUsers = [...(topUsers || [])];
    let currentUserData = null;
    let currentUserRank = null;

    // Se o usuário logado não estiver na lista top N, buscá-lo separadamente
    if (currentUserId) {
        const found = allUsers.find(u => u.id === currentUserId);
        if (!found) {
            // Buscar dados do usuário
            const { data: user, error: userError } = await adminSupabase
                .from('users')
                .select('id, username, full_name, avatar_url, city, state, points, role')
                .eq('id', currentUserId)
                .single();
            
            if (!userError && user) {
                currentUserData = user;
                // Calcular ranking (quantos têm mais pontos)
                const { count, error: rankError } = await adminSupabase
                    .from('users')
                    .select('id', { count: 'exact', head: true })
                    .gt('points', user.points || 0);
                
                if (!rankError) {
                    currentUserRank = (count || 0) + 1;
                }
            }
        } else {
            // Usuário já está na lista, o rank é o índice + 1
            currentUserRank = allUsers.indexOf(found) + 1;
        }
    }

    // Coletar IDs e Auth IDs para buscar checkins
    const usersToEnrich = currentUserData ? [...allUsers, currentUserData] : allUsers;
    const userIds = usersToEnrich.map(u => u.id);
    
    // Precisamos buscar os auth_ids também, pois checkins podem estar ligados por auth_id
    const { data: usersWithAuth, error: authError } = await adminSupabase
        .from('users')
        .select('id, auth_id')
        .in('id', userIds);
    
    const idToAuthId = {};
    const authIdToId = {};
    if (usersWithAuth) {
        usersWithAuth.forEach(u => {
            idToAuthId[u.id] = u.auth_id;
            if (u.auth_id) authIdToId[u.auth_id] = u.id;
        });
    }

    const allRelatedIds = [...userIds, ...Object.values(idToAuthId).filter(Boolean)];

    // Buscar contagem de checkins para todos os IDs relacionados (id público ou auth_id)
    const [checkinsResult, geoCheckinsResult] = await Promise.all([
        adminSupabase.from('checkins').select('user_id').in('user_id', allRelatedIds),
        adminSupabase.from('geographic_checkins').select('user_id').in('user_id', allRelatedIds)
    ]);

    const checkinCounts = {};
    userIds.forEach(id => checkinCounts[id] = 0);
    
    const countCheckin = (c) => {
        // Se o user_id do checkin bate com o ID público
        if (checkinCounts[c.user_id] !== undefined) {
            checkinCounts[c.user_id]++;
        } 
        // Se o user_id do checkin bate com o Auth ID, somar no ID público correspondente
        else if (authIdToId[c.user_id]) {
            const publicId = authIdToId[c.user_id];
            checkinCounts[publicId] = (checkinCounts[publicId] || 0) + 1;
        }
    };

    checkinsResult.data?.forEach(countCheckin);
    geoCheckinsResult.data?.forEach(countCheckin);

    // Formatar resposta
    const formatted = allUsers.map((u, index) => ({
        id: index + 1, // Rank na lista retornada
        userId: u.id,
        username: u.username || u.full_name || 'Usuário',
        points: u.points || 0,
        checkins: checkinCounts[u.id] || 0,
        city: u.city || 'Brasil',
        avatar: u.avatar_url,
        role: u.role
    }));

    // Se tivermos dados do usuário atual que não estava na lista, adicioná-lo
    // Mas mantendo o ID como o rank real calculado
    if (currentUserData) {
        formatted.push({
            id: currentUserRank || (formatted.length + 1), // Rank real
            userId: currentUserData.id,
            username: currentUserData.username || currentUserData.full_name || 'Usuário',
            points: currentUserData.points || 0,
            checkins: checkinCounts[currentUserData.id] || 0,
            city: currentUserData.city || 'Brasil',
            avatar: currentUserData.avatar_url,
            role: currentUserData.role
        });
    }

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao buscar ranking de usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// --- POLITICIAN RANKING ---
router.get('/politicians', async (req, res) => {
  try {
    // We use popularity_score for ranking
    const { limit = 50 } = req.query;

    // Fetch all approved politicians with their points to calculate ranking
    // Note: Fetching all to sort in memory because points are calculated from a related table.
    // Optimization needed if dataset grows large (e.g., materialized view or counter cache column).
    const { data, error } = await adminSupabase
      .from('politicians')
      .select('id, name, party, state, photo_url, politician_points(points)')
      .eq('is_approved', true)
      .eq('is_active', true);

    if (error) throw error;

    // Calculate total points and sort
    const rankedData = data
      .map(p => ({
        ...p,
        totalPoints: p.politician_points 
          ? p.politician_points.reduce((sum, item) => sum + item.points, 0) 
          : 0
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, parseInt(limit));

    const formatted = rankedData.map((p, index) => ({
        id: index + 1,
        politicianId: p.id,
        name: p.name,
        party: p.party,
        state: p.state,
        photo_url: p.photo_url,
        points: p.totalPoints
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao buscar ranking de políticos:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

module.exports = router;
