import axios from 'axios';

export type CheckResult = {
  name: string;
  url: string;
  status: 'ok' | 'fail';
  message: string;
  elapsedMs: number;
};

const withTiming = async (fn: () => Promise<void>): Promise<{ ok: boolean; message: string; elapsedMs: number }> => {
  const started = performance.now();
  try {
    await fn();
    return { ok: true, message: 'OK', elapsedMs: performance.now() - started };
  } catch (err) {
    const error = err as Error & { response?: { status: number }; code?: string };
    if (error.code === 'ERR_NETWORK') {
      return { ok: false, message: 'Network error', elapsedMs: performance.now() - started };
    }
    if (error.message?.includes('CORS')) {
      return { ok: false, message: 'CORS blocked', elapsedMs: performance.now() - started };
    }
    if (error.response) {
      return {
        ok: false,
        message: `HTTP ${error.response.status}`,
        elapsedMs: performance.now() - started,
      };
    }
    return { ok: false, message: error.message ?? 'Unknown error', elapsedMs: performance.now() - started };
  }
};

export const checkEndpoints = async (
  apiBaseUrl: string,
  uiBaseUrl: string
): Promise<CheckResult[]> => {
  const endpoints: Array<{ name: string; url: string; action: () => Promise<void> }> = [
    {
      name: 'API Health',
      url: `${apiBaseUrl.replace(/\\/$/, '')}/api/health`,
      action: () => axios.get(`${apiBaseUrl.replace(/\\/$/, '')}/api/health`, { timeout: 5000 }),
    },
    {
      name: 'API Points',
      url: `${apiBaseUrl.replace(/\\/$/, '')}/api/points`,
      action: () => axios.get(`${apiBaseUrl.replace(/\\/$/, '')}/api/points`, { timeout: 5000 }),
    },
    {
      name: 'UI Load',
      url: uiBaseUrl,
      action: () => axios.get(uiBaseUrl, { timeout: 5000 }),
    },
  ];

  const results: CheckResult[] = [];
  for (const endpoint of endpoints) {
    const result = await withTiming(endpoint.action);
    results.push({
      name: endpoint.name,
      url: endpoint.url,
      status: result.ok ? 'ok' : 'fail',
      message: result.message,
      elapsedMs: result.elapsedMs,
    });
  }
  return results;
};
