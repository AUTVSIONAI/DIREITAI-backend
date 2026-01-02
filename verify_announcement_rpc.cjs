const { adminSupabase } = require('./config/supabase');

async function verifyRPC() {
  console.log('Verifying Announcement RPCs...');

  // 1. Get an active announcement
  const { data: ann, error: annError } = await adminSupabase
    .from('announcements')
    .select('*')
    .limit(1)
    .single();

  if (annError || !ann) {
    console.error('No announcement found or error:', annError);
    return;
  }

  console.log(`Testing with Announcement ID: ${ann.id}`);
  console.log(`Current Click Count: ${ann.click_count}`);

  // 2. Call RPC
  console.log('Calling increment_announcement_click...');
  const { error: rpcError } = await adminSupabase
    .rpc('increment_announcement_click', { announcement_id_input: ann.id });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log('RPC Call Successful');
  }

  // 3. Check count again
  const { data: annAfter, error: afterError } = await adminSupabase
    .from('announcements')
    .select('click_count')
    .eq('id', ann.id)
    .single();

  if (afterError) {
    console.error('Error fetching updated announcement:', afterError);
  } else {
    console.log(`New Click Count: ${annAfter.click_count}`);
    if (annAfter.click_count > ann.click_count) {
      console.log('SUCCESS: Click count incremented!');
    } else {
      console.log('FAILURE: Click count did not increment.');
    }
  }
}

verifyRPC();
