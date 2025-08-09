import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { AdminService } from '../../../services/admin';

const ApiLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  // Função para carregar logs da API
  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular chamada da API - substituir por AdminService.getApiLogs() quando disponível
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            logs: [
              {
                id: 1,
                timestamp: new Date(Date.now() - 1000 * 60 * 5),
                method: 'POST',
                endpoint: '/api/auth/login',
                status: 200,
                responseTime: 245,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ip: '192.168.1.100',
                userId: 'user123'
              },
              {
                id: 2,
                timestamp: new Date(Date.now() - 1000 * 60 * 10),
                method: 'GET',
                endpoint: '/api/events',
                status: 200,
                responseTime: 120,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ip: '192.168.1.101',
                userId: 'user456'
              },
              {
                id: 3,
                timestamp: new Date(Date.now() - 1000 * 60 * 15),
                method: 'POST',
                endpoint: '/api/ai/chat',
                status: 500,
                responseTime: 5000,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                ip: '192.168.1.102',
                userId: 'user789',
                error: 'Internal Server Error: AI service timeout'
              },
              {
                id: 4,
                timestamp: new Date(Date.now() - 1000 * 60 * 20),
                method: 'PUT',
                endpoint: '/api/users/profile',
                status: 401,
                responseTime: 50,
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
                ip: '192.168.1.103',
                userId: null,
                error: 'Unauthorized: Invalid token'
              },
              {
                id: 5,
                timestamp: new Date(Date.now() - 1000 * 60 * 25),
                method: 'DELETE',
                endpoint: '/api/events/123',
                status: 204,
                responseTime: 180,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ip: '192.168.1.104',
                userId: 'admin001'
              }
            ]
          });
        }, 1000);
      });
      
      if (response.success) {
        setLogs(response.logs || []);
        setFilteredLogs(response.logs || []);
      } else {
        throw new Error('Falha ao carregar logs');
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      setError('Erro ao carregar logs. Tente novamente.');
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.includes(searchTerm) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'success') {
        filtered = filtered.filter(log => log.status >= 200 && log.status < 300);
      } else if (statusFilter === 'error') {
        filtered = filtered.filter(log => log.status >= 400);
      }
    }

    // Filtro por método
    if (methodFilter !== 'all') {
      filtered = filtered.filter(log => log.method === methodFilter);
    }

    // Filtro por data
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(log => log.timestamp >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(log => log.timestamp >= weekAgo);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, statusFilter, methodFilter, dateFilter]);

  const getStatusIcon = (status) => {
    if (status >= 200 && status < 300) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (status >= 400 && status < 500) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    } else if (status >= 500) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
    return <ClockIcon className="h-5 w-5 text-gray-500" />;
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800';
      case 'POST': return 'bg-green-100 text-green-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const refreshLogs = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs([...mockLogs]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Logs da API
            </h3>
            <button
              onClick={refreshLogs}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Endpoint, IP ou usuário..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">Todos</option>
                <option value="success">Sucesso (2xx)</option>
                <option value="error">Erro (4xx/5xx)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">Todos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="today">Hoje</option>
                <option value="week">Última semana</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>

          {/* Tabela de Logs */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tempo (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      Carregando logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : 'Data não disponível'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(log.status)}
                          <span className={`ml-2 text-sm font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={log.responseTime > 1000 ? 'text-red-600 font-medium' : ''}>
                          {log.responseTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userId || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Estatísticas */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Requisições com Sucesso
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {filteredLogs.filter(log => log.status >= 200 && log.status < 300).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircleIcon className="h-8 w-8 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Requisições com Erro
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {filteredLogs.filter(log => log.status >= 400).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tempo Médio (ms)
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {filteredLogs.length > 0 
                          ? Math.round(filteredLogs.reduce((acc, log) => acc + log.responseTime, 0) / filteredLogs.length)
                          : 0
                        }
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FunnelIcon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Filtrado
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {filteredLogs.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiLogs;