import React, { useEffect, useState } from 'react'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const StoreSuccess = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular verificação do pagamento
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processando seu pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Realizado com Sucesso!
          </h1>
          <p className="text-gray-600">
            Obrigado pela sua compra. Seu pedido foi processado com sucesso.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <Package className="h-5 w-5 text-primary-600 mr-2" />
            <span className="font-medium text-gray-900">Próximos Passos</span>
          </div>
          <p className="text-sm text-gray-600">
            Você receberá um e-mail de confirmação com os detalhes do seu pedido e informações de rastreamento.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/store')}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Continuar Comprando
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            Ver Meus Pedidos
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>

        {sessionId && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              ID da Sessão: {sessionId.slice(0, 20)}...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoreSuccess