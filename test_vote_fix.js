const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Testando se o problema de votação foi resolvido...');
    
    // Verificar se o usuário existe na tabela public.users
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .single();
    
    if (userError) {
      console.log('❌ Usuário não encontrado na public.users:', userError.message);
      return;
    }
    
    console.log('✅ Usuário encontrado na public.users:');
    console.log('  - ID:', user.id);
    console.log('  - Auth ID:', user.auth_id);
    console.log('  - Email:', user.email);
    
    // Buscar uma pesquisa existente para testar
    const { data: surveys, error: surveysError } = await adminSupabase
      .from('pesquisas')
      .select('id, titulo')
      .limit(1);
    
    if (surveysError || !surveys || surveys.length === 0) {
      console.log('❌ Nenhuma pesquisa encontrada para testar:', surveysError?.message);
      return;
    }
    
    const survey = surveys[0];
    console.log('📊 Pesquisa para teste:', survey.titulo);
    
    // Buscar a pesquisa completa com opções
    const { data: fullSurvey, error: fullSurveyError } = await adminSupabase
      .from('pesquisas')
      .select('*')
      .eq('id', survey.id)
      .single();
    
    if (fullSurveyError || !fullSurvey || !fullSurvey.opcoes || fullSurvey.opcoes.length === 0) {
      console.log('❌ Nenhuma opção encontrada para a pesquisa:', fullSurveyError?.message);
      return;
    }
    
    const option = fullSurvey.opcoes[0];
    console.log('📝 Opção para teste:', option.texto || option.title);
    
    // Verificar se o usuário já votou nesta pesquisa
    const { data: existingVotes, error: existingVotesError } = await adminSupabase
      .from('votos')
      .select('*')
      .eq('pesquisa_id', survey.id)
      .eq('usuario_id', user.id);
    
    if (existingVotesError) {
      console.log('❌ Erro ao verificar votos existentes:', existingVotesError.message);
    } else {
      console.log('📊 Votos existentes do usuário nesta pesquisa:', existingVotes?.length || 0);
      
      // Se já votou, deletar o voto para poder testar novamente
      if (existingVotes && existingVotes.length > 0) {
        console.log('🗑️ Deletando votos existentes para poder testar...');
        const { error: deleteError } = await adminSupabase
          .from('votos')
          .delete()
          .eq('pesquisa_id', survey.id)
          .eq('usuario_id', user.id);
        
        if (deleteError) {
          console.log('❌ Erro ao deletar votos existentes:', deleteError.message);
        } else {
          console.log('✅ Votos existentes deletados!');
        }
      }
    }
    
    // Tentar inserir um novo voto
    console.log('\n🗳️ Tentando inserir voto...');
    const { data: voteResult, error: voteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: survey.id,
        usuario_id: user.id,
        opcao_id: option.id,
        comentario: 'Teste de voto após correção',
        user_ip: '127.0.0.1',
        user_agent: 'Test Agent'
      })
      .select()
      .single();
    
    if (voteError) {
      console.log('❌ Erro ao inserir voto:', voteError.message);
      console.log('❌ Detalhes do erro:', JSON.stringify(voteError, null, 2));
    } else {
      console.log('✅ Voto inserido com sucesso!');
      console.log('📊 Dados do voto:', voteResult);
      
      // Verificar se o voto foi realmente inserido
      const { data: verifyVote, error: verifyError } = await adminSupabase
        .from('votos')
        .select('*')
        .eq('id', voteResult.id)
        .single();
      
      if (verifyError) {
        console.log('❌ Erro ao verificar voto inserido:', verifyError.message);
      } else {
        console.log('✅ Voto verificado na base de dados!');
        console.log('📊 Dados verificados:', verifyVote);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();