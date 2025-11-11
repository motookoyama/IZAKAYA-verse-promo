
import React, { useEffect, useRef } from 'react';
import type { Message as MessageType } from 'app/types.js';
import Message from 'app/components/Message.js';

interface ChatWindowProps {
    messages: MessageType[];
    loading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, loading }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    return (
        <main 
            ref={scrollRef} 
            className="flex-grow overflow-y-auto p-4 space-y-6 bg-slate-800/50 rounded-lg border border-slate-700"
            aria-live="polite"
        >
            {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">Send a message to start the conversation.</p>
                </div>
            )}
            {messages.map((msg) => (
                <Message key={msg.id} message={msg} />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
                 <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold">🏮</div>
                    <div className="bg-slate-700 p-3 rounded-lg rounded-tl-none max-w-lg">
                        <div className="blinking-cursor"></div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ChatWindow;
