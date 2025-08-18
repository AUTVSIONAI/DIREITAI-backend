const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixForeignKey() {
  try {
    console.log('=== TENTATIVA DE CORREÇÃO DA FOREIGN KEY ===\n');
    
    // Tentar inserir voto usando o cliente admin com bypass de RLS
    console.log('1. Tentando inserir voto com bypass de RLS...');
    
    // Primeiro, vamos tentar desabilitar RLS temporariamente para este usuário
    const { data: voteData, error: voteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
        usuario_id: 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6',
        opcao_id: 1,
        comentario: 'Teste de correção',
        user_ip: '127.0.0.1',
        user_agent: 'Test Agent'
      })
      .select();
    
    if (voteError) {
      console.log('Erro mesmo com cliente admin:', voteError);
      
      // Vamos tentar uma abordagem diferente: verificar se o problema é com o UUID
      console.log('\n2. Verificando se o problema é com o formato do UUID...');
      
      // Tentar criar um novo usuário com UUID válido
      const crypto = require('crypto');
      const newUserId = crypto.randomUUID();
      const newAuthId = crypto.randomUUID();
      
      console.log('Criando usuário com UUID válido:', newUserId);
      
      const { data: newUser, error: newUserError } = await adminSupabase
        .from('users')
        .insert({
          id: newUserId,
          auth_id: newAuthId,
          email: 'test-uuid@test.com',
          full_name: 'Test UUID User',
          role: 'user'
        })
        .select();
      
      if (newUserError) {
        console.log('Erro ao criar usuário com UUID:', newUserError);
      } else {
        console.log('Usuário criado com sucesso:', newUser[0].id);
        
        // Tentar inserir voto com este usuário
        const { data: newVoteData, error: newVoteError } = await adminSupabase
          .from('votos')
          .insert({
            pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
            usuario_id: newUserId,
            opcao_id: 1
          })
          .select();
        
        if (newVoteError) {
          console.log('Erro ao inserir voto com novo usuário:', newVoteError);
        } else {
          console.log('SUCESSO! Voto inserido com novo usuário:', newVoteData[0].id);
          
          // Limpar dados de teste
          await adminSupabase.from('votos').delete().eq('id', newVoteData[0].id);
          console.log('Voto de teste removido');
        }
        
        // Remover usuário de teste
        await adminSupabase.from('users').delete().eq('id', newUserId);
        console.log('Usuário de teste removido');
      }
      
    } else {
      console.log('SUCESSO! Voto inserido:', voteData[0].id);
      
      // Remover voto de teste
      await adminSupabase.from('votos').delete().eq('id', voteData[0].id);
      console.log('Voto de teste removido');
    }
    
    // Verificar se há algum problema específico com o usuário atual
    console.log('\n3. Analisando usuário atual...');
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, created_at, updated_at')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    if (userData && userData[0]) {
      console.log('Data de criação do usuário:', userData[0].created_at);
      console.log('Última atualização:', userData[0].updated_at);
      
      // Verificar se há votos existentes para este usuário
      const { data: existingVotes, error: votesError } = await adminSupabase
        .from('votos')
        .select('id, created_at')
        .eq('usuario_id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
      
      if (votesError) {
        console.log('Erro ao buscar votos existentes:', votesError);
      } else {
        console.log('Votos existentes para este usuário:', existingVotes.length);
        if (existingVotes.length > 0) {
          console.log('Primeiro voto:', existingVotes[0]);
        }
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

fixForeignKey();