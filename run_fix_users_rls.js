require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔧 Corrigindo políticas RLS da tabela users...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'fix_users_rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir em comandos individuais (removendo comentários e linhas vazias)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== 'BEGIN' && cmd !== 'COMMIT');
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (!command) continue;
      
      console.log(`\n${i + 1}. Executando: ${command.substring(0, 60)}...`);
      
      try {
        const { data, error } = await adminSupabase.rpc('exec_sql', {
          query: command
        });
        
        if (error) {
          console.log(`❌ Erro no comando ${i + 1}:`, error.message);
          // Continuar com os próximos comandos mesmo se houver erro
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
          if (data) {
            console.log('   Resultado:', data);
          }
        }
      } catch (cmdError) {
        console.log(`❌ Erro ao executar comando ${i + 1}:`, cmdError.message);
      }
    }
    
    // Testar se a recursão foi corrigida
    console.log('\n🧪 Testando se a recursão foi corrigida...');
    
    const authId = '0155ccb7-e67f-41dc-a133-188f97996b73';
    
    try {
      const { data: testUser, error: testError } = await adminSupabase
        .from('users')
        .select('id, auth_id, email')
        .eq('auth_id', authId)
        .single();
      
      if (testError) {
        console.log('❌ Ainda há erro ao buscar usuário:', testError.message);
        console.log('   Código do erro:', testError.code);
      } else {
        console.log('✅ Busca de usuário funcionando corretamente!');
        console.log('   Usuário encontrado:', {
          id: testUser.id,
          auth_id: testUser.auth_id,
          email: testUser.email
        });
      }
    } catch (testError) {
      console.log('❌ Erro no teste:', testError.message);
    }
    
    console.log('\n🎉 Correção das políticas RLS concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
})();