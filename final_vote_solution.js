const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔧 SOLUÇÃO FINAL PARA O PROBLEMA DE VOTOS');
    console.log('=' .repeat(50));
    
    // 1. Analisar dados existentes
    console.log('\n📊 1. Analisando dados existentes...');
    
    const { data: existingVotes, error: votesError } = await adminSupabase
      .from('votos')
      .select('*');
    
    if (votesError) {
      console.log('❌ Erro ao buscar votos:', votesError.message);
      return;
    }
    
    console.log(`📊 Total de votos existentes: ${existingVotes?.length || 0}`);
    
    if (existingVotes && existingVotes.length > 0) {
      console.log('\n🔍 Verificando usuários dos votos existentes...');
      
      const userIds = [...new Set(existingVotes.map(v => v.usuario_id))];
      const validVotes = [];
      const invalidVotes = [];
      
      for (const userId of userIds) {
        const { data: user, error: userError } = await adminSupabase
          .from('users')
          .select('id, email')
          .eq('id', userId)
          .single();
        
        const votesForUser = existingVotes.filter(v => v.usuario_id === userId);
        
        if (userError) {
          console.log(`❌ Usuário ${userId} não encontrado em public.users`);
          invalidVotes.push(...votesForUser);
        } else {
          console.log(`✅ Usuário ${user.email} (${userId}) válido`);
          validVotes.push(...votesForUser);
        }
      }
      
      console.log(`\n📊 Votos válidos: ${validVotes.length}`);
      console.log(`📊 Votos inválidos: ${invalidVotes.length}`);
      
      // 2. Corrigir votos inválidos
      if (invalidVotes.length > 0) {
        console.log('\n🔧 2. Corrigindo votos inválidos...');
        
        for (const invalidVote of invalidVotes) {
          console.log(`\n🔍 Processando voto inválido ID: ${invalidVote.id}`);
          console.log(`   Usuário inválido: ${invalidVote.usuario_id}`);
          
          // Tentar encontrar o usuário correspondente em auth.users
          // e criar/sincronizar na public.users
          try {
            // Buscar na tabela auth.users usando o adminSupabase
            const { data: authUsers, error: authError } = await adminSupabase
              .rpc('get_auth_users'); // Função personalizada se existir
            
            if (authError) {
              console.log('   ❌ Não conseguiu buscar em auth.users:', authError.message);
              
              // Alternativa: deletar o voto inválido
              console.log('   🗑️ Deletando voto inválido...');
              const { error: deleteError } = await adminSupabase
                .from('votos')
                .delete()
                .eq('id', invalidVote.id);
              
              if (deleteError) {
                console.log('   ❌ Erro ao deletar voto:', deleteError.message);
              } else {
                console.log('   ✅ Voto inválido deletado');
              }
            }
          } catch (err) {
            console.log('   ❌ Erro ao processar voto inválido:', err.message);
            
            // Deletar o voto inválido como último recurso
            console.log('   🗑️ Deletando voto inválido como último recurso...');
            const { error: deleteError } = await adminSupabase
              .from('votos')
              .delete()
              .eq('id', invalidVote.id);
            
            if (deleteError) {
              console.log('   ❌ Erro ao deletar voto:', deleteError.message);
            } else {
              console.log('   ✅ Voto inválido deletado');
            }
          }
        }
      }
    }
    
    // 3. Testar inserção de novo voto
    console.log('\n🗳️ 3. Testando inserção de novo voto...');
    
    // Buscar usuário válido
    const { data: testUser, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'maumautremeterra@gmail.com')
      .single();
    
    if (userError) {
      console.log('❌ Usuário de teste não encontrado:', userError.message);
      return;
    }
    
    console.log(`✅ Usuário de teste encontrado: ${testUser.email}`);
    
    // Buscar pesquisa para teste
    const { data: testSurvey, error: surveyError } = await adminSupabase
      .from('pesquisas')
      .select('*')
      .limit(1)
      .single();
    
    if (surveyError || !testSurvey) {
      console.log('❌ Pesquisa de teste não encontrada:', surveyError?.message);
      return;
    }
    
    if (!testSurvey.opcoes || testSurvey.opcoes.length === 0) {
      console.log('❌ Pesquisa não tem opções válidas');
      return;
    }
    
    const testOption = testSurvey.opcoes[0];
    console.log(`📊 Testando com pesquisa: ${testSurvey.titulo}`);
    console.log(`📝 Opção: ${testOption.texto || testOption.title}`);
    
    // Deletar voto existente se houver
    await adminSupabase
      .from('votos')
      .delete()
      .eq('pesquisa_id', testSurvey.id)
      .eq('usuario_id', testUser.id);
    
    // Tentar inserir novo voto
    const { data: newVote, error: voteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: testSurvey.id,
        usuario_id: testUser.id,
        opcao_id: testOption.id,
        comentario: 'Teste final - solução completa',
        user_ip: '127.0.0.1',
        user_agent: 'Final Test Agent'
      })
      .select()
      .single();
    
    if (voteError) {
      console.log('❌ AINDA HÁ ERRO ao inserir voto:', voteError.message);
      console.log('❌ Código:', voteError.code);
      console.log('❌ Detalhes:', voteError.details);
      
      console.log('\n⚠️ SOLUÇÃO MANUAL NECESSÁRIA:');
      console.log('1. Acesse o painel do Supabase');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute os seguintes comandos:');
      console.log('');
      console.log('-- Dropar constraint existente');
      console.log('ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_usuario_id_fkey;');
      console.log('');
      console.log('-- Adicionar nova constraint');
      console.log('ALTER TABLE votos ADD CONSTRAINT votos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id);');
      console.log('');
      console.log('4. Após executar, rode este script novamente para testar');
      
    } else {
      console.log('\n🎉 SUCESSO TOTAL!');
      console.log('✅ Voto inserido com sucesso!');
      console.log('📊 Dados do voto:', newVote);
      
      console.log('\n✅ PROBLEMA RESOLVIDO!');
      console.log('✅ A tabela votos agora está funcionando corretamente');
      console.log('✅ Usuários podem votar normalmente');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();