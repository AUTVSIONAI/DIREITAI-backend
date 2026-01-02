const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // Try to get columns from checkins
    const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting checkins:', error);
    } else if (data && data.length > 0) {
         console.log('Columns:', Object.keys(data[0]));
    } else {
         console.log('Table empty.');
    }
}

checkSchema();
