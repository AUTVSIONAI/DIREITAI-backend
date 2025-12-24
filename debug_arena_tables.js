
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`Checking table "${tableName}"...`);
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === '42P01') {
      console.log(`[MISSING] Table "${tableName}" does not exist.`);
      return false;
    } else {
      console.error(`[ERROR] Error checking "${tableName}":`, error.message);
      return false;
    }
  } else {
    console.log(`[OK] Table "${tableName}" exists.`);
    return true;
  }
}

async function checkArenaTables() {
  console.log('--- Starting Database Check ---');
  
  await checkTable('arenas');
  await checkTable('arena_questions');
  await checkTable('arena_votes');
  await checkTable('politician_points');
  await checkTable('politicians');
  await checkTable('users');

  console.log('--- Check Complete ---');
}

checkArenaTables();
