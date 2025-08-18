const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Dashboard overview statistics
router.get('/overview', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // Get user statistics
    const { data: userStats } = await supabase
      .from('users')
      .select('plan, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const activeUsers = userStats?.length || 0;
    const newUsersThisMonth = userStats?.filter(u => 
      new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    // Get check-in statistics
    const { data: checkinStats } = await supabase
      .from('checkins')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const checkinsToday = checkinStats?.length || 0;

    // Get event statistics
    const { data: eventStats } = await supabase
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
    const { data: aiStats } = await supabase
      .from('ai_conversations')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const aiConversationsToday = aiStats?.length || 0;

    // Get moderation statistics
    const { data: moderationStats } = await supabase
      .from('content_moderation')
      .select('status')
      .eq('status', 'pending');

    const pendingModeration = moderationStats?.length || 0;

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, title, location, city, state, current_participants, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get top cities by user count
    const { data: topCities } = await supabase
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

    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        full_name,
        plan,
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
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get additional statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const { data: checkins } = await supabase
          .from('checkins')
          .select('id')
          .eq('user_id', user.id);

        const { data: conversations } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('user_id', user.id);

        return {
          ...user,
          stats: {
            checkins: checkins?.length || 0,
            conversations: conversations?.length || 0
          }
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user details
router.get('/users/:userId', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's check-ins
    const { data: checkins } = await supabase
      .from('checkins')
      .select(`
        *,
        events (
          title,
          location
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's AI conversations
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      user,
      activity: {
        checkins: checkins || [],
        conversations: conversations || [],
        orders: orders || []
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

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
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
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (checkError || !existingUser) {
      console.log(`❌ Usuário não encontrado: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Usuário encontrado: ${existingUser.email}`);

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        banned: true,
        ban_reason: reason || 'Banido pelo administrador',
        banned_at: new Date().toISOString()
      })
      .eq('id', userId)
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
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (checkError || !existingUser) {
      console.log(`❌ Usuário não encontrado para exclusão: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Usuário encontrado para exclusão: ${existingUser.email}`);

    // Deletar o usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

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

    let query = supabase
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

    const { data: content, error } = await supabase
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

    let query = supabase
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

    const { data: product, error } = await supabase
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

    const { data: product, error } = await supabase
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

    const { error } = await supabase
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

    let query = supabase
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

    const { data: order, error } = await supabase
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
    const { data: orders } = await supabase
      .from('orders')
      .select('total, created_at, status')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const orderCount = orders?.length || 0;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Get subscription revenue (mock data)
    const subscriptionRevenue = {
      engajado: 15750.00,
      premium: 8900.00
    };

    // Get top products
    const { data: topProducts } = await supabase
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
    // Mock system settings
    const settings = {
      general: {
        siteName: 'DireitaAI',
        maintenanceMode: false,
        registrationEnabled: true,
        maxUsersPerEvent: 500
      },
      ai: {
        dailyLimitGratuito: 10,
        dailyLimitEngajado: 50,
        dailyLimitPremium: -1, // unlimited
        creativeAIEnabled: true
      },
      points: {
        checkinPoints: 10,
        purchasePointsRatio: 0.1, // 1 point per R$ 10
        referralPoints: 50
      },
      store: {
        freeShippingThreshold: 100,
        shippingCost: 15,
        taxRate: 0.08
      }
    };

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

    // In a real implementation, you would save these to a settings table
    // For now, we'll just return success
    res.json({ 
      settings, 
      message: 'Settings updated successfully' 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const { data: announcement, error } = await supabase
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

    let query = supabase
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
    const { data: users, error } = await supabase
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
    const { data: activeEvents, error } = await supabase
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
    const { data: cityStats, error } = await supabase
      .rpc('get_city_statistics');

    if (error) {
      // If the RPC function doesn't exist, create basic stats
      const { data: users } = await supabase
        .from('users')
        .select('city, state')
        .not('city', 'is', null);

      const { data: events } = await supabase
        .from('events')
        .select('city, state')
        .not('city', 'is', null);

      const { data: checkins } = await supabase
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
    const { data: onlineUsersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('last_login', thirtyMinutesAgo);

    // Active events count
    const { data: activeEventsCount } = await supabase
      .from('events')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    // Today's checkins count
    const { data: todayCheckinsCount } = await supabase
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
    const { data: usersByCity, error: usersError } = await supabase
      .from('users')
      .select('city, state')
      .not('city', 'is', null)
      .not('state', 'is', null);

    if (usersError) {
      console.error('Get users by city error:', usersError);
      return res.status(400).json({ error: usersError.message });
    }

    // Get events distribution by city
    const { data: eventsByCity, error: eventsError } = await supabase
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

module.exports = router;