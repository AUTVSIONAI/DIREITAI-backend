const express = require('express');
const { supabase } = require('../lib/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateUser);

// GET /gamification/users/:userId/stats - Estatísticas de gamificação do usuário
router.get('/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar pontos do usuário
    const { data: pointsData } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    const totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;

    // Buscar badges do usuário
    const { count: badgesCount } = await supabase
      .from('badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Buscar check-ins do usuário
    const { count: checkinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Buscar conversas de IA do usuário
    const { count: conversationsCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      points: totalPoints,
      badges: badgesCount || 0,
      checkins: checkinsCount || 0,
      conversations: conversationsCount || 0,
      level: Math.floor(totalPoints / 100) + 1,
      nextLevelPoints: ((Math.floor(totalPoints / 100) + 1) * 100) - totalPoints
    });
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/users/:userId/activities - Atividades recentes do usuário
router.get('/users/:userId/activities', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const activities = [];

    // Buscar check-ins recentes
    const { data: checkins } = await supabase
      .from('checkins')
      .select('*, events(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    checkins?.forEach(checkin => {
      activities.push({
        id: `checkin-${checkin.id}`,
        type: 'checkin',
        title: 'Check-in realizado',
        description: `Check-in no evento: ${checkin.events?.title || 'Evento'}`,
        points: 10,
        timestamp: checkin.created_at,
        icon: 'map-pin'
      });
    });

    // Buscar conversas de IA recentes
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    conversations?.forEach(conv => {
      activities.push({
        id: `conversation-${conv.id}`,
        type: 'ai_conversation',
        title: 'Conversa com IA',
        description: `Nova conversa: ${conv.title || 'Sem título'}`,
        points: 5,
        timestamp: conv.created_at,
        icon: 'message-square'
      });
    });

    // Ordenar por timestamp e limitar
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json(limitedActivities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/users/:userId/points - Pontos do usuário
router.get('/users/:userId/points', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data: pointsData } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    const totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;

    res.json({
      total: totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      nextLevelPoints: ((Math.floor(totalPoints / 100) + 1) * 100) - totalPoints
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/settings - Configurações de gamificação
router.get('/settings', async (req, res) => {
  try {
    // Retornar configurações padrão de gamificação
    res.json({
      pointsPerCheckin: 10,
      pointsPerConversation: 5,
      pointsPerEvent: 20,
      levelThreshold: 100,
      badgeRequirements: {
        firstCheckin: 1,
        regularUser: 10,
        powerUser: 50,
        expert: 100
      }
    });
  } catch (error) {
    console.error('Error fetching gamification settings:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota catch-all para endpoints não implementados
router.use('*', (req, res) => {
  res.status(501).json({ 
    error: 'Endpoint não implementado',
    message: 'Esta funcionalidade de gamificação ainda não foi implementada'
  });
});

module.exports = router;