import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: string;
  botName?: string;
}

export function ChatMessage({ message, isBot, timestamp, botName = "居酒屋Bot" }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <Avatar className="w-8 h-8 border-2 border-red-300">
          <AvatarFallback className="bg-red-100 text-red-700">🏮</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[80%] ${isBot ? 'order-2' : 'order-1'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-muted-foreground">
            {isBot ? botName : 'あなた'}
          </span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        
        <Card className={`${
          isBot 
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
        }`}>
          <CardContent className="p-3">
            <p className={`text-sm ${
              isBot ? 'text-red-900' : 'text-amber-900'
            }`}>
              {message}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {!isBot && (
        <Avatar className="w-8 h-8 border-2 border-amber-300">
          <AvatarFallback className="bg-amber-100 text-amber-700">👤</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}