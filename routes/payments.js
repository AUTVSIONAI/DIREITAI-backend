const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../config/supabase');
const router = express.Router();

// Flag para usar dados mock temporariamente
const USE_MOCK_DATA = false;

// Importar middleware de autenticação
const { authenticateUser } = require('../middleware/auth');

// Planos disponíveis
const PLANS = {
  gratuito: {
    name: 'Patriota Gratuito',
    price: 0, // Gratuito
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado (LLM open-source)',
      'IA Criativa: até 5 textos por dia',
      'Detector de Fake News: 1 análise por dia',
      '1 agente político básico',
      'Quiz Constituição + gamificação',
      'Suporte básico por e-mail'
    ]
  },
  cidadao: {
    name: 'Patriota Cidadão',
    price: 1990, // R$ 19,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado',
      'IA Criativa: até 20 textos por dia',
      'Detector de Fake News: 5 análises por dia',
      'Até 3 agentes políticos',
      'Ranking local e check-in em eventos',
      'Suporte prioritário'
    ]
  },
  premium: {
    name: 'Patriota Premium',
    price: 3990, // R$ 39,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado',
      'IA Criativa: até 50 textos por dia',
      'Detector de Fake News: 15 análises por dia',
      'Agentes políticos ilimitados',
      'Ranking nacional e global',
      'Relatórios simples'
    ]
  },
  pro: {
    name: 'Patriota Pro',
    price: 6990, // R$ 69,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado',
      'IA Criativa: até 100 textos por dia',
      'Detector de Fake News: 20 análises por dia',
      'Agentes políticos ilimitados',
      'Relatórios avançados semanais',
      'Pontos em dobro na gamificação',
      'Suporte 24/7'
    ]
  },
  elite: {
    name: 'Patriota Elite',
    price: 11990, // R$ 119,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado',
      'IA Criativa: até 100 textos por dia',
      'Detector de Fake News: 30 análises por dia',
      'Agentes políticos ilimitados',
      'Relatórios avançados + badge VIP',
      'Suporte premium'
    ]
  }
};

// Endpoint para criar sessão de checkout
router.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const { planId, successUrl: successUrlFromBody, cancelUrl: cancelUrlFromBody, affiliate_code } = req.body;
    const userId = req.user.id;

    console.log('Checkout request:', { planId, userId, successUrlFromBody, cancelUrlFromBody, affiliate_code });

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const plan = PLANS[planId];

    // Determinar URLs de sucesso/cancelamento com fallback seguro
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5121';
    const successUrl = successUrlFromBody || `${frontendUrl}/admin/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancelUrlFromBody || `${frontendUrl}/admin/plans`;

    console.log('Stripe checkout URLs:', { successUrl, cancelUrl, frontendUrl });

    // Criar sessão de checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: {
            name: plan.name,
            description: `Assinatura mensal do plano ${plan.name}`
          },
          unit_amount: plan.price,
          recurring: {
            interval: plan.interval
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: req.user?.email,
      metadata: {
        userId: userId,
        planId: planId,
        affiliateCode: affiliate_code || undefined
      }
    });

    console.log('Stripe session created:', session.id);

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
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Webhook event received:', event.type);

  try {
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
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Função para lidar com checkout completado
async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completed:', session.id);
  
  const userId = session.client_reference_id || session.metadata?.userId;
  const planId = session.metadata?.planId;
  
  if (!userId) {
    console.error('No user ID found in session');
    return;
  }

  try {
    // Atualizar informações do usuário no Supabase
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_plan: planId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        updated_at: new Date().toISOString()
      })
      .eq('auth_id', userId);

    if (error) {
      console.error('Error updating user subscription:', error);
    } else {
      console.log('User subscription updated successfully');
    }
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error);
  }
}

// Função para lidar com atualização de assinatura
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
  }
}

// Função para lidar com cancelamento de assinatura
async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deleted:', subscription.id);
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'canceled',
        subscription_plan: null,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error canceling subscription:', error);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
  }
}

// Função para lidar com falha de pagamento
async function handlePaymentFailed(invoice) {
  console.log('Processing payment failed:', invoice.id);
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error updating payment failed status:', error);
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

// Endpoint para obter planos disponíveis
router.get('/plans', async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      // Dados mock para desenvolvimento
      const mockPlans = {
        gratuito: {
          ...PLANS.gratuito,
          id: 'mock_gratuito',
          active: true
        },
        cidadao: {
          ...PLANS.cidadao,
          id: 'mock_cidadao',
          active: true
        },
        premium: {
          ...PLANS.premium,
          id: 'mock_premium',
          active: true
        },
        pro: {
          ...PLANS.pro,
          id: 'mock_pro',
          active: true
        },
        elite: {
          ...PLANS.elite,
          id: 'mock_elite',
          active: true
        }
      };
      
      return res.json({
        success: true,
        plans: mockPlans,
        mock: true
      });
    }

    // Buscar produtos do Stripe (implementação real)
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    const formattedPlans = {};
    
    // Mapear produtos do Stripe para nossos planos
    Object.keys(PLANS).forEach(planKey => {
      const plan = PLANS[planKey];
      const stripeProduct = products.data.find(p => 
        p.name.toLowerCase().includes(planKey) || 
        p.metadata?.planId === planKey
      );

      formattedPlans[planKey] = {
        ...plan,
        id: planKey,
        stripeProductId: stripeProduct?.id,
        stripePriceId: stripeProduct?.default_price?.id,
        active: !!stripeProduct
      };
    });

    res.json({
      success: true,
      plans: formattedPlans
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar planos',
      details: error.message 
    });
  }
});

// Endpoint para obter informações da assinatura do usuário
router.get('/subscription', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar informações do usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_plan, stripe_customer_id, stripe_subscription_id')
      .eq('auth_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user subscription:', error);
      return res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let subscriptionDetails = null;
    
    // Se o usuário tem uma assinatura ativa, buscar detalhes no Stripe
    if (user.stripe_subscription_id && user.subscription_status === 'active') {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end
        };
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription:', stripeError);
        // Continue sem os detalhes do Stripe se houver erro
      }
    }

    res.json({
      success: true,
      subscription: {
        status: user.subscription_status || 'inactive',
        plan: user.subscription_plan,
        planDetails: user.subscription_plan ? PLANS[user.subscription_plan] : null,
        stripeDetails: subscriptionDetails
      }
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;