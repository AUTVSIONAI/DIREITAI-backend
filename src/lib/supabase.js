import { createClient } from '@supabase/supabase-js'

// Polyfills para garantir compatibilidade
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    set(name, value) { this._headers.set(name.toLowerCase(), String(value)); }
    get(name) { return this._headers.get(name.toLowerCase()) || null; }
    has(name) { return this._headers.has(name.toLowerCase()); }
    delete(name) { this._headers.delete(name.toLowerCase()); }
    forEach(callback) { this._headers.forEach((value, key) => callback(value, key, this)); }
    *[Symbol.iterator]() { for (const [key, value] of this._headers) yield [key, value]; }
  };
}

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo'

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Definida' : 'Não definida');

// Usar sempre cliente mock para evitar problemas de compatibilidade
let supabase;
console.log('Usando cliente mock Supabase para compatibilidade');

// Cliente mock sempre ativo
supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      signOut: () => Promise.resolve({ error: null }),
      resend: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
      onAuthStateChange: (callback) => {
        console.log('Mock onAuthStateChange called');
        // Simular callback inicial
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