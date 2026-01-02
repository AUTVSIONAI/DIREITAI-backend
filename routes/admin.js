const express = require('express');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { adminSupabase } = require('../config/supabase'); // Usar service role key
const router = express.Router();

// Alias para manter compatibilidade
const supabase = adminSupabase;

// Usar supabase global para operações que não precisam de service role
const getSupabase = () => global.supabase || {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase não disponível' } }),
    update: () => Promise.resolve({ data: null, error: { message: 'Supabase não disponível' } }),
    delete: () => Promise.resolve({ data: null, error: { message: 'Supabase não disponível' } })
  })
};

// Get all notifications (Admin)
router.get('/notifications', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { read, priority, search, limit = 20, offset = 0 } = req.query;

    let query = adminSupabase
      .from('notifications')
      .select(`
        *,
        users (
          username,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (read !== undefined) {
      query = query.eq('is_read', read === 'true');
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const { data: notifications, count, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get unread count
    const { count: unreadCount } = await adminSupabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);

    res.json({
      notifications,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Broadcast notification (Admin)
router.post('/notifications/broadcast', authenticateUser, authenticateAdmin, async (req, res) => {
  console.log('📢 Recebendo requisição de broadcast:', JSON.stringify(req.body, null, 2));
  try {
    const { title, message, type = 'info', category = 'system', targetUsers, targetRoles, channels, priority = 'medium' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    let userIds = [];

    // Se usuários específicos foram selecionados
    if (targetUsers && targetUsers.length > 0) {
      console.log(`🎯 Alvo: ${targetUsers.length} usuários específicos`);
      userIds = targetUsers;
    } else if (targetRoles && targetRoles.length > 0) {
      console.log(`🎯 Alvo: Roles ${targetRoles.join(', ')}`);
      // Se roles foram selecionados
              let query = adminSupabase.from('users').select('id');
              
              const rolesConditions = [];
              
              // Mapear roles para condições do banco
              for (const role of targetRoles) {
                if (role === 'admin') {
                  rolesConditions.push('role.eq.admin');
                  rolesConditions.push('is_admin.eq.true');
                } else {
                  // Assumindo que o valor do role no frontend corresponde ao valor no banco
                  // Ex: 'lawyer', 'client'
                  rolesConditions.push(`role.eq.${role}`);
                }
              }
              
              if (rolesConditions.length > 0) {
                query = query.or(rolesConditions.join(','));
              }
              
              const { data: users, error } = await query;
              if (error) {
                console.error('Error fetching users by role:', error);
                throw error;
              }
              userIds = users.map(u => u.id);
              console.log(`✅ Encontrados ${userIds.length} usuários para as roles selecionadas`);
            } else {
      console.log('🎯 Alvo: Todos os usuários');
      // Broadcast para todos (se targetUsers e targetRoles vazios)
      // CUIDADO: Em produção, isso deve ser feito via job queue
      let query = adminSupabase.from('users').select('id');
      const { data: users, error } = await query;
      if (error) throw error;
      userIds = users.map(u => u.id);
      console.log(`✅ Encontrados ${userIds.length} usuários no total`);
    }

    if (userIds.length === 0) {
      console.log('⚠️ Nenhum usuário alvo encontrado');
      return res.status(400).json({ error: 'No target users found' });
    }

    // Preparar notificações para inserção em massa
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      category,
      priority,
      is_read: false,
      created_at: new Date().toISOString(),
      // Se houver campos extras como data ou link, adicionar aqui se o schema permitir
      // data: { channels } 
    }));

    console.log(`📨 Preparando para inserir ${notifications.length} notificações...`);

    // Inserir em batches para evitar limites
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE);
      const { error } = await adminSupabase
        .from('notifications')
        .insert(batch);
      
      if (error) {
        console.error('❌ Erro ao inserir lote de notificações:', error);
        // Continuar tentando outros batches ou falhar?
        // Por enquanto, logamos e continuamos
      } else {
        successCount += batch.length;
        console.log(`✅ Lote ${i/BATCH_SIZE + 1} inserido com sucesso (${batch.length} itens)`);
      }
    }

    if (successCount === 0 && notifications.length > 0) {
        throw new Error('Falha ao inserir notificações no banco de dados');
    }

    res.json({ 
      message: 'Broadcast notification queued successfully', 
      count: successCount,
      notificationId: 'broadcast-' + Date.now() 
    });
  } catch (error) {
    console.error('❌ Broadcast notification error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Mark notification as read (Admin)
router.patch('/notifications/:id/read', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await adminSupabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read (Admin)
router.patch('/notifications/read-all', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { error } = await adminSupabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);

    if (error) throw error;
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard overview statistics
router.get('/overview', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get user statistics - usar service role key para operações administrativas
    const { data: userStats } = await adminSupabase
      .from('users')
      .select('plan, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const activeUsers = userStats?.length || 0;
    const newUsersThisMonth = userStats?.filter(u => 
      new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    // Get check-in statistics (combining checkins and geographic_checkins)
    const { data: checkinStats } = await adminSupabase
      .from('checkins')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: geoCheckinStats } = await adminSupabase
      .from('geographic_checkins')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const checkinsToday = (checkinStats?.length || 0) + (geoCheckinStats?.length || 0);

    // Get event statistics
    const { data: eventStats } = await adminSupabase
      .from('events')
      .select('status, created_at')
      .eq('status', 'active');

    const activeEvents = eventStats?.length || 0;

    // Get revenue statistics (mock data for now)
    const revenue = {
      today: 1250.00,
      thisMonth: 15750.00,
      growth: 12.5
    };

    // Get AI conversation statistics
    const { data: aiStats } = await adminSupabase
      .from('ai_conversations')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const aiConversationsToday = aiStats?.length || 0;

    // Get moderation statistics
    const { data: moderationStats } = await adminSupabase
      .from('content_moderation')
      .select('status')
      .eq('status', 'pending');

    const pendingModeration = moderationStats?.length || 0;

    // Get recent events
    const { data: recentEvents } = await adminSupabase
      .from('events')
      .select('id, title, location, city, state, current_participants, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get top cities by user count
    const { data: topCities } = await adminSupabase
      .from('users')
      .select('city, state')
      .not('city', 'is', null)
      .neq('city', '')
      .limit(1000);

    // Count users by city
    const cityStats = {};
    topCities?.forEach(user => {
      const key = `${user.city}, ${user.state}`;
      cityStats[key] = (cityStats[key] || 0) + 1;
    });

    const topCitiesFormatted = Object.entries(cityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cityState, count]) => {
        const [city, state] = cityState.split(', ');
        return { city, state, users: count, growth: '+0%' };
      });

    // Get recent activities (simplified)
    const recentActivities = [
      {
        id: 1,
        type: 'user_join',
        message: `${newUsersThisMonth} novos usuários se registraram este mês`,
        time: 'hoje'
      },
      {
        id: 2,
        type: 'event_checkin',
        message: `${checkinsToday} check-ins realizados hoje`,
        time: 'hoje'
      },
      {
        id: 3,
        type: 'ai_conversation',
        message: `${aiConversationsToday} conversas com IA iniciadas hoje`,
        time: 'hoje'
      }
    ];

    res.json({
      statistics: {
        activeUsers,
        newUsersThisMonth,
        checkinsToday,
        activeEvents,
        revenue,
        aiConversationsToday,
        pendingModeration
      },
      recentEvents: recentEvents || [],
      topCities: topCitiesFormatted,
      recentActivities,
      systemHealth: {
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
        uptime: '99.9%'
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User management
router.get('/users', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { plan, status, search, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('users')
      .select(`
        id,
        auth_id,
        email,
        username,
        full_name,
        plan,
        banned,
        is_admin,
        created_at,
        last_login,
        points,
        city,
        state
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (plan) {
      query = query.eq('plan', plan);
    }

    if (search) {
      // Sanitize search to prevent PostgREST syntax errors with commas
      const sanitizedSearch = search.replace(/,/g, ' ');
      query = query.or(`email.ilike.%${sanitizedSearch}%,username.ilike.%${sanitizedSearch}%,full_name.ilike.%${sanitizedSearch}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Optimization: Fetch stats for all users in parallel (bulk) instead of N+1
    const userIds = users.map(u => u.id);
    const authIds = users.map(u => u.auth_id).filter(id => id); // valid auth_ids
    const allIds = [...new Set([...userIds, ...authIds])]; // unique IDs to query

    if (allIds.length > 0) {
      const [checkinsRes, geoCheckinsRes, conversationsRes] = await Promise.all([
        adminSupabase
          .from('checkins')
          .select('user_id')
          .in('user_id', allIds),
        adminSupabase
          .from('geographic_checkins')
          .select('user_id')
          .in('user_id', allIds),
        adminSupabase
          .from('ai_conversations')
          .select('user_id')
          .in('user_id', allIds)
      ]);

      const checkinsMap = {};
      const geoCheckinsMap = {};
      const conversationsMap = {};

      // Helper to aggregate counts
      const addToMap = (data, map) => {
        data?.forEach(item => {
          map[item.user_id] = (map[item.user_id] || 0) + 1;
        });
      };

      addToMap(checkinsRes.data, checkinsMap);
      addToMap(geoCheckinsRes.data, geoCheckinsMap);
      addToMap(conversationsRes.data, conversationsMap);

      const usersWithStats = users.map(user => {
        // Count for both id and auth_id
        const getCount = (map) => {
          let count = map[user.id] || 0;
          if (user.auth_id && user.auth_id !== user.id) {
            count += map[user.auth_id] || 0;
          }
          return count;
        };

        return {
          ...user,
          status: user.banned ? 'banned' : 'active',
          stats: {
            checkins: getCount(checkinsMap) + getCount(geoCheckinsMap),
            conversations: getCount(conversationsMap)
          }
        };
      });

      res.json({ users: usersWithStats });
    } else {
       // Should not happen if users found, but safe fallback
       res.json({ users: users.map(u => ({ ...u, status: u.banned ? 'banned' : 'active', stats: { checkins: 0, conversations: 0 } })) });
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user details
router.get('/users/:userId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Tentar buscar por id ou auth_id
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('*')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Helper to add ID filter
    const addIdFilter = (query) => {
        if (user.auth_id) {
            return query.or(`user_id.eq.${user.id},user_id.eq.${user.auth_id}`);
        }
        return query.eq('user_id', user.id);
    };

    // Get user's check-ins (from both tables)
    const { data: eventCheckins } = await addIdFilter(adminSupabase
      .from('checkins')
      .select(`
        *,
        events (
          title,
          location
        )
      `))
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: geoCheckins } = await addIdFilter(adminSupabase
      .from('geographic_checkins')
      .select(`
        *,
        manifestations (
          name,
          city,
          state
        )
      `))
      .order('created_at', { ascending: false })
      .limit(10);

    // Normalize and combine checkins
    const normalizedEventCheckins = (eventCheckins || []).map(c => ({
      id: c.id,
      type: 'event',
      name: c.events?.title || 'Evento Desconhecido',
      location: c.events?.location,
      created_at: c.created_at
    }));

    const normalizedGeoCheckins = (geoCheckins || []).map(c => ({
      id: c.id,
      type: 'manifestation',
      name: c.manifestations?.name || 'Manifestação Desconhecida',
      location: c.manifestations ? `${c.manifestations.city}, ${c.manifestations.state}` : null,
      created_at: c.created_at || c.checked_in_at // Use checked_in_at if created_at is missing
    }));

    const allCheckins = [...normalizedEventCheckins, ...normalizedGeoCheckins]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // Get user's AI conversations
    const { data: conversations } = await addIdFilter(adminSupabase
      .from('ai_conversations')
      .select('*'))
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's orders
    const { data: orders } = await addIdFilter(adminSupabase
      .from('orders')
      .select('*'))
      .order('created_at', { ascending: false })
      .limit(10);

    // Get total check-in counts
    const { count: eventCheckinsCount } = await addIdFilter(adminSupabase
      .from('checkins')
      .select('id', { count: 'exact', head: true }));

    const { count: geoCheckinsCount } = await addIdFilter(adminSupabase
      .from('geographic_checkins')
      .select('id', { count: 'exact', head: true }));

    res.json({
      user,
      activity: {
        checkins: allCheckins,
        conversations: conversations || [],
        orders: orders || []
      },
      stats: {
        totalCheckins: (eventCheckinsCount || 0) + (geoCheckinsCount || 0),
        totalConversations: conversations?.length || 0, // Should probably be a separate count query
        totalPoints: user.points || 0
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:userId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      full_name, 
      username, 
      email, 
      city, 
      state, 
      plan, 
      is_admin, 
      points 
    } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (full_name !== undefined) updateData.full_name = full_name;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (plan !== undefined) updateData.plan = plan;
    if (is_admin !== undefined) updateData.is_admin = is_admin;
    if (points !== undefined) updateData.points = points;

    // Tentar atualizar por id ou auth_id
    const { data: user, error } = await adminSupabase
      .from('users')
      .update(updateData)
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/unban user
router.patch('/users/:userId/ban', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    console.log(`🚫 Tentando banir usuário: ${userId}`);

    // Primeiro verificar se o usuário existe
    const { data: existingUser, error: checkError } = await adminSupabase
      .from('users')
      .select('id, email, full_name')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .single();

    if (checkError || !existingUser) {
      console.log(`❌ Usuário não encontrado: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Usuário encontrado: ${existingUser.email}`);

    const { data: user, error } = await adminSupabase
      .from('users')
      .update({ 
        banned: true,
        ban_reason: reason || 'Banido pelo administrador',
        banned_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (error) {
      console.log(`❌ Erro ao banir usuário: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Usuário banido com sucesso: ${user.email}`);

    res.json({ 
      user, 
      message: 'User banned successfully'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:userId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🗑️ Tentando excluir usuário: ${userId}`);

    // Primeiro, verificar se o usuário existe
    const { data: existingUser, error: checkError } = await adminSupabase
      .from('users')
      .select('id, email, full_name')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .single();

    if (checkError || !existingUser) {
      console.log(`❌ Usuário não encontrado para exclusão: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Usuário encontrado para exclusão: ${existingUser.email}`);

    // Deletar o usuário
    const { error } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', existingUser.id);

    if (error) {
      console.log(`❌ Erro ao excluir usuário: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Usuário excluído com sucesso: ${existingUser.email}`);

    res.json({ 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Content moderation
router.get('/moderation', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { status = 'pending', category, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('content_moderation')
      .select(`
        *,
        users (
          username,
          email,
          plan
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: content, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ content });
  } catch (error) {
    console.error('Get moderation content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Moderate content
router.put('/moderation/:contentId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: content, error } = await adminSupabase
      .from('content_moderation')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        moderated_by: req.user.id,
        moderated_at: new Date().toISOString(),
        moderation_reason: reason
      })
      .eq('id', contentId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      content, 
      message: `Content ${action}d successfully` 
    });
  } catch (error) {
    console.error('Moderate content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Store management - Get all products
router.get('/store/products', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { category, status, search, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (status === 'active') {
      query = query.eq('active', true);
    } else if (status === 'inactive') {
      query = query.eq('active', false);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/store/products', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock_quantity, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const { data: product, error } = await adminSupabase
      .from('products')
      .insert([
        {
          name,
          description,
          price: parseFloat(price),
          category,
          stock_quantity: parseInt(stock_quantity) || 0,
          image,
          active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ product, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/store/products/:productId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, stock_quantity, image, active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity);
    if (image !== undefined) updateData.image = image;
    if (active !== undefined) updateData.active = active;

    const { data: product, error } = await adminSupabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ product, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/store/products/:productId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    const { error } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders
router.get('/store/orders', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('orders')
      .select(`
        *,
        users (
          username,
          email
        ),
        order_items (
          *
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`id.ilike.%${search}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.put('/store/orders/:orderId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, tracking_code } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (tracking_code) updateData.tracking_code = tracking_code;

    const { data: order, error } = await adminSupabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Financial reports
router.get('/reports/financial', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get orders for the period
    const { data: orders } = await adminSupabase
      .from('orders')
      .select('total, created_at, status')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const orderCount = orders?.length || 0;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Get subscription revenue (mock data)
    const subscriptionRevenue = {
      cidadao: 15750.00,
      premium: 4900.00,
      pro: 8900.00,
      elite: 12900.00
    };

    // Get top products
    const { data: topProducts } = await adminSupabase
      .from('order_items')
      .select(`
        product_name,
        quantity,
        price
      `)
      .gte('created_at', startDate.toISOString());

    const productSales = {};
    topProducts?.forEach(item => {
      if (!productSales[item.product_name]) {
        productSales[item.product_name] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[item.product_name].quantity += item.quantity;
      productSales[item.product_name].revenue += item.price * item.quantity;
    });

    const topProductsList = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      summary: {
        totalRevenue,
        orderCount,
        averageOrderValue,
        subscriptionRevenue
      },
      topProducts: topProductsList,
      period
    });
  } catch (error) {
    console.error('Financial reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System settings
router.get('/settings', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Buscar configurações do banco de dados
    const { data: settingsData, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Converter array de configurações em objeto
    const settings = {};
    settingsData.forEach(setting => {
      settings[setting.key] = setting.value;
    });

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update system settings
router.put('/settings', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    // Atualizar cada configuração no banco de dados
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);
      
      if (error) {
        console.error(`Error updating ${key}:`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);

    res.json({ 
      settings, 
      message: 'Settings updated successfully' 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// API logs
router.get('/logs', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { level, limit = 100, offset = 0 } = req.query;

    // Mock API logs data
    const logs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        method: 'POST',
        endpoint: '/api/auth/login',
        status: 200,
        response_time: 145,
        user_id: 'user123',
        ip: '192.168.1.1'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'error',
        method: 'GET',
        endpoint: '/api/events/123',
        status: 404,
        response_time: 23,
        user_id: 'user456',
        ip: '192.168.1.2',
        error: 'Event not found'
      }
    ];

    const filteredLogs = level ? logs.filter(log => log.level === level) : logs;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    res.json({ logs: paginatedLogs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create announcement
router.post('/announcements', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { title, content, type, target_audience } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const { data: announcement, error } = await adminSupabase
      .from('announcements')
      .insert([
        {
          title,
          content,
          type: type || 'info',
          target_audience: target_audience || 'all',
          created_by: req.user.id,
          active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ announcement, message: 'Announcement created successfully' });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get announcements
router.get('/announcements', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { active, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('announcements')
      .select(`
        *,
        users (
          username
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    const { data: announcements, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Live Map endpoints
router.get('/live-map/users', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get users with real location data
    const { data: users, error } = await adminSupabase
      .from('users')
      .select(`
        id,
        username,
        email,
        plan,
        city,
        state,
        latitude,
        longitude,
        last_login
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('last_login', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const formattedUsers = users.map((user) => {
      return {
        id: user.id,
        username: user.username || user.email.split('@')[0],
        location: {
          city: user.city,
          state: user.state,
          lat: user.latitude,
          lng: user.longitude
        },
        status: 'online',
        lastActivity: user.last_login,
        plan: user.plan || 'gratuito'
      };
    });

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Live map users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live-map/events', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get active events with real location data
    const { data: activeEvents, error } = await adminSupabase
      .from('events')
      .select(`
        id,
        title,
        description,
        location,
        city,
        state,
        latitude,
        longitude,
        start_time,
        end_time,
        status,
        current_participants
      `)
      .eq('status', 'active')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('start_time', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const formattedEvents = activeEvents.map((event) => ({
      id: event.id,
      title: event.title,
      location: {
        city: event.city,
        state: event.state,
        lat: event.latitude,
        lng: event.longitude
      },
      participants: event.current_participants || 0,
      status: event.status,
      startTime: event.start_time,
      endTime: event.end_time
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Live map events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live-map/stats', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get statistics by city
    const { data: cityStats, error } = await adminSupabase
      .rpc('get_city_statistics');

    if (error) {
      // If the RPC function doesn't exist, create basic stats
      const { data: users } = await adminSupabase
        .from('users')
        .select('city, state')
        .not('city', 'is', null);

      const { data: events } = await adminSupabase
        .from('events')
        .select('city, state')
        .not('city', 'is', null);

      const { data: checkins } = await adminSupabase
        .from('checkins')
        .select('event_id, events(city, state)')
        .not('events.city', 'is', null);

      // Group by city
      const cityMap = new Map();
      
      users?.forEach(user => {
        const key = `${user.city}, ${user.state}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, { city: user.city, state: user.state, users: 0, events: 0, checkins: 0 });
        }
        cityMap.get(key).users++;
      });

      events?.forEach(event => {
        const key = `${event.city}, ${event.state}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, { city: event.city, state: event.state, users: 0, events: 0, checkins: 0 });
        }
        cityMap.get(key).events++;
      });

      checkins?.forEach(checkin => {
        if (checkin.events) {
          const key = `${checkin.events.city}, ${checkin.events.state}`;
          if (cityMap.has(key)) {
            cityMap.get(key).checkins++;
          }
        }
      });

      const formattedStats = Array.from(cityMap.values())
        .sort((a, b) => b.users - a.users)
        .slice(0, 10);

      return res.json({ stats: formattedStats });
    }

    res.json({ stats: cityStats });
  } catch (error) {
    console.error('Live map stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live-map/realtime', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get real-time statistics
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Online users count
    const { data: onlineUsersCount } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('last_login', thirtyMinutesAgo);

    // Active events count
    const { data: activeEventsCount } = await adminSupabase
      .from('events')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    // Today's checkins count
    const { data: todayCheckinsCount } = await adminSupabase
      .from('checkins')
      .select('id', { count: 'exact' })
      .gte('checked_in_at', today);

    res.json({
      onlineUsers: onlineUsersCount?.length || 0,
      activeEvents: activeEventsCount?.length || 0,
      totalCheckins: todayCheckinsCount?.length || 0,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Live map realtime error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get city statistics
router.get('/city-stats', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get user distribution by city
    const { data: usersByCity, error: usersError } = await adminSupabase
      .from('users')
      .select('city, state')
      .not('city', 'is', null)
      .not('state', 'is', null);

    if (usersError) {
      console.error('Get users by city error:', usersError);
      return res.status(400).json({ error: usersError.message });
    }

    // Get events distribution by city
    const { data: eventsByCity, error: eventsError } = await adminSupabase
      .from('events')
      .select('city, state')
      .not('city', 'is', null)
      .not('state', 'is', null);

    if (eventsError) {
      console.error('Get events by city error:', eventsError);
      return res.status(400).json({ error: eventsError.message });
    }

    // Aggregate statistics by city
    const cityStats = {};
    
    // Count users by city
    usersByCity?.forEach(user => {
      const key = `${user.city}, ${user.state}`;
      if (!cityStats[key]) {
        cityStats[key] = { city: user.city, state: user.state, users: 0, events: 0 };
      }
      cityStats[key].users++;
    });

    // Count events by city
    eventsByCity?.forEach(event => {
      const key = `${event.city}, ${event.state}`;
      if (!cityStats[key]) {
        cityStats[key] = { city: event.city, state: event.state, users: 0, events: 0 };
      }
      cityStats[key].events++;
    });

    // Convert to array and sort by total activity
    const statsArray = Object.values(cityStats)
      .map(stat => ({
        ...stat,
        total: stat.users + stat.events
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // Top 20 cities

    res.json(statsArray);
  } catch (error) {
    console.error('Get city stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upgrade user plan
router.put('/users/:userId/upgrade-plan', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPlan } = req.body;

    // Validate plan
    const validPlans = ['gratuito', 'cidadao', 'premium', 'pro', 'elite'];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan specified' });
    }

    // Update user plan
    const { data: updatedUser, error } = await adminSupabase
      .from('users')
      .update({ 
        plan: newPlan,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, name, plan')
      .single();

    if (error) {
      console.error('Upgrade user plan error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the upgrade action
    console.log(`Admin ${req.user.id} upgraded user ${userId} to plan ${newPlan}`);

    res.json({
      message: 'User plan upgraded successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Upgrade user plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Notifications Routes
// Get all notifications for admin dashboard
router.get('/notifications', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, is_read } = req.query;
    const offset = (page - 1) * limit;

    // Usar service role key para operações administrativas
    let query = adminSupabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Get admin notifications error:', error);
      return res.status(400).json({ error: error.message });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      notifications: notifications || [],
      total: count || 0,
      totalPages,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send broadcast notification
router.post('/notifications/broadcast', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 Broadcast route - starting');
    const {
      title,
      message,
      type = 'info',
      priority = 'medium',
      targetUsers,
      targetRoles,
      channels = ['in_app'],
      scheduledFor
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Usar service role key para operações administrativas
    let userIds = [];

    // Get target users
    if (targetUsers && targetUsers.length > 0) {
      userIds = targetUsers;
    } else if (targetRoles && targetRoles.length > 0) {
      // Get users by roles
      const { data: users, error: usersError } = await adminSupabase
        .from('users')
        .select('id')
        .in('role', targetRoles);
      
      if (usersError) {
        return res.status(400).json({ error: usersError.message });
      }
      
      userIds = users?.map(u => u.id) || [];
    } else {
      // Broadcast to all users
      const { data: users, error: usersError } = await adminSupabase
        .from('users')
        .select('id');
      
      if (usersError) {
        return res.status(400).json({ error: usersError.message });
      }
      
      userIds = users?.map(u => u.id) || [];
    }

    if (userIds.length === 0) {
      return res.status(400).json({ error: 'No target users found' });
    }

    // Create notifications for each user
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      category: 'system', // Usar categoria válida
      title,
      message,
      priority,
      scheduled_for: scheduledFor || null,
      created_at: new Date().toISOString()
    }));

    const { data: createdNotifications, error } = await adminSupabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Create broadcast notifications error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Log the broadcast action
    console.log(`Admin ${req.user.id} sent broadcast notification to ${userIds.length} users`);

    res.status(201).json({
      notificationId: createdNotifications?.[0]?.id,
      status: 'sent',
      message: `Notification sent to ${userIds.length} users`,
      recipients: userIds.length
    });
  } catch (error) {
    console.error('Send broadcast notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification statistics
router.get('/notifications/stats', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Usar service role key para operações administrativas
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get total notifications
    const { count: totalNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    // Get sent notifications (notifications with sent_at)
    const { count: sentNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .not('sent_at', 'is', null);

    // Get pending notifications (scheduled but not sent)
    const { count: pendingNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .not('scheduled_for', 'is', null)
      .is('sent_at', null)
      .gte('scheduled_for', new Date().toISOString());

    // Get failed notifications from notification_queue
    const { count: failedNotifications } = await adminSupabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Get today's notifications
    const { count: todayNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get this week's notifications
    const { count: weekNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisWeek);

    // Get this month's notifications
    const { count: monthNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonth);

    // Get unread notifications count
    const { count: unreadNotifications } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    // Get notifications by type
    const { data: notificationsByType } = await adminSupabase
      .from('notifications')
      .select('type')
      .gte('created_at', thisMonth);

    const typeStats = {};
    notificationsByType?.forEach(n => {
      typeStats[n.type] = (typeStats[n.type] || 0) + 1;
    });

    // Get notifications by category
    const { data: notificationsByCategory } = await adminSupabase
      .from('notifications')
      .select('category')
      .gte('created_at', thisMonth);

    const categoryStats = {};
    notificationsByCategory?.forEach(n => {
      categoryStats[n.category] = (categoryStats[n.category] || 0) + 1;
    });

    // Get queue statistics
    const { data: queueStats } = await adminSupabase
      .from('notification_queue')
      .select('status, channel')
      .gte('created_at', thisMonth);

    const queueByStatus = {};
    const queueByChannel = {};
    queueStats?.forEach(q => {
      queueByStatus[q.status] = (queueByStatus[q.status] || 0) + 1;
      queueByChannel[q.channel] = (queueByChannel[q.channel] || 0) + 1;
    });

    res.json({
      // Cards principais
      total: totalNotifications || 0,
      sent: sentNotifications || 0,
      pending: pendingNotifications || 0,
      failed: failedNotifications || 0,
      
      // Estatísticas temporais
      today: todayNotifications || 0,
      thisWeek: weekNotifications || 0,
      thisMonth: monthNotifications || 0,
      unread: unreadNotifications || 0,
      
      // Estatísticas por tipo e categoria
      byType: typeStats,
      byCategory: categoryStats,
      
      // Estatísticas da fila
      queueByStatus: queueByStatus,
      queueByChannel: queueByChannel,
      
      // Métricas calculadas
      deliveryRate: totalNotifications > 0 ? ((sentNotifications / totalNotifications) * 100).toFixed(2) : '0.00',
      failureRate: totalNotifications > 0 ? ((failedNotifications / totalNotifications) * 100).toFixed(2) : '0.00'
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics data for notifications dashboard
router.get('/analytics', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Make internal request to notifications analytics
    const axios = require('axios');
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-url.com' 
      : 'http://localhost:3001';
    
    try {
      // Get analytics overview from notifications service
      const overviewResponse = await axios.get(`${baseURL}/api/notifications/analytics/overview`, {
        params: { period },
        headers: {
          'Authorization': req.headers.authorization
        }
      });
      
      const analyticsData = overviewResponse.data;
      
      // Format data for frontend consumption
      const formattedData = {
        notifications: {
          total: analyticsData.notifications?.total || 0,
          read: analyticsData.notifications?.read || 0,
          clicked: analyticsData.notifications?.clicked || 0,
          dismissed: analyticsData.notifications?.dismissed || 0,
          readRate: analyticsData.notifications?.read_rate || 0,
          clickRate: analyticsData.notifications?.click_rate || 0,
          dismissalRate: analyticsData.notifications?.dismissal_rate || 0,
          byType: analyticsData.notifications?.by_type || {},
          byStatus: analyticsData.notifications?.by_status || {}
        },
        campaigns: {
          total: analyticsData.campaigns?.total || 0,
          totalSent: analyticsData.campaigns?.emails_sent || 0,
          totalDelivered: analyticsData.campaigns?.emails_delivered || 0,
          totalOpened: analyticsData.campaigns?.emails_opened || 0,
          totalClicked: analyticsData.campaigns?.emails_clicked || 0,
          deliveryRate: analyticsData.campaigns?.delivery_rate || 0,
          openRate: analyticsData.campaigns?.open_rate || 0,
          clickRate: analyticsData.campaigns?.click_rate || 0
        },
        period: analyticsData.period
      };
      
      res.json(formattedData);
    } catch (apiError) {
      console.log('API call failed, using fallback data:', apiError.message);
      
      // Fallback: get basic stats directly from database
      const { count: totalNotifications } = await adminSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      const { count: readNotifications } = await adminSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', true);

      const { count: clickedNotifications } = await adminSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .not('clicked_at', 'is', null);

      const readRate = totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : 0;
      const clickRate = totalNotifications > 0 ? ((clickedNotifications / totalNotifications) * 100).toFixed(2) : 0;

      res.json({
        notifications: {
          total: totalNotifications || 0,
          read: readNotifications || 0,
          clicked: clickedNotifications || 0,
          dismissed: 0,
          readRate: parseFloat(readRate),
          clickRate: parseFloat(clickRate),
          dismissalRate: 0,
          byType: {},
          byStatus: {}
        },
        campaigns: {
          total: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0
        }
      });
    }
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event (admin-only, bypass RLS)
router.delete('/events/:id', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await adminSupabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Admin delete event error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
// Listar posts do blog (admin) incluindo rascunhos
router.get('/blog', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = adminSupabase
      .from('politician_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status === 'published') {
      query = query.eq('is_published', true);
    } else if (status === 'draft') {
      query = query.eq('is_published', false);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: posts, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data: posts || [], total: posts?.length || 0 });
  } catch (error) {
    console.error('Get admin blog posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Listar usuários do auth (Supabase) com metadados incluindo role
router.get('/auth-users', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { search, role, fetchAll = 'true' } = req.query;
    const perPage = 1000;
    let page = 1;
    let all = [];

    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      const users = Array.isArray(data?.users) ? data.users : [];
      all.push(...users);
      const shouldContinue = String(fetchAll).toLowerCase() === 'true' && users.length === perPage;
      if (!shouldContinue) break;
      page += 1;
      if (page > 50) break;
    }

    let filtered = all;
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter(u => (
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.user_metadata?.full_name && String(u.user_metadata.full_name).toLowerCase().includes(s)) ||
        (u.user_metadata?.username && String(u.user_metadata.username).toLowerCase().includes(s))
      ));
    }
    if (role) {
      const r = String(role).toLowerCase();
      filtered = filtered.filter(u => {
        const ur = u.user_metadata?.role || u.app_metadata?.role;
        return ur && String(ur).toLowerCase() === r;
      });
    }

    const mapped = filtered.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : ''),
      username: u.user_metadata?.username || '',
      plan: u.user_metadata?.plan || 'gratuito',
      role: u.user_metadata?.role || u.app_metadata?.role || null,
      city: u.user_metadata?.city || null,
      state: u.user_metadata?.state || null,
      created_at: u.created_at,
      last_login: u.last_sign_in_at,
      status: 'active',
      stats: { checkins: 0, conversations: 0 }
    }));

    res.json({ users: mapped });
  } catch (error) {
    console.error('Auth users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Criar usuário no Supabase Auth com metadados e sincronizar em public.users
router.post('/auth-users', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { email, password, full_name, username, role, plan, city, state } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user_metadata = {
      full_name: full_name || null,
      username: username || null,
      role: role || null,
      plan: plan || 'gratuito',
      city: city || null,
      state: state || null,
    };

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      user_metadata,
      email_confirm: true,
    });
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const authUser = data?.user;
    if (!authUser) {
      return res.status(500).json({ error: 'Falha ao criar usuário no Auth' });
    }

    // Sincronizar na tabela public.users
    try {
      const isAdmin = String(role || '').toLowerCase() === 'admin';
      const { data: upserted, error: upsertErr } = await adminSupabase
        .from('users')
        .upsert({
          auth_id: authUser.id,
          email,
          username: username || null,
          full_name: full_name || null,
          plan: plan || 'gratuito',
          is_admin: isAdmin,
          city: city || null,
          state: state || null,
        }, { onConflict: 'auth_id' })
        .select();
      if (upsertErr) {
        console.warn('Falha ao sincronizar public.users:', upsertErr.message);
      }
    } catch (syncErr) {
      console.warn('Erro ao sincronizar public.users:', syncErr?.message || syncErr);
    }

    return res.json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        full_name: user_metadata.full_name,
        username: user_metadata.username,
        role: user_metadata.role,
        plan: user_metadata.plan,
        city: user_metadata.city,
        state: user_metadata.state,
        created_at: authUser.created_at,
        last_login: authUser.last_sign_in_at,
        status: 'active',
      }
    });
  } catch (error) {
    console.error('Auth user create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth-users/seed-tests', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const overrides = req.body || {};
    const desired = [
      {
        email: overrides.politician_email || 'politico.test@direitai.com',
        password: overrides.politician_password || 'DireitaAI123!',
        full_name: overrides.politician_name || 'Político Teste',
        username: overrides.politician_username || 'politico_teste',
        role: 'politician',
        plan: overrides.politician_plan || 'premium',
        city: overrides.politician_city || 'São Paulo',
        state: overrides.politician_state || 'SP'
      },
      {
        email: overrides.journalist_email || 'jornalista.test@direitai.com',
        password: overrides.journalist_password || 'DireitaAI123!',
        full_name: overrides.journalist_name || 'Jornalista Teste',
        username: overrides.journalist_username || 'jornalista_teste',
        role: 'journalist',
        plan: overrides.journalist_plan || 'premium',
        city: overrides.journalist_city || 'Rio de Janeiro',
        state: overrides.journalist_state || 'RJ'
      },
      {
        email: overrides.party_email || 'partido.test@direitai.com',
        password: overrides.party_password || 'DireitaAI123!',
        full_name: overrides.party_name || 'Partido Teste',
        username: overrides.party_username || 'partido_teste',
        role: 'party',
        plan: overrides.party_plan || 'premium',
        city: overrides.party_city || 'Brasília',
        state: overrides.party_state || 'DF'
      }
    ];

    const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return res.status(500).json({ error: listErr.message });
    }

    const existing = Array.isArray(listData?.users) ? listData.users : [];
    const results = [];

    for (const u of desired) {
      const found = existing.find(x => x.email && String(x.email).toLowerCase() === String(u.email).toLowerCase());
      let authUser = found || null;
      if (!authUser) {
        const user_metadata = {
          full_name: u.full_name,
          username: u.username,
          role: u.role,
          plan: u.plan,
          city: u.city,
          state: u.state
        };
        const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          user_metadata,
          email_confirm: true
        });
        if (createErr) {
          results.push({ email: u.email, success: false, error: createErr.message });
          continue;
        }
        authUser = created?.user || null;
      }

      if (authUser) {
        await adminSupabase
          .from('users')
          .upsert({
            auth_id: authUser.id,
            email: u.email,
            username: u.username,
            full_name: u.full_name,
            plan: u.plan,
            is_admin: false,
            city: u.city,
            state: u.state
          }, { onConflict: 'auth_id' });
        results.push({
          email: u.email,
          password: u.password,
          role: u.role,
          plan: u.plan,
          auth_id: authUser.id
        });
      }
    }

    return res.json({ success: true, users: results });
  } catch (error) {
    console.error('Seed test users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function syncAuthUsersHandler(req, res) {
  try {
    let page = 1;
    const perPage = 1000;
    let totalAuth = 0;
    let inserted = 0;
    let updated = 0;

    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      const users = Array.isArray(data?.users) ? data.users : [];
      totalAuth += users.length;
      if (users.length === 0) break;

      for (const u of users) {
        const meta = u.user_metadata || {};
        const roleMeta = meta.role || u.app_metadata?.role || null;
        const isAdmin = String(roleMeta || '').toLowerCase() === 'admin';
        const payload = {
          auth_id: u.id,
          email: u.email,
          username: meta.username || null,
          full_name: meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : null),
          plan: meta.plan || 'gratuito',
          is_admin: isAdmin,
          city: meta.city || null,
          state: meta.state || null,
        };

        const { data: upserted, error: upErr, status } = await adminSupabase
          .from('users')
          .upsert(payload, { onConflict: 'auth_id' })
          .select('auth_id');

        if (upErr) {
          console.warn('Falha ao sincronizar usuário', u.email, upErr.message);
          continue;
        }
        if (status === 201) inserted += 1; else updated += 1;
      }

      page += 1;
      if (page > 50) break;
    }

    res.json({ success: true, summary: { totalAuth, inserted, updated } });
  } catch (error) {
    console.error('Sync auth users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Endpoints para sincronização (aliases para compatibilidade)
router.post('/users/sync-auth', authenticateUser, authenticateAdmin, syncAuthUsersHandler);
router.post('/sync-auth', authenticateUser, authenticateAdmin, syncAuthUsersHandler);
