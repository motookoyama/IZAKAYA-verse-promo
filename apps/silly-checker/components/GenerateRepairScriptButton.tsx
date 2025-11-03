import React from 'react';

interface GenerateRepairScriptButtonProps {
  isGenerating: boolean;
  onClick: () => void;
  disabled: boolean;
}

const WandIcon = () => (
    <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M13.293 3.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-9 9a1 1 0 0 1-.39.242l-5 2a1 1 0 0 1-1.213-1.213l2-5a1 1 0 0 1 .242-.39l9-9zM15 5l4 4" />
        <path d="M5 15l4 4" />
    </svg>
)

const ButtonSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const GenerateRepairScriptButton: React.FC<GenerateRepairScriptButtonProps> = ({ isGenerating, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={isGenerating || disabled}
      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
    >
      {isGenerating ? (
        <>
            <ButtonSpinner />
            修復スクリプトを生成中...
        </>
      ) : (
        <>
            <WandIcon />
            AIで修復スクリプトを生成
        </>
      )}
    </button>
  );
};
