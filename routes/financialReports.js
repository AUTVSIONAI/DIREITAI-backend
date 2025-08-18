const express = require('express')
const { supabase } = require('../config/supabase');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth')

const router = express.Router()
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Middleware para autenticação de admin
router.use(authenticateUser)
router.use(authenticateAdmin)

// Helper para calcular período
function getPeriodDates(period, startDate, endDate) {
  const now = new Date()
  let start, end
  
  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
  } else {
    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start)
        end.setDate(end.getDate() + 1)
        break
      case 'week':
        start = new Date(now)
        start.setDate(start.getDate() - 7)
        end = new Date(now)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear() + 1, 0, 1)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }
  }
  
  return { start: start.toISOString(), end: end.toISOString() }
}

// GET /admin/financial/overview - Visão geral financeira
router.get('/overview', async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query
    const { start, end } = getPeriodDates(period, start_date, end_date)
    
    // Calcular receita total
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, status, created_at')
      .gte('created_at', start)
      .lt('created_at', end)
      .eq('status', 'completed')
    
    const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    // Calcular crescimento mensal (comparar com período anterior)
    const previousPeriod = getPeriodDates(period, 
      new Date(new Date(start).getTime() - (new Date(end).getTime() - new Date(start).getTime())).toISOString(),
      start
    )
    
    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .gte('created_at', previousPeriod.start)
      .lt('created_at', previousPeriod.end)
      .eq('status', 'completed')
    
    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    
    // Calcular assinaturas ativas
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
    
    const totalSubscriptions = subscriptions?.length || 0
    
    // Calcular valor médio do pedido
    const averageOrderValue = transactions?.length > 0 ? totalRevenue / transactions.length : 0
    
    // Calcular taxa de churn (simplificado)
    const { data: canceledSubs } = await supabase
      .from('user_subscriptions')
      .select('*')
      .gte('updated_at', start)
      .lt('updated_at', end)
      .eq('status', 'canceled')
    
    const churnRate = totalSubscriptions > 0 ? ((canceledSubs?.length || 0) / totalSubscriptions) * 100 : 0
    
    res.json({
      totalRevenue,
      monthlyGrowth,
      totalSubscriptions,
      subscriptionGrowth: 8.3, // Placeholder - calcular baseado em dados históricos
      averageOrderValue,
      aovGrowth: -2.1, // Placeholder - calcular baseado em dados históricos
      churnRate,
      churnChange: -0.8 // Placeholder - calcular baseado em dados históricos
    })
  } catch (error) {
    console.error('Erro ao buscar overview financeiro:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/revenue-by-plan - Receita por plano
router.get('/revenue-by-plan', async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query
    const { start, end } = getPeriodDates(period, start_date, end_date)
    
    const { data: revenueData } = await supabase
      .from('transactions')
      .select(`
        amount,
        user_subscriptions!inner(
          subscription_plans!inner(name)
        )
      `)
      .gte('created_at', start)
      .lt('created_at', end)
      .eq('status', 'completed')
      .eq('type', 'subscription')
    
    // Agrupar por plano
    const planRevenue = {}
    revenueData?.forEach(transaction => {
      const planName = transaction.user_subscriptions?.subscription_plans?.name || 'Desconhecido'
      if (!planRevenue[planName]) {
        planRevenue[planName] = { revenue: 0, count: 0 }
      }
      planRevenue[planName].revenue += transaction.amount || 0
      planRevenue[planName].count += 1
    })
    
    // Calcular total para percentuais
    const totalRevenue = Object.values(planRevenue).reduce((sum, plan) => sum + plan.revenue, 0)
    
    // Contar assinantes por plano
    const { data: subscribers } = await supabase
      .from('user_subscriptions')
      .select(`
        subscription_plans!inner(name)
      `)
      .eq('status', 'active')
    
    const subscriberCount = {}
    subscribers?.forEach(sub => {
      const planName = sub.subscription_plans?.name || 'Desconhecido'
      subscriberCount[planName] = (subscriberCount[planName] || 0) + 1
    })
    
    const result = Object.entries(planRevenue).map(([plan, data]) => ({
      plan,
      revenue: data.revenue,
      subscribers: subscriberCount[plan] || 0,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
    }))
    
    res.json(result)
  } catch (error) {
    console.error('Erro ao buscar receita por plano:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/monthly-revenue - Receita mensal
router.get('/monthly-revenue', async (req, res) => {
  try {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, created_at, type')
      .eq('status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
      .order('created_at', { ascending: true })
    
    // Agrupar por mês
    const monthlyData = {}
    transactions?.forEach(transaction => {
      const date = new Date(transaction.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          revenue: 0,
          subscriptions: 0,
          orders: 0
        }
      }
      
      monthlyData[monthKey].revenue += transaction.amount || 0
      if (transaction.type === 'subscription') {
        monthlyData[monthKey].subscriptions += 1
      } else {
        monthlyData[monthKey].orders += 1
      }
    })
    
    const result = Object.values(monthlyData).slice(-6) // Últimos 6 meses
    res.json(result)
  } catch (error) {
    console.error('Erro ao buscar receita mensal:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/top-products - Produtos mais vendidos
router.get('/top-products', async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query
    const { start, end } = getPeriodDates(period, start_date, end_date)
    
    const { data: productSales } = await supabase
      .from('order_items')
      .select(`
        quantity,
        price,
        orders!inner(
          created_at,
          status
        ),
        products!inner(
          name
        )
      `)
      .gte('orders.created_at', start)
      .lt('orders.created_at', end)
      .eq('orders.status', 'completed')
    
    // Agrupar por produto
    const productStats = {}
    productSales?.forEach(item => {
      const productName = item.products?.name || 'Produto Desconhecido'
      if (!productStats[productName]) {
        productStats[productName] = {
          name: productName,
          revenue: 0,
          units: 0,
          growth: 0 // Placeholder - calcular baseado em dados históricos
        }
      }
      
      productStats[productName].revenue += (item.price || 0) * (item.quantity || 0)
      productStats[productName].units += item.quantity || 0
    })
    
    // Ordenar por receita e pegar top 5
    const result = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(product => ({
        ...product,
        growth: Math.random() * 30 - 10 // Placeholder - implementar cálculo real
      }))
    
    res.json(result)
  } catch (error) {
    console.error('Erro ao buscar produtos mais vendidos:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/transactions - Lista de transações
router.get('/transactions', async (req, res) => {
  try {
    const { 
      period = 'month', 
      start_date, 
      end_date, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query
    
    const { start, end } = getPeriodDates(period, start_date, end_date)
    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    let query = supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        status,
        payment_method,
        created_at,
        users!inner(name),
        user_subscriptions(
          subscription_plans(name)
        ),
        orders(
          order_items(
            products(name)
          )
        )
      `, { count: 'exact' })
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: transactions, count } = await query
    
    const formattedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      customer: transaction.users?.name || 'Usuário Desconhecido',
      plan: transaction.user_subscriptions?.subscription_plans?.name,
      description: transaction.orders?.order_items?.[0]?.products?.name,
      amount: transaction.amount,
      status: transaction.status,
      date: transaction.created_at,
      method: transaction.payment_method
    })) || []
    
    res.json({
      transactions: formattedTransactions,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    })
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/metrics - Métricas de receita
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query
    const { start, end } = getPeriodDates(period, start_date, end_date)
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, status')
      .gte('created_at', start)
      .lt('created_at', end)
    
    const metrics = {
      totalRevenue: 0,
      recurringRevenue: 0,
      oneTimeRevenue: 0,
      refunds: 0,
      netRevenue: 0
    }
    
    transactions?.forEach(transaction => {
      const amount = transaction.amount || 0
      
      if (transaction.status === 'completed') {
        metrics.totalRevenue += amount
        
        if (transaction.type === 'subscription') {
          metrics.recurringRevenue += amount
        } else {
          metrics.oneTimeRevenue += amount
        }
      } else if (transaction.status === 'refunded') {
        metrics.refunds += amount
      }
    })
    
    metrics.netRevenue = metrics.totalRevenue - metrics.refunds
    
    res.json(metrics)
  } catch (error) {
    console.error('Erro ao buscar métricas financeiras:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/financial/export/:type - Exportar relatórios
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params
    const { period = 'month', start_date, end_date } = req.query
    
    // Implementar exportação de relatórios (CSV, PDF, etc.)
    // Por enquanto, retornar erro não implementado
    res.status(501).json({ error: 'Exportação não implementada ainda' })
  } catch (error) {
    console.error('Erro ao exportar relatório:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

module.exports = router