const express = require('express');
const router = express.Router();
const { adminSupabase } = require('../config/supabase');

// --- USER RANKING ---
router.get('/users', async (req, res) => {
  try {
    const { period = 'all', scope = 'global', limit = 50 } = req.query;
    
    // For now, we only support global ranking by total points as per schema
    // If we had a user_points_log table, we could filter by period.
    // Assuming 'points' column in users is the total.

    let query = adminSupabase
      .from('users')
      .select('id, username, full_name, avatar_url, city, state, points, role')
      .order('points', { ascending: false })
      .limit(limit);

    if (scope === 'city' && req.query.city) {
        query = query.ilike('city', req.query.city);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map to frontend expected format
    const formatted = data.map((u, index) => ({
        id: index + 1, // Rank
        userId: u.id,
        username: u.username || u.full_name || 'Usuário',
        points: u.points || 0,
        checkins: 0, // Placeholder
        city: u.city || 'Brasil',
        avatar: u.avatar_url,
        role: u.role
    }));

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

    const { data, error } = await adminSupabase
      .from('politicians')
      .select('id, name, party, state, photo_url, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const formatted = data.map((p, index) => ({
        id: index + 1,
        politicianId: p.id,
        name: p.name,
        party: p.party,
        state: p.state,
        photo_url: p.photo_url,
        points: p.popularity_score || 0
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao buscar ranking de políticos:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

module.exports = router;
