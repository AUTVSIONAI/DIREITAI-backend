require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

let supabase = null;

try {
  const { createClient } = require('@supabase/supabase-js');
  
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      disabled: true
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-node'
      }
    }
  });
  
  console.log('✅ Supabase configurado com sucesso');
} catch (error) {
  console.error('❌ Erro ao configurar Supabase:', error.message);
  
  // Fallback mock para ambiente serverless
  supabase = {
    from: (table) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null })
    },
    rpc: () => Promise.resolve({ data: null, error: null })
  };
}

module.exports = { supabase };