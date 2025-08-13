import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Flag, 
  Shield, 
  Users, 
  Star, 
  ArrowRight, 
  CheckCircle, 
  Calendar, 
  MessageSquare, 
  Award,
  Zap,
  Globe,
  Heart
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'DireitaIA',
      description: 'IA especializada em política conservadora e direita brasileira'
    },
    {
      icon: Calendar,
      title: 'Eventos Patriotas',
      description: 'Encontre e participe de eventos conservadores em todo o Brasil'
    },
    {
      icon: Award,
      title: 'Sistema de Pontos',
      description: 'Ganhe pontos por participação e troque por recompensas'
    },
    {
      icon: Users,
      title: 'Comunidade Ativa',
      description: 'Conecte-se com outros patriotas e conservadores'
    }
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      role: 'Empresário',
      content: 'Finalmente uma plataforma que representa nossos valores conservadores!',
      rating: 5
    },
    {
      name: 'Maria Santos',
      role: 'Advogada',
      content: 'O DireitaIA me ajuda muito nas discussões políticas do dia a dia.',
      rating: 5
    },
    {
      name: 'João Oliveira',
      role: 'Professor',
      content: 'Excelente para encontrar eventos e se conectar com pessoas que pensam igual.',
      rating: 5
    }
  ];

  const stats = [
    { number: '10K+', label: 'Usuários Ativos' },
    { number: '500+', label: 'Eventos Realizados' },
    { number: '50K+', label: 'Conversas com IA' },
    { number: '95%', label: 'Satisfação' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">Direitai.com</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Entrar
              </Link>
              <Link 
                to="/login" 
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-conservative-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              A Central do <span className="text-primary-600">Patriota</span> Brasileiro
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Conecte-se com outros conservadores, participe de eventos patrióticos e 
              converse com nossa IA especializada em política de direita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/login" 
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <span>Começar Agora</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold">
                Saiba Mais
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Recursos Exclusivos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para se conectar com a comunidade conservadora brasileira
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600">
              Depoimentos reais de patriotas que já fazem parte da nossa comunidade
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para fazer parte do movimento?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de brasileiros que já escolheram defender nossos valores
          </p>
          <Link 
            to="/login" 
            className="bg-white hover:bg-gray-100 text-primary-600 px-8 py-3 rounded-lg text-lg font-semibold inline-flex items-center space-x-2"
          >
            <span>Cadastrar Gratuitamente</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Flag className="h-6 w-6 text-primary-400" />
                <span className="text-xl font-bold">Direitai.com</span>
              </div>
              <p className="text-gray-400">
                A plataforma que conecta patriotas brasileiros em todo o país.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Recursos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">DireitaIA</a></li>
                <li><a href="#" className="hover:text-white">Eventos</a></li>
                <li><a href="#" className="hover:text-white">Comunidade</a></li>
                <li><a href="#" className="hover:text-white">Loja</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Conecte-se</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">Facebook</a></li>
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">YouTube</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Direitai.com. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;