const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
  try {
    console.log('Verificando constraints da tabela votos...');
    
    // Verificar constraints usando uma query SQL direta
    const { data, error } = await adminSupabase.rpc('sql', {
      query: `
        SELECT 
          conname as constraint_name,
          conrelid::regclass as table_name,
          confrelid::regclass as referenced_table,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint 
        WHERE conname LIKE '%votos%' AND contype = 'f';
      `
    });
    
    if (error) {
      console.log('Erro ao verificar constraints:', error);
      
      // Tentar uma abordagem alternativa
      console.log('\nTentando abordagem alternativa...');
      const { data: altData, error: altError } = await adminSupabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'votos')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (altError) {
        console.log('Erro na abordagem alternativa:', altError);
      } else {
        console.log('Constraints (alternativa):', JSON.stringify(altData, null, 2));
      }
    } else {
      console.log('Constraints encontradas:', JSON.stringify(data, null, 2));
    }
    
    // Verificar se o usuário existe diretamente na tabela users
    console.log('\nVerificando usuário na tabela users...');
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, role')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    if (userError) {
      console.log('Erro ao buscar usuário:', userError);
    } else {
      console.log('Usuário encontrado:', userData);
    }
    
    // Verificar se há RLS habilitado na tabela users
    console.log('\nVerificando RLS na tabela users...');
    const { data: rlsData, error: rlsError } = await adminSupabase.rpc('sql', {
      query: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';`
    });
    
    if (rlsError) {
      console.log('Erro ao verificar RLS:', rlsError);
    } else {
      console.log('Status RLS:', rlsData);
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

checkConstraints();