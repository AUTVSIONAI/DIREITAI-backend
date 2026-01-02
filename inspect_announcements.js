
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAnnouncements() {
  console.log('Inspecting announcements table schema...');
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching announcements:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No announcements found.');
  }
}

inspectAnnouncements();
