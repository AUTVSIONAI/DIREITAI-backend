const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Buscar gastos de um deputado federal
 */
async function fetchDeputadoExpenses(externalId, year = new Date().getFullYear()) {
  try {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${externalId}/despesas?ano=${year}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API da Câmara: ${response.status}`);
    }
    
    const data = await response.json();
    return data.dados || [];
  } catch (error) {
    console.error(`Erro ao buscar gastos do deputado ${externalId}:`, error);
    return [];
  }
}

/**
 * Buscar gastos de um senador
 */
async function fetchSenadorExpenses(externalId, year = new Date().getFullYear()) {
  try {
    const url = `https://apis.codante.io/senator-expenses/senators/${externalId}/expenses?year=${year}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API de senadores: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Erro ao buscar gastos do senador ${externalId}:`, error);
    return [];
  }
}

/**
 * Calcular resumo de gastos
 */
function calculateExpensesSummary(expenses) {
  if (!expenses || expenses.length === 0) {
    return {
      total: 0,
      monthly_average: 0,
      categories: {},
      last_updated: new Date().toISOString()
    };
  }
  
  const total = expenses.reduce((sum, expense) => {
    const value = parseFloat(expense.valorLiquido || expense.value || 0);
    return sum + value;
  }, 0);
  
  const categories = {};
  expenses.forEach(expense => {
    const category = expense.tipoDespesa || expense.category || 'Outros';
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += parseFloat(expense.valorLiquido || expense.value || 0);
  });
  
  return {
    total,
    monthly_average: total / 12,
    categories,
    count: expenses.length,
    last_updated: new Date().toISOString()
  };
}

/**
 * Atualizar gastos de um político
 */
async function updatePoliticianExpenses(politician) {
  try {
    console.log(`Atualizando gastos de ${politician.name} (${politician.position})...`);
    
    let expenses = [];
    
    // Buscar gastos baseado no tipo de político
    if ((politician.position === 'Deputado Federal' || politician.position === 'deputado') && politician.external_id) {
      expenses = await fetchDeputadoExpenses(politician.external_id);
    } else if ((politician.position === 'Senador' || politician.position === 'senador') && politician.external_id) {
      expenses = await fetchSenadorExpenses(politician.external_id);
    }
    
    // Calcular resumo
    const expensesSummary = calculateExpensesSummary(expenses);
    
    // Atualizar no banco de dados
    const { error } = await supabase
      .from('politicians')
      .update({
        expenses: expensesSummary,
        updated_at: new Date().toISOString()
      })
      .eq('id', politician.id);
    
    if (error) {
      console.error(`Erro ao atualizar gastos de ${politician.name}:`, error);
      return false;
    }
    
    console.log(`✅ Gastos atualizados para ${politician.name}: R$ ${expensesSummary.total.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error(`Erro ao processar ${politician.name}:`, error);
    return false;
  }
}

/**
 * Atualizar gastos de todos os políticos
 */
async function updateAllPoliticiansExpenses() {
  try {
    console.log('Iniciando atualização de gastos dos políticos...');
    
    // Buscar todos os políticos federais com external_id
    const { data: politicians, error } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source')
      .in('position', ['deputado', 'senador', 'Deputado Federal', 'Senador'])
      .not('external_id', 'is', null);
    
    if (error) {
      console.error('Erro ao buscar políticos:', error);
      return;
    }
    
    console.log(`Encontrados ${politicians.length} políticos para atualizar`);
    
    let success = 0;
    let errors = 0;
    
    // Processar em lotes para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < politicians.length; i += batchSize) {
      const batch = politicians.slice(i, i + batchSize);
      
      const promises = batch.map(politician => updatePoliticianExpenses(politician));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result) {
          success++;
        } else {
          errors++;
        }
      });
      
      // Aguardar um pouco entre lotes para não sobrecarregar as APIs
      if (i + batchSize < politicians.length) {
        console.log(`Processados ${i + batchSize}/${politicians.length}. Aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Atualização concluída:`);
    console.log(`   - Sucessos: ${success}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Total: ${politicians.length}`);
    
  } catch (error) {
    console.error('Erro na atualização geral:', error);
  }
}

/**
 * Atualizar gastos de um político específico
 */
async function updateSpecificPoliticianExpenses(politicianId) {
  try {
    const { data: politician, error } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source')
      .eq('id', politicianId)
      .single();
    
    if (error || !politician) {
      console.error('Político não encontrado:', error);
      return;
    }
    
    const result = await updatePoliticianExpenses(politician);
    
    if (result) {
      console.log(`✅ Gastos atualizados com sucesso para ${politician.name}`);
    } else {
      console.log(`❌ Erro ao atualizar gastos de ${politician.name}`);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar baseado nos argumentos da linha de comando
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === 'specific' && args[1]) {
    // Atualizar político específico
    updateSpecificPoliticianExpenses(args[1]);
  } else {
    // Atualizar todos os políticos
    updateAllPoliticiansExpenses();
  }
}

module.exports = {
  updateAllPoliticiansExpenses,
  updateSpecificPoliticianExpenses,
  updatePoliticianExpenses
};