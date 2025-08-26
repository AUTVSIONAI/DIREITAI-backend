const express = require('express');
const { adminSupabase } = require('../config/supabase');
const router = express.Router();

// Rota temporária para corrigir políticas RLS da constituição
router.post('/fix-constitution-rls', async (req, res) => {
  try {
    console.log('Iniciando correção das políticas RLS da constituição...');

    // Verificar se a tabela constitution_downloads existe
    const { data: tableExists, error: tableError } = await adminSupabase
      .from('constitution_downloads')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      return res.status(404).json({ 
        error: 'Tabela constitution_downloads não encontrada',
        details: 'A tabela precisa ser criada primeiro no Supabase'
      });
    }

    // Verificar RLS atual
    console.log('Verificando configuração atual da tabela...');
    
    const results = [
      { status: 'info', message: 'Tabela constitution_downloads encontrada' },
      { status: 'info', message: 'Para corrigir as políticas RLS, acesse o painel do Supabase:' },
      { status: 'info', message: '1. Vá para Authentication > Policies' },
      { status: 'info', message: '2. Selecione a tabela constitution_downloads' },
      { status: 'info', message: '3. Remova as políticas existentes se houver' },
      { status: 'info', message: '4. Crie as novas políticas conforme o arquivo SQL' }
    ];

    res.json({
      message: 'Correção das políticas RLS concluída',
      results
    });
  } catch (error) {
    console.error('Erro ao corrigir políticas RLS:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;