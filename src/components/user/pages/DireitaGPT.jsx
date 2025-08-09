import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Trash2, Download, Copy, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { AIService } from '../../../services/ai'

const DireitaGPT = () => {
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
      const history = await AIService.getConversations(userProfile?.id || 'anonymous')
      
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
            content: conv.userMessage,
            timestamp: new Date(conv.createdAt),
            model: 'User'
          })
          formattedMessages.push({
            id: `bot-${conv.id}`,
            type: 'bot',
            content: conv.aiResponse,
            timestamp: new Date(conv.createdAt),
            model: conv.model || 'DireitaGPT'
          })
        })
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      setMessages([{
        id: 'error',
        type: 'bot',
        content: 'Desculpe, houve um erro ao carregar o histórico. Vamos começar uma nova conversa!',
        timestamp: new Date(),
        model: 'DireitaGPT'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    const messageToSend = inputMessage.trim()
    setInputMessage('')
    setIsTyping(true)

    // Adicionar mensagem do usuário
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date(),
      model: 'User'
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const response = await AIService.sendMessage({
        message: messageToSend,
        userId: userProfile?.id || 'anonymous',
        type: 'direitagpt',
        conversationId: conversationId.current
      })

      // Adicionar resposta da IA
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.content,
        timestamp: new Date(),
        model: response.model || 'DireitaGPT'
      }

      setMessages(prev => [...prev, botMessage])
      conversationId.current = response.conversationId
      setCurrentModel(response.model || 'DireitaGPT')

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
        model: 'DireitaGPT'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: 'Conversa limpa! Como posso ajudá-lo agora?',
      timestamp: new Date(),
      model: 'DireitaGPT'
    }])
    conversationId.current = null
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
  }

  const exportConversation = () => {
    const conversation = messages.map(msg => 
      `${msg.type === 'user' ? 'Você' : msg.model}: ${msg.content}`
    ).join('\n\n')
    
    const blob = new Blob([conversation], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversa-direitagpt-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Bot className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">DireitaGPT</h2>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {currentModel || 'DireitaGPT'} • {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={exportConversation}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Exportar conversa"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={clearConversation}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Limpar conversa"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-8rem)]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`p-2 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-100' 
                : 'bg-red-100'
            }`}>
              {message.type === 'user' ? (
                <User className="h-5 w-5 text-blue-600" />
              ) : (
                <Bot className="h-5 w-5 text-red-600" />
              )}
            </div>
            
            <div className={`flex-1 max-w-3xl ${
              message.type === 'user' ? 'text-right' : ''
            }`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              
              <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${
                message.type === 'user' ? 'justify-end' : ''
              }`}>
                <span>{message.timestamp.toLocaleTimeString()}</span>
                <span>•</span>
                <span>{message.model}</span>
                <button
                  onClick={() => copyMessage(message.content)}
                  className="hover:text-gray-700 transition-colors"
                  title="Copiar mensagem"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bot className="h-5 w-5 text-red-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </div>
      </div>
    </div>
  )
}

export default DireitaGPT