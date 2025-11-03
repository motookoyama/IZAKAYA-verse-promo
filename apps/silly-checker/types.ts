export enum CheckStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

export interface Check {
  id: string;
  label: string;
  description: string;
}

export interface CheckResult {
  checkId: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
}

export interface HistoryItem {
    id: string;
    timestamp: number;
    results: Record<string, CheckResult>;
    failedCount: number;
}
