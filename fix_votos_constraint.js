const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Investigando constraint da tabela votos...');
    
    // Verificar a constraint específica
    const constraintQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        ccu.table_schema AS foreign_table_schema
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'votos'
        AND tc.table_schema = 'public';
    `;
    
    const { data: constraints, error: constraintError } = await adminSupabase.rpc('exec_sql', {
      query: constraintQuery
    });
    
    if (constraintError) {
      console.log('❌ Erro ao verificar constraints:', constraintError.message);
    } else {
      console.log('📊 Constraints da tabela votos:');
      console.log(JSON.stringify(constraints, null, 2));
    }
    
    // Verificar se o usuário existe na tabela que a constraint está referenciando
    const { data: publicUsers, error: publicError } = await adminSupabase
      .from('users')
      .select('id, email, auth_id')
      .eq('id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    console.log('\n📊 Usuário na tabela public.users:');
    if (publicError) {
      console.log('❌ Erro:', publicError.message);
    } else {
      console.log('✅ Encontrado:', publicUsers);
    }
    
    // Tentar verificar se existe outra tabela users
    const tablesQuery = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
      ORDER BY table_schema;
    `;
    
    const { data: usersTables, error: tablesError } = await adminSupabase.rpc('exec_sql', {
      query: tablesQuery
    });
    
    if (tablesError) {
      console.log('❌ Erro ao verificar tabelas users:', tablesError.message);
    } else {
      console.log('\n📊 Tabelas users encontradas:');
      console.log(JSON.stringify(usersTables, null, 2));
    }
    
    // Se a constraint está referenciando auth.users, vamos corrigi-la
    console.log('\n🔧 Tentando corrigir a constraint...');
    
    // Primeiro, dropar a constraint existente
    const dropConstraintQuery = `
      ALTER TABLE public.votos 
      DROP CONSTRAINT IF EXISTS votos_usuario_id_fkey;
    `;
    
    const { error: dropError } = await adminSupabase.rpc('exec_sql', {
      query: dropConstraintQuery
    });
    
    if (dropError) {
      console.log('❌ Erro ao dropar constraint:', dropError.message);
    } else {
      console.log('✅ Constraint antiga removida!');
    }
    
    // Criar nova constraint referenciando public.users
    const addConstraintQuery = `
      ALTER TABLE public.votos 
      ADD CONSTRAINT votos_usuario_id_fkey 
      FOREIGN KEY (usuario_id) 
      REFERENCES public.users(id) 
      ON DELETE CASCADE;
    `;
    
    const { error: addError } = await adminSupabase.rpc('exec_sql', {
      query: addConstraintQuery
    });
    
    if (addError) {
      console.log('❌ Erro ao adicionar nova constraint:', addError.message);
    } else {
      console.log('✅ Nova constraint criada referenciando public.users!');
    }
    
    // Testar inserção de voto novamente
    console.log('\n🗳️ Testando inserção de voto após correção...');
    
    // Buscar uma pesquisa para testar
    const { data: survey, error: surveyError } = await adminSupabase
      .from('pesquisas')
      .select('*')
      .limit(1)
      .single();
    
    if (surveyError || !survey) {
      console.log('❌ Nenhuma pesquisa encontrada para teste:', surveyError?.message);
      return;
    }
    
    const option = survey.opcoes[0];
    
    // Deletar voto existente se houver
    await adminSupabase
      .from('votos')
      .delete()
      .eq('pesquisa_id', survey.id)
      .eq('usuario_id', 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6');
    
    // Tentar inserir voto
    const { data: voteResult, error: voteError } = await adminSupabase
      .from('votos')
      .insert({
        pesquisa_id: survey.id,
        usuario_id: 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6',
        opcao_id: option.id,
        comentario: 'Teste após correção da constraint',
        user_ip: '127.0.0.1',
        user_agent: 'Test Agent'
      })
      .select()
      .single();
    
    if (voteError) {
      console.log('❌ Ainda há erro ao inserir voto:', voteError.message);
      console.log('❌ Detalhes:', JSON.stringify(voteError, null, 2));
    } else {
      console.log('✅ Voto inserido com sucesso após correção!');
      console.log('📊 Dados do voto:', voteResult);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();