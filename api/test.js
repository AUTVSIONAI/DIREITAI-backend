// Função serverless de teste para diagnosticar problemas no Vercel
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    // Log das variáveis de ambiente
    console.log('=== DIAGNÓSTICO VERCEL ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VERCEL:', process.env.VERCEL);
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
    
    // Teste de importação do Supabase
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente do Supabase não definidas');
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('✅ Cliente Supabase criado com sucesso');
    
    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'Teste de diagnóstico concluído com sucesso',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ERRO no diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};