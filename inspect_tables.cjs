const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTables() {
  console.log('Inspecting tables...');
  
  const tables = ['checkins', 'ai_conversations', 'users', 'notifications'];
  
  for (const table of tables) {
    const { data, error } = await adminSupabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error querying table ${table}:`, error);
    } else {
      console.log(`Table ${table} exists. Rows:`, data.length);
    }
  }
}

inspectTables();
