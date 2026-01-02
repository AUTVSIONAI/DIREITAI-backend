const { adminSupabase } = require('./config/supabase');

async function debugGamification() {
  const userId = 'd67e3f2a-d08c-4cd4-97b0-a6a7e594ca54'; // Oseias (Public ID)
  console.log('Debugging gamification stats for user:', userId);

  // 1. Resolve User
  const { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
  if (dbError) {
      console.error('Error fetching user:', dbError);
      return;
  }
  console.log('User found:', dbUser.email, 'Auth ID:', dbUser.auth_id);

  // 2. Build User Filter
  const authId = dbUser.auth_id;
  let userFilter = `user_id.eq.${userId}`;
  if (authId) {
      userFilter += `,user_id.eq.${authId}`;
  }
  console.log('User Filter:', userFilter);

  // 3. Count Checkins
  const { count: checkinsCount, error: cError } = await adminSupabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);
  
  if (cError) console.error('Error counting checkins:', cError);
  console.log('Checkins Count:', checkinsCount);

  // 4. Count Geographic Checkins
  const { count: geoCheckinsCount, error: gError } = await adminSupabase
      .from('geographic_checkins')
      .select('*', { count: 'exact', head: true })
      .or(userFilter);

  if (gError) console.error('Error counting geographic checkins:', gError);
  console.log('Geographic Checkins Count:', geoCheckinsCount);

  // 5. Inspect Geographic Checkins content
  const { data: geoData } = await adminSupabase
      .from('geographic_checkins')
      .select('id, user_id')
      .or(userFilter);
  console.log('Geographic Checkins Data:', geoData);

}

debugGamification();
