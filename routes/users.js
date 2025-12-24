const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
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

// Update user profile (partial updates allowed)
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    console.log('📝 Profile update request for user:', req.user.id);
    console.log('📝 Request body:', req.body);

    const allowed = ['username', 'full_name', 'bio', 'city', 'state', 'phone', 'birth_date', 'avatar_url'];
    const updateData = { updated_at: new Date().toISOString() };

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        let val = req.body[key];
        if (typeof val === 'string') {
          val = val.trim();
          if (val.length === 0) val = null;
        }
        if (key === 'birth_date' && val) {
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            return res.status(400).json({ error: 'Invalid birth_date' });
          }
          // manter string (date) ou ISO curto YYYY-MM-DD conforme coluna
          const isoShort = d.toISOString().slice(0, 10);
          val = isoShort;
        }
        updateData[key] = val;
      }
    }

    const hasFields = Object.keys(updateData).some(k => k !== 'updated_at' && updateData[k] !== undefined);
    if (!hasFields) {
      console.log('❌ No updatable fields provided');
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (updateData.username && typeof updateData.username !== 'string' && updateData.username !== null) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    if (updateData.full_name && typeof updateData.full_name !== 'string' && updateData.full_name !== null) {
      return res.status(400).json({ error: 'Invalid full name' });
    }

    // Tentar atualizar por id da tabela; se não houver linha, tentar por auth_id
    let { data, error } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select();

    if ((!error && Array.isArray(data) && data.length === 0) || error?.code === 'PGRST116') {
      const authId = req.user.auth_id || req.user.id;
      const upd2 = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('auth_id', authId)
        .select();
      data = upd2.data;
      error = upd2.error;
    }

    if (error) {
      console.log('❌ Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }

    const updated = Array.isArray(data) ? (data[0] || null) : data;
    console.log('✅ Profile updated successfully:', updated);
    res.json({ message: 'Profile updated successfully', profile: updated });
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

    // Get AI conversations count
    const { count: aiConversationsCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const aiConversations = aiConversationsCount || 0;

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

    console.log('🏆 Ranking - Buscando ranking para usuário:', userId);

    // Get user's city for city-based ranking
    const { data: userData } = await supabase
      .from('users')
      .select('city, state')
      .eq('id', userId)
      .single();

    let userQuery = supabase
      .from('users')
      .select('id, username, full_name, city, state, avatar_url');

    // Apply scope filter
    if (scope === 'city' && userData?.city) {
      userQuery = userQuery.eq('city', userData.city);
    } else if (scope === 'state' && userData?.state) {
      userQuery = userQuery.eq('state', userData.state);
    }

    const { data: users, error: usersError } = await userQuery.limit(100);

    if (usersError) {
      console.error('❌ Ranking - Erro ao buscar usuários:', usersError);
      return res.status(400).json({ error: usersError.message });
    }

    // Calculate points for each user from points table
    const userIds = users.map(user => user.id);
    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('user_id, amount')
      .in('user_id', userIds);

    if (pointsError) {
      console.error('❌ Ranking - Erro ao buscar pontos:', pointsError);
    }

    // Calculate total points for each user
    const userPoints = {};
    if (pointsData) {
      pointsData.forEach(point => {
        if (!userPoints[point.user_id]) {
          userPoints[point.user_id] = 0;
        }
        userPoints[point.user_id] += point.amount;
      });
    }

    // Add points to users and sort by points
    const rankings = users.map(user => ({
      ...user,
      points: userPoints[user.id] || 0
    })).sort((a, b) => b.points - a.points);

    // Find user's position
    const userPosition = rankings.findIndex(user => user.id === userId) + 1;

    console.log('🏆 Ranking - Rankings calculados:', rankings.length, 'usuários');
    console.log('🏆 Ranking - Posição do usuário:', userPosition);

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
    console.log('🏅 Achievements - Buscando conquistas para usuário:', userId);

    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('❌ Achievements - Erro ao buscar badges:', error);
      return res.status(400).json({ error: error.message });
    }

    // Se não há badges, adicionar algumas conquistas iniciais
    if (!badges || badges.length === 0) {
      console.log('🏅 Achievements - Adicionando conquistas iniciais...');
      const initialBadges = [
        {
          user_id: userId,
          achievement_id: 'welcome',
          earned_at: new Date().toISOString()
        },
        {
          user_id: userId,
          achievement_id: 'first_login',
          earned_at: new Date().toISOString()
        }
      ];
      
      const { error: insertError } = await supabase
        .from('badges')
        .insert(initialBadges);
        
      if (!insertError) {
        badges.push(...initialBadges);
        console.log('✅ Achievements - Conquistas iniciais adicionadas');
      }
    }

    // Available achievements
    const allAchievements = [
      {
        id: 'welcome',
        name: 'Bem-vindo!',
        description: 'Cadastrou-se na plataforma DireitaAI',
        icon: '👋',
        category: 'onboarding',
        points: 50,
        rarity: 'comum',
      },
      {
        id: 'first_login',
        name: 'Primeiro Acesso',
        description: 'Realizou o primeiro login na plataforma',
        icon: '🚪',
        category: 'onboarding',
        points: 25,
        rarity: 'comum',
      },
      {
        id: 'constitution_download',
        name: 'Guardião da Constituição',
        description: 'Baixou a Constituição Federal',
        icon: '📜',
        category: 'education',
        points: 100,
        rarity: 'raro',
      },
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
      {
        id: 'survey_master',
        name: 'Mestre das Pesquisas',
        description: 'Responda 5 pesquisas diferentes',
        icon: '📊',
        category: 'engagement',
        points: 75,
        rarity: 'raro',
      },
      {
        id: 'politician_tracker',
        name: 'Rastreador Político',
        description: 'Visualize o perfil de 10 políticos diferentes',
        icon: '🔍',
        category: 'politics',
        points: 60,
        rarity: 'comum',
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

// Get user usage statistics
router.get('/usage-stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userPlan = req.user.plan || 'gratuito';
    


    // Get total AI conversations count
    const { count: totalConversations } = await adminSupabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get total fake news analyses count
    const { count: totalFakeNewsAnalyses } = await adminSupabase
      .from('fake_news_checks')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId);

    // Get today's usage for daily limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: todayConversations } = await adminSupabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    const { count: todayFakeNewsAnalyses } = await adminSupabase
      .from('fake_news_checks')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    // Get political agents usage - check if agents table exists, otherwise count unique conversation_ids
    let politicalAgentsUsed = 0;
    try {
      // Try to get unique conversation_ids from ai_conversations as a proxy for agent usage
      const { data: agentConversations, error: agentError } = await adminSupabase
        .from('ai_conversations')
        .select('conversation_id')
        .eq('user_id', userId);
      
      if (!agentError && agentConversations) {
        // Count unique conversation_ids as political agent usage
        const uniqueConversations = new Set(agentConversations.map(c => c.conversation_id));
        politicalAgentsUsed = uniqueConversations.size;
      }
    } catch (error) {
      console.log('Error counting political agents:', error);
      politicalAgentsUsed = 0;
    }

    // Calculate days remaining until plan renewal
    const { data: userProfile } = await supabase
      .from('users')
      .select('subscription_current_period_end, created_at')
      .eq('id', userId)
      .single();

    let daysRemaining = 0;
    const currentDate = new Date();
    
    if (userProfile?.subscription_current_period_end) {
      // Use subscription end date if available
      const expirationDate = new Date(userProfile.subscription_current_period_end);
      const timeDiff = expirationDate.getTime() - currentDate.getTime();
      daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    } else {
      // For users without subscription end date, calculate based on creation date + 30 days
      const creationDate = new Date(userProfile?.created_at || new Date());
      const renewalDate = new Date(creationDate);
      renewalDate.setDate(renewalDate.getDate() + 30);
      const timeDiff = renewalDate.getTime() - currentDate.getTime();
      daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }

    // Define limits based on plan (sincronizado com subscription_plans)
    const limits = {
      gratuito: {
        ai_conversations: 10,
        fake_news_analyses: 1,
        political_agents: 3
      },
      patriota: {
        ai_conversations: 20,
        fake_news_analyses: 2,
        political_agents: 1
      },
      engajado: {
        ai_conversations: 100,
        fake_news_analyses: 10,
        political_agents: 20
      },
      lider: {
        ai_conversations: -1, // unlimited
        fake_news_analyses: -1, // unlimited
        political_agents: -1 // unlimited
      },
      // Mapeamento para planos antigos/alternativos
      premium: {
        ai_conversations: 100,
        fake_news_analyses: 25,
        political_agents: 20
      },
      supremo: {
        ai_conversations: -1, // unlimited
        fake_news_analyses: -1, // unlimited
        political_agents: -1 // unlimited
      }
    };

    const planLimits = limits[userPlan] || limits.gratuito;

    res.json({
      plan: userPlan,
      daysRemaining,
      usage: {
        ai_conversations: {
          used: todayConversations || 0, // Usar uso diário para ser consistente com limites diários
          used_today: todayConversations || 0,
          used_total: totalConversations || 0, // Adicionar total histórico separadamente
          limit: planLimits.ai_conversations,
          remaining: planLimits.ai_conversations === -1 ? -1 : Math.max(0, planLimits.ai_conversations - (todayConversations || 0))
        },
        fake_news_analyses: {
          used: todayFakeNewsAnalyses || 0, // Usar uso diário para ser consistente com limites diários
          used_today: todayFakeNewsAnalyses || 0,
          used_total: totalFakeNewsAnalyses || 0, // Adicionar total histórico separadamente
          limit: planLimits.fake_news_analyses,
          remaining: planLimits.fake_news_analyses === -1 ? -1 : Math.max(0, planLimits.fake_news_analyses - (todayFakeNewsAnalyses || 0))
        },
        political_agents: {
          used: politicalAgentsUsed || 0, // Este já é um total, mas vamos manter consistência
          used_total: politicalAgentsUsed || 0,
          limit: planLimits.political_agents,
          remaining: planLimits.political_agents === -1 ? -1 : Math.max(0, planLimits.political_agents - (politicalAgentsUsed || 0))
        }
      }
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user usage history
router.get('/usage-history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get AI conversations history
    const { data: aiConversations, error: aiError } = await supabase
      .from('ai_conversations')
      .select('created_at, model_used')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (aiError) {
      console.error('Error fetching AI conversations:', aiError);
    }
    
    // Get fake news analyses history
    const { data: fakeNewsAnalyses, error: fakeNewsError } = await supabase
      .from('fake_news_checks')
      .select('created_at, resultado')
      .eq('usuario_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (fakeNewsError) {
      console.error('Error fetching fake news analyses:', fakeNewsError);
    }
    
    // Group data by date
    const dailyUsage = {};
    
    // Process AI conversations
    (aiConversations || []).forEach(conversation => {
      const date = conversation.created_at.split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = {
          date,
          ai_conversations: 0,
          fake_news_analyses: 0
        };
      }
      dailyUsage[date].ai_conversations++;
    });
    
    // Process fake news analyses
    (fakeNewsAnalyses || []).forEach(analysis => {
      const date = analysis.created_at.split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = {
          date,
          ai_conversations: 0,
          fake_news_analyses: 0
        };
      }
      dailyUsage[date].fake_news_analyses++;
    });
    
    // Convert to array and fill missing dates
    const history = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      history.push(dailyUsage[dateStr] || {
        date: dateStr,
        ai_conversations: 0,
        fake_news_analyses: 0
      });
    }
    
    res.json({
      period: `${days} days`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      history
    });
  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user plan information
router.get('/plan-info', authenticateUser, async (req, res) => {
  try {
    const userPlan = req.user.plan || 'gratuito';
    const subscriptionStatus = req.user.subscription_status || 'inactive';
    const billingCycle = req.user.billing_cycle || 'monthly';

    // Define plan details
    const planDetails = {
      gratuito: {
        name: 'Gratuito',
        price: 0,
        features: [
          '10 conversas diárias com IA',
          '1 análise de fake news por dia',
          'Acesso básico aos políticos',
          'Check-in em eventos'
        ],
        limits: {
          ai_conversations: 10,
          fake_news_analyses: 1
        }
      },
      cidadao: {
        name: 'Patriota Cidadão',
        price: 19.90,
        features: [
          'Chat DireitaGPT ilimitado',
          'IA Criativa: até 20 textos por dia',
          'Detector de Fake News: 5 análises por dia',
          'Até 3 agentes políticos',
          'Ranking local e check-in em eventos',
          'Suporte prioritário'
        ],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: 5
        }
      },
      premium: {
        name: 'Patriota Premium',
        price: 39.90,
        features: [
          'Chat DireitaGPT ilimitado',
          'IA Criativa: até 50 textos por dia',
          'Detector de Fake News: 15 análises por dia',
          'Agentes políticos ilimitados',
          'Ranking nacional e global',
          'Relatórios simples'
        ],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: 15
        }
      },
      pro: {
        name: 'Patriota Pro',
        price: 69.90,
        features: [
          'Chat DireitaGPT ilimitado',
          'IA Criativa: até 100 textos por dia',
          'Detector de Fake News: 20 análises por dia',
          'Agentes políticos ilimitados',
          'Relatórios avançados semanais',
          'Pontos em dobro na gamificação',
          'Suporte 24/7'
        ],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: 20
        }
      },
      elite: {
        name: 'Patriota Elite',
        price: 119.90,
        features: [
          'Chat DireitaGPT ilimitado',
          'IA Criativa: até 100 textos por dia',
          'Detector de Fake News: 30 análises por dia',
          'Agentes políticos ilimitados',
          'Relatórios avançados + badge VIP',
          'Suporte premium'
        ],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: 30
        }
      }
    };

    const currentPlan = planDetails[userPlan] || planDetails.gratuito;

    // Calculate next billing date (mock data for now)
    let nextBilling = null;
    if (subscriptionStatus === 'active' && userPlan !== 'gratuito') {
      const now = new Date();
      if (billingCycle === 'yearly') {
        nextBilling = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else {
        // Para cálculo mensal, usar o construtor Date para evitar problemas com datas inválidas
        const nextMonth = now.getMonth() + 1;
        const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
        const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
        
        // Ajustar o dia para evitar problemas com meses que têm menos dias
        const lastDayOfNextMonth = new Date(nextYear, adjustedMonth + 1, 0).getDate();
        const dayToUse = Math.min(now.getDate(), lastDayOfNextMonth);
        
        nextBilling = new Date(nextYear, adjustedMonth, dayToUse);
      }
    }

    res.json({
      name: currentPlan.name,
      price: currentPlan.price,
      billingCycle: billingCycle,
      nextBilling: nextBilling ? nextBilling.toISOString() : null,
      current_plan: userPlan,
      subscription_status: subscriptionStatus,
      plan_details: currentPlan,
      available_plans: planDetails
    });
  } catch (error) {
    console.error('Get plan info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get online users
router.get('/online', async (req, res) => {
  try {
    // Para demonstração, vamos retornar usuários que fizeram login recentemente
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, full_name, city, state, latitude, longitude, last_login')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('last_login', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24 horas
      .order('last_login', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Get online users error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(users || []);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;