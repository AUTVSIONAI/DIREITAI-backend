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
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: [
    'https://direitai.com',
    'https://www.direitai.com',
    'https://direitai.vercel.app',
    'https://direitai-backend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5121'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Logger middleware removido para compatibilidade com Vercel
// app.use(logger.middleware());

// Debug middleware para todas as requisições
app.use((req, res, next) => {
  console.log('🔍 REQUEST:', req.method, req.originalUrl);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/store', require('./routes/store'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/content-moderation', require('./routes/contentModeration'));
app.use('/api/admin/financial', require('./routes/financialReports'));
app.use('/api/admin/store', require('./routes/storeManagement'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/gamification', require('./routes/gamification'));

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