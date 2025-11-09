const express = require('express');
const router = express.Router();
const { adminSupabase, supabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');

// Util: gerar código de afiliado
const generateAffiliateCode = () => `AFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// GET /api/affiliates/me - perfil do afiliado do usuário logado
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id; // ID da tabela users
    const { data, error } = await adminSupabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ profile: data || null });
  } catch (err) {
    console.error('Affiliates /me error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/affiliates/request-activation - solicitar ativação/criar perfil
router.post('/request-activation', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    // Verifica se já existe
    const { data: existing } = await adminSupabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await adminSupabase
        .from('affiliates')
        .update({ status: 'pending', is_active: false })
        .eq('id', existing.id);
      if (updErr) return res.status(400).json({ error: updErr.message });
      return res.json({ id: existing.id, status: 'pending' });
    }

    const payload = {
      user_id: userId,
      code: generateAffiliateCode(),
      status: 'pending',
      is_active: false,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insErr } = await adminSupabase
      .from('affiliates')
      .insert(payload)
      .select('*')
      .single();

    if (insErr) return res.status(400).json({ error: insErr.message });
    return res.status(201).json(inserted);
  } catch (err) {
    console.error('Affiliates request-activation error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/affiliates/clicks - registrar clique de afiliado
router.post('/clicks', async (req, res) => {
  try {
    const { affiliate_code, click_url, referrer, user_id, user_agent } = req.body || {};
    if (!affiliate_code) return res.status(400).json({ error: 'affiliate_code é obrigatório' });

    const payload = {
      affiliate_code,
      click_url: click_url || null,
      referrer: referrer || null,
      user_id: user_id || null,
      user_agent: user_agent || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await adminSupabase
      .from('affiliate_clicks')
      .insert(payload);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Affiliates clicks error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/affiliates/commissions/:code - listar comissões por código
router.get('/commissions/:code', authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;
    const { data, error } = await adminSupabase
      .from('affiliate_commissions')
      .select('id, order_id, product_id, commission_amount, status, created_at')
      .eq('affiliate_code', code)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ commissions: data || [] });
  } catch (err) {
    console.error('Affiliates commissions error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: listar afiliados com paginação e enriquecimento de user
router.get('/', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const status = (req.query.status || 'all').toString();
    const search = (req.query.search || '').toString().trim();

    let query = adminSupabase.from('affiliates').select('*', { count: 'exact' });

    if (status && status !== 'all') {
      if (status === 'active') query = query.eq('is_active', true);
      else query = query.eq('is_active', false);
    }
    if (search) {
      query = query.ilike('user_id', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: affiliates, error, count } = await query.range(from, to);
    if (error) return res.status(400).json({ error: error.message });

    const userIds = [...new Set((affiliates || []).map(a => a.user_id).filter(Boolean))];
    let usersById = {};
    if (userIds.length) {
      const { data: usersData, error: usersErr } = await adminSupabase
        .from('users')
        .select('id, full_name, username, email')
        .in('id', userIds);
      if (!usersErr && usersData) {
        usersById = Object.fromEntries(usersData.map(u => [u.id, u]));
      }
    }

    const enriched = (affiliates || []).map(a => ({
      ...a,
      user_display_name: usersById[a.user_id]?.full_name || usersById[a.user_id]?.username || usersById[a.user_id]?.email || a.user_id,
      user_email: usersById[a.user_id]?.email || null,
      user_username: usersById[a.user_id]?.username || null,
    }));

    return res.json({
      affiliates: enriched,
      total: count || 0,
      page,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit))
    });
  } catch (err) {
    console.error('Affiliates list error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: aprovar afiliado
router.patch('/:id/approve', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await adminSupabase
      .from('affiliates')
      .update({ status: 'active', is_active: true })
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('Affiliates approve error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: rejeitar afiliado
router.patch('/:id/reject', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await adminSupabase
      .from('affiliates')
      .update({ status: 'rejected', is_active: false })
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('Affiliates reject error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: ativar/desativar afiliado
router.patch('/:id/active', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body || {};
    const { error } = await adminSupabase
      .from('affiliates')
      .update({ is_active: !!active, status: !!active ? 'active' : 'rejected' })
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('Affiliates set active error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: atualizar taxa padrão de comissão
router.patch('/:id/commission-rate', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body || {};
    if (rate == null) return res.status(400).json({ error: 'rate é obrigatório' });
    const { error } = await adminSupabase
      .from('affiliates')
      .update({ commission_rate_default: rate })
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('Affiliates update commission error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: resumo de afiliados e comissões
router.get('/summary', authenticateUser, authenticateAdmin, async (req, res) => {
  try {
    // total de afiliados
    const { count: totalAffiliates, error: affErr } = await adminSupabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
    if (affErr) return res.status(400).json({ error: affErr.message })

    // somar comissões e pendentes
    const { data: comms, error: commErr } = await adminSupabase
      .from('affiliate_commissions')
      .select('commission_amount, amount, value, status')
    if (commErr) return res.status(400).json({ error: commErr.message })

    const getAmount = (c) => {
      if (!c) return 0
      if (typeof c.commission_amount === 'number') return c.commission_amount
      if (typeof c.amount === 'number') return c.amount
      if (typeof c.value === 'number') return c.value
      return 0
    }
    const getStatus = (c) => c?.status || c?.state || c?.payment_status || 'pending'

    const total_commissions = (comms || []).reduce((acc, c) => acc + getAmount(c), 0)
    const pending_payouts = (comms || [])
      .filter(c => getStatus(c) !== 'paid')
      .reduce((acc, c) => acc + getAmount(c), 0)

    return res.json({
      total_affiliates: totalAffiliates || 0,
      total_commissions,
      pending_payouts,
    })
  } catch (err) {
    console.error('Affiliates summary error:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})
// GET /api/affiliates/stats/:code - resumo por código
router.get('/stats/:code', authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;

    // Contagem de cliques
    const { count: clicksCount, error: clicksErr } = await adminSupabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_code', code);
    if (clicksErr) return res.status(400).json({ error: clicksErr.message });

    // Comissões para cálculo de pedidos, pendentes e total
    const { data: comms, error: commErr } = await adminSupabase
      .from('affiliate_commissions')
      .select('commission_amount, status, order_id')
      .eq('affiliate_code', code);
    if (commErr) return res.status(400).json({ error: commErr.message });

    const orders = new Set();
    let commissions_pending = 0;
    let total_commission_amount = 0;
    for (const c of (comms || [])) {
      if (c.order_id) orders.add(String(c.order_id));
      const st = (c.status || '').toString().toLowerCase();
      if (st === 'pending') commissions_pending += 1;
      const amount = typeof c.commission_amount === 'number' ? c.commission_amount : 0;
      total_commission_amount += amount;
    }

    return res.json({
      clicks: clicksCount || 0,
      orders: orders.size || (comms ? comms.length : 0),
      commissions_pending,
      total_commission_amount,
    });
  } catch (err) {
    console.error('Affiliates stats error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
module.exports = router;