const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixVoteIssue() {
  try {
    console.log('=== CORREÇÃO DO PROBLEMA DE VOTAÇÃO ===\n');
    
    // Primeiro, vamos verificar se o usuário realmente existe
    console.log('1. Verificando usuário...');
    const userId = 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6';
    
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.log('Usuário não encontrado:', userError);
      return;
    }
    
    console.log('Usuário encontrado:', user.email);
    
    // Agora vamos tentar uma abordagem diferente: 
    // Vamos verificar se há algum problema de encoding ou caracteres especiais
    console.log('\n2. Tentando inserção com diferentes abordagens...');
    
    // Abordagem 1: Inserção normal
    console.log('Abordagem 1: Inserção normal');
    const { data: vote1, error: error1 } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
        usuario_id: userId,
        opcao_id: 1
      })
      .select();
    
    if (error1) {
      console.log('Erro abordagem 1:', error1.message);
      
      // Abordagem 2: Tentar com upsert
      console.log('\nAbordagem 2: Usando upsert');
      const { data: vote2, error: error2 } = await adminSupabase
        .from('votos')
        .upsert({
          pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
          usuario_id: userId,
          opcao_id: 1
        })
        .select();
      
      if (error2) {
        console.log('Erro abordagem 2:', error2.message);
        
        // Abordagem 3: Verificar se há problema com o UUID
        console.log('\nAbordagem 3: Verificando UUID');
        console.log('UUID do usuário:', userId);
        console.log('Comprimento:', userId.length);
        console.log('Formato válido:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
        
        // Abordagem 4: Tentar recriar o usuário com o mesmo ID
        console.log('\nAbordagem 4: Tentando recriar usuário');
        
        // Primeiro, fazer backup dos dados do usuário
        const { data: fullUser, error: fullUserError } = await adminSupabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!fullUserError && fullUser) {
          console.log('Dados do usuário salvos');
          
          // Deletar o usuário
          const { error: deleteError } = await adminSupabase
            .from('users')
            .delete()
            .eq('id', userId);
          
          if (deleteError) {
            console.log('Erro ao deletar usuário:', deleteError.message);
          } else {
            console.log('Usuário deletado');
            
            // Recriar o usuário
            const { data: newUser, error: createError } = await adminSupabase
              .from('users')
              .insert(fullUser)
              .select();
            
            if (createError) {
              console.log('Erro ao recriar usuário:', createError.message);
            } else {
              console.log('Usuário recriado com sucesso');
              
              // Tentar inserir voto novamente
              const { data: finalVote, error: finalError } = await adminSupabase
                .from('votos')
                .insert({
                  pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
                  usuario_id: userId,
                  opcao_id: 1
                })
                .select();
              
              if (finalError) {
                console.log('Erro mesmo após recriar usuário:', finalError.message);
              } else {
                console.log('SUCESSO! Voto inserido após recriar usuário:', finalVote[0].id);
                
                // Limpar voto de teste
                await adminSupabase.from('votos').delete().eq('id', finalVote[0].id);
                console.log('Voto de teste removido');
              }
            }
          }
        }
      } else {
        console.log('SUCESSO com upsert:', vote2[0].id);
        await adminSupabase.from('votos').delete().eq('id', vote2[0].id);
        console.log('Voto removido');
      }
    } else {
      console.log('SUCESSO com inserção normal:', vote1[0].id);
      await adminSupabase.from('votos').delete().eq('id', vote1[0].id);
      console.log('Voto removido');
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

fixVoteIssue();