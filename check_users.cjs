const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('Checking users table columns...');
  const { data, error } = await adminSupabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting from users:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('User columns:', Object.keys(data[0]));
    console.log('Sample user:', {
      id: data[0].id,
      role: data[0].role,
      is_admin: data[0].is_admin
    });
  } else {
    console.log('No users found.');
  }
}

checkUsers();
