const express = require('express');
const router = express.Router();
const { adminSupabase } = require('../config/supabase');

// Debug route
router.get('/', (req, res) => {
    res.json({ status: 'Rankings route active', timestamp: new Date() });
});

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
