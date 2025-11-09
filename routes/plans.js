const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Flag para usar dados mock (temporário até a tabela ser criada)
const USE_MOCK_DATA = false;

// Dados mock para desenvolvimento
const getMockPlans = () => [
  {
    id: 1,
    name: 'Plano Básico',
    slug: 'basico',
    description: 'Plano ideal para uso pessoal',
    price_monthly: 29.90,
    price_yearly: 299.00,
    features: ['Acesso básico à IA', 'Análise de fake news limitada'],
    limits: {
      ai_conversations: 50,
      fake_news_analyses: 10
    },
    is_active: true,
    is_visible: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Plano Premium',
    slug: 'premium',
    description: 'Plano completo para profissionais',
    price_monthly: 59.90,
    price_yearly: 599.00,
    features: ['Acesso completo à IA', 'Análise ilimitada de fake news', 'Suporte prioritário'],
    limits: {
      ai_conversations: -1,
      fake_news_analyses: -1
    },
    is_active: true,
    is_visible: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Plano Gratuito',
    slug: 'gratuito',
    description: 'Plano gratuito com funcionalidades limitadas',
    price_monthly: 0,
    price_yearly: 0,
    features: ['Acesso limitado à IA'],
    limits: {
      ai_conversations: 5,
      fake_news_analyses: 2
    },
    is_active: true,
    is_visible: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Middleware para verificar se é admin
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na verificação de admin:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};

// GET /api/plans - Listar todos os planos (público)
router.get('/', async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      const plans = getMockPlans().filter(plan => plan.is_active);
      return res.json({ success: true, data: plans });
    }

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar planos:', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar planos' });
    }

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/plans/admin - Listar todos os planos para admin (incluindo inativos)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      const plans = getMockPlans();
      return res.json({ success: true, data: plans });
    }

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar planos (admin):', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar planos' });
    }

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Erro ao buscar planos (admin):', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/plans/:id - Buscar plano específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (USE_MOCK_DATA) {
      const plan = getMockPlanById(id);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plano não encontrado' });
      }
      return res.json({ success: true, data: plan });
    }
    
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar plano:', error);
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/plans - Criar novo plano (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price_monthly,
      price_yearly,
      stripe_price_id_monthly,
      stripe_price_id_yearly,
      features,
      limits,
      is_active = true,
      is_popular = false,
      is_visible = true,
      sort_order = 0,
      color = 'blue',
      icon = 'Package'
    } = req.body;

    // Validações básicas
    if (!name || !slug) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome e slug são obrigatórios' 
      });
    }

    if (USE_MOCK_DATA) {
      const newPlan = {
        name,
        slug,
        description,
        price_monthly: parseFloat(price_monthly) || 0,
        price_yearly: parseFloat(price_yearly) || 0,
        stripe_price_id_monthly,
        stripe_price_id_yearly,
        features: features || [],
        limits: limits || {},
        is_active,
        is_popular,

        sort_order: parseInt(sort_order) || 0,
        color,
        icon
      };
      
      const plan = addMockPlan(newPlan);
      return res.status(201).json({ success: true, data: plan });
    }

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        slug,
        description,
        price_monthly: parseFloat(price_monthly) || 0,
        price_yearly: parseFloat(price_yearly) || 0,
        stripe_price_id_monthly,
        stripe_price_id_yearly,
        features: features || [],
        limits: limits || {},
        is_active,
        is_popular,

        sort_order: parseInt(sort_order) || 0,
        color,
        icon
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar plano:', error);
      if (error.code === '23505') {
        return res.status(400).json({ success: false, error: 'Slug já existe' });
      }
      return res.status(500).json({ success: false, error: 'Erro ao criar plano' });
    }

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/plans/:id - Atualizar plano (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      price_monthly,
      price_yearly,
      stripe_price_id_monthly,
      stripe_price_id_yearly,
      features,
      limits,
      is_active,
      is_popular,
      is_visible,
      sort_order,
      color,
      icon
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (price_monthly !== undefined) updateData.price_monthly = parseFloat(price_monthly);
    if (price_yearly !== undefined) updateData.price_yearly = parseFloat(price_yearly);
    if (stripe_price_id_monthly !== undefined) updateData.stripe_price_id_monthly = stripe_price_id_monthly;
    if (stripe_price_id_yearly !== undefined) updateData.stripe_price_id_yearly = stripe_price_id_yearly;
    if (features !== undefined) updateData.features = features;
    if (limits !== undefined) updateData.limits = limits;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_popular !== undefined) updateData.is_popular = is_popular;

    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    updateData.updated_at = new Date().toISOString();

    if (USE_MOCK_DATA) {
      const plan = updateMockPlan(id, updateData);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plano não encontrado' });
      }
      return res.json({ success: true, data: plan });
    }

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar plano:', error);
      if (error.code === '23505') {
        return res.status(400).json({ success: false, error: 'Slug já existe' });
      }
      return res.status(500).json({ success: false, error: 'Erro ao atualizar plano' });
    }

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// DELETE /api/plans/:id - Deletar plano (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK_DATA) {
      const success = deleteMockPlan(id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Plano não encontrado' });
      }
      return res.json({ success: true, message: 'Plano deletado com sucesso' });
    }

    // Verificar se existem usuários usando este plano
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('plan', id)
      .limit(1);

    if (usersError) {
      console.error('Erro ao verificar usuários:', usersError);
      return res.status(500).json({ success: false, error: 'Erro ao verificar usuários' });
    }

    if (users && users.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Não é possível deletar plano com usuários ativos' 
      });
    }

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar plano:', error);
      return res.status(500).json({ success: false, error: 'Erro ao deletar plano' });
    }

    res.json({ success: true, message: 'Plano deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PATCH /api/plans/:id/toggle - Ativar/Desativar plano (admin)
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK_DATA) {
      const mockPlans = getMockPlans();
      const planIndex = mockPlans.findIndex(p => p.id === parseInt(id));
      
      if (planIndex === -1) {
        return res.status(404).json({ success: false, error: 'Plano não encontrado' });
      }

      mockPlans[planIndex].is_active = !mockPlans[planIndex].is_active;
      return res.json({ 
        success: true, 
        data: mockPlans[planIndex],
        message: `Plano ${mockPlans[planIndex].is_active ? 'ativado' : 'desativado'} com sucesso` 
      });
    }

    // Buscar o plano atual
    const { data: currentPlan, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentPlan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    // Alternar o status
    const { data: updatedPlan, error } = await supabase
      .from('subscription_plans')
      .update({ is_active: !currentPlan.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alternar status do plano:', error);
      return res.status(500).json({ success: false, error: 'Erro ao alternar status do plano' });
    }

    res.json({ 
      success: true, 
      data: updatedPlan,
      message: `Plano ${updatedPlan.is_active ? 'ativado' : 'desativado'} com sucesso` 
    });
  } catch (error) {
    console.error('Erro ao alternar status do plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PATCH /api/plans/:id/visibility - Alternar visibilidade do plano (funcionalidade removida - coluna não existe)
// Esta rota foi desabilitada pois a coluna is_visible não existe na tabela subscription_plans
/*
router.patch('/:id/visibility', requireAdmin, async (req, res) => {
  res.status(501).json({ 
    success: false, 
    error: 'Funcionalidade de visibilidade não implementada - coluna is_visible não existe na tabela' 
  });
});
*/

// PATCH /api/plans/:id/reorder - Reordenar plano
router.patch('/:id/reorder', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' ou 'down'

    if (!direction || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ success: false, error: 'Direção inválida. Use "up" ou "down"' });
    }

    if (USE_MOCK_DATA) {
      const mockPlans = getMockPlans();
      const planIndex = mockPlans.findIndex(p => p.id === parseInt(id));
      
      if (planIndex === -1) {
        return res.status(404).json({ success: false, error: 'Plano não encontrado' });
      }

      // Simular reordenação
      const currentOrder = mockPlans[planIndex].sort_order || planIndex;
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      mockPlans[planIndex].sort_order = Math.max(0, newOrder);
      
      return res.json({ 
        success: true, 
        data: mockPlans[planIndex],
        message: 'Ordem do plano atualizada com sucesso' 
      });
    }

    // Buscar o plano atual
    const { data: currentPlan, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('sort_order')
      .eq('id', id)
      .single();

    if (fetchError || !currentPlan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    // Calcular nova ordem
    const currentOrder = currentPlan.sort_order || 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    const finalOrder = Math.max(0, newOrder);

    // Atualizar a ordem
    const { data: updatedPlan, error } = await supabase
      .from('subscription_plans')
      .update({ sort_order: finalOrder })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao reordenar plano:', error);
      return res.status(500).json({ success: false, error: 'Erro ao reordenar plano' });
    }

    res.json({ 
      success: true, 
      data: updatedPlan,
      message: 'Ordem do plano atualizada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao reordenar plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;