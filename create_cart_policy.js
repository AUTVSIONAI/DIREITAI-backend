const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase com service role key para operações administrativas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCartItemsPolicies() {
  try {
    console.log('🔐 Configurando políticas RLS para cart_items...');
    
    // Primeiro, verificar se a tabela existe
    const { data: tableExists, error: tableError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erro ao verificar tabela cart_items:', tableError);
      return;
    }
    
    console.log('✅ Tabela cart_items encontrada');
    
    // Executar SQL diretamente usando a conexão administrativa
    const policies = [
      `
      -- Habilitar RLS na tabela cart_items
      ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
      `,
      `
      -- Política para permitir usuários inserir seus próprios itens
      CREATE POLICY "Users can insert their own cart items" ON cart_items
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
      `,
      `
      -- Política para permitir usuários visualizar seus próprios itens
      CREATE POLICY "Users can view their own cart items" ON cart_items
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
      `,
      `
      -- Política para permitir usuários atualizar seus próprios itens
      CREATE POLICY "Users can update their own cart items" ON cart_items
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
      `,
      `
      -- Política para permitir usuários deletar seus próprios itens
      CREATE POLICY "Users can delete their own cart items" ON cart_items
      FOR DELETE TO authenticated
      USING (auth.uid()::text = user_id);
      `
    ];
    
    console.log('📝 Criando políticas RLS...');
    
    for (const [index, policy] of policies.entries()) {
      try {
        // Usar uma query SQL direta
        const { data, error } = await supabase.rpc('exec_sql', { sql: policy.trim() });
        if (error) {
          if (error.message.includes('already exists') || error.message.includes('already enabled')) {
            console.log(`⚠️  Política ${index + 1} já existe`);
          } else {
            console.error(`❌ Erro na política ${index + 1}:`, error.message);
          }
        } else {
          console.log(`✅ Política ${index + 1} criada com sucesso`);
        }
      } catch (err) {
        console.log(`⚠️  Erro na política ${index + 1} (pode já existir):`, err.message);
      }
    }
    
    // Testar inserção
    console.log('🧪 Testando inserção com políticas configuradas...');
    
    // Primeiro, vamos verificar se temos um usuário de teste
    const testUserId = '4803945b-5e3a-4077-90d1-54c999f46dcd'; // ID do usuário de teste
    
    const { data: testInsert, error: testError } = await supabase
      .from('cart_items')
      .insert({
        user_id: testUserId,
        product_id: 1, // Assumindo que existe um produto com ID 1
        quantity: 1,
        price: 10.00
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Erro no teste de inserção:', testError);
    } else {
      console.log('✅ Teste de inserção bem-sucedido!');
      
      // Limpar item de teste
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', testInsert.id);
      
      console.log('🧹 Item de teste removido');
    }
    
    console.log('🎉 Configuração das políticas RLS para cart_items concluída!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar configuração
setupCartItemsPolicies();