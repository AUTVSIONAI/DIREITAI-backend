const { adminSupabase } = require('./config/supabase');

async function checkSchema() {
  console.log('--- CHECK SCHEMA ---');

  // 1. Check users table
  const { data: users, error: userError } = await adminSupabase.from('users').select('*').limit(1);
  if (userError) console.error('Error fetching users:', userError);
  else if (users.length > 0) console.log('Users columns:', Object.keys(users[0]));
  else console.log('Users table empty.');

  // 2. Check announcements table
  const { data: anns, error: annError } = await adminSupabase.from('announcements').select('id, click_count, view_count, dismiss_count').limit(5);
  if (annError) console.error('Error fetching announcements:', annError);
  else {
    console.log('Announcements sample (counts):');
    anns.forEach(a => console.log(`ID: ${a.id}, Clicks: ${a.click_count}, Views: ${a.view_count}, Dismissals: ${a.dismiss_count}`));
  }

  // 3. Check notifications table
  const { data: notifs, error: notifError } = await adminSupabase.from('notifications').select('id, is_clicked, is_read, created_at').limit(5);
  if (notifError) console.error('Error fetching notifications:', notifError);
  else {
    console.log('Notifications sample:');
    notifs.forEach(n => console.log(`ID: ${n.id}, Clicked: ${n.is_clicked}, Read: ${n.is_read}, Date: ${n.created_at}`));
  }

  // 4. Check notification_clicks table
  const { data: clicks, error: clickError } = await adminSupabase.from('notification_clicks').select('*').limit(5);
  if (clickError) {
      if (clickError.code === '42P01') console.log('notification_clicks table does not exist.');
      else console.error('Error fetching notification_clicks:', clickError);
  } else {
      console.log('Notification Clicks sample:', clicks);
  }

  // 5. Check announcement_clicks table
  const { data: annClicks, error: annClickError } = await adminSupabase.from('announcement_clicks').select('*').limit(5);
  if (annClickError) {
       if (annClickError.code === '42P01') console.log('announcement_clicks table does not exist.');
       else console.error('Error fetching announcement_clicks:', annClickError);
  } else {
      console.log('Announcement Clicks sample:', annClicks);
  }

}

checkSchema();
