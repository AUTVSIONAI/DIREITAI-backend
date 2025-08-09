import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { AdminService } from '../../../services/admin';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 'normal',
    targetAudience: 'all',
    expiresAt: '',
    isActive: true
  });

  // Função para carregar anúncios da API
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular chamada da API - substituir por AdminService.getAnnouncements() quando disponível
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            announcements: [
              {
                id: 1,
                title: 'Manutenção Programada do Sistema',
                content: 'O sistema passará por manutenção programada no dia 15/12 das 02:00 às 04:00. Durante este período, alguns serviços podem ficar indisponíveis.',
                type: 'warning',
                priority: 'high',
                targetAudience: 'all',
                isActive: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                author: 'Admin Sistema'
              },
              {
                id: 2,
                title: 'Nova Funcionalidade: Chat com IA Jurídica',
                content: 'Estamos felizes em anunciar o lançamento da nossa nova funcionalidade de chat com IA especializada em direito. Experimente agora!',
                type: 'success',
                priority: 'normal',
                targetAudience: 'users',
                isActive: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                author: 'Equipe de Produto'
              },
              {
                id: 3,
                title: 'Atualização dos Termos de Uso',
                content: 'Nossos termos de uso foram atualizados. Por favor, revise as mudanças em sua próxima sessão.',
                type: 'info',
                priority: 'low',
                targetAudience: 'all',
                isActive: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
                author: 'Departamento Jurídico'
              }
            ]
          });
        }, 1000);
      });
      
      if (response.success) {
        setAnnouncements(response.announcements || []);
      } else {
        throw new Error('Falha ao carregar anúncios');
      }
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
      setError('Erro ao carregar anúncios. Tente novamente.');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingAnnouncement) {
      // Atualizar anúncio existente
      setAnnouncements(prev => prev.map(ann => 
        ann.id === editingAnnouncement.id 
          ? { ...ann, ...formData, updatedAt: new Date() }
          : ann
      ));
    } else {
      // Criar novo anúncio
      const newAnnouncement = {
        id: Date.now(),
        ...formData,
        createdAt: new Date(),
        author: 'Admin Atual',
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null
      };
      setAnnouncements(prev => [newAnnouncement, ...prev]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 'normal',
      targetAudience: 'all',
      expiresAt: '',
      isActive: true
    });
    setEditingAnnouncement(null);
    setShowModal(false);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString().split('T')[0] : '',
      isActive: announcement.isActive
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este anúncio?')) {
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    }
  };

  const toggleActive = (id) => {
    setAnnouncements(prev => prev.map(ann => 
      ann.id === id ? { ...ann, isActive: !ann.isActive } : ann
    ));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Gerenciar Anúncios
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Novo Anúncio
            </button>
          </div>

          {/* Lista de Anúncios */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">Carregando anúncios...</div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8">
                <SpeakerWaveIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum anúncio</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando um novo anúncio.</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border rounded-lg p-4 ${getTypeColor(announcement.type)} ${
                    !announcement.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(announcement.type)}
                        <h4 className="text-lg font-medium text-gray-900">
                          {announcement.title}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority === 'high' ? 'Alta' : 
                           announcement.priority === 'normal' ? 'Normal' : 'Baixa'}
                        </span>
                        {!announcement.isActive && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-3">
                        {announcement.content}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Por: {announcement.author}</span>
                        <span>Criado: {announcement.createdAt.toLocaleDateString('pt-BR')}</span>
                        {announcement.expiresAt && (
                          <span>Expira: {announcement.expiresAt.toLocaleDateString('pt-BR')}</span>
                        )}
                        <span className="capitalize">
                          Público: {announcement.targetAudience === 'all' ? 'Todos' : 
                                   announcement.targetAudience === 'users' ? 'Usuários' : 'Admins'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleActive(announcement.id)}
                        className={`p-2 rounded-md ${
                          announcement.isActive 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={announcement.isActive ? 'Desativar' : 'Ativar'}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                        title="Editar"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                        title="Excluir"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conteúdo
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    required
                    rows={4}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="info">Informação</option>
                      <option value="success">Sucesso</option>
                      <option value="warning">Aviso</option>
                      <option value="error">Erro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Público Alvo
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos</option>
                      <option value="users">Usuários</option>
                      <option value="admins">Administradores</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Expiração
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Anúncio ativo
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingAnnouncement ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;