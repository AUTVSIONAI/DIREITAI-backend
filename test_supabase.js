const { supabase, adminSupabase } = require('./config/supabase');
require('dotenv').config();

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL defined:', !!process.env.SUPABASE_URL);
  console.log('Anon Key defined:', !!process.env.SUPABASE_ANON_KEY);
  console.log('Service Key defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await adminSupabase.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Admin Supabase Error:', error.message);
    } else {
      console.log('Admin Supabase Connection: Success');
    }
  } catch (err) {
    console.error('Admin Supabase Exception:', err.message);
  }
}

testConnection();
