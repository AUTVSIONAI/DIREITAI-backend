const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

// Configure multer for handling file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:8005';

// Proxy middleware for checking if service is available
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${VOICE_SERVICE_URL}/docs`);
    res.json({ status: 'ok', service: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Voice service unavailable', error: error.message });
  }
});

// Proxy for listing voices
router.get('/voices', async (req, res) => {
  try {
    const response = await axios.get(`${VOICE_SERVICE_URL}/voices`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    res.status(502).json({ error: 'Failed to fetch voices from local service' });
  }
});

// Proxy for cloning/TTS
router.post('/clone-speech', upload.single('speaker_wav'), async (req, res) => {
  try {
    const { text, language } = req.body;
    
    if (!req.file && !req.body.speaker_wav) {
      return res.status(400).json({ error: 'Missing speaker_wav file' });
    }

    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', language || 'pt');
    
    // Append the file
    if (req.file) {
      formData.append('speaker_wav', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    const response = await axios.post(`${VOICE_SERVICE_URL}/clone-speech`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer' // Important for audio
    });

    // Forward the audio
    res.set('Content-Type', 'audio/wav');
    res.send(response.data);

  } catch (error) {
    console.error('Error in clone-speech proxy:', error.message);
    res.status(500).json({ error: 'Voice generation failed', details: error.message });
  }
});

// Proxy for direct TTS (no clone) if available
router.post('/tts', async (req, res) => {
  try {
    const response = await axios.post(`${VOICE_SERVICE_URL}/tts`, req.body, {
      responseType: 'arraybuffer'
    });
    res.set('Content-Type', 'audio/wav');
    res.send(response.data);
  } catch (error) {
    console.error('Error in TTS proxy:', error.message);
    res.status(500).json({ error: 'TTS failed', details: error.message });
  }
});

module.exports = router;
