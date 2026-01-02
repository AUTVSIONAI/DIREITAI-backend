const { adminSupabase } = require('./config/supabase');

async function inspectGeoCheckins() {
  try {
    console.log('Inspecting geographic_checkins...');
    const { data: geoCheckins, error } = await adminSupabase
      .from('geographic_checkins')
      .select('id, user_id, created_at, latitude, longitude');

    if (error) {
      console.error('Error fetching geographic_checkins:', error);
      return;
    }

    console.log(`Found ${geoCheckins.length} geographic check-ins:`);
    geoCheckins.forEach(c => {
      console.log(`- ID: ${c.id}, User ID: ${c.user_id}, Created: ${c.created_at}, Lat/Lon: ${c.latitude}/${c.longitude}`);
    });

    if (geoCheckins.length > 0) {
      // Check if these user_ids exist in users table
      const userIds = geoCheckins.map(c => c.user_id).filter(id => id);
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await adminSupabase
          .from('users')
          .select('id, auth_id, name, email')
          .in('id', userIds);
          
        if (usersError) {
           console.error('Error fetching users:', usersError);
        } else {
           console.log('\nLinked Users:');
           users.forEach(u => console.log(`- ID: ${u.id}, Auth ID: ${u.auth_id}, Name: ${u.name}, Email: ${u.email}`));
        }
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspectGeoCheckins();
