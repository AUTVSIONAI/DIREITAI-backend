const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * Buscar deputados estaduais de São Paulo (ALESP)
 */
router.get('/fetch/deputados-estaduais/sp', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // API da ALESP para deputados
    const response = await fetch('https://www.al.sp.gov.br/repositorio/deputados/deputados.json');
    
    if (!response.ok) {
      throw new Error(`Erro na API da ALESP: ${response.status}`);
    }
    
    const data = await response.json();
    const deputados = data.deputados || [];
    
    // Formatar dados para o padrão do sistema
    const formattedDeputados = deputados.map(dep => ({
      external_id: dep.IdDeputado || dep.id,
      name: dep.NomeDeputado || dep.nome,
      full_name: dep.NomeCompleto || dep.nome_completo,
      party: dep.Partido || dep.partido,
      position: 'Deputado Estadual',
      state: 'SP',
      level: 'estadual',
      photo_url: dep.UrlFoto || dep.foto,
      email: dep.Email || dep.email,
      phone: dep.Telefone || dep.telefone,
      office: dep.Gabinete || dep.gabinete,
      source: 'alesp'
    }));
    
    res.json({
      success: true,
      deputados: formattedDeputados,
      total: formattedDeputados.length,
      source: 'ALESP - Assembleia Legislativa de São Paulo'
    });
    
  } catch (error) {
    console.error('Erro ao buscar deputados estaduais de SP:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar deputados estaduais de SP',
      details: error.message 
    });
  }
});

/**
 * Buscar gastos de um deputado estadual de SP
 */
router.get('/expenses/deputado-estadual/sp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ano, mes } = req.query;
    const fetch = (await import('node-fetch')).default;
    
    // API da ALESP para gastos (se disponível)
    // Por enquanto, retornar dados simulados
    const simulatedExpenses = [
      {
        data: `${ano || new Date().getFullYear()}-${mes || '01'}-15`,
        descricao: 'Combustíveis e lubrificantes',
        valor: 2500.00,
        categoria: 'Transporte'
      },
      {
        data: `${ano || new Date().getFullYear()}-${mes || '01'}-20`,
        descricao: 'Material de escritório',
        valor: 800.00,
        categoria: 'Escritório'
      }
    ];
    
    res.json({
      success: true,
      expenses: simulatedExpenses,
      total: simulatedExpenses.length,
      message: 'Dados simulados - API de gastos da ALESP não disponível publicamente'
    });
    
  } catch (error) {
    console.error('Erro ao buscar gastos do deputado estadual:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar gastos do deputado estadual',
      details: error.message 
    });
  }
});

/**
 * Buscar prefeitos e vereadores de uma cidade (TSE)
 */
router.get('/fetch/municipais/:city/:state', async (req, res) => {
  try {
    const { city, state } = req.params;
    const fetch = (await import('node-fetch')).default;
    
    // Dados simulados de prefeitos e vereadores
    // Em uma implementação real, usaria APIs do TSE ou dados municipais
    const municipalPoliticians = [
      {
        external_id: `pref_${city}_001`,
        name: `João Silva`,
        full_name: `João da Silva Santos`,
        party: 'PSDB',
        position: 'Prefeito',
        city: city.toUpperCase(),
        state: state.toUpperCase(),
        level: 'municipal',
        mandate_start: '2021-01-01',
        mandate_end: '2024-12-31',
        source: 'tse'
      },
      {
        external_id: `ver_${city}_001`,
        name: `Maria Santos`,
        full_name: `Maria dos Santos Oliveira`,
        party: 'PT',
        position: 'Vereador',
        city: city.toUpperCase(),
        state: state.toUpperCase(),
        level: 'municipal',
        mandate_start: '2021-01-01',
        mandate_end: '2024-12-31',
        source: 'tse'
      },
      {
        external_id: `ver_${city}_002`,
        name: `Carlos Pereira`,
        full_name: `Carlos Pereira da Costa`,
        party: 'MDB',
        position: 'Vereador',
        city: city.toUpperCase(),
        state: state.toUpperCase(),
        level: 'municipal',
        mandate_start: '2021-01-01',
        mandate_end: '2024-12-31',
        source: 'tse'
      }
    ];
    
    res.json({
      success: true,
      politicians: municipalPoliticians,
      total: municipalPoliticians.length,
      city: city.toUpperCase(),
      state: state.toUpperCase(),
      message: 'Dados simulados - APIs municipais variam por cidade'
    });
    
  } catch (error) {
    console.error('Erro ao buscar políticos municipais:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar políticos municipais',
      details: error.message 
    });
  }
});

