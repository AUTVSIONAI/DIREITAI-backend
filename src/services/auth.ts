import { supabase } from '../lib/supabase';
import type {
  UserProfile,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  AuthResponse,
  PasswordResetData,
  PasswordUpdateData,
  UserStats,
  UserPreferences
} from '../types';

/**
 * Serviço de autenticação usando Supabase
 */
export class AuthService {
  /**
   * Fazer login com email e senha
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        user: data.user,
        session: data.session,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Registrar novo usuário
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            username: userData.username
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Criar perfil do usuário
      if (data.user) {
        await this.createUserProfile({
          id: data.user.id,
          email: userData.email,
          fullName: userData.fullName,
          username: userData.username,
          avatar: null,
          bio: null,
          role: 'user',
          isEmailVerified: false,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      return {
        user: data.user,
        session: data.session,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Fazer logout
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Obter usuário atual
   */
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw new Error(error.message);
      }

      return user;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  /**
   * Obter sessão atual
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(error.message);
      }

      return session;
    } catch (error) {
      console.error('Erro ao obter sessão atual:', error);
      return null;
    }
  }

  /**
   * Solicitar redefinição de senha
   */
  static async requestPasswordReset(data: PasswordResetData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Atualizar senha
   */
  static async updatePassword(data: PasswordUpdateData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verificar email
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Reenviar email de verificação
   */
  static async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Criar perfil do usuário
   */
  static async createUserProfile(profile: UserProfile): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profile])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Obter perfil do usuário
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Usuário não encontrado
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      return null;
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  static async updateUserProfile(userId: string, updates: UpdateProfileData): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Obter estatísticas do usuário
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Aqui você implementaria as queries para obter as estatísticas
      // Por exemplo: total de posts, comentários, likes, etc.
      const { data, error } = await supabase
        .rpc('get_user_stats', { user_id: userId });

      if (error) {
        throw new Error(error.message);
      }

      return data || {
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        totalViews: 0,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do usuário:', error);
      return {
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        totalViews: 0,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
    }
  }

  /**
   * Obter preferências do usuário
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('userId', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Criar preferências padrão se não existirem
          return await this.createDefaultUserPreferences(userId);
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Erro ao obter preferências do usuário:', error);
      return await this.createDefaultUserPreferences(userId);
    }
  }

  /**
   * Criar preferências padrão do usuário
   */
  static async createDefaultUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPreferences: UserPreferences = {
      userId,
      theme: 'system',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      weeklyDigest: true,
      instantNotifications: true,
      soundEnabled: true,
      autoPlayVideos: false,
      showOnlineStatus: true,
      allowDirectMessages: true,
      showEmail: false,
      showPhone: false,
      twoFactorEnabled: false,
      loginAlerts: true,
      dataExportFormat: 'json',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert([defaultPreferences])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar preferências padrão:', error);
      return defaultPreferences;
    }
  }

  /**
   * Atualizar preferências do usuário
   */
  static async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Deletar conta do usuário
   */
  static async deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Primeiro, marcar o perfil como inativo
      await supabase
        .from('user_profiles')
        .update({ isActive: false })
        .eq('id', userId);

      // Em seguida, deletar o usuário do auth
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Atualizar último login
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('user_profiles')
        .update({ 
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }
  }

  /**
   * Verificar se username está disponível
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (error && error.code === 'PGRST116') {
        return true; // Username não encontrado, está disponível
      }

      return false; // Username já existe
    } catch (error) {
      console.error('Erro ao verificar username:', error);
      return false;
    }
  }

  /**
   * Verificar se email está disponível
   */
  static async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (error && error.code === 'PGRST116') {
        return true; // Email não encontrado, está disponível
      }

      return false; // Email já existe
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    }
  }
}

export default AuthService;