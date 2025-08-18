require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBadges() {
  try {
    console.log('🔍 Verificando dados da tabela badges...');
    
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Erro ao buscar badges:', error);
      return;
    }
    
    console.log('📊 Badges encontrados:', badges?.length || 0);
    if (badges && badges.length > 0) {
      console.log('📋 Primeiros badges:', badges);
    } else {
      console.log('⚠️ Nenhum badge encontrado na tabela');
    }
    
    // Verificar também a tabela points
    const { data: points, error: pointsError } = await supabase
      .from('points')
      .select('*')
      .limit(10);
    
    if (pointsError) {
      console.error('❌ Erro ao buscar points:', pointsError);
    } else {
      console.log('💰 Points encontrados:', points?.length || 0);
      if (points && points.length > 0) {
        console.log('📋 Primeiros points:', points);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkBadges();