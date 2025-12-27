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

async function inspectSubscriptionPlans() {
  console.log('Inspecting subscription_plans table...');
  
  // Try to select all columns for one row
  const { data, error } = await adminSupabase
    .from('subscription_plans')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying subscription_plans:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found in subscription_plans:');
    console.log(Object.keys(data[0]));
    
    if (Object.keys(data[0]).includes('is_visible')) {
        console.log('✅ Column is_visible EXISTS.');
    } else {
        console.log('❌ Column is_visible DOES NOT EXIST.');
    }
  } else {
    console.log('Table is empty, cannot infer columns from data.');
    // Try to insert a dummy row without is_visible to see if it works, 
    // and then update it with is_visible to test.
  }
}

inspectSubscriptionPlans();
