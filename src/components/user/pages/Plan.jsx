import React, { useState, useEffect } from 'react'
import { Crown, Star, Zap, Check, X, Users, MessageSquare, Trophy, Shield } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/api'
import { useNavigate } from 'react-router-dom'

const Plan = () => {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedUpgrade, setSelectedUpgrade] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Planos de fallback
  const fallbackPlans = [
    {
      id: 'gratuito',
      name: 'Patriota Gratuito',
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: Users,
      color: 'gray',
      popular: false,
      features: [
        'Acesso basico ao DireitaIA',
        'Limite de 10 consultas por dia',
        'Suporte por email'
      ],
      limitations: [
        'Funcionalidades limitadas',
        'Sem acesso a recursos premium'
      ]
    },
    {
      id: 'engajado',
      name: 'Patriota Engajado',
      monthlyPrice: 29.90,
      yearlyPrice: 299.00,
      icon: Star,
      color: 'blue',
      popular: true,
      features: [
        'Acesso completo ao DireitaIA',
        'Consultas ilimitadas',
        'Suporte prioritario',
        'Recursos avancados de IA'
      ],
      limitations: []
    },
    {
      id: 'premium',
      name: 'Patriota Premium',
      monthlyPrice: 59.90,
      yearlyPrice: 599.00,
      icon: Crown,
      color: 'yellow',
      popular: false,
      features: [
        'Todos os recursos do Engajado',
        'Acesso antecipado a novos recursos',
        'Consultoria personalizada',
        'API dedicada'
      ],
      limitations: []
    }
  ]

  // Estatisticas de uso
  const usageStats = {
    gratuito: { queries: 10, storage: '1GB', support: 'Email' },
    engajado: { queries: 'Ilimitado', storage: '10GB', support: 'Prioritario' },
    premium: { queries: 'Ilimitado', storage: '100GB', support: 'Dedicado' }
  }

  // Funcao para obter classes de cor
  const getColorClasses = (color, variant = 'primary') => {
    const colors = {
      gray: {
        primary: 'bg-gray-600 text-white',
        secondary: 'bg-gray-100 text-gray-800',
        border: 'border-gray-300',
        text: 'text-gray-600'
      },
      blue: {
        primary: 'bg-blue-600 text-white',
        secondary: 'bg-blue-100 text-blue-800',
        border: 'border-blue-300',
        text: 'text-blue-600'
      },
      yellow: {
        primary: 'bg-yellow-600 text-white',
        secondary: 'bg-yellow-100 text-yellow-800',
        border: 'border-yellow-300',
        text: 'text-yellow-600'
      }
    }

    return colors[color]?.[variant] || colors.gray[variant] || ''
  }

  // Funcao para formatar preco
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  // Funcao para calcular economia anual
  const calculateYearlySavings = (monthlyPrice, yearlyPrice) => {
    const monthlyCost = monthlyPrice * 12
    const savings = monthlyCost - yearlyPrice
    return savings > 0 ? savings : 0
  }

  // Buscar planos da API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiClient.get('/plans')
        if (response.data && Array.isArray(response.data)) {
          const transformedPlans = response.data.map(plan => ({
            ...plan,
            icon: plan.icon === 'Crown' ? Crown : plan.icon === 'Star' ? Star : Users
          }))
          setPlans(transformedPlans)
        } else {
          setPlans(fallbackPlans)
        }
      } catch (error) {
        console.error('Erro ao buscar planos:', error)
        setPlans(fallbackPlans)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleUpgrade = (plan) => {
    setSelectedUpgrade(plan)
    setShowUpgradeModal(true)
  }

  const handleConfirmUpgrade = async () => {
    if (!selectedUpgrade) return
    
    try {
      setProcessingPayment(true)
      
      // Criar sessão de checkout do Stripe
      const response = await apiClient.post('/payments/checkout', {
        planType: selectedUpgrade.id
      })
      
      if (response.data.success && response.data.data.url) {
        // Redirecionar para o checkout do Stripe
        window.location.href = response.data.data.url
      } else {
        throw new Error('Erro ao criar sessão de pagamento')
      }
    } catch (error) {
      console.error('Erro ao processar upgrade:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setProcessingPayment(false)
      setShowUpgradeModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Escolha seu Plano
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Selecione o plano ideal para suas necessidades
          </p>
        </div>

        {/* Toggle de preco */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedPlan === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Anual
              <span className="ml-1 text-xs text-green-600 font-semibold">
                (Economize até 20%)
              </span>
            </button>
          </div>
        </div>

        {/* Grid de planos */}
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map((plan) => {
            const IconComponent = plan.icon
            const price = selectedPlan === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
            const savings = calculateYearlySavings(plan.monthlyPrice, plan.yearlyPrice)

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg shadow-lg divide-y divide-gray-200 ${
                  plan.popular
                    ? 'border-2 border-blue-500 transform scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="p-6 bg-white rounded-t-lg">
                  <div className="flex items-center justify-center">
                    <IconComponent className={`h-8 w-8 ${getColorClasses(plan.color, 'text')}`} />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                    {plan.name}
                  </h3>
                  <div className="mt-4 text-center">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {formatPrice(price)}
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      /{selectedPlan === 'yearly' ? 'ano' : 'mes'}
                    </span>
                  </div>
                  {selectedPlan === 'yearly' && savings > 0 && (
                    <p className="mt-2 text-sm text-green-600 text-center">
                      Economize {formatPrice(savings)} por ano
                    </p>
                  )}
                </div>

                <div className="px-6 pt-6 pb-8 bg-white rounded-b-lg">
                  <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">
                    Recursos incluídos
                  </h4>
                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex space-x-3">
                        <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                        <span className="text-sm text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations && plan.limitations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">
                        Limitações
                      </h4>
                      <ul className="mt-4 space-y-4">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex space-x-3">
                            <X className="flex-shrink-0 h-5 w-5 text-red-500" />
                            <span className="text-sm text-gray-500">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-8">
                    <button
                      onClick={() => handleUpgrade(plan)}
                      className={`w-full py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                        plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {userProfile?.plan === plan.id ? 'Plano Atual' : 'Escolher Plano'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal de upgrade */}
        {showUpgradeModal && selectedUpgrade && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Upgrade
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Você deseja fazer upgrade para o plano {selectedUpgrade.name}?
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {formatPrice(selectedPlan === 'yearly' ? selectedUpgrade.yearlyPrice : selectedUpgrade.monthlyPrice)}
                    /{selectedPlan === 'yearly' ? 'ano' : 'mes'}
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-2"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmUpgrade}
                    disabled={processingPayment}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPayment ? 'Processando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Plan