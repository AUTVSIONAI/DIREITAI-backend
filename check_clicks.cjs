const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClicks() {
  console.log('Checking announcement_clicks table...');
  
  // Check count
  const { count, error: countError } = await supabase
    .from('announcement_clicks')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Error counting clicks:', countError);
  } else {
    console.log(`Total rows in announcement_clicks: ${count}`);
  }

  // Check recent clicks
  const { data: clicks, error: clicksError } = await supabase
    .from('announcement_clicks')
    .select('*')
    .order('clicked_at', { ascending: false })
    .limit(5);
    
  if (clicksError) {
    console.error('Error fetching clicks:', clicksError);
  } else {
    console.log('Recent clicks:', clicks);
  }
  
  // Check announcements click_count
  const { data: announcements, error: annError } = await supabase
    .from('announcements')
    .select('id, title, click_count, view_count, dismiss_count')
    .gt('click_count', 0);
    
  if (annError) {
    console.error('Error fetching announcements:', annError);
  } else {
    console.log('Announcements with click_count > 0:', announcements);
  }
}

checkClicks();
