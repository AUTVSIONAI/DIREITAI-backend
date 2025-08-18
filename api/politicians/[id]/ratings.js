import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurar CORS
const allowedOrigins = [
  'https://direitai.com',
  'https://www.direitai.com',
  'https://direitai.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5120',
  'http://localhost:5121'
];

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

export default async function handler(req, res) {
  // Configurar CORS dinamicamente
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: politicianId } = req.query;

  if (!politicianId) {
    return res.status(400).json({ error: 'ID do político é obrigatório' });
  }

  try {
    if (req.method === 'GET') {
      // Buscar avaliações do político
      const {
        page = 1,
        limit = 20,
        sort = 'recent' // recent, rating_high, rating_low
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let orderBy = { column: 'created_at', ascending: false };
      if (sort === 'rating_high') {
        orderBy = { column: 'rating', ascending: false };
      } else if (sort === 'rating_low') {
        orderBy = { column: 'rating', ascending: true };
      }

      const { data: ratings, error, count } = await supabase
        .from('politician_ratings')
        .select(`
          *,
          users (
            full_name,
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('politician_id', politicianId)
        .order(orderBy.column, { ascending: orderBy.ascending })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) {
        console.error('Erro ao buscar avaliações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Buscar estatísticas das avaliações
      const { data: stats } = await supabase
        .from('politician_ratings')
        .select('rating')
        .eq('politician_id', politicianId);

      const ratingStats = {
        total: stats?.length || 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      if (stats && stats.length > 0) {
        const sum = stats.reduce((acc, curr) => acc + curr.rating, 0);
        ratingStats.average = (sum / stats.length).toFixed(2);
        
        stats.forEach(stat => {
          ratingStats.distribution[stat.rating]++;
        });
      }

      return res.status(200).json({
        success: true,
        data: ratings,
        stats: ratingStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      });
    }

    if (req.method === 'POST') {
      // Criar nova avaliação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' });
      }

      // Verificar se o político existe
      const { data: politician } = await supabase
        .from('politicians')
        .select('id')
        .eq('id', politicianId)
        .single();

      if (!politician) {
        return res.status(404).json({ error: 'Político não encontrado' });
      }

      // Inserir ou atualizar avaliação (upsert)
      const { data: newRating, error: insertError } = await supabase
        .from('politician_ratings')
        .upsert({
          politician_id: politicianId,
          user_id: user.id,
          rating: parseInt(rating),
          comment: comment || null
        }, {
          onConflict: 'politician_id,user_id'
        })
        .select(`
          *,
          users (
            full_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (insertError) {
        console.error('Erro ao criar avaliação:', insertError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Atualizar estatísticas do político
      await updatePoliticianStats(politicianId);

      return res.status(201).json({
        success: true,
        data: newRating,
        message: 'Avaliação criada com sucesso'
      });
    }

    if (req.method === 'PUT') {
      // Atualizar avaliação existente
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' });
      }

      const { data: updatedRating, error: updateError } = await supabase
        .from('politician_ratings')
        .update({
          rating: parseInt(rating),
          comment: comment || null
        })
        .eq('politician_id', politicianId)
        .eq('user_id', user.id)
        .select(`
          *,
          users (
            full_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (updateError) {
        console.error('Erro ao atualizar avaliação:', updateError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!updatedRating) {
        return res.status(404).json({ error: 'Avaliação não encontrada' });
      }

      // Atualizar estatísticas do político
      await updatePoliticianStats(politicianId);

      return res.status(200).json({
        success: true,
        data: updatedRating,
        message: 'Avaliação atualizada com sucesso'
      });
    }

    if (req.method === 'DELETE') {
      // Deletar avaliação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { error: deleteError } = await supabase
        .from('politician_ratings')
        .delete()
        .eq('politician_id', politicianId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Erro ao deletar avaliação:', deleteError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Atualizar estatísticas do político
      await updatePoliticianStats(politicianId);

      return res.status(200).json({
        success: true,
        message: 'Avaliação removida com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de avaliações:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função para atualizar estatísticas do político
async function updatePoliticianStats(politicianId) {
  try {
    const { data: ratings } = await supabase
      .from('politician_ratings')
      .select('rating')
      .eq('politician_id', politicianId);

    if (!ratings || ratings.length === 0) {
      // Se não há avaliações, zerar estatísticas
      await supabase
        .from('politicians')
        .update({
          average_rating: 0,
          total_votes: 0
        })
        .eq('id', politicianId);
      return;
    }

    const totalVotes = ratings.length;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = (sum / totalVotes).toFixed(2);

    // Calcular pontuação de popularidade (baseada em número de votos e média)
    const popularityScore = Math.round((parseFloat(averageRating) * totalVotes) / 5 * 100);

    await supabase
      .from('politicians')
      .update({
        average_rating: parseFloat(averageRating),
        total_votes: totalVotes,
        popularity_score: popularityScore
      })
      .eq('id', politicianId);

  } catch (error) {
    console.error('Erro ao atualizar estatísticas do político:', error);
  }
}