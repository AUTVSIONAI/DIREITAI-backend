const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Buscar gastos de um deputado federal
 */
async function fetchDeputadoFederalExpenses(externalId, year = new Date().getFullYear()) {
  try {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${externalId}/despesas?ano=${year}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`⚠️ Erro ${response.status} ao buscar gastos do deputado ${externalId}`);
      return [];
    }
    
    const data = await response.json();
    return data.dados || [];
  } catch (error) {
    console.error(`Erro ao buscar gastos do deputado ${externalId}:`, error.message);
    return [];
  }
}

/**
 * Buscar gastos de um senador
 */
async function fetchSenadorExpenses(externalId, year = new Date().getFullYear()) {
  try {
    // Tentar API do Codante primeiro
    let url = `https://apis.codante.io/senator-expenses/senators/${externalId}/expenses?year=${year}`;
    let response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    
    // Se falhar, tentar API alternativa do Senado
    console.log(`⚠️ API Codante falhou para senador ${externalId}, tentando API oficial...`);
    url = `https://www12.senado.leg.br/dados-abertos/senador/${externalId}/gastos/${year}`;
    response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return data.gastos || [];
    }
    
    console.log(`⚠️ Ambas APIs falharam para senador ${externalId}`);
    return [];
  } catch (error) {
    console.error(`Erro ao buscar gastos do senador ${externalId}:`, error.message);
    return [];
  }
}

/**
 * Buscar dados de deputados estaduais (simulação com dados reais quando disponível)
 */
async function fetchDeputadoEstadualData(state) {
  try {
    // Para SP, podemos usar a API da ALESP
    if (state === 'SP') {
      const url = 'https://www.al.sp.gov.br/repositorio/deputados/deputados.json';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return data.deputados || [];
      }
    }
    
    // Para outros estados, retornar dados simulados por enquanto
    console.log(`⚠️ API não disponível para deputados estaduais de ${state}, usando dados simulados`);
    return [];
  } catch (error) {
    console.error(`Erro ao buscar deputados estaduais de ${state}:`, error.message);
    return [];
  }
}

/**
 * Buscar equipe de gabinete de um deputado federal
 */
async function fetchDeputadoStaff(externalId) {
  try {
    // Usar a função de scraping do externalAPIs.js
    const ExternalAPIs = require('../services/externalAPIs');
    const staffData = await ExternalAPIs.fetchDeputadoStaff(externalId);
    console.log(`✅ Dados de equipe obtidos para deputado ${externalId}: ${staffData.length} funcionários`);
    return staffData;
  } catch (error) {
    console.error(`Erro ao buscar equipe do deputado ${externalId}:`, error.message);
    return [];
  }
}

/**
 * Buscar equipe de gabinete de um senador
 */
async function fetchSenadorStaff(externalId) {
  try {
    // Usar a função de scraping do externalAPIs.js
    const ExternalAPIs = require('../services/externalAPIs');
    const staffData = await ExternalAPIs.fetchSenadorStaff(externalId);
    console.log(`✅ Dados de equipe obtidos para senador ${externalId}: ${staffData.length} funcionários`);
    return staffData;
  } catch (error) {
    console.error(`Erro ao buscar equipe do senador ${externalId}:`, error.message);
    return [];
  }
}

/**
 * Calcular resumo de gastos
 */
