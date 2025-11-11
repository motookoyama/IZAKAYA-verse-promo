
import { useState, useCallback } from 'react';
import type { Message } from 'app/types.js';

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = useCallback(async (text: string, bffUrl: string) => {
        setLoading(true);

        const userMessage: Message = { id: self.crypto.randomUUID(), role: 'user', text };
        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await fetch(`${bffUrl}/chat/v1`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Could not read error body.');
                throw new Error(`Request failed with status ${response.status}. ${errorBody}`);
            }

            const data = await response.json();
            const reply = data.reply || "[応答なし]";
            const aiMessage: Message = { id: self.crypto.randomUUID(), role: 'model', text: reply };
            setMessages(prev => [...prev, aiMessage]);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown network error occurred.";
            console.error(e);
            const errorResponseMessage: Message = { 
                id: self.crypto.randomUUID(), 
                role: 'model', 
                text: `⚠ エラー発生: ${errorMessage}` 
            };
            setMessages(prev => [...prev, errorResponseMessage]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { messages, loading, sendMessage };
};
