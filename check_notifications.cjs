
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNotifications() {
  console.log('Checking notifications table...');
  
  // Count total notifications
  const { count, error } = await adminSupabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting notifications:', error);
    return;
  }
  console.log(`Total notifications: ${count}`);

  // Get recent notifications
  const { data: recent, error: recentError } = await adminSupabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('Error fetching recent notifications:', recentError);
    return;
  }

  console.log('Recent notifications:');
  recent.forEach(n => {
    console.log(`- [${n.created_at}] ${n.title} (${n.type}) - User: ${n.user_id}`);
  });

  // Check stats query logic
  const period = 'month';
  let dateFilter = new Date();
  dateFilter.setMonth(dateFilter.getMonth() - 1);
  const isoDate = dateFilter.toISOString();
  console.log(`Stats filter date (1 month ago): ${isoDate}`);

  const { count: statsCount, error: statsError } = await adminSupabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', isoDate);
    
  if (statsError) {
    console.error('Error fetching stats count:', statsError);
  } else {
    console.log(`Notifications in last month: ${statsCount}`);
  }
}

checkNotifications();