/**
 * Sincronizar deputados estaduais de SP com o banco
 */
router.post('/sync/deputados-estaduais/sp', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Buscar dados da ALESP
    const response = await fetch('https://www.al.sp.gov.br/repositorio/deputados/deputados.json');
    
    if (!response.ok) {
      throw new Error(`Erro na API da ALESP: ${response.status}`);
    }
    
    const data = await response.json();
    const deputados = data.deputados || [];
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const dep of deputados) {
      try {
        const politicianData = {
          name: dep.NomeDeputado || dep.nome,
          full_name: dep.NomeCompleto || dep.nome_completo,
          party: dep.Partido || dep.partido,
          position: 'Deputado Estadual',
          state: 'SP',
          level: 'estadual',
          photo_url: dep.UrlFoto || dep.foto,
          email: dep.Email || dep.email,
          phone: dep.Telefone || dep.telefone,
          office: dep.Gabinete || dep.gabinete,
          external_id: dep.IdDeputado || dep.id,
          source: 'alesp',
          is_active: true,
          status: 'approved'
        };
        
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('external_id', politicianData.external_id)
          .eq('source', 'alesp')
          .single();
        
        if (existing) {
          // Atualizar
          const { error } = await supabase
            .from('politicians')
            .update(politicianData)
            .eq('id', existing.id);
          
          if (error) throw error;
          updated++;
        } else {
          // Inserir
          const { error } = await supabase
            .from('politicians')
            .insert(politicianData);
          
          if (error) throw error;
          inserted++;
        }
        
      } catch (error) {
        console.error(`Erro ao processar deputado ${dep.NomeDeputado}:`, error);
        errors++;
      }
    }
    
    res.json({
      success: true,
      message: 'Sincronização de deputados estaduais de SP concluída',
      stats: {
        total_processed: deputados.length,
        inserted,
        updated,
        errors
      }
    });
    
  } catch (error) {
    console.error('Erro na sincronização de deputados estaduais:', error);
    res.status(500).json({ 
      error: 'Erro na sincronização de deputados estaduais',
      details: error.message 
    });
  }
});

/**
 * Sincronizar políticos municipais com o banco
 */
router.post('/sync/municipais/:city/:state', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { city, state } = req.params;
    
    // Dados simulados para demonstração
    const municipalPoliticians = [
      {
        name: `Prefeito de ${city}`,
        full_name: `João da Silva Santos`,
        party: 'PSDB',
        position: 'Prefeito',
        city: city.toUpperCase(),
        state: state.toUpperCase(),
        level: 'municipal',
        external_id: `pref_${city}_001`,
        source: 'tse',
        is_active: true,
        status: 'approved'
      },
      {
        name: `Vereador Maria Santos`,
        full_name: `Maria dos Santos Oliveira`,
        party: 'PT',
        position: 'Vereador',
        city: city.toUpperCase(),
        state: state.toUpperCase(),
        level: 'municipal',
        external_id: `ver_${city}_001`,
        source: 'tse',
        is_active: true,
        status: 'approved'
      }
    ];
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const politician of municipalPoliticians) {
      try {
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('external_id', politician.external_id)
          .eq('source', politician.source)
          .single();
        
        if (existing) {
          // Atualizar
          const { error } = await supabase
            .from('politicians')
            .update(politician)
            .eq('id', existing.id);
          
          if (error) throw error;
          updated++;
        } else {
          // Inserir
          const { error } = await supabase
            .from('politicians')
            .insert(politician);
          
          if (error) throw error;
          inserted++;
        }
        
      } catch (error) {
        console.error(`Erro ao processar político ${politician.name}:`, error);
        errors++;
      }
    }
    
    res.json({
      success: true,
      message: `Sincronização de políticos municipais de ${city}/${state} concluída`,
      stats: {
        total_processed: municipalPoliticians.length,
        inserted,
        updated,
        errors
      }
    });
    
  } catch (error) {
    console.error('Erro na sincronização de políticos municipais:', error);
    res.status(500).json({ 
      error: 'Erro na sincronização de políticos municipais',
      details: error.message 
    });
  }
});

/**
 * Atualizar dados de gastos e equipe para políticos locais
 */
