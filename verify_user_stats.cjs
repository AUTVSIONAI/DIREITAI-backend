
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyUserStats() {
  console.log('Verifying user stats logic...');

  // Get a user
  const { data: users } = await supabase.from('users').select('id, auth_id, full_name').limit(1);
  if (!users || users.length === 0) {
      console.log('No users found.');
      return;
  }
  const user = users[0];
  console.log('Testing for user:', user);

  const userId = user.id;
  const authId = user.auth_id;

  const orFilter = authId ? `user_id.eq.${userId},user_id.eq.${authId}` : `user_id.eq.${userId}`;
  console.log('OR Filter:', orFilter);

  // Checkins
  const { count: checkinsCount, error: checkinsError } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .or(orFilter);
  
  if (checkinsError) console.error('Error checkins:', checkinsError);
  else console.log('Checkins count:', checkinsCount);

  // Geo Checkins
  const { count: geoCheckinsCount, error: geoCheckinsError } = await supabase
      .from('geographic_checkins')
      .select('*', { count: 'exact', head: true })
      .or(orFilter);

  if (geoCheckinsError) console.error('Error geo checkins:', geoCheckinsError);
  else console.log('Geo Checkins count:', geoCheckinsCount);

  // Total
  console.log('Total Checkins:', (checkinsCount || 0) + (geoCheckinsCount || 0));
}

verifyUserStats();
