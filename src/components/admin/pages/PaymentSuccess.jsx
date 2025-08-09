import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Crown, Zap, ArrowRight, Home } from 'lucide-react';
import { apiClient } from '../../../lib/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');
  
  useEffect(() => {
    if (sessionId) {
      loadSubscriptionInfo();
    } else {
      setLoading(false);
    }
  }, [sessionId]);
  
  const loadSubscriptionInfo = async () => {
    try {
      const response = await apiClient.get('/payments/subscription');
      if (response.data.success) {
        setSubscription(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar informações da assinatura:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'engajado':
        return <Zap className="h-16 w-16 text-blue-600" />;
      case 'lider':
        return <Crown className="h-16 w-16 text-purple-600" />;
      default:
        return <CheckCircle className="h-16 w-16 text-green-600" />;
    }
  };
  
  const getPlanColor = (planId) => {
    switch (planId) {
      case 'engajado':
        return 'from-blue-500 to-blue-600';
      case 'lider':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-green-500 to-green-600';
    }
  };
  
  const getPlanBenefits = (planId) => {
    switch (planId) {
      case 'engajado':
        return [
          'Acesso a eventos exclusivos',
          'Conteúdo premium de análise política',
          'Networking com outros engajados',
          'Suporte prioritário',
          'Relatórios detalhados'
        ];
      case 'lider':
        return [
          'Todos os benefícios do Engajado Nacional',
          'Acesso a lideranças conservadoras',
          'Mentoria política personalizada',
          'Eventos VIP exclusivos',
          'Consultoria estratégica',
          'Acesso antecipado a novos recursos'
        ];
      default:
        return ['Assinatura ativada com sucesso!'];
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando pagamento...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header de Sucesso */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pagamento Realizado com Sucesso!
          </h1>
          <p className="text-xl text-gray-600">
            Bem-vindo à comunidade DireitAI Premium
          </p>
        </div>
        
        {/* Informações da Assinatura */}
        {subscription && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className={`bg-gradient-to-r ${getPlanColor(subscription.planId)} px-8 py-6`}>
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Plano {subscription.planName}
                  </h2>
                  <p className="text-lg opacity-90">
                    Assinatura ativa desde {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  {getPlanIcon(subscription.planId)}
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Detalhes da Assinatura */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Detalhes da Assinatura
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600 capitalize">
                        {subscription.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Próxima Cobrança:</span>
                      <span className="font-medium text-gray-900">
                        {subscription.nextBilling ? 
                          new Date(subscription.nextBilling).toLocaleDateString('pt-BR') : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor:</span>
                      <span className="font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(subscription.amount / 100)}/mês
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Benefícios */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Seus Benefícios
                  </h3>
                  <div className="space-y-3">
                    {getPlanBenefits(subscription.planId).map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Próximos Passos */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Próximos Passos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Explore os Recursos
              </h4>
              <p className="text-gray-600 text-sm">
                Acesse todas as funcionalidades premium disponíveis em sua conta
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <span className="text-xl font-bold text-purple-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Conecte-se
              </h4>
              <p className="text-gray-600 text-sm">
                Participe de eventos e conecte-se com outros membros da comunidade
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <span className="text-xl font-bold text-green-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Faça a Diferença
              </h4>
              <p className="text-gray-600 text-sm">
                Use as ferramentas para amplificar seu impacto político
              </p>
            </div>
          </div>
        </div>
        
        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Home className="h-5 w-5" />
            Ir para Dashboard
          </button>
          
          <button
            onClick={() => navigate('/admin/plans')}
            className="flex items-center justify-center gap-2 px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Ver Planos
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
        
        {/* Suporte */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-2">
            Precisa de ajuda? Nossa equipe está aqui para você.
          </p>
          <a
            href="mailto:suporte@direitai.com"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            suporte@direitai.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;