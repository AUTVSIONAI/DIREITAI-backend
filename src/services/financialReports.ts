import { apiClient } from '../lib/api'

export interface FinancialOverview {
  totalRevenue: number
  monthlyGrowth: number
  totalSubscriptions: number
  subscriptionGrowth: number
  averageOrderValue: number
  aovGrowth: number
  churnRate: number
  churnChange: number
}

export interface RevenueByPlan {
  plan: string
  revenue: number
  subscribers: number
  percentage: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  subscriptions: number
  orders: number
}

export interface TopProduct {
  name: string
  revenue: number
  units: number
  growth: number
}

export interface Transaction {
  id: string
  type: 'subscription' | 'product'
  customer: string
  plan?: string
  description?: string
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  date: string
  method: 'credit_card' | 'pix' | 'boleto' | 'debit_card'
}

export interface FinancialFilters {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
  plan?: string
  status?: string
}

export class FinancialReportsService {
  static async getOverview(filters?: FinancialFilters): Promise<FinancialOverview> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.get(`/admin/financial/overview?${params.toString()}`)
    return response.data
  }

  static async getRevenueByPlan(filters?: FinancialFilters): Promise<RevenueByPlan[]> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.get(`/admin/financial/revenue-by-plan?${params.toString()}`)
    return response.data
  }

  static async getMonthlyRevenue(filters?: FinancialFilters): Promise<MonthlyRevenue[]> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.get(`/admin/financial/monthly-revenue?${params.toString()}`)
    return response.data
  }

  static async getTopProducts(filters?: FinancialFilters): Promise<TopProduct[]> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.get(`/admin/financial/top-products?${params.toString()}`)
    return response.data
  }

  static async getTransactions(filters?: FinancialFilters & { page?: number; limit?: number }): Promise<{
    transactions: Transaction[]
    total: number
    page: number
    totalPages: number
  }> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    const response = await apiClient.get(`/admin/financial/transactions?${params.toString()}`)
    return response.data
  }

  static async exportReport(type: 'overview' | 'transactions' | 'revenue', filters?: FinancialFilters): Promise<Blob> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.download(`/admin/financial/export/${type}?${params.toString()}`)
    return response
  }

  static async getRevenueMetrics(filters?: FinancialFilters): Promise<{
    totalRevenue: number
    recurringRevenue: number
    oneTimeRevenue: number
    refunds: number
    netRevenue: number
  }> {
    const params = new URLSearchParams()
    if (filters?.period) params.append('period', filters.period)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    
    const response = await apiClient.get(`/admin/financial/metrics?${params.toString()}`)
    return response.data
  }
}

// Create and export singleton instance
export const financialReportsService = new FinancialReportsService();

export default FinancialReportsService