const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, resolveUserId } = require('../middleware/auth');
const router = express.Router();

// GET /gamification/transactions-test/:userId - Teste de transações sem auth
router.get('/transactions-test/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('💰 Transactions Test - Buscando transações para usuário:', userId);

    const { data: transactions, error } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('💰 Transactions Test - Erro:', error);
      return res.status(500).json({ error: 'Erro ao buscar transações' });
    }

    console.log('💰 Transactions Test - Transações encontradas:', transactions?.length || 0);

    res.json({
      success: true,
      user_id: userId,
      transactions: transactions || [],
      total: transactions?.length || 0
    });
  } catch (error) {
    console.error('💰 Transactions Test - Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/achievements - Obter todas as conquistas disponíveis
router.get('/achievements', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    // Definir todas as conquistas disponíveis no sistema
    const allAchievements = [
      {
        id: 'first_quiz',
        name: 'Primeiro Quiz',
        description: 'Completou seu primeiro quiz da Constituição',
        category: 'learning',
        icon: '🌟',
        points: 20,
        rarity: 'common',
        requirements: [{ type: 'quiz_count', value: 1 }]
      },
      {
        id: 'perfect_score',
        name: 'Pontuação Perfeita',
        description: 'Acertou todas as questões em um quiz',
        category: 'learning',
        icon: '🏆',
        points: 50,
        rarity: 'rare',
        requirements: [{ type: 'quiz_score', value: 100 }]
      },
      {
        id: 'expert_level',
        name: 'Nível Expert',
        description: 'Obteve 90% ou mais de acertos em um quiz',
        category: 'learning',
        icon: '🎯',
        points: 30,
        rarity: 'uncommon',
        requirements: [{ type: 'quiz_score', value: 90 }]
      },
      {
        id: 'quiz_enthusiast',
        name: 'Entusiasta dos Quizzes',
        description: 'Completou 5 quizzes da Constituição',
        category: 'learning',
        icon: '📚',
        points: 40,
        rarity: 'uncommon',
        requirements: [{ type: 'quiz_count', value: 5 }]
      },
      {
        id: 'constitution_scholar',
        name: 'Estudioso da Constituição',
        description: 'Completou 10 quizzes da Constituição',
        category: 'learning',
        icon: '🎓',
        points: 60,
        rarity: 'epic',
        requirements: [{ type: 'quiz_count', value: 10 }]
      },
      {
        id: 'first_checkin',
        name: 'Primeiro Check-in',
        description: 'Fez seu primeiro check-in em uma manifestação',
        category: 'checkin',
        icon: '📍',
        points: 25,
        rarity: 'common',
        requirements: [{ type: 'checkin_count', value: 1 }]
      },
      {
        id: 'active_participant',
        name: 'Participante Ativo',
        description: 'Fez check-in em 10 manifestações',
        category: 'checkin',
        icon: '🎯',
        points: 100,
        rarity: 'uncommon',
        requirements: [{ type: 'checkin_count', value: 10 }]
      },
      {
        id: 'ai_conversationalist',
        name: 'Conversador IA',
        description: 'Teve 25 conversas com o DireitaIA',
        category: 'ai',
        icon: '🤖',
        points: 75,
        rarity: 'uncommon',
        requirements: [{ type: 'ai_conversation_count', value: 25 }]
      },
      {
        id: 'welcome',
        name: 'Bem-vindo!',
        description: 'Cadastrou-se na plataforma DireitaAI',
        category: 'special',
        icon: '👋',
        points: 50,
        rarity: 'common',
        requirements: [{ type: 'registration', value: 1 }]
      },
      {
        id: 'first_login',
        name: 'Primeiro Acesso',
        description: 'Realizou o primeiro login na plataforma',
        category: 'special',
        icon: '🚪',
        points: 25,
        rarity: 'common',
        requirements: [{ type: 'login', value: 1 }]
      }
    ];
    
    // Filtrar por categoria se especificada
    let filteredAchievements = allAchievements;
    if (category) {
      filteredAchievements = allAchievements.filter(a => a.category === category);
    }
    
    res.json(filteredAchievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de autenticação para todas as outras rotas
router.use(authenticateUser);

// GET /gamification/users/:userId/stats - Estatísticas de gamificação do usuário
router.get('/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar pontos do usuário
    const { data: pointsData } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', resolvedUserId);

    const totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;

    // Buscar badges do usuário
    const { count: badgesCount } = await supabase
      .from('badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', resolvedUserId);

    // Buscar check-ins do usuário
    const { count: checkinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', resolvedUserId);

    // Buscar conversas de IA do usuário
    const { count: conversationsCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', resolvedUserId);

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
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const activities = [];

    // Buscar transações de pontos recentes (atividades mais importantes)
    const { data: pointTransactions } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(8);

    pointTransactions?.forEach(transaction => {
      let activityType = 'points';
      let icon = 'target';
      
      if (transaction.category === 'checkin') {
        activityType = 'checkin';
        icon = 'map-pin';
      } else if (transaction.category === 'ai_conversation') {
        activityType = 'ai_conversation';
        icon = 'message-square';
      } else if (transaction.category === 'achievement') {
        activityType = 'achievement';
        icon = 'award';
      } else if (transaction.category === 'quiz') {
        activityType = 'quiz';
        icon = 'brain';
      }
      
      activities.push({
        id: `points-${transaction.id}`,
        type: activityType,
        title: transaction.reason || 'Pontos ganhos',
        description: transaction.reason || `+${transaction.amount} pontos`,
        points: transaction.amount,
        timestamp: transaction.created_at,
        icon: icon
      });
    });

    // Buscar check-ins recentes (caso não tenham gerado pontos ainda)
    const { data: checkins } = await supabase
      .from('checkins')
      .select('*, events(title)')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(3);

    checkins?.forEach(checkin => {
      // Verificar se já não temos esta atividade nas transações de pontos
      const existingActivity = activities.find(a => 
        a.type === 'checkin' && 
        Math.abs(new Date(a.timestamp) - new Date(checkin.created_at)) < 60000 // 1 minuto de diferença
      );
      
      if (!existingActivity) {
        activities.push({
          id: `checkin-${checkin.id}`,
          type: 'checkin',
          title: 'Check-in realizado',
          description: `Check-in no evento: ${checkin.events?.title || 'Evento'}`,
          points: 10,
          timestamp: checkin.created_at,
          icon: 'map-pin'
        });
      }
    });

    // Buscar conversas de IA recentes (caso não tenham gerado pontos ainda)
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(3);

    conversations?.forEach(conv => {
      // Verificar se já não temos esta atividade nas transações de pontos
      const existingActivity = activities.find(a => 
        a.type === 'ai_conversation' && 
        Math.abs(new Date(a.timestamp) - new Date(conv.created_at)) < 60000 // 1 minuto de diferença
      );
      
      if (!existingActivity) {
        activities.push({
          id: `conversation-${conv.id}`,
          type: 'ai_conversation',
          title: 'Conversa com IA',
          description: `Nova conversa: ${conv.title || 'Sem título'}`,
          points: 5,
          timestamp: conv.created_at,
          icon: 'message-square'
        });
      }
    });

    // Ordenar por timestamp e limitar
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    console.log(`🎯 Retornando ${limitedActivities.length} atividades para usuário ${resolvedUserId}`);
    res.json(limitedActivities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/users/:userId/points - Pontos do usuário
router.get('/users/:userId/points', async (req, res) => {
  console.log('🔥 ROTA /POINTS CHAMADA! userId:', req.params.userId);
  try {
    const { userId } = req.params;
    console.log('🎮 Gamification - req.user.id:', req.user.id);
    console.log('🎮 Gamification - userId from params:', userId);
    console.log('🎮 Gamification - req.user.role:', req.user.role);
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      console.log('❌ Gamification - Acesso negado');
      return res.status(403).json({ error: 'Acesso negado' });
    }

    console.log('✅ Gamification - Acesso permitido, buscando pontos...');
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', resolvedUserId);

    if (pointsError) {
      console.error('❌ Gamification - Erro ao buscar pontos:', pointsError);
    }

    let totalPoints = pointsData?.reduce((sum, point) => sum + point.amount, 0) || 0;
    console.log('🎮 Gamification - Total points found:', totalPoints);
    console.log('🎮 Gamification - Points data:', pointsData);
    
    // Dados reais do usuário - sem dados de demonstração

    const response = {
      total: totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      nextLevelPoints: ((Math.floor(totalPoints / 100) + 1) * 100) - totalPoints
    };
    
    console.log('🎮 Gamification - Sending response:', JSON.stringify(response, null, 2));
    console.log('🎮 Gamification - Response type:', typeof response.total);
    console.log('🎮 Gamification - Response total value:', response.total);
    console.log('🎮 Gamification - Response level value:', response.level);
    console.log('🎮 Gamification - Response nextLevelPoints value:', response.nextLevelPoints);
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
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário pode adicionar pontos (admin ou próprio usuário)
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
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
        user_id: resolvedUserId,
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
      .eq('user_id', resolvedUserId);

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
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário existe e se é o mesmo do token
    if (req.user.id !== resolvedUserId) {
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
        user_id: resolvedUserId,
        quiz_type: quizType,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        time_spent: timeSpent,
        points_earned: pointsEarned,
        answers: JSON.stringify(answers)
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
        user_id: resolvedUserId,
        amount: pointsEarned,
        reason: `Quiz da Constituição - ${correctAnswers}/${totalQuestions} acertos`,
        category: 'quiz',
        created_at: new Date().toISOString()
      });
    
    if (pointsError) {
      console.error('Erro ao adicionar pontos:', pointsError);
    }
    
    // Verificar conquistas
    const newAchievements = await checkAndUnlockAchievements(resolvedUserId, 'quiz_completed', {
      score: (correctAnswers / totalQuestions) * 100,
      correctAnswers,
      totalQuestions,
      timeSpent
    });

    // Verificar se subiu de nível
    const { data: allPoints } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', resolvedUserId);
    
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
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (req.user.id !== resolvedUserId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const offset = (page - 1) * limit;
    
    const { data: results, error, count } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact' })
      .eq('user_id', resolvedUserId)
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
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (req.user.id !== resolvedUserId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { data: results, error } = await supabase
      .from('quiz_results')
      .select('score, correct_answers, total_questions, time_spent, quiz_type')
      .eq('user_id', resolvedUserId);
    
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

// Função auxiliar para verificar e desbloquear conquistas automaticamente
async function checkAndUnlockAchievements(userId, actionType, actionData = {}) {
  try {
    console.log(`Verificando conquistas para usuário ${userId}, ação: ${actionType}`);
    
    // Buscar todas as conquistas disponíveis
    const allAchievements = [
      {
        id: 'first_quiz',
        name: 'Primeiro Quiz',
        description: 'Completou seu primeiro quiz da Constituição',
        category: 'learning',
        icon: '🌟',
        points: 20,
        rarity: 'common',
        requirements: [{ type: 'quiz_count', value: 1 }]
      },
      {
        id: 'perfect_score',
        name: 'Pontuação Perfeita',
        description: 'Acertou todas as questões em um quiz',
        category: 'learning',
        icon: '🏆',
        points: 50,
        rarity: 'rare',
        requirements: [{ type: 'quiz_score', value: 100 }]
      },
      {
        id: 'expert_level',
        name: 'Nível Expert',
        description: 'Obteve 90% ou mais de acertos em um quiz',
        category: 'learning',
        icon: '🎯',
        points: 30,
        rarity: 'uncommon',
        requirements: [{ type: 'quiz_score', value: 90 }]
      },
      {
        id: 'quiz_enthusiast',
        name: 'Entusiasta dos Quizzes',
        description: 'Completou 5 quizzes da Constituição',
        category: 'learning',
        icon: '📚',
        points: 40,
        rarity: 'uncommon',
        requirements: [{ type: 'quiz_count', value: 5 }]
      },
      {
        id: 'constitution_scholar',
        name: 'Estudioso da Constituição',
        description: 'Completou 10 quizzes da Constituição',
        category: 'learning',
        icon: '🎓',
        points: 60,
        rarity: 'epic',
        requirements: [{ type: 'quiz_count', value: 10 }]
      },
      {
        id: 'first_checkin',
        name: 'Primeiro Check-in',
        description: 'Fez seu primeiro check-in em uma manifestação',
        category: 'checkin',
        icon: '📍',
        points: 25,
        rarity: 'common',
        requirements: [{ type: 'checkin_count', value: 1 }]
      },
      {
        id: 'active_participant',
        name: 'Participante Ativo',
        description: 'Fez check-in em 10 manifestações',
        category: 'checkin',
        icon: '🎯',
        points: 100,
        rarity: 'uncommon',
        requirements: [{ type: 'checkin_count', value: 10 }]
      },
      {
        id: 'ai_conversationalist',
        name: 'Conversador IA',
        description: 'Teve 25 conversas com o DireitaIA',
        category: 'ai',
        icon: '🤖',
        points: 75,
        rarity: 'uncommon',
        requirements: [{ type: 'ai_conversation_count', value: 25 }]
      },
      {
        id: 'welcome',
        name: 'Bem-vindo!',
        description: 'Cadastrou-se na plataforma DireitaAI',
        category: 'special',
        icon: '👋',
        points: 50,
        rarity: 'common',
        requirements: [{ type: 'registration', value: 1 }]
      },
      {
        id: 'first_login',
        name: 'Primeiro Acesso',
        description: 'Realizou o primeiro login na plataforma',
        category: 'special',
        icon: '🚪',
        points: 25,
        rarity: 'common',
        requirements: [{ type: 'login', value: 1 }]
      }
    ];
    
    // Filtrar conquistas relevantes para a ação
    let relevantAchievements = [];
    
    switch (actionType) {
      case 'quiz_completed':
        relevantAchievements = allAchievements.filter(a => 
          a.requirements.some(req => req.type === 'quiz_count' || req.type === 'quiz_score')
        );
        break;
      case 'checkin_created':
        relevantAchievements = allAchievements.filter(a => 
          a.requirements.some(req => req.type === 'checkin_count')
        );
        break;
      case 'ai_conversation':
        relevantAchievements = allAchievements.filter(a => 
          a.requirements.some(req => req.type === 'ai_conversation_count')
        );
        break;
      case 'user_registered':
        relevantAchievements = allAchievements.filter(a => 
          a.requirements.some(req => req.type === 'registration')
        );
        break;
      case 'user_login':
        relevantAchievements = allAchievements.filter(a => 
          a.requirements.some(req => req.type === 'login')
        );
        break;
      default:
        return [];
    }
    
    const unlockedAchievements = [];
    
    for (const achievement of relevantAchievements) {
      // Verificar se já foi desbloqueada
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('*')
        .eq('user_id', userId)
        .or(`badge_type.eq.${achievement.id},achievement_id.eq.${achievement.id}`)
        .single();
      
      if (existingBadge) {
        continue; // Já desbloqueada
      }
      
      // Verificar se os requisitos foram atendidos
      let shouldUnlock = false;
      
      for (const requirement of achievement.requirements) {
        let currentValue = 0;
        
        switch (requirement.type) {
          case 'quiz_count':
            const { count: quizCount } = await supabase
              .from('quiz_results')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
            currentValue = quizCount || 0;
            break;
            
          case 'quiz_score':
            // Para pontuação, verificar se a ação atual atende o requisito
            if (actionType === 'quiz_completed' && actionData.score >= requirement.value) {
              currentValue = requirement.value;
            }
            break;
            
          case 'checkin_count':
            const { count: checkinCount } = await supabase
              .from('checkins')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
            currentValue = checkinCount || 0;
            break;
            
          case 'ai_conversation_count':
            const { count: conversationCount } = await supabase
              .from('ai_conversations')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
            currentValue = conversationCount || 0;
            break;
            
          case 'registration':
          case 'login':
            currentValue = 1; // Sempre 1 se a ação foi executada
            break;
            
          default:
            currentValue = 0;
        }
        
        if (currentValue >= requirement.value) {
          shouldUnlock = true;
        } else {
          shouldUnlock = false;
          break; // Se um requisito não foi atendido, não desbloquear
        }
      }
      
      if (shouldUnlock) {
        // Desbloquear a conquista
        const { data: newBadge, error } = await supabase
          .from('badges')
          .insert({
            user_id: userId,
            badge_type: achievement.id,
            achievement_id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            earned_at: new Date().toISOString()
          })
          .select()
          .single();
        
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
          
          // Registrar atividade
          await supabase
            .from('gamification_activities')
            .insert({
              user_id: userId,
              activity_type: 'achievement_unlocked',
              points: achievement.points,
              description: `Conquista desbloqueada: ${achievement.name}`,
              metadata: {
                achievement_id: achievement.id,
                achievement_name: achievement.name
              },
              created_at: new Date().toISOString()
            });
          
          unlockedAchievements.push({
            ...achievement,
            unlocked: true,
            unlockedAt: newBadge.earned_at,
            badge: newBadge
          });
          
          console.log(`Conquista desbloqueada: ${achievement.name} para usuário ${userId}`);
        }
      }
    }
    
    return unlockedAchievements;
  } catch (error) {
    console.error('Erro ao verificar conquistas:', error);
    return [];
  }
}

/**
 * Função auxiliar para verificar conquistas de quiz
 */
async function checkQuizAchievements(userId, quizResult) {
  const { score, correctAnswers, totalQuestions } = quizResult;
  const percentage = (correctAnswers / totalQuestions) * 100;
  
  // Usar a nova função unificada
  return await checkAndUnlockAchievements(userId, 'quiz_completed', {
    score: percentage,
    correctAnswers,
    totalQuestions
  });
}

// GET /gamification/users/:userId/points/transactions - Histórico de transações de pontos
router.get('/users/:userId/points/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = req.query;
    
    // Resolver o userId (aceita tanto auth_id quanto ID da tabela users)
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('points')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filtrar por data se fornecida
    if (since) {
      query = query.gte('created_at', since);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching points transactions:', error);
      return res.status(500).json({ error: 'Erro ao buscar transações' });
    }

    res.json(transactions || []);
  } catch (error) {
    console.error('Error fetching points transactions:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas para metas de usuários
router.get('/users/:userId/goals', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'monthly_points', period } = req.query;
    
    console.log('🎯 Goals - userId from params:', userId);
    console.log('🎯 Goals - type:', type);
    console.log('🎯 Goals - period:', period);
    
    const targetUserId = await resolveUserId(userId, req.user);
    console.log('🎯 Goals - targetUserId resolved:', targetUserId);
    
    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('goal_type', type)
      .order('created_at', { ascending: false });
    
    if (period === 'current') {
      const now = new Date();
      console.log('🎯 Goals - current period filter, now:', now.toISOString().split('T')[0]);
      query = query
        .lte('period_start', now.toISOString().split('T')[0])
        .gte('period_end', now.toISOString().split('T')[0]);
    }
    
    const { data: goals, error } = await query;
    
    if (error) {
      console.error('❌ Goals - Error fetching user goals:', error);
      return res.status(500).json({ error: 'Erro ao buscar metas do usuário' });
    }
    
    console.log('🎯 Goals - Found goals:', goals);
    console.log('🎯 Goals - Goals count:', goals?.length || 0);
    console.log('🎯 Goals - Sending response:', JSON.stringify(goals || [], null, 2));
    
    res.json(goals || []);
  } catch (error) {
    console.error('Error in goals endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/users/:userId/goals', async (req, res) => {
  try {
    const { userId } = req.params;
    const { goal_type = 'monthly_points', target_value, period_start, period_end } = req.body;
    
    const targetUserId = await resolveUserId(userId, req.user);
    
    if (!target_value) {
      return res.status(400).json({ error: 'target_value é obrigatório' });
    }
    
    const { data: goal, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: targetUserId,
        goal_type,
        target_value,
        current_value: 0,
        period_start: period_start || new Date().toISOString().split('T')[0],
        period_end: period_end || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        status: 'active',
        auto_generated: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user goal:', error);
      return res.status(500).json({ error: 'Erro ao criar meta do usuário' });
    }
    
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error in create goal endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/users/:userId/goals/:goalId', async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    const { current_value, status } = req.body;
    
    const targetUserId = await resolveUserId(userId, req.user);
    
    const updateData = {};
    if (current_value !== undefined) updateData.current_value = current_value;
    if (status !== undefined) updateData.status = status;
    
    const { data: goal, error } = await supabase
      .from('user_goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', targetUserId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user goal:', error);
      return res.status(500).json({ error: 'Erro ao atualizar meta do usuário' });
    }
    
    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }
    
    res.json(goal);
  } catch (error) {
    console.error('Error in update goal endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/users/:userId/goals/auto-create', async (req, res) => {
  try {
    const { userId } = req.params;
    const { user_level = 1 } = req.body;
    
    console.log('🎯 Auto-create goal - INÍCIO DA ROTA');
    console.log('🎯 Auto-create goal - userId from params:', userId);
    console.log('🎯 Auto-create goal - req.body:', req.body);
    console.log('🎯 Auto-create goal - user_level:', user_level);
    console.log('🎯 Auto-create goal - req.user.id:', req.user.id);
    console.log('🎯 Auto-create goal - req.user.auth_id:', req.user.auth_id);
    
    // Para user_goals, precisamos do ID da tabela public.users
    let targetUserId;
    if (userId === req.user.auth_id || userId === req.user.id) {
      // Se é o próprio usuário, usar o ID da tabela users
      targetUserId = req.user.id;
    } else {
      // Buscar o ID do usuário especificado na tabela users
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .single();
      
      targetUserId = dbUser?.id || userId;
    }
    
    console.log('🎯 Auto-create goal - targetUserId resolved:', targetUserId);
    
    // Verificar se já existe uma meta ativa para o mês atual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    console.log('🎯 Auto-create goal - Período:', { monthStart, monthEnd });
    
    const { data: existingGoal, error: searchError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('goal_type', 'monthly_points')
      .eq('period_start', monthStart)
      .eq('period_end', monthEnd)
      .eq('status', 'active')
      .single();
    
    console.log('🎯 Auto-create goal - Busca por meta existente:', { existingGoal, searchError });
    
    if (existingGoal) {
      console.log('🎯 Auto-create goal - Meta existente encontrada, retornando:', existingGoal);
      return res.json(existingGoal);
    }
    
    // Criar nova meta mensal
    const targetValue = Math.max(500, user_level * 100);
    console.log('🎯 Auto-create goal - Criando nova meta com target_value:', targetValue);
    
    const { data: newGoal, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: targetUserId,
        goal_type: 'monthly_points',
        target_value: targetValue,
        current_value: 0,
        period_start: monthStart,
        period_end: monthEnd,
        status: 'active',
        auto_generated: true
      })
      .select()
      .single();
    
    console.log('🎯 Auto-create goal - Resultado da inserção:', { newGoal, error });
    
    if (error) {
      console.error('❌ Auto-create goal - Erro ao criar meta:', error);
      return res.status(500).json({ error: 'Erro ao criar meta automática' });
    }
    
    console.log('✅ Auto-create goal - Meta criada com sucesso:', newGoal);
    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Error in auto-create goal endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// GET /gamification/users/:userId/achievements - Obter conquistas do usuário
router.get('/users/:userId/achievements', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar permissão
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar badges do usuário
    const { data: userBadges, error } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('earned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user badges:', error);
      return res.status(500).json({ error: 'Erro ao buscar conquistas do usuário' });
    }
    
    // Buscar todas as conquistas disponíveis
    const allAchievementsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/gamification/achievements`);
    const allAchievements = await allAchievementsResponse.json();
    
    // Mapear conquistas com status de desbloqueio
    const userAchievements = allAchievements.map(achievement => {
      const userBadge = userBadges?.find(badge => 
        badge.badge_type === achievement.id || badge.achievement_id === achievement.id
      );
      
      return {
        ...achievement,
        unlocked: !!userBadge,
        unlockedAt: userBadge?.earned_at || null,
        progress: userBadge ? 100 : 0 // Simplificado por enquanto
      };
    });
    
    // Filtrar por status se especificado
    let filteredAchievements = userAchievements;
    if (status === 'unlocked') {
      filteredAchievements = userAchievements.filter(a => a.unlocked);
    } else if (status === 'locked') {
      filteredAchievements = userAchievements.filter(a => !a.unlocked);
    }
    
    res.json(filteredAchievements);
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /gamification/users/:userId/achievements/:achievementId/progress - Verificar progresso de conquista
router.get('/users/:userId/achievements/:achievementId/progress', async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar permissão
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar a conquista específica
    const allAchievementsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/gamification/achievements`);
    const allAchievements = await allAchievementsResponse.json();
    const achievement = allAchievements.find(a => a.id === achievementId);
    
    if (!achievement) {
      return res.status(404).json({ error: 'Conquista não encontrada' });
    }
    
    // Verificar se já foi desbloqueada
    const { data: userBadge } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', resolvedUserId)
      .or(`badge_type.eq.${achievementId},achievement_id.eq.${achievementId}`)
      .single();
    
    if (userBadge) {
      return res.json({
        achievement,
        progress: 100,
        completed: true,
        requirements: achievement.requirements.map(req => ({
          requirement: req,
          progress: 100,
          completed: true
        }))
      });
    }
    
    // Calcular progresso baseado nos requisitos
    let progress = 0;
    const requirementProgress = [];
    
    for (const requirement of achievement.requirements) {
      let currentValue = 0;
      let reqProgress = 0;
      
      switch (requirement.type) {
        case 'quiz_count':
          const { count: quizCount } = await supabase
            .from('quiz_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', resolvedUserId);
          currentValue = quizCount || 0;
          break;
          
        case 'checkin_count':
          const { count: checkinCount } = await supabase
            .from('checkins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', resolvedUserId);
          currentValue = checkinCount || 0;
          break;
          
        case 'ai_conversation_count':
          const { count: conversationCount } = await supabase
            .from('ai_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', resolvedUserId);
          currentValue = conversationCount || 0;
          break;
          
        default:
          currentValue = 0;
      }
      
      reqProgress = Math.min(100, (currentValue / requirement.value) * 100);
      progress += reqProgress / achievement.requirements.length;
      
      requirementProgress.push({
        requirement,
        progress: reqProgress,
        completed: currentValue >= requirement.value,
        currentValue,
        targetValue: requirement.value
      });
    }
    
    res.json({
      achievement,
      progress: Math.round(progress),
      completed: progress >= 100,
      requirements: requirementProgress
    });
  } catch (error) {
    console.error('Error checking achievement progress:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /gamification/users/:userId/achievements/:achievementId/unlock - Desbloquear conquista
router.post('/users/:userId/achievements/:achievementId/unlock', async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar permissão
    if (req.user.id !== resolvedUserId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Verificar se a conquista existe
    const allAchievementsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/gamification/achievements`);
    const allAchievements = await allAchievementsResponse.json();
    const achievement = allAchievements.find(a => a.id === achievementId);
    
    if (!achievement) {
      return res.status(404).json({ error: 'Conquista não encontrada' });
    }
    
    // Verificar se já foi desbloqueada
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', resolvedUserId)
      .or(`badge_type.eq.${achievementId},achievement_id.eq.${achievementId}`)
      .single();
    
    if (existingBadge) {
      return res.status(400).json({ error: 'Conquista já foi desbloqueada' });
    }
    
    // Verificar se os requisitos foram atendidos
    const progressResponse = await fetch(
      `${req.protocol}://${req.get('host')}/api/gamification/users/${userId}/achievements/${achievementId}/progress`,
      { headers: { Authorization: req.headers.authorization } }
    );
    const progressData = await progressResponse.json();
    
    if (!progressData.completed) {
      return res.status(400).json({ 
        error: 'Requisitos não atendidos',
        progress: progressData.progress,
        requirements: progressData.requirements
      });
    }
    
    // Desbloquear a conquista
    const { data: newBadge, error } = await supabase
      .from('badges')
      .insert({
        user_id: resolvedUserId,
        badge_type: achievementId,
        achievement_id: achievementId,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earned_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error unlocking achievement:', error);
      return res.status(500).json({ error: 'Erro ao desbloquear conquista' });
    }
    
    // Adicionar pontos pela conquista
    await supabase
      .from('points')
      .insert({
        user_id: resolvedUserId,
        amount: achievement.points,
        reason: `Conquista: ${achievement.name}`,
        category: 'achievement',
        created_at: new Date().toISOString()
      });
    
    // Registrar atividade
    await supabase
      .from('gamification_activities')
      .insert({
        user_id: resolvedUserId,
        activity_type: 'achievement_unlocked',
        points: achievement.points,
        description: `Conquista desbloqueada: ${achievement.name}`,
        metadata: {
          achievement_id: achievement.id,
          achievement_name: achievement.name
        },
        created_at: new Date().toISOString()
      });
    
    res.status(201).json({
      ...achievement,
      unlocked: true,
      unlockedAt: newBadge.earned_at,
      badge: newBadge
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
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
module.exports.checkAndUnlockAchievements = checkAndUnlockAchievements;