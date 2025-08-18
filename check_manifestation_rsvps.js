const { supabase } = require('./config/supabase');

(async () => {
  try {
    console.log('🔍 Verificando RSVPs de manifestações...');
    
    const { data: manifestationRsvps, error } = await supabase
      .from('manifestation_rsvp')
      .select('*');
    
    if (error) {
      console.log('❌ Erro:', error.message);
      return;
    }
    
    console.log('📊 RSVPs de Manifestações encontrados:', manifestationRsvps.length);
    
    if (manifestationRsvps.length > 0) {
      manifestationRsvps.forEach((rsvp, i) => {
        console.log(`${i+1}. User ID: ${rsvp.user_id} - Status: ${rsvp.status} - Manifestação ID: ${rsvp.manifestation_id}`);
      });
    } else {
      console.log('ℹ️ Nenhum RSVP de manifestação encontrado');
    }
    
  } catch (e) {
    console.log('❌ Erro:', e.message);
  }
})();