import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { ApiClientImpl } from '../../../lib/api';

const apiClient = new ApiClientImpl();

const PlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_months: '',
    features: '',
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/plans/admin');
      
      if (response && response.data && response.data.success) {
        setPlans(response.data.data || []);
      } else {
        console.error('Erro ao buscar planos:', response?.data?.message || 'Resposta inválida');
        setPlans([]);
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      if (error.response?.status === 403) {
        alert('Acesso negado. Faça login com uma conta de administrador.');
      } else {
        alert('Erro ao carregar planos');
      }
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        duration_months: parseInt(formData.duration_months),
        features: formData.features.split(',').map(f => f.trim())
      };

      let response;
      if (editingPlan) {
        response = await apiClient.put(`/plans/${editingPlan.id}`, planData);
      } else {
        response = await apiClient.post('/plans', planData);
      }

      if (response && response.data && response.data.success) {
        alert(editingPlan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
        setShowForm(false);
        setEditingPlan(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          duration_months: '',
          features: '',
          is_active: true
        });
        fetchPlans();
      } else {
        alert('Erro ao salvar plano: ' + (response?.data?.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      if (error.response?.status === 403) {
        alert('Acesso negado. Faça login com uma conta de administrador.');
      } else {
        alert('Erro ao salvar plano');
      }
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      duration_months: plan.duration_months.toString(),
      features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features,
      is_active: plan.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (window.confirm('Tem certeza que deseja deletar este plano?')) {
      try {
        const response = await apiClient.delete(`/plans/${planId}`);
        
        if (response && response.data && response.data.success) {
          alert('Plano deletado com sucesso!');
          fetchPlans();
        } else {
          alert('Erro ao deletar plano: ' + (response?.data?.message || 'Resposta inválida'));
        }
      } catch (error) {
        console.error('Erro ao deletar plano:', error);
        if (error.response?.status === 403) {
          alert('Acesso negado. Faça login com uma conta de administrador.');
        } else {
          alert('Erro ao deletar plano');
        }
      }
    }
  };

  const handleToggleActive = async (planId, currentStatus) => {
    try {
      const response = await apiClient.patch(`/plans/${planId}/toggle`);
      
      if (response && response.data && response.data.success) {
        alert(`Plano ${currentStatus ? 'desativado' : 'ativado'} com sucesso!`);
        fetchPlans();
      } else {
        alert('Erro ao alterar status do plano: ' + (response?.data?.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
      if (error.response?.status === 403) {
        alert('Acesso negado. Faça login com uma conta de administrador.');
      } else {
        alert('Erro ao alterar status do plano');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Planos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Plano
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (meses)
                </label>
                <input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recursos (separados por vírgula)
              </label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                placeholder="Ex: Acesso completo, Suporte 24/7, Relatórios avançados"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                {editingPlan ? 'Atualizar' : 'Criar'} Plano
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    duration_months: '',
                    features: '',
                    is_active: true
                  });
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duração
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                    <div className="text-sm text-gray-500">{plan.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {plan.price?.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {plan.duration_months} meses
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    plan.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(plan.id, plan.is_active)}
                      className={`${plan.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {plan.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum plano encontrado
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansManagement;