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
      // Check if these user_ids exist in users table (as id or auth_id)
      const userIds = geoCheckins.map(c => c.user_id).filter(id => id);
      if (userIds.length > 0) {
        console.log('Checking user_ids against public.users (id and auth_id)...');
        
        // Check match on ID
        const { data: usersById, error: errorById } = await adminSupabase
          .from('users')
          .select('*')
          .in('id', userIds);
          
        if (errorById) console.error('Error fetching users by ID:', errorById);
        else {
            console.log(`Found ${usersById.length} users by public ID match.`);
            usersById.forEach(u => console.log(`[ID Match] - ID: ${u.id}, Auth ID: ${u.auth_id}, Name: ${u.name || u.full_name || 'N/A'}`));
        }

        // Check match on Auth ID
        const { data: usersByAuth, error: errorByAuth } = await adminSupabase
          .from('users')
          .select('*')
          .in('auth_id', userIds);

        if (errorByAuth) console.error('Error fetching users by Auth ID:', errorByAuth);
        else {
            console.log(`Found ${usersByAuth.length} users by Auth ID match.`);
            usersByAuth.forEach(u => console.log(`[Auth ID Match] - ID: ${u.id}, Auth ID: ${u.auth_id}, Name: ${u.name || u.full_name || 'N/A'}`));
        }
        
      } else {
        console.log('\nNo user_ids found in geographic_checkins.');
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspectGeoCheckins();
