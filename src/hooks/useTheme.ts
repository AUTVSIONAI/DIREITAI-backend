import { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * Hook para acessar o contexto de tema
 * @returns Contexto de tema com estado atual e funções de controle
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  
  return context;
};

/**
 * Hook para detectar se o sistema está em modo escuro
 * @returns Boolean indicando se o sistema prefere modo escuro
 */
export const useSystemTheme = (): 'light' | 'dark' => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
};

/**
 * Hook para obter o tema efetivo (resolvendo 'system' para 'light' ou 'dark')
 * @returns Tema efetivo ('light' ou 'dark')
 */
export const useEffectiveTheme = (): 'light' | 'dark' => {
  const { theme } = useTheme();
  const systemTheme = useSystemTheme();
  
  return theme === 'system' ? systemTheme : theme;
};

/**
 * Hook para verificar se o tema atual é escuro
 * @returns Boolean indicando se o tema é escuro
 */
export const useIsDarkTheme = (): boolean => {
  const effectiveTheme = useEffectiveTheme();
  return effectiveTheme === 'dark';
};

/**
 * Hook para verificar se o tema atual é claro
 * @returns Boolean indicando se o tema é claro
 */
export const useIsLightTheme = (): boolean => {
  const effectiveTheme = useEffectiveTheme();
  return effectiveTheme === 'light';
};

/**
 * Hook para alternar entre temas claro e escuro
 * @returns Função para alternar o tema
 */
export const useToggleTheme = () => {
  const { theme, setTheme } = useTheme();
  const systemTheme = useSystemTheme();
  
  return () => {
    if (theme === 'system') {
      // Se está em system, muda para o oposto do sistema
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Se está em light ou dark, alterna
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };
};

/**
 * Hook para aplicar classes CSS baseadas no tema
 * @param lightClass - Classe para tema claro
 * @param darkClass - Classe para tema escuro
 * @returns Classe CSS apropriada para o tema atual
 */
export const useThemeClass = (lightClass: string, darkClass: string): string => {
  const isDark = useIsDarkTheme();
  return isDark ? darkClass : lightClass;
};

/**
 * Hook para obter estilos baseados no tema
 * @param lightStyles - Estilos para tema claro
 * @param darkStyles - Estilos para tema escuro
 * @returns Estilos apropriados para o tema atual
 */
export const useThemeStyles = <T extends Record<string, any>>(
  lightStyles: T,
  darkStyles: T
): T => {
  const isDark = useIsDarkTheme();
  return isDark ? darkStyles : lightStyles;
};

/**
 * Hook para obter cores baseadas no tema
 * @returns Objeto com cores do tema atual
 */
export const useThemeColors = () => {
  const isDark = useIsDarkTheme();
  
  return {
    // Cores principais
    primary: isDark ? '#3b82f6' : '#2563eb',
    secondary: isDark ? '#64748b' : '#475569',
    accent: isDark ? '#f59e0b' : '#d97706',
    
    // Cores de fundo
    background: isDark ? '#0f172a' : '#ffffff',
    surface: isDark ? '#1e293b' : '#f8fafc',
    card: isDark ? '#334155' : '#ffffff',
    
    // Cores de texto
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#cbd5e1' : '#64748b',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
    
    // Cores de borda
    border: isDark ? '#334155' : '#e2e8f0',
    borderLight: isDark ? '#475569' : '#f1f5f9',
    
    // Cores de estado
    success: isDark ? '#10b981' : '#059669',
    warning: isDark ? '#f59e0b' : '#d97706',
    error: isDark ? '#ef4444' : '#dc2626',
    info: isDark ? '#06b6d4' : '#0891b2',
    
    // Cores de interação
    hover: isDark ? '#475569' : '#f1f5f9',
    active: isDark ? '#64748b' : '#e2e8f0',
    focus: isDark ? '#3b82f6' : '#2563eb',
    
    // Cores de overlay
    overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    backdrop: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(248, 250, 252, 0.9)',
  };
};

/**
 * Hook para detectar mudanças no tema do sistema
 * @param callback - Função chamada quando o tema do sistema muda
 */
export const useSystemThemeChange = (callback: (theme: 'light' | 'dark') => void) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [callback]);
};

/**
 * Hook para persistir preferências de tema
 * @returns Funções para salvar e carregar preferências
 */
export const useThemePreferences = () => {
  const { theme, setTheme } = useTheme();
  
  const savePreference = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme-preference', newTheme);
  };
  
  const loadPreference = (): 'light' | 'dark' | 'system' => {
    if (typeof window === 'undefined') return 'system';
    
    const saved = localStorage.getItem('theme-preference');
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved as 'light' | 'dark' | 'system';
    }
    
    return 'system';
  };
  
  const clearPreference = () => {
    localStorage.removeItem('theme-preference');
    setTheme('system');
  };
  
  return {
    currentTheme: theme,
    savePreference,
    loadPreference,
    clearPreference
  };
};

/**
 * Hook para aplicar tema ao documento
 */
export const useApplyTheme = () => {
  const effectiveTheme = useEffectiveTheme();
  
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove classes de tema existentes
    root.classList.remove('light', 'dark');
    
    // Adiciona a classe do tema atual
    root.classList.add(effectiveTheme);
    
    // Atualiza meta theme-color para dispositivos móveis
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        effectiveTheme === 'dark' ? '#0f172a' : '#ffffff'
      );
    }
    
    // Atualiza cor da barra de status no Safari
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      metaStatusBar.setAttribute(
        'content',
        effectiveTheme === 'dark' ? 'black-translucent' : 'default'
      );
    }
  }, [effectiveTheme]);
};

/**
 * Hook para detectar preferência de movimento reduzido
 * @returns Boolean indicando se o usuário prefere movimento reduzido
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook para detectar preferência de alto contraste
 * @returns Boolean indicando se o usuário prefere alto contraste
 */
export const usePrefersHighContrast = (): boolean => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};