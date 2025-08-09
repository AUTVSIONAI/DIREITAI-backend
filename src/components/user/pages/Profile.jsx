import React, { useState, useRef } from 'react'
import { User, Edit3, Save, X, Camera, MapPin, Calendar, Mail, Phone, Shield, Award, TrendingUp, Upload } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'

const Profile = () => {
  const { userProfile, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: userProfile?.username || '',
    full_name: userProfile?.full_name || '',
    bio: userProfile?.bio || '',
    city: userProfile?.city || '',
    state: userProfile?.state || '',
    phone: userProfile?.phone || '',
    birth_date: userProfile?.birth_date || ''
  })

  // Debug logs
  console.log('Profile component - userProfile:', userProfile)
  console.log('Profile component - formData:', formData)

  // Update formData when userProfile changes
  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        full_name: userProfile.full_name || '',
        bio: userProfile.bio || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        phone: userProfile.phone || '',
        birth_date: userProfile.birth_date || ''
      })
    }
  }, [userProfile])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      console.log('Saving profile data:', formData)
      const response = await apiClient.put('/users/profile', formData)
      
      if (response.data) {
        // Atualizar o contexto de autenticação com os novos dados
        console.log('Profile updated successfully:', response.data)
        setIsEditing(false)
        // Recarregar a página para atualizar os dados
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido'
      alert(`Erro ao atualizar perfil: ${errorMessage}`)
    }
  }

  const handleCancel = () => {
    setFormData({
      username: userProfile?.username || '',
      full_name: userProfile?.full_name || '',
      bio: userProfile?.bio || '',
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      phone: userProfile?.phone || '',
      birth_date: userProfile?.birth_date || ''
    })
    setIsEditing(false)
  }

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true)
      const file = event.target.files[0]
      
      if (!file) return
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.')
        return
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.')
        return
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Erro ao fazer upload da imagem.')
        return
      }
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      // Atualizar perfil com nova URL do avatar
      const response = await apiClient.put('/users/profile', {
        ...formData,
        avatar_url: publicUrl
      })
      
      if (response.data) {
        console.log('Avatar updated successfully')
        window.location.reload()
      }
      
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Erro ao atualizar foto de perfil.')
    } finally {
      setUploading(false)
    }
  }

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'premium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'engajado':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPlanLabel = (plan) => {
    switch (plan) {
      case 'premium': return 'Premium'
      case 'engajado': return 'Engajado'
      default: return 'Gratuito'
    }
  }

  const mockStats = {
    totalCheckins: 42,
    totalPoints: userProfile?.points || 1450,
    aiConversations: 28,
    achievements: 12,
    joinDate: '2024-01-15',
    currentStreak: 7
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
          <p className="text-gray-600">Gerencie suas informações pessoais</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit3 className="h-4 w-4" />
            <span>Editar</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              <span>Salvar</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
              <span>Cancelar</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
            
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {(userProfile?.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50"
                      >
                        {uploading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{userProfile?.username || 'Usuário'}</h4>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    getPlanBadge(userProfile?.plan)
                  }`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getPlanLabel(userProfile?.plan)}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome de usuário</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{userProfile?.username || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{userProfile?.full_name || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="(11) 99999-9999"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{userProfile?.phone || 'Não informado'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{userProfile?.city || 'Não informado'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  {isEditing ? (
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione o estado</option>
                      <option value="SP">São Paulo</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="PR">Paraná</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="BA">Bahia</option>
                      <option value="GO">Goiás</option>
                      <option value="DF">Distrito Federal</option>
                      {/* Add more states as needed */}
                    </select>
                  ) : (
                    <p className="text-gray-900">{userProfile?.state || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{userProfile?.birth_date || 'Não informado'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Conte um pouco sobre você..."
                  />
                ) : (
                  <p className="text-gray-900">{userProfile?.bio || 'Nenhuma biografia adicionada.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Pontos</span>
                </div>
                <span className="font-bold text-blue-600">{mockStats.totalPoints.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">Check-ins</span>
                </div>
                <span className="font-bold text-green-600">{mockStats.totalCheckins}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Conversas IA</span>
                </div>
                <span className="font-bold text-purple-600">{mockStats.aiConversations}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Conquistas</span>
                </div>
                <span className="font-bold text-yellow-600">{mockStats.achievements}</span>
              </div>
            </div>
          </div>

          {/* Member Since */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Membro desde</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {new Date(mockStats.joinDate).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">
                  Sequência atual: {mockStats.currentStreak} dias
                </span>
              </div>
            </div>
          </div>

          {/* Plan Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plano Atual</h3>
            <div className={`p-4 rounded-lg border ${
              getPlanBadge(userProfile?.plan)
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-medium">{getPlanLabel(userProfile?.plan)}</span>
              </div>
              <p className="text-sm opacity-75">
                {userProfile?.plan === 'premium' 
                  ? 'Acesso completo a todos os recursos'
                  : userProfile?.plan === 'engajado'
                  ? 'Recursos avançados disponíveis'
                  : 'Recursos básicos disponíveis'
                }
              </p>
            </div>
            
            {userProfile?.plan !== 'premium' && (
              <button className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Fazer Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile