import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthProvider';
import type { UserProfile, LoginCredentials, RegisterData, UpdateProfileData } from '../types/auth';

/**
 * Hook para acessar o contexto de autenticação
 * @returns Contexto de autenticação com estado do usuário e funções de auth
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};

/**
 * Hook para verificar se o usuário está autenticado
 * @returns Boolean indicando se o usuário está autenticado
 */
export const useIsAuthenticated = (): boolean => {
  const { user, isLoading } = useAuth();
  return !isLoading && !!user;
};

/**
 * Hook para verificar se o usuário tem uma permissão específica
 * @param permission - Permissão a ser verificada
 * @returns Boolean indicando se o usuário tem a permissão
 */
export const useHasPermission = (permission: string): boolean => {
  const { user } = useAuth();
  return user?.permissions?.includes(permission) ?? false;
};

/**
 * Hook para verificar se o usuário tem um papel específico
 * @param role - Papel a ser verificado
 * @returns Boolean indicando se o usuário tem o papel
 */
export const useHasRole = (role: string): boolean => {
  const { user } = useAuth();
  return user?.role === role || user?.roles?.includes(role) ?? false;
};

/**
 * Hook para verificar se o usuário tem qualquer um dos papéis especificados
 * @param roles - Array de papéis a serem verificados
 * @returns Boolean indicando se o usuário tem pelo menos um dos papéis
 */
export const useHasAnyRole = (roles: string[]): boolean => {
  const { user } = useAuth();
  if (!user) return false;
  
  return roles.some(role => 
    user.role === role || user.roles?.includes(role)
  );
};

/**
 * Hook para verificar se o usuário tem todas as permissões especificadas
 * @param permissions - Array de permissões a serem verificadas
 * @returns Boolean indicando se o usuário tem todas as permissões
 */
export const useHasAllPermissions = (permissions: string[]): boolean => {
  const { user } = useAuth();
  if (!user?.permissions) return false;
  
  return permissions.every(permission => 
    user.permissions!.includes(permission)
  );
};

/**
 * Hook para verificar se o usuário tem pelo menos uma das permissões especificadas
 * @param permissions - Array de permissões a serem verificadas
 * @returns Boolean indicando se o usuário tem pelo menos uma permissão
 */
export const useHasAnyPermission = (permissions: string[]): boolean => {
  const { user } = useAuth();
  if (!user?.permissions) return false;
  
  return permissions.some(permission => 
    user.permissions!.includes(permission)
  );
};

/**
 * Hook para verificar se o usuário é administrador
 * @returns Boolean indicando se o usuário é admin
 */
export const useIsAdmin = (): boolean => {
  return useHasRole('admin') || useHasRole('super_admin');
};

/**
 * Hook para verificar se o usuário é moderador
 * @returns Boolean indicando se o usuário é moderador
 */
export const useIsModerator = (): boolean => {
  return useHasAnyRole(['admin', 'super_admin', 'moderator']);
};

/**
 * Hook para verificar se o usuário pode acessar o painel administrativo
 * @returns Boolean indicando se o usuário pode acessar o admin
 */
export const useCanAccessAdmin = (): boolean => {
  return useHasAnyPermission(['admin.access', 'admin.read']) || useIsAdmin();
};

/**
 * Hook para obter informações do perfil do usuário
 * @returns Perfil do usuário ou null
 */
export const useUserProfile = (): UserProfile | null => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook para obter estatísticas do usuário
 * @returns Estatísticas do usuário
 */
export const useUserStats = () => {
  const { user } = useAuth();
  return {
    totalEvents: user?.stats?.total_events ?? 0,
    totalPurchases: user?.stats?.total_purchases ?? 0,
    totalSpent: user?.stats?.total_spent ?? 0,
    memberSince: user?.created_at ? new Date(user.created_at) : null,
    lastLogin: user?.last_login_at ? new Date(user.last_login_at) : null,
    points: user?.points ?? 0,
    level: user?.level ?? 1,
    achievements: user?.achievements ?? [],
    badges: user?.badges ?? []
  };
};

/**
 * Hook para verificar se o usuário completou o onboarding
 * @returns Boolean indicando se o onboarding foi completado
 */
export const useHasCompletedOnboarding = (): boolean => {
  const { user } = useAuth();
  return user?.onboarding_completed ?? false;
};

/**
 * Hook para verificar se o perfil do usuário está completo
 * @returns Boolean indicando se o perfil está completo
 */
