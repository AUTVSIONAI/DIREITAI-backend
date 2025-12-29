const express = require('express');
const router = express.Router();
const multer = require('multer');
const minimaxService = require('../services/minimax');
const { adminSupabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

// Configure multer for handling file uploads in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

/**
 * Upload de áudio e clonagem de voz
 */
router.post('/clone', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    const { politician_id, voice_name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de áudio é obrigatório' });
    }

    if (!politician_id) {
      return res.status(400).json({ error: 'ID do político é obrigatório' });
    }

    // 1. Upload do arquivo para o MiniMax
    const fileId = await minimaxService.uploadFile(
      req.file.buffer, 
      req.file.originalname
    );

    // 2. Clonar a voz
    // Gerar um ID de voz único baseado no nome ou ID
    const customVoiceId = `voice_${politician_id}_${Date.now()}`;
    const cloneResult = await minimaxService.cloneVoice(fileId, customVoiceId);

    // 3. Atualizar o político no banco de dados com o voice_id
    // Precisamos saber onde salvar. Assumindo que politicians tem um campo jsonb 'voice_config'
    // Ou atualizando politician_agents
    
    // Buscar config atual
    const { data: politician, error: fetchError } = await adminSupabase
      .from('politicians')
      .select('voice_config')
      .eq('id', politician_id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar político:', fetchError);
      // Não falha a requisição principal, mas avisa
    }

    const newConfig = {
      ...(politician?.voice_config || {}),
      provider: 'minimax',
      voice_id: cloneResult.voice_id || customVoiceId,
      file_id: fileId,
      last_updated: new Date().toISOString()
    };

    const { error: updateError } = await adminSupabase
      .from('politicians')
      .update({ voice_config: newConfig })
      .eq('id', politician_id);

    if (updateError) {
      throw new Error(`Erro ao salvar no banco: ${updateError.message}`);
    }

    res.json({
      success: true,
      voice_id: cloneResult.voice_id || customVoiceId,
      details: cloneResult
    });

  } catch (error) {
    console.error('Erro na rota de clonagem:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Geração de áudio (TTS)
 */
router.post('/tts', authenticateUser, async (req, res) => {
  try {
    const { text, voice_id } = req.body;

    if (!text || !voice_id) {
      return res.status(400).json({ error: 'Texto e voice_id são obrigatórios' });
    }

    const audioBuffer = await minimaxService.generateSpeech(text, voice_id);

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Erro na rota TTS:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
