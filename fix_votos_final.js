const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Verificando dados existentes na tabela votos...');
    
    // Verificar dados existentes na tabela votos
    const { data: existingVotes, error: votesError } = await adminSupabase
      .from('votos')
      .select('*')
      .limit(5);
    
    if (votesError) {
      console.log('❌ Erro ao verificar votos existentes:', votesError.message);
    } else {
      console.log('📊 Votos existentes na tabela:', existingVotes?.length || 0);
      if (existingVotes && existingVotes.length > 0) {
        console.log('📝 Exemplo de voto:', existingVotes[0]);
      }
    }
    
    // Verificar se o usuário específico existe na tabela public.users
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6')
      .single();
    
    if (userError) {
      console.log('❌ Usuário não encontrado na public.users:', userError.message);
      return;
    }
    
    console.log('✅ Usuário encontrado na public.users:', user.email);
    
    // Tentar inserir um voto diretamente usando SQL raw
    console.log('\n🗳️ Tentando inserir voto usando SQL raw...');
    
    // Buscar uma pesquisa para teste
    const { data: survey, error: surveyError } = await adminSupabase
      .from('pesquisas')
      .select('*')
      .limit(1)
      .single();
    
    if (surveyError || !survey) {
      console.log('❌ Nenhuma pesquisa encontrada:', surveyError?.message);
      return;
    }
    
    const option = survey.opcoes[0];
    console.log('📊 Testando com pesquisa:', survey.titulo);
    console.log('📝 Opção:', option.texto || option.title);
    
    // Deletar voto existente se houver
    await adminSupabase
      .from('votos')
      .delete()
      .eq('pesquisa_id', survey.id)
      .eq('usuario_id', user.id);
    
    // Tentar inserir usando o método padrão do Supabase
    const { data: voteResult, error: voteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: survey.id,
        usuario_id: user.id,
        opcao_id: option.id,
        comentario: 'Teste final após correções',
        user_ip: '127.0.0.1',
        user_agent: 'Test Agent Final'
      })
      .select()
      .single();
    
    if (voteError) {
      console.log('❌ Erro ao inserir voto:', voteError.message);
      console.log('❌ Código do erro:', voteError.code);
      console.log('❌ Detalhes:', voteError.details);
      
      // Se ainda há erro de foreign key, vamos tentar uma abordagem diferente
      if (voteError.code === '23503') {
        console.log('\n🔧 Tentando abordagem alternativa...');
        
        // Verificar se existe algum usuário na tabela que a constraint está referenciando
        console.log('🔍 Verificando usuários existentes que podem votar...');
        
        // Tentar com diferentes IDs de usuário para identificar o padrão
        const { data: allUsers, error: allUsersError } = await adminSupabase
          .from('users')
          .select('id, email, auth_id')
          .limit(5);
        
        if (allUsersError) {
          console.log('❌ Erro ao buscar usuários:', allUsersError.message);
        } else {
          console.log('📊 Usuários disponíveis:');
          for (const u of allUsers) {
            console.log(`  - ID: ${u.id}, Email: ${u.email}, Auth ID: ${u.auth_id}`);
            
            // Tentar inserir voto com cada usuário para ver qual funciona
            try {
              const { data: testVote, error: testError } = await adminSupabase
                .from('votos')
                .insert({
                  pesquisa_id: survey.id,
                  usuario_id: u.id,
                  opcao_id: option.id,
                  comentario: `Teste com usuário ${u.email}`,
                  user_ip: '127.0.0.1',
                  user_agent: 'Test Agent'
                })
                .select()
                .single();
              
              if (testError) {
                console.log(`    ❌ Falhou para ${u.email}: ${testError.message}`);
              } else {
                console.log(`    ✅ Sucesso para ${u.email}!`);
                console.log(`    📊 Voto inserido:`, testVote);
                
                // Deletar o voto de teste
                await adminSupabase
                  .from('votos')
                  .delete()
                  .eq('id', testVote.id);
                
                break;
              }
            } catch (err) {
              console.log(`    ❌ Erro para ${u.email}:`, err.message);
            }
          }
        }
      }
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
        console.log('❌ Erro ao verificar voto:', verifyError.message);
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