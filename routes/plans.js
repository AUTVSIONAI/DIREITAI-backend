const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Flag para usar dados mock (temporário até a tabela ser criada)
const USE_MOCK_DATA = false;

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
      .order('sort_order');

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
      .order('sort_order');

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

    // Buscar estado atual
    const { data: currentPlan, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentPlan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    // Alternar estado
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .update({ 
        is_active: !currentPlan.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alternar status do plano:', error);
      return res.status(500).json({ success: false, error: 'Erro ao alternar status' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Erro ao alternar status do plano:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;