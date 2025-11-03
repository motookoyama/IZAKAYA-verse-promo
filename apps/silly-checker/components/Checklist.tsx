import React from 'react';
import type { Check, CheckResult } from '../types';
import { ChecklistItem } from './ChecklistItem';

interface ChecklistProps {
  checks: Check[];
  results: Record<string, CheckResult>;
}

export const Checklist: React.FC<ChecklistProps> = ({ checks, results }) => {
  return (
    <div className="space-y-4">
      {checks.map((check, index) => (
        <ChecklistItem key={check.id} check={check} result={results[check.id]} isFirst={index === 0} isLast={index === checks.length - 1} />
      ))}
    </div>
  );
};
