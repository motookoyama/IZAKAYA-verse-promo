import { useState, useRef, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Send, Users, Bot } from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatar: string;
  character: string;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'player' | 'ai' | 'system';
  timestamp: string;
  character?: string;
}

interface MultiplayerChatProps {
  roomId: string;
  currentPlayer: Player;
  onSendChat: (prompt: string) => Promise<string>;
  connectionReady: boolean;
  initialBotMessage?: string;
}

export function MultiplayerChat({ roomId, currentPlayer, onSendChat, connectionReady, initialBotMessage }: MultiplayerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-intro',
      text: `Welcome to Adventure Room ${roomId}! The AI Game Master is preparing your quest.`,
      senderId: 'system',
      senderName: 'System',
      senderType: 'system',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlinePlayers] = useState<Player[]>([
    currentPlayer,
    {
      id: '2',
      name: 'CyberKnight',
      avatar: '🤖',
      character: 'Android Warrior',
      isOnline: true
    },
    {
      id: '3', 
      name: 'NeonHacker',
      avatar: '💻',
      character: 'Digital Phantom',
      isOnline: true
    }
  ]);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!initialBotMessage) return;
    setMessages((prev) => {
      if (prev.some((message) => message.id === 'bootstrap')) {
        return prev;
      }
      return [
        ...prev,
        {
          id: 'bootstrap',
          text: initialBotMessage,
          senderId: 'ai-gm',
          senderName: 'AI Game Master',
          senderType: 'ai',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    });
  }, [initialBotMessage]);

  const handleSendMessage = async () => {
    const prompt = inputValue.trim();
    if (!prompt || isTyping) return;
    if (!connectionReady) {
      if (typeof window !== 'undefined') {
        window.alert('BFF未接続です。接続が完了してからメッセージを送信してください。');
      }
      console.error('CHAT_REQUEST_FAILED', { reason: 'send_without_connection' });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: prompt,
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      senderType: 'player',
      character: currentPlayer.character,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const reply = await onSendChat(prompt);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: reply,
        senderId: 'ai-gm',
        senderName: 'AI Game Master',
        senderType: 'ai',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('CHAT_REQUEST_FAILED', { reason: 'chat_send_failed', error });
      if (typeof window !== 'undefined') {
        window.alert(`チャットの送信に失敗しました: ${message}`);
      }
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: `エラー: ${message}`,
        senderId: 'system',
        senderName: 'System',
        senderType: 'system',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const MessageComponent = ({ message }: { message: ChatMessage }) => {
    const getMessageStyle = () => {
      switch (message.senderType) {
        case 'system':
          return 'bg-gradient-to-r from-slate-700 to-slate-600 border-slate-500 text-slate-200';
        case 'ai':
          return 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500 text-purple-100';
        case 'player':
          return message.senderId === currentPlayer.id 
            ? 'bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-cyan-500 text-cyan-100'
            : 'bg-gradient-to-r from-green-900/50 to-teal-900/50 border-green-500 text-green-100';
        default:
          return 'bg-slate-800 border-slate-600 text-slate-200';
      }
    };

    const getAvatar = () => {
      switch (message.senderType) {
        case 'system':
          return '⚙️';
        case 'ai':
          return '🤖';
        default:
          return onlinePlayers.find(p => p.id === message.senderId)?.avatar || '👤';
      }
    };

    return (
      <div className={`flex gap-3 mb-4 ${message.senderId === currentPlayer.id ? 'justify-end' : 'justify-start'}`}>
        {message.senderId !== currentPlayer.id && (
          <Avatar className="w-8 h-8 border-2 border-slate-600">
            <AvatarFallback className="bg-slate-700 text-slate-200">
              {getAvatar()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[80%] ${message.senderId === currentPlayer.id ? 'order-1' : 'order-2'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-slate-400">{message.senderName}</span>
            {message.character && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-600">
                {message.character}
              </Badge>
            )}
            <span className="text-xs text-slate-500">{message.timestamp}</span>
          </div>
          
          <Card className={`${getMessageStyle()} backdrop-blur-sm`}>
            <CardContent className="p-3">
              <p className="text-sm">{message.text}</p>
            </CardContent>
          </Card>
        </div>
        
        {message.senderId === currentPlayer.id && (
          <Avatar className="w-8 h-8 border-2 border-cyan-500">
            <AvatarFallback className="bg-cyan-800 text-cyan-200">
              {currentPlayer.avatar}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Room Header */}
      <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg text-cyan-100">Adventure Room {roomId}</h3>
            <p className="text-sm text-slate-400">AI-Driven Multiplayer Adventure</p>
            <p
              className={`text-xs ${
                connectionReady ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {connectionReady ? '✅ BFF接続済み' : '⏳ BFF接続待ち'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">{onlinePlayers.filter(p => p.isOnline).length} online</span>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="p-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex gap-2 overflow-x-auto">
          {onlinePlayers.map((player) => (
            <div key={player.id} className="flex items-center gap-2 bg-slate-700/50 rounded-full px-3 py-1 whitespace-nowrap">
              <span className="text-sm">{player.avatar}</span>
              <span className="text-xs text-slate-300">{player.name}</span>
              {player.isOnline && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
            </div>
          ))}
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}
          {isTyping && (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border-2 border-purple-500">
                <AvatarFallback className="bg-purple-800 text-purple-200">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500">
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your action or message..."
            className="flex-1 bg-slate-900/50 border-slate-600 text-slate-200 placeholder-slate-400 focus:border-cyan-500"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
