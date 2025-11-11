
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center mb-4 flex-shrink-0">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                🏮 IZAKAYA AI Chat
            </h1>
            <p className="text-slate-400 text-sm">Your friendly AI bartender</p>
        </header>
    );
};

export default Header;
