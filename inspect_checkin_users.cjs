const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
  console.log('--- Checking Geographic Checkins ---');
  const { data: geoCheckins, error: geoError } = await supabase
    .from('geographic_checkins')
    .select('*');
    
  if (geoError) {
    console.error('Error fetching geo checkins:', geoError);
  } else {
    console.log(`Found ${geoCheckins.length} geographic checkins.`);
    geoCheckins.forEach(c => {
      console.log(`- ID: ${c.id}, UserID: ${c.user_id}, Created: ${c.created_at}`);
    });
  }

  console.log('\n--- Checking Users ---');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, auth_id, email, full_name, username');
    
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Found ${users.length} users.`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, AuthID: ${u.auth_id}, Email: ${u.email}, Username: ${u.username}`);
    });
  }
}

inspectData();
