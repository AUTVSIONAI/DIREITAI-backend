const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
  console.log('Checking notifications table...');
  
  // Total count
  const { count: total, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Error counting notifications:', countError);
  } else {
    console.log(`Total notifications: ${total}`);
  }

  // Count with read_at not null
  const { count: readCount, error: readError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .not('read_at', 'is', null);
    
  if (readError) {
    console.error('Error counting read notifications:', readError);
  } else {
    console.log(`Read notifications (read_at IS NOT NULL): ${readCount}`);
  }
  
  // Count with clicked_at not null
  const { count: clickedCount, error: clickedError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .not('clicked_at', 'is', null);
    
  if (clickedError) {
    console.error('Error counting clicked notifications:', clickedError);
  } else {
    console.log(`Clicked notifications (clicked_at IS NOT NULL): ${clickedCount}`);
  }

  // Check columns existence
  const { data: sample, error: sampleError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);
    
  if (sampleError) {
    console.error('Error fetching sample:', sampleError);
  } else if (sample && sample.length > 0) {
    console.log('Sample notification keys:', Object.keys(sample[0]));
  } else {
    console.log('No notifications found to sample.');
  }
}

checkNotifications();
