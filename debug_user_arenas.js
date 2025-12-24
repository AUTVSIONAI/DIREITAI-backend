
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserArenas() {
  const userId = 'cc7322c4-353d-4b5d-a832-f5c70383f1e7';
  console.log(`Debug for User ID: ${userId}`);

  // 1. Get User
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${userId},auth_id.eq.${userId}`)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError.message);
    return;
  }
  
  if (!user) {
    console.error('User not found');
    return;
  }

  console.log('User found:', { id: user.id, email: user.email, role: user.role, politician_id: user.politician_id });

  if (user.role !== 'politician') {
    console.log('User is NOT a politician.');
  }

  // 2. Resolve Politician ID
  let politicianId = user.politician_id;

  if (!politicianId && user.email) {
    console.log(`Searching politician by email: ${user.email}`);
    const { data: pols, error: polError } = await supabase
      .from('politicians')
      .select('*')
      .ilike('email', user.email);

    if (polError) {
      console.error('Error searching politician by email:', polError.message);
    } else if (pols && pols.length > 0) {
      console.log('Politician found by email:', pols[0].id, pols[0].name);
      politicianId = pols[0].id;
    } else {
      console.log('No politician found with this email.');
    }
  }

  if (!politicianId) {
    console.log('Could not resolve politician ID for this user.');
    return;
  }

  console.log(`Resolved Politician ID: ${politicianId}`);

  // 3. Check Arenas
  const { data: arenas, error: arenaError } = await supabase
    .from('arenas')
    .select('*')
    .eq('politician_id', politicianId);

  if (arenaError) {
    console.error('Error fetching arenas:', arenaError.message);
  } else {
    console.log(`Found ${arenas.length} arenas for this politician.`);
    arenas.forEach(a => {
      console.log(`- [${a.status}] ${a.title} (Scheduled: ${a.scheduled_at})`);
    });
  }
}

debugUserArenas();
