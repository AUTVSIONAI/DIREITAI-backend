const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Verificar se usuário já baixou a Constituição
router.get('/download-status/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Resolver o ID do usuário (pode ser auth_id ou id da tabela users)
    let targetId = userId;
    let isSelf = false;
    
    console.log(`[Constitution] Check status for ${userId} (User: ${req.user.email})`);

    // Normalizar IDs para string para comparação
    const reqUserId = req.user.id ? req.user.id.toString().toLowerCase().trim() : '';
    const reqAuthId = req.user.auth_id ? req.user.auth_id.toString().toLowerCase().trim() : '';
    const paramUserId = userId ? userId.toString().toLowerCase().trim() : '';

    console.log(`[Constitution] IDs - Param: ${paramUserId}, Auth: ${reqAuthId}, User: ${reqUserId}`);

    // Se o ID passado for igual ao auth_id do usuário logado, usar o id do perfil
    if (reqAuthId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
      console.log(`[Constitution] Resolved auth_id ${userId} to users.id ${targetId}`);
    } else if (reqUserId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
    }

    if (!isSelf && req.user.role !== 'admin') {
      console.log(`[Constitution] Access denied. Request: ${userId}, User: ${req.user.id}`);
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

    const { data, error } = await adminSupabase
      .from('constitution_downloads')
      .select('*')
      .eq('user_id', targetId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erro ao verificar download:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      hasDownloaded: !!data,
      downloadInfo: data || null
    });
  } catch (error) {
    console.error('Erro ao verificar status de download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar download da Constituição
router.post('/download/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Resolver o ID do usuário (pode ser auth_id ou id da tabela users)
    let targetId = userId;
    let isSelf = false;
    
    console.log(`[Constitution] Register download for ${userId} (User: ${req.user.email})`);

    // Normalizar IDs para string para comparação
    const reqUserId = req.user.id ? req.user.id.toString().toLowerCase().trim() : '';
    const reqAuthId = req.user.auth_id ? req.user.auth_id.toString().toLowerCase().trim() : '';
    const paramUserId = userId ? userId.toString().toLowerCase().trim() : '';

    // Se o ID passado for igual ao auth_id do usuário logado, usar o id do perfil
    if (reqAuthId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
      console.log(`[Constitution] Resolved auth_id ${userId} to users.id ${targetId}`);
    } else if (reqUserId === paramUserId) {
      targetId = req.user.id;
      isSelf = true;
    }
    
    // Verificar se o usuário pode acessar estes dados
    if (!isSelf && req.user.role !== 'admin') {
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

    // Verificar se já baixou
    const { data: existingDownload } = await adminSupabase
      .from('constitution_downloads')
      .select('id')
      .eq('user_id', targetId)
      .single();

    if (existingDownload) {
      return res.status(400).json({ error: 'Usuário já baixou a Constituição' });
    }

    // Registrar o download
    const { data, error } = await adminSupabase
      .from('constitution_downloads')
      .insert({
        user_id: targetId,
        points_awarded: 100
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar download:', error);
      return res.status(500).json({ error: 'Erro ao registrar download' });
    }

    res.json({
      success: true,
      download: data,
      pointsAwarded: 100
    });
  } catch (error) {
    console.error('Erro ao registrar download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;