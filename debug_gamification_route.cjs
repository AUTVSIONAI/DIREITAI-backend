const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function resolveUserId(userId) {
  // Check if it's a UUID (public ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(userId)) {
    // Check if this UUID exists in users table as 'id'
    const { data: userById } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userById) return userById.id;
    
    // Check if this UUID exists in users table as 'auth_id'
    const { data: userByAuth } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();
      
    if (userByAuth) return userByAuth.id;
  }
  
  return null;
}

async function testGamificationStats(userIdInput) {
  console.log(`\n🔍 Testing gamification stats for input: ${userIdInput}`);
  
  try {
    // 1. Resolve User ID
    const resolvedUserId = await resolveUserId(userIdInput);
    console.log(`✅ Resolved User ID: ${resolvedUserId}`);
    
    if (!resolvedUserId) {
      console.error('❌ User not found');
      return;
    }

    // 2. Fetch User Profile for Auth ID
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('auth_id, points')
      .eq('id', resolvedUserId)
      .single();
      
    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }
    
    const authId = userData?.auth_id;
    console.log(`👤 User Auth ID: ${authId}`);
    console.log(`💎 User Points (Cached): ${userData?.points}`);

    // 3. Construct Filter
    let userFilter = `user_id.eq.${resolvedUserId}`;
    if (authId) {
      userFilter += `,user_id.eq.${authId}`;
    }
    console.log(`🛡️ Filter: ${userFilter}`);

    // 4. Fetch Checkins
    const { count: checkinsCount, error: checkinsError } = await adminSupabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);
      
    if (checkinsError) console.error('❌ Checkins Error:', checkinsError);
    console.log(`📍 Checkins Count: ${checkinsCount}`);

    // 5. Fetch Geo Checkins
    const { count: geoCheckinsCount, error: geoError } = await adminSupabase
      .from('geographic_checkins')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);
      
    if (geoError) console.error('❌ Geo Checkins Error:', geoError);
    console.log(`🌍 Geo Checkins Count: ${geoCheckinsCount}`);

    const totalCheckins = (checkinsCount || 0) + (geoCheckinsCount || 0);
    console.log(`✅ Total Checkins: ${totalCheckins}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run test with the known user Public ID
testGamificationStats('d67e3f2a-d08c-4cd4-97b0-a6a7e594ca54');
