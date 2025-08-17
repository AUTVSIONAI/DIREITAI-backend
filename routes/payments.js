const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Flag para usar dados mock temporariamente
const USE_MOCK_DATA = false;

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Importar middleware de autenticação
const { authenticateUser } = require('../middleware/auth');

// Planos disponíveis
const PLANS = {
  engajado: {
    name: 'Engajado Nacional',
    price: 1990, // R$ 19,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Acesso a eventos exclusivos',
      'Notificações prioritárias',
      'Badge especial no perfil',
      'Suporte prioritário'
    ]
  },
  lider: {
    name: 'Líder Conservador',
    price: 4990, // R$ 49,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Todos os benefícios do Engajado',
      'Criação de eventos próprios',
      'Acesso a relatórios avançados',
      'Mentoria exclusiva',
      'Rede de contatos VIP'
    ]
  }
};

/**
 * POST /api/payments/checkout
 * Cria uma sessão de checkout do Stripe
 */
router.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const { planType } = req.body;
    const userId = req.user.id;
    
    if (!planType || !PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de plano inválido'
      });
    }
    
    const plan = PLANS[planType];
    
    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: `Assinatura ${plan.name} - DireitAI`,
            },
            unit_amount: plan.price,
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5121'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5121'}/plans`,
      metadata: {
        userId: userId,
        planType: planType
      },
      customer_email: req.user.email,
    });
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * POST /api/payments/webhook
 * Processa eventos do webhook do Stripe
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    // Processar evento
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Processa checkout completado
 */
async function handleCheckoutCompleted(session) {
  try {
    const { userId, planType } = session.metadata;
    
    if (!userId || !planType) {
      console.error('Metadados ausentes na sessão:', session.id);
      return;
    }
    
    // Atualizar plano do usuário no Supabase
    const { error } = await supabase
      .from('users')
      .update({
        plan: planType,
        subscription_id: session.subscription,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Erro ao atualizar plano do usuário:', error);
      return;
    }
    
    console.log(`Plano ${planType} ativado para usuário ${userId}`);
    
    // Registrar transação
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'subscription',
        amount: session.amount_total,
        currency: session.currency,
        status: 'completed',
        stripe_session_id: session.id,
        stripe_subscription_id: session.subscription,
        plan_type: planType,
        created_at: new Date().toISOString()
      });
    
  } catch (error) {
    console.error('Erro em handleCheckoutCompleted:', error);
  }
}

/**
 * Processa atualização de assinatura
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);
    
    if (error) {
      console.error('Erro ao atualizar status da assinatura:', error);
    }
    
    console.log(`Assinatura ${subscription.id} atualizada para ${subscription.status}`);
    
  } catch (error) {
    console.error('Erro em handleSubscriptionUpdated:', error);
  }
}

/**
 * Processa cancelamento de assinatura
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        plan: 'gratuito',
        subscription_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);
    
    if (error) {
      console.error('Erro ao cancelar assinatura do usuário:', error);
    }
    
    console.log(`Assinatura ${subscription.id} cancelada, usuário retornado ao plano gratuito`);
    
  } catch (error) {
    console.error('Erro em handleSubscriptionDeleted:', error);
  }
}

/**
 * Processa falha no pagamento
 */
async function handlePaymentFailed(invoice) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', invoice.subscription);
    
    if (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
    }
    
    console.log(`Pagamento falhou para assinatura ${invoice.subscription}`);
    
  } catch (error) {
    console.error('Erro em handlePaymentFailed:', error);
  }
}

/**
 * Retorna os planos disponíveis
 */
router.get('/plans', async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      const plans = getMockPlans().filter(plan => plan.is_active);
      return res.json({
        success: true,
        data: plans
      });
    }

    // Buscar planos do banco de dados
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Erro ao buscar planos:', error);
      // Fallback para planos hardcoded se houver erro
      const plansArray = Object.keys(PLANS).map(key => ({
        id: key,
        ...PLANS[key]
      }));
      
      return res.json({
        success: true,
        data: plansArray
      });
    }

    // Se não há planos no banco, usar fallback
    if (!plans || plans.length === 0) {
      const plansArray = Object.keys(PLANS).map(key => ({
        id: key,
        ...PLANS[key]
      }));
      
      return res.json({
        success: true,
        data: plansArray
      });
    }

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    // Fallback para planos hardcoded
    const plansArray = Object.keys(PLANS).map(key => ({
      id: key,
      ...PLANS[key]
    }));
    
    res.json({
      success: true,
      data: plansArray
    });
  }
});

/**
 * GET /api/payments/subscription
 * Retorna informações da assinatura do usuário
 */
router.get('/subscription', authenticateUser, async (req, res) => {
  try {
    // Buscar informações do usuário incluindo dados de assinatura
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('plan, subscription_id, subscription_status, subscription_current_period_end, stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      console.error('🔍 DEBUG - Query was: SELECT plan, subscription_id, subscription_status, subscription_current_period_end, stripe_customer_id FROM users WHERE id =', req.user.id);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    let subscriptionDetails = null;

    // Se o usuário tem um subscription_id, buscar detalhes no Stripe
    if (user.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000),
          plan: {
            id: subscription.items.data[0].price.id,
            nickname: subscription.items.data[0].price.nickname,
            amount: subscription.items.data[0].price.unit_amount
          }
        };
      } catch (stripeError) {
        console.error('Erro ao buscar assinatura no Stripe:', stripeError);
        // Fallback para dados locais se houver erro no Stripe
        subscriptionDetails = {
          id: user.subscription_id,
          status: user.subscription_status || 'unknown',
          current_period_end: user.subscription_current_period_end,
          plan: {
            id: user.plan,
            nickname: user.plan,
            amount: user.plan === 'engajado' ? 1990 : 4990
          }
        };
      }
    }

    res.json({
      success: true,
      subscription: subscriptionDetails,
      status: user.subscription_status || 'inactive'
    });
    
  } catch (error) {
    console.error('Erro no endpoint /api/payments/subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;