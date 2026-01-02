const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
  // Get all announcements
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, view_count, click_count, dismiss_count');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Announcements Table Counts:');
  console.table(announcements);

  // Get real counts from detailed tables for the first announcement
  if (announcements.length > 0) {
    const ann = announcements[0];
    const { count: realClicks } = await supabase
      .from('announcement_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('announcement_id', ann.id);

    const { count: realViews } = await supabase
      .from('announcement_views')
      .select('*', { count: 'exact', head: true })
      .eq('announcement_id', ann.id);

    console.log(`Real counts for ${ann.title} (${ann.id}):`);
    console.log(`Table Click Count: ${ann.click_count}, Real Rows: ${realClicks}`);
    console.log(`Table View Count: ${ann.view_count}, Real Rows: ${realViews}`);
  }
}

checkCounts();
