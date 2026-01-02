const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

console.log('Supabase Config Loaded:', { 
  url: supabaseUrl ? 'Found' : 'Missing', 
  anon: supabaseAnonKey ? 'Found' : 'Missing', 
  service: supabaseServiceKey ? 'Found' : 'Missing' 
});

if (!process.env.SUPABASE_URL) {
    console.error('WARNING: SUPABASE_URL not found in env');
}


// Client for user authentication (uses anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key for admin operations
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

module.exports = { supabase, adminSupabase };