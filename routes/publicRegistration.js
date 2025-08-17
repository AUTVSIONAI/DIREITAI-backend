const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Cadastro público de político (sem autenticação)
router.post('/politician', async (req, res) => {
  try {
    const {
      name,
      position,
      state,
      party,
      photo_url,
      short_bio,
      social_links,
      government_plan,
      government_plan_pdf_url,
      main_ideologies,
      birth_date,
      bio // campo adicional do formulário
    } = req.body;

    // Validações básicas
    if (!name || !position) {
      return res.status(400).json({ 
        success: false,
        error: 'Nome e cargo são obrigatórios' 
      });
    }

    if (!state || !party) {
      return res.status(400).json({ 
        success: false,
        error: 'Estado e partido são obrigatórios' 
      });
    }

    // Verificar se já existe um político com o mesmo nome e estado
    const { data: existingPolitician } = await supabase
      .from('politicians')
      .select('id, name, state')
      .eq('name', name)
      .eq('state', state?.toUpperCase())
      .single();

    if (existingPolitician) {
      return res.status(409).json({ 
        success: false,
        error: 'Já existe um político cadastrado com este nome neste estado' 
      });
    }

    // Criar político com status pendente de aprovação
    const { data: politician, error } = await supabase
      .from('politicians')
      .insert({
        name: name.trim(),
        position,
        state: state?.toUpperCase(),
        party: party.toUpperCase(),
        photo_url,
        short_bio: bio || short_bio, // usar 'bio' do formulário se disponível
        social_links: social_links || {},
        government_plan,
        government_plan_pdf_url,
        main_ideologies: main_ideologies || [],
        // Campos de aprovação
        is_approved: false,
        status: 'pending',
        is_active: false, // inativo até aprovação
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar político:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao processar cadastro. Tente novamente.' 
      });
    }

    // Log para auditoria
    console.log(`📝 Novo cadastro de político pendente: ${name} (${state}) - ID: ${politician.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: politician.id,
        name: politician.name,
        position: politician.position,
        state: politician.state,
        party: politician.party,
        status: politician.status
      },
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.'
    });

  } catch (error) {
    console.error('Erro no cadastro público de político:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// Verificar status de aprovação (público)
router.get('/politician/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: politician, error } = await supabase
      .from('politicians')
      .select('id, name, status, is_approved, approved_at')
      .eq('id', id)
      .single();

    if (error || !politician) {
      return res.status(404).json({ 
        success: false,
        error: 'Cadastro não encontrado' 
      });
    }

    res.json({
      success: true,
      data: {
        id: politician.id,
        name: politician.name,
        status: politician.status,
        is_approved: politician.is_approved,
        approved_at: politician.approved_at
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;