const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente admin para operações que precisam contornar RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBadgesTable() {
  try {
    console.log('🔍 Verificando se a tabela badges existe...');
    
    // Tentar buscar dados da tabela badges
    const { data: badges, error: badgesError } = await adminSupabase
      .from('badges')
      .select('*')
      .limit(5);
    
    if (badgesError) {
      console.error('❌ Erro ao acessar tabela badges:', badgesError);
      console.log('📝 A tabela badges provavelmente não existe.');
      
      // Verificar se a tabela user_achievements existe
      console.log('\n🔍 Verificando tabela user_achievements...');
      const { data: userAchievements, error: userAchievementsError } = await adminSupabase
        .from('user_achievements')
        .select('*')
        .limit(5);
      
      if (userAchievementsError) {
        console.error('❌ Erro ao acessar tabela user_achievements:', userAchievementsError);
      } else {
        console.log('✅ Tabela user_achievements existe e tem', userAchievements.length, 'registros');
        console.log('📋 Estrutura da tabela user_achievements:');
        if (userAchievements.length > 0) {
          console.log('Colunas:', Object.keys(userAchievements[0]));
        }
      }
    } else {
      console.log('✅ Tabela badges existe e tem', badges.length, 'registros');
      console.log('📋 Dados da tabela badges:');
      badges.forEach((badge, index) => {
        console.log(`${index + 1}. Badge:`, badge);
      });
    }
    
    // Verificar também a tabela achievements
    console.log('\n🔍 Verificando tabela achievements...');
    const { data: achievements, error: achievementsError } = await adminSupabase
      .from('achievements')
      .select('*')
      .limit(5);
    
    if (achievementsError) {
      console.error('❌ Erro ao acessar tabela achievements:', achievementsError);
    } else {
      console.log('✅ Tabela achievements existe e tem', achievements.length, 'registros');
      achievements.forEach((achievement, index) => {
        console.log(`${index + 1}. Achievement:`, {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          requirements: achievement.requirements
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkBadgesTable();