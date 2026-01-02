
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStats() {
  console.log('Verifying notification stats logic...');

  // Count clicked
  const { count: totalClicked, error: clickError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .not('clicked_at', 'is', null);

  if (clickError) console.error('Error counting clicked:', clickError);
  else console.log('Total Clicked (not clicked_at is null):', totalClicked);

  // Count dismissed
  const { count: totalDismissed, error: dismissError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .not('dismissed_at', 'is', null);

  if (dismissError) console.error('Error counting dismissed:', dismissError);
  else console.log('Total Dismissed (not dismissed_at is null):', totalDismissed);
  
  // Count total
  const { count: total, error: totalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
  console.log('Total Notifications:', total);
}

verifyStats();
