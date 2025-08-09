import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Trash2, Download, Copy, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { AIService } from '../../../services/ai'

const DireitaGPT = () => {
  const aiService = new AIService()
  const { userProfile } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentModel, setCurrentModel] = useState('')
  const [isConnected, setIsConnected] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const conversationId = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar histórico de conversas ao montar o componente
  useEffect(() => {
    loadConversationHistory()
  }, [])

  const loadConversationHistory = async () => {
    try {
      setIsLoading(true)
      const history = await aiService.getConversations(20) // Últimas 20 conversas
      
      if (history.length === 0) {
        // Se não há histórico, mostrar mensagem de boas-vindas
        setMessages([{
          id: 'welcome',
          type: 'bot',
          content: 'Olá! Sou o DireitaGPT, sua IA conservadora. Como posso ajudá-lo hoje? Posso discutir política, economia, valores tradicionais e muito mais!',
          timestamp: new Date(),
          model: 'DireitaGPT'
        }])
      } else {
        // Converter histórico para formato de mensagens
        const formattedMessages = []
        history.forEach(conv => {
          formattedMessages.push({
            id: `user-${conv.id}`,
            type: 'user',
            content: conv.message,
            timestamp: new Date(conv.created_at)
          })
          formattedMessages.push({
            id: `bot-${conv.id}`,
            type: 'bot',
            content: conv.response,
            timestamp: new Date(conv.created_at),
            model: conv.model_used || 'DireitaGPT',
            provider: conv.provider_used
          })
        })
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      setMessages([{
        id: 'error',
        type: 'bot',
        content: 'Olá! Houve um problema ao carregar seu histórico, mas estou pronto para conversar!',
        timestamp: new Date(),
        model: 'DireitaGPT'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    const messageToSend = inputMessage
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setIsConnected(true)

    try {
      // Gerar ID de conversa se não existir
      if (!conversationId.current) {
        conversationId.current = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      const response = await aiService.sendMessage(messageToSend, conversationId.current)
      
      if (response.success) {
        const botResponse = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: response.response,
          timestamp: new Date(),
          model: response.model || 'DireitaGPT',
          provider: response.provider,
          tokensUsed: response.tokensUsed
        }
        
        setMessages(prev => [...prev, botResponse])
        setCurrentModel(response.model || 'DireitaGPT')
      } else {
        throw new Error(response.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setIsConnected(false)
      
      const errorResponse = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: 'Desculpe, houve um problema ao processar sua mensagem. Tente novamente em alguns instantes.',
        timestamp: new Date(),
        model: 'Sistema',
        isError: true
      }
      
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsTyping(false)
    }
  }

  const getModelDisplayName = (model, provider) => {
    if (!model) return 'DireitaGPT'
    
    const modelNames = {
      'anthropic/claude-3-haiku': 'Claude 3 Haiku',
      'meta-llama/llama-3.1-8b-instruct-turbo': 'Llama 3.1 8B',
      'mistralai/mixtral-8x7b-instruct': 'Mixtral 8x7B',
      'microsoft/wizardlm-2-8x22b': 'WizardLM 2'
    }
    
    return modelNames[model] || model
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    conversationId.current = null
    setMessages([
      {
        id: 'welcome-new',
        type: 'bot',
        content: 'Chat limpo! Como posso ajudá-lo agora?',
        timestamp: new Date(),
        model: 'DireitaGPT'
      }
    ])
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
    // You could add a toast notification here
  }

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const sender = msg.type === 'user' ? 'Você' : `DireitaGPT (${getModelDisplayName(msg.model, msg.provider)})`
      const timestamp = msg.timestamp.toLocaleString('pt-BR')
      return `[${timestamp}] ${sender}: ${msg.content}`
    }).join('\n\n')
    
    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `direitagpt-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const quickQuestions = [
    'Como melhorar a economia do Brasil?',
    'Qual a importância da família tradicional?',
    'Como combater a corrupção na política?',
    'Qual o papel da educação conservadora?'
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Bot className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">DireitaGPT</h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500">Sua IA conservadora</p>
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" title="Conectado" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" title="Desconectado" />
              )}
              {currentModel && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {getModelDisplayName(currentModel)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={exportChat}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Exportar conversa"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Limpar conversa"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Carregando histórico...</span>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {message.type === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            
            <div className={`flex-1 max-w-xs lg:max-w-md xl:max-w-lg ${
              message.type === 'user' ? 'text-right' : ''
            }`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : message.isError
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.type === 'bot' && message.model && message.model !== 'DireitaGPT' && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Modelo: {getModelDisplayName(message.model, message.provider)}
                      {message.tokensUsed && ` • ${message.tokensUsed} tokens`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`flex items-center mt-1 space-x-2 ${
                message.type === 'user' ? 'justify-end' : ''
              }`}>
                <span className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
                {message.type === 'bot' && (
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copiar mensagem"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="h-4 w-4 text-gray-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {!isLoading && messages.length <= 1 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <p className="text-sm text-gray-600 mb-3">Perguntas sugeridas:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="text-left p-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Pressione Enter para enviar, Shift+Enter para nova linha</span>
          <span>{inputMessage.length}/1000</span>
        </div>
      </div>
    </div>
  )
}

export default DireitaGPT