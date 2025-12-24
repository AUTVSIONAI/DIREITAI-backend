const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

    // Listar políticos
router.get('/', async (req, res) => {
  try {
    const { state, party, position, search, email, limit = 12, page = 1, use_real_data } = req.query;
    
    // Se for busca por email para resolver vínculo (interno/admin ou próprio usuário)
    if (email) {
      // Usar adminSupabase para garantir que conseguimos buscar pelo email independente de RLS
      const { data, error } = await adminSupabase
        .from('politicians')
        .select('*')
        .ilike('email', email)
        .limit(1);
        
      if (error) throw error;
      return res.json(data);
    }
    
    // Se solicitado dados reais de deputados federais
    if (use_real_data === 'true' && position === 'deputado') {
      try {
        const externalAPIs = require('../services/externalAPIs');
        const deputadosList = await externalAPIs.fetchDeputadosList();
        
        let filteredDeputados = deputadosList;
        
        // Aplicar filtros
        if (state) {
          filteredDeputados = filteredDeputados.filter(dep => 
            dep.ultimoStatus?.siglaUf === state.toUpperCase()
          );
        }
        if (party) {
          filteredDeputados = filteredDeputados.filter(dep => 
            dep.ultimoStatus?.siglaPartido === party.toUpperCase()
          );
        }
        if (search) {
          filteredDeputados = filteredDeputados.filter(dep => 
            dep.nome.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        // Paginação
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedDeputados = filteredDeputados.slice(offset, offset + parseInt(limit));
        
        // Formatar dados para o frontend
        const formattedDeputados = paginatedDeputados.map(dep => ({
          id: dep.id,
          external_id: dep.id.toString(),
          name: dep.nome,
          full_name: dep.nome,
          party: dep.ultimoStatus?.siglaPartido,
          state: dep.ultimoStatus?.siglaUf,
          position: 'deputado federal',
          level: 'federal',
          photo_url: dep.ultimoStatus?.urlFoto,
          email: dep.ultimoStatus?.gabinete?.email,
          phone: dep.ultimoStatus?.gabinete?.telefone,
          office: dep.ultimoStatus?.gabinete?.nome,
          source: 'camara_oficial',
          expenses: {
            simulated: true,
            total_year: Math.floor(Math.random() * 500000) + 100000,
            categories: {
              'Combustíveis e lubrificantes': Math.floor(Math.random() * 50000) + 10000,
              'Manutenção de escritório de apoio': Math.floor(Math.random() * 30000) + 5000,
              'Locação ou fretamento de veículos': Math.floor(Math.random() * 40000) + 8000
            }
          }
        }));
        
        const totalPages = Math.ceil(filteredDeputados.length / parseInt(limit));
        
        return res.json({
          success: true,
          data: formattedDeputados,
          pagination: {
            page: parseInt(page),
            pages: totalPages,
            limit: parseInt(limit),
            total: filteredDeputados.length
          },
          source: 'camara_oficial'
        });
        
      } catch (apiError) {
        console.error('Erro ao buscar dados reais da Câmara:', apiError);
        // Fallback para dados do Supabase em caso de erro
      }
    }
    
    // Busca padrão no Supabase
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('politicians')
      .select('*, expenses_visible, politician_points(points)', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_approved', true)
      .order('name')
      .range(offset, offset + parseInt(limit) - 1);

    // Aplicar filtros condicionalmente
    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    if (party) {
      query = query.eq('party', party);
    }
    if (position) {
      query = query.eq('position', position);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,short_bio.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Calcular score total para cada político
    const enrichedData = data.map(politician => {
      const totalPoints = politician.politician_points 
        ? politician.politician_points.reduce((sum, item) => sum + item.points, 0) 
        : 0;
      
      // Remover o array de pontos para não poluir a resposta
      const { politician_points, ...rest } = politician;
      return {
        ...rest,
        gamification_score: totalPoints
      };
    });

    const totalPages = Math.ceil((count || 0) / parseInt(limit));
    
    return res.json({
      success: true,
      data: enrichedData,
      pagination: {
        page: parseInt(page),
        pages: totalPages,
        limit: parseInt(limit),
        total: count
      },
      source: 'database'
    });
  } catch (error) {
    console.error('Erro na listagem de políticos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar político específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { use_real_data } = req.query;
    
    // Se solicitado dados reais e o ID parece ser de deputado federal
    if (use_real_data === 'true' && !isNaN(id) && id.length >= 5) {
      try {
        const externalAPIs = require('../services/externalAPIs');
        const deputadoData = await externalAPIs.fetchDeputadoCompleteData(id);
        
        if (deputadoData) {
          // Formatar dados para o frontend
          const formattedDeputado = {
            id: deputadoData.id,
            external_id: deputadoData.id.toString(),
            name: deputadoData.nome,
            full_name: deputadoData.nome,
            party: deputadoData.ultimoStatus?.siglaPartido,
            state: deputadoData.ultimoStatus?.siglaUf,
            position: 'deputado federal',
            level: 'federal',
            photo_url: deputadoData.ultimoStatus?.urlFoto,
            email: deputadoData.ultimoStatus?.gabinete?.email,
            phone: deputadoData.ultimoStatus?.gabinete?.telefone,
            office: deputadoData.ultimoStatus?.gabinete?.nome,
            cpf: deputadoData.cpf,
            birth_date: deputadoData.dataDeNascimento,
            birth_place: `${deputadoData.municipioDeNascimento}/${deputadoData.ufDeNascimento}`,
            education: deputadoData.escolaridade,
            gender: deputadoData.sexo,
            social_networks: {
              website: deputadoData.urlWebsite,
              facebook: deputadoData.redeSocial?.find(r => r.includes('facebook')),
              twitter: deputadoData.redeSocial?.find(r => r.includes('twitter')),
              instagram: deputadoData.redeSocial?.find(r => r.includes('instagram'))
            },
            expenses: deputadoData.expenses || {
              simulated: true,
              total_year: Math.floor(Math.random() * 500000) + 100000,
              categories: {
                'Combustíveis e lubrificantes': Math.floor(Math.random() * 50000) + 10000,
                'Manutenção de escritório de apoio': Math.floor(Math.random() * 30000) + 5000,
                'Locação ou fretamento de veículos': Math.floor(Math.random() * 40000) + 8000
              }
            },
            source: 'camara_oficial'
          };
          
          return res.json({ 
            success: true, 
            data: formattedDeputado,
            source: 'camara_oficial'
          });
        }
      } catch (apiError) {
        console.error('Erro ao buscar dados reais do deputado:', apiError);
        // Fallback para dados do Supabase em caso de erro
      }
    }

    const { data: politician, error } = await supabase
      .from('politicians')
      .select(`
        *,
        politician_agents (
          id,
          trained_prompt,
          voice_id,
          personality_config,
          is_active
        ),
        politician_points(points)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_approved', true)
      .single();

    if (error || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    // Calcular score
    const totalPoints = politician.politician_points 
      ? politician.politician_points.reduce((sum, item) => sum + item.points, 0) 
      : 0;

    const { politician_points, ...rest } = politician;
    const enrichedPolitician = {
      ...rest,
      gamification_score: totalPoints
    };

    res.json({
      success: true,
      data: enrichedPolitician,
      source: 'database'
    });
  } catch (error) {
    console.error('Erro ao buscar político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar político (apenas admin)
router.post('/', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar políticos.' });
    }

    const {
      name,
      position,
      state,
      party,
      photo_url,
      short_bio,
      bio,
      social_links,
      social_media,
      government_plan,
      government_plan_pdf_url,
      main_ideologies
    } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: 'Nome e cargo são obrigatórios' });
    }

    // Map fields to DB columns (prefer short_bio over bio if DB uses short_bio)
    const shortBioToSave = short_bio || bio;
    const socialLinksToSave = social_links || social_media || {};

    const { data: politician, error } = await supabase
      .from('politicians')
      .insert({
        name,
        position,
        state: state?.toUpperCase(),
        party,
        photo_url,
        short_bio: shortBioToSave,
        social_links: socialLinksToSave,
        government_plan,
        government_plan_pdf_url,
        main_ideologies: main_ideologies || []
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar político:', error);
      return res.status(500).json({ error: 'Erro ao criar político' });
    }

    res.status(201).json({
      success: true,
      data: politician,
      message: 'Político criado com sucesso'
    });
  } catch (error) {
    console.error('Erro na criação de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar político (apenas admin)
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem editar políticos.' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Mapear campos legados para o formato correto do banco (short_bio, social_links)
    if (updateData.bio) {
      if (!updateData.short_bio) updateData.short_bio = updateData.bio;
      delete updateData.bio;
    }
    if (updateData.social_media) {
      if (!updateData.social_links) updateData.social_links = updateData.social_media;
      delete updateData.social_media;
    }
    
    // Mapear status para is_approved
    if (updateData.status === 'approved') {
      updateData.is_approved = true;
      updateData.is_active = true;
    } else if (updateData.status === 'pending') {
      updateData.is_approved = false;
    } else if (updateData.status === 'rejected') {
      updateData.is_approved = false;
      updateData.is_active = false;
    }
    // NOTA: 'status' é uma coluna válida no banco, então não deletamos.
    
    // Remover campos que não devem ser atualizados diretamente ou não existem
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.average_rating;
    delete updateData.total_votes;
    delete updateData.popularity_score;
    // level, source, municipality SÃO colunas válidas no banco, manter.

    if (updateData.state) {
      updateData.state = updateData.state.toUpperCase();
    }

    const { data: politician, error } = await supabase
      .from('politicians')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar político:', error);
      return res.status(500).json({ error: 'Erro ao atualizar político' });
    }

    if (!politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    res.json({
      success: true,
      data: politician,
      message: 'Político atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro na atualização de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar político (apenas admin)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    // Verificar se é admin usando o role já definido no middleware
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar políticos.' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('politicians')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar político:', error);
      return res.status(500).json({ error: 'Erro ao deletar político' });
    }

    res.json({
      success: true,
      message: 'Político removido com sucesso'
    });
  } catch (error) {
    console.error('Erro na remoção de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas de avaliações para políticos específicos

// Listar avaliações de um político
router.get('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, sort = 'recent', limit = 10 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Verificar se o político existe
    const { data: politician } = await supabase
      .from('politicians')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    // Definir ordenação
    let orderBy = 'created_at';
    let ascending = false;
    
    if (sort === 'rating_high') {
      orderBy = 'rating';
      ascending = false;
    } else if (sort === 'rating_low') {
      orderBy = 'rating';
      ascending = true;
    }

    const { data: ratings, error, count } = await supabase
      .from('politician_ratings')
      .select('*', { count: 'exact' })
      .eq('politician_id', id)
      .order(orderBy, { ascending })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Erro ao buscar avaliações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Calcular estatísticas
    const { data: allRatings } = await supabase
      .from('politician_ratings')
      .select('rating')
      .eq('politician_id', id);

    const totalVotes = allRatings?.length || 0;
    const averageRating = totalVotes > 0 
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalVotes 
      : 0;

    const ratingDistribution = {
      1: allRatings?.filter(r => r.rating === 1).length || 0,
      2: allRatings?.filter(r => r.rating === 2).length || 0,
      3: allRatings?.filter(r => r.rating === 3).length || 0,
      4: allRatings?.filter(r => r.rating === 4).length || 0,
      5: allRatings?.filter(r => r.rating === 5).length || 0
    };

    const totalPages = Math.ceil((count || 0) / parseInt(limit));

    res.json({
      success: true,
      data: ratings,
      stats: {
        total_votes: totalVotes,
        average_rating: Math.round(averageRating * 100) / 100,
        rating_distribution: ratingDistribution
      },
      pagination: {
        page: parseInt(page),
        pages: totalPages,
        limit: parseInt(limit),
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Erro ao listar avaliações do político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar avaliação do usuário logado para um político
router.get('/:id/user-rating', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: userRating, error } = await supabase
      .from('politician_ratings')
      .select('*')
      .eq('politician_id', id)
      .eq('user_id', req.user.auth_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar avaliação do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      success: true,
      data: userRating || null
    });
  } catch (error) {
    console.error('Erro ao buscar avaliação do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar avaliação para um político
router.post('/:id/ratings', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    console.log('🔍 POST Rating - Dados recebidos:', { id, rating, comment, user: req.user });

    if (!rating || rating < 1 || rating > 5) {
      console.log('❌ Erro: Rating inválido:', rating);
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' });
    }

    // Verificar se o político existe
    const { data: politician } = await supabase
      .from('politicians')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    // Verificar se o usuário já avaliou este político
    console.log('🔍 Verificando avaliação existente para user_id:', req.user.auth_id);
    const { data: existingRating } = await supabase
      .from('politician_ratings')
      .select('id')
      .eq('politician_id', id)
      .eq('user_id', req.user.auth_id)
      .single();

    if (existingRating) {
      console.log('❌ Erro: Usuário já avaliou este político');
      return res.status(400).json({ error: 'Você já avaliou este político. Use PUT para atualizar sua avaliação.' });
    }

    const { data: newRating, error } = await supabase
      .from('politician_ratings')
      .insert({
        politician_id: id,
        user_id: req.user.auth_id,
        rating: parseInt(rating),
        comment: comment || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao criar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(id);

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

// Atualizar avaliação de um político
router.put('/:id/ratings', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' });
    }

    // Verificar se a avaliação existe
    const { data: existingRating, error: checkError } = await supabase
      .from('politician_ratings')
      .select('id')
      .eq('politician_id', id)
      .eq('user_id', req.user.auth_id)
      .single();

    if (checkError || !existingRating) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.comment = comment;

    const { data: updatedRating, error } = await supabase
      .from('politician_ratings')
      .update(updateData)
      .eq('politician_id', id)
      .eq('user_id', req.user.auth_id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao atualizar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(id);

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

// Deletar avaliação de um político
router.delete('/:id/ratings', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('politician_ratings')
      .delete()
      .eq('politician_id', id)
      .eq('user_id', req.user.auth_id);

    if (error) {
      console.error('Erro ao deletar avaliação:', error);
      return res.status(500).json({ error: 'Erro ao deletar avaliação' });
    }

    // Atualizar estatísticas do político
    await updatePoliticianStats(id);

    res.json({
      success: true,
      message: 'Avaliação removida com sucesso'
    });
  } catch (error) {
    console.error('Erro na remoção de avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para atualizar estatísticas do político
async function updatePoliticianStats(politicianId) {
  try {
    const { data: ratings, error } = await adminSupabase
      .from('politician_ratings')
      .select('rating')
      .eq('politician_id', politicianId);

    if (error) {
      console.error('Erro ao buscar avaliações para atualizar stats:', error);
      return;
    }

    const totalVotes = ratings?.length || 0;
    const averageRating = totalVotes > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalVotes 
      : 0;

    // Calcular pontuação de popularidade (baseada em número de votos e média)
    const popularityScore = Math.round((averageRating * totalVotes) / 5 * 100);

    await adminSupabase
      .from('politicians')
      .update({
        total_votes: totalVotes,
        average_rating: Math.round(averageRating * 100) / 100,
        popularity_score: popularityScore
      })
      .eq('id', politicianId);
  } catch (error) {
    console.error('Erro ao atualizar estatísticas do político:', error);
  }
}

// Obter cidades disponíveis
router.get('/cities', async (req, res) => {
  try {
    const { data: cities, error } = await supabase
      .from('politicians')
      .select('city')
      .not('city', 'is', null)
      .neq('city', '')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar cidades:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Extrair cidades únicas e ordenar
    const uniqueCities = [...new Set(cities.map(p => p.city).filter(Boolean))].sort();

    res.json({
      success: true,
      data: uniqueCities
    });
  } catch (error) {
    console.error('Erro na busca de cidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estados disponíveis
router.get('/states', async (req, res) => {
  try {
    const { data: states, error } = await supabase
      .from('politicians')
      .select('state')
      .not('state', 'is', null)
      .neq('state', '')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar estados:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Extrair estados únicos e ordenar
    const uniqueStates = [...new Set(states.map(p => p.state).filter(Boolean))].sort();

    res.json({
      success: true,
      data: uniqueStates
    });
  } catch (error) {
    console.error('Erro na busca de estados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter partidos disponíveis
router.get('/parties', async (req, res) => {
  try {
    const { data: parties, error } = await supabase
      .from('politicians')
      .select('party')
      .not('party', 'is', null)
      .neq('party', '')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar partidos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Extrair partidos únicos e ordenar
    const uniqueParties = [...new Set(parties.map(p => p.party).filter(Boolean))].sort();

    res.json({
      success: true,
      data: uniqueParties
    });
  } catch (error) {
    console.error('Erro na busca de partidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter posições disponíveis
router.get('/positions', async (req, res) => {
  try {
    const { data: positions, error } = await supabase
      .from('politicians')
      .select('position')
      .not('position', 'is', null)
      .neq('position', '')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar posições:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Extrair posições únicas e ordenar
    const uniquePositions = [...new Set(positions.map(p => p.position).filter(Boolean))].sort();

    res.json({
      success: true,
      data: uniquePositions
    });
  } catch (error) {
    console.error('Erro na busca de posições:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Recalcular estatísticas do político (admin ou manutenção)
router.post('/:id/recalc-stats', async (req, res) => {
  try {
    const { id } = req.params;
    await updatePoliticianStats(id);
    return res.json({ success: true, message: 'Estatísticas recalculadas com sucesso', politician_id: id });
  } catch (error) {
    console.error('Erro ao recalcular estatísticas do político:', error);
    return res.status(500).json({ error: 'Erro ao recalcular estatísticas do político' });
  }
});

module.exports = router;