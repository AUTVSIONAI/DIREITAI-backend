const { adminSupabase } = require('./config/supabase');

async function debugAnnouncementClick() {
  console.log('--- DEBUG ANNOUNCEMENT CLICK ---');

  // 1. Get an active announcement
  const { data: announcements, error: listError } = await adminSupabase
    .from('announcements')
    .select('id, title, click_count, view_count')
    .limit(1);

  if (listError || !announcements.length) {
    console.error('No announcements found or error:', listError);
    return;
  }

  const ann = announcements[0];
  console.log(`Testing with Announcement: ${ann.title} (ID: ${ann.id})`);
  console.log(`Initial Counts -> Views: ${ann.view_count}, Clicks: ${ann.click_count}`);

  // 2. Simulate Click (Fallback Logic)
  console.log('Simulating Click (Fallback Logic)...');
  const nextClick = (ann.click_count || 0) + 1;
  const { error: updateError } = await adminSupabase
    .from('announcements')
    .update({ click_count: nextClick })
    .eq('id', ann.id);

  if (updateError) {
    console.error('Fallback Update Failed:', updateError);
  } else {
    console.log(`Fallback Update Success. New Click Count should be ${nextClick}`);
  }

  // 3. Simulate Click Tracking (Insert row)
  // Need a valid user ID. Let's get one.
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  const userId = users.users[0]?.id;

  if (userId) {
    console.log(`Simulating Click Tracking for User: ${userId}`);
    const { error: trackError } = await adminSupabase
      .from('announcement_clicks')
      .insert({ announcement_id: ann.id, user_id: userId });
    
    if (trackError) {
      // Ignore unique violation if it happens
      if (trackError.code === '23505') console.log('Click already tracked for this user.');
      else console.error('Click Tracking Failed:', trackError);
    } else {
      console.log('Click Tracking Inserted.');
    }
  } else {
    console.log('No users found for tracking test.');
  }

  // 4. Verify Stats Logic
  console.log('Verifying Stats Logic...');
  
  // Aggregate from table
  const { data: updatedAnn } = await adminSupabase
    .from('announcements')
    .select('click_count')
    .eq('id', ann.id)
    .single();
    
  // Count from tracking table
  const { count: trackedClicks } = await adminSupabase
    .from('announcement_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('announcement_id', ann.id);

  console.log(`Updated Table Count: ${updatedAnn.click_count}`);
  console.log(`Tracked Table Count: ${trackedClicks}`);
  
  const finalClicks = Math.max(updatedAnn.click_count || 0, trackedClicks || 0);
  console.log(`Final Calculated Clicks: ${finalClicks}`);
  
  if (finalClicks > ann.click_count) {
    console.log('✅ TEST PASSED: Click count increased.');
  } else {
    console.log('❌ TEST FAILED: Click count did not increase.');
  }
}

debugAnnouncementClick();
