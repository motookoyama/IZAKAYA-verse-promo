
import React, { useState } from 'react';
import { useChat } from 'app/hooks/useChat.js';
import ChatWindow from 'app/components/ChatWindow.js';
import MessageInput from 'app/components/MessageInput.js';
import Header from 'app/components/Header.js';

const App: React.FC = () => {
    const [bffUrl, setBffUrl] = useState('');
    const { messages, loading, sendMessage } = useChat();

    const handleSend = (text: string) => {
        const trimmedUrl = bffUrl.trim();
        if (!text.trim() || !trimmedUrl) {
            alert("メッセージとCloud Run URLの両方を入力してください");
            return;
        }
        sendMessage(text, trimmedUrl);
    };

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto p-4 pb-6">
            <Header />
            
            <div className="mb-4 flex-shrink-0">
                <label htmlFor="bffUrl" className="block text-sm font-medium text-slate-300 mb-1">
                    Cloud Run BFF URL
                </label>
                <input 
                    id="bffUrl"
                    type="text"
                    value={bffUrl}
                    onChange={(e) => setBffUrl(e.target.value)}
                    placeholder="https://izakaya-bff-XXXXX.run.app"
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                    aria-label="Cloud Run BFF URL"
                />
            </div>

            <ChatWindow messages={messages} loading={loading} />
            
            <div className="mt-4">
                <MessageInput onSend={handleSend} loading={loading} />
            </div>
        </div>
    );
};

export default App;
