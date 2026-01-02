const { adminSupabase } = require('./config/supabase');

async function verifyCheckinCount() {
  const userId = 'd67e3f2a-89a3-4877-bf32-68048293796d'; // Oseias Public ID
  const authId = '4f1b46b2-6c1d-4589-9e80-873099905c1d'; // Oseias Auth ID

  console.log('--- Verifying Checkin Count Logic ---');
  
  // 1. Count with just Public ID (What was happening before)
  const { count: c1 } = await adminSupabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  const { count: gc1 } = await adminSupabase
    .from('geographic_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  console.log(`Old Logic (Public ID only): Checkins=${c1}, Geo=${gc1}, Total=${(c1||0)+(gc1||0)}`);

  // 2. Count with Robust Logic (Public ID + Auth ID)
  const orFilter = `user_id.eq.${userId},user_id.eq.${authId}`;
  
  const { count: c2 } = await adminSupabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .or(orFilter);
    
  const { count: gc2 } = await adminSupabase
    .from('geographic_checkins')
    .select('*', { count: 'exact', head: true })
    .or(orFilter);

  console.log(`New Logic (Public + Auth ID): Checkins=${c2}, Geo=${gc2}, Total=${(c2||0)+(gc2||0)}`);
}

verifyCheckinCount();