router.put('/update-local-data/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do político
    const { data: politician, error: fetchError } = await supabase
      .from('politicians')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }
    
    // Simular dados de gastos e equipe para políticos locais
    let expenses = {
      total: 0,
      monthly_average: 0,
      categories: {},
      count: 0,
      last_updated: new Date().toISOString()
    };
    
    let staff = {
      total_members: 0,
      positions: {},
      members: [],
      last_updated: new Date().toISOString()
    };
    
    // Gerar dados simulados baseados no tipo de político
    if (politician.position === 'Deputado Estadual') {
      expenses = {
        total: Math.random() * 50000 + 10000, // Entre R$ 10k e R$ 60k
        monthly_average: 0,
        categories: {
          'Combustíveis e lubrificantes': Math.random() * 5000 + 1000,
          'Material de escritório': Math.random() * 2000 + 500,
          'Telefonia': Math.random() * 1500 + 300,
          'Correios e telégrafos': Math.random() * 800 + 200
        },
        count: Math.floor(Math.random() * 20) + 5,
        last_updated: new Date().toISOString()
      };
      expenses.monthly_average = expenses.total / 12;
      
      staff = {
        total_members: Math.floor(Math.random() * 8) + 2,
        positions: {
          'Assessor Parlamentar': Math.floor(Math.random() * 3) + 1,
          'Secretário': 1,
          'Auxiliar Administrativo': Math.floor(Math.random() * 2) + 1
        },
        members: [],
        last_updated: new Date().toISOString()
      };
    } else if (politician.position === 'Prefeito') {
      expenses = {
        total: Math.random() * 100000 + 20000, // Entre R$ 20k e R$ 120k
        monthly_average: 0,
        categories: {
          'Combustíveis e lubrificantes': Math.random() * 8000 + 2000,
          'Material de escritório': Math.random() * 3000 + 800,
          'Telefonia': Math.random() * 2000 + 500,
          'Viagens e diárias': Math.random() * 5000 + 1000
        },
        count: Math.floor(Math.random() * 30) + 10,
        last_updated: new Date().toISOString()
      };
      expenses.monthly_average = expenses.total / 12;
      
      staff = {
        total_members: Math.floor(Math.random() * 15) + 5,
        positions: {
          'Chefe de Gabinete': 1,
          'Assessor': Math.floor(Math.random() * 5) + 2,
          'Secretário': Math.floor(Math.random() * 3) + 1,
          'Auxiliar': Math.floor(Math.random() * 4) + 2
        },
        members: [],
        last_updated: new Date().toISOString()
      };
    } else if (politician.position === 'Vereador') {
      expenses = {
        total: Math.random() * 30000 + 5000, // Entre R$ 5k e R$ 35k
        monthly_average: 0,
        categories: {
          'Combustíveis e lubrificantes': Math.random() * 3000 + 500,
          'Material de escritório': Math.random() * 1500 + 300,
          'Telefonia': Math.random() * 1000 + 200
        },
        count: Math.floor(Math.random() * 15) + 3,
        last_updated: new Date().toISOString()
      };
      expenses.monthly_average = expenses.total / 12;
      
      staff = {
        total_members: Math.floor(Math.random() * 5) + 1,
        positions: {
          'Assessor': Math.floor(Math.random() * 2) + 1,
          'Secretário': Math.floor(Math.random() * 2)
        },
        members: [],
        last_updated: new Date().toISOString()
      };
    }
    
    // Atualizar no banco
    const { data, error } = await supabase
      .from('politicians')
      .update({
        expenses,
        staff,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar dados locais:', error);
      return res.status(500).json({ error: 'Erro ao atualizar dados' });
    }
    
    res.json({
      success: true,
      politician: data[0],
      message: 'Dados locais atualizados com sucesso (simulados)'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar dados locais:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

/**
 * Listar todos os políticos locais (estaduais e municipais)
 */
router.get('/list/local', async (req, res) => {
  try {
    const { state, city, position, limit = 20, page = 1 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('politicians')
      .select('*', { count: 'exact' })
      .in('position', ['Deputado Estadual', 'Prefeito', 'Vereador'])
      .eq('is_active', true)
      .order('name')
      .range(offset, offset + parseInt(limit) - 1);
    
    if (state) {
      query = query.eq('state', state.toUpperCase());
    }
    if (city) {
      query = query.eq('city', city.toUpperCase());
    }
    if (position) {
      query = query.eq('position', position);
    }
    
    const { data: politicians, error, count } = await query;
    
    if (error) {
      console.error('Erro ao listar políticos locais:', error);
      return res.status(500).json({ error: 'Erro ao listar políticos locais' });
    }
    
    res.json({
      success: true,
      politicians,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar políticos locais:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;