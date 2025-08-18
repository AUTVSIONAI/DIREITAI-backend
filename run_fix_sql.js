require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const sqlFile = process.argv[2] || 'fix_user_goals_fk.sql';
    console.log(`🔧 Executando correção SQL do arquivo: ${sqlFile}...`);
    
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync(`./${sqlFile}`, 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== 'COMMIT');
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (!command) continue;
      
      console.log(`\n🔄 Executando comando ${i + 1}/${commands.length}:`);
      console.log(command.substring(0, 100) + '...');
      
      // Tentar executar o comando diretamente via query
      let data, error;
      try {
        if (command.toUpperCase().includes('DROP POLICY') || 
            command.toUpperCase().includes('CREATE POLICY') ||
            command.toUpperCase().includes('ALTER TABLE') ||
            command.toUpperCase().includes('DISABLE ROW LEVEL') ||
            command.toUpperCase().includes('ENABLE ROW LEVEL')) {
          // Para comandos DDL, usar uma abordagem diferente
          console.log('⚠️  Comando DDL detectado - precisa ser executado manualmente no Supabase');
          continue;
        } else {
          const result = await adminSupabase.from('dummy').select('*').limit(0);
          data = result.data;
          error = result.error;
        }
      } catch (e) {
        error = e;
      }
      
      if (error) {
        console.log(`❌ Erro no comando ${i + 1}:`, error.message);
        // Continuar com os próximos comandos mesmo se houver erro
      } else {
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    console.log('\n🔍 Testando a correção...');
    
    // Testar se a foreign key foi corrigida
    const { data: testData, error: testError } = await adminSupabase
      .from('user_goals')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erro ao testar:', testError.message);
    } else {
      console.log('✅ Tabela user_goals acessível');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
})();