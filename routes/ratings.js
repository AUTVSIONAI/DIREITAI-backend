const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Listar avaliações
router.get('/', async (req, res) => {
  try {
    const { politician_id, user_id, limit = 20, offset = 0 } = req.query;
    
    let query = supabase
      .from('politician_ratings')
      .select(`
        *,
        politicians (
          id,
          name,
          position,
          state,
          party,
          photo_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Aplicar filtros
    if (politician_id) {
      query = query.eq('politician_id', politician_id);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: ratings, error } = await query;

    if (error) {
      console.error('Erro ao buscar avaliações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      success: true,
      data: ratings,
      count: ratings.length
    });
  } catch (error) {
    console.error('Erro na listagem de avaliações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar avaliação específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: rating, error } = await supabase
      .from('politician_ratings')
      .select(`
        *,
        politicians (
          id,
          name,
          position,
          state,
          party,
          photo_url
        )
      `)
      .eq('id', id)
      .single();

    if (error || !rating) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json({
      success: true,
      data: rating
    });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar avaliação
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      politician_id,
      rating,
      comment
    } = req.body;

    if (!politician_id || !rating) {
      return res.status(400).json({ error: 'ID do político e nota são obrigatórios' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'A nota deve estar entre 1 e 5' });
    }

    // Verificar se o político existe
    const { data: politician, error: politicianError } = await supabase
      .from('politicians')
      .select('id')
      .eq('id', politician_id)
      .eq('is_active', true)
      .single();

    if (politicianError || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    // Verificar se o usuário já avaliou este político
    const { data: existingRating } = await supabase
      .from('politician_ratings')
      .select('id')
      .eq('politician_id', politician_id)
      .eq('user_id', req.user.id)
      .single();

    if (existingRating) {
      return res.status(400).json({ error: 'Você já avaliou este político. Use PUT para atualizar sua avaliação.' });
    }

    const { data: newRating, error } = await supabase
      .from('politician_ratings')
      .insert({
        politician_id,
        user_id: req.user.id,
        rating,
        comment
      })
      .select(`
        *,
        politicians (
          id,
          name,
          position,
          state,
          party,
          photo_url
        )
      `)
      .single();

    if (error) {
      console.error('Erro ao criar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao criar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(politician_id);

    res.status(201).json({
      success: true,
      data: newRating,
      message: 'Avaliação criada com sucesso'
    });
  } catch (error) {
    console.error('Erro na criação de avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar avaliação
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'A nota deve estar entre 1 e 5' });
    }

    // Verificar se a avaliação existe e pertence ao usuário
    const { data: existingRating, error: checkError } = await supabase
      .from('politician_ratings')
      .select('user_id, politician_id')
      .eq('id', id)
      .single();

    if (checkError || !existingRating) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    if (existingRating.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode editar suas próprias avaliações' });
    }

    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const { data: updatedRating, error } = await supabase
      .from('politician_ratings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        politicians (
          id,
          name,
          position,
          state,
          party,
          photo_url
        )
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao atualizar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(existingRating.politician_id);

    res.json({
      success: true,
      data: updatedRating,
      message: 'Avaliação atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro na atualização de avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar avaliação
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a avaliação existe e pertence ao usuário ou se é admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    const { data: existingRating, error: checkError } = await supabase
      .from('politician_ratings')
      .select('user_id, politician_id')
      .eq('id', id)
      .single();

    if (checkError || !existingRating) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    if (existingRating.user_id !== req.user.id && userProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Você só pode deletar suas próprias avaliações' });
    }

    const { error } = await supabase
      .from('politician_ratings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao deletar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(existingRating.politician_id);

    res.json({
      success: true,
      message: 'Avaliação removida com sucesso'
    });
  } catch (error) {
    console.error('Erro na remoção de avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de avaliações por político
router.get('/stats/:politician_id', async (req, res) => {
  try {
    const { politician_id } = req.params;

    const { data: ratings, error } = await supabase
      .from('politician_ratings')
      .select('rating')
      .eq('politician_id', politician_id);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalVotes = ratings.length;
    const averageRating = totalVotes > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalVotes 
      : 0;

    const ratingDistribution = {
      1: ratings.filter(r => r.rating === 1).length,
      2: ratings.filter(r => r.rating === 2).length,
      3: ratings.filter(r => r.rating === 3).length,
      4: ratings.filter(r => r.rating === 4).length,
      5: ratings.filter(r => r.rating === 5).length
    };

    res.json({
      success: true,
      data: {
        politician_id,
        total_votes: totalVotes,
        average_rating: Math.round(averageRating * 100) / 100,
        rating_distribution: ratingDistribution
      }
    });
  } catch (error) {
    console.error('Erro nas estatísticas de avaliações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para atualizar estatísticas do político
async function updatePoliticianStats(politicianId) {
  try {
    const { adminSupabase } = require('../config/supabase');
    const { data: ratings, error } = await adminSupabase
      .from('politician_ratings')
      .select('rating')
      .eq('politician_id', politicianId);

    if (error) {
      console.error('Erro ao buscar avaliações para atualizar stats:', error);
      return;
    }

    const totalVotes = ratings.length;
    const averageRating = totalVotes > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalVotes 
      : 0;

    const { error: updateError } = await adminSupabase
      .from('politicians')
      .update({
        total_votes: totalVotes,
        average_rating: Math.round(averageRating * 100) / 100
      })
      .eq('id', politicianId);

    if (updateError) {
      console.error('Erro ao atualizar estatísticas do político:', updateError);
    }
  } catch (error) {
    console.error('Erro ao atualizar estatísticas do político:', error);
  }
}

module.exports = router;