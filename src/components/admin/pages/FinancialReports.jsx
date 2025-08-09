import React, { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Calendar, 
  Download, 
  Filter, 
  BarChart3, 
  PieChart, 
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  RefreshCw,
  Target,
  Wallet,
  ShoppingCart,
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { FinancialReportsService } from '../../../services'

const FinancialReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-01-31'
  })
  
  // Estados para dados reais
  const [overview, setOverview] = useState(null)
  const [revenueByPlan, setRevenueByPlan] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Função para carregar dados reais da API
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [overviewData, revenueByPlanData, monthlyRevenueData, topProductsData, transactionsData] = await Promise.all([
        FinancialReportsService.getOverview(dateRange.start, dateRange.end),
        FinancialReportsService.getRevenueByPlan(dateRange.start, dateRange.end),
        FinancialReportsService.getMonthlyRevenue(dateRange.start, dateRange.end),
        FinancialReportsService.getTopProducts(dateRange.start, dateRange.end),
        FinancialReportsService.getTransactions({ startDate: dateRange.start, endDate: dateRange.end, limit: 10 })
      ])
      
      setOverview(overviewData)
      setRevenueByPlan(Array.isArray(revenueByPlanData) ? revenueByPlanData : [])
      setMonthlyRevenue(Array.isArray(monthlyRevenueData) ? monthlyRevenueData : [])
      setTopProducts(Array.isArray(topProductsData) ? topProductsData : [])
      setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err)
      setError('Erro ao carregar dados financeiros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  
  // Carregar dados ao montar o componente e quando o período mudar
  useEffect(() => {
    loadData()
  }, [dateRange])
  
  const handleRefresh = () => {
    loadData()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Concluído'
      case 'pending': return 'Pendente'
      case 'failed': return 'Falhou'
      default: return status
    }
  }

  const getGrowthIcon = (growth) => {
    if (growth > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />
    } else if (growth < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar dados</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h2>
          <p className="text-gray-600">Análise detalhada de receitas e transações</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
          </select>
          <button className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button onClick={handleRefresh} className="btn-primary flex items-center" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">R$ {overview?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(overview?.monthlyGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(overview?.monthlyGrowth || 0)}`}>
                  {(overview?.monthlyGrowth || 0) > 0 ? '+' : ''}{overview?.monthlyGrowth || 0}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assinantes</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.totalSubscriptions?.toLocaleString('pt-BR') || '0'}</p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(overview?.subscriptionGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(overview?.subscriptionGrowth || 0)}`}>
                  {(overview?.subscriptionGrowth || 0) > 0 ? '+' : ''}{overview?.subscriptionGrowth || 0}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">R$ {overview?.averageOrderValue?.toFixed(2) || '0,00'}</p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(overview?.aovGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(overview?.aovGrowth || 0)}`}>
                  {(overview?.aovGrowth || 0) > 0 ? '+' : ''}{overview?.aovGrowth || 0}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <ShoppingCart className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Churn</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.churnRate || 0}%</p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(overview?.churnChange || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(overview?.churnChange || 0)}`}>
                  {(overview?.churnChange || 0) > 0 ? '+' : ''}{overview?.churnChange || 0}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Evolução da Receita</h3>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="revenue">Receita</option>
              <option value="subscriptions">Assinantes</option>
              <option value="orders">Pedidos</option>
            </select>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Gráfico de linha seria renderizado aqui</p>
              <p className="text-sm text-gray-400">Mostrando evolução mensal</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            {monthlyRevenue.slice(-3).map((month, index) => (
              <div key={month.month}>
                <p className="text-sm text-gray-600">{month.month}</p>
                <p className="font-semibold text-gray-900">
                  {selectedMetric === 'revenue' && `R$ ${month.revenue?.toLocaleString('pt-BR') || '0'}`}
                  {selectedMetric === 'subscriptions' && (month.subscriptions?.toLocaleString('pt-BR') || '0')}
                  {selectedMetric === 'orders' && (month.orders?.toLocaleString('pt-BR') || '0')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por Plano</h3>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg mb-4">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Gráfico de pizza seria renderizado aqui</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {(revenueByPlan || []).map((plan, index) => (
              <div key={plan.plan} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-500' : 
                    index === 1 ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{plan.plan}</p>
                    <p className="text-sm text-gray-600">{plan.subscribers} assinantes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">R$ {plan.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                  <p className="text-sm text-gray-600">{plan.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products and Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
          
          <div className="space-y-4">
            {(topProducts || []).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.units} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">R$ {product.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                  <div className="flex items-center justify-end">
                    {getGrowthIcon(product.growth || 0)}
                    <span className={`text-sm font-medium ${getGrowthColor(product.growth || 0)}`}>
                      {(product.growth || 0) > 0 ? '+' : ''}{product.growth || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pagamento</h3>
          
          <div className="space-y-4">
            {(overview?.paymentMethods || []).map((method, index) => (
              <div key={method.method} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{method.method}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{method.percentage}%</span>
                    <p className="text-sm text-gray-600">R$ {method.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-blue-600' : 
                      index === 1 ? 'bg-green-600' : 'bg-purple-600'
                    }`}
                    style={{width: `${method.percentage}%`}}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Taxa de Aprovação</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">94.2%</p>
            <p className="text-sm text-blue-700">+2.1% vs mês anterior</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
            Ver todas
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(transactions || []).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{transaction.id}</p>
                      <p className="text-sm text-gray-600">{transaction.method}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{transaction.customer}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{transaction.type}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.plan || transaction.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-900">R$ {transaction.amount?.toFixed(2) || '0.00'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Goals */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metas Financeiras</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Receita Mensal</span>
              <span className="text-sm text-gray-600">R$ 45.680 / R$ 50.000</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{width: '91.4%'}}></div>
            </div>
            <p className="text-sm text-gray-600">91.4% da meta atingida</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Novos Assinantes</span>
              <span className="text-sm text-gray-600">1.234 / 1.500</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '82.3%'}}></div>
            </div>
            <p className="text-sm text-gray-600">82.3% da meta atingida</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Churn Rate</span>
              <span className="text-sm text-gray-600">3.2% / 5.0%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{width: '64%'}}></div>
            </div>
            <p className="text-sm text-green-600">Meta superada! 36% abaixo do limite</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinancialReports