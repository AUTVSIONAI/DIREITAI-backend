const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

// Middleware para autenticação em todas as rotas
router.use(authenticateUser);

// Obter anúncios ativos (público)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT a.* FROM announcements a
       LEFT JOIN announcement_dismissals ad ON a.id = ad.announcement_id AND ad.user_id = $1
       WHERE a.is_active = true 
         AND (a.start_date IS NULL OR a.start_date <= $2)
         AND (a.end_date IS NULL OR a.end_date >= $2)
         AND ad.id IS NULL
         AND (
           a.target_audience->>'type' = 'all' OR
           (a.target_audience->>'type' = 'authenticated' AND $1 IS NOT NULL)
         )
       ORDER BY a.priority DESC, a.created_at DESC`,
      [userId, now]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar anúncios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter anúncio específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM announcements WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dispensar anúncio
router.post('/:id/dismiss', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verificar se o anúncio existe
    const announcementResult = await pool.query(
      'SELECT id FROM announcements WHERE id = $1',
      [id]
    );

    if (announcementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Registrar dispensa
    await pool.query(
      `INSERT INTO announcement_dismissals (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [id, userId]
    );

    // Incrementar contador de dispensas
    await pool.query(
      'UPDATE announcements SET dismiss_count = dismiss_count + 1 WHERE id = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao dispensar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar clique no anúncio
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o anúncio existe
    const announcementResult = await pool.query(
      'SELECT id FROM announcements WHERE id = $1',
      [id]
    );

    if (announcementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Incrementar contador de cliques
    await pool.query(
      'UPDATE announcements SET click_count = click_count + 1 WHERE id = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao registrar clique no anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar visualização do anúncio
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o anúncio existe
    const announcementResult = await pool.query(
      'SELECT id FROM announcements WHERE id = $1',
      [id]
    );

    if (announcementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    // Incrementar contador de visualizações
    await pool.query(
      'UPDATE announcements SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao registrar visualização do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === ROTAS ADMINISTRATIVAS ===

// Obter todos os anúncios (admin)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.*,
        COUNT(*) OVER() as total_count
      FROM announcements a 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Filtros opcionais
    if (status) {
      query += ` AND a.is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }

    if (type) {
      query += ` AND a.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      query += ` AND (a.title ILIKE $${paramIndex} OR a.message ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    const announcements = result.rows;
    const totalCount = announcements.length > 0 ? parseInt(announcements[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      announcements: announcements.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        style: a.style,
        position: a.position,
        is_dismissible: a.is_dismissible,
        is_persistent: a.is_persistent,
        target_audience: a.target_audience,
        display_rules: a.display_rules,
        action: a.action,
        styling: a.styling,
        is_active: a.is_active,
        priority: a.priority,
        view_count: a.view_count,
        click_count: a.click_count,
        dismiss_count: a.dismiss_count,
        start_date: a.start_date,
        end_date: a.end_date,
        created_by: a.created_by,
        created_at: a.created_at,
        updated_at: a.updated_at
      })),
      total: totalCount,
      totalPages
    });
  } catch (error) {
    console.error('Erro ao buscar anúncios (admin):', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo anúncio (admin)
router.post('/admin', requireAdmin, async (req, res) => {
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

    const result = await pool.query(
      `INSERT INTO announcements (
        title, message, type, style, position, is_dismissible, is_persistent,
        target_audience, display_rules, action, styling, priority, start_date, end_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title, message, type, style, position, is_dismissible, is_persistent,
        JSON.stringify(target_audience), JSON.stringify(display_rules),
        JSON.stringify(action), JSON.stringify(styling), priority,
        start_date, end_date, createdBy
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar anúncio (admin)
router.put('/admin/:id', requireAdmin, async (req, res) => {
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

    const result = await pool.query(
      `UPDATE announcements SET
        title = $1, message = $2, type = $3, style = $4, position = $5,
        is_dismissible = $6, is_persistent = $7, target_audience = $8,
        display_rules = $9, action = $10, styling = $11, is_active = $12,
        priority = $13, start_date = $14, end_date = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *`,
      [
        title, message, type, style, position, is_dismissible, is_persistent,
        JSON.stringify(target_audience), JSON.stringify(display_rules),
        JSON.stringify(action), JSON.stringify(styling), is_active,
        priority, start_date, end_date, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar anúncio (admin)
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM announcements WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar/desativar anúncio (admin)
router.patch('/admin/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE announcements 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao alternar status do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas do anúncio (admin)
router.get('/admin/:id/stats', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        a.id,
        a.title,
        a.view_count,
        a.click_count,
        a.dismiss_count,
        a.created_at,
        CASE 
          WHEN a.view_count > 0 THEN ROUND((a.click_count::decimal / a.view_count::decimal) * 100, 2)
          ELSE 0
        END as click_rate,
        CASE 
          WHEN a.view_count > 0 THEN ROUND((a.dismiss_count::decimal / a.view_count::decimal) * 100, 2)
          ELSE 0
        END as dismiss_rate
      FROM announcements a
      WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do anúncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;