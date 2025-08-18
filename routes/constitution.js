const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verificar se usuário já baixou a Constituição
router.get('/download-status/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await supabase
      .from('constitution_downloads')
      .select('*')
      .eq('user_id', userId)
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
    
    // Verificar se o usuário pode acessar estes dados
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se já baixou
    const { data: existingDownload } = await supabase
      .from('constitution_downloads')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingDownload) {
      return res.status(400).json({ error: 'Usuário já baixou a Constituição' });
    }

    // Registrar o download
    const { data, error } = await supabase
      .from('constitution_downloads')
      .insert({
        user_id: userId,
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