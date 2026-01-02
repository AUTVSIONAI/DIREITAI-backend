const { adminSupabase } = require('./config/supabase');

async function checkSchema() {
  console.log('--- Checking Schemas ---');

  // Check 'notifications' table columns
  const { data: notifData, error: notifError } = await adminSupabase
    .from('notifications')
    .select('*')
    .limit(1);
  
  if (notifError) console.error('Error fetching notifications:', notifError);
  else console.log('Notifications columns:', notifData && notifData.length > 0 ? Object.keys(notifData[0]) : 'Table empty or no access');

  // Check 'announcements' table columns
  const { data: annData, error: annError } = await adminSupabase
    .from('announcements')
    .select('*')
    .limit(1);

  if (annError) console.error('Error fetching announcements:', annError);
  else console.log('Announcements columns:', annData && annData.length > 0 ? Object.keys(annData[0]) : 'Table empty or no access');

  // Check 'announcement_clicks' table columns
  const { data: clicksData, error: clicksError } = await adminSupabase
    .from('announcement_clicks')
    .select('*')
    .limit(1);

  if (clicksError) console.error('Error fetching announcement_clicks:', clicksError);
  else console.log('Announcement_clicks columns:', clicksData && clicksData.length > 0 ? Object.keys(clicksData[0]) : 'Table empty or no access');

  // Check if there are related tables for tracking
  const tables = ['announcement_views', 'announcement_clicks', 'announcement_dismissals', 'notification_clicks'];
  for (const table of tables) {
    const { count, error } = await adminSupabase.from(table).select('*', { count: 'exact', head: true });
    if (error) console.log(`Table '${table}' might not exist or error:`, error.message);
    else console.log(`Table '${table}' exists. Count: ${count}`);
  }
}

checkSchema();
