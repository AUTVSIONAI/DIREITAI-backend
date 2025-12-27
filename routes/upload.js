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
    let bucket = 'images';
    if (folder === 'avatars') bucket = 'avatars';
    if (folder === 'product-files') bucket = 'downloads';
    
    const { data, error } = await adminSupabase.storage
      .from(bucket)
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
      .from(bucket)
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
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Middleware para tratamento de erros do Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Erro Multer:', err);
    return res.status(400).json({ error: 'Erro no upload de arquivo', details: err.message });
  } else if (err) {
    console.error('❌ Erro Upload:', err);
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Filtro para arquivos digitais (PDF, ZIP, EPUB)
const pdfFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'application/zip', 'application/epub+zip', 'application/x-zip-compressed'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF, ZIP e EPUB são permitidos.'), false);
  }
};

// Configurar multer para PDF
const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
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
router.post('/store-image', authenticateUser, authenticateAdmin, (req, res, next) => {
  console.log('📥 [Upload] Iniciando upload de imagem...');
  console.log('📥 [Upload] Headers:', JSON.stringify(req.headers['content-type']));
  
  upload.single('image')(req, res, (err) => {
    console.log('📥 [Upload] Middleware do Multer executado.');
    if (err) {
      console.error('❌ [Upload] Erro capturado pelo Multer:', err);
      return handleMulterError(err, req, res, next);
    }
    if (!req.file) {
      console.error('❌ [Upload] req.file está vazio após Multer!');
    } else {
      console.log('✅ [Upload] Arquivo recebido:', req.file.originalname, req.file.mimetype, req.file.size);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('🔍 Iniciando upload de imagem de produto para Supabase...');
    
    // Upload para Supabase Storage (pasta products)
    const uploadResult = await uploadToSupabase(req.file, 'products');
    
    console.log('✅ Upload de produto bem-sucedido:', uploadResult);
    
    res.json({
      success: true,
      message: 'Imagem do produto enviada com sucesso',
      data: {
        imageUrl: uploadResult.publicUrl
      }
    });
  } catch (error) {
    console.error('❌ Erro no upload da imagem do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Alias para /image (para compatibilidade com chamadas antigas ou incorretas)
router.post('/image', authenticateUser, authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('🔍 Iniciando upload de imagem (alias) para Supabase...');
    const uploadResult = await uploadToSupabase(req.file, 'products');
    
    res.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        imageUrl: uploadResult.publicUrl
      }
    });
  } catch (error) {
    console.error('❌ Erro no upload (alias):', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Upload de arquivo digital (PDF)
router.post('/store-file', authenticateUser, authenticateAdmin, (req, res, next) => {
  console.log('📥 [Upload] Iniciando upload de arquivo digital...');
  console.log('📥 [Upload] Headers:', JSON.stringify(req.headers['content-type']));

  uploadPdf.single('file')(req, res, (err) => {
    console.log('📥 [Upload] Middleware do Multer executado (PDF).');
    if (err) {
      console.error('❌ [Upload] Erro capturado pelo Multer (PDF):', err);
      return handleMulterError(err, req, res, next);
    }
    if (!req.file) {
      console.error('❌ [Upload] req.file está vazio após Multer (PDF)!');
    } else {
      console.log('✅ [Upload] Arquivo PDF recebido:', req.file.originalname, req.file.mimetype, req.file.size);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    console.log('🔍 Iniciando upload de arquivo digital para Supabase...');
    
    // Upload para Supabase Storage (pasta product-files)
    // Nota: isso usará o bucket 'images' por padrão na função uploadToSupabase.
    // Se precisar de outro bucket, a função uploadToSupabase precisaria ser ajustada.
    const uploadResult = await uploadToSupabase(req.file, 'product-files');
    
    console.log('✅ Upload de arquivo digital bem-sucedido:', uploadResult);
    
    res.json({
      success: true,
      message: 'Arquivo digital enviado com sucesso',
      data: {
        fileUrl: uploadResult.publicUrl
      }
    });
  } catch (error) {
    console.error('❌ Erro no upload do arquivo digital:', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

module.exports = router;

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
// Upload de avatar do usuário autenticado
router.post('/avatar', authenticateUser, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // Upload para bucket 'avatars'
    const uploadResult = await uploadToSupabase(req.file, 'avatars');

    // Atualizar avatar_url do usuário (por id ou auth_id)
    const authId = req.user.auth_id || req.user.id;
    let { data, error } = await adminSupabase
      .from('users')
      .update({ avatar_url: uploadResult.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select();

    if ((!error && Array.isArray(data) && data.length === 0) || (error && error.code === 'PGRST116')) {
      const upd2 = await adminSupabase
        .from('users')
        .update({ avatar_url: uploadResult.publicUrl, updated_at: new Date().toISOString() })
        .eq('auth_id', authId)
        .select();
      data = upd2.data;
      error = upd2.error;
    }

    if (error) {
      console.error('❌ Erro ao atualizar avatar_url:', error);
      return res.status(500).json({ error: 'Erro ao atualizar avatar do usuário' });
    }

    const updated = Array.isArray(data) ? (data[0] || null) : data;
    return res.json({ success: true, avatar_url: uploadResult.publicUrl, profile: updated });
  } catch (error) {
    console.error('❌ Erro no upload de avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});