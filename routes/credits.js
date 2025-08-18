const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Preços dos créditos em centavos
const CREDIT_PRICES = {
  fake_news_check: 150, // R$ 1,50
  ai_creative_message: 50, // R$ 0,50
  political_agent_conversation: 100 // R$ 1,00
};

// Pacotes de créditos disponíveis
const CREDIT_PACKAGES = {
  fake_news_check: [
    { credits: 1, price: 150, discount: 0 },
    { credits: 5, price: 700, discount: 50 }, // R$ 7,00 (desconto de R$ 0,50)
    { credits: 10, price: 1300, discount: 200 }, // R$ 13,00 (desconto de R$ 2,00)
    { credits: 20, price: 2400, discount: 600 } // R$ 24,00 (desconto de R$ 6,00)
  ],
  ai_creative_message: [
    { credits: 10, price: 450, discount: 50 }, // R$ 4,50 (desconto de R$ 0,50)
    { credits: 25, price: 1000, discount: 250 }, // R$ 10,00 (desconto de R$ 2,50)
    { credits: 50, price: 1800, discount: 700 } // R$ 18,00 (desconto de R$ 7,00)
  ],
  political_agent_conversation: [
    { credits: 5, price: 450, discount: 50 }, // R$ 4,50 (desconto de R$ 0,50)
    { credits: 10, price: 850, discount: 150 }, // R$ 8,50 (desconto de R$ 1,50)
    { credits: 20, price: 1600, discount: 400 } // R$ 16,00 (desconto de R$ 4,00)
  ]
};

// GET /api/credits/packages - Listar pacotes de créditos disponíveis
router.get('/packages', (req, res) => {
  try {
    const packages = Object.keys(CREDIT_PACKAGES).map(type => ({
      type,
      name: getPackageName(type),
      packages: CREDIT_PACKAGES[type].map(pkg => ({
        ...pkg,
        priceFormatted: formatPrice(pkg.price),
        originalPrice: formatPrice(pkg.credits * CREDIT_PRICES[type]),
        savings: pkg.discount > 0 ? formatPrice(pkg.discount) : null
      }))
    }));

    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('Erro ao listar pacotes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/credits/balance - Verificar saldo de créditos do usuário
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: credits, error } = await supabase
      .rpc('get_user_credits', {
        p_user_id: userId,
        p_credit_type: 'fake_news_check'
      });

    if (error) {
      console.error('Erro ao buscar créditos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar saldo'
      });
    }

    // Buscar todos os tipos de créditos
    const allCredits = {};
    for (const type of Object.keys(CREDIT_PRICES)) {
      const { data: typeCredits } = await supabase
        .rpc('get_user_credits', {
          p_user_id: userId,
          p_credit_type: type
        });
      
      allCredits[type] = typeCredits?.[0] || { total_credits: 0, active_credits: 0 };
    }

    res.json({
      success: true,
      credits: allCredits
    });
  } catch (error) {
    console.error('Erro ao verificar saldo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/credits/purchase - Comprar créditos
router.post('/purchase', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { creditType, packageIndex, paymentMethod = 'pix' } = req.body;

    // Validar tipo de crédito
    if (!CREDIT_PACKAGES[creditType]) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de crédito inválido'
      });
    }

    // Validar pacote
    const selectedPackage = CREDIT_PACKAGES[creditType][packageIndex];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Pacote inválido'
      });
    }

    // Simular processamento de pagamento
    // Em produção, aqui seria integrado com Stripe, PagSeguro, etc.
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Adicionar créditos ao usuário
    const { data: creditId, error } = await supabase
      .rpc('add_user_credits', {
        p_user_id: userId,
        p_credit_type: creditType,
        p_credits: selectedPackage.credits,
        p_price_paid: selectedPackage.price,
        p_payment_id: paymentId
      });

    if (error) {
      console.error('Erro ao adicionar créditos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar compra'
      });
    }

    // Log da compra
    console.log(`Créditos comprados: ${userId} - ${selectedPackage.credits}x ${creditType} - R$ ${selectedPackage.price/100}`);

    res.json({
      success: true,
      message: 'Créditos adicionados com sucesso!',
      purchase: {
        id: creditId,
        credits: selectedPackage.credits,
        type: creditType,
        price: selectedPackage.price,
        paymentId,
        paymentMethod
      }
    });
  } catch (error) {
    console.error('Erro na compra de créditos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/credits/history - Histórico de compras de créditos
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: history, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico'
      });
    }

    const formattedHistory = history.map(item => ({
      id: item.id,
      type: item.credit_type,
      typeName: getPackageName(item.credit_type),
      credits: item.purchased_credits,
      remaining: item.remaining_credits,
      price: formatPrice(item.price_paid),
      paymentId: item.payment_id,
      purchaseDate: item.created_at,
      expiresAt: item.expires_at
    }));

    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Funções auxiliares
function getPackageName(type) {
  const names = {
    fake_news_check: 'Análises de Fake News',
    ai_creative_message: 'Mensagens IA Criativa',
    political_agent_conversation: 'Conversas com Agentes Políticos'
  };
  return names[type] || type;
}

function formatPrice(centavos) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}

module.exports = router;