const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Tentando corrigir constraint usando abordagem direta...');
    
    // Primeiro, vamos verificar se conseguimos acessar informações da constraint
    // usando uma query simples no information_schema
    try {
      const { data: schemaInfo, error: schemaError } = await adminSupabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('constraint_name', 'votos_usuario_id_fkey')
        .eq('table_name', 'votos');
      
      if (schemaError) {
        console.log('❌ Não conseguiu acessar information_schema:', schemaError.message);
      } else {
        console.log('📊 Informações da constraint:', schemaInfo);
      }
    } catch (err) {
      console.log('❌ Erro ao acessar schema:', err.message);
    }
    
    // Vamos tentar uma abordagem diferente: verificar se a constraint realmente existe
    // e qual tabela ela está referenciando através dos dados existentes
    console.log('\n🔍 Analisando dados existentes na tabela votos...');
    
    const { data: existingVotes, error: votesError } = await adminSupabase
      .from('votos')
      .select('usuario_id')
      .limit(10);
    
    if (votesError) {
      console.log('❌ Erro ao buscar votos existentes:', votesError.message);
    } else if (existingVotes && existingVotes.length > 0) {
      console.log(`📊 Encontrados ${existingVotes.length} votos existentes`);
      
      // Verificar se esses usuario_id existem na tabela public.users
      const uniqueUserIds = [...new Set(existingVotes.map(v => v.usuario_id))];
      console.log(`🔍 Verificando ${uniqueUserIds.length} IDs únicos de usuários...`);
      
      for (const userId of uniqueUserIds.slice(0, 5)) { // Verificar apenas os primeiros 5
        const { data: userInPublic, error: publicError } = await adminSupabase
          .from('users')
          .select('id, email')
          .eq('id', userId)
          .single();
        
        const { data: userInAuth, error: authError } = await adminSupabase
          .from('auth.users')
          .select('id, email')
          .eq('id', userId)
          .single();
        
        console.log(`\n👤 Usuário ID: ${userId}`);
        
        if (publicError) {
          console.log('  ❌ Não encontrado em public.users:', publicError.message);
        } else {
          console.log(`  ✅ Encontrado em public.users: ${userInPublic.email}`);
        }
        
        if (authError) {
          console.log('  ❌ Não encontrado em auth.users:', authError.message);
        } else {
          console.log(`  ✅ Encontrado em auth.users: ${userInAuth.email}`);
        }
      }
    } else {
      console.log('📊 Nenhum voto existente encontrado');
    }
    
    // Agora vamos tentar uma abordagem mais direta: usar o SQL através de uma função personalizada
    console.log('\n🔧 Tentando criar função temporária para executar SQL...');
    
    try {
      // Tentar criar uma função temporária que nos permita executar SQL
      const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION temp_exec_sql(query text)
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE query;
          RETURN 'SUCCESS';
        EXCEPTION
          WHEN OTHERS THEN
            RETURN SQLERRM;
        END;
        $$;
      `;
      
      // Tentar executar usando uma query direta
      const { data: createResult, error: createError } = await adminSupabase.rpc('temp_exec_sql', {
        query: createFunctionQuery
      });
      
      if (createError) {
        console.log('❌ Não conseguiu criar função temporária:', createError.message);
        
        // Última tentativa: usar uma abordagem mais simples
        console.log('\n🔧 Tentativa final: recriando a constraint usando DDL direto...');
        
        // Vamos tentar usar o método de query SQL direta do Supabase
        const dropConstraintSQL = 'ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_usuario_id_fkey';
        const addConstraintSQL = 'ALTER TABLE votos ADD CONSTRAINT votos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id)';
        
        console.log('🗑️ Tentando dropar constraint...');
        console.log('SQL:', dropConstraintSQL);
        
        console.log('➕ Tentando adicionar nova constraint...');
        console.log('SQL:', addConstraintSQL);
        
        console.log('\n⚠️ ATENÇÃO: Para executar estes comandos SQL, você precisará:');
        console.log('1. Acessar o painel do Supabase');
        console.log('2. Ir para SQL Editor');
        console.log('3. Executar os seguintes comandos:');
        console.log('');
        console.log('-- Dropar constraint existente');
        console.log(dropConstraintSQL + ';');
        console.log('');
        console.log('-- Adicionar nova constraint');
        console.log(addConstraintSQL + ';');
        console.log('');
        
      } else {
        console.log('✅ Função temporária criada:', createResult);
      }
    } catch (err) {
      console.log('❌ Erro na tentativa final:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();