const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { supabase, adminSupabase } = require('../config/supabase');
const router = express.Router();

// Configurar multer para armazenar arquivos em memória (para Vercel)
const storage = multer.memoryStorage();

// Função para fazer upload para Supabase Storage
async function uploadToSupabase(file, folder = 'uploads') {
  try {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${extension}`;
    const filePath = `${folder}/${fileName}`;

    // Upload para Supabase Storage usando admin client
    const { data, error } = await adminSupabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ Erro no upload para Supabase:', error);
      throw error;
    }

    // Obter URL pública do arquivo
    const { data: publicUrlData } = adminSupabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return {
      fileName,
      filePath,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('❌ Erro na função uploadToSupabase:', error);
    throw error;
  }
}

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas JPG, JPEG, PNG, GIF e WEBP são aceitos.'), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware para servir arquivos estáticos removido (usando Supabase Storage)

// Upload de foto de político
router.post('/politician-photo', authenticateUser, authenticateAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('🔍 Iniciando upload de foto de político para Supabase...');
    
    // Upload para Supabase Storage
    const uploadResult = await uploadToSupabase(req.file, 'politicians');
    
    console.log('✅ Upload bem-sucedido:', uploadResult);
    
    res.json({
      success: true,
      message: 'Foto do político enviada com sucesso',
      data: {
        filename: uploadResult.fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        url: uploadResult.publicUrl
      }
    });
  } catch (error) {
    console.error('❌ Erro no upload da foto do político:', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Upload de imagem de produto
router.post('/product-image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('🔍 Iniciando upload de imagem de produto para Supabase...');
    
    // Upload para Supabase Storage
    const uploadResult = await uploadToSupabase(req.file, 'products');
    
    console.log('✅ Upload bem-sucedido:', uploadResult);
    
    res.json({
      success: true,
      message: 'Imagem do produto enviada com sucesso',
      data: {
        filename: uploadResult.fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        url: uploadResult.publicUrl
      }
    });
  } catch (error) {
    console.error('❌ Erro no upload da imagem do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Upload genérico de imagem
router.post('/image', authenticateUser, upload.single('image'), async (req, res) => {
  console.log('🔍 Iniciando upload de imagem para Supabase...');
  console.log('📁 req.file:', req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'Nenhum arquivo');
  console.log('📋 req.body:', req.body);
  
  try {
    if (!req.file) {
      console.log('❌ Nenhum arquivo foi enviado');
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('✅ Arquivo recebido:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Upload para Supabase Storage
    const uploadResult = await uploadToSupabase(req.file, 'blog');
    
    console.log('✅ Upload para Supabase bem-sucedido:', uploadResult);
    
    const response = {
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        filename: uploadResult.fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        url: uploadResult.publicUrl
      }
    };
    
    console.log('✅ Enviando resposta:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro no upload da imagem:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Deletar arquivo
router.delete('/files/:filename', authenticateUser, authenticateAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Arquivo deletado com sucesso' });
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('Tipo de arquivo não permitido')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

module.exports = router;