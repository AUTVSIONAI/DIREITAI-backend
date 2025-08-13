// Script para testar variáveis de ambiente
require('dotenv').config();

console.log('=== TESTE DE VARIÁVEIS DE AMBIENTE ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
console.log('PORT:', process.env.PORT);

// Teste de conexão com Supabase
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: Variáveis de ambiente do Supabase não definidas');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Cliente Supabase criado com sucesso');
  
} catch (error) {
  console.error('❌ ERRO ao criar cliente Supabase:', error.message);
  process.exit(1);
}

console.log('=== TESTE CONCLUÍDO ===');