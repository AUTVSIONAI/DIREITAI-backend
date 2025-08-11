import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo'

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

// Função para criar cliente Supabase com tratamento de erros
let supabase;
try {
  console.log('🚀 Iniciando criação do cliente Supabase...');
  
  // Verificar se fetch está disponível
  if (typeof fetch === 'undefined') {
    console.error('❌ Fetch não está disponível');
    throw new Error('Fetch não disponível');
  }
  
  // Verificar se Headers está disponível
  if (typeof Headers === 'undefined') {
    console.error('❌ Headers não está disponível');
    throw new Error('Headers não disponível');
  }
  
  console.log('✅ APIs necessárias estão disponíveis');
  
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  console.log('✅ Cliente Supabase criado com sucesso');
} catch (error) {
  console.error('❌ Erro ao criar cliente Supabase:', error);
  
  // Cliente mock como fallback
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback('SIGNED_OUT', null), 0);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('Mock subscription unsubscribed')
            }
          }
        };
      },
      getSession: () => Promise.resolve({ data: { session: null }, error: null })
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
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Função para fazer login
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// Função para fazer cadastro
export const signUp = async (email, password, userData) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  return { data, error }
}

// Função para fazer logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Função para verificar se é admin
export const isAdmin = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  return data?.role === 'admin'
}

// Função para reenviar email de confirmação
export const resendConfirmation = async (email) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email
  })
  return { data, error }
}