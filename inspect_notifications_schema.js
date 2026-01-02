
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Inspecting notifications table schema...');
  
  // Try to insert a dummy record with all fields to see if it fails, 
  // or better, just select * limit 1 and look at the keys.
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No notifications found to inspect columns. Trying to list columns via RPC or assumption.');
    // If no data, we can't easily guess columns without admin metadata access which Supabase JS client doesn't fully expose easily without specific SQL.
    // But we can try to select specific columns and see if it errors.
    
    const checkColumn = async (col) => {
        const { error } = await supabase.from('notifications').select(col).limit(1);
        if (error) console.log(`Column '${col}' likely DOES NOT exist or error:`, error.message);
        else console.log(`Column '${col}' exists.`);
    };

    await checkColumn('is_clicked');
    await checkColumn('is_dismissed');
    await checkColumn('is_read');
  }
}

inspectSchema();
