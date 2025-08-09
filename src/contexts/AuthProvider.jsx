import React, { createContext, useState, useEffect } from 'react'
import { supabase, getCurrentUser, resendConfirmation } from '../lib/supabase'

const AuthContext = createContext()

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (currentUser) => {
    try {
      console.log('🔍 Fetching user profile for:', currentUser.email);
      
      // Criar perfil básico imediatamente para evitar carregamento infinito
      const basicProfile = {
        id: currentUser.id,
        auth_id: currentUser.id,
        full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Usuário',
        email: currentUser?.email || '',
        is_admin: currentUser?.email === 'admin@direitai.com',
        email_confirmed_at: currentUser?.email === 'admin@direitai.com' ? new Date().toISOString() : currentUser?.email_confirmed_at
      };
      
      setUserProfile(basicProfile);
      setLoading(false);
      
      // Tentar obter perfil do backend em background (opcional)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://direitai-backend.vercel.app/api';
          const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 segundos de timeout
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Profile fetched from backend:', data);
            setUserProfile(prev => ({ ...prev, ...(data.profile || data) }));
          }
        }
      } catch (backendError) {
         console.log('⚠️ Backend profile fetch failed, using basic profile:', backendError.message);
         // Continua com o perfil básico, não é um erro crítico
       }
    } catch (error) {
      console.error('Erro na busca do perfil:', error);
      // Fallback para perfil básico em caso de erro crítico
      const basicProfile = {
        id: currentUser.id,
        auth_id: currentUser.id,
        full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Usuário',
        email: currentUser?.email || '',
        is_admin: currentUser?.email === 'admin@direitai.com',
        email_confirmed_at: currentUser?.email === 'admin@direitai.com' ? new Date().toISOString() : currentUser?.email_confirmed_at
      };
      setUserProfile(basicProfile);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
            await fetchUserProfile(currentUser);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização da auth:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        // Permitir login do admin sem confirmação de email
        if (!session.user.email_confirmed_at && session.user.email !== 'admin@direitai.com') {
          console.log('❌ Email not confirmed for non-admin user');
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        
        setUser(session.user);
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [])

  const value = {
    user,
    userProfile,
    loading,
    fetchUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
export { AuthContext }