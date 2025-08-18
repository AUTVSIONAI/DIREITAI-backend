require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('=== Verificando tabelas ===');
  const tables = ['badges', 'points', 'ai_conversations'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: existe (${data?.length || 0} registros encontrados)`);
        if (data && data.length > 0) {
          console.log(`   Colunas: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Tabela ${table}: ${err.message}`);
    }
  }
}

checkTables();