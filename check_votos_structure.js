const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVotosStructure() {
  try {
    // Verificar se o usuário existe na tabela users
    console.log('Verificando usuário na tabela users...');
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    console.log('Usuário encontrado:', userData);
    if (userError) console.log('Erro ao buscar usuário:', userError);
    
    // Verificar constraint da tabela votos
    console.log('\nVerificando constraints da tabela votos...');
    const { data: constraints, error: constraintError } = await adminSupabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='votos';
        `
      });
    
    if (constraintError) {
      console.log('Erro ao verificar constraints:', constraintError);
    } else {
      console.log('Constraints da tabela votos:', JSON.stringify(constraints, null, 2));
    }
    
    // Tentar inserir um voto real
    console.log('\nTentando inserir voto...');
    const { data, error } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
        usuario_id: 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6',
        opcao_id: 1
      })
      .select();
    
    if (error) {
      console.log('Erro ao inserir voto:', JSON.stringify(error, null, 2));
    } else {
      console.log('Voto inserido com sucesso:', data);
      
      // Deletar o voto de teste
      await adminSupabase
        .from('votos')
        .delete()
        .eq('id', data[0].id);
      
      console.log('Voto de teste removido');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

checkVotosStructure();