function calculateExpensesSummary(expenses, politicianType = 'deputado') {
  if (!expenses || expenses.length === 0) {
    return {
      total: 0,
      monthly_average: 0,
      categories: {},
      count: 0,
      last_updated: new Date().toISOString()
    };
  }
  
  const total = expenses.reduce((sum, expense) => {
    let value = 0;
    
    if (politicianType === 'deputado') {
      value = parseFloat(expense.valorLiquido || expense.valorDocumento || 0);
    } else if (politicianType === 'senador') {
      value = parseFloat(expense.valor || expense.value || 0);
    }
    
    return sum + value;
  }, 0);
  
  const categories = {};
  expenses.forEach(expense => {
    let category = 'Outros';
    
    if (politicianType === 'deputado') {
      category = expense.tipoDespesa || 'Outros';
    } else if (politicianType === 'senador') {
      category = expense.categoria || expense.category || 'Outros';
    }
    
    if (!categories[category]) {
      categories[category] = 0;
    }
    
    let value = 0;
    if (politicianType === 'deputado') {
      value = parseFloat(expense.valorLiquido || expense.valorDocumento || 0);
    } else if (politicianType === 'senador') {
      value = parseFloat(expense.valor || expense.value || 0);
    }
    
    categories[category] += value;
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
 * Calcular resumo da equipe
 */
function calculateStaffSummary(staff) {
  if (!staff || staff.length === 0) {
    return {
      total_members: 0,
      positions: {},
      last_updated: new Date().toISOString()
    };
  }
  
  const positions = {};
  staff.forEach(member => {
    const position = member.cargo || member.funcao || 'Não especificado';
    positions[position] = (positions[position] || 0) + 1;
  });
  
  return {
    total_members: staff.length,
    positions,
    members: staff.map(member => ({
      name: member.nome || member.name,
      position: member.cargo || member.funcao || 'Não especificado',
      salary: member.remuneracao || member.salario || null
    })),
    last_updated: new Date().toISOString()
  };
}

/**
 * Atualizar dados completos de um político
 */
async function updatePoliticianCompleteData(politician) {
  try {
    console.log(`Atualizando dados de ${politician.name} (${politician.position})...`);
    
    let expenses = [];
    let staff = [];
    let politicianType = 'deputado';
    
    // Buscar dados baseado no tipo de político
    if ((politician.position === 'Deputado Federal' || politician.position === 'deputado') && politician.external_id) {
      expenses = await fetchDeputadoFederalExpenses(politician.external_id);
      staff = await fetchDeputadoStaff(politician.external_id);
      politicianType = 'deputado';
    } else if ((politician.position === 'Senador' || politician.position === 'senador') && politician.external_id) {
      expenses = await fetchSenadorExpenses(politician.external_id);
      staff = await fetchSenadorStaff(politician.external_id);
      politicianType = 'senador';
    } else if (politician.position === 'Deputado Estadual') {
      // Para deputados estaduais, implementar busca específica por estado
      expenses = []; // Por enquanto vazio, implementar APIs estaduais
      staff = [];
    } else if (politician.position === 'Prefeito' || politician.position === 'Vereador') {
      // Para prefeitos e vereadores, usar dados do TSE quando disponível
      expenses = []; // Por enquanto vazio
      staff = [];
    }
    
    // Calcular resumos
    const expensesSummary = calculateExpensesSummary(expenses, politicianType);
    const staffSummary = calculateStaffSummary(staff);
    
    // Atualizar no banco de dados
    const { error } = await supabase
      .from('politicians')
      .update({
        expenses: expensesSummary,
        staff: staffSummary,
        updated_at: new Date().toISOString()
      })
      .eq('id', politician.id);
    
    if (error) {
      console.error(`❌ Erro ao atualizar ${politician.name}:`, error);
      return false;
    }
    
    console.log(`✅ Dados atualizados para ${politician.name}: R$ ${expensesSummary.total.toFixed(2)} (${staffSummary.total_members} funcionários)`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao processar ${politician.name}:`, error);
    return false;
  }
}

/**
 * Atualizar dados de todos os políticos
 */
async function updateAllPoliticiansData() {
  try {
    console.log('🚀 Iniciando atualização completa de dados dos políticos...');
    
    // Buscar todos os políticos
    const { data: politicians, error } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source, state')
      .in('position', [
        'deputado', 'senador', 'Deputado Federal', 'Senador',
        'Deputado Estadual', 'Prefeito', 'Vereador'
      ]);
    
    if (error) {
      console.error('❌ Erro ao buscar políticos:', error);
      return;
    }
    
    console.log(`📊 Encontrados ${politicians.length} políticos para atualizar`);
    
    // Separar por tipo
    const federais = politicians.filter(p => 
      ['deputado', 'senador', 'Deputado Federal', 'Senador'].includes(p.position) && p.external_id
    );
    const estaduais = politicians.filter(p => p.position === 'Deputado Estadual');
    const municipais = politicians.filter(p => ['Prefeito', 'Vereador'].includes(p.position));
    
    console.log(`📈 Federais com external_id: ${federais.length}`);
    console.log(`📈 Estaduais: ${estaduais.length}`);
    console.log(`📈 Municipais: ${municipais.length}`);
    
    let success = 0;
    let errors = 0;
    
    // Processar federais primeiro (têm APIs disponíveis)
    console.log('\n🏛️ Processando políticos federais...');
    const batchSize = 3; // Reduzir para evitar rate limiting
    
    for (let i = 0; i < federais.length; i += batchSize) {
      const batch = federais.slice(i, i + batchSize);
      
      const promises = batch.map(politician => updatePoliticianCompleteData(politician));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result) {
          success++;
        } else {
          errors++;
        }
      });
      
      // Aguardar entre lotes para não sobrecarregar as APIs
      if (i + batchSize < federais.length) {
        console.log(`📊 Processados ${i + batchSize}/${federais.length} federais. Aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Processar estaduais e municipais (dados simulados por enquanto)
    console.log('\n🏢 Processando políticos estaduais e municipais...');
    const locais = [...estaduais, ...municipais];
    
    for (const politician of locais) {
      const result = await updatePoliticianCompleteData(politician);
      if (result) {
        success++;
      } else {
        errors++;
      }
    }
    
    console.log(`\n✅ Atualização concluída:`);
    console.log(`   - ✅ Sucessos: ${success}`);
    console.log(`   - ❌ Erros: ${errors}`);
    console.log(`   - 📊 Total: ${politicians.length}`);
    
  } catch (error) {
    console.error('❌ Erro na atualização geral:', error);
  }
}

/**
 * Atualizar dados de um político específico
 */
async function updateSpecificPoliticianData(politicianId) {
  try {
    console.log(`🔍 Buscando político com ID: ${politicianId}`);
    
    const { data: politician, error } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source, state')
      .eq('id', politicianId)
      .single();
    
    if (error || !politician) {
      console.error('❌ Político não encontrado');
      return;
    }
    
    const result = await updatePoliticianCompleteData(politician);
    
    if (result) {
      console.log('✅ Atualização específica concluída com sucesso');
    } else {
      console.log('❌ Falha na atualização específica');
    }
    
  } catch (error) {
    console.error('❌ Erro na atualização específica:', error);
  }
}

// Execução do script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === 'specific' && args[1]) {
    console.log('🎯 Modo específico ativado');
    updateSpecificPoliticianData(args[1]);
  } else {
    console.log('🌐 Modo completo ativado');
    updateAllPoliticiansData();
  }
}

module.exports = {
  updateAllPoliticiansData,
  updateSpecificPoliticianData,
  updatePoliticianCompleteData
};