const { adminSupabase } = require('./config/supabase');

async function checkNotificationDates() {
  console.log('Checking notification dates...');
  
  const { data, error } = await adminSupabase
    .from('notifications')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  console.log('Recent notifications created_at:', data);

  // Check how many are within the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count, error: countError } = await adminSupabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());

  console.log(`Notifications in the last 30 days: ${count}`);
}

checkNotificationDates();
