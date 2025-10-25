import { Check } from 'lucide-react';
import type { CheckResult } from '../utils/checkEndpoints';

const statusColors: Record<CheckResult['status'], string> = {
  ok: 'border-emerald-500 text-emerald-400',
  fail: 'border-rose-500 text-rose-300',
};

type Props = {
  result: CheckResult;
};

export function StatusCard({ result }: Props): JSX.Element {
  return (
    <div className={`rounded-xl border px-4 py-3 bg-slate-900/70 ${statusColors[result.status]}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{result.name}</span>
        <span className="text-sm">{result.elapsedMs.toFixed(0)} ms</span>
      </div>
      <p className="text-sm text-slate-400 break-all">
        <a href={result.url} target="_blank" rel="noreferrer" className="underline">
          {result.url}
        </a>
      </p>
      <div className="flex items-center gap-2 pt-2">
        <Check className={`h-4 w-4 ${result.status === 'ok' ? 'text-emerald-400' : 'text-rose-300'}`} />
        <span>{result.message}</span>
      </div>
    </div>
  );
}
