import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo'

// Criar cliente Supabase com verificações de segurança
let supabase;
try {
  // Verificar se as APIs necessárias estão disponíveis
  if (typeof fetch === 'undefined' || typeof Headers === 'undefined') {
    throw new Error('APIs necessárias não disponíveis');
  }
  
  // Criar cliente com configurações mínimas
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
} catch (error) {
  console.error('Erro ao criar cliente Supabase:', error);
  
  // Cliente mock como fallback
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signOut: () => Promise.resolve({ error: null }),
      resend: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') })
        })
      })
    })
  };
}

export { supabase };

// Função para verificar se o usuário está autenticado
export const isAuthenticated = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error)
    return false
  }
}

// Função para obter o usuário atual
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error)
    return null
  }
}

// Função para fazer login
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    return { data: null, error }
  }
}

// Função para fazer cadastro
export const signUp = async (email, password, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erro ao fazer cadastro:', error)
    return { data: null, error }
  }
}

// Função para fazer logout
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return { success: false, error }
  }
}

// Função para verificar se é admin
export const isAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data?.role === 'admin'
  } catch (error) {
    console.error('Erro ao verificar se é admin:', error)
    return false
  }
}

// Função para reenviar email de confirmação
export const resendConfirmation = async (email) => {
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erro ao reenviar confirmação:', error)
    return { data: null, error }
  }
}