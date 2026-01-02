const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load backend .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log('--- Debugging Overview Stats & User ID Mismatch ---');

  // 1. Investigate the "missing" user ID from previous run
  const missingUserId = '4f1b46b2-698c-4a79-ac64-df47278af391';
  console.log(`\nChecking if ID ${missingUserId} exists as auth_id in users table...`);
  
  const { data: userByAuth, error: authError } = await adminSupabase
    .from('users')
    .select('*')
    .eq('auth_id', missingUserId)
    .single();
    
  if (userByAuth) {
    console.log('✅ Found user by auth_id:', userByAuth.email, 'Public ID:', userByAuth.id);
  } else {
    console.log('❌ ID not found as auth_id either.');
  }

  // 2. Find a VALID user with checkins for testing Ranking/Stats
  console.log('\nFinding a valid user with checkins...');
  
  // Get all geographic checkins
  const { data: allGeoCheckins } = await adminSupabase
    .from('geographic_checkins')
    .select('user_id')
    .limit(50);
    
  if (!allGeoCheckins || allGeoCheckins.length === 0) {
      console.log('No geographic checkins found.');
      return;
  }
  
  const userIds = [...new Set(allGeoCheckins.map(c => c.user_id))];
  console.log(`Found ${userIds.length} unique user IDs in geographic_checkins.`);
  
  // Check which of these exist in users table
  const { data: validUsers } = await adminSupabase
    .from('users')
    .select('id, auth_id, email, points, city')
    .in('id', userIds);
    
  if (!validUsers || validUsers.length === 0) {
      console.log('❌ NONE of the checkin user IDs exist in users table (Public ID mismatch).');
      
      // Check if they exist as auth_ids
      const { data: validAuthUsers } = await adminSupabase
        .from('users')
        .select('id, auth_id, email, points, city')
        .in('auth_id', userIds);
        
      if (validAuthUsers && validAuthUsers.length > 0) {
          console.log(`✅ But ${validAuthUsers.length} exist as Auth IDs! This confirms mismatch.`);
          const testUser = validAuthUsers[0];
          console.log(`Testing with user (Auth ID match): ${testUser.email} (Public ID: ${testUser.id})`);
          await testStats(testUser.id, testUser.auth_id, testUser);
      } else {
          console.log('❌ IDs do not exist as Auth IDs either. Orphaned records?');
      }
  } else {
      console.log(`✅ Found ${validUsers.length} valid users.`);
      const testUser = validUsers[0];
      console.log(`Testing with user: ${testUser.email} (ID: ${testUser.id})`);
      await testStats(testUser.id, testUser.auth_id, testUser);
  }
}

async function testStats(userId, authId, user) {
  // Simulate /users/usage-stats logic
  console.log('\n--- Simulating /users/usage-stats ---');
  
  let orFilter = `user_id.eq.${userId}`;
  if (authId) {
    orFilter += `,user_id.eq.${authId}`;
  }
  console.log('Filter used:', orFilter);

  const [checkinsResult, geoCheckinsResult] = await Promise.all([
    adminSupabase.from('checkins').select('*', { count: 'exact', head: true }).or(orFilter),
    adminSupabase.from('geographic_checkins').select('*', { count: 'exact', head: true }).or(orFilter)
  ]);

  const totalCheckins = (checkinsResult.count || 0) + (geoCheckinsResult.count || 0);
  console.log('Checkins (regular):', checkinsResult.count);
  console.log('Checkins (geo):', geoCheckinsResult.count);
  console.log('Total Checkins:', totalCheckins);

  // Ranking Position Logic
  const userPoints = user.points || 0;
  const { count: usersAbove } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('points', userPoints);
  const rankingPosition = (usersAbove || 0) + 1;
  console.log('Points:', userPoints);
  console.log('Ranking Position (Global):', rankingPosition);
  
  // Simulate /users/ranking logic
  console.log('\n--- Simulating /users/ranking ---');
  const scope = 'city';
  let rankQuery = adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('points', userPoints);
      
  if (scope === 'city' && user.city) {
      rankQuery = rankQuery.eq('city', user.city);
  }
  
  const { count: rankCount, error: rankError } = await rankQuery;
  if (rankError) {
      console.error('Ranking query error:', rankError);
  } else {
      console.log(`Ranking Position (City: ${user.city}):`, (rankCount || 0) + 1);
  }
}

debug().catch(console.error);
