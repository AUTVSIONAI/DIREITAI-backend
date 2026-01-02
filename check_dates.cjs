const { adminSupabase } = require('./config/supabase');

async function checkDates() {
  console.log('Checking notification dates...');

  const { data: notifications, error } = await adminSupabase
    .from('notifications')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Most recent 5 notifications:', notifications);

  const { data: oldest, error: oldError } = await adminSupabase
    .from('notifications')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);
    
  console.log('Oldest notification:', oldest);
}

checkDates();
