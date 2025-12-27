
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function listPlans() {
  const { data: plans, error } = await adminSupabase
    .from('subscription_plans')
    .select('slug, name, is_active');

  if (error) {
    console.error('Error fetching plans:', error);
    return;
  }

  console.log('Plans in DB:', plans.length);
  console.table(plans);
}

listPlans();
