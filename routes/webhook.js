const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Webhook para criação automática de perfil de usuário
router.post('/user-created', async (req, res) => {
  try {
    console.log('📝 Webhook recebido:', req.body);
    
    const { type, table, record } = req.body;
    
    // Verificar se é um evento de inserção de usuário
    if (type === 'INSERT' && table === 'users' && record) {
      console.log('👤 Criando perfil para novo usuário:', record.email);
      
      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_id', record.id)
        .single();
      
      if (existingProfile) {
        console.log('ℹ️ Perfil já existe para este usuário');
        return res.status(200).json({ success: true, message: 'Profile already exists' });
      }
      
      // Criar perfil na tabela users
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: record.id,
          email: record.email,
          username: record.raw_user_meta_data?.username || null,
          full_name: record.raw_user_meta_data?.full_name || record.raw_user_meta_data?.name || null,
          role: 'user',
          plan: 'gratuito',
          billing_cycle: 'monthly',
          points: 0,
          is_admin: record.raw_user_meta_data?.is_admin || false,
          banned: false,
          created_at: record.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar perfil:', error.message);
        return res.status(500).json({ error: 'Failed to create user profile', details: error.message });
      }
      
      console.log('✅ Perfil criado com sucesso:', data.email);
      return res.status(200).json({ success: true, user: data });
    }
    
    return res.status(200).json({ success: true, message: 'Event processed' });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint de teste para verificar se o webhook está funcionando
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;