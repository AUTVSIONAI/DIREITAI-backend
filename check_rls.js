const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  try {
    console.log('Verificando se o usuário existe na tabela users...');
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    console.log('Usuário encontrado:', userData);
    if (userError) console.log('Erro ao buscar usuário:', userError);
    
    // Tentar inserir um usuário teste para verificar se a tabela aceita inserções
    console.log('\nTentando inserir usuário teste...');
    const testUserId = 'test-' + Date.now();
    const { data: insertData, error: insertError } = await adminSupabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@test.com',
        auth_id: 'test-auth-' + Date.now(),
        full_name: 'Test User',
        role: 'user'
      })
      .select();
    
    if (insertError) {
      console.log('Erro ao inserir usuário teste:', insertError);
    } else {
      console.log('Usuário teste inserido:', insertData);
      
      // Agora tentar inserir um voto com este usuário
      console.log('\nTentando inserir voto com usuário teste...');
      const { data: voteData, error: voteError } = await adminSupabase
        .from('votos')
        .insert({
          pesquisa_id: 'f631e427-4944-46f6-b1cc-b58a4396a205',
          usuario_id: testUserId,
          opcao_id: 1
        })
        .select();
      
      if (voteError) {
        console.log('Erro ao inserir voto com usuário teste:', voteError);
      } else {
        console.log('Voto inserido com sucesso:', voteData);
        // Remover o voto
        await adminSupabase.from('votos').delete().eq('id', voteData[0].id);
        console.log('Voto removido');
      }
      
      // Remover o usuário teste
      await adminSupabase.from('users').delete().eq('id', testUserId);
      console.log('Usuário teste removido');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

checkRLS();