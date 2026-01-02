const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\DIREITAI\\backend-oficial\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const userId = 'd67e3f2a-d08c-4cd4-97b0-a6a7e594ca54'; // Oseias Public ID
  const authId = '4f1b46b2-698c-4a79-ac64-df47278af391'; // Oseias Auth ID

  console.log(`Testing query for UserID: ${userId}, AuthID: ${authId}`);

  let orFilter = `user_id.eq.${userId}`;
  if (authId) {
    orFilter += `,user_id.eq.${authId}`;
  }
  
  console.log('OR Filter:', orFilter);

  const { data: checkins, error } = await supabase
    .from('geographic_checkins')
    .select('*')
    .or(orFilter);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${checkins.length} checkins.`);
    checkins.forEach(c => {
        console.log(`- ID: ${c.id}, UserID: ${c.user_id}`);
    });
  }
}

testQuery();
