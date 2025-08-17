const express = require('express');
const { supabase } = require('../config/supabase');
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
    console.log('🎮 Gamification - req.user.id:', req.user.id);
    console.log('🎮 Gamification - userId from params:', userId);
    console.log('🎮 Gamification - req.user.role:', req.user.role);
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && req.user.role !== 'admin') {
      console.log('❌ Gamification - Acesso negado');
      return res.status(403).json({ error: 'Acesso negado' });
    }

    console.log('✅ Gamification - Acesso permitido, buscando pontos...');
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    if (pointsError) {
      console.error('❌ Gamification - Erro ao buscar pontos:', pointsError);
    }

    let totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;
    console.log('🎮 Gamification - Total points found:', totalPoints);
    
    // Se não há pontos, adicionar alguns pontos iniciais para demonstração
    if (totalPoints === 0) {
      console.log('🎮 Gamification - Adicionando pontos iniciais para demonstração...');
      const initialPoints = [
        { user_id: userId, amount: 100, reason: 'Bônus de boas-vindas', created_at: new Date().toISOString() },
        { user_id: userId, amount: 50, reason: 'Primeiro acesso', created_at: new Date().toISOString() },
        { user_id: userId, amount: 25, reason: 'Perfil completo', created_at: new Date().toISOString() }
      ];
      
      const { error: insertError } = await supabase
        .from('points')
        .insert(initialPoints);
        
      if (!insertError) {
        totalPoints = 175;
        console.log('✅ Gamification - Pontos iniciais adicionados:', totalPoints);
      }
    }

    const response = {
      total: totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      nextLevelPoints: ((Math.floor(totalPoints / 100) + 1) * 100) - totalPoints
    };
    
    console.log('🎮 Gamification - Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Gamification - Error fetching user points:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /gamification/users/:userId/points/add - Adicionar pontos ao usuário
router.post('/users/:userId/points/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason, source = 'other', metadata = {} } = req.body;
    
    // Verificar se o usuário pode adicionar pontos (admin ou próprio usuário)
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Validar dados
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Quantidade de pontos deve ser maior que zero' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Motivo é obrigatório' });
    }

    // Inserir pontos na tabela
    const { data: pointTransaction, error } = await supabase
      .from('points')
      .insert({
        user_id: userId,
        amount: amount,
        reason: reason,
        source: source,
        metadata: metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding points:', error);
      return res.status(500).json({ error: 'Erro ao adicionar pontos' });
    }

    // Buscar total de pontos atualizado
    const { data: pointsData } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    const totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;

    res.json({
      transaction: pointTransaction,
      totalPoints: totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      nextLevelPoints: ((Math.floor(totalPoints / 100) + 1) * 100) - totalPoints
    });
  } catch (error) {
    console.error('Error adding points:', error);
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
      pointsPerConstituicao: 100,
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

// ===== ROTAS ESPECÍFICAS PARA QUIZ =====

/**
 * Salvar resultado do quiz
 */
router.post('/users/:userId/quiz-result', async (req, res) => {
  try {
    const { userId } = req.params;
    const { quizType, score, totalQuestions, correctAnswers, timeSpent, answers } = req.body;
    
    // Verificar se o usuário existe e se é o mesmo do token
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Calcular pontos baseados no resultado
    const basePoints = correctAnswers * 10;
    const accuracyBonus = Math.floor((correctAnswers / totalQuestions) * 50);
    const averageTimePerQuestion = timeSpent / totalQuestions;
    const timeBonus = averageTimePerQuestion < 30 ? 20 : averageTimePerQuestion < 60 ? 10 : 0;
    const pointsEarned = basePoints + accuracyBonus + timeBonus;
    
    // Salvar resultado do quiz
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .insert({
        user_id: userId,
        quiz_type: quizType,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        time_spent: timeSpent,
        points_earned: pointsEarned,
        answers: JSON.stringify(answers),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (quizError) {
      console.error('Erro ao salvar resultado do quiz:', quizError);
      return res.status(500).json({ error: 'Erro ao salvar resultado do quiz' });
    }
    
    // Adicionar pontos ao usuário
    const { error: pointsError } = await supabase
      .from('points')
      .insert({
        user_id: userId,
        amount: pointsEarned,
        reason: `Quiz da Constituição - ${correctAnswers}/${totalQuestions} acertos`,
        category: 'quiz',
        created_at: new Date().toISOString()
      });
    
    if (pointsError) {
      console.error('Erro ao adicionar pontos:', pointsError);
    }
    
    // Verificar conquistas
    const newAchievements = await checkQuizAchievements(userId, {
      score,
      correctAnswers,
      totalQuestions,
      timeSpent
    });
    
    // Verificar se subiu de nível
    const { data: allPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);
    
    const totalPoints = allPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const currentLevel = Math.floor(totalPoints / 100) + 1;
    const previousLevel = Math.floor((totalPoints - pointsEarned) / 100) + 1;
    const levelUp = currentLevel > previousLevel;
    
    res.json({
      quizResult,
      pointsEarned,
      newAchievements,
      levelUp,
      newLevel: levelUp ? { level: currentLevel } : null
    });
    
  } catch (error) {
    console.error('Erro ao processar resultado do quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar histórico de quizzes do usuário
 */
router.get('/users/:userId/quiz-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const offset = (page - 1) * limit;
    
    const { data: results, error, count } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Erro ao buscar histórico de quizzes:', error);
      return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
    
    res.json({
      results: results || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: parseInt(page)
    });
    
  } catch (error) {
    console.error('Erro ao buscar histórico de quizzes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar estatísticas de quiz do usuário
 */
router.get('/users/:userId/quiz-stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { data: results, error } = await supabase
      .from('quiz_results')
      .select('score, correct_answers, total_questions, time_spent, quiz_type')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Erro ao buscar estatísticas de quiz:', error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
    
    const stats = {
      totalQuizzes: results.length,
      averageScore: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0,
      bestScore: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      totalTimeSpent: results.reduce((sum, r) => sum + r.time_spent, 0),
      constitutionQuizzes: results.filter(r => r.quiz_type === 'constitution').length,
      averageAccuracy: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.correct_answers / r.total_questions * 100), 0) / results.length) : 0,
      currentStreak: 0, // TODO: Implementar lógica de streak
      longestStreak: 0  // TODO: Implementar lógica de streak
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas de quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Verificar conquistas relacionadas a quiz
 */
router.post('/users/:userId/check-quiz-achievements', async (req, res) => {
  try {
    const { userId } = req.params;
    const quizResult = req.body;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const achievements = await checkQuizAchievements(userId, quizResult);
    res.json(achievements);
    
  } catch (error) {
    console.error('Erro ao verificar conquistas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Função auxiliar para verificar conquistas de quiz
 */
async function checkQuizAchievements(userId, quizResult) {
  const { score, correctAnswers, totalQuestions } = quizResult;
  const percentage = (correctAnswers / totalQuestions) * 100;
  const newAchievements = [];
  
  try {
    // Buscar badges já conquistados pelo usuário
    const { data: userBadges } = await supabase
      .from('badges')
      .select('badge_type')
      .eq('user_id', userId);
    
    const earnedBadgeTypes = userBadges?.map(b => b.badge_type) || [];
    
    // Buscar total de quizzes do usuário
    const { data: quizCount } = await supabase
      .from('quiz_results')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
    
    const totalQuizzes = (quizCount?.length || 0) + 1; // +1 para incluir o quiz atual
    
    // Definir conquistas possíveis
    const possibleAchievements = [
      {
        id: 'first_quiz',
        name: 'Primeiro Quiz',
        description: 'Completou seu primeiro quiz da Constituição',
        icon: '🌟',
        points: 20,
        badge_type: 'first_quiz',
        condition: totalQuizzes === 1
      },
      {
        id: 'perfect_score',
        name: 'Pontuação Perfeita',
        description: 'Acertou todas as questões em um quiz',
        icon: '🏆',
        points: 50,
        badge_type: 'perfect_score',
        condition: percentage === 100
      },
      {
        id: 'expert_level',
        name: 'Nível Expert',
        description: 'Obteve 90% ou mais de acertos em um quiz',
        icon: '🎯',
        points: 30,
        badge_type: 'expert_level',
        condition: percentage >= 90
      },
      {
        id: 'quiz_enthusiast',
        name: 'Entusiasta dos Quizzes',
        description: 'Completou 5 quizzes da Constituição',
        icon: '📚',
        points: 40,
        badge_type: 'quiz_enthusiast',
        condition: totalQuizzes === 5
      },
      {
        id: 'constitution_scholar',
        name: 'Estudioso da Constituição',
        description: 'Completou 10 quizzes da Constituição',
        icon: '🎓',
        points: 60,
        badge_type: 'constitution_scholar',
        condition: totalQuizzes === 10
      }
    ];
    
    // Verificar quais conquistas foram desbloqueadas
    for (const achievement of possibleAchievements) {
      if (achievement.condition && !earnedBadgeTypes.includes(achievement.badge_type)) {
        // Salvar badge no banco
        const { error } = await supabase
          .from('badges')
          .insert({
            user_id: userId,
            badge_type: achievement.badge_type,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            earned_at: new Date().toISOString()
          });
        
        if (!error) {
          // Adicionar pontos pela conquista
          await supabase
            .from('points')
            .insert({
              user_id: userId,
              amount: achievement.points,
              reason: `Conquista: ${achievement.name}`,
              category: 'achievement',
              created_at: new Date().toISOString()
            });
          
          newAchievements.push({
            ...achievement,
            unlocked: true,
            unlockedAt: new Date().toISOString()
          });
        }
      }
    }
    
    return newAchievements;
    
  } catch (error) {
    console.error('Erro ao verificar conquistas:', error);
    return [];
  }
}

// Rota catch-all para endpoints não implementados
router.use('*', (req, res) => {
  res.status(501).json({ 
    error: 'Endpoint não implementado',
    message: 'Esta funcionalidade de gamificação ainda não foi implementada'
  });
});

module.exports = router;