const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
// const adminSupabase = require('../config/database'); // Removido - usando adminSupabase
const { adminSupabase } = require('../config/supabase');



// Rota de teste para verificar notificações (sem autenticação)
router.get('/test-notifications-data', async (req, res) => {
  try {
    console.log('🔍 Testando dados de notificações...');
    
    // Buscar todas as notificações
    const { data: allNotifications, error: allError } = await adminSupabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('Erro ao buscar todas as notificações:', allError);
      return res.status(500).json({ error: 'Erro ao buscar notificações', details: allError });
    }
    
    console.log('📬 Total de notificações encontradas:', allNotifications?.length || 0);
    
    // Contar total de notificações
    const { count: totalCount, error: countError } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Erro ao contar notificações:', countError);
    }
    
    // Contar notificações não lidas
    const { count: unreadCount, error: unreadError } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    
    if (unreadError) {
      console.error('Erro ao contar não lidas:', unreadError);
    }
    
    res.json({
      tableExists: true,
      totalNotifications: totalCount || 0,
      unreadNotifications: unreadCount || 0,
      recentNotifications: allNotifications || [],
      message: 'Dados de notificações carregados com sucesso'
    });
  } catch (error) {
    console.error('Erro no teste de notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para criar notificações de teste
router.post('/create-test-notifications', async (req, res) => {
  try {
    console.log('🔧 Criando notificações de teste...');
    
    // Buscar um usuário para associar as notificações
    const { data: users, error: usersError } = await adminSupabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('Erro ao buscar usuários:', usersError);
      return res.status(500).json({ error: 'Nenhum usuário encontrado para criar notificações de teste' });
    }
    
    const userId = users[0].id;
    console.log('👤 Usando usuário ID:', userId);
    
    // Criar notificações de teste
    const testNotifications = [
      {
        user_id: userId,
        title: 'Bem-vindo ao DireitaAI!',
        message: 'Sua conta foi criada com sucesso. Explore todas as funcionalidades da plataforma.',
        type: 'info',
        category: 'system',
        priority: 'medium',
        is_read: false,
        is_dismissed: false,
        action_url: '/dashboard',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        user_id: userId,
        title: 'Nova funcionalidade disponível',
        message: 'Agora você pode acessar relatórios financeiros detalhados na seção de análises.',
        type: 'info',
        category: 'system',
        priority: 'high',
        is_read: false,
        is_dismissed: false,
        action_url: '/analytics',
        created_at: new Date(Date.now() - 60000).toISOString(), // 1 minuto atrás
        updated_at: new Date(Date.now() - 60000).toISOString()
      },
      {
        user_id: userId,
        title: 'Lembrete de segurança',
        message: 'Recomendamos que você ative a autenticação de dois fatores para maior segurança.',
        type: 'warning',
        category: 'security',
        priority: 'high',
        is_read: false,
        is_dismissed: false,
        action_url: '/settings/security',
        created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
        updated_at: new Date(Date.now() - 300000).toISOString()
      }
    ];
    
    const { data: createdNotifications, error: createError } = await adminSupabase
      .from('notifications')
      .insert(testNotifications)
      .select();
    
    if (createError) {
      console.error('Erro ao criar notificações:', createError);
      return res.status(500).json({ error: 'Erro ao criar notificações de teste', details: createError });
    }
    
    console.log('✅ Notificações de teste criadas:', createdNotifications?.length || 0);
    
    res.json({
      success: true,
      message: 'Notificações de teste criadas com sucesso',
      created: createdNotifications?.length || 0,
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Erro ao criar notificações de teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// =====================================================
// ROTAS DE TEMPLATES (SEM AUTENTICAÇÃO)
// =====================================================

// Obter templates de notificação
router.get('/templates', async (req, res) => {
  try {
    const { type, category, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query do Supabase
    let query = adminSupabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Aplicar filtros
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar templates:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Contar total
    let countQuery = adminSupabase
      .from('notification_templates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (type) countQuery = countQuery.eq('type', type);
    if (category) countQuery = countQuery.eq('category', category);

    const { count: totalCount } = await countQuery;

    res.json({
      templates: templates || [],
      total: totalCount || 0,
      page: parseInt(page),
      totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter metadados dos templates
router.get('/templates/metadata', async (req, res) => {
  try {
    const categories = [
      { value: 'event', label: 'Eventos', description: 'Templates para notificações de eventos' },
      { value: 'store', label: 'Loja', description: 'Templates para notificações da loja' },
      { value: 'ai', label: 'IA', description: 'Templates para notificações de IA' },
      { value: 'gamification', label: 'Gamificação', description: 'Templates para gamificação' },
      { value: 'social', label: 'Social', description: 'Templates para interações sociais' },
      { value: 'system', label: 'Sistema', description: 'Templates do sistema' },
      { value: 'security', label: 'Segurança', description: 'Templates de segurança' },
      { value: 'marketing', label: 'Marketing', description: 'Templates de marketing' }
    ];

    const types = [
      { value: 'email', label: 'E-mail', description: 'Templates para e-mail' },
      { value: 'sms', label: 'SMS', description: 'Templates para SMS' },
      { value: 'push', label: 'Push', description: 'Templates para notificações push' },
      { value: 'in_app', label: 'In-App', description: 'Templates para notificações in-app' }
    ];

    const variables = [
      { name: 'user_name', description: 'Nome do usuário', example: 'João Silva' },
      { name: 'user_email', description: 'E-mail do usuário', example: 'joao@exemplo.com' },
      { name: 'user_id', description: 'ID do usuário', example: '12345' },
      { name: 'current_date', description: 'Data atual', example: '2024-01-15' },
      { name: 'current_time', description: 'Hora atual', example: '14:30' },
      { name: 'app_name', description: 'Nome da aplicação', example: 'DireitAI' },
      { name: 'app_url', description: 'URL da aplicação', example: 'https://direitai.com' },
      { name: 'support_email', description: 'E-mail de suporte', example: 'suporte@direitai.com' }
    ];

    res.json({
      categories,
      types,
      variables,
      languages: [
        { value: 'pt-BR', label: 'Português (Brasil)' },
        { value: 'en-US', label: 'English (US)' },
        { value: 'es-ES', label: 'Español (España)' }
      ]
    });
  } catch (error) {
    console.error('Erro ao obter metadados de templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware para autenticação em todas as outras rotas
// router.use(authenticateUser); // Comentado temporariamente para debug

// Obter notificações do usuário
router.get('/', async (req, res) => {
  try {
    // Se não há usuário autenticado, retornar resposta vazia
    if (!req.user || !req.user.id) {
      return res.json({
        notifications: [],
        total: 0,
        totalPages: 0,
        unreadCount: 0
      });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    const category = req.query.category;
    const priority = req.query.priority;
    const is_read = req.query.is_read;

    // Construir query do Supabase
    let query = adminSupabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: notifications, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar notificação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Contar total e não lidas
    const { count: totalCount } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const { count: unreadCount } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    const totalPages = Math.ceil((totalCount || 0) / limit);

    res.json({
      notifications: (notifications || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        category: n.category,
        title: n.title,
        message: n.message,
        short_message: n.short_message,
        icon: n.icon,
        image_url: n.image_url,
        priority: n.priority,
        data: n.data,
        action_url: n.action_url,
        action_label: n.action_label,
        is_read: n.is_read,
        is_clicked: n.is_clicked,
        is_dismissed: n.is_dismissed,
        expires_at: n.expires_at,
        scheduled_for: n.scheduled_for,
        sent_at: n.sent_at,
        read_at: n.read_at,
        clicked_at: n.clicked_at,
        dismissed_at: n.dismissed_at,
        created_at: n.created_at,
        updated_at: n.updated_at
      })),
      total: totalCount || 0,
      totalPages,
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter banners de anúncio ativos
router.get('/announcements', async (req, res) => {
  try {
    // Teste sem autenticação para debug
    const userId = 'test-user-id';
    console.log('🔔 INÍCIO - Buscando anúncios para usuário:', userId);

    // Buscar anúncios ativos (usando 'active' em vez de 'is_active')
    const { data: announcements, error: announcementsError } = await adminSupabase
      .from('announcements')
      .select('*')
      .eq('active', true);

    console.log('📋 Anúncios encontrados:', announcements);
    console.log('❌ Erro na busca de anúncios:', announcementsError);

    if (announcementsError) {
      console.error('Erro ao buscar anúncios:', announcementsError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!announcements || announcements.length === 0) {
      console.log('⚠️ Nenhum anúncio ativo encontrado');
      return res.json([]);
    }

    // Buscar dispensas do usuário (apenas se userId for um UUID válido)
    let dismissals = [];
    if (userId && userId !== 'test-user-id') {
      const { data: dismissalsData, error: dismissalsError } = await adminSupabase
        .from('announcement_dismissals')
        .select('announcement_id')
        .eq('user_id', userId);

      console.log('🚫 Dispensas encontradas:', dismissalsData);
      console.log('❌ Erro na busca de dispensas:', dismissalsError);

      if (dismissalsError) {
        console.error('Erro ao buscar dispensas:', dismissalsError);
        // Continuar mesmo com erro nas dispensas para usuários de teste
      } else {
        dismissals = dismissalsData || [];
      }
    } else {
      console.log('🚫 Usuário de teste - pulando busca de dispensas');
    }

    // Filtrar anúncios não dispensados
    const dismissedIds = dismissals ? dismissals.map(d => d.announcement_id) : [];
    const activeAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

    console.log('✅ Anúncios ativos após filtro:', activeAnnouncements);
    res.json(activeAnnouncements);
  } catch (error) {
    console.error('Erro ao obter anúncios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter notificação específica
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao buscar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova notificação
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      user_ids,
      type,
      category,
      title,
      message,
      short_message,
      icon,
      image_url,
      priority = 'medium',
      data,
      action_url,
      action_label,
      expires_at,
      scheduled_for
    } = req.body;

    // Validação básica
    if (!type || !category || !title || !message) {
      return res.status(400).json({ error: 'Campos obrigatórios: type, category, title, message' });
    }

    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um usuário deve ser especificado' });
    }

    const notificationsToInsert = targetUserIds.map(targetUserId => ({
      user_id: targetUserId,
      type,
      category,
      title,
      message,
      short_message,
      icon,
      image_url,
      priority,
      data: data ? JSON.stringify(data) : null,
      action_url,
      action_label,
      expires_at,
      scheduled_for
    }));

    const { data: notifications, error } = await adminSupabase
      .from('notifications')
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.status(201).json(notifications.length === 1 ? notifications[0] : notifications);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como não lida
router.patch('/:id/unread', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .update({ 
        is_read: false, 
        read_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao marcar notificação como não lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar todas as notificações como lidas
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';

    const { data: notifications, error } = await adminSupabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ count: notifications ? notifications.length : 0 });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar notificação
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar todas as notificações
router.delete('/all', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';

    const { data: notifications, error } = await adminSupabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Erro ao deletar todas as notificações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ count: notifications ? notifications.length : 0 });
  } catch (error) {
    console.error('Erro ao deletar todas as notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como clicada
router.patch('/:id/click', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .update({ 
        is_clicked: true, 
        clicked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao marcar notificação como clicada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como dispensada
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .update({ 
        is_dismissed: true, 
        dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao marcar notificação como dispensada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter preferências de notificação do usuário
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';

    const { data: user, error } = await adminSupabase
      .from('users')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const preferences = user.notification_preferences || {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      in_app_notifications: true,
      marketing_emails: false,
      event_reminders: true,
      achievement_notifications: true,
      social_notifications: true,
      security_alerts: true,
      digest_frequency: 'daily',
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'America/Sao_Paulo'
      }
    };

    res.json(preferences);
  } catch (error) {
    console.error('Erro ao buscar preferências de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar preferências de notificação
router.patch('/preferences', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const preferences = req.body;

    const { data: user, error } = await adminSupabase
      .from('users')
      .update({ 
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('notification_preferences')
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user.notification_preferences);
  } catch (error) {
    console.error('Erro ao atualizar preferências de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resetar preferências para padrão
router.post('/preferences/reset', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    
    const defaultPreferences = {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      in_app_notifications: true,
      marketing_emails: false,
      event_reminders: true,
      achievement_notifications: true,
      social_notifications: true,
      security_alerts: true,
      digest_frequency: 'daily',
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'America/Sao_Paulo'
      }
    };

    const { data: user, error } = await adminSupabase
      .from('users')
      .update({ 
        notification_preferences: defaultPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('notification_preferences')
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user.notification_preferences);
  } catch (error) {
    console.error('Erro ao resetar preferências de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dispensar anúncio
router.post('/announcements/:id/dismiss', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'test-user-id';
    const { id } = req.params;

    // Verificar se o anúncio existe
    const { data: announcement, error: announcementError } = await adminSupabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single();

    if (announcementError || !announcement) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Registrar dispensa (upsert)
    const { error: dismissError } = await adminSupabase
      .from('announcement_dismissals')
      .upsert({ 
        announcement_id: id, 
        user_id: userId 
      }, { 
        onConflict: 'announcement_id,user_id' 
      });

    if (dismissError) {
      console.error('Erro ao dispensar anúncio:', dismissError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao dispensar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =====================================================
// ROTAS DE EMAIL CAMPAIGNS
// =====================================================

// Obter campanhas de email
router.get('/email/campaigns', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log('🔍 Buscando campanhas de email...');

    // Construir query do Supabase sem join inicialmente
    let query = adminSupabase
      .from('email_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: campaigns, error, count } = await query;

    if (error) {
      console.error('❌ Erro ao buscar campanhas:', error);
      return res.status(500).json({ error: 'Erro ao buscar campanhas', details: error });
    }

    console.log('✅ Campanhas encontradas:', campaigns?.length || 0);

    const totalPages = Math.ceil((count || 0) / parseInt(limit));

    res.json({
      campaigns: campaigns || [],
      total: count || 0,
      totalPages,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('❌ Erro ao buscar campanhas de email:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Obter campanha específica
router.get('/email/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: campaign, error } = await adminSupabase
      .from('email_campaigns')
      .select(`
        *,
        notification_templates(name as template_name, content as template_content),
        email_campaign_stats(status, count(*) as count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      console.error('Erro ao buscar campanha:', error);
      return res.status(500).json({ error: 'Erro ao buscar campanha' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Erro ao buscar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar campanha de email
router.post('/email/campaigns', async (req, res) => {
  try {
    const {
      name,
      subject,
      content,
      html_content,
      template_id,
      type = 'newsletter',
      target_audience = { type: 'all', estimated_recipients: 0 },
      schedule = { type: 'immediate' },
      tracking = { open_tracking: true, click_tracking: true, unsubscribe_tracking: true },
      attachments = [],
      tags = [],
      metadata = {}
    } = req.body;

    // Validações básicas
    if (!name || !subject || !content) {
      return res.status(400).json({ 
        error: 'Nome, assunto e conteúdo são obrigatórios' 
      });
    }

    // Criar campanha
    const { data: campaign, error } = await adminSupabase
      .from('email_campaigns')
      .insert({
        name,
        subject,
        content,
        html_content,
        template_id,
        type,
        target_audience,
        schedule,
        tracking,
        attachments,
        tags,
        metadata,
        created_by: req.user ? req.user.id : 'test-user-id',
        status: schedule.type === 'immediate' ? 'draft' : 'scheduled',
        scheduled_at: schedule.type === 'scheduled' ? schedule.datetime : null
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar campanha:', error);
      return res.status(500).json({ error: 'Erro ao criar campanha' });
    }

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar campanha de email
router.put('/email/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      content,
      html_content,
      template_id,
      type,
      target_audience,
      schedule,
      tracking,
      attachments,
      tags,
      metadata
    } = req.body;

    // Verificar se a campanha existe e se o usuário pode editá-la
    const { data: existingCampaign, error: fetchError } = await adminSupabase
      .from('email_campaigns')
      .select('id, status, created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      return res.status(500).json({ error: 'Erro ao buscar campanha' });
    }

    // Verificar se a campanha pode ser editada
    if (existingCampaign.status === 'sent') {
      return res.status(400).json({ error: 'Campanhas enviadas não podem ser editadas' });
    }

    if (existingCampaign.status === 'sending') {
      return res.status(400).json({ error: 'Campanhas em envio não podem ser editadas' });
    }

    // Atualizar campanha
    const { data: campaign, error } = await adminSupabase
      .from('email_campaigns')
      .update({
        name,
        subject,
        content,
        html_content,
        template_id,
        type,
        target_audience,
        schedule,
        tracking,
        attachments,
        tags,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar campanha:', error);
      return res.status(500).json({ error: 'Erro ao atualizar campanha' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar campanha de email
router.delete('/email/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a campanha existe
    const { data: existingCampaign, error: fetchError } = await adminSupabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      return res.status(500).json({ error: 'Erro ao buscar campanha' });
    }

    // Verificar se a campanha pode ser deletada
    if (existingCampaign.status === 'sending') {
      return res.status(400).json({ error: 'Campanhas em envio não podem ser deletadas' });
    }

    // Deletar campanha
    const { error } = await adminSupabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar campanha:', error);
      return res.status(500).json({ error: 'Erro ao deletar campanha' });
    }

    res.json({ message: 'Campanha deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar campanha de email
router.post('/email/campaigns/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a campanha existe
    const { data: campaign, error: fetchError } = await adminSupabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      return res.status(500).json({ error: 'Erro ao buscar campanha' });
    }

    // Verificar se a campanha pode ser enviada
    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Campanha já foi enviada' });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({ error: 'Campanha já está sendo enviada' });
    }

    // Atualizar status para 'sending'
    const { error: updateError } = await adminSupabase
      .from('email_campaigns')
      .update({
        status: 'sending',
        sent_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar status da campanha:', updateError);
      return res.status(500).json({ error: 'Erro ao iniciar envio da campanha' });
    }

    // TODO: Implementar lógica de envio real aqui
    // Por enquanto, simular o envio e marcar como enviada
    setTimeout(async () => {
      await adminSupabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          total_sent: campaign.target_audience.estimated_recipients || 0,
          total_delivered: Math.floor((campaign.target_audience.estimated_recipients || 0) * 0.95)
        })
        .eq('id', id);
    }, 2000);

    res.json({ message: 'Envio da campanha iniciado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de uma campanha específica
router.get('/email/campaigns/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a campanha existe
    const { data: campaign, error: campaignError } = await adminSupabase
      .from('email_campaigns')
      .select('id, name, status, total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_unsubscribed')
      .eq('id', id)
      .single();

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      return res.status(500).json({ error: 'Erro ao buscar campanha' });
    }

    // Buscar estatísticas detalhadas
    const { data: stats, error: statsError } = await adminSupabase
      .from('email_campaign_stats')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }

    // Calcular métricas
    const totalSent = campaign.total_sent || 0;
    const totalDelivered = campaign.total_delivered || 0;
    const totalOpened = campaign.total_opened || 0;
    const totalClicked = campaign.total_clicked || 0;
    const totalBounced = campaign.total_bounced || 0;
    const totalUnsubscribed = campaign.total_unsubscribed || 0;

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : '0.00';
    const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(2) : '0.00';
    const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(2) : '0.00';
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : '0.00';
    const unsubscribeRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(2) : '0.00';

    const response = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status
      },
      summary: {
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_bounced: totalBounced,
        total_unsubscribed: totalUnsubscribed,
        delivery_rate: parseFloat(deliveryRate),
        open_rate: parseFloat(openRate),
        click_rate: parseFloat(clickRate),
        bounce_rate: parseFloat(bounceRate),
        unsubscribe_rate: parseFloat(unsubscribeRate)
      },
      detailed_stats: stats
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao obter estatísticas da campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas gerais de todas as campanhas
router.get('/email/campaigns/stats/overview', async (req, res) => {
  try {
    // Buscar todas as campanhas com suas estatísticas
    const { data: campaigns, error } = await adminSupabase
      .from('email_campaigns')
      .select('id, name, status, total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_unsubscribed, created_at');

    if (error) {
      console.error('Erro ao buscar campanhas:', error);
      return res.status(500).json({ error: 'Erro ao buscar campanhas' });
    }

    // Calcular estatísticas gerais
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'sending').length;
    const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
    const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;

    const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.total_delivered || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
    const totalBounced = campaigns.reduce((sum, c) => sum + (c.total_bounced || 0), 0);
    const totalUnsubscribed = campaigns.reduce((sum, c) => sum + (c.total_unsubscribed || 0), 0);

    const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : '0.00';
    const avgOpenRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(2) : '0.00';
    const avgClickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(2) : '0.00';
    const avgBounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : '0.00';
    const avgUnsubscribeRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(2) : '0.00';

    // Campanhas recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCampaigns = campaigns.filter(c => new Date(c.created_at) >= thirtyDaysAgo);

    const response = {
      overview: {
        total_campaigns: totalCampaigns,
        active_campaigns: activeCampaigns,
        sent_campaigns: sentCampaigns,
        draft_campaigns: draftCampaigns,
        recent_campaigns: recentCampaigns.length
      },
      totals: {
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_bounced: totalBounced,
        total_unsubscribed: totalUnsubscribed
      },
      averages: {
        delivery_rate: parseFloat(avgDeliveryRate),
        open_rate: parseFloat(avgOpenRate),
        click_rate: parseFloat(avgClickRate),
        bounce_rate: parseFloat(avgBounceRate),
        unsubscribe_rate: parseFloat(avgUnsubscribeRate)
      },
      recent_campaigns: recentCampaigns.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        total_sent: c.total_sent || 0,
        total_delivered: c.total_delivered || 0,
        created_at: c.created_at
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao obter estatísticas gerais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =====================================================
// ROTAS DE TEMPLATES (PROTEGIDAS POR AUTENTICAÇÃO)
// =====================================================

// Rotas de templates protegidas por autenticação (CRUD completo)
// Estas rotas requerem autenticação para criar, editar e deletar templates

// =====================================================
// ROTAS DE ANÁLISES
// =====================================================

// Obter análises gerais de notificações
router.get('/analytics/overview', async (req, res) => {
  try {
    const { period = '30d', start_date, end_date } = req.query;
    
    // Calcular datas baseado no período
    let startDate, endDate;
    const now = new Date();
    
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = now;
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Buscar notificações no período
    const { data: notifications, error: notificationsError } = await adminSupabase
      .from('notifications')
      .select('id, type, status, is_read, created_at, clicked_at, dismissed_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (notificationsError) {
      console.error('Erro ao buscar notificações:', notificationsError);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }

    // Buscar campanhas no período
    const { data: campaigns, error: campaignsError } = await adminSupabase
      .from('email_campaigns')
      .select('id, status, total_sent, total_delivered, total_opened, total_clicked, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (campaignsError) {
      console.error('Erro ao buscar campanhas:', campaignsError);
      return res.status(500).json({ error: 'Erro ao buscar campanhas' });
    }

    // Calcular métricas de notificações
    const totalNotifications = notifications.length;
    const readNotifications = notifications.filter(n => n.is_read).length;
    const clickedNotifications = notifications.filter(n => n.clicked_at).length;
    const dismissedNotifications = notifications.filter(n => n.dismissed_at).length;
    
    const readRate = totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : '0.00';
    const clickRate = totalNotifications > 0 ? ((clickedNotifications / totalNotifications) * 100).toFixed(2) : '0.00';
    const dismissalRate = totalNotifications > 0 ? ((dismissedNotifications / totalNotifications) * 100).toFixed(2) : '0.00';

    // Notificações por tipo
    const notificationsByType = {};
    notifications.forEach(notification => {
      const type = notification.type || 'unknown';
      notificationsByType[type] = (notificationsByType[type] || 0) + 1;
    });

    // Notificações por status
    const notificationsByStatus = {};
    notifications.forEach(notification => {
      const status = notification.status || 'unknown';
      notificationsByStatus[status] = (notificationsByStatus[status] || 0) + 1;
    });

    // Calcular métricas de campanhas
    const totalCampaigns = campaigns.length;
    const totalEmailsSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
    const totalEmailsDelivered = campaigns.reduce((sum, c) => sum + (c.total_delivered || 0), 0);
    const totalEmailsOpened = campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
    const totalEmailsClicked = campaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);

    const emailDeliveryRate = totalEmailsSent > 0 ? ((totalEmailsDelivered / totalEmailsSent) * 100).toFixed(2) : '0.00';
    const emailOpenRate = totalEmailsDelivered > 0 ? ((totalEmailsOpened / totalEmailsDelivered) * 100).toFixed(2) : '0.00';
    const emailClickRate = totalEmailsDelivered > 0 ? ((totalEmailsClicked / totalEmailsDelivered) * 100).toFixed(2) : '0.00';

    const response = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      notifications: {
        total: totalNotifications,
        read: readNotifications,
        clicked: clickedNotifications,
        dismissed: dismissedNotifications,
        read_rate: parseFloat(readRate),
        click_rate: parseFloat(clickRate),
        dismissal_rate: parseFloat(dismissalRate),
        by_type: notificationsByType,
        by_status: notificationsByStatus
      },
      campaigns: {
        total: totalCampaigns,
        emails_sent: totalEmailsSent,
        emails_delivered: totalEmailsDelivered,
        emails_opened: totalEmailsOpened,
        emails_clicked: totalEmailsClicked,
        delivery_rate: parseFloat(emailDeliveryRate),
        open_rate: parseFloat(emailOpenRate),
        click_rate: parseFloat(emailClickRate)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao obter análises gerais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter análises temporais (dados para gráficos)
router.get('/analytics/trends', async (req, res) => {
  try {
    const { period = '30d', granularity = 'day' } = req.query;
    
    // Calcular datas
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Buscar notificações
    const { data: notifications, error: notificationsError } = await adminSupabase
      .from('notifications')
      .select('created_at, is_read, clicked_at, dismissed_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (notificationsError) {
      console.error('Erro ao buscar notificações:', notificationsError);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }

    // Agrupar dados por período
    const trends = {};
    const formatDate = (date) => {
      if (granularity === 'hour') {
        return date.toISOString().substring(0, 13) + ':00:00.000Z';
      } else {
        return date.toISOString().substring(0, 10);
      }
    };

    notifications.forEach(notification => {
      const date = formatDate(new Date(notification.created_at));
      
      if (!trends[date]) {
        trends[date] = {
          date,
          sent: 0,
          read: 0,
          clicked: 0,
          dismissed: 0
        };
      }
      
      trends[date].sent++;
      if (notification.is_read) trends[date].read++;
      if (notification.clicked_at) trends[date].clicked++;
      if (notification.dismissed_at) trends[date].dismissed++;
    });

    // Converter para array e ordenar
    const trendsArray = Object.values(trends).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        granularity
      },
      trends: trendsArray
    });
  } catch (error) {
    console.error('Erro ao obter tendências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter relatório detalhado de performance
router.get('/analytics/performance', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular datas
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Buscar templates mais usados
    const { data: templateUsage, error: templateError } = await adminSupabase
      .from('email_campaigns')
      .select(`
        template_id,
        notification_templates(name, type, category),
        total_sent,
        total_delivered,
        total_opened,
        total_clicked
      `)
      .gte('created_at', startDate.toISOString())
      .not('template_id', 'is', null);

    if (templateError) {
      console.error('Erro ao buscar uso de templates:', templateError);
      return res.status(500).json({ error: 'Erro ao buscar dados de performance' });
    }

    // Agrupar por template
    const templateStats = {};
    templateUsage.forEach(campaign => {
      const templateId = campaign.template_id;
      const template = campaign.notification_templates;
      
      if (!templateStats[templateId]) {
        templateStats[templateId] = {
          template_id: templateId,
          template_name: template?.name || 'Template Desconhecido',
          template_type: template?.type || 'unknown',
          template_category: template?.category || 'unknown',
          campaigns_count: 0,
          total_sent: 0,
          total_delivered: 0,
          total_opened: 0,
          total_clicked: 0
        };
      }
      
      templateStats[templateId].campaigns_count++;
      templateStats[templateId].total_sent += campaign.total_sent || 0;
      templateStats[templateId].total_delivered += campaign.total_delivered || 0;
      templateStats[templateId].total_opened += campaign.total_opened || 0;
      templateStats[templateId].total_clicked += campaign.total_clicked || 0;
    });

    // Calcular taxas e ordenar
    const templatePerformance = Object.values(templateStats)
      .map(stat => ({
        ...stat,
        delivery_rate: stat.total_sent > 0 ? ((stat.total_delivered / stat.total_sent) * 100).toFixed(2) : '0.00',
        open_rate: stat.total_delivered > 0 ? ((stat.total_opened / stat.total_delivered) * 100).toFixed(2) : '0.00',
        click_rate: stat.total_delivered > 0 ? ((stat.total_clicked / stat.total_delivered) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.total_sent - a.total_sent);

    // Buscar horários de melhor performance
    const { data: hourlyData, error: hourlyError } = await adminSupabase
      .from('notifications')
      .select('created_at, is_read, clicked_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString());

    if (hourlyError) {
      console.error('Erro ao buscar dados por hora:', hourlyError);
      return res.status(500).json({ error: 'Erro ao buscar dados de performance' });
    }

    // Agrupar por hora do dia
    const hourlyStats = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { hour: i, sent: 0, read: 0, clicked: 0 };
    }

    hourlyData.forEach(notification => {
      const hour = new Date(notification.created_at).getHours();
      hourlyStats[hour].sent++;
      if (notification.is_read) hourlyStats[hour].read++;
      if (notification.clicked_at) hourlyStats[hour].clicked++;
    });

    const hourlyPerformance = Object.values(hourlyStats).map(stat => ({
      ...stat,
      read_rate: stat.sent > 0 ? ((stat.read / stat.sent) * 100).toFixed(2) : '0.00',
      click_rate: stat.sent > 0 ? ((stat.clicked / stat.sent) * 100).toFixed(2) : '0.00'
    }));

    res.json({
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      template_performance: templatePerformance.slice(0, 10),
      hourly_performance: hourlyPerformance,
      best_performing_hour: hourlyPerformance.reduce((best, current) => 
        parseFloat(current.read_rate) > parseFloat(best.read_rate) ? current : best
      ),
      recommendations: [
        {
          type: 'timing',
          message: `Melhor horário para envio: ${hourlyPerformance.reduce((best, current) => 
            parseFloat(current.read_rate) > parseFloat(best.read_rate) ? current : best
          ).hour}:00h`
        },
        {
          type: 'template',
          message: templatePerformance.length > 0 ? 
            `Template com melhor performance: ${templatePerformance[0].template_name}` :
            'Nenhum template encontrado no período'
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao obter relatório de performance:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;