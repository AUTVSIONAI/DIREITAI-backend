const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
  const sqlPath = path.join(__dirname, 'restore_rpcs.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running SQL...');
  
  // Split into individual statements because supabase-js rpc might not handle multiple statements well if not wrapped
  // But actually, we can't run raw SQL via supabase-js client unless we use a specific function or the postgres interface.
  // The user previously said "pronto rodei o sql com sucesso", implying they might have run it via a tool or I gave them a tool.
  // Wait, I don't have a tool to run raw SQL via the client unless I have a `exec_sql` RPC.
  
  // Let's try to see if there is an `exec_sql` or similar RPC, or if I should just guide the user.
  // But the user said "deu erro ao rodar o sql... pronto rodei o sql com sucesso".
  // If the user already ran it successfully, I don't need to run it again.
  // I should VERIFY if the functions exist.

  // Let's verify if increment_announcement_click exists by calling it with a dummy UUID (it will fail to update but shouldn't error on function missing)
  // Or better, check pg_proc if we have access.
  
  // We can try to call it.
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { error } = await supabase.rpc('increment_announcement_click', { announcement_id_input: dummyId });
  
  if (error) {
    console.error('RPC check failed:', error);
    if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('VERDICT: Function increment_announcement_click DOES NOT EXIST.');
    } else {
        console.log('VERDICT: Function exists (or other error occurred).');
    }
  } else {
    console.log('RPC check successful (function exists).');
  }
}

runSql();
