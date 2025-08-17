const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

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

// Middleware para servir arquivos estáticos
router.use('/files', express.static(path.join(__dirname, '../uploads')));

// Upload de foto de político
router.post('/politician-photo', authenticateUser, authenticateAdmin, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // URL do arquivo
    const fileUrl = `/api/upload/files/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Foto do político enviada com sucesso',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Erro no upload da foto do político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de imagem de produto
router.post('/product-image', authenticateUser, authenticateAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // URL do arquivo
    const fileUrl = `/api/upload/files/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Imagem do produto enviada com sucesso',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Erro no upload da imagem do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload genérico de imagem
router.post('/image', authenticateUser, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // URL do arquivo
    const fileUrl = `/api/upload/files/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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