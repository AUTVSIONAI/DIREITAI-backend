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
      console.log(`- Checkin ID: ${c.id}, UserID: ${c.user_id}, Created: ${c.created_at}`);
    });
  }
}

inspectData();
