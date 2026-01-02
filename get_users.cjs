const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Or service role key if needed

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email')
    .limit(5);

  if (error) {
    console.error('Error listing users:', error);
  } else {
    console.log('Users:', data);
  }
}

listUsers();
