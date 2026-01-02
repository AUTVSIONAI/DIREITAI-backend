const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const userIds = [
    '5a5c6530-817f-4c57-a2f0-f9679f27a4d4',
    'c432360b-8524-42b7-bd20-7f28249688f6',
    '96c80336-6218-4504-8968-38604771c53e' // The one I was testing with
  ];

  console.log('Checking users:', userIds);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, auth_id, email, full_name, username')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Found users (public.users):');
  console.table(users);
}

checkUsers();
