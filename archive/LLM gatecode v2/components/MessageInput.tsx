
import React, { useState } from 'react';

interface MessageInputProps {
    onSend: (text: string) => void;
    loading: boolean;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const MessageInput: React.FC<MessageInputProps> = ({ onSend, loading }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedText = text.trim();
        if (trimmedText) {
            onSend(trimmedText);
            setText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your message..."
                aria-label="Chat message input"
                rows={1}
                className="flex-grow p-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-shadow"
                disabled={loading}
            />
            <button
                type="submit"
                disabled={loading || !text.trim()}
                className="bg-blue-600 text-white p-2.5 rounded-full flex items-center justify-center h-10 w-10 flex-shrink-0 transition-colors duration-200 enabled:hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed"
                aria-label={loading ? "Sending message" : "Send message"}
            >
                {loading ? <LoadingSpinner /> : <SendIcon />}
            </button>
        </form>
    );
};

export default MessageInput;
