const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // 1. Check announcement_clicks policies (indirectly by trying to insert as a user? No, we are admin here)
  // We can query pg_policies if we have permissions, or just try to insert/select.
  
  // Let's check if we can select from announcement_clicks
  const { data: clicks, error: clickError } = await supabase
    .from('announcement_clicks')
    .select('*')
    .limit(5);
    
  if (clickError) {
    console.error('Error selecting announcement_clicks:', clickError);
  } else {
    console.log('announcement_clicks sample:', clicks);
  }

  // 2. List all users in public.users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, auth_id')
    .limit(10);

  if (userError) {
    console.error('Error selecting users:', userError);
  } else {
    console.log('All users in public.users:', users);
  }
}

inspect();
