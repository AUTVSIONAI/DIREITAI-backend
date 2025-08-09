import React, { useState, useEffect } from 'react'
import { ShoppingCart, Star, Filter, Search, Package, CreditCard, Truck, Shield, Plus, Minus, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { StoreService } from '../../../services/store'

const Store = () => {
  const { userProfile } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)

  const categories = [
    { id: 'all', name: 'Todos', icon: Package },
    { id: 'clothing', name: 'Roupas', icon: Package },
    { id: 'accessories', name: 'Acessórios', icon: Package },
    { id: 'books', name: 'Livros', icon: Package },
    { id: 'digital', name: 'Digital', icon: Package }
  ]

  const mockProducts = [
    {
      id: 1,
      name: 'Camiseta Patriota Brasil',
      description: 'Camiseta 100% algodão com estampa exclusiva',
      price: 49.90,
      originalPrice: 69.90,
      category: 'clothing',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop&crop=center',
      rating: 4.8,
      reviews: 124,
      inStock: true,
      badge: 'Mais Vendido'
    },
    {
      id: 2,
      name: 'Livro: História do Brasil',
      description: 'Uma visão conservadora da história brasileira',
      price: 39.90,
      originalPrice: null,
      category: 'books',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=300&fit=crop&crop=center',
      rating: 4.9,
      reviews: 89,
      inStock: true,
      badge: null
    },
    {
      id: 3,
      name: 'Boné Direita Brasileira',
      description: 'Boné ajustável com bordado exclusivo',
      price: 29.90,
      originalPrice: 39.90,
      category: 'accessories',
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=300&fit=crop&crop=center',
      rating: 4.6,
      reviews: 67,
      inStock: true,
      badge: 'Promoção'
    },
    {
      id: 4,
      name: 'Curso Online: Economia Brasileira',
      description: 'Curso completo sobre economia e política',
      price: 199.90,
      originalPrice: 299.90,
      category: 'digital',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=300&fit=crop&crop=center',
      rating: 4.7,
      reviews: 156,
      inStock: true,
      badge: 'Novo'
    },
    {
      id: 5,
      name: 'Caneca Conservadora',
      description: 'Caneca de porcelana com frase motivacional',
      price: 24.90,
      originalPrice: null,
      category: 'accessories',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop&crop=center',
      rating: 4.5,
      reviews: 43,
      inStock: false,
      badge: null
    },
    {
      id: 6,
      name: 'Moletom Patriota',
      description: 'Moletom com capuz e estampa exclusiva',
      price: 89.90,
      originalPrice: 119.90,
      category: 'clothing',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&h=300&fit=crop&crop=center',
      rating: 4.8,
      reviews: 92,
      inStock: true,
      badge: 'Oferta'
    }
  ]

  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id)
      if (existingItem) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (!userProfile) {
      alert('Você precisa estar logado para finalizar a compra')
      return
    }

    if (cart.length === 0) {
      alert('Seu carrinho está vazio')
      return
    }

    try {
      const response = await StoreService.createCheckoutSession()
      if (response && response.url) {
        window.location.href = response.url
      } else {
        throw new Error('URL de checkout não recebida')
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error)
      alert('Erro ao processar checkout. Tente novamente.')
    }
  }

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'Mais Vendido': return 'bg-green-100 text-green-800'
      case 'Promoção': return 'bg-red-100 text-red-800'
      case 'Novo': return 'bg-blue-100 text-blue-800'
      case 'Oferta': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Loja Patriota</h2>
          <p className="text-gray-600">Produtos exclusivos para conservadores</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Carrinho</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cart.reduce((total, item) => total + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="card hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  {product.badge && (
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                      getBadgeColor(product.badge)
                    }`}>
                      {product.badge}
                    </span>
                  )}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <span className="text-white font-medium">Esgotado</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.description}</p>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{product.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({product.reviews} avaliações)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-primary-600">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => addToCart(product)}
                    disabled={!product.inStock}
                    className={`w-full py-2 rounded-lg font-medium ${
                      product.inStock
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {product.inStock ? 'Adicionar ao Carrinho' : 'Esgotado'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600">Tente ajustar os filtros ou termo de busca</p>
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        {showCart && (
          <div className="lg:col-span-1">
            <div className="card sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Carrinho de Compras</h3>
              
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-primary-600">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold text-primary-600">
                        R$ {getTotalPrice().toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    
                    <button 
                      onClick={handleCheckout}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 mb-2"
                    >
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Finalizar Compra
                    </button>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center space-x-1">
                        <Truck className="h-3 w-3" />
                        <span>Frete grátis acima de R$ 100</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>Compra 100% segura</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Store