export const useIsProfileComplete = (): boolean => {
  const { user } = useAuth();
  if (!user) return false;
  
  const requiredFields = ['first_name', 'last_name', 'email'];
  return requiredFields.every(field => {
    const value = user[field as keyof UserProfile];
    return value && value.toString().trim() !== '';
  });
};

/**
 * Hook para verificar se o email do usuário foi verificado
 * @returns Boolean indicando se o email foi verificado
 */
export const useIsEmailVerified = (): boolean => {
  const { user } = useAuth();
  return user?.email_verified ?? false;
};

/**
 * Hook para verificar se o usuário tem uma assinatura ativa
 * @returns Boolean indicando se tem assinatura ativa
 */
export const useHasActiveSubscription = (): boolean => {
  const { user } = useAuth();
  if (!user?.subscription) return false;
  
  const now = new Date();
  const expiresAt = new Date(user.subscription.expires_at);
  
  return user.subscription.status === 'active' && expiresAt > now;
};

/**
 * Hook para verificar o tipo de assinatura do usuário
 * @returns Tipo de assinatura ou null
 */
export const useSubscriptionType = (): string | null => {
  const { user } = useAuth();
  return user?.subscription?.type ?? null;
};

/**
 * Hook para verificar se o usuário pode acessar recursos premium
 * @returns Boolean indicando se pode acessar premium
 */
export const useCanAccessPremium = (): boolean => {
  const hasSubscription = useHasActiveSubscription();
  const subscriptionType = useSubscriptionType();
  
  return hasSubscription && (subscriptionType === 'premium' || subscriptionType === 'vip');
};

/**
 * Hook para verificar se o usuário pode acessar recursos VIP
 * @returns Boolean indicando se pode acessar VIP
 */
export const useCanAccessVIP = (): boolean => {
  const hasSubscription = useHasActiveSubscription();
  const subscriptionType = useSubscriptionType();
  
  return hasSubscription && subscriptionType === 'vip';
};

/**
 * Hook para obter as preferências do usuário
 * @returns Preferências do usuário
 */
export const useUserPreferences = () => {
  const { user } = useAuth();
  return user?.preferences ?? {
    theme: 'system',
    language: 'pt-BR',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false
    },
    privacy: {
      profile_visibility: 'public',
      show_email: false,
      show_phone: false,
      allow_messages: true
    }
  };
};

/**
 * Hook para verificar se o usuário está online
 * @returns Boolean indicando se está online
 */
export const useIsUserOnline = (): boolean => {
  const { user } = useAuth();
  if (!user?.last_seen_at) return false;
  
  const lastSeen = new Date(user.last_seen_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
  
  return diffMinutes <= 5; // Considera online se visto nos últimos 5 minutos
};

/**
 * Hook para obter o avatar do usuário
 * @returns URL do avatar ou avatar padrão
 */
export const useUserAvatar = (): string => {
  const { user } = useAuth();
  
  if (user?.avatar_url) {
    return user.avatar_url;
  }
  
  // Gerar avatar baseado nas iniciais
  const initials = user?.first_name && user?.last_name 
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=ffffff&size=128`;
};

/**
 * Hook para obter o nome completo do usuário
 * @returns Nome completo ou email se nome não disponível
 */
export const useUserDisplayName = (): string => {
  const { user } = useAuth();
  
  if (user?.first_name && user?.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  
  if (user?.first_name) {
    return user.first_name;
  }
  
  return user?.email ?? 'Usuário';
};

/**
 * Hook para verificar se o usuário pode editar um recurso
 * @param resourceUserId - ID do usuário dono do recurso
 * @returns Boolean indicando se pode editar
 */
export const useCanEdit = (resourceUserId: string): boolean => {
  const { user } = useAuth();
  const isOwner = user?.id === resourceUserId;
  const isAdmin = useIsAdmin();
  const isModerator = useIsModerator();
  
  return isOwner || isAdmin || isModerator;
};

/**
 * Hook para verificar se o usuário pode deletar um recurso
 * @param resourceUserId - ID do usuário dono do recurso
 * @returns Boolean indicando se pode deletar
 */
export const useCanDelete = (resourceUserId: string): boolean => {
  const { user } = useAuth();
  const isOwner = user?.id === resourceUserId;
  const isAdmin = useIsAdmin();
  
  return isOwner || isAdmin;
};