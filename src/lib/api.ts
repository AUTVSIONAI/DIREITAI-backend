import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiClient, ApiResponse, RequestOptions, ApiMetrics, HealthCheck } from '../types/api';
import { supabase } from './supabase';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://direitai-backend.vercel.app/api';

// Log da URL da API para debug
console.log('🔗 API Base URL:', API_BASE_URL);

class ApiClientImpl implements ApiClient {
  private axiosInstance: AxiosInstance;
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null
  };

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token de autenticação
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          // Garantir que headers existe
          if (!config.headers) {
            config.headers = {};
          }
          
          // Tentar obter o token de forma mais direta
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log('🔐 Session check:', session ? 'Found' : 'Not found');
          
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            console.log('✅ Token added to request:', config.url);
            console.log('🔍 Token preview:', session.access_token.substring(0, 50) + '...');
          } else {
            console.log('❌ No token available for request:', config.url);
            // Tentar refresh da sessão
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession?.access_token) {
              config.headers.Authorization = `Bearer ${refreshedSession.access_token}`;
              console.log('✅ Refreshed token added to request:', config.url);
            }
          }
        } catch (error) {
          console.warn('Erro ao obter sessão do Supabase:', error);
        }
        
        // Métricas
        this.metrics.totalRequests++;
        this.metrics.lastRequestTime = new Date();
        
        return config;
      },
      (error) => {
        this.metrics.failedRequests++;
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar respostas
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.metrics.successfulRequests++;
        return response;
      },
      (error) => {
        this.metrics.failedRequests++;
        
        // Tratar erros de autenticação
        if (error.response?.status === 401) {
          // Limpar sessão do Supabase
          supabase.auth.signOut();
          // Redirecionar para login apenas se não estiver em páginas públicas
          const publicPaths = ['/login', '/register', '/'];
          if (!publicPaths.includes(window.location.pathname)) {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const startTime = Date.now();
      console.log('🚀 Making request:', config.method?.toUpperCase(), config.url);
      console.log('📦 Request data:', config.data);
      
      const response = await this.axiosInstance.request(config);
      const endTime = Date.now();
      
      // Atualizar métricas de tempo de resposta
      const responseTime = endTime - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / 2;
      this.metrics.successfulRequests++;
      
      console.log('✅ Request successful:', response.status, response.statusText);
      
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        success: true
      };
    } catch (error: any) {
      this.metrics.failedRequests++;
      
      console.error('❌ Request failed:', error.response?.status, error.response?.statusText);
      console.error('❌ Error data:', error.response?.data);
      
      // Para erros 400, 401, etc., ainda queremos lançar o erro para que o frontend possa tratá-lo
      throw error;
    }
  }

  async get<T = any>(url: string, config?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'GET',
      url,
      ...config
    });
  }

  async post<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'POST',
      url,
      data,
      ...config
    });
  }

  async put<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'PUT',
      url,
      data,
      ...config
    });
  }

  async patch<T = any>(url: string, data?: any, config?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'PATCH',
      url,
      data,
      ...config
    });
  }

  async delete<T = any>(url: string, config?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'DELETE',
      url,
      ...config
    });
  }

  async upload<T = any>(url: string, file: File | FormData, config?: RequestOptions): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.makeRequest<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    });
  }

  async download(url: string, config?: RequestOptions): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      responseType: 'blob',
      ...config
    });
    return response.data;
  }

  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  async healthCheck(): Promise<HealthCheck> {
    try {
      const response = await this.get('/health');
      return {
        status: 'healthy',
        timestamp: new Date(),
        services: response.data?.services || {},
        version: response.data?.version || '1.0.0'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        services: {},
        version: '1.0.0',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Instância singleton do cliente API
export const apiClient = new ApiClientImpl();

// Exportar também a classe para testes
export { ApiClientImpl };

// Configurações adicionais
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};