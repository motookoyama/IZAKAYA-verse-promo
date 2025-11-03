import React from 'react';

interface RunChecksButtonProps {
  isChecking: boolean;
  onClick: () => void;
}

const ButtonSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PlayIcon = () => (
    <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
    </svg>
)

export const RunChecksButton: React.FC<RunChecksButtonProps> = ({ isChecking, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={isChecking}
      className={`
        inline-flex items-center justify-center px-8 py-3 border border-transparent 
        text-base font-medium rounded-md text-white 
        bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-offset-gray-900 focus:ring-cyan-500
        transition-all duration-200 ease-in-out transform hover:scale-105
        disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100
      `}
    >
      {isChecking ? (
        <>
          <ButtonSpinner />
          診断を実行中...
        </>
      ) : (
        <>
            <PlayIcon />
            チェックを実行
        </>
      )}
    </button>
  );
};