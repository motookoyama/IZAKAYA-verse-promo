import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, FileText, MessageCircle, Settings } from 'lucide-react'
import V2CardSelector from './V2CardSelector'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

interface V2Card {
  id: string
  title: string
  name: string // 追加
  description: string
  personality: string
  first_mes: string
  system_prompt?: string
  scenario?: string
  creator_notes?: string
  image_url?: string
  tags: string[]
  character_data?: Record<string, any> // any を修正
  created_at: string // 追加
}

const Play = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentCard, setCurrentCard] = useState<V2Card | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // カード選択処理
  const handleCardSelect = (card: V2Card) => {
    setCurrentCard(card);
    
    // 最初のメッセージを追加
    if (card.character_data?.first_mes || card.first_mes) {
      const firstMessage = card.character_data?.first_mes || card.first_mes;
      setMessages([{
        id: '1',
        type: 'bot',
        content: firstMessage,
        timestamp: new Date()
      }]);
    }
  };

  // SVGアイコン生成（簡易版）
  const generateSVGIcon = (card: V2Card) => {
    const initials = card.title.substring(0, 2).toUpperCase();
    const colors = ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B'];
    const color = colors[card.title.length % colors.length];
    
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" className="rounded-full">
        <rect width="40" height="40" fill={color} rx="20" />
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          {initials}
        </text>
      </svg>
    );
  };

  // メッセージ送信
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')

    // ボットの応答（モック）
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `「${inputMessage}」について話しましょう。${currentCard?.name || 'キャラクター'}として応答します。`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
    }, 1000)
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col"
      >
        {/* ヘッダー */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm border-b border-white border-opacity-20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageCircle size={24} className="text-blue-400" />
              <h1 className="text-xl font-bold text-white">IZAKAYA verse Chat</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* V2カード選択 */}
              <div className="w-80">
                <V2CardSelector 
                  onCardSelect={handleCardSelect}
                  selectedCard={currentCard}
                />
              </div>
              
              {/* 設定ボタン */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Settings size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex">
          {/* サイドバー（設定パネル） */}
          {showSettings && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              className="w-80 bg-white bg-opacity-10 backdrop-blur-sm border-r border-white border-opacity-20 p-4"
            >
              <h3 className="text-lg font-semibold text-white mb-4">設定</h3>
              
              {/* 現在のカード情報 */}
              {currentCard && (
                <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    {currentCard.image_url ? (
                      <img
                        src={currentCard.image_url}
                        alt={currentCard.title}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      generateSVGIcon(currentCard)
                    )}
                    <div>
                      <h4 className="font-semibold text-white">{currentCard.title}</h4>
                      <p className="text-sm text-gray-300">{currentCard.description}</p>
                    </div>
                  </div>
                  
                  {/* タグ表示 */}
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentCard.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* チャットエリア */}
          <div className="flex-1 flex flex-col">
            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <FileText size={48} className="mx-auto mb-4" />
                  <p>V2カードを選択してチャットを開始してください</p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-4 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* アバター */}
                      <div className="flex-shrink-0">
                        {message.type === 'user' ? (
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <User size={20} className="text-white" />
                          </div>
                        ) : currentCard ? (
                          currentCard.image_url ? (
                            <img
                              src={currentCard.image_url}
                              alt={currentCard.title}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            generateSVGIcon(currentCard)
                          )
                        ) : (
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                            <Bot size={20} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* メッセージ */}
                      <div className={`p-4 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white bg-opacity-20 text-white'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="p-4 border-t border-white border-opacity-20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="メッセージを入力..."
                  className="flex-1 p-3 bg-white bg-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !currentCard}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Play
