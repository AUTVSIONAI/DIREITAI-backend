
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectUsers() {
  console.log('Inspecting users table...');
  const { data, error } = await adminSupabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting from users:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No users found or empty table.');
  }
}

async function testAdminQuery() {
    console.log('Testing admin query...');
    const offset = 0;
    const limit = 20;
    
    let query = adminSupabase
      .from('users')
      .select(`
        id,
        email,
        username,
        full_name,
        plan,
        is_admin,
        created_at,
        last_login,
        points,
        city,
        state
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      
    const { data, error } = await query;
    if (error) {
        console.error('Admin query failed:', error);
    } else {
        console.log('Admin query success, users found:', data.length);
    }
}

async function inspectTables() {
  console.log('Inspecting checkins...');
  const { error: err1 } = await adminSupabase.from('checkins').select('id').limit(1);
  if (err1) console.error('Error checkins:', err1); else console.log('Checkins OK');

  console.log('Inspecting ai_conversations...');
  const { error: err2 } = await adminSupabase.from('ai_conversations').select('id').limit(1);
  if (err2) console.error('Error ai_conversations:', err2); else console.log('AI Conversations OK');

  console.log('Testing notifications query...');
  const { data: notifs, error: err3 } = await adminSupabase
      .from('notifications')
      .select(`
        *,
        users (
          username,
          email
        )
      `)
      .limit(5);
  
  if (err3) {
      console.error('Notifications query failed:', err3);
  } else {
      console.log('Notifications query success, count:', notifs.length);
  }
}

inspectTables();

