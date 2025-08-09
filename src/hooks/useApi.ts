import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type {
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
  QueryKey,
  InfiniteData
} from '@tanstack/react-query';
import type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  SearchParams,
  FilterParams,
  SortParams
} from '../types/api';

/**
 * Hook genérico para queries com configurações padrão
 */
export const useApiQuery = <TData = unknown, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error) => {
      // Não retry em erros 4xx
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 3;
    },
    ...options
  });
};

/**
 * Hook genérico para mutations com tratamento de erro
 */
export const useApiMutation = <TData = unknown, TError = ApiError, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onError: (error) => {
      // Tratamento padrão de erro
      const message = error && typeof error === 'object' && 'message' in error
        ? (error as any).message
        : 'Ocorreu um erro inesperado';
      
      toast.error(message);
      
      // Chama o onError customizado se fornecido
      options?.onError?.(error, {} as TVariables, undefined);
    },
    onSuccess: (data, variables, context) => {
      // Invalida queries relacionadas por padrão
      queryClient.invalidateQueries();
      
      // Chama o onSuccess customizado se fornecido
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
};

/**
 * Hook para queries infinitas (paginação)
 */
export const useInfiniteApiQuery = <TData = unknown, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: ({ pageParam }: { pageParam?: any }) => Promise<PaginatedResponse<TData>>,
  options?: Omit<UseInfiniteQueryOptions<PaginatedResponse<TData>, TError>, 'queryKey' | 'queryFn'>
) => {
  return useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.has_next) return undefined;
      return lastPage.pagination.page + 1;
    },
    getPreviousPageParam: (firstPage) => {
      if (!firstPage.pagination.has_previous) return undefined;
      return firstPage.pagination.page - 1;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options
  });
};

/**
 * Hook para busca com debounce
 */
export const useSearchQuery = <TData = unknown>(
  searchTerm: string,
  searchFn: (term: string) => Promise<TData>,
  options?: {
    debounceMs?: number;
    minLength?: number;
    enabled?: boolean;
  }
) => {
  const { debounceMs = 300, minLength = 2, enabled = true } = options || {};
  
  return useApiQuery(
    ['search', searchTerm],
    () => searchFn(searchTerm),
    {
      enabled: enabled && searchTerm.length >= minLength,
      staleTime: 30 * 1000, // 30 segundos para busca
      cacheTime: 5 * 60 * 1000, // 5 minutos
    }
  );
};

/**
 * Hook para invalidar queries específicas
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateByKey: (queryKey: QueryKey) => queryClient.invalidateQueries({ queryKey }),
    invalidateByPrefix: (prefix: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith(prefix);
        }
      });
    },
    refetchByKey: (queryKey: QueryKey) => queryClient.refetchQueries({ queryKey }),
    removeByKey: (queryKey: QueryKey) => queryClient.removeQueries({ queryKey }),
    resetByKey: (queryKey: QueryKey) => queryClient.resetQueries({ queryKey })
  };
};

/**
 * Hook para gerenciar cache de queries
 */
export const useQueryCache = () => {
  const queryClient = useQueryClient();
  
  return {
    getQueryData: <TData = unknown>(queryKey: QueryKey): TData | undefined => {
      return queryClient.getQueryData(queryKey);
    },
    setQueryData: <TData = unknown>(queryKey: QueryKey, data: TData) => {
      queryClient.setQueryData(queryKey, data);
    },
    updateQueryData: <TData = unknown>(
      queryKey: QueryKey,
      updater: (oldData: TData | undefined) => TData
    ) => {
      queryClient.setQueryData(queryKey, updater);
    },
    prefetchQuery: async <TData = unknown>(
      queryKey: QueryKey,
      queryFn: () => Promise<TData>
    ) => {
      await queryClient.prefetchQuery({ queryKey, queryFn });
    },
    ensureQueryData: async <TData = unknown>(
      queryKey: QueryKey,
      queryFn: () => Promise<TData>
    ) => {
      return await queryClient.ensureQueryData({ queryKey, queryFn });
    },
    cancelQueries: async (queryKey: QueryKey) => {
      await queryClient.cancelQueries({ queryKey });
    },
    isFetching: (queryKey?: QueryKey) => {
      return queryClient.isFetching({ queryKey });
    },
    isMutating: () => {
      return queryClient.isMutating();
    }
  };
};

