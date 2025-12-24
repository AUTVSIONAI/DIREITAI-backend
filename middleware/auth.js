const { supabase, adminSupabase } = require('../config/supabase');
const axios = require('axios');

// Função helper para resolver userId (aceita tanto auth_id quanto ID da tabela users)
const resolveUserId = async (inputUserId) => {
  try {
    // Primeiro, tentar buscar por ID da tabela users
    let { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', inputUserId)
      .single();
    
    if (!dbError && dbUser) {
      console.log('🔍 User ID from database:', dbUser.id);
      return dbUser.id; // Retorna o ID da tabela users
    }
    
    // Se não encontrou, tentar buscar por auth_id
    ({ data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', inputUserId)
      .single());
    
    if (!dbError && dbUser) {
      console.log('🔍 User ID from database (via auth_id):', dbUser.id);
      return dbUser.id; // Retorna o ID da tabela users
    }
    
    console.log('❌ Usuário não encontrado:', inputUserId);
    return null;
  } catch (error) {
    console.error('❌ Erro ao resolver userId:', error);
    return null;
  }
};

// Middleware para autenticar usuário
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token de acesso não fornecido');
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
    
    let user;
    try {
      const { data, error } = await adminSupabase.auth.getUser(token);
      if (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
      user = data.user;
    } catch (authError) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    
    if (!user || !user.id) {
      console.error('❌ Usuário não encontrado no token');
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    console.log('✅ Token válido para usuário:', user.email);

    // Buscar o usuário na tabela users usando o auth_id
    const { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();
    
    if (dbError || !dbUser) {
      console.error('❌ Usuário não encontrado na tabela users:', dbError?.message);
      return res.status(401).json({ error: 'Usuário não encontrado no sistema' });
    }
    
    console.log('✅ Usuário encontrado na tabela users:', dbUser.email);
    
    const emailAdmin = user.email === 'admin@direitai.com';
    const metaRoleAdmin = (user.user_metadata?.role === 'admin') || (Array.isArray(user.user_metadata?.roles) && user.user_metadata.roles.includes('admin'));
    const dbRoleAdmin = (dbUser.role === 'admin');
    const isAdminFlag = !!dbUser.is_admin || dbRoleAdmin || metaRoleAdmin || emailAdmin || !!user.user_metadata?.is_admin;
    const metaRole = user.user_metadata?.role || (Array.isArray(user.user_metadata?.roles) ? user.user_metadata.roles[0] : undefined);
    req.user = {
      id: dbUser.id,
      auth_id: user.id,
      email: dbUser.email,
      username: dbUser.username || user.email.split('@')[0],
      full_name: dbUser.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
      role: dbRoleAdmin ? 'admin' : (dbUser.role || metaRole || (isAdminFlag ? 'admin' : 'user')),
      is_admin: isAdminFlag,
      plan: dbUser.plan || 'gratuito',
      points: dbUser.points || 0
    };
    
    console.log('🔍 Final user role:', req.user.role);
    console.log('🔍 User ID from database:', req.user.id);
    
    console.log('✅ Usuário autenticado com dados básicos:', user.email);
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para autenticar admin
const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('🔍 Admin middleware - checking user:', req.user);
    
    // O usuário já deve estar autenticado pelo authenticateUser
    if (!req.user) {
      console.log('❌ Admin middleware - no user found');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    console.log('🔍 Admin middleware - user role:', req.user.role);
    
    // Verificar se o usuário é admin
    const isAdminRole = req.user.role === 'admin' || req.user.role === 'super_admin'
    const isAdminFlag = req.user.is_admin === true
    const isAdminEmail = req.user.email === 'admin@direitai.com'
    if (!isAdminRole && !isAdminFlag && !isAdminEmail) {
      console.log('❌ Admin middleware - access denied for role:', req.user.role);
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    console.log('✅ Admin middleware - access granted');
    try {
      next();
    } catch (nextError) {
      console.error('❌ Erro após admin middleware:', nextError);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  } catch (error) {
    console.error('Admin authentication middleware error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware opcional para autenticar usuário (não retorna erro se não autenticado)
const optionalAuthenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Usuário não autenticado, mas continua
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
    
    // Verificar o token com Supabase
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('⚠️ Token inválido, continuando sem autenticação');
      req.user = null;
      return next();
    }

    console.log('✅ Token válido para usuário:', user.email);

    // Buscar o usuário na tabela users usando o auth_id
    const { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();
    
    if (dbError || !dbUser) {
      console.log('⚠️ Usuário não encontrado na tabela users, continuando sem autenticação');
      req.user = null;
      return next();
    }
    
    console.log('✅ Usuário encontrado na tabela users:', dbUser.email);
    console.log('🔍 dbUser.id (ID da tabela users):', dbUser.id);
    console.log('🔍 user.id (auth_id):', user.id);
    
    req.user = {
      auth_id: user.id,
      id: dbUser.id, // Usar o ID da tabela users para foreign keys
      email: user.email,
      role: dbUser.role || 'user',
      name: dbUser.name,
      avatar_url: dbUser.avatar_url
    };
    
    console.log('🔍 Final user role:', req.user.role);
    console.log('🔍 User ID from database (req.user.id):', req.user.id);
    console.log('🔍 Auth ID (req.user.auth_id):', req.user.auth_id);
    console.log('✅ Usuário autenticado com dados básicos:', req.user.email);
    
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação opcional:', error);
    req.user = null;
    next();
  }
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  optionalAuthenticateUser,
  requireAdmin,
  resolveUserId
};
