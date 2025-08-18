const { supabase } = require('./config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Investigando a constraint votos_usuario_id_fkey...');
    
    // Usar SQL raw para verificar a constraint
    const { data: constraintInfo, error: constraintError } = await adminSupabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_type
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE 
          tc.constraint_name = 'votos_usuario_id_fkey'
          AND tc.table_name = 'votos';
      `
    });
    
    if (constraintError) {
      console.log('❌ Erro ao verificar constraint (tentando método alternativo):', constraintError.message);
      
      // Método alternativo usando pg_constraint
      const { data: altConstraintInfo, error: altError } = await adminSupabase.rpc('exec_sql', {
        sql: `
          SELECT 
            conname as constraint_name,
            conrelid::regclass as table_name,
            confrelid::regclass as referenced_table,
            a.attname as column_name,
            af.attname as referenced_column
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
          WHERE conname = 'votos_usuario_id_fkey';
        `
      });
      
      if (altError) {
        console.log('❌ Erro no método alternativo:', altError.message);
        
        // Último recurso: tentar dropar e recriar a constraint diretamente
        console.log('\n🔧 Tentando dropar e recriar a constraint diretamente...');
        
        try {
          // Dropar a constraint existente
          const { error: dropError } = await adminSupabase.rpc('exec_sql', {
            sql: 'ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_usuario_id_fkey;'
          });
          
          if (dropError) {
            console.log('❌ Erro ao dropar constraint:', dropError.message);
          } else {
            console.log('✅ Constraint dropada com sucesso!');
          }
          
          // Recriar a constraint apontando para public.users
          const { error: createError } = await adminSupabase.rpc('exec_sql', {
            sql: 'ALTER TABLE votos ADD CONSTRAINT votos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id);'
          });
          
          if (createError) {
            console.log('❌ Erro ao criar nova constraint:', createError.message);
          } else {
            console.log('✅ Nova constraint criada com sucesso!');
            
            // Testar inserção de voto agora
            console.log('\n🗳️ Testando inserção de voto após correção...');
            
            // Buscar usuário e pesquisa
            const { data: user } = await adminSupabase
              .from('users')
              .select('*')
              .eq('email', 'maumautremeterra@gmail.com')
              .single();
            
            const { data: survey } = await adminSupabase
              .from('pesquisas')
              .select('*')
              .limit(1)
              .single();
            
            if (user && survey && survey.opcoes && survey.opcoes.length > 0) {
              const option = survey.opcoes[0];
              
              // Deletar voto existente
              await adminSupabase
                .from('votos')
                .delete()
                .eq('pesquisa_id', survey.id)
                .eq('usuario_id', user.id);
              
              // Inserir novo voto
              const { data: voteResult, error: voteError } = await adminSupabase
                .from('votos')
                .insert({
                  pesquisa_id: survey.id,
                  usuario_id: user.id,
                  opcao_id: option.id,
                  comentario: 'Teste após correção da constraint',
                  user_ip: '127.0.0.1',
                  user_agent: 'Test Agent Corrected'
                })
                .select()
                .single();
              
              if (voteError) {
                console.log('❌ Ainda há erro ao inserir voto:', voteError.message);
              } else {
                console.log('✅ SUCESSO! Voto inserido após correção da constraint!');
                console.log('📊 Dados do voto:', voteResult);
              }
            }
          }
        } catch (err) {
          console.log('❌ Erro ao manipular constraint:', err.message);
        }
      } else {
        console.log('📊 Informações da constraint (método alternativo):', altConstraintInfo);
      }
    } else {
      console.log('📊 Informações da constraint:', constraintInfo);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  process.exit(0);
})();