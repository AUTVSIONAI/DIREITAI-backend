const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugForeignKey() {
  try {
    console.log('=== DEBUG FOREIGN KEY ISSUE ===\n');
    
    // 1. Verificar se o usuário atual existe
    console.log('1. Verificando usuário atual...');
    const { data: currentUser, error: currentUserError } = await adminSupabase
      .from('users')
      .select('id, email, auth_id')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    console.log('Usuário atual:', currentUser);
    if (currentUserError) console.log('Erro:', currentUserError);
    
    // 2. Criar um usuário temporário
    console.log('\n2. Criando usuário temporário...');
    const tempUserId = 'temp-user-' + Date.now();
    const { data: tempUser, error: tempUserError } = await adminSupabase
      .from('users')
      .insert({
        id: tempUserId,
        email: 'temp@test.com',
        auth_id: 'temp-auth-' + Date.now(),
        full_name: 'Temp User',
        role: 'user'
      })
      .select();
    
    if (tempUserError) {
      console.log('Erro ao criar usuário temporário:', tempUserError);
    } else {
      console.log('Usuário temporário criado:', tempUser[0].id);
      
      // 3. Tentar inserir voto com usuário temporário
      console.log('\n3. Tentando inserir voto com usuário temporário...');
      const { data: voteData, error: voteError } = await adminSupabase
        .from('votos')
        .insert({
          pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
          usuario_id: tempUserId,
          opcao_id: 1
        })
        .select();
      
      if (voteError) {
        console.log('Erro ao inserir voto com usuário temporário:', voteError);
      } else {
        console.log('Voto inserido com sucesso:', voteData[0].id);
        
        // Remover o voto
        await adminSupabase.from('votos').delete().eq('id', voteData[0].id);
        console.log('Voto removido');
      }
      
      // 4. Remover usuário temporário
      await adminSupabase.from('users').delete().eq('id', tempUserId);
      console.log('Usuário temporário removido');
    }
    
    // 5. Tentar inserir voto com usuário atual novamente
    console.log('\n4. Tentando inserir voto com usuário atual...');
    const { data: currentVoteData, error: currentVoteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
        usuario_id: 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6',
        opcao_id: 1
      })
      .select();
    
    if (currentVoteError) {
      console.log('Erro ao inserir voto com usuário atual:', currentVoteError);
      
      // 6. Verificar se há diferença nos dados do usuário
      console.log('\n5. Comparando dados do usuário...');
      const { data: userCheck, error: userCheckError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
      
      console.log('Dados completos do usuário:', JSON.stringify(userCheck[0], null, 2));
      
    } else {
      console.log('Voto inserido com sucesso:', currentVoteData[0].id);
      await adminSupabase.from('votos').delete().eq('id', currentVoteData[0].id);
      console.log('Voto removido');
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

debugForeignKey();