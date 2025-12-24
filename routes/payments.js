const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../config/supabase');
const router = express.Router();

// Flag para usar dados mock temporariamente
const USE_MOCK_DATA = false;

// Importar middleware de autenticação
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');

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
  patriota: {
    name: 'Patriota',
    price: 990, // R$ 9,90 em centavos
    currency: 'brl',
    interval: 'month',
    features: [
      'Chat DireitaGPT ilimitado',
      'IA Criativa: até 10 textos por dia',
      'Detector de Fake News: 2 análises por dia',
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

// Pacotes de créditos (centavos BRL)
const CREDIT_PACKAGES = {
  fake_news_check: [
    { credits: 1, price: 150, discount: 0 }, // R$ 1,50 por uso avulso
    { credits: 5, price: 700, discount: 6 }, // R$ 7,00 (R$ 1,40 por crédito)
    { credits: 20, price: 2600, discount: 13 }, // R$ 26,00 (R$ 1,30 por crédito)
  ],
  ai_creative_message: [
    { credits: 1, price: 150, discount: 0 },
    { credits: 10, price: 1350, discount: 10 },
    { credits: 30, price: 3600, discount: 20 },
  ],
  political_agent_conversation: [
    { credits: 1, price: 150, discount: 0 },
    { credits: 5, price: 700, discount: 6 },
    { credits: 20, price: 2600, discount: 13 },
  ],
};

// Endpoint para criar sessão de checkout (Assinaturas)
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
        affiliateCode: affiliate_code || undefined,
        type: 'subscription'
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

// Endpoint para criar sessão de Super Chat (Pagamento Único)
router.post('/superchat-checkout', authenticateUser, async (req, res) => {
  try {
    const { amount, arenaId, question, successUrl: successUrlFromBody, cancelUrl: cancelUrlFromBody } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    if (!arenaId) {
      return res.status(400).json({ error: 'Arena ID é obrigatório' });
    }

    // O valor vem em REAIS do frontend, converter para centavos
    const amountInCents = Math.round(amount * 100);

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5121';
    // Redireciona de volta para a arena com parâmetro de sucesso
    const successUrl = successUrlFromBody || `${frontendUrl}/arena/${arenaId}?superchat_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancelUrlFromBody || `${frontendUrl}/arena/${arenaId}?superchat_canceled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Super Chat - Arena do Povo',
            description: 'Destaque sua pergunta na Arena'
          },
          unit_amount: amountInCents,
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: req.user?.email,
      metadata: {
        userId: userId,
        arenaId: arenaId,
        question: question || '', // Podemos salvar a pergunta aqui ou no webhook
        type: 'superchat',
        amount: amount // Valor original
      }
    });

    res.json({ 
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Erro ao criar sessão de superchat:', error);
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
  const mode = session.mode; // 'subscription' | 'payment'
  const amountTotal = (session.amount_total || 0) / 100; // convert cents to BRL
  
  if (!userId) {
    console.error('No user ID found in session');
    return;
  }

  try {
    // Buscar o registro interno do usuário (id da tabela users)
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();

    const internalUserId = userRecord?.id;

    // Quando for assinatura (mode === 'subscription')
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

    // Registrar transação da assinatura (dados reais para relatórios)
    if (mode === 'subscription' && internalUserId) {
      const { error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: internalUserId,
            type: 'subscription',
            amount: amountTotal,
            status: 'completed',
            payment_method: 'credit_card',
            provider: 'stripe',
            created_at: new Date().toISOString()
          }
        ]);
      if (txError) {
        console.error('Error inserting subscription transaction:', txError);
      } else {
        console.log('Subscription transaction recorded');
      }
    }

    // Registrar compra da loja quando for checkout de pagamento único
    if (mode === 'payment' && session.metadata?.type === 'store_purchase' && internalUserId) {
      // Tentar recuperar itens do carrinho do metadata
      let cartItems = [];
      try {
        cartItems = JSON.parse(session.metadata.cartItems || '[]');
      } catch (e) {
        console.warn('Could not parse cartItems metadata');
      }

      // Criar transação de produto
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: internalUserId,
            type: 'product',
            amount: amountTotal,
            status: 'completed',
            payment_method: 'credit_card',
            provider: 'stripe',
            created_at: new Date().toISOString()
          }
        ]);
      if (txErr) {
        console.error('Error inserting product transaction:', txErr);
      } else {
        console.log('Product transaction recorded');
      }

      // Opcional: registrar pedido simplificado quando possível
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        const subtotal = cartItems.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 0)), 0);
        const shipping = Math.max(0, amountTotal - subtotal);
        const total = amountTotal;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              user_id: internalUserId,
              status: 'paid',
              subtotal,
              shipping_cost: shipping,
              total,
              payment_method: 'credit_card',
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order from Stripe session:', orderError);
        } else {
          // Inserir itens do pedido
          const orderItems = cartItems.map(ci => ({
            order_id: order.id,
            product_id: ci.product_id || ci.id,
            quantity: ci.quantity || 1,
            price: ci.price || 0,
          }));
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
          if (itemsError) {
            console.error('Error inserting order items:', itemsError);
          }
        }
      }
    }

    // Compra de créditos avulsos (mode payment)
    if (mode === 'payment' && session.metadata?.type === 'credit_purchase' && internalUserId) {
      const creditType = session.metadata?.creditType;
      const credits = parseInt(session.metadata?.credits || '0', 10) || 0;
      if (creditType && credits > 0) {
        try {
          // Tenta obter registro existente
          const { data: existing, error: getErr } = await supabase
            .from('user_credits')
            .select('id, active_credits')
            .eq('user_id', internalUserId)
            .eq('credit_type', creditType)
            .single();

          if (getErr && getErr.code !== 'PGRST116') { // PGRST116: no rows
            console.warn('Error fetching user_credits:', getErr);
          }

          if (existing) {
            const newCredits = (existing.active_credits || 0) + credits;
            const { error: updErr } = await supabase
              .from('user_credits')
              .update({ active_credits: newCredits, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (updErr) console.error('Error updating user credits:', updErr);
          } else {
            const { error: insErr } = await supabase
              .from('user_credits')
              .insert([
                {
                  user_id: internalUserId,
                  credit_type: creditType,
                  active_credits: credits,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);
            if (insErr) console.error('Error inserting user credits:', insErr);
          }
        } catch (creditErr) {
          console.error('Error processing credit purchase:', creditErr);
        }
        // Registrar transação de créditos para relatórios
        try {
          const { error: txErr } = await supabase
            .from('transactions')
            .insert([
              {
                user_id: internalUserId,
                type: 'credit',
                amount: amountTotal,
                status: 'completed',
                payment_method: 'credit_card',
                provider: 'stripe',
                description: `Créditos ${creditType} x ${credits}`,
                created_at: new Date().toISOString()
              }
            ]);
          if (txErr) {
            console.error('Error inserting credit transaction:', txErr);
          } else {
            console.log('Credit transaction recorded');
          }
        } catch (e) {
          console.error('Unexpected error inserting credit transaction:', e);
        }
      }
    }

    // Super Chat (Arena do Povo)
    if (mode === 'payment' && session.metadata?.type === 'superchat' && internalUserId) {
      const arenaId = session.metadata.arenaId;
      const questionContent = session.metadata.question;
      const amount = parseFloat(session.metadata.amount || '0');

      try {
        // Inserir pergunta na arena
        const { error: qError } = await adminSupabase
          .from('arena_questions')
          .insert([
            {
              arena_id: arenaId,
              user_id: internalUserId,
              content: questionContent,
              type: 'superchat',
              amount: amount,
              status: 'approved', // Super Chat entra aprovado automaticamente (ou pending se moderação for rígida)
              priority_score: amount * 2, // Fallback se trigger não existir
              is_answered: false
            }
          ]);

        if (qError) {
          console.error('Error inserting superchat question:', qError);
        } else {
          console.log('Superchat question inserted successfully');
        }

        // Registrar transação
        const { error: txErr } = await supabase
          .from('transactions')
          .insert([
            {
              user_id: internalUserId,
              type: 'superchat',
              amount: amountTotal,
              status: 'completed',
              payment_method: 'credit_card',
              provider: 'stripe',
              description: `Super Chat Arena ${arenaId}`,
              created_at: new Date().toISOString()
            }
          ]);
        
        if (txErr) console.error('Error inserting superchat transaction:', txErr);

      } catch (err) {
        console.error('Error processing superchat webhook:', err);
      }
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

// Listar pacotes de créditos
router.get('/credits/packages', async (req, res) => {
  try {
    const formatPrice = (valueCents) => {
      const value = (valueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return value;
    };
    const types = Object.keys(CREDIT_PACKAGES);
    const packages = types.map((type) => ({
      type,
      packages: CREDIT_PACKAGES[type].map(pkg => {
        const original = pkg.discount > 0 ? Math.round(pkg.price / (1 - (pkg.discount / 100))) : pkg.price;
        const savings = original - pkg.price;
        return {
          credits: pkg.credits,
          price: pkg.price,
          discount: pkg.discount,
          priceFormatted: formatPrice(pkg.price),
          originalPrice: pkg.discount > 0 ? formatPrice(original) : null,
          savings: pkg.discount > 0 ? formatPrice(savings) : null,
        };
      })
    }));
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Erro ao listar pacotes de créditos:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar pacotes' });
  }
});

// Saldo de créditos do usuário
router.get('/credits/balance', authenticateUser, async (req, res) => {
  try {
    const userAuthId = req.user.id;
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userAuthId)
      .single();

    const internalUserId = userRecord?.id;
    if (!internalUserId) {
      return res.json({ success: true, credits: {} });
    }

    const { data: rows, error } = await supabase
      .from('user_credits')
      .select('credit_type, active_credits')
      .eq('user_id', internalUserId);
    if (error) {
      console.warn('Erro ao buscar créditos do usuário:', error);
      return res.json({ success: true, credits: {} });
    }

    const creditsMap = {};
    (rows || []).forEach(r => {
      creditsMap[r.credit_type] = { active_credits: r.active_credits };
    });
    res.json({ success: true, credits: creditsMap });
  } catch (error) {
    console.error('Erro ao buscar saldo de créditos:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar saldo de créditos' });
  }
});

// Criar checkout para compra de créditos
router.post('/credits/checkout', authenticateUser, async (req, res) => {
  try {
    const { creditType, packageIndex, successUrl: successUrlFromBody, cancelUrl: cancelUrlFromBody } = req.body;
    const userId = req.user.id;

    if (!creditType || !(creditType in CREDIT_PACKAGES)) {
      return res.status(400).json({ success: false, message: 'Tipo de crédito inválido' });
    }
    const packages = CREDIT_PACKAGES[creditType];
    const pkg = packages?.[packageIndex];
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Pacote de créditos inválido' });
    }

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5121';
    const successUrl = successUrlFromBody || `${frontendUrl}/admin/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancelUrlFromBody || `${frontendUrl}/admin/plans`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Créditos (${creditType})`,
            description: `${pkg.credits} créditos para ${creditType}`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: req.user?.email,
      metadata: {
        userId,
        type: 'credit_purchase',
        creditType,
        credits: String(pkg.credits),
      },
    });

    res.json({ success: true, data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    console.error('Erro ao criar checkout de créditos:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar checkout de créditos', details: error.message });
  }
});

// Reconciliação de sessões antigas do Stripe para popular transações
router.post('/reconcile', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, types } = req.body || {}
    const toEpoch = (d) => Math.floor(new Date(d).getTime() / 1000)
    const created = {}
    if (start_date) created.gte = toEpoch(start_date)
    if (end_date) created.lte = toEpoch(end_date)
    let starting_after
    const limit = 100
    let inserted = { credit: 0, subscription: 0, product: 0 }

    while (true) {
      const sessions = await stripe.checkout.sessions.list({ limit, created, starting_after })
      const data = sessions.data || []
      for (const s of data) {
        const mode = s.mode
        const isCredit = s.metadata?.type === 'credit_purchase'
        const isStore = s.metadata?.type === 'store_purchase'
        let txType = 'product'
        if (mode === 'subscription') txType = 'subscription'
        else if (mode === 'payment' && isCredit) txType = 'credit'
        else if (mode === 'payment' && isStore) txType = 'product'
        if (Array.isArray(types) && types.length && !types.includes(txType)) continue

        const amountTotal = Number((s.amount_total || 0) / 100)
        const userAuthId = s.client_reference_id || s.metadata?.userId
        if (!userAuthId) continue
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userAuthId)
          .single()
        const internalUserId = userRecord?.id
        if (!internalUserId) continue

        const refTag = `stripe_session:${s.id}`
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .ilike('description', `%${refTag}%`)
          .eq('user_id', internalUserId)
          .limit(1)
        if (existing && existing.length) continue

        const description = (txType === 'credit')
          ? `Créditos ${s.metadata?.creditType || ''} x ${s.metadata?.credits || ''} | ${refTag}`
          : (txType === 'subscription')
            ? `Assinatura ${s.metadata?.planId || ''} | ${refTag}`
            : `Compra loja | ${refTag}`

        await supabase
          .from('transactions')
          .insert([
            {
              user_id: internalUserId,
              type: txType,
              amount: amountTotal,
              status: 'completed',
              payment_method: 'credit_card',
              provider: 'stripe',
              description,
              created_at: new Date((s.created || 0) * 1000).toISOString()
            }
          ])
        inserted[txType]++
      }
      if (data.length < limit) break
      starting_after = data[data.length - 1]?.id
    }
    res.json({ success: true, inserted })
  } catch (e) {
    console.error('Error reconciling Stripe sessions:', e)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

module.exports = router;
// Listar transações de créditos
router.get('/credits/transactions', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, limit = 100 } = req.query
    const startIso = start_date ? new Date(start_date).toISOString() : new Date(new Date().getFullYear(), 0, 1).toISOString()
    const endIso = end_date ? new Date(end_date).toISOString() : new Date().toISOString()

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, created_at, status, payment_method, description')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .eq('status', 'completed')
      .eq('type', 'credit')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (!error && Array.isArray(data) && data.length > 0) {
      const list = data.map(t => ({
        id: t.id,
        amount: Number(t.amount || 0),
        createdAt: t.created_at,
        status: t.status,
        method: t.payment_method || 'card',
        description: t.description || ''
      }))
      return res.json({ success: true, data: list })
    }

    // Fallback: derivar de Stripe checkout sessions quando tabela está vazia ou erro
    const toEpoch = d => Math.floor(new Date(d).getTime() / 1000)
    const created = {}
    if (start_date) created.gte = toEpoch(start_date)
    if (end_date) created.lte = toEpoch(end_date)
    const stripeLimit = Math.min(parseInt(limit), 100)

    try {
      const sessions = await stripe.checkout.sessions.list({ limit: stripeLimit, created })
      const out = []
      for (const s of (sessions.data || [])) {
        const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 })
        const isCredit = (items.data || []).some(it => String(it.description || '').toLowerCase().includes('crédito') || String(it.description || '').toLowerCase().includes('credito') || String(it.description || '').toLowerCase().includes('credit'))
        if (s.mode === 'payment' && (s.metadata?.type === 'credit_purchase' || isCredit)) {
          out.push({
            id: s.id,
            amount: Number((s.amount_total || 0) / 100),
            createdAt: new Date((s.created || 0) * 1000).toISOString(),
            status: s.payment_status === 'paid' ? 'completed' : s.payment_status,
            method: 'card',
            description: `Créditos ${s.metadata?.creditType || ''} x ${s.metadata?.credits || ''}`
          })
        }
      }
      return res.json({ success: true, data: out })
    } catch (stripeErr) {
      console.error('Stripe fallback error (credits/transactions):', stripeErr)
      return res.status(500).json({ error: 'Erro ao obter transações de créditos', details: String(stripeErr?.message || stripeErr) })
    }
  } catch (e) {
    console.error('Error fetching credit transactions:', e)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})