require('dotenv').config({ path: './.env' });
const { adminSupabase } = require('./config/supabase');

/*
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
*/

async function debugNotifications() {
  console.log('\n--- DEBUG NOTIFICATIONS ---');
  
  // 1. Check raw counts
  const { count: total, error: countError } = await adminSupabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });
    
  if (countError) console.error('Error counting notifications:', countError);
  console.log(`Total Notifications in DB: ${total}`);

  // 2. Check date distribution (last 5)
  const { data: recent, error: recentError } = await adminSupabase
    .from('notifications')
    .select('created_at, is_read, type')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentError) console.error('Error fetching recent notifications:', recentError);
  console.log('Recent Notifications:', recent);

  // 3. Check Clicks table
  const { count: clicks, error: clicksError } = await adminSupabase
    .from('notification_clicks')
    .select('*', { count: 'exact', head: true });

  if (clicksError) {
      if (clicksError.code === '42P01') console.log('notification_clicks table DOES NOT EXIST');
      else console.error('Error counting clicks:', clicksError);
  } else {
      console.log(`Total Notification Clicks: ${clicks}`);
  }
}

async function debugAnnouncements() {
  console.log('\n--- DEBUG ANNOUNCEMENTS ---');

  // 1. List active announcements
  const { data: announcements, error: annError } = await adminSupabase
    .from('announcements')
    .select('id, title, view_count, click_count, dismiss_count')
    .eq('is_active', true);
    
  if (annError) {
      console.error('Error fetching announcements:', annError);
      return;
  }
  
  console.log(`Active Announcements: ${announcements.length}`);
  announcements.forEach(a => {
      console.log(`- [${a.id}] ${a.title}: Views=${a.view_count}, Clicks=${a.click_count}, Dismiss=${a.dismiss_count}`);
  });

  if (announcements.length > 0) {
      const targetId = announcements[0].id;
      console.log(`\nTesting Click Tracking for Announcement ${targetId}...`);
      
      // Simulate RPC call
      const { error: rpcError } = await adminSupabase.rpc('increment_announcement_click', { announcement_id_input: targetId });
      
      if (rpcError) {
          console.error('RPC Failed:', rpcError);
          // Try fallback logic manually
          console.log('Attempting fallback logic...');
          const current = announcements[0].click_count || 0;
          const { error: updateError } = await adminSupabase
            .from('announcements')
            .update({ click_count: current + 1 })
            .eq('id', targetId);
          if (updateError) console.error('Fallback Update Failed:', updateError);
          else console.log('Fallback Update Success');
      } else {
          console.log('RPC Success');
      }

      // Check new count
      const { data: updated } = await adminSupabase.from('announcements').select('click_count').eq('id', targetId).single();
      console.log(`New Click Count: ${updated?.click_count}`);
  }
}

async function run() {
  await debugNotifications();
  await debugAnnouncements();
}

run();
