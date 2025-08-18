const express = require('express');
const cors = require('cors');
const { supabase } = require('./config/supabase');
// Logger removido para compatibilidade com Vercel
// const logger = require('./utils/logger');
// const { cleanOldLogs } = require('./utils/logCleaner');
require('dotenv').config();

// Logs antigos removidos para compatibilidade com Vercel
// cleanOldLogs();

const app = express();
const PORT = process.env.PORT || 5120;

// Middleware
const corsOptions = {
  origin: [
    'https://direitai.com',
    'https://www.direitai.com',
    'https://direitai.vercel.app',
    'https://direitai-backend.vercel.app',
    'http://localhost:5120',
    'http://localhost:5121',
    'http://localhost:5122'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
// Logger middleware removido para compatibilidade com Vercel
// app.use(logger.middleware());

// Debug middleware para todas as requisições
app.use((req, res, next) => {
  console.log('🔍 REQUEST:', req.method, req.originalUrl);
  
  // Debug específico para rotas RSVP
  if (req.originalUrl.includes('/api/rsvp') && req.method === 'POST') {
    console.log('🔍 RSVP POST - Headers:', req.headers);
    console.log('🔍 RSVP POST - Body:', req.body);
    console.log('🔍 RSVP POST - Content-Type:', req.get('Content-Type'));
  }
  
  next();
});

// Rota de teste para transações (sem autenticação)
app.get('/api/test-transactions/:userId', async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    const { userId } = req.params;
    console.log('💰 Test Transactions - Buscando transações para usuário:', userId);

    const { data: transactions, error } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('💰 Test Transactions - Erro:', error);
      return res.status(500).json({ error: 'Erro ao buscar transações' });
    }

    console.log('💰 Test Transactions - Transações encontradas:', transactions?.length || 0);

    res.json({
      success: true,
      user_id: userId,
      transactions: transactions || [],
      total: transactions?.length || 0
    });
  } catch (error) {
    console.error('💰 Test Transactions - Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/user', require('./routes/user'));
app.use('/api/events', require('./routes/events'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/store', require('./routes/store'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/content-moderation', require('./routes/contentModeration'));
app.use('/api/admin/financial', require('./routes/financialReports'));
app.use('/api/admin/store', require('./routes/storeManagement'));
app.use('/api/admin/politicians', require('./routes/adminPoliticians'));
app.use('/api/manifestations', require('./routes/manifestations'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/rsvp', require('./routes/rsvp'));
app.use('/api/credits', require('./routes/credits'));

// Novas rotas para funcionalidades de políticos
app.use('/api/politicians', require('./routes/politicians'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/fake-news', require('./routes/fakeNews'));
app.use('/api/public', require('./routes/publicRegistration'));
app.use('/api/constitution', require('./routes/constitution'));
app.use('/api/constitution-downloads', require('./routes/constitutionDownloads'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DireitaAI Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      ai: '/api/ai',
      store: '/api/store',
      admin: '/api/admin'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    // logs: logger.getStats() // Removido para compatibilidade com Vercel
  };
  
  console.log('Health check accessed');
  res.json(healthData);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.message, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Para Vercel, não usamos app.listen
// Só executa app.listen em desenvolvimento local
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor DireitaAI iniciado!`);
    console.log(`📊 Porta: ${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

// Export para Vercel
module.exports = app;