import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Hook para localStorage com tipagem e serialização automática
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    onError?: (error: Error) => void;
  }
) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError
  } = options || {};

  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler localStorage para chave "${key}":`, error);
      onError?.(error as Error);
      return initialValue;
    }
  });

  // Função para definir valor
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialize(valueToStore));
        }
      } catch (error) {
        console.error(`Erro ao salvar no localStorage para chave "${key}":`, error);
        onError?.(error as Error);
      }
    },
    [key, serialize, storedValue, onError]
  );

  // Função para remover valor
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Erro ao remover do localStorage para chave "${key}":`, error);
      onError?.(error as Error);
    }
  }, [key, initialValue, onError]);

  return [storedValue, setValue, removeValue] as const;
};

/**
 * Hook para sessionStorage com tipagem e serialização automática
 */
export const useSessionStorage = <T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    onError?: (error: Error) => void;
  }
) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError
  } = options || {};

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.sessionStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler sessionStorage para chave "${key}":`, error);
      onError?.(error as Error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, serialize(valueToStore));
        }
      } catch (error) {
        console.error(`Erro ao salvar no sessionStorage para chave "${key}":`, error);
        onError?.(error as Error);
      }
    },
    [key, serialize, storedValue, onError]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Erro ao remover do sessionStorage para chave "${key}":`, error);
      onError?.(error as Error);
    }
  }, [key, initialValue, onError]);

  return [storedValue, setValue, removeValue] as const;
};

/**
 * Hook para detectar mudanças no storage entre abas
 */
export const useStorageSync = <T>(
  key: string,
  initialValue: T,
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
) => {
  const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
  const [value, setValue] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch {
          setValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  const updateValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      storage.setItem(key, JSON.stringify(valueToStore));
    },
    [key, value, storage]
  );

  return [value, updateValue] as const;
};

/**
 * Hook para cache com expiração
 */
export const useCacheStorage = <T>(
  key: string,
  ttl: number = 5 * 60 * 1000 // 5 minutos por padrão
) => {
  const getCachedValue = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { value, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      
      return value;
    } catch {
      return null;
    }
  }, [key, ttl]);

  const setCachedValue = useCallback(
    (value: T) => {
      try {
        const cacheData = {
          value,
          timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Erro ao salvar no cache:', error);
      }
    },
    [key]
  );

  const removeCachedValue = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  const isCacheValid = useCallback((): boolean => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return false;
      
      const { timestamp } = JSON.parse(cached);
      return Date.now() - timestamp <= ttl;
    } catch {
      return false;
    }
  }, [key, ttl]);

  return {
    getCachedValue,
    setCachedValue,
    removeCachedValue,
    isCacheValid
  };
};

/**
 * Hook para preferências do usuário
 */
export const useUserPreferences = <T extends Record<string, any>>(
  defaultPreferences: T
) => {
  const [preferences, setPreferences, removePreferences] = useLocalStorage(
    'user-preferences',
    defaultPreferences
  );

  const updatePreference = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPreferences(prev => ({
        ...prev,
        [key]: value
      }));
    },
    [setPreferences]
  );

  const updatePreferences = useCallback(
    (updates: Partial<T>) => {
      setPreferences(prev => ({
        ...prev,
        ...updates
      }));
    },
    [setPreferences]
  );

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, [setPreferences, defaultPreferences]);

  const getPreference = useCallback(
    <K extends keyof T>(key: K): T[K] => {
      return preferences[key];
    },
    [preferences]
  );

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    removePreferences,
    getPreference
  };
};

/**
 * Hook para histórico de navegação local
 */
export const useNavigationHistory = (maxItems: number = 10) => {
  const [history, setHistory] = useLocalStorage<string[]>('navigation-history', []);

  const addToHistory = useCallback(
    (path: string) => {
      setHistory(prev => {
        const newHistory = [path, ...prev.filter(p => p !== path)];
        return newHistory.slice(0, maxItems);
      });
    },
    [setHistory, maxItems]
  );

  const removeFromHistory = useCallback(
    (path: string) => {
      setHistory(prev => prev.filter(p => p !== path));
    },
    [setHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const getRecentPaths = useCallback(
    (count: number = 5) => {
      return history.slice(0, count);
    },
    [history]
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentPaths
  };
};

/**
 * Hook para dados de formulário temporários
 */
export const useFormDraft = <T extends Record<string, any>>(
  formId: string,
  initialData: T
) => {
  const key = `form-draft-${formId}`;
  const [draft, setDraft] = useLocalStorage(key, initialData);

  const updateDraft = useCallback(
    (updates: Partial<T>) => {
      setDraft(prev => ({
        ...prev,
        ...updates
      }));
    },
    [setDraft]
  );

  const clearDraft = useCallback(() => {
    setDraft(initialData);
  }, [setDraft, initialData]);

  const hasDraft = useCallback(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialData);
  }, [draft, initialData]);

  const restoreDraft = useCallback(() => {
    return draft;
  }, [draft]);

  return {
    draft,
    updateDraft,
    clearDraft,
    hasDraft,
    restoreDraft
  };
};

/**
 * Hook para configurações da aplicação
 */
export const useAppSettings = () => {
  const defaultSettings = {
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'BRL',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      analytics: true,
      marketing: false,
      functional: true
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium'
    }
  };

  const [settings, setSettings] = useLocalStorage('app-settings', defaultSettings);

  const updateSetting = useCallback(
    (path: string, value: any) => {
      setSettings(prev => {
        const keys = path.split('.');
        const newSettings = { ...prev };
        let current: any = newSettings;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        return newSettings;
      });
    },
    [setSettings]
  );

  const getSetting = useCallback(
    (path: string) => {
      const keys = path.split('.');
      let current: any = settings;
      
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return undefined;
        }
      }
      
      return current;
    },
    [settings]
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings]);

  return {
    settings,
    updateSetting,
    getSetting,
    resetSettings
  };
};

/**
 * Hook para detectar capacidade de armazenamento
 */
export const useStorageCapacity = () => {
  const [capacity, setCapacity] = useState<{
    localStorage: { used: number; available: number; total: number };
    sessionStorage: { used: number; available: number; total: number };
  } | null>(null);

  useEffect(() => {
    const checkCapacity = () => {
      try {
        const testKey = '__storage_test__';
        const testValue = 'x';
        
        // Teste localStorage
        let localStorageSize = 0;
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageSize += localStorage[key].length + key.length;
          }
        }
        
        // Teste sessionStorage
        let sessionStorageSize = 0;
        for (const key in sessionStorage) {
          if (sessionStorage.hasOwnProperty(key)) {
            sessionStorageSize += sessionStorage[key].length + key.length;
          }
        }
        
        // Estima capacidade total (geralmente 5-10MB)
        const estimatedTotal = 5 * 1024 * 1024; // 5MB
        
        setCapacity({
          localStorage: {
            used: localStorageSize,
            available: estimatedTotal - localStorageSize,
            total: estimatedTotal
          },
          sessionStorage: {
            used: sessionStorageSize,
            available: estimatedTotal - sessionStorageSize,
            total: estimatedTotal
          }
        });
      } catch (error) {
        console.error('Erro ao verificar capacidade de armazenamento:', error);
      }
    };

    checkCapacity();
  }, []);

  const isStorageFull = useCallback(
    (storageType: 'localStorage' | 'sessionStorage', threshold = 0.9) => {
      if (!capacity) return false;
      const storage = capacity[storageType];
      return storage.used / storage.total > threshold;
    },
    [capacity]
  );

  return {
    capacity,
    isStorageFull
  };
};