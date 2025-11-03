import type { CheckResult, HistoryItem } from '../types';
import { CheckStatus } from '../types';

const HISTORY_KEY = 'silly-checker-history';
const MAX_HISTORY_ITEMS = 5;

export const getHistory = (): HistoryItem[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        if (historyJson) {
            return JSON.parse(historyJson);
        }
    } catch (error) {
        console.error('Failed to parse history from localStorage', error);
        localStorage.removeItem(HISTORY_KEY);
    }
    return [];
};

export const saveToHistory = (results: Record<string, CheckResult>) => {
    const failedCount = Object.values(results).filter(r => r.status === CheckStatus.FAIL).length;
    
    if (Object.keys(results).length === 0) {
        return; 
    }

    const newItem: HistoryItem = {
        id: `run-${Date.now()}`,
        timestamp: Date.now(),
        results,
        failedCount,
    };

    const currentHistory = getHistory();
    const newHistory = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error('Failed to save history to localStorage', error);
    }
};
