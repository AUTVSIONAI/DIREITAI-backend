const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuração da API MiniMax
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-api-6ktWp_YMg8z5-SJjIWtChbVg2EPNpoYsGR3r9A0563KPa8JLpP5wg6Pb023N4vA1b7E6RnSIhbPfYyFrnTHsqSwo8TP9-fYp3mVhrlNzbMRVx2i1c8boTLA'; // Fallback para a chave fornecida (Ideal mover para .env)
const BASE_URL = 'https://api.minimax.io/v1'; // Ou https://api.minimaxi.chat/v1 dependendo da versão
const GROUP_ID = process.env.MINIMAX_GROUP_ID; // Se necessário

const minimaxService = {
  /**
   * Upload de arquivo de áudio para clonagem
   * @param {Buffer} fileBuffer - Buffer do arquivo de áudio
   * @param {string} filename - Nome do arquivo
   * @returns {Promise<string>} file_id
   */
  uploadFile: async (fileBuffer, filename) => {
    try {
      const form = new FormData();
      form.append('file', fileBuffer, filename);
      form.append('purpose', 'voice_clone');

      const response = await axios.post(`${BASE_URL}/files/upload`, form, {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          ...form.getHeaders()
        }
      });

      if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
        throw new Error(`Erro no upload: ${response.data.base_resp.status_msg}`);
      }

      return response.data.file.file_id;
    } catch (error) {
      const detailedError = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      const status = error.response?.status || 'Unknown';
      console.error(`[MiniMax] Erro no upload (${status}):`, detailedError);
      throw new Error(`Falha no upload MiniMax (${status}): ${detailedError}`);
    }
  },

  /**
   * Clona a voz a partir de um file_id
   * @param {string} fileId - ID do arquivo enviado
   * @param {string} voiceId - ID personalizado para a voz (ex: 'bolsonaro-01')
   * @returns {Promise<object>} Dados da voz clonada
   */
  cloneVoice: async (fileId, voiceId) => {
    try {
      const payload = {
        file_id: fileId,
        voice_id: voiceId,
        model: "speech-2.6-hd" // Modelo mais recente de alta definição
      };

      const response = await axios.post(`${BASE_URL}/voice_clone`, payload, {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
        throw new Error(`Erro na clonagem: ${response.data.base_resp.status_msg}`);
      }

      return response.data;
    } catch (error) {
      const detailedError = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      const status = error.response?.status || 'Unknown';
      console.error(`[MiniMax] Erro na clonagem (${status}):`, detailedError);
      throw new Error(`Falha na clonagem MiniMax (${status}): ${detailedError}`);
    }
  },

  /**
   * Gera áudio a partir de texto usando a voz clonada
   * @param {string} text - Texto a ser falado
   * @param {string} voiceId - ID da voz clonada
   * @returns {Promise<Buffer>} Buffer do áudio gerado
   */
  generateSpeech: async (text, voiceId) => {
    try {
      const payload = {
        model: "speech-2.6-hd",
        text: text,
        voice_id: voiceId,
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
        audio_sample_rate: 32000,
        format: "mp3"
      };

      const response = await axios.post(`${BASE_URL}/t2a_v2`, payload, {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer' // Importante para receber o áudio binário
      });

      // A API pode retornar JSON em caso de erro, mesmo com responseType arraybuffer
      // Seria bom verificar o content-type, mas assumindo sucesso para simplificar o MVP
      
      return response.data;
    } catch (error) {
      console.error('Erro na geração de voz MiniMax:', error.response?.data || error.message);
      throw error;
    }
  }
};

module.exports = minimaxService;
