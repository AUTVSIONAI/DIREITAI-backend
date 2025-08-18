const { supabase } = require('./config/supabase');

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura das tabelas...');
    
    // Verificar estrutura da tabela gamification_activities
    console.log('\n📋 Estrutura da tabela gamification_activities:');
    const { data: activities, error: activitiesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'gamification_activities')
      .order('ordinal_position');
    
    if (activitiesError) {
      console.log('❌ Erro ao obter estrutura de gamification_activities:', activitiesError.message);
    } else {
      console.log('✅ Colunas da tabela gamification_activities:');
      activities?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Verificar estrutura da tabela quiz_results
    console.log('\n📋 Estrutura da tabela quiz_results:');
    const { data: quizResults, error: quizError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'quiz_results')
      .order('ordinal_position');
    
    if (quizError) {
      console.log('❌ Erro ao obter estrutura de quiz_results:', quizError.message);
    } else {
      console.log('✅ Colunas da tabela quiz_results:');
      quizResults?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Verificar estrutura da tabela badges
    console.log('\n📋 Estrutura da tabela badges:');
    const { data: badges, error: badgesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'badges')
      .order('ordinal_position');
    
    if (badgesError) {
      console.log('❌ Erro ao obter estrutura de badges:', badgesError.message);
    } else {
      console.log('✅ Colunas da tabela badges:');
      badges?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Testar inserção na tabela quiz_results
    console.log('\n🧪 Testando inserção na tabela quiz_results...');
    const testQuizData = {
      user_id: '12345678-1234-1234-1234-123456789012', // UUID de teste
      quiz_type: 'constitution',
      score: 8,
      total_questions: 10,
      correct_answers: 8,
      time_spent: 120,
      points_earned: 80,
      answers: JSON.stringify([{question: 1, answer: 'A', correct: true}])
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('quiz_results')
      .insert(testQuizData)
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir teste:', insertError.message);
      console.log('Detalhes do erro:', insertError);
    } else {
      console.log('✅ Inserção de teste bem-sucedida:', insertResult);
      
      // Remover o registro de teste
      await supabase
        .from('quiz_results')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🗑️ Registro de teste removido');
    }
    
    console.log('\n✅ Verificação de estrutura concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkTableStructure();