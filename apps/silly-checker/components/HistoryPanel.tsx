import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
    history: HistoryItem[];
    onLoad: (results: HistoryItem['results']) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad }) => {
    if (history.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                <p>実行履歴はありません。</p>
            </div>
        );
    }
    
    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">実行履歴</h2>
            <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden">
                <ul className="divide-y divide-gray-700">
                    {history.map((item) => (
                        <li key={item.id} className="p-4 hover:bg-gray-700/50 transition-colors duration-200 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-300">
                                    {new Date(item.timestamp).toLocaleString()}
                                </p>
                                <p className={`text-sm ${item.failedCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {item.failedCount > 0 ? `${item.failedCount} 件の失敗` : 'すべてのチェックが成功'}
                                </p>
                            </div>
                            <button 
                                onClick={() => onLoad(item.results)}
                                className="px-3 py-1 border border-gray-600 text-xs font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                            >
                                表示
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
