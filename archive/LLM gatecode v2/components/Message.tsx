
import React from 'react';
import type { Message } from 'app/types.js';

interface MessageProps {
    message: Message;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const Message: React.FC<MessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="flex items-start space-x-3 justify-end">
                <div className="bg-blue-600 text-white p-3 rounded-lg rounded-br-none max-w-lg">
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                    <UserIcon />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold">🏮</div>
            <div className="bg-slate-700 p-3 rounded-lg rounded-tl-none max-w-lg">
                <p className="text-sm whitespace-pre-wrap">
                    {message.text}
                    {!message.text.trim() && <span className="blinking-cursor"></span>}
                </p>
            </div>
        </div>
    );
};

export default Message;
