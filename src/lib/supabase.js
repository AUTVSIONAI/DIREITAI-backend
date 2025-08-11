import { createClient } from '@supabase/supabase-js'

// Debug das variáveis de ambiente
console.log('🔍 Debug Supabase - import.meta.env:', import.meta.env);
console.log('🔍 Debug Supabase - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🔍 Debug Supabase - VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo'

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseAnonKey ? 'Definida' : 'Não definida');
console.log('🔧 Environment:', import.meta.env.MODE);
console.log('🔧 Headers disponível:', typeof Headers);
console.log('🔧 fetch disponível:', typeof fetch);
console.log('🔧 globalThis.Headers:', typeof globalThis?.Headers);
console.log('🔧 globalThis.fetch:', typeof globalThis?.fetch);

// Verificar se as dependências estão disponíveis
console.log('🔧 Verificando dependências...');
console.log('🔧 createClient type:', typeof createClient);
console.log('🔧 createClient:', createClient);

// Criar cliente Supabase com configurações específicas para produção
let supabase;
try {
  console.log('Criando cliente Supabase...');
  
  // Verificar parâmetros antes de criar o cliente
  console.log('🔧 Parâmetros para createClient:');
  console.log('🔧 URL válida:', typeof supabaseUrl === 'string' && supabaseUrl.length > 0);
  console.log('🔧 Key válida:', typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0);
  
  // Teste sem opções primeiro
  console.log('🚀 Tentando criar cliente sem opções...');
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Cliente Supabase criado sem opções!');
  
} catch (error) {
  console.error('❌ Erro ao criar cliente Supabase:', error);
  console.error('❌ Error name:', error.name);
  console.error('❌ Error message:', error.message);
  console.error('❌ Stack trace:', error.stack);
  
  // Tentar criar com configuração mínima como fallback
  try {
    console.log('🔄 Tentando com configuração mínima...');
    const clientOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    };
    supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    console.log('✅ Cliente criado com configuração mínima!');
  } catch (fallbackError) {
    console.error('❌ Erro no fallback:', fallbackError);
    supabase = null;
  }
}

// Fallback para cliente mock se não foi possível criar o cliente real
if (!supabase) {
  
  // Fallback para cliente mock em caso de erro
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signOut: () => Promise.resolve({ error: null }),
      resend: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      onAuthStateChange: (callback) => {
        console.log('Mock onAuthStateChange called');
        if (typeof callback === 'function') {
          setTimeout(() => callback('SIGNED_OUT', null), 0);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('Mock subscription unsubscribed')
            }
          }
        }
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