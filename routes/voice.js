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
router.post('/clone', authenticateUser, (req, res, next) => {
  console.log('[DEBUG] POST /clone initiated');
  console.log('[DEBUG] Headers:', req.headers);
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[DEBUG] Multer error:', err);
      return res.status(400).json({ error: 'Erro no upload do arquivo (Multer): ' + err.message });
    }
    console.log('[DEBUG] Multer processed.');
    console.log('[DEBUG] Req headers content-type:', req.headers['content-type']);
    console.log('[DEBUG] Req file:', req.file ? 'Present' : 'Missing');
    if (req.file) {
        console.log('[DEBUG] File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    }
    console.log('[DEBUG] Req body:', req.body);
    next();
  });
}, async (req, res) => {
  try {
    console.log('[DEBUG] Inside clone handler');
    const { politician_id, voice_name } = req.body;
    
    if (!req.file) {
      console.error('[DEBUG] No file in req.file');
      return res.status(400).json({ 
          error: 'Arquivo de áudio é obrigatório',
          debug: {
              headers: req.headers['content-type'],
              bodyKeys: Object.keys(req.body)
          }
      });
    }

    // 1. Upload do arquivo para o MiniMax
    const fileId = await minimaxService.uploadFile(
      req.file.buffer, 
      req.file.originalname
    );

    // 2. Clonar a voz
    // Gerar um ID de voz único
    const tempId = politician_id || 'custom';
    const customVoiceId = `voice_${tempId}_${Date.now()}`;
    const cloneResult = await minimaxService.cloneVoice(fileId, customVoiceId);

    // 3. Atualizar o político no banco de dados SE houver politician_id
    if (politician_id) {
        // Buscar config atual
        const { data: politician, error: fetchError } = await adminSupabase
        .from('politicians')
        .select('voice_config')
        .eq('id', politician_id)
        .single();

        if (!fetchError) {
            const newConfig = {
            ...(politician?.voice_config || {}),
            provider: 'minimax',
            voice_id: cloneResult.voice_id || customVoiceId,
            file_id: fileId,
            last_updated: new Date().toISOString()
            };

            await adminSupabase
            .from('politicians')
            .update({ voice_config: newConfig })
            .eq('id', politician_id);
        }
    }

    res.json({
      success: true,
      voice_id: cloneResult.voice_id || customVoiceId,
      details: cloneResult
    });

  } catch (error) {
    console.error('Erro na rota de clonagem:', error);
    
    // Tratamento específico para saldo insuficiente
    if (error.message.includes('insufficient balance') || (error.response?.data && JSON.stringify(error.response.data).includes('insufficient balance'))) {
        return res.status(402).json({ 
            error: 'Saldo insuficiente na conta MiniMax. Por favor, recarregue seus créditos.',
            code: 'INSUFFICIENT_BALANCE',
            details: error.response?.data || error.message
        });
    }

    // Retornar erro detalhado para o frontend
    res.status(500).json({ 
        error: error.message,
        details: error.response?.data || 'Verifique logs do backend para mais detalhes'
    });
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

    // Log de uso
    try {
      await adminSupabase.from('voice_usage_logs').insert({
        user_id: req.user?.id,
        provider: 'minimax',
        voice_id: voice_id,
        text_length: text.length,
        cost: text.length * 0.00001, // Custo estimado (ajustar conforme pricing)
      });
    } catch (logError) {
      console.error('Erro ao logar uso de voz:', logError);
    }

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Erro na rota TTS:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
