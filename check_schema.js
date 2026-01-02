const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking geographic_checkins schema...');
    const { data, error } = await supabase
        .from('geographic_checkins')
        .select('*')
        .limit(1);
        
    if (error) {
        console.log('Error selecting from geographic_checkins:', error);
    } else {
        console.log('Successfully selected from geographic_checkins. Columns present in result (if any):');
        if (data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot infer columns from data. Trying to insert a dummy to check constraints if possible, or just checking metadata if I could.');
        }
    }

    console.log('Checking points table...');
    const { data: pointsData, error: pointsError } = await supabase
        .from('points')
        .select('*')
        .limit(1);

    if (pointsError) {
        console.log('Error selecting from points:', pointsError);
    } else {
        console.log('Points table accessible.');
    }
}

checkSchema();
