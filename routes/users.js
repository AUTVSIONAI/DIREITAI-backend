const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    console.log('📋 Getting profile for user:', req.user.email);
    
    // O req.user já contém todos os dados do usuário vindos do middleware
    // Não precisamos fazer outra consulta
    const profile = {
      ...req.user,
      // Remover campos sensíveis se necessário
      // password: undefined,
      // stripe_customer_id: undefined
    };
    
    console.log('✅ Profile retrieved successfully');
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    console.log('📝 Profile update request for user:', req.user.id);
    console.log('📝 Request body:', req.body);
    
    const { username, full_name, bio, city, state, phone, birth_date } = req.body;

    // Validate required fields
    if (!username || !full_name) {
      console.log('❌ Missing required fields: username or full_name');
      return res.status(400).json({ error: 'Username and full name are required' });
    }

    const updateData = {
      username,
      full_name,
      bio,
      city,
      state,
      phone,
      birth_date,
      updated_at: new Date().toISOString(),
    };

    console.log('📝 Update data:', updateData);
    console.log('🔍 User ID from req.user:', req.user.id);

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      console.log('❌ Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Profile updated successfully:', data);
    res.json({ message: 'Profile updated successfully', profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get check-ins count
    const { count: checkinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get points
    const { data: pointsData } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    const totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;

    // Get badges count
    const { count: badgesCount } = await supabase
      .from('badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get AI conversations count (mock for now)
    const aiConversations = Math.floor(Math.random() * 50) + 10;

    res.json({
      checkins: checkinsCount || 0,
      points: totalPoints,
      badges: badgesCount || 0,
      ai_conversations: aiConversations,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user ranking
router.get('/ranking', authenticateUser, async (req, res) => {
  try {
    const { scope = 'city', period = 'month' } = req.query;
    const userId = req.user.id;

    // Get user's city for city-based ranking
    const { data: userData } = await supabase
      .from('users')
      .select('city, state')
      .eq('id', userId)
      .single();

    let query = supabase
      .from('users')
      .select('id, username, full_name, city, state, points, avatar_url')
      .order('points', { ascending: false });

    // Apply scope filter
    if (scope === 'city' && userData?.city) {
      query = query.eq('city', userData.city);
    } else if (scope === 'state' && userData?.state) {
      query = query.eq('state', userData.state);
    }

    const { data: rankings, error } = await query.limit(100);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Find user's position
    const userPosition = rankings.findIndex(user => user.id === userId) + 1;

    res.json({
      rankings,
      user_position: userPosition || null,
      scope,
      period,
    });
  } catch (error) {
    console.error('Get ranking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user achievements
router.get('/achievements', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Mock available achievements
    const allAchievements = [
      {
        id: 'first_checkin',
        name: 'Primeiro Check-in',
        description: 'Realize seu primeiro check-in em um evento',
        icon: '🎯',
        category: 'checkin',
        points: 10,
        rarity: 'comum',
      },
      {
        id: 'social_butterfly',
        name: 'Borboleta Social',
        description: 'Participe de 10 eventos diferentes',
        icon: '🦋',
        category: 'social',
        points: 50,
        rarity: 'raro',
      },
      {
        id: 'ai_enthusiast',
        name: 'Entusiasta da IA',
        description: 'Tenha 100 conversas com o DireitaGPT',
        icon: '🤖',
        category: 'ai',
        points: 100,
        rarity: 'épico',
      },
    ];

    const unlockedIds = badges.map(badge => badge.achievement_id);
    const achievements = allAchievements.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
      earned_at: badges.find(b => b.achievement_id === achievement.id)?.earned_at,
    }));

    res.json({ achievements });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user plan
router.put('/plan', authenticateUser, async (req, res) => {
  try {
    const { plan, billing_cycle } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        plan,
        billing_cycle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Plan updated successfully', profile: data });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;