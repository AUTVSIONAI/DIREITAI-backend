const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
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

// POST /api/plans/seed-b2b - Semear planos B2B
router.post('/seed-b2b', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    console.log('🌱 Semeando planos B2B...');
    
    const b2bPlans = [
      {
        name: 'Plano Político',
        slug: 'politico',
        description: 'Plano exclusivo para políticos com ferramentas de análise de sentimento e monitoramento.',
        price_monthly: 299.90,
        price_yearly: 2999.00,
        features: ['Monitoramento de Redes', 'Análise de Sentimento', 'Relatórios Diários', 'Suporte Dedicado'],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: -1,
          monitoring_keywords: 10
        },
        is_active: true,
        is_popular: false,
        sort_order: 10,
        color: 'purple',
        icon: 'Landmark'
      },
      {
        name: 'Plano Jornalista',
        slug: 'jornalista',
        description: 'Ferramentas avançadas de verificação de fatos e pesquisa para jornalistas.',
        price_monthly: 149.90,
        price_yearly: 1499.00,
        features: ['Verificação de Fatos Prioritária', 'Acesso a Fontes Confiáveis', 'Exportação de Dados'],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: -1,
          searches_daily: 500
        },
        is_active: true,
        is_popular: false,
        sort_order: 11,
        color: 'blue',
        icon: 'Newspaper'
      },
      {
        name: 'Plano Partido',
        slug: 'partido',
        description: 'Solução completa para partidos políticos com gestão de múltiplos perfis.',
        price_monthly: 999.90,
        price_yearly: 9999.00,
        features: ['Gestão de Múltiplos Perfis', 'Análise de Tendências', 'Estratégia de Conteúdo', 'API de Integração'],
        limits: {
          ai_conversations: -1,
          fake_news_analyses: -1,
          sub_accounts: 50
        },
        is_active: true,
        is_popular: false,
        sort_order: 12,
        color: 'red',
        icon: 'Flag'
      }
    ];

    const results = [];
    
    for (const plan of b2bPlans) {
      // Verificar se já existe
      const { data: existing } = await adminSupabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', plan.slug)
        .single();
        
      if (existing) {
        console.log(`ℹ️ Plano ${plan.name} já existe. Atualizando...`);
        const { data, error } = await adminSupabase
          .from('subscription_plans')
          .update(plan)
          .eq('id', existing.id)
          .select()
          .single();
          
        if (error) throw error;
        results.push(data);
      } else {
        console.log(`✨ Criando plano ${plan.name}...`);
        const { data, error } = await adminSupabase
          .from('subscription_plans')
          .insert(plan)
          .select()
          .single();
          
        if (error) throw error;
        results.push(data);
      }
    }

    console.log('✅ Planos B2B semeados com sucesso!');
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Erro ao semear planos B2B:', error);
    res.status(500).json({ success: false, error: 'Erro ao semear planos B2B: ' + error.message });
  }
});

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
router.get('/admin', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      const plans = getMockPlans();
      return res.json({ success: true, data: plans });
    }

    // Usar adminSupabase para garantir acesso total
    const { data: plans, error } = await adminSupabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar planos (admin):', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar planos' });
    }

    console.log(`📦 Admin Plans fetched: ${plans?.length || 0}`);
    if (plans.length > 0) {
      console.log('📋 First plan:', plans[0].name);
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
router.post('/', authenticateUser, authenticateAdmin, async (req, res) => {
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

    const { data: plan, error } = await adminSupabase
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
router.put('/:id', authenticateUser, authenticateAdmin, async (req, res) => {
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

    const { data: plan, error } = await adminSupabase
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
router.delete('/:id', authenticateUser, authenticateAdmin, async (req, res) => {
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
    const { data: users, error: usersError } = await adminSupabase
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

    const { error } = await adminSupabase
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
router.patch('/:id/toggle', authenticateUser, authenticateAdmin, async (req, res) => {
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
    const { data: currentPlan, error: fetchError } = await adminSupabase
      .from('subscription_plans')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentPlan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    // Alternar o status
    const { data: updatedPlan, error } = await adminSupabase
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
router.patch('/:id/reorder', authenticateUser, authenticateAdmin, async (req, res) => {
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
    const { data: currentPlan, error: fetchError } = await adminSupabase
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
    const { data: updatedPlan, error } = await adminSupabase
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

// POST /api/plans/seed-b2b - Semear planos B2B (admin)
/* 
// Rota duplicada e inativa (já definida no início do arquivo)
router.post('/seed-b2b', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const b2bPlans = [
      {
        name: 'Empresarial Start',

        slug: 'empresarial-start',
        description: 'Ideal para pequenas equipes e startups',
        price_monthly: 199.90,
        price_yearly: 1999.00,
        features: [
          'Até 5 usuários',
          'Painel administrativo',
          'Relatórios básicos',
          'Suporte por email'
        ],
        limits: {
          users_limit: 5,
          ai_conversations: 500,
          fake_news_analyses: 100
        },
        is_active: true,
        is_visible: true,
        is_popular: false,
        sort_order: 10,
        color: 'blue',
        icon: 'Briefcase'
      },
      {
        name: 'Empresarial Pro',
        slug: 'empresarial-pro',
        description: 'Para empresas em crescimento',
        price_monthly: 499.90,
        price_yearly: 4999.00,
        features: [
          'Até 20 usuários',
          'Painel administrativo avançado',
          'Relatórios detalhados',
          'Suporte prioritário',
          'API de integração (básico)'
        ],
        limits: {
          users_limit: 20,
          ai_conversations: 2000,
          fake_news_analyses: 500
        },
        is_active: true,
        is_visible: true,
        is_popular: true,
        sort_order: 11,
        color: 'indigo',
        icon: 'Building'
      },
      {
        name: 'Empresarial Elite',
        slug: 'empresarial-elite',
        description: 'Solução completa para grandes organizações',
        price_monthly: 999.90,
        price_yearly: 9999.00,
        features: [
          'Usuários ilimitados',
          'Gestão multi-nível',
          'Relatórios personalizados',
          'Gerente de conta dedicado',
          'API completa'
        ],
        limits: {
          users_limit: -1,
          ai_conversations: -1,
          fake_news_analyses: -1
        },
        is_active: true,
        is_visible: true,
        is_popular: false,
        sort_order: 12,
        color: 'purple',
        icon: 'Globe'
      }
    ];

    const results = [];
    
    for (const plan of b2bPlans) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', plan.slug)
        .single();
        
      if (!existing) {
        const { data, error } = await supabase
          .from('subscription_plans')
          .insert(plan)
          .select()
          .single();
          
        if (error) {
          console.error(`Erro ao criar plano ${plan.name}:`, error);
        } else {
          results.push(data);
        }
      }
    }

    res.json({ 
      success: true, 
      message: `${results.length} planos B2B criados com sucesso`,
      data: results 
    });
  } catch (error) {
    console.error('Erro ao semear planos B2B:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});
*/

module.exports = router;

// POST /api/plans/seed-b2b - Semear planos B2B (admin)
/* 
// Rota duplicada e inativa (já definida no início do arquivo)
router.post('/seed-b2b', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const entries = [
      {
        name: 'Plano Político Pro',
        slug: 'politico',
        description: 'Ferramentas para políticos e equipes',
        price_monthly: 199.9,
        price_yearly: 1999,
        features: ['Agentes políticos', 'Gestão de equipe', 'Análise de fake news avançada'],
        limits: { ai_conversations: 500, fake_news_analyses: 100 },
        is_active: true,
        is_popular: true,
        sort_order: 10,
        color: 'blue',
        icon: 'Crown'
      },
      {
        name: 'Plano Jornalista Pro',
        slug: 'jornalista',
        description: 'Ferramentas para jornalistas e redações',
        price_monthly: 149.9,
        price_yearly: 1499,
        features: ['Publicação e gestão de posts', 'Monitoramento de notícias', 'Análise de fake news'],
        limits: { ai_conversations: 300, fake_news_analyses: 200 },
        is_active: true,
        is_popular: false,
        sort_order: 11,
        color: 'green',
        icon: 'Star'
      },
      {
        name: 'Plano Partido Pro',
        slug: 'partido',
        description: 'Ferramentas para diretórios partidários',
        price_monthly: 499.9,
        price_yearly: 4990,
        features: ['Gestão multi-equipes', 'Relatórios avançados', 'Análise de fake news em massa'],
        limits: { ai_conversations: 2000, fake_news_analyses: 500 },
        is_active: true,
        is_popular: false,
        sort_order: 12,
        color: 'purple',
        icon: 'Users'
      }
    ];

    const created = [];
    for (const p of entries) {
      const { data: existing } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', p.slug)
        .single();

      if (existing && existing.id) {
        const { data: updated } = await supabase
          .from('subscription_plans')
          .update({
            name: p.name,
            description: p.description,
            price_monthly: p.price_monthly,
            price_yearly: p.price_yearly,
            features: p.features,
            limits: p.limits,
            is_active: p.is_active,
            is_popular: p.is_popular,
            sort_order: p.sort_order,
            color: p.color,
            icon: p.icon,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        created.push(updated || { slug: p.slug });
      } else {
        const { data: inserted } = await supabase
          .from('subscription_plans')
          .insert({
            name: p.name,
            slug: p.slug,
            description: p.description,
            price_monthly: p.price_monthly,
            price_yearly: p.price_yearly,
            features: p.features,
            limits: p.limits,
            is_active: p.is_active,
            is_popular: p.is_popular,
            sort_order: p.sort_order,
            color: p.color,
            icon: p.icon
          })
          .select()
          .single();
        created.push(inserted || { slug: p.slug });
      }
    }

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Seed B2B plans error:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});
*/