/**
 * Hook para otimistic updates
 */
export const useOptimisticUpdate = <TData = unknown>(
  queryKey: QueryKey
) => {
  const queryClient = useQueryClient();
  
  return {
    updateOptimistically: async (
      updater: (oldData: TData | undefined) => TData,
      rollback?: () => void
    ) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey });
      
      // Salva o estado anterior
      const previousData = queryClient.getQueryData<TData>(queryKey);
      
      // Aplica a atualização otimista
      queryClient.setQueryData(queryKey, updater);
      
      // Retorna função de rollback
      return () => {
        queryClient.setQueryData(queryKey, previousData);
        rollback?.();
      };
    }
  };
};

/**
 * Hook para background sync
 */
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();
  
  return {
    syncInBackground: (queryKeys: QueryKey[]) => {
      queryKeys.forEach(queryKey => {
        queryClient.refetchQueries({ 
          queryKey,
          type: 'active'
        });
      });
    },
    syncAll: () => {
      queryClient.refetchQueries({ type: 'active' });
    }
  };
};

/**
 * Hook para retry manual
 */
export const useRetryQuery = () => {
  const queryClient = useQueryClient();
  
  return {
    retry: (queryKey: QueryKey) => {
      queryClient.refetchQueries({ queryKey });
    },
    retryFailed: () => {
      queryClient.refetchQueries({ 
        predicate: (query) => query.state.status === 'error'
      });
    }
  };
};

/**
 * Hook para monitorar status de conexão
 */
export const useConnectionStatus = () => {
  const queryClient = useQueryClient();
  
  return {
    isOnline: navigator.onLine,
    resumeQueries: () => {
      queryClient.resumePausedMutations();
      queryClient.refetchQueries({ type: 'active' });
    },
    pauseQueries: () => {
      // As queries são pausadas automaticamente quando offline
    }
  };
};

/**
 * Hook para queries dependentes
 */
export const useDependentQuery = <TData = unknown, TDependency = unknown>(
  queryKey: QueryKey,
  queryFn: (dependency: TDependency) => Promise<TData>,
  dependency: TDependency | undefined,
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  return useApiQuery(
    [...queryKey, dependency],
    () => queryFn(dependency!),
    {
      enabled: dependency !== undefined,
      ...options
    }
  );
};

/**
 * Hook para queries paralelas
 */
export const useParallelQueries = <T extends Record<string, any>>(
  queries: {
    [K in keyof T]: {
      queryKey: QueryKey;
      queryFn: () => Promise<T[K]>;
      options?: Omit<UseQueryOptions<T[K], ApiError>, 'queryKey' | 'queryFn'>;
    }
  }
) => {
  const results = {} as {
    [K in keyof T]: ReturnType<typeof useApiQuery<T[K]>>
  };
  
  Object.keys(queries).forEach((key) => {
    const query = queries[key as keyof T];
    results[key as keyof T] = useApiQuery(
      query.queryKey,
      query.queryFn,
      query.options
    );
  });
  
  return results;
};

/**
 * Hook para queries com polling
 */
export const usePollingQuery = <TData = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: {
    interval?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) => {
  const { interval = 30000, enabled = true, refetchOnWindowFocus = false } = options || {};
  
  return useApiQuery(
    queryKey,
    queryFn,
    {
      enabled,
      refetchInterval: enabled ? interval : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus,
      refetchOnMount: true,
      refetchOnReconnect: true
    }
  );
};