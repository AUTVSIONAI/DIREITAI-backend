const { supabase } = require('../config/supabase');

// Cliente admin para operações que precisam contornar RLS
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função helper para resolver userId (aceita tanto auth_id quanto ID da tabela users)
const resolveUserId = async (inputUserId, requestUser = null) => {
  try {
    console.log('🔍 resolveUserId - inputUserId:', inputUserId);
    console.log('🔍 resolveUserId - requestUser:', requestUser ? { id: requestUser.id, auth_id: requestUser.auth_id } : 'null');
    
    // Se o inputUserId é igual ao ID ou auth_id do usuário da requisição, usar diretamente
    if (requestUser && (inputUserId === requestUser.id || inputUserId === requestUser.auth_id)) {
      console.log('🔍 resolveUserId - usando requestUser.id:', requestUser.id);
      return requestUser.id; // Para user_goals, precisamos do ID da tabela users
    }
    
    // Primeiro, tentar buscar por ID da tabela users
    let { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', inputUserId)
      .single();
    
    if (!dbError && dbUser) {
      console.log('🔍 User ID from database:', dbUser.id);
      console.log('🔍 Auth ID from database:', dbUser.auth_id);
      return dbUser.id; // Para user_goals, retornar ID da tabela users
    }
    
    // Se não encontrou, tentar buscar por auth_id
    ({ data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('auth_id', inputUserId)
      .single());
    
    if (!dbError && dbUser) {
      console.log('🔍 User ID from database (via auth_id):', dbUser.id);
      console.log('🔍 Auth ID from database (via auth_id):', dbUser.auth_id);
      return dbUser.id; // Para user_goals, retornar ID da tabela users
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
    
    // Verificar o token com Supabase
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Auth error:', error?.message || 'Usuário não encontrado');
      console.log('🔍 Token completo:', token);
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
    
    req.user = {
      id: dbUser.id, // Usar o ID da tabela users para foreign keys
      auth_id: user.id, // ID do auth.users
      email: dbUser.email,
      username: dbUser.username || user.email.split('@')[0],
      full_name: dbUser.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
      role: dbUser.role || (dbUser.is_admin ? 'admin' : 'user')
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
    if (req.user.role !== 'admin') {
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

module.exports = {
  authenticateUser,
  authenticateAdmin,
  optionalAuthenticateUser,
  resolveUserId
};