import React from 'react';
import type { Check, CheckResult } from '../types';
import { CheckStatus } from '../types';
import { StatusIcon } from './StatusIcon';

interface ChecklistItemProps {
  check: Check;
  result?: CheckResult;
  isFirst: boolean;
  isLast: boolean;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({ check, result, isFirst, isLast }) => {
  const status = result?.status || CheckStatus.PENDING;
  
  const getBorderColor = () => {
    switch (status) {
      case CheckStatus.SUCCESS:
        return 'border-green-500/50';
      case CheckStatus.FAIL:
        return 'border-red-500/50';
      case CheckStatus.RUNNING:
        return 'border-blue-500/50';
      default:
        return 'border-gray-600/50';
    }
  };

  return (
    <div 
        className={`
            flex items-center p-4 bg-gray-800 border-l-4 transition-all duration-300
            ${getBorderColor()}
            ${isFirst ? 'rounded-t-md' : ''}
            ${isLast ? 'rounded-b-md' : ''}
        `}
    >
      <div className="flex-shrink-0">
        <StatusIcon status={status} />
      </div>
      <div className="ml-4 flex-grow">
        <p className="font-medium text-gray-200">{check.label}</p>
        <p className="text-sm text-gray-400">{check.description}</p>
      </div>
    </div>
  );
};
