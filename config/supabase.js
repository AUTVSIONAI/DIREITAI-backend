const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Disable realtime to avoid websocket-factory issues in Vercel
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    disabled: true
  }
});

module.exports = { supabase };