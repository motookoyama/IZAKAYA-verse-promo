import React from 'react';
import type { CheckResult } from '../types';

interface ResultsPanelProps {
  failedChecks: CheckResult[];
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ failedChecks }) => {
  if (failedChecks.length === 0) {
    return null;
  }

  return (
      <div className="space-y-4">
        {failedChecks.map((result) => (
          <div key={result.checkId} className="p-4 bg-gray-700/50 rounded-md border-l-4 border-red-500">
            <p className="font-medium text-red-400">失敗: {result.checkId}</p>
            <p className="text-gray-300 mt-1">{result.message}</p>
            {result.suggestion && (
              <p className="text-sm text-cyan-300 mt-2">提案: {result.suggestion}</p>
            )}
          </div>
        ))}
      </div>
  );
};
