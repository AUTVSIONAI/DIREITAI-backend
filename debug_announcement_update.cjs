const { adminSupabase } = require('./config/supabase');

async function debugAnnouncementUpdate() {
  console.log('--- DEBUG ANNOUNCEMENT UPDATE ---');
  
  // 1. Get an active announcement
  const { data: anns, error: fetchError } = await adminSupabase
    .from('announcements')
    .select('id, click_count')
    .limit(1);

  if (fetchError || !anns || anns.length === 0) {
    console.error('No announcements found or error:', fetchError);
    return;
  }

  const id = anns[0].id;
  const initialCount = anns[0].click_count || 0;
  console.log(`Target Announcement: ${id}, Initial Clicks: ${initialCount}`);

  // 2. Try RPC first (simulate route)
  console.log('Attempting RPC increment_announcement_click...');
  const { error: rpcError } = await adminSupabase
    .rpc('increment_announcement_click', { announcement_id_input: id });

  if (rpcError) {
    console.log(`RPC failed as expected: ${rpcError.message} (${rpcError.code})`);
    
    // 3. Try Fallback
    console.log('Attempting Fallback Update...');
    const next = initialCount + 1;
    const { data: updated, error: updateError } = await adminSupabase
      .from('announcements')
      .update({ click_count: next })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('Fallback Update FAILED:', updateError);
    } else {
      console.log('Fallback Update SUCCESS. New Count:', updated[0].click_count);
    }
  } else {
    console.log('RPC SUCCESS! (Unexpected if function is missing)');
  }
}

debugAnnouncementUpdate();
