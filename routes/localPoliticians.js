const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

/**
 * Obter políticos por nível (federal, estadual, municipal)
 */
router.get('/by-level', async (req, res) => {
  try {
    const { 
      level, 
      state, 
      municipality, 
      party, 
      current_mandate, 
      page = 1, 
      limit = 20 
    } = req.query;

    if (!level || !['federal', 'estadual', 'municipal'].includes(level)) {
      return res.status(400).json({ 
        error: 'Nível é obrigatório e deve ser: federal, estadual ou municipal' 
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('politicians')
      .select('*', { count: 'exact' })
      .eq('level', level)
      .eq('is_active', true)
      .order('name');

    // Aplicar filtros
    if (state) query = query.eq('state', state.toUpperCase());
    if (municipality) query = query.eq('municipality', municipality);
    if (party) query = query.eq('party', party);
    if (current_mandate !== undefined) {
      query = query.eq('current_mandate', current_mandate === 'true');
    }

    // Paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: politicians, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar políticos por nível:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      politicians,
      total: count,
      totalPages,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Erro na busca por nível:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter políticos por município
 */
router.get('/by-municipality', async (req, res) => {
  try {
    const { 
      municipality_code, 
      position, 
      party, 
      current_mandate, 
      page = 1, 
      limit = 20 
    } = req.query;

    if (!municipality_code) {
      return res.status(400).json({ 
        error: 'Código do município é obrigatório' 
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('politicians')
      .select('*', { count: 'exact' })
      .eq('municipality_code', municipality_code)
      .eq('is_active', true)
      .order('name');

    // Aplicar filtros
    if (position) query = query.eq('position', position);
    if (party) query = query.eq('party', party);
    if (current_mandate !== undefined) {
      query = query.eq('current_mandate', current_mandate === 'true');
    }

    // Paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: politicians, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar políticos por município:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      politicians,
      total: count,
      totalPages,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Erro na busca por município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter lista de municípios por estado
 */
router.get('/municipalities/:state', async (req, res) => {
  try {
    const { state } = req.params;

    const { data: municipalities, error } = await supabase
      .from('municipalities')
      .select('code, name, population')
      .eq('state', state.toUpperCase())
      .order('name');

    if (error) {
      console.error('Erro ao buscar municípios:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(municipalities);
  } catch (error) {
    console.error('Erro na busca de municípios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter assembleias estaduais disponíveis
 */
router.get('/state-assemblies', async (req, res) => {
  try {
    const { data: assemblies, error } = await supabase
      .from('state_assemblies')
      .select('state, name, acronym, has_open_data, total_seats')
      .order('name');

    if (error) {
      console.error('Erro ao buscar assembleias estaduais:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(assemblies);
  } catch (error) {
    console.error('Erro na busca de assembleias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter câmaras municipais disponíveis
 */
router.get('/municipal-chambers', async (req, res) => {
  try {
    const { state } = req.query;

    let query = supabase
      .from('municipal_chambers')
      .select('municipality_code, municipality_name, state, name, has_open_data, total_seats')
      .order('municipality_name');

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: chambers, error } = await query;

    if (error) {
      console.error('Erro ao buscar câmaras municipais:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(chambers);
  } catch (error) {
    console.error('Erro na busca de câmaras:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Sincronizar deputados estaduais (apenas admin)
 */
router.post('/sync/state-deputies', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { state } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'Estado é obrigatório' });
    }

    // Verificar se a assembleia estadual existe
    const { data: assembly } = await supabase
      .from('state_assemblies')
      .select('*')
      .eq('state', state.toUpperCase())
      .single();

    if (!assembly) {
      return res.status(404).json({ 
        error: 'Assembleia estadual não encontrada ou não suportada' 
      });
    }

    let success = 0;
    let errors = 0;
    const results = [];

    // Simulação de sincronização - implementar integração real com APIs
    if (state.toUpperCase() === 'SP' && assembly.has_open_data) {
      // Integração com ALESP
      try {
        // Aqui seria a chamada real para a API da ALESP
        const mockDeputados = [
          {
            id: 'alesp_001',
            nome: 'João Silva',
            partido: 'PSDB',
            situacao: 'Ativo',
            email: 'joao.silva@alesp.sp.gov.br'
          },
          {
            id: 'alesp_002',
            nome: 'Maria Santos',
            partido: 'PT',
            situacao: 'Ativo',
            email: 'maria.santos@alesp.sp.gov.br'
          }
        ];

        for (const deputado of mockDeputados) {
          try {
            // Verificar se já existe
            const { data: existing } = await supabase
              .from('politicians')
              .select('id')
              .eq('external_id', deputado.id)
              .eq('source', 'alesp')
              .single();

            if (!existing) {
              // Criar novo
              const { data: newPolitician, error } = await supabase
                .from('politicians')
                .insert({
                  name: deputado.nome,
                  full_name: deputado.nome,
                  party: deputado.partido,
                  state: state.toUpperCase(),
                  position: 'Deputado Estadual',
                  level: 'estadual',
                  email: deputado.email,
                  external_id: deputado.id,
                  source: 'alesp',
                  status: 'pending',
                  current_mandate: deputado.situacao === 'Ativo',
                  is_active: false,
                  is_approved: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (error) {
                console.error(`Erro ao criar deputado ${deputado.nome}:`, error);
                errors++;
                results.push({ 
                  name: deputado.nome, 
                  status: 'error', 
                  error: error.message 
                });
              } else {
                success++;
                results.push({ 
                  name: deputado.nome, 
                  status: 'created', 
                  id: newPolitician.id 
                });
              }
            } else {
              results.push({ 
                name: deputado.nome, 
                status: 'exists', 
                id: existing.id 
              });
            }
          } catch (error) {
            console.error(`Erro ao processar deputado ${deputado.nome}:`, error);
            errors++;
            results.push({ 
              name: deputado.nome, 
              status: 'error', 
              error: error.message 
            });
          }
        }
      } catch (error) {
        console.error('Erro na integração com ALESP:', error);
        return res.status(500).json({ 
          error: 'Erro na integração com a API da ALESP' 
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Estado não suportado ou sem dados abertos disponíveis' 
      });
    }

    res.json({
      success: true,
      summary: {
        total: results.length,
        success,
        errors,
        skipped: results.filter(r => r.status === 'exists').length
      },
      results,
      message: `Sincronização concluída para ${state.toUpperCase()}`
    });
  } catch (error) {
    console.error('Erro na sincronização de deputados estaduais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Sincronizar prefeitos (apenas admin)
 */
router.post('/sync/mayors', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { state, year = '2020' } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'Estado é obrigatório' });
    }

    let success = 0;
    let errors = 0;
    const results = [];

    // Simulação de sincronização com dados do TSE
    const mockPrefeitos = [
      {
        codigo_municipio: '71072',
        nome_municipio: 'São Paulo',
        nome_candidato: 'Ricardo Nunes',
        nome_urna_candidato: 'Ricardo Nunes',
        sigla_partido: 'MDB',
        situacao_turno: 'ELEITO'
      },
      {
        codigo_municipio: '60011',
        nome_municipio: 'Rio de Janeiro',
        nome_candidato: 'Eduardo Paes',
        nome_urna_candidato: 'Eduardo Paes',
        sigla_partido: 'PSD',
        situacao_turno: 'ELEITO'
      }
    ];

    for (const prefeito of mockPrefeitos) {
      try {
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('name', prefeito.nome_urna_candidato)
          .eq('municipality_code', prefeito.codigo_municipio)
          .eq('position', 'Prefeito')
          .single();

        if (!existing) {
          // Criar novo
          const { data: newPolitician, error } = await supabase
            .from('politicians')
            .insert({
              name: prefeito.nome_urna_candidato,
              full_name: prefeito.nome_candidato,
              party: prefeito.sigla_partido,
              state: state.toUpperCase(),
              municipality: prefeito.nome_municipio,
              municipality_code: prefeito.codigo_municipio,
              position: 'Prefeito',
              level: 'municipal',
              source: 'tse',
              status: 'pending',
              current_mandate: prefeito.situacao_turno === 'ELEITO',
              mandate_start_date: `${year}-01-01`,
              mandate_end_date: `${parseInt(year) + 4}-12-31`,
              is_active: false,
              is_approved: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error(`Erro ao criar prefeito ${prefeito.nome_candidato}:`, error);
            errors++;
            results.push({ 
              name: prefeito.nome_candidato, 
              status: 'error', 
              error: error.message 
            });
          } else {
            success++;
            results.push({ 
              name: prefeito.nome_candidato, 
              status: 'created', 
              id: newPolitician.id 
            });
          }
        } else {
          results.push({ 
            name: prefeito.nome_candidato, 
            status: 'exists', 
            id: existing.id 
          });
        }
      } catch (error) {
        console.error(`Erro ao processar prefeito ${prefeito.nome_candidato}:`, error);
        errors++;
        results.push({ 
          name: prefeito.nome_candidato, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      summary: {
        total: results.length,
        success,
        errors,
        skipped: results.filter(r => r.status === 'exists').length
      },
      results,
      message: `Sincronização de prefeitos concluída para ${state.toUpperCase()}`
    });
  } catch (error) {
    console.error('Erro na sincronização de prefeitos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Sincronizar vereadores (apenas admin)
 */
router.post('/sync/councilors', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { municipalityCode, year = '2020' } = req.body;

    if (!municipalityCode) {
      return res.status(400).json({ error: 'Código do município é obrigatório' });
    }

    // Buscar informações do município
    const { data: municipality } = await supabase
      .from('municipalities')
      .select('*')
      .eq('code', municipalityCode)
      .single();

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    let success = 0;
    let errors = 0;
    const results = [];

    // Simulação de sincronização com dados do TSE
    const mockVereadores = [
      {
        nome_candidato: 'Ana Silva',
        nome_urna_candidato: 'Ana Silva',
        sigla_partido: 'PT',
        situacao_turno: 'ELEITO'
      },
      {
        nome_candidato: 'Carlos Santos',
        nome_urna_candidato: 'Carlos Santos',
        sigla_partido: 'PSDB',
        situacao_turno: 'ELEITO'
      }
    ];

    for (const vereador of mockVereadores) {
      try {
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('name', vereador.nome_urna_candidato)
          .eq('municipality_code', municipalityCode)
          .eq('position', 'Vereador')
          .single();

        if (!existing) {
          // Criar novo
          const { data: newPolitician, error } = await supabase
            .from('politicians')
            .insert({
              name: vereador.nome_urna_candidato,
              full_name: vereador.nome_candidato,
              party: vereador.sigla_partido,
              state: municipality.state,
              municipality: municipality.name,
              municipality_code: municipalityCode,
              position: 'Vereador',
              level: 'municipal',
              source: 'tse',
              status: 'pending',
              current_mandate: vereador.situacao_turno === 'ELEITO',
              mandate_start_date: `${year}-01-01`,
              mandate_end_date: `${parseInt(year) + 4}-12-31`,
              is_active: false,
              is_approved: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error(`Erro ao criar vereador ${vereador.nome_candidato}:`, error);
            errors++;
            results.push({ 
              name: vereador.nome_candidato, 
              status: 'error', 
              error: error.message 
            });
          } else {
            success++;
            results.push({ 
              name: vereador.nome_candidato, 
              status: 'created', 
              id: newPolitician.id 
            });
          }
        } else {
          results.push({ 
            name: vereador.nome_candidato, 
            status: 'exists', 
            id: existing.id 
          });
        }
      } catch (error) {
        console.error(`Erro ao processar vereador ${vereador.nome_candidato}:`, error);
        errors++;
        results.push({ 
          name: vereador.nome_candidato, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      summary: {
        total: results.length,
        success,
        errors,
        skipped: results.filter(r => r.status === 'exists').length
      },
      results,
      message: `Sincronização de vereadores concluída para ${municipality.name}`
    });
  } catch (error) {
    console.error('Erro na sincronização de vereadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;