import React from 'react';

const LogoIcon = () => (
    <svg 
        className="w-12 h-12 text-cyan-400 mr-4" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="M12 8v4l2 2"/>
        <path d="M16 6l-4 4"/>
        <path d="m13.5 2c-.2.5-.3 1.1-.3 1.6.1 1.8 1 3.2 2.5 4.1"/>
        <path d="M18.4 4.5c.6.5 1.1 1.2 1.4 2"/>
    </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="text-center py-4">
        <div className="flex items-center justify-center mb-2">
            <LogoIcon />
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Silly Checker
            </h1>
        </div>
      <p className="text-lg text-gray-400">
        よくある開発の落とし穴を自動で健全性チェックします。
      </p>
    </header>
  );
};