const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFederalPoliticians() {
  try {
    console.log('Verificando políticos federais no banco...');
    
    // Buscar todos os políticos
    const { data: allPoliticians, error: allError } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source, is_active')
      .limit(20);
    
    if (allError) {
      console.error('Erro ao buscar todos os políticos:', allError);
      return;
    }
    
    console.log(`\nTotal de políticos (primeiros 20):`);
    allPoliticians.forEach(p => {
      console.log(`- ${p.name} (${p.position}) - Source: ${p.source} - External ID: ${p.external_id} - Active: ${p.is_active}`);
    });
    
    // Buscar políticos federais
    const { data: federalPoliticians, error: federalError } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source, is_active')
      .in('position', ['Deputado Federal', 'Senador']);
    
    if (federalError) {
      console.error('Erro ao buscar políticos federais:', federalError);
      return;
    }
    
    console.log(`\nPolíticos federais encontrados: ${federalPoliticians.length}`);
    federalPoliticians.forEach(p => {
      console.log(`- ${p.name} (${p.position}) - Source: ${p.source} - External ID: ${p.external_id} - Active: ${p.is_active}`);
    });
    
    // Buscar políticos federais ativos com external_id
    const { data: activeFederalPoliticians, error: activeError } = await supabase
      .from('politicians')
      .select('id, name, position, external_id, source, is_active')
      .in('position', ['Deputado Federal', 'Senador'])
      .not('external_id', 'is', null)
      .eq('is_active', true);
    
    if (activeError) {
      console.error('Erro ao buscar políticos federais ativos:', activeError);
      return;
    }
    
    console.log(`\nPolíticos federais ativos com external_id: ${activeFederalPoliticians.length}`);
    activeFederalPoliticians.forEach(p => {
      console.log(`- ${p.name} (${p.position}) - Source: ${p.source} - External ID: ${p.external_id}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkFederalPoliticians();