
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

async function checkLogic() {
  const { adminSupabase } = require('./config/supabase');
  
  console.log('--- Simulating Ranking Logic ---');
  
  // 1. Get Top 5 Users
   const { data: topUsers, error: topError } = await adminSupabase
       .from('users')
       .select('id, username, points')
       .order('points', { ascending: false })
       .limit(5);
       
   if (topError) {
       console.error('Error fetching top users:', topError);
       return;
   }
       
   console.log('Top 5 Users:', topUsers.map((u, i) => `${i+1}. ${u.username} (${u.points} pts)`));

  // 2. Simulate finding a user not in top 5 (if any)
  // Let's pick a random user ID that is NOT in the top 5
  const topIds = topUsers.map(u => u.id);
  const { data: otherUser } = await adminSupabase
      .from('users')
      .select('id, username, points')
      .not('id', 'in', `(${topIds.join(',')})`)
      .limit(1)
      .single();

  if (otherUser) {
      console.log(`\nTesting with user outside top 5: ${otherUser.username} (${otherUser.points} pts)`);
      
      // Calculate rank
      const { count } = await adminSupabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gt('points', otherUser.points || 0);
          
      const rank = (count || 0) + 1;
      console.log(`Calculated Rank: ${rank}`);
  } else {
      console.log('\nNo users found outside top 5 to test rank calculation.');
  }

  // 3. Test Checkin Counts
   console.log('\n--- Testing Checkin Counts ---');
   
   // Debug: Check total checkins in DB
   const { count: totalCheckins } = await adminSupabase.from('checkins').select('*', { count: 'exact', head: true });
   const { count: totalGeoCheckins } = await adminSupabase.from('geographic_checkins').select('*', { count: 'exact', head: true });
   console.log(`Total Checkins in DB: ${totalCheckins}`);
   console.log(`Total Geo Checkins in DB: ${totalGeoCheckins}`);
   
   if (totalGeoCheckins > 0) {
       const { data: geoUsers } = await adminSupabase.from('geographic_checkins').select('user_id');
       console.log('Users with Geo Checkins:', geoUsers);
       
       if (geoUsers && geoUsers.length > 0) {
           const targetUserId = geoUsers[0].user_id;
           console.log(`\nTesting logic for user with Geo Checkin: ${targetUserId}`);
           
           // Fetch user details
           const { data: targetUser } = await adminSupabase.from('users').select('id, username, points').eq('id', targetUserId).single();
           if (targetUser) {
               console.log(`User: ${targetUser.username} (${targetUser.points} pts)`);
               
               // Simulate Ranking Logic
               const { count, error: rankError } = await adminSupabase
                   .from('users')
                   .select('id', { count: 'exact', head: true })
                   .gt('points', targetUser.points || 0);
               const rank = (count || 0) + 1;
               console.log(`Calculated Rank: ${rank}`);
               
               // Simulate Checkin Count Logic
               const [checkinsResult, geoCheckinsResult] = await Promise.all([
                   adminSupabase.from('checkins').select('user_id', { count: 'exact', head: true }).eq('user_id', targetUserId),
                   adminSupabase.from('geographic_checkins').select('user_id', { count: 'exact', head: true }).eq('user_id', targetUserId)
               ]);
               
               const totalCheckins = (checkinsResult.count || 0) + (geoCheckinsResult.count || 0);
               console.log(`Total Checkins (simulated): ${totalCheckins}`);
           } else {
               console.log('User details not found in public.users.');
           
               // Check in Auth Users
               const { data: { users: authUsers }, error: authError } = await adminSupabase.auth.admin.listUsers();
               if (authUsers) {
                   const authUser = authUsers.find(u => u.id === targetUserId);
                   if (authUser) {
                       console.log('User FOUND in Auth Users:', authUser.email);
                   } else {
                       console.log('User NOT FOUND in Auth Users either.');
                   }
               } else {
                   console.log('Could not list auth users:', authError);
               }
           }
       }
   }

   const userIds = topUsers.map(u => u.id);
  if (otherUser) userIds.push(otherUser.id);

  const [checkinsResult, geoCheckinsResult] = await Promise.all([
      adminSupabase.from('checkins').select('user_id').in('user_id', userIds),
      adminSupabase.from('geographic_checkins').select('user_id').in('user_id', userIds)
  ]);

  const checkinCounts = {};
  userIds.forEach(id => checkinCounts[id] = 0);
  
  checkinsResult.data?.forEach(c => checkinCounts[c.user_id] = (checkinCounts[c.user_id] || 0) + 1);
  geoCheckinsResult.data?.forEach(c => checkinCounts[c.user_id] = (checkinCounts[c.user_id] || 0) + 1);

  console.table(userIds.map(id => ({ 
      id, 
      username: topUsers.find(u => u.id === id)?.username || otherUser?.username,
      checkins: checkinCounts[id] 
  })));
}

checkLogic();
