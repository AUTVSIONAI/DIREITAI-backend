const express = require('express');
const { supabase, adminSupabase } = require('../config/supabase');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, fullName, city, state } = req.body;

    // Create user in Supabase Auth using Admin Client to bypass email confirmation
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const { data: profileData, error: profileError } = await adminSupabase
      .from('users')
      .insert([
        {
          auth_id: authData.user.id,
          email,
          username,
          full_name: fullName,
          city: city || null,
          state: state || null,
          plan: 'gratuito',
          points: 75, // 50 (Bem-vindo) + 25 (Primeiro Acesso)
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1000).toISOString();

    // 1. Award "Welcome" Achievement (50 points)
    await adminSupabase.from('badges').insert({
      user_id: profileData.id,
      badge_type: 'welcome',
      achievement_id: 'welcome',
      name: 'Bem-vindo!',
      description: 'Cadastrou-se na plataforma DireitaAI',
      icon: '👋',
      earned_at: now
    });

    await adminSupabase.from('points').insert({
      user_id: profileData.id,
      amount: 50,
      reason: 'Conquista: Bem-vindo!',
      category: 'achievement',
      created_at: now
    });

    // 2. Award "First Login" Achievement (25 points)
    await adminSupabase.from('badges').insert({
      user_id: profileData.id,
      badge_type: 'first_login',
      achievement_id: 'first_login',
      name: 'Primeiro Acesso',
      description: 'Realizou o primeiro login na plataforma',
      icon: '🚪',
      earned_at: later
    });

    await adminSupabase.from('points').insert({
      user_id: profileData.id,
      amount: 25,
      reason: 'Conquista: Primeiro Acesso',
      category: 'achievement',
      created_at: later
    });

    // Auto login to get session
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: profileData,
      session: loginData?.session,
      auth_user: authData.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Para desenvolvimento: permitir login mesmo sem confirmação de email
      if (error.message === 'Email not confirmed' && process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Desenvolvimento: Permitindo login sem confirmação de email para:', email);
        // Tentar fazer login administrativo ou criar usuário temporário
        // Por enquanto, vamos retornar um erro mais amigável
        return res.status(400).json({ 
          error: 'Email não confirmado. Em desenvolvimento, verifique o console do Supabase.' 
        });
      }
      return res.status(400).json({ error: error.message });
    }

    // Buscar o perfil real do usuário na tabela users
    const { data: profileData, error: profileError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil do usuário:', profileError);
      return res.status(400).json({ error: 'Perfil do usuário não encontrado' });
    }

    res.json({
      message: 'Login successful',
      user: data.user,
      profile: profileData, // Usar dados reais da tabela users
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (error || !user) {
      console.log('❌ Invalid token or user not found:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.json({ user, profile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error: ' + (error.message || 'Unknown error') });
  }
});

module.exports = router;