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

async function testSeedPlans() {
  console.log('Testing plan insertion...');
  
  const testPlan = {
    name: 'Test Plan',
    slug: 'test-plan-' + Date.now(),
    description: 'Test plan description',
    price_monthly: 10.0,
    price_yearly: 100.0,
    features: ['Test feature'],
    limits: {},
    is_active: true,
    is_popular: false,
    sort_order: 999,
    color: 'gray',
    icon: 'Package'
  };

  try {
    const { data, error } = await adminSupabase
      .from('subscription_plans')
      .insert(testPlan)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);
    } else {
      console.log('✅ Insert successful:', data.name);
      
      // Cleanup
      const { error: deleteError } = await adminSupabase
        .from('subscription_plans')
        .delete()
        .eq('id', data.id);
        
      if (deleteError) {
        console.error('⚠️ Cleanup failed:', deleteError);
      } else {
        console.log('✅ Cleanup successful');
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testSeedPlans();
