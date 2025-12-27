const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateUser);

// GET /constitution-downloads/users/:userId/status - Verificar se usuário já baixou a Constituição
router.get('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Resolver o ID do usuário (pode ser auth_id ou id da tabela users)
    let targetId = userId;
    let isSelf = false;
    
    // Normalizar IDs para string para comparação
    const reqUserId = req.user.id ? req.user.id.toString().toLowerCase().trim() : '';
    const reqAuthId = req.user.auth_id ? req.user.auth_id.toString().toLowerCase().trim() : '';
    const paramUserId = userId ? userId.toString().toLowerCase().trim() : '';

    // Se o ID passado for igual ao auth_id do usuário logado, usar o id do perfil
    if (reqAuthId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
      console.log(`[ConstitutionDL] Resolved auth_id ${userId} to users.id ${targetId}`);
    } else if (reqUserId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
    }

    if (!isSelf && req.user.role !== 'admin') {
      console.log(`[ConstitutionDL] Access denied. Request: ${userId}, User: ${req.user.id}`);
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Se for admin e não for ele mesmo, tentar resolver o ID caso seja um auth_id
    if (!isSelf && req.user.role === 'admin') {
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('id')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .single();
        
      if (userProfile) {
        targetId = userProfile.id;
      }
    }

    // Verificar se já existe um download registrado para este usuário
    const { data: download, error } = await adminSupabase
      .from('constitution_downloads')
      .select('*')
      .eq('user_id', targetId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erro ao verificar download:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      hasDownloaded: !!download,
      downloadedAt: download?.downloaded_at || null,
      pointsAwarded: download?.points_awarded || null
    });
  } catch (error) {
    console.error('Error checking constitution download status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /constitution-downloads/users/:userId/register - Registrar download da Constituição
router.post('/users/:userId/register', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Resolver o ID do usuário (pode ser auth_id ou id da tabela users)
    let targetId = userId;
    let isSelf = false;
    
    // Normalizar IDs para string para comparação
    const reqUserId = req.user.id ? req.user.id.toString().toLowerCase().trim() : '';
    const reqAuthId = req.user.auth_id ? req.user.auth_id.toString().toLowerCase().trim() : '';
    const paramUserId = userId ? userId.toString().toLowerCase().trim() : '';

    console.log(`[ConstitutionDL] Debug Register: param=${paramUserId}, reqUser=${reqUserId}, reqAuth=${reqAuthId}, role=${req.user.role}`);

    // Se o ID passado for igual ao auth_id do usuário logado, usar o id do perfil
    if (reqAuthId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
      console.log(`[ConstitutionDL] Resolved auth_id ${userId} to users.id ${targetId}`);
    } else if (reqUserId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
      console.log(`[ConstitutionDL] Resolved user_id ${userId} to users.id ${targetId}`);
    }

    if (!isSelf && req.user.role !== 'admin') {
      console.log(`[ConstitutionDL] Access denied. Request: ${userId}, User: ${req.user.id}`);
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Se for admin e não for ele mesmo, tentar resolver o ID caso seja um auth_id
    if (!isSelf && req.user.role === 'admin') {
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('id')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .single();
        
      if (userProfile) {
        targetId = userProfile.id;
        console.log(`[ConstitutionDL] Admin resolved ${userId} to ${targetId}`);
      } else {
        console.warn(`[ConstitutionDL] Admin: User not found for ${userId}`);
        return res.status(404).json({ error: 'Usuário alvo não encontrado' });
      }
    }
    
    console.log(`[ConstitutionDL] Final targetId for insert: ${targetId}`);

    // Verificar se já existe um download registrado para este usuário
    const { data: existingDownload } = await adminSupabase
      .from('constitution_downloads')
      .select('id')
      .eq('user_id', targetId)
      .single();

    if (existingDownload) {
      return res.status(409).json({ 
        error: 'Download já registrado',
        message: 'Você já baixou a Constituição anteriormente'
      });
    }

    // Registrar o download
    const { data: download, error: downloadError } = await adminSupabase
      .from('constitution_downloads')
      .insert({
        user_id: targetId,
        points_awarded: 100
      })
      .select()
      .single();

    if (downloadError) {
      console.error('Erro ao registrar download:', downloadError);
      return res.status(500).json({ error: 'Erro ao registrar download' });
    }

    // Adicionar pontos ao usuário
    const { error: pointsError } = await adminSupabase
      .from('points')
      .insert({
        user_id: targetId,
        amount: 100,
        reason: 'Download da Constituição Federal',
        category: 'constitution_download',
        created_at: new Date().toISOString()
      });

    if (pointsError) {
      console.error('Erro ao adicionar pontos:', pointsError);
      // Não retornar erro aqui, pois o download foi registrado com sucesso
    } else {
      // Atualizar cache de pontos na tabela users
      // Primeiro buscar pontos atuais
      const { data: currentUser, error: userError } = await adminSupabase
        .from('users')
        .select('points')
        .eq('id', targetId)
        .single();
        
      if (!userError) {
        const currentPoints = currentUser.points || 0;
        await adminSupabase
          .from('users')
          .update({ points: currentPoints + 100 })
          .eq('id', targetId);
      }
    }

    res.json({
      success: true,
      download,
      pointsAwarded: 100,
      message: 'Download registrado com sucesso! Você ganhou 100 pontos.'
    });
  } catch (error) {
    console.error('Error registering constitution download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /constitution-downloads/stats - Estatísticas gerais de downloads
router.get('/stats', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    // Buscar estatísticas
    const { count: totalDownloads } = await adminSupabase
      .from('constitution_downloads')
      .select('*', { count: 'exact', head: true });

    const { data: recentDownloads } = await adminSupabase
      .from('constitution_downloads')
      .select('downloaded_at')
      .gte('downloaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('downloaded_at', { ascending: false });

    res.json({
      totalDownloads: totalDownloads || 0,
      downloadsThisWeek: recentDownloads?.length || 0,
      totalPointsAwarded: (totalDownloads || 0) * 100
    });
  } catch (error) {
    console.error('Error fetching constitution download stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;