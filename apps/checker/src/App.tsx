import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { checkEndpoints, type CheckResult } from './utils/checkEndpoints';
import { StatusCard } from './components/StatusCard';

const API_BASE_URL = (window as any).__API_BASE_URL__ || import.meta?.env?.VITE_API_BASE_URL || '';
const UI_BASE_URL = (window as any).__UI_BASE_URL__ || import.meta?.env?.VITE_UI_BASE_URL || '';

export default function App(): JSX.Element {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runChecks = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (!API_BASE_URL || !UI_BASE_URL) {
        throw new Error('API_BASE_URL / UI_BASE_URL が設定されていません');
      }
      const response = await checkEndpoints(API_BASE_URL, UI_BASE_URL);
      setResults(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runChecks();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">IZAKAYA UI Health Checker</h1>
        <p className="text-slate-400">
          GitHub Pages と Render BFF の稼働状態を一括チェックします。
        </p>
      </header>

      <section className="flex flex-wrap gap-3">
        <div className="rounded-lg bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          <p>API: {API_BASE_URL || '未設定'}</p>
          <p>UI : {UI_BASE_URL || '未設定'}</p>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-emerald-900"
        >
          <RefreshCcw className="h-4 w-4" />
          {loading ? 'Checking…' : 'Check Again'}
        </button>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-500 bg-rose-950/40 px-4 py-3 text-rose-200">
          エラー: {error}
        </div>
      ) : null}

      <section className="grid gap-4">
        {results.map((result) => (
          <StatusCard key={result.name} result={result} />
        ))}
      </section>
    </main>
  );
}
