const { supabase } = require('../config/supabase');

// Middleware para autenticar usuário
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verificar o token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar dados completos do usuário na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User data error:', userError);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Adicionar dados do usuário ao request
    req.user = {
      ...userData,
      auth_id: user.id,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para autenticar admin
const authenticateAdmin = async (req, res, next) => {
  try {
    // O usuário já deve estar autenticado pelo authenticateUser
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o usuário é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    next();
  } catch (error) {
    console.error('Admin authentication middleware error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  authenticateUser,
  authenticateAdmin
};