const express = require('express');
const router = express.Router();
const { optionalAuthenticateUser, authenticateUser, requireAdmin } = require('../middleware/auth');
const { adminSupabase } = require('../config/supabase');

// Não obrigar autenticação em todas as rotas.
// Usaremos autenticação opcional nas rotas públicas e exigiremos admin nas rotas administrativas.

// Obter anúncios ativos (público)
router.get('/', optionalAuthenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const nowIso = new Date().toISOString();

    // Buscar anúncios ativos e ordenar; filtrar janelas de tempo em memória
    const { data: announcements, error } = await adminSupabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar anúncios:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Filtrar por janela de exibição (start_date <= now <= end_date, considerando nulos como abertos)
    const now = new Date(nowIso);
    let filtered = (announcements || []).filter(a => {
      const startOk = !a.start_date || new Date(a.start_date) <= now;
      const endOk = !a.end_date || new Date(a.end_date) >= now;
      return startOk && endOk;
    });

    // Filtrar por audiência
    filtered = filtered.filter(a => {
      const audience = a.target_audience || { type: 'all' };
      if (audience.type === 'authenticated') return !!userId;
      if (audience.type === 'guests') return !userId;
      return true; // 'all' ou outros tipos tratados no frontend
    });

    // Remover dispensados pelo usuário autenticado
    if (userId) {
      const { data: dismissals } = await adminSupabase
        .from('announcement_dismissals')
        .select('announcement_id')
        .eq('user_id', userId);
      const dismissedIds = new Set((dismissals || []).map(d => d.announcement_id));
      filtered = filtered.filter(a => !dismissedIds.has(a.id));
    }

    res.json(filtered);
  } catch (error) {
    console.error('Erro ao buscar anúncios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter anúncio específico
router.get('/:id', optionalAuthenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows, error } = await adminSupabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) {
      console.error('Erro ao buscar anúncio:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dispensar anúncio
router.post('/:id/dismiss', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    // Verificar se o anúncio existe
    const { data: announcement, error: annError } = await adminSupabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single();

    if (annError || !announcement) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Registrar dispensa
    await adminSupabase
      .from('announcement_dismissals')
      .insert({ announcement_id: id, user_id: userId })
      .select();

    // Incrementar contador de dispensas
    await adminSupabase
      .rpc('increment_announcement_dismiss', { announcement_id_input: id })
      .catch(async () => {
        // Fallback se função RPC não existir
        const { data: current } = await adminSupabase
          .from('announcements')
          .select('dismiss_count')
          .eq('id', id)
          .single();
        const next = (current?.dismiss_count || 0) + 1;
        await adminSupabase
          .from('announcements')
          .update({ dismiss_count: next })
          .eq('id', id);
      });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao dispensar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar clique no anúncio
router.post('/:id/click', optionalAuthenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: announcement, error: annError } = await adminSupabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single();

    if (annError || !announcement) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Incrementar contador de cliques
    await adminSupabase
      .rpc('increment_announcement_click', { announcement_id_input: id })
      .catch(async () => {
        const { data: current } = await adminSupabase
          .from('announcements')
          .select('click_count')
          .eq('id', id)
          .single();
        const next = (current?.click_count || 0) + 1;
        await adminSupabase
          .from('announcements')
          .update({ click_count: next })
          .eq('id', id);
      });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao registrar clique no anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar visualização do anúncio
router.post('/:id/view', optionalAuthenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: announcement, error: annError } = await adminSupabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single();

    if (annError || !announcement) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Incrementar contador de visualizações
    await adminSupabase
      .rpc('increment_announcement_view', { announcement_id_input: id })
      .catch(async () => {
        const { data: current } = await adminSupabase
          .from('announcements')
          .select('view_count')
          .eq('id', id)
          .single();
        const next = (current?.view_count || 0) + 1;
        await adminSupabase
          .from('announcements')
          .update({ view_count: next })
          .eq('id', id);
      });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao registrar visualização do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === ROTAS ADMINISTRATIVAS ===

// Obter todos os anúncios (admin)
router.get('/admin/all', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = adminSupabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('is_active', status === 'active');
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      // Supabase não tem ILIKE com múltiplos campos; aplicar busca simples client-side
      const { data: all } = await adminSupabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      const filtered = (all || []).filter(a => {
        const s = String(search).toLowerCase();
        return (
          String(a.title || '').toLowerCase().includes(s) ||
          String(a.message || '').toLowerCase().includes(s)
        );
      });
      const total = filtered.length;
      const paginated = filtered.slice(from, to + 1);
      return res.json({ announcements: paginated, total, totalPages: Math.ceil(total / limitNum) });
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Erro ao buscar anúncios (admin):', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json({ announcements: data || [], total: count || 0, totalPages: Math.ceil((count || 0) / limitNum) });
  } catch (error) {
    console.error('Erro ao buscar anúncios (admin):', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo anúncio (admin)
router.post('/admin', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'info',
      style = 'banner',
      position = 'top',
      is_dismissible = true,
      is_persistent = false,
      target_audience = { type: 'all' },
      display_rules = {},
      action,
      styling,
      priority = 'medium',
      start_date,
      end_date
    } = req.body;

    const createdBy = req.user.id;

    // Validação básica
    if (!title || !message) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    const { data, error } = await adminSupabase
      .from('announcements')
      .insert({
        title,
        message,
        type,
        style,
        position,
        is_dismissible,
        is_persistent,
        target_audience,
        display_rules,
        action,
        styling,
        priority,
        start_date,
        end_date,
        created_by: createdBy,
        is_active: true,
        view_count: 0,
        click_count: 0,
        dismiss_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar anúncio:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar anúncio (admin)
router.put('/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      type,
      style,
      position,
      is_dismissible,
      is_persistent,
      target_audience,
      display_rules,
      action,
      styling,
      is_active,
      priority,
      start_date,
      end_date
    } = req.body;

    const { data, error } = await adminSupabase
      .from('announcements')
      .update({
        title,
        message,
        type,
        style,
        position,
        is_dismissible,
        is_persistent,
        target_audience,
        display_rules,
        action,
        styling,
        is_active,
        priority,
        start_date,
        end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar anúncio (admin)
router.delete('/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await adminSupabase
      .from('announcements')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar/desativar anúncio (admin)
router.patch('/admin/:id/toggle', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: current } = await adminSupabase
      .from('announcements')
      .select('is_active')
      .eq('id', id)
      .single();
    const next = !current?.is_active;
    const { data, error } = await adminSupabase
      .from('announcements')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao alternar status do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas do anúncio (admin)
router.get('/admin/:id/stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: a, error } = await adminSupabase
      .from('announcements')
      .select('id,title,view_count,click_count,dismiss_count,created_at')
      .eq('id', id)
      .single();

    if (error || !a) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    const views = a.view_count || 0;
    const clicks = a.click_count || 0;
    const dismissals = a.dismiss_count || 0;
    const click_rate = views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0;
    const dismiss_rate = views > 0 ? Math.round((dismissals / views) * 10000) / 100 : 0;
    res.json({
      id: a.id,
      title: a.title,
      view_count: views,
      click_count: clicks,
      dismiss_count: dismissals,
      created_at: a.created_at,
      click_rate,
      dismiss_rate
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;