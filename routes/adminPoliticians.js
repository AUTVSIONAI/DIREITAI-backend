const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Listar políticos pendentes de aprovação
router.get('/pending', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, party, state, position } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('politicians')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filtro por busca (nome)
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
    }

    // Filtro por partido
    if (party && party.trim()) {
      query = query.eq('party', party.trim());
    }

    // Filtro por estado
    if (state && state.trim()) {
      query = query.eq('state', state.trim().toUpperCase());
    }

    // Filtro por posição/cargo
    if (position && position.trim()) {
      const pos = position.trim().toLowerCase();
      if (pos === 'senador') {
        query = query.eq('position', 'senador');
      } else if (pos === 'deputado') {
        query = query.or('position.eq.deputado,position.eq.deputado federal');
      } else {
        query = query.ilike('position', `%${position.trim()}%`);
      }
    }

    const { data: politicians, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar políticos pendentes:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalPages = Math.ceil((count || 0) / parseInt(limit));

    res.json({
      success: true,
      data: politicians,
      pagination: {
        page: parseInt(page),
        pages: totalPages,
        limit: parseInt(limit),
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Erro na listagem de políticos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os políticos (aprovados, pendentes, rejeitados)
router.get('/all', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, party, state, position } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('politicians')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filtro por status
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    // Filtro por busca (nome)
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
    }

    // Filtro por partido
    if (party && party.trim()) {
      query = query.eq('party', party.trim());
    }

    // Filtro por estado
    if (state && state.trim()) {
      query = query.eq('state', state.trim().toUpperCase());
    }

    // Filtro por posição/cargo
    if (position && position.trim()) {
      const pos = position.trim().toLowerCase();
      if (pos === 'senador') {
        query = query.eq('position', 'senador');
      } else if (pos === 'deputado') {
        query = query.or('position.eq.deputado,position.eq.deputado federal');
      } else {
        query = query.ilike('position', `%${position.trim()}%`);
      }
    }

    const { data: politicians, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar todos os políticos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalPages = Math.ceil((count || 0) / parseInt(limit));

    res.json({
      success: true,
      data: politicians,
      pagination: {
        page: parseInt(page),
        pages: totalPages,
        limit: parseInt(limit),
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Erro na listagem de todos os políticos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar político
router.post('/:id/approve', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body; // comentário opcional do admin

    // Verificar se o político existe e está pendente
    const { data: politician, error: fetchError } = await supabase
      .from('politicians')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (fetchError || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    if (politician.status !== 'pending') {
      return res.status(400).json({ 
        error: `Político já foi ${politician.status === 'approved' ? 'aprovado' : 'rejeitado'}` 
      });
    }

    // Aprovar político
    const { data: updatedPolitician, error: updateError } = await supabase
      .from('politicians')
      .update({
        is_approved: true,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: req.user.auth_id,
        is_active: true, // ativar o político
        admin_comment: comment || null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao aprovar político:', updateError);
      return res.status(500).json({ error: 'Erro ao aprovar político' });
    }

    // Log para auditoria
    console.log(`✅ Político aprovado: ${politician.name} (ID: ${id}) por admin ${req.user.auth_id}`);

    // Gerar agente automaticamente após aprovação
    try {
      const agentPrompt = `Você é ${updatedPolitician.name}, ${updatedPolitician.position} ${updatedPolitician.state ? `de ${updatedPolitician.state}` : ''} do partido ${updatedPolitician.party}.

Suas características:
- Posição política: ${updatedPolitician.position}
- Estado: ${updatedPolitician.state || 'Nacional'}
- Partido: ${updatedPolitician.party}
- Biografia: ${updatedPolitician.short_bio || 'Político comprometido com o desenvolvimento do país'}
- Plano de governo: ${updatedPolitician.government_plan || 'Focado em melhorias para a população'}
- Principais ideologias: ${updatedPolitician.main_ideologies || 'Conservadora'}

Responda como este político responderia, mantendo coerência com suas posições políticas e ideológicas. Seja respeitoso, político e mantenha o foco em questões relevantes para sua área de atuação. Use linguagem acessível e demonstre conhecimento sobre as necessidades do seu estado/região.`;

      const { data: newAgent, error: agentError } = await supabase
        .from('politician_agents')
        .insert({
          politician_id: id,
          trained_prompt: agentPrompt,
          voice_id: null, // Pode ser configurado posteriormente
          personality_config: {
            tone: 'professional',
            style: 'political',
            formality: 'formal'
          },
          is_active: true
        })
        .select()
        .single();

      if (agentError) {
        console.error('Erro ao criar agente automaticamente:', agentError);
        // Não falha a aprovação se houver erro na criação do agente
      } else {
        console.log(`🤖 Agente criado automaticamente para ${updatedPolitician.name} (Agent ID: ${newAgent.id})`);
      }
    } catch (agentCreationError) {
      console.error('Erro na criação automática do agente:', agentCreationError);
      // Não falha a aprovação se houver erro na criação do agente
    }

    res.json({
      success: true,
      data: updatedPolitician,
      message: 'Político aprovado com sucesso e agente IA criado automaticamente'
    });

  } catch (error) {
    console.error('Erro na aprovação de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rejeitar político
router.post('/:id/reject', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // motivo da rejeição

    if (!reason) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    // Verificar se o político existe e está pendente
    const { data: politician, error: fetchError } = await supabase
      .from('politicians')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (fetchError || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    if (politician.status !== 'pending') {
      return res.status(400).json({ 
        error: `Político já foi ${politician.status === 'approved' ? 'aprovado' : 'rejeitado'}` 
      });
    }

    // Rejeitar político
    const { data: updatedPolitician, error: updateError } = await supabase
      .from('politicians')
      .update({
        is_approved: false,
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: req.user.auth_id,
        is_active: false,
        admin_comment: reason
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao rejeitar político:', updateError);
      return res.status(500).json({ error: 'Erro ao rejeitar político' });
    }

    // Log para auditoria
    console.log(`❌ Político rejeitado: ${politician.name} (ID: ${id}) por admin ${req.user.auth_id}. Motivo: ${reason}`);

    res.json({
      success: true,
      data: updatedPolitician,
      message: 'Político rejeitado'
    });

  } catch (error) {
    console.error('Erro na rejeição de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um político específico (para admin)
router.get('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: politician, error } = await supabase
      .from('politicians')
      .select(`
        *,
        politician_agents (
          id,
          trained_prompt,
          voice_id,
          personality_config,
          is_active
        )
      `)
      .eq('id', id)
      .single();

    if (error || !politician) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    res.json({
      success: true,
      data: politician
    });
  } catch (error) {
    console.error('Erro ao buscar político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de aprovação
router.get('/stats/approval', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data: stats, error } = await supabase
      .from('politicians')
      .select('status')
    .not('status', 'is', null);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const summary = stats.reduce((acc, politician) => {
      acc[politician.status] = (acc[politician.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        pending: summary.pending || 0,
        approved: summary.approved || 0,
        rejected: summary.rejected || 0,
        total: stats.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE SINCRONIZAÇÃO COM APIs EXTERNAS =====

// Verificar se político já existe por ID externo
router.get('/check-external/:externalId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { externalId } = req.params;
    const { source } = req.query;

    if (!source || !['camara', 'senado'].includes(source)) {
      return res.status(400).json({ error: 'Source deve ser "camara" ou "senado"' });
    }

    const { data: politician, error } = await supabase
      .from('politicians')
      .select('id, name, external_id, source')
      .eq('external_id', externalId)
      .eq('source', source)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao verificar político existente:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      success: true,
      exists: !!politician,
      data: politician || null
    });
  } catch (error) {
    console.error('Erro na verificação de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Sincronizar político com dados da API externa
router.post('/sync', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      full_name,
      party,
      state,
      position,
      photo_url,
      email,
      external_id,
      source,
      legislature_id,
      status = 'pending'
    } = req.body;

    if (!name || !party || !state || !position || !external_id || !source) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: name, party, state, position, external_id, source' 
      });
    }

    if (!['camara', 'senado'].includes(source)) {
      return res.status(400).json({ error: 'Source deve ser "camara" ou "senado"' });
    }

    if (!['deputado', 'senador'].includes(position)) {
      return res.status(400).json({ error: 'Position deve ser "deputado" ou "senador"' });
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('politicians')
      .select('id')
      .eq('external_id', external_id)
      .eq('source', source)
      .single();

    if (existing) {
      return res.status(409).json({ 
        error: 'Político já existe no banco de dados',
        politician_id: existing.id
      });
    }

    // Criar novo político
    const { data: politician, error } = await supabase
      .from('politicians')
      .insert({
        name,
        full_name,
        party,
        state: state.toUpperCase(),
        position,
        photo_url,
        email,
        external_id,
        source,
        legislature_id,
        status: status,
        is_active: status === 'approved',
        is_approved: status === 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar político sincronizado:', error);
      return res.status(500).json({ error: 'Erro ao criar político' });
    }

    res.status(201).json({
      success: true,
      data: politician,
      message: 'Político sincronizado com sucesso'
    });
  } catch (error) {
    console.error('Erro na sincronização de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar político com dados da API externa
router.put('/:id/sync', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar se o político existe
    const { data: existing, error: checkError } = await supabase
      .from('politicians')
      .select('id, external_id, source')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Político não encontrado' });
    }

    // Preparar dados para atualização
    const {
      name,
      full_name,
      party,
      state,
      position,
      photo_url,
      email,
      legislature_id
    } = updateData;

    const { data: politician, error } = await supabase
      .from('politicians')
      .update({
        ...(name && { name }),
        ...(full_name && { full_name }),
        ...(party && { party }),
        ...(state && { state: state.toUpperCase() }),
        ...(position && { position }),
        ...(photo_url && { photo_url }),
        ...(email && { email }),
        ...(legislature_id && { legislature_id }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar político:', error);
      return res.status(500).json({ error: 'Erro ao atualizar político' });
    }

    res.json({
      success: true,
      data: politician,
      message: 'Político atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro na atualização de político:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Sincronizar todos os deputados
router.post('/sync/deputados', async (req, res) => {
  try {
    // Esta rota será chamada pelo frontend que já fez a requisição para as APIs
    const { deputados } = req.body;

    if (!Array.isArray(deputados)) {
      return res.status(400).json({ error: 'Deputados deve ser um array' });
    }

    let success = 0;
    let errors = 0;
    const results = [];

    for (const deputado of deputados) {
      try {
        // Validar dados obrigatórios
        if (!deputado || !deputado.name || !deputado.external_id || !deputado.state) {
          console.error('Dados inválidos do deputado:', deputado);
          errors++;
          results.push({ 
            name: deputado?.name || 'Nome não informado', 
            status: 'error', 
            error: 'Dados obrigatórios ausentes (name, external_id, state)' 
          });
          continue;
        }

        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('external_id', deputado.external_id)
          .eq('source', 'camara')
          .single();

        if (!existing) {
          // Criar novo
          const { data: newPolitician, error } = await supabase
            .from('politicians')
            .insert({
              name: deputado.name,
              full_name: deputado.full_name || deputado.name,
              party: deputado.party || 'Não informado',
              state: deputado.state.toUpperCase(),
              position: 'deputado',
              photo_url: deputado.photo_url || null,
              email: deputado.email || null,
              external_id: deputado.external_id,
              source: 'camara',
              legislature_id: deputado.legislature_id || null,
              status: 'pending',
              is_active: false,
              is_approved: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error(`Erro ao criar deputado ${deputado.name}:`, error);
            errors++;
            results.push({ name: deputado.name, status: 'error', error: error.message });
          } else {
            success++;
            results.push({ name: deputado.name, status: 'created', id: newPolitician.id });
          }
        } else {
          results.push({ name: deputado.name, status: 'exists', id: existing.id });
        }
      } catch (error) {
        console.error(`Erro ao processar deputado ${deputado.name}:`, error);
        errors++;
        results.push({ name: deputado.name, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      summary: {
        total: deputados.length,
        success,
        errors,
        existing: deputados.length - success - errors
      },
      results
    });
  } catch (error) {
    console.error('Erro na sincronização de deputados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Sincronizar todos os senadores
router.post('/sync/senadores', async (req, res) => {
  try {
    const { senadores } = req.body;

    if (!Array.isArray(senadores)) {
      return res.status(400).json({ error: 'Senadores deve ser um array' });
    }

    let success = 0;
    let errors = 0;
    const results = [];

    for (const senador of senadores) {
      try {
        // Validar dados obrigatórios
        if (!senador || !senador.name || !senador.external_id || !senador.state) {
          console.error('Dados inválidos do senador:', senador);
          errors++;
          results.push({ 
            name: senador?.name || 'Nome não informado', 
            status: 'error', 
            error: 'Dados obrigatórios ausentes (name, external_id, state)' 
          });
          continue;
        }

        // Verificar se já existe
        const { data: existing } = await supabase
          .from('politicians')
          .select('id')
          .eq('external_id', senador.external_id)
          .eq('source', 'senado')
          .single();

        if (!existing) {
          // Criar novo
          const { data: newPolitician, error } = await supabase
            .from('politicians')
            .insert({
              name: senador.name,
              full_name: senador.full_name || senador.name,
              party: senador.party || 'Não informado',
              state: senador.state.toUpperCase(),
              position: 'senador',
              photo_url: senador.photo_url || null,
              email: senador.email || null,
              external_id: senador.external_id,
              source: 'senado',
              status: 'pending',
              is_active: false,
              is_approved: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error(`Erro ao criar senador ${senador.name}:`, error);
            errors++;
            results.push({ name: senador.name, status: 'error', error: error.message });
          } else {
            success++;
            results.push({ name: senador.name, status: 'created', id: newPolitician.id });
          }
        } else {
          results.push({ name: senador.name, status: 'exists', id: existing.id });
        }
      } catch (error) {
        console.error(`Erro ao processar senador ${senador.name}:`, error);
        errors++;
        results.push({ name: senador.name, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      summary: {
        total: senadores.length,
        success,
        errors,
        existing: senadores.length - success - errors
      },
      results
    });
  } catch (error) {
    console.error('Erro na sincronização de senadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS PARA BUSCAR DADOS DAS APIS EXTERNAS =====

/**
 * Buscar deputados da API da Câmara
 */
router.get('/fetch/deputados', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome');
    
    if (!response.ok) {
      throw new Error(`Erro na API da Câmara: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.dados) {
      return res.status(500).json({ error: 'Dados não encontrados na resposta da API da Câmara' });
    }
    
    res.json({
      success: true,
      deputados: data.dados,
      total: data.dados.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar deputados da API da Câmara:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados da API da Câmara',
      details: error.message 
    });
  }
});

/**
 * Buscar senadores da API do Senado
 */
router.get('/fetch/senadores', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json');
    
    if (!response.ok) {
      throw new Error(`Erro na API do Senado: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verificar a nova estrutura da API do Senado
    if (!data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
      return res.status(500).json({ error: 'Dados não encontrados na resposta da API do Senado' });
    }
    
    const senadores = data.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
    
    res.json({
      success: true,
      senadores: Array.isArray(senadores) ? senadores : [senadores],
      total: Array.isArray(senadores) ? senadores.length : 1
    });
    
  } catch (error) {
    console.error('Erro ao buscar senadores da API do Senado:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados da API do Senado',
      details: error.message 
    });
  }
});

module.exports = router;