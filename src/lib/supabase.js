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

// Polyfill para Headers se necessário
function ensureHeaders() {
  if (typeof Headers === 'undefined' || !Headers.prototype.set) {
    console.log('🔧 Criando polyfill para Headers...');
    
    // Polyfill básico para Headers
    globalThis.Headers = class Headers {
      constructor(init) {
        this._headers = new Map();
        if (init) {
          if (init instanceof Headers) {
            init._headers.forEach((value, key) => {
              this._headers.set(key.toLowerCase(), value);
            });
          } else if (Array.isArray(init)) {
            init.forEach(([key, value]) => {
              this._headers.set(key.toLowerCase(), String(value));
            });
          } else if (typeof init === 'object') {
            Object.entries(init).forEach(([key, value]) => {
              this._headers.set(key.toLowerCase(), String(value));
            });
          }
        }
      }
      
      set(name, value) {
        this._headers.set(name.toLowerCase(), String(value));
      }
      
      get(name) {
        return this._headers.get(name.toLowerCase()) || null;
      }
      
      has(name) {
        return this._headers.has(name.toLowerCase());
      }
      
      delete(name) {
        this._headers.delete(name.toLowerCase());
      }
      
      append(name, value) {
        const existing = this.get(name);
        if (existing) {
          this.set(name, existing + ', ' + value);
        } else {
          this.set(name, value);
        }
      }
      
      forEach(callback) {
        this._headers.forEach((value, key) => {
          callback(value, key, this);
        });
      }
      
      keys() {
        return this._headers.keys();
      }
      
      values() {
        return this._headers.values();
      }
      
      entries() {
        return this._headers.entries();
      }
    };
  }
}

// Verificar se as APIs necessárias estão disponíveis
function checkBrowserAPIs() {
  // Garantir que Headers existe
  ensureHeaders();
  
  const checks = {
    Headers: typeof Headers !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    URL: typeof URL !== 'undefined',
    AbortController: typeof AbortController !== 'undefined'
  };
  
  console.log('🔧 Verificação de APIs do browser:', checks);
  
  // Verificar se Headers tem as propriedades necessárias
  if (checks.Headers) {
    try {
      const testHeaders = new Headers();
      console.log('🔧 Headers.prototype.set:', typeof testHeaders.set);
      console.log('🔧 Headers.prototype.get:', typeof testHeaders.get);
      console.log('🔧 Headers.prototype.has:', typeof testHeaders.has);
    } catch (e) {
      console.error('❌ Erro ao testar Headers:', e);
      checks.Headers = false;
    }
  }
  
  return checks;
}

// Criar cliente Supabase com configurações específicas para produção
let supabase;

// Verificar APIs do browser primeiro
const browserAPIs = checkBrowserAPIs();
const allAPIsAvailable = Object.values(browserAPIs).every(Boolean);

if (!allAPIsAvailable) {
  console.error('❌ APIs do browser não estão disponíveis:', browserAPIs);
  supabase = null;
} else {
  try {
    console.log('Criando cliente Supabase...');
    
    // Verificar parâmetros antes de criar o cliente
    console.log('🔧 Parâmetros para createClient:');
    console.log('🔧 URL válida:', typeof supabaseUrl === 'string' && supabaseUrl.length > 0);
    console.log('🔧 Key válida:', typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0);
    
    // Configuração mais robusta para produção
    const clientOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'X-Client-Info': 'direitai-web'
        }
      }
    };
    
    console.log('🚀 Tentando criar cliente com configuração robusta...');
    supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    console.log('✅ Cliente Supabase criado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente Supabase:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Tentar criar com configuração mínima como fallback
    try {
      console.log('🔄 Tentando com configuração mínima...');
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ Cliente criado com configuração mínima!');
    } catch (fallbackError) {
      console.error('❌ Erro no fallback:', fallbackError);
      supabase = null;
    }
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