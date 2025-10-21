import React, { useState, useEffect } from 'react';
import { ChevronDown, User, Tag } from 'lucide-react';

interface V2Card {
  id: string;
  title: string;
  description: string;
  personality: string;
  first_mes: string;
  system_prompt?: string;
  scenario?: string;
  creator_notes?: string;
  image_url?: string;
  character_data?: any;
  tags: string[];
  created_at: string;
}

interface V2CardSelectorProps {
  onCardSelect: (card: V2Card) => void;
  selectedCard?: V2Card | null;
}

const V2CardSelector: React.FC<V2CardSelectorProps> = ({ onCardSelect, selectedCard }) => {
  const [cards, setCards] = useState<V2Card[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // カード一覧取得
  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v2cards');
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索フィルター
  const filteredCards = cards.filter(card => 
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleCardSelect = (card: V2Card) => {
    onCardSelect(card);
    setIsOpen(false);
    setSearchTerm('');
  };

  // SVGアイコン生成（簡易版）
  const generateSVGIcon = (card: V2Card) => {
    const initials = card.title.substring(0, 2).toUpperCase();
    const colors = ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B'];
    const color = colors[card.title.length % colors.length];
    
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" className="rounded-full">
        <rect width="32" height="32" fill={color} rx="16" />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {initials}
        </text>
      </svg>
    );
  };

  return (
    <div className="relative">
      {/* 選択ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg text-white hover:bg-opacity-30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedCard ? (
            <>
              {selectedCard.image_url ? (
                <img
                  src={selectedCard.image_url}
                  alt={selectedCard.title}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                generateSVGIcon(selectedCard)
              )}
              <div className="text-left">
                <div className="font-semibold">{selectedCard.title}</div>
                <div className="text-sm text-gray-300 truncate max-w-48">
                  {selectedCard.description}
                </div>
              </div>
            </>
          ) : (
            <>
              <User size={20} className="text-gray-400" />
              <span className="text-gray-400">V2カードを選択してください</span>
            </>
          )}
        </div>
        <ChevronDown 
          size={20} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden z-50">
          {/* 検索バー */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="カードを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 bg-gray-100 rounded-md text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* カードリスト */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                カードを読み込み中...
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? '検索結果がありません' : 'カードがありません'}
              </div>
            ) : (
              filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card)}
                  className="w-full p-3 hover:bg-gray-100 transition-colors text-left border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {/* アイコン */}
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.title}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      generateSVGIcon(card)
                    )}
                    
                    {/* テキスト情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {card.title}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {card.description}
                      </div>
                      
                      {/* タグ */}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {card.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"
                            >
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                          {card.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{card.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default V2CardSelector;



