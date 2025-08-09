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
      
      // Obter sessão atual para ter o token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('❌ No session token available');
        // Criar perfil básico quando não há token
        const basicProfile = {
          id: currentUser.id,
          auth_id: currentUser.id,
          full_name: currentUser?.user_metadata?.full_name || 'Usuário',
          email: currentUser?.email || '',
          is_admin: currentUser?.email === 'admin@direitai.com',
          email_confirmed_at: currentUser?.email === 'admin@direitai.com' ? new Date().toISOString() : currentUser?.email_confirmed_at
        };
        setUserProfile(basicProfile);
        setLoading(false);
        return;
      }
      
      // Fazer requisição para a API do backend
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://direitai-backend.vercel.app/api';
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile fetched successfully:', data);
        setUserProfile(data.profile || data);
        setLoading(false);
      } else {
        console.error('❌ Failed to fetch profile:', response.status, response.statusText);
        // Fallback para perfil básico
        const basicProfile = {
          id: currentUser.id,
          auth_id: currentUser.id,
          full_name: currentUser?.user_metadata?.full_name || 'Usuário',
          email: currentUser?.email || '',
          is_admin: currentUser?.email === 'admin@direitai.com',
          email_confirmed_at: currentUser?.email === 'admin@direitai.com' ? new Date().toISOString() : currentUser?.email_confirmed_at
        };
        setUserProfile(basicProfile);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro na busca do perfil:', error);
      // Fallback para perfil básico
      const basicProfile = {
        id: currentUser.id,
        auth_id: currentUser.id,
        full_name: currentUser?.user_metadata?.full_name || 'Usuário',
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
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro na inicialização da auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        // Permitir login do admin sem confirmação de email
        if (!session.user.email_confirmed_at && session.user.email !== 'admin@direitai.com') {
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