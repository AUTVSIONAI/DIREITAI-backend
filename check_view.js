const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViews() {
    const { data, error } = await supabase
        .rpc('exec_sql', { sql: "select table_name, view_definition from information_schema.views where table_name = 'user_profiles'" });
        
    // If exec_sql is not available, we can't easily see view definition.
    // Try to select from it to see if it works.
    
    if (error) {
        console.log('Error checking view:', error.message);
        // Fallback: try to select from user_profiles to see if it exists
        const { data: d2, error: e2 } = await supabase.from('user_profiles').select('*').limit(1);
        if (e2) console.log('Error selecting user_profiles:', e2.message);
        else console.log('user_profiles exists and is queryable.');
    } else {
        console.log('View definition:', data);
    }
}

// Also check users table points vs user_profiles points for a specific user if possible.
// We don't have a user ID.
// We can check if points match generally.

checkViews();
