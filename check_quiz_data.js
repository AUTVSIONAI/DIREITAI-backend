const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente admin para operações que precisam contornar RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuizData() {
  try {
    console.log('🔍 Verificando dados da tabela quiz_results...');
    
    // Buscar os últimos 10 resultados de quiz
    const { data: quizResults, error: quizError } = await adminSupabase
      .from('quiz_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (quizError) {
      console.error('❌ Erro ao buscar quiz_results:', quizError);
    } else {
      console.log('📊 Quiz Results encontrados:', quizResults.length);
      console.log('📋 Dados dos quiz_results:');
      quizResults.forEach((result, index) => {
        console.log(`\n${index + 1}. Quiz ID: ${result.id}`);
        console.log(`   User ID: ${result.user_id}`);
        console.log(`   Quiz Type: ${result.quiz_type}`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Correct Answers: ${result.correct_answers}/${result.total_questions}`);
        console.log(`   Points Earned: ${result.points_earned}`);
        console.log(`   Created At: ${result.created_at}`);
      });
    }
    
    // Verificar também a tabela de atividades de gamificação
    console.log('\n🔍 Verificando atividades de gamificação relacionadas a quiz...');
    
    const { data: activities, error: activitiesError } = await adminSupabase
      .from('gamification_activities')
      .select('*')
      .eq('activity_type', 'quiz_completed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (activitiesError) {
      console.error('❌ Erro ao buscar gamification_activities:', activitiesError);
    } else {
      console.log('🎯 Atividades de quiz encontradas:', activities.length);
      activities.forEach((activity, index) => {
        console.log(`\n${index + 1}. Activity ID: ${activity.id}`);
        console.log(`   User ID: ${activity.user_id}`);
        console.log(`   Activity Type: ${activity.activity_type}`);
        console.log(`   Points: ${activity.points}`);
        console.log(`   Created At: ${activity.created_at}`);
        console.log(`   Metadata:`, JSON.stringify(activity.metadata, null, 2));
      });
    }
    
    // Verificar conquistas desbloqueadas
    console.log('\n🏆 Verificando conquistas desbloqueadas...');
    
    const { data: achievements, error: achievementsError } = await adminSupabase
      .from('user_achievements')
      .select(`
        *,
        achievements (
          name,
          description,
          requirements
        )
      `)
      .order('earned_at', { ascending: false })
      .limit(10);
    
    if (achievementsError) {
      console.error('❌ Erro ao buscar user_achievements:', achievementsError);
    } else {
      console.log('🏅 Conquistas desbloqueadas:', achievements.length);
      achievements.forEach((achievement, index) => {
        console.log(`\n${index + 1}. Achievement: ${achievement.achievements?.name}`);
        console.log(`   User ID: ${achievement.user_id}`);
        console.log(`   Earned At: ${achievement.earned_at}`);
        console.log(`   Requirements:`, JSON.stringify(achievement.achievements?.requirements, null, 2));
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkQuizData();