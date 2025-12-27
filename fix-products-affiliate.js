const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProducts() {
  console.log('🔄 Iniciando atualização dos produtos para afiliados...');

  try {
    // 1. Buscar todos os produtos
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, affiliate_enabled, affiliate_rate_percent');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📦 Encontrados ${products.length} produtos.`);

    // 2. Atualizar produtos que não têm affiliate_enabled ou affiliate_rate_percent
    const updates = products.map(async (product) => {
      // Se já estiver habilitado e com taxa, não mexe
      if (product.affiliate_enabled && product.affiliate_rate_percent > 0) {
        return null;
      }

      console.log(`✏️ Atualizando produto: ${product.name} (${product.id})`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          affiliate_enabled: true,
          affiliate_rate_percent: 10 // 10% de comissão padrão
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${product.name}:`, updateError.message);
      } else {
        console.log(`✅ Produto ${product.name} atualizado com sucesso!`);
      }
    });

    await Promise.all(updates);

    console.log('🎉 Atualização concluída!');
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
  }
}

fixProducts();
