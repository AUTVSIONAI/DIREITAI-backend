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

async function inspectNotificationsTable() {
  console.log('Inspecting notifications table...');
  
  // Check if table exists by selecting 1 row
  const { data, error } = await adminSupabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying notifications table:', error);
    return;
  }

  console.log('Notifications table query success.');
  if (data.length > 0) {
    console.log('Sample row:', data[0]);
  } else {
    console.log('Table is empty.');
  }

  // Check if we can insert a dummy notification
  // We need a valid user_id first
  const { data: users } = await adminSupabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found to test insertion.');
    return;
  }
  const userId = users[0].id;

  console.log('Testing insertion for user:', userId);
  const { data: insertData, error: insertError } = await adminSupabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: 'Test Notification',
      message: 'This is a test.',
      type: 'info'
    })
    .select();

  if (insertError) {
    console.error('Insertion error:', insertError);
  } else {
    console.log('Insertion success:', insertData);
    // Cleanup
    await adminSupabase.from('notifications').delete().eq('id', insertData[0].id);
  }
}

inspectNotificationsTable();
