
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPoliticians() {
  const { data, error } = await supabase
    .from('politicians')
    .select('id, name, email');

  if (error) {
    console.error('Error fetching politicians:', error);
    return;
  }

  console.log('Politicians:', data);
}

listPoliticians();
