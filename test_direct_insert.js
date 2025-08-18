const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectInsert() {
  try {
    console.log('=== TESTE DE INSERÇÃO DIRETA ===\n');
    
    // Tentar inserção usando SQL direto
    console.log('1. Tentando inserção com SQL direto...');
    
    const insertQuery = `
      INSERT INTO votos (pesquisa_id, usuario_id, opcao_id, comentario, user_ip, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    // Usar rpc para executar SQL direto
    const { data: sqlResult, error: sqlError } = await adminSupabase.rpc('exec_sql', {
      query: insertQuery,
      params: [
        'f631e427-4944-46f6-b1cc-b58a4396a205',
        'bcd0593a-ba47-4262-8f8f-cb32f97e58d6',
        1,
        'Teste SQL direto',
        '127.0.0.1',
        'Test Agent'
      ]
    });
    
    if (sqlError) {
      console.log('Erro com SQL direto:', sqlError);
      
      // Tentar uma abordagem mais simples: verificar se a tabela votos existe
      console.log('\n2. Verificando se a tabela votos existe...');
      const { data: tableExists, error: tableError } = await adminSupabase
        .from('votos')
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.log('Erro ao verificar tabela votos:', tableError);
      } else {
        console.log('Tabela votos existe e é acessível');
        
        // Verificar estrutura da tabela
        console.log('\n3. Verificando estrutura da tabela votos...');
        const { data: structure, error: structError } = await adminSupabase
          .from('votos')
          .select('*')
          .limit(1);
        
        if (structError) {
          console.log('Erro ao verificar estrutura:', structError);
        } else {
          console.log('Estrutura da tabela votos OK');
          
          // Tentar inserção sem foreign key temporariamente
          console.log('\n4. Tentando inserção com dados mínimos...');
          const { data: minimalInsert, error: minimalError } = await adminSupabase
            .from('votos')
            .insert({
              pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
              opcao_id: 1
              // Removendo usuario_id temporariamente para testar
            })
            .select();
          
          if (minimalError) {
            console.log('Erro com inserção mínima:', minimalError);
          } else {
            console.log('Inserção mínima funcionou:', minimalInsert);
            // Limpar
            await adminSupabase.from('votos').delete().eq('id', minimalInsert[0].id);
          }
        }
      }
    } else {
      console.log('SUCESSO com SQL direto:', sqlResult);
    }
    
    // Verificar se há algum trigger ou função que está interferindo
    console.log('\n5. Verificando se há triggers na tabela votos...');
    const { data: triggers, error: triggerError } = await adminSupabase.rpc('exec_sql', {
      query: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'votos';
      `
    });
    
    if (triggerError) {
      console.log('Erro ao verificar triggers:', triggerError);
    } else {
      console.log('Triggers encontrados:', triggers);
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

testDirectInsert();