import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminBillingPanel from "./components/AdminBillingPanel";
import drOrbAvatar from "./assets/dr-orb.png";
import missMadiAvatar from "./assets/miss-madi.png";

type Role = "user" | "ai";

type CardRecord = {
  id: string;
  name: string;
  system?: string;
  avatar?: string;
  kind?: "featured" | "api" | "custom";
};

type Message = {
  role: Role;
  text: string;
  cardId?: string;
  cardName?: string;
};

type ProviderConfig = {
  provider: string;
  model?: string;
  endpoint?: string;
  hasApiKey?: boolean;
  updatedAt?: string;
  source?: string;
};

type ProviderOption = { label: string; value: string };

type PasswordForm = {
  current: string;
  next: string;
  confirm: string;
};

type HealthStatus = {
  status: string;
  service: string;
  provider: string;
  cards: number;
  hostname?: string;
};

type ConnectionStatus =
  | { state: "pending" }
  | { state: "ok"; url: string; reply: string }
  | { state: "error"; failures: { url: string; detail: string }[] };

type EndpointCheck = {
  endpoint: string;
  url: string;
  ok: boolean;
  detail?: string;
};

type HeartbeatDebugInfo = {
  endpoint: string;
  lastResponse?: {
    endpoint: string;
    status: number;
    body: unknown;
  };
};

function resolveInitialBffBase(): string {
  const raw =
    (import.meta.env.VITE_REACT_APP_BFF_URL as string | undefined) ||
    (import.meta.env.VITE_BFF_URL as string | undefined) ||
    (import.meta.env.REACT_APP_BFF_URL as string | undefined);
  const fallback = "http://localhost:4117";
  const selected = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : fallback;
  return selected.replace(/\/+$/, "");
}

const normalizeBase = (value: string) => value.replace(/\/+$/, "");

const BFF_BASE_URL = resolveInitialBffBase();
const BFF_CANDIDATES = [BFF_BASE_URL];

let resolvedBffBase = normalizeBase(BFF_BASE_URL);

const getResolvedBffBase = () => resolvedBffBase;
const setResolvedBffBase = (value: string) => {
  resolvedBffBase = normalizeBase(value);
};

const HEALTHCHECK_UID = "IZK_HEALTHCHECK_UI";
const HEALTHCHECK_PROMPT = "[health-check] BFF connectivity verification";

const PAYPAL_PLANS = [
  {
    id: "jp-1000",
    region: "国内向け",
    label: "IZAKAYA 1000P",
    description: "IZAKAYAverseの利用ポイント1000Pを購入します",
    price: "¥1,000",
    currency: "JPY",
    url: "https://www.paypal.com/ncp/payment/SBPMPM8BFRQUW",
  },
  {
    id: "jp-5000",
    region: "国内向け",
    label: "IZAKAYA 5000P",
    description: "IZAKAYAverseの利用ポイント5000Pを購入します",
    price: "¥5,000",
    currency: "JPY",
    url: "https://www.paypal.com/ncp/payment/WWLCPFUX2K2VA",
  },
  {
    id: "us-1000",
    region: "海外向け",
    label: "IZAKAYA 1000P",
    description: "Purchase 1000 points for IZAKAYAverse",
    price: "$10",
    currency: "USD",
    url: "https://www.paypal.com/ncp/payment/HTHQFN7EADLPC",
  },
  {
    id: "us-5000",
    region: "海外向け",
    label: "IZAKAYA 5000P",
    description: "Purchase 5000 points for IZAKAYAverse",
    price: "$50",
    currency: "USD",
    url: "https://www.paypal.com/ncp/payment/PKBQ6WBAGHVUW",
  },
  {
    id: "support",
    region: "Support",
    label: "IZAKAYA Support / Motoo Koyama",
    description: "活動を支援するためのカンパ（ポイント付与なし）",
    price: "自由設定",
    currency: "",
    url: "https://www.paypal.com/ncp/payment/YP4SEMBEH3AHQ",
  },
];

const FEATURED_CARDS: CardRecord[] = [
  { id: "dr-orb", name: "Dr. Orb", avatar: drOrbAvatar, kind: "featured" },
  { id: "miss-madi", name: "Miss Madi", avatar: missMadiAvatar, kind: "featured" },
  { id: "placeholder", name: "V2Card.PNG", kind: "placeholder" },
];

function buildRequestUrl(path: string, baseOverride?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = baseOverride ? normalizeBase(baseOverride) : getResolvedBffBase();
  return `${base}${normalizedPath}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildRequestUrl(path);
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

type DebugFetchResult = {
  status: number;
  ok: boolean;
  body: unknown;
  rawBody: string;
};

async function fetchWithDebug(url: string, init: RequestInit): Promise<DebugFetchResult> {
  const response = await fetch(url, init);
  const status = response.status;
  let rawBody = "";
  try {
    rawBody = await response.text();
  } catch {
    rawBody = "";
  }
  let body: unknown = rawBody;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      // leave as text
    }
  } else {
    body = {};
  }
  return {
    status,
    ok: response.ok,
    body,
    rawBody,
  };
}

function asJsonObject<T = Record<string, any>>(value: unknown): T | null {
  if (value && typeof value === "object") {
    return value as T;
  }
  return null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const STATUS_COLOR: Record<string, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  error: "text-rose-500",
};

type Theme = "light" | "dark";

type ThemeClasses = {
  page: string;
  panel: string;
  accent: string;
  btnPrimary: string;
  header: string;
  title: string;
  bubbleUser: string;
  bubbleAi: string;
  badge: string;
  cardChipSelected: string;
  cardChip: string;
  cardSelected: string;
  card: string;
  textSubtle: string;
  dockLabel: string;
};

const THEME_MAP: Record<Theme, ThemeClasses> = {
  light: {
    page: "bg-[#f7f5ff]",
    panel: "bg-white border border-zinc-200",
    accent: "from-rose-500 to-pink-500",
    btnPrimary: "bg-rose-600 hover:bg-rose-700",
    header: "bg-white/90",
    title: "text-4xl font-extrabold tracking-tight text-[#152053]",
    bubbleUser: "bg-[#1d1d2f] text-white",
    bubbleAi: "bg-white border border-[#ffe5ef]",
    badge: "bg-rose-100 text-rose-600",
    cardChipSelected: "border-rose-600 text-rose-700 bg-rose-50",
    cardChip: "border-zinc-300 bg-white text-zinc-600",
    cardSelected: "border-rose-600 ring-2 ring-rose-200",
    card: "border-zinc-200 hover:border-zinc-300 bg-white",
    textSubtle: "text-zinc-500",
    dockLabel: "text-zinc-600",
  },
  dark: {
    page: "bg-[#090910]",
    panel: "bg-[#111118] border border-zinc-800",
    accent: "from-purple-500 to-rose-500",
    btnPrimary: "bg-purple-600 hover:bg-purple-700",
    header: "bg-[#090910]/85",
    title: "text-4xl font-extrabold tracking-tight text-zinc-100",
    bubbleUser: "bg-[#202046] text-white",
    bubbleAi: "bg-[#161627] border border-[#2c2d52] text-zinc-100",
    badge: "bg-purple-900/40 text-purple-300",
    cardChipSelected: "border-purple-400 text-purple-300 bg-purple-900/30",
    cardChip: "border-zinc-700 bg-[#161616] text-zinc-300",
    cardSelected: "border-purple-400 ring-2 ring-purple-700/40",
    card: "border-zinc-700 hover:border-zinc-500 bg-[#13131e]",
    textSubtle: "text-zinc-400",
    dockLabel: "text-zinc-400",
  },
};

const PROVIDER_OPTIONS: ProviderOption[] = [
  { label: "Gemini", value: "GEMINI" },
  { label: "OpenAI", value: "OPENAI" },
  { label: "Ollama", value: "OLLAMA" },
  { label: "Custom Provider", value: "CUSTOM" },
];

const ADMIN_STORAGE_KEY = "IZK_ADMIN_MODE";
const HealthBadge: React.FC<{ health?: HealthStatus; loading: boolean; error?: string }> = ({
  health,
  loading,
  error,
}) => {
  if (loading) return <span className="text-xs text-zinc-400">checking…</span>;
  if (error) {
    return <span className="text-xs text-rose-500">offline</span>;
  }
  if (!health) return null;
  return (
    <span className={`text-xs ${STATUS_COLOR[health.status] ?? "text-emerald-500"}`}>
      {health.status} <span className="text-zinc-500">• {health.provider}</span>
    </span>
  );
};

const ConnectionStatusPill: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  if (status.state === "pending") {
    return <span className="text-xs text-zinc-400">BFF接続チェック中…</span>;
  }
  if (status.state === "ok") {
    return (
      <span className="text-xs text-emerald-500">
        ✅ BFF接続成功 • <span className="text-emerald-600">{status.url}</span>
      </span>
    );
  }
  const firstFailure = status.failures[0];
  return (
    <span className="text-xs text-rose-500">
      ❌ BFF接続失敗
      {firstFailure ? (
        <>
          {" "}
          • {firstFailure.url} ({firstFailure.detail})
        </>
      ) : null}
    </span>
  );
};

const HealthCheckIndicator: React.FC<{ checks: EndpointCheck[] }> = ({ checks }) => {
  if (checks.length === 0) return null;
  const failures = checks.filter((check) => !check.ok);
  if (failures.length === 0) {
    return <span className="text-xs text-emerald-500">✅ ヘルスチェック全通過</span>;
  }
  return (
    <span className="text-xs text-rose-500">
      ⚠️ ヘルス異常: {failures.map((item) => item.endpoint).join(", ")}
    </span>
  );
};

const HeaderIcon: React.FC = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-rose-400 text-xl font-bold text-white shadow-lg">
    IZ
  </div>
);

const ChatAvatar: React.FC<{ url?: string; label: string; role: Role }> = ({ url, label, role }) => {
  if (url) {
    return <img src={url} alt={label} className="h-10 w-10 rounded-2xl border border-white/20 object-cover shadow" />;
  }
  if (role === "user") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-zinc-500 bg-transparent text-lg text-zinc-500 shadow">
        ◯
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-zinc-500 bg-transparent text-xs font-semibold uppercase text-zinc-500">
      NPC
    </div>
  );
};

const CardChip: React.FC<{ name: string; selected?: boolean; themeClasses: ThemeClasses }> = ({
  name,
  selected,
  themeClasses,
}) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
      selected ? themeClasses.cardChipSelected : themeClasses.cardChip,
    ].join(" ")}
  >
    <span className="h-3 w-3 rounded-sm bg-gradient-to-br from-zinc-300 to-zinc-500" />
    {name}
  </span>
);

type AdminPanelProps = {
  providerOptions: ProviderOption[];
  providerForm: { provider: string; model: string };
  onProviderChange: (field: "provider" | "model", value: string) => void;
  onSaveProvider: () => void;
  apiKeyInput: string;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onClearApiKey: () => void;
  notice: string | null;
  error: string | null;
  loading: boolean;
  passwordForm: PasswordForm;
  onPasswordChange: (field: keyof PasswordForm, value: string) => void;
  onSavePassword: () => void;
  providerConfig: ProviderConfig | null;
  healthChecks: EndpointCheck[];
  onRetryHealthChecks: () => void;
  healthChecksRunning: boolean;
  heartbeatDebug: HeartbeatDebugInfo | null;
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  providerOptions,
  providerForm,
  onProviderChange,
  onSaveProvider,
  apiKeyInput,
  onApiKeyChange,
  onSaveApiKey,
  onClearApiKey,
  notice,
  error,
  loading,
  passwordForm,
  onPasswordChange,
  onSavePassword,
  providerConfig,
  healthChecks,
  onRetryHealthChecks,
  healthChecksRunning,
  heartbeatDebug,
}) => {
  const passwordMismatch = passwordForm.next !== passwordForm.confirm;
  const passwordTooShort =
    passwordForm.next.trim().length > 0 && passwordForm.next.trim().length < 6;
  const passwordDisabled =
    loading ||
    !passwordForm.current.trim() ||
    !passwordForm.next.trim() ||
    passwordMismatch ||
    passwordTooShort;
  const hasHealthFailures = healthChecks.some((check) => !check.ok);

  return (
    <section
      id="admin"
      className="rounded-3xl border border-zinc-200/60 bg-white px-6 py-6 shadow-lg dark:border-zinc-700/50 dark:bg-[#111118]"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">管理タブ</h2>
        {providerConfig?.updatedAt && (
          <span className="text-xs text-zinc-500">
            最終更新: {new Date(providerConfig.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200">
          {notice}
        </div>
      )}
      {healthChecks.length > 0 && (
        <div
          className={[
            "mb-4 rounded-lg px-4 py-3 text-sm",
            hasHealthFailures
              ? "border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">BFFヘルスチェック</div>
            <button
              onClick={onRetryHealthChecks}
              type="button"
              disabled={healthChecksRunning}
              className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {healthChecksRunning ? "検証中…" : "再検証"}
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {healthChecks.map((check) => (
              <li key={check.endpoint} className="flex flex-col text-xs leading-relaxed">
                <span className="font-semibold">
                  {check.ok ? "✅" : "❌"} {check.endpoint}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {check.url}
                  {!check.ok && check.detail ? ` — ${check.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {heartbeatDebug && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-600/60 dark:bg-slate-900/40 dark:text-slate-200">
          <div className="font-medium">HeartBeat Debug (Admin only)</div>
          <div className="mt-2 space-y-2 text-xs">
            <div className="break-all"><span className="font-semibold">BFF Endpoint:</span> {heartbeatDebug.endpoint}</div>
            {heartbeatDebug.lastResponse ? (
              <div className="space-y-1">
                <div className="font-semibold">Last Response</div>
                <div className="break-all text-[11px] text-slate-500 dark:text-slate-400">
                  {heartbeatDebug.lastResponse.endpoint}
                </div>
                <div>status: {heartbeatDebug.lastResponse.status}</div>
                <details className="rounded bg-black/5 p-2 dark:bg-white/10">
                  <summary className="cursor-pointer text-[11px] font-semibold">show body</summary>
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[11px] font-mono">
{JSON.stringify(heartbeatDebug.lastResponse.body, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">レスポンス情報はまだ取得されていません。</div>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSaveProvider();
          }}
        className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-700/40 dark:bg-[#0f0f19]"
      >
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-100">プロバイダ設定</h3>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          プロバイダ
        </label>
        <select
          value={providerForm.provider}
          onChange={(event) => onProviderChange("provider", event.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          モデル名
        </label>
        <input
          type="text"
          value={providerForm.model}
          onChange={(event) => onProviderChange("model", event.target.value)}
          placeholder="例: gemini-pro / gpt-4o-mini / llama3"
          className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-60 dark:bg-purple-600 dark:hover:bg-purple-500"
        >
          {loading ? "保存中…" : "保存"}
        </button>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSaveApiKey();
        }}
        className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-700/40 dark:bg-[#0f0f19]"
      >
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-100">APIキー設定</h3>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          APIキー
        </label>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={providerConfig?.hasApiKey ? "******** （上書きする場合のみ入力）" : "APIキーを入力"}
          className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {loading ? "保存中…" : "APIキーを保存"}
          </button>
          <button
            type="button"
            onClick={onClearApiKey}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-rose-300 hover:text-rose-500 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-rose-400 dark:hover:text-rose-300"
          >
            キーを削除
          </button>
          {providerConfig?.hasApiKey && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">保存済みのキーあり</span>
          )}
        </div>
      </form>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSavePassword();
        }}
        className="mt-6 rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-700/40 dark:bg-[#0f0f19]"
      >
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-100">パスワード変更</h3>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          現在のパスワード
        </label>
        <input
          type="password"
          value={passwordForm.current}
          onChange={(event) => onPasswordChange("current", event.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        />
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          新しいパスワード
        </label>
        <input
          type="password"
          value={passwordForm.next}
          onChange={(event) => onPasswordChange("next", event.target.value)}
          className="mb-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        />
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          新しいパスワード（確認）
        </label>
        <input
          type="password"
          value={passwordForm.confirm}
          onChange={(event) => onPasswordChange("confirm", event.target.value)}
          className="mb-3 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-[#141425] dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:ring-purple-500/40"
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">※ 6文字以上のパスワードを推奨します。</p>
        {passwordMismatch && (
          <p className="mb-3 text-xs text-rose-600 dark:text-rose-300">新しいパスワードが一致していません。</p>
        )}
        {passwordTooShort && (
          <p className="mb-3 text-xs text-rose-600 dark:text-rose-300">新しいパスワードは6文字以上にしてください。</p>
        )}
        <button
          type="submit"
          disabled={passwordDisabled}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {loading ? "保存中…" : "変更を保存"}
        </button>
      </form>
      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-[#141425] dark:text-zinc-300">
        設定は <code className="font-mono">apps/bff/mini/.env</code> に保存され、UI から変更すると即時反映されます。
      </div>
    </section>
  );
};

const Bubble: React.FC<{
  role: Role;
  text: string;
  card?: CardRecord;
  themeClasses: ThemeClasses;
}> = ({ role, text, card, themeClasses }) => (
  <div
    className={[
      "flex items-start gap-3",
      role === "user" ? "flex-row-reverse text-right" : "flex-row",
    ].join(" ")}
  >
    <ChatAvatar url={card?.avatar} label={card?.name ?? ""} role={role} />
    <div
      className={[
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition",
        role === "user" ? themeClasses.bubbleUser : themeClasses.bubbleAi,
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
        <span className="uppercase tracking-wide">{role === "user" ? "You" : card?.name ?? "Dr.Orb"}</span>
        {card && <CardChip name={card.name} themeClasses={themeClasses} />}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  </div>
);

const CardDock: React.FC<{
  cards: CardRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRegisterClick: () => void;
  onDropFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  themeClasses: ThemeClasses;
}> = ({ cards, selectedId, onSelect, onRegisterClick, onDropFiles, onRemove, themeClasses }) => {
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    onDropFiles(event.dataTransfer.files);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => event.preventDefault();

  return (
    <section
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`rounded-2xl ${themeClasses.panel} p-4 shadow-sm`}
      title="PNG(400x600)をドロップしてカードを追加"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`text-[11px] uppercase tracking-wide ${themeClasses.dockLabel}`}>Card Dock</div>
        <button
          onClick={onRegisterClick}
          className="rounded-full border border-dashed border-rose-300 px-3 py-1 text-xs font-medium text-rose-500 hover:border-rose-500 hover:text-rose-600"
        >
          ＋ カード登録
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => {
          const isSelected = selectedId === card.id;
          const hasAvatar = Boolean(card.avatar);
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className={[
                "group relative flex flex-none flex-col overflow-hidden rounded-2xl transition focus:outline-none",
                hasAvatar ? "h-32 w-24 border shadow-sm" : "h-auto w-auto border-none",
                hasAvatar
                  ? isSelected
                    ? themeClasses.cardSelected
                    : themeClasses.card
                  : isSelected
                  ? "ring-2 ring-rose-200 bg-white text-rose-500"
                  : "bg-white text-zinc-600 hover:bg-rose-50",
              ].join(" ")}
            >
            {hasAvatar ? (
              <>
                  <div className="relative flex-1 w-full">
                    <img src={card.avatar} alt={card.name} className="h-full w-full object-cover" />
                    {card.kind === "featured" && (
                      <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        featured
                      </span>
                    )}
                    {card.kind === "custom" && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-semibold text-white hover:bg-black/80"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(card.id);
                        }}
                      >
                        ⏏︎
                      </button>
                    )}
                  </div>
                  <div className="line-clamp-2 px-2 py-1 text-center text-[11px] text-zinc-600">{card.name}</div>
                </>
              ) : (
                <div className="flex h-32 w-24 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white text-xs font-medium text-rose-500">
                  <span className="text-base">🖼️</span>
                  <span className="mt-1">{card.name}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className={`mt-3 text-xs ${themeClasses.textSubtle}`}>
        Dr.Orb / Miss Madi はプリロード済み。PNG(400×600)をドロップするとカードキャラクターを追加登録できます。
      </p>
    </section>
  );
};

const PayPalGrid: React.FC = () => (
  <section id="billing" className="rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-rose-100">
    <header className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-[#152053]">課金ポイント・サポート</h2>
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">PayPal</span>
    </header>
    <p className="mb-4 text-sm text-zinc-600">
      AI駆動系のエンタメサービスです。長期プレイの場合はポイントのご購入をお願いします。
    </p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PAYPAL_PLANS.map((plan) => (
        <article
          key={plan.id}
          className="flex h-full flex-col rounded-xl border border-rose-100 bg-white p-4 shadow-sm transition hover:border-rose-300"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-rose-500">{plan.region}</div>
          <h3 className="mt-1 text-base font-semibold text-[#1d1d35]">{plan.label}</h3>
          <p className="mt-2 flex-1 text-sm text-zinc-500">{plan.description}</p>
          <div className="mt-3 text-sm font-semibold text-rose-600">
            {plan.price} {plan.currency}
          </div>
          <a
            href={plan.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white shadow hover:from-rose-600 hover:to-rose-700"
          >
            PayPalで購入
          </a>
        </article>
      ))}
    </div>
  </section>
);

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("light");
  const bffCandidates = useMemo(() => BFF_CANDIDATES, []);
  const themeClasses = useMemo(() => THEME_MAP[theme], [theme]);

  const [cards, setCards] = useState<CardRecord[]>(FEATURED_CARDS);
  const [selectedCard, setSelectedCard] = useState<string>(FEATURED_CARDS[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [health, setHealth] = useState<HealthStatus>();
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
  });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [providerForm, setProviderForm] = useState({ provider: "GEMINI", model: "" });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current: "",
    next: "",
    confirm: "",
  });
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [loadingAdminConfig, setLoadingAdminConfig] = useState(false);
  const [heartbeatDebug, setHeartbeatDebug] = useState<HeartbeatDebugInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: "pending" });
  const [endpointChecks, setEndpointChecks] = useState<EndpointCheck[]>([]);
  const [healthChecksRunning, setHealthChecksRunning] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const adminNoticeTimerRef = useRef<number | null>(null);

  const recordHeartbeatResponse = useCallback(
    (base: string, info?: { endpoint: string; status: number; body: unknown }) => {
      setHeartbeatDebug((prev) => ({
        endpoint: base,
        lastResponse: info ?? prev?.lastResponse,
      }));
    },
    [],
  );

  useEffect(() => {
    const storedTheme = localStorage.getItem("IZAKAYA_THEME");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("IZAKAYA_THEME", theme);
  }, [theme]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const refreshHealth = async () => {
    setLoadingHealth(true);
    setHealthError(undefined);
    try {
      const data = await apiFetch<HealthStatus>("/api/health");
      setHealth(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingHealth(false);
    }
  };

  const enrichCard = (card: CardRecord, kind: CardRecord["kind"] = "api"): CardRecord => {
    const preset = FEATURED_CARDS.find((featured) => {
      const normalizedName = card.name.toLowerCase();
      return (
        featured.id === card.id ||
        normalizedName.includes(featured.name.toLowerCase()) ||
        (card.system && card.system.toLowerCase().includes(featured.name.toLowerCase()))
      );
    });
    return {
      ...card,
      id: card.id || slugify(card.name),
      avatar: card.avatar || preset?.avatar,
      kind,
    };
  };

  const refreshCards = async () => {
    try {
      const data = await apiFetch<{ cards: CardRecord[] }>("/cards");
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        setCards((prev) => {
          const map = new Map<string, CardRecord>();
          [...prev, ...data.cards.map((card) => enrichCard(card))].forEach((card) => {
            map.set(card.id, card);
          });
          const merged = Array.from(map.values());
          if (!merged.find((card) => card.id === selectedCard) && merged.length > 0) {
            setSelectedCard(merged[0].id);
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn("failed to fetch cards", err);
    }
  };

  const probeChatEndpoint = async (base: string) => {
    const url = buildRequestUrl("/chat/v1", base);
    const result = await fetchWithDebug(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: HEALTHCHECK_PROMPT, cardId: "health-check", temperature: 0 }),
    });
    recordHeartbeatResponse(base, { endpoint: url, status: result.status, body: result.body });
    if (!result.ok) {
      throw new Error(`HTTP ${result.status} ${result.rawBody}`.trim());
    }
    const data = asJsonObject<{ reply?: string }>(result.body) ?? {};
    const reply = typeof data.reply === "string" ? data.reply.trim() : "";
    if (!reply) {
      throw new Error("BFF応答エラー: 空の返信");
    }
    return { reply, data };
  };

  const performHealthChecks = async (base: string, reply: string): Promise<EndpointCheck[]> => {
    const normalizedBase = normalizeBase(base);
    const checks: EndpointCheck[] = [
      {
        endpoint: "/chat/v1",
        url: buildRequestUrl("/chat/v1", normalizedBase),
        ok: true,
        detail: `reply length: ${reply.length}`,
      },
    ];

    const headers = {
      "content-type": "application/json",
      "X-IZK-UID": HEALTHCHECK_UID,
    };

    const balanceUrl = buildRequestUrl("/wallet/balance", normalizedBase);
    try {
      const res = await fetchWithDebug(balanceUrl, { headers });
      recordHeartbeatResponse(base, { endpoint: balanceUrl, status: res.status, body: res.body });
      if (!res.ok) {
        checks.push({
          endpoint: "/wallet/balance",
          url: balanceUrl,
          ok: false,
          detail: `HTTP ${res.status} ${res.rawBody}`.trim(),
        });
      } else {
        const payload = asJsonObject<{ balance?: number }>(res.body) ?? {};
        const balanceDetail =
          typeof payload.balance === "number" ? `balance=${payload.balance}` : undefined;
        checks.push({ endpoint: "/wallet/balance", url: balanceUrl, ok: true, detail: balanceDetail });
      }
    } catch (error) {
      checks.push({
        endpoint: "/wallet/balance",
        url: balanceUrl,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const redeemUrl = buildRequestUrl("/wallet/redeem", normalizedBase);
    const consumeUrl = buildRequestUrl("/wallet/consume", normalizedBase);
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    const txId = `TX-${ymd}-${token}`;
    let redeemSucceeded = false;
    let redeemDetail: string | undefined;

    try {
      const redeemRes = await fetchWithDebug(redeemUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ amount_pt: 1, tx_id: txId }),
      });
      recordHeartbeatResponse(base, { endpoint: redeemUrl, status: redeemRes.status, body: redeemRes.body });
      if (!redeemRes.ok) {
        redeemDetail = `HTTP ${redeemRes.status} ${redeemRes.rawBody}`.trim();
      } else {
        redeemSucceeded = true;
      }
    } catch (error) {
      redeemDetail = error instanceof Error ? error.message : String(error);
    }

    if (redeemSucceeded) {
      const idempotencyKey = `health-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        const consumeRes = await fetchWithDebug(consumeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ amount_pt: 1, sku: "health-check", idempotency_key: idempotencyKey }),
        });
        recordHeartbeatResponse(base, { endpoint: consumeUrl, status: consumeRes.status, body: consumeRes.body });
        if (!consumeRes.ok) {
          checks.push({
            endpoint: "/wallet/consume",
            url: consumeUrl,
            ok: false,
            detail: `HTTP ${consumeRes.status} ${consumeRes.rawBody}`.trim(),
          });
        } else {
          const payload = asJsonObject<{ balance?: number }>(consumeRes.body) ?? {};
          const detail =
            typeof payload.balance === "number" ? `balance=${payload.balance}` : "ok";
          checks.push({ endpoint: "/wallet/consume", url: consumeUrl, ok: true, detail });
        }
      } catch (error) {
        checks.push({
          endpoint: "/wallet/consume",
          url: consumeUrl,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      checks.push({
        endpoint: "/wallet/consume",
        url: consumeUrl,
        ok: false,
        detail: redeemDetail ? `redeem failed: ${redeemDetail}` : "redeem failed",
      });
    }

    return checks;
  };

  const runHealthChecks = async (base: string, reply: string) => {
    setHealthChecksRunning(true);
    try {
      const checks = await performHealthChecks(base, reply);
      setEndpointChecks(checks);
      const failures = checks.filter((check) => !check.ok);
      if (failures.length > 0) {
        console.error("CHAT_REQUEST_FAILED", { reason: "healthcheck_failed", failures });
      }
      return checks;
    } finally {
      setHealthChecksRunning(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setConnectionStatus({ state: "pending" });
      setEndpointChecks([]);
      setHeartbeatDebug(null);
      const failures: { url: string; detail: string }[] = [];

      for (const candidate of bffCandidates) {
        const base = normalizeBase(candidate);
        try {
          const { reply } = await probeChatEndpoint(base);
          if (cancelled) return;
          setResolvedBffBase(base);
          setConnectionStatus({ state: "ok", url: base, reply });
          recordHeartbeatResponse(base);
          setMessages((prev) =>
            prev.length === 0
              ? [
                  {
                    role: "ai",
                    text: reply,
                    cardId: FEATURED_CARDS[0]?.id,
                    cardName: "BFFヘルスチェック",
                  },
                ]
              : prev,
          );
          await refreshHealth();
          await refreshCards();
          await runHealthChecks(base, reply);
          return;
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.error("CHAT_REQUEST_FAILED", {
            reason: "bootstrap_candidate_failed",
            url: base,
            error,
          });
          failures.push({ url: base, detail });
        }
      }

      if (!cancelled) {
        setConnectionStatus({ state: "error", failures });
        if (typeof window !== "undefined") {
          const failedUrls = failures.map((failure) => failure.url).join(", ") || "未設定";
          window.alert(`❌ BFFに接続できません（URL: ${failedUrls}）`);
        }
        console.error("CHAT_REQUEST_FAILED", { reason: "bootstrap_failed", failures });
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bffCandidates]);

  const handleRetryHealthChecks = async () => {
    if (connectionStatus.state !== "ok") {
      if (typeof window !== "undefined") {
        window.alert("BFF未接続です。接続を確認してから再度お試しください。");
      }
      console.error("CHAT_REQUEST_FAILED", { reason: "healthcheck_retry_without_connection" });
      return;
    }
    try {
      await runHealthChecks(connectionStatus.url, connectionStatus.reply);
      await refreshHealth();
    } catch (error) {
      console.error("CHAT_REQUEST_FAILED", { reason: "healthcheck_retry_failed", error });
    }
  };

  const showAdminToast = useCallback((message: string) => {
    setAdminError(null);
    setAdminNotice(message);
    if (adminNoticeTimerRef.current) {
      window.clearTimeout(adminNoticeTimerRef.current);
    }
    adminNoticeTimerRef.current = window.setTimeout(() => {
      setAdminNotice(null);
      adminNoticeTimerRef.current = null;
    }, 4000);
  }, []);

  const fetchProviderConfig = useCallback(async () => {
    try {
      setLoadingAdminConfig(true);
      const data = await apiFetch<ProviderConfig>("/admin/provider");
      setProviderConfig(data);
      setProviderForm({
        provider: (data.provider ?? "GEMINI").toUpperCase(),
        model: data.model ?? "",
      });
      setAdminError(null);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingAdminConfig(false);
    }
  }, []);

  const addMessage = (message: Message) => setMessages((prev) => [...prev, message]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    if (connectionStatus.state !== "ok") {
      if (typeof window !== "undefined") {
        window.alert("BFF未接続です。接続確認後に再度お試しください。");
      }
      console.error("CHAT_REQUEST_FAILED", { reason: "send_without_connection" });
      return;
    }
    const tempValue = Math.min(1, Math.max(0, Number(temperature) || 0.7));
    const selectedCardMeta = cards.find((card) => card.id === selectedCard);
    setInput("");
    addMessage({ role: "user", text: content });
    setSending(true);
    try {
      const body = { prompt: content, cardId: selectedCard, temperature: tempValue };
      const data = await apiFetch<{ reply: string; meta?: Record<string, string> }>("/chat/v1", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const replyText = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!replyText) {
        throw new Error("BFF応答エラー: 空の返信");
      }
      addMessage({
        role: "ai",
        text: replyText,
        cardId: selectedCard,
        cardName: selectedCardMeta?.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("CHAT_REQUEST_FAILED", { reason: "send_failed", error: err });
      addMessage({
        role: "ai",
        text: `エラー: ${message}`,
        cardId: selectedCard,
        cardName: selectedCardMeta?.name,
      });
      if (typeof window !== "undefined") {
        window.alert(`チャットの送信に失敗しました: ${message}`);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleRegisterCard = () => hiddenFileInputRef.current?.click();

  const handleFilesToCards = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((item) => item.type === "image/png");
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.png$/i, "");
    const newCard: CardRecord = {
      id: `custom-${Date.now()}`,
      name,
      avatar: objectUrl,
      kind: "custom",
    };
    setCards((prev) => [newCard, ...prev]);
    setSelectedCard(newCard.id);
  };

  const selectedCardMeta = cards.find((card) => card.id === selectedCard) ?? cards[0];

  const handleRemoveCard = (id: string) => {
    setCards((prev) => {
      const next = prev.filter((card) => card.id !== id);
      if (selectedCard === id) {
        const fallback = next[0] ?? FEATURED_CARDS[0];
        setSelectedCard(fallback ? fallback.id : "");
      }
      return next;
    });
  };

  const handleShowBalance = async () => {
    alert("ポイント情報を取得しています…");
    const uid = localStorage.getItem("IZK_UID") || "preview-ui";
    try {
      const response = await fetch(buildRequestUrl("/wallet/balance"), {
        headers: {
          "content-type": "application/json",
          "X-IZK-UID": uid,
        },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      const balance = typeof data.balance === "number" ? data.balance : 0;
      alert(`残高: ${balance} pt`);
    } catch (error) {
      alert(`ポイント情報の取得に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleAdminButtonClick = async () => {
    if (!adminMode) {
      const input = window.prompt("管理パスワードを入力してください");
      if (input === null) return;
      const candidate = input.trim();
      if (!candidate) {
        window.alert("パスワードを入力してください");
        return;
      }
      try {
        const loginUrl = buildRequestUrl("/admin/login");
        const response = await fetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: candidate }),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        localStorage.setItem(ADMIN_STORAGE_KEY, "true");
        setAdminMode(true);
        setAdminError(null);
        setAdminNotice(null);
        setPasswordForm({ current: "", next: "", confirm: "" });
        setShowAdminPanel(true);
        showAdminToast("管理モードを有効化しました");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("CHAT_REQUEST_FAILED", { reason: "admin_login_failed", error });
        if (message.includes("incorrect_password")) {
          window.alert("パスワードが一致しません");
        } else {
          window.alert(`管理モードの認証に失敗しました: ${message}`);
        }
      }
      return;
    }
    setAdminError(null);
    setAdminNotice(null);
    setPasswordForm({ current: "", next: "", confirm: "" });
    setShowAdminPanel((prev) => !prev);
  };

  const handleProviderChange = (field: "provider" | "model", value: string) => {
    setProviderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProvider = async () => {
    setAdminError(null);
    try {
      setLoadingAdminConfig(true);
      await apiFetch("/admin/provider", {
        method: "POST",
        body: JSON.stringify({
          provider: providerForm.provider,
          model: providerForm.model,
        }),
      });
      showAdminToast("✅ プロバイダ設定を保存しました");
      await fetchProviderConfig();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingAdminConfig(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setAdminError("APIキーを入力してください");
      return;
    }
    try {
      setAdminError(null);
      setLoadingAdminConfig(true);
      await apiFetch("/admin/provider", {
        method: "POST",
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      setApiKeyInput("");
      showAdminToast("✅ APIキーを保存しました（サーバーで安全に保管）");
      await fetchProviderConfig();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingAdminConfig(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      setAdminError(null);
      setLoadingAdminConfig(true);
      await apiFetch("/admin/provider", {
        method: "POST",
        body: JSON.stringify({ apiKey: "" }),
      });
      setApiKeyInput("");
      showAdminToast("✅ APIキーを削除しました");
      await fetchProviderConfig();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingAdminConfig(false);
    }
  };

  const handlePasswordChange = (field: keyof PasswordForm, value: string) => {
    setAdminError(null);
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePassword = async () => {
    const current = passwordForm.current.trim();
    const next = passwordForm.next.trim();
    const confirm = passwordForm.confirm.trim();
    if (!current || !next) {
      setAdminError("パスワードを入力してください");
      return;
    }
    if (next.length < 6) {
      setAdminError("新しいパスワードは6文字以上にしてください");
      return;
    }
    if (next !== confirm) {
      setAdminError("新しいパスワードが一致していません");
      return;
    }
    try {
      setAdminError(null);
      setLoadingAdminConfig(true);
      await apiFetch("/admin/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: current,
          new_password: next,
        }),
      });
      showAdminToast("✅ パスワードを変更しました");
      setPasswordForm({ current: "", next: "", confirm: "" });
      await fetchProviderConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("incorrect_password")) {
        setAdminError("現在のパスワードが違います");
      } else if (message.includes("invalid_new_password")) {
        setAdminError("新しいパスワードは6文字以上にしてください");
      } else {
        setAdminError(message);
      }
    } finally {
      setLoadingAdminConfig(false);
    }
  };

  useEffect(() => {
    if (adminMode && showAdminPanel) {
      fetchProviderConfig();
    }
  }, [adminMode, showAdminPanel, fetchProviderConfig]);

  useEffect(() => {
    return () => {
      if (adminNoticeTimerRef.current) {
        window.clearTimeout(adminNoticeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`min-h-screen ${themeClasses.page}`}>
      <header className={`sticky top-0 z-10 ${themeClasses.header} border-b border-white/40 backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
          <HeaderIcon />
          <div className="flex flex-col">
            <h1 className={themeClasses.title}>IZAKAYA verse – Lite Preview</h1>
            <div className={`text-sm font-medium ${themeClasses.textSubtle}`}>
              Mini BFF /chat 接続テストパネル
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <ConnectionStatusPill status={connectionStatus} />
            <HealthCheckIndicator checks={endpointChecks} />
            <HealthBadge health={health} loading={loadingHealth} error={healthError} />
            {selectedCardMeta && <CardChip name={selectedCardMeta.name} selected themeClasses={themeClasses} />}
            <button
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
              className={`rounded-full bg-gradient-to-br px-4 py-2 text-sm font-semibold text-white shadow ${themeClasses.accent}`}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <button
              onClick={handleShowBalance}
              className={`rounded-full px-4 py-2 text-sm font-semibold shadow ${themeClasses.badge}`}
            >
              ポイント表示
            </button>
            <button
              onClick={handleAdminButtonClick}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-purple-400 hover:text-purple-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-purple-400 dark:hover:text-purple-300"
            >
              {adminMode ? (showAdminPanel ? "管理を閉じる" : "管理") : "管理"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6">
        {adminMode && showAdminPanel && (
          <>
            <AdminBillingPanel />
            <AdminPanel
              providerOptions={PROVIDER_OPTIONS}
              providerForm={providerForm}
              onProviderChange={handleProviderChange}
              onSaveProvider={handleSaveProvider}
              apiKeyInput={apiKeyInput}
              onApiKeyChange={setApiKeyInput}
              onSaveApiKey={handleSaveApiKey}
              onClearApiKey={handleClearApiKey}
              notice={adminNotice}
              error={adminError}
              loading={loadingAdminConfig}
              passwordForm={passwordForm}
              onPasswordChange={handlePasswordChange}
              onSavePassword={handleSavePassword}
              providerConfig={providerConfig}
              healthChecks={endpointChecks}
              onRetryHealthChecks={handleRetryHealthChecks}
              healthChecksRunning={healthChecksRunning}
              heartbeatDebug={heartbeatDebug}
            />
          </>
        )}

        <section className={`relative rounded-3xl ${themeClasses.panel} shadow-xl`}>
          <div ref={listRef} className="h-[52vh] space-y-4 overflow-y-auto px-6 py-6">
            {messages.map((message, index) => (
              <Bubble
                key={`${message.role}-${index}-${message.cardId ?? "unknown"}`}
                role={message.role}
                text={message.text}
                card={cards.find((card) => card.id === message.cardId)}
                themeClasses={themeClasses}
              />
            ))}
          </div>
          <div className="border-t border-zinc-200/50 bg-white/60 px-6 py-4 backdrop-blur dark:border-zinc-700/60 dark:bg-[#111118]/60">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>カード: {selectedCardMeta?.name ?? "未選択"}</span>
              <span>Cmd/Ctrl+Enter で送信</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力…"
                rows={3}
                className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                  theme === "light"
                    ? "border-zinc-300 bg-white focus:ring-rose-200"
                    : "border-zinc-700 bg-[#0f0f19] text-zinc-100 focus:ring-purple-600/40"
                }`}
              />
              <div className="flex flex-col gap-1 text-xs text-zinc-500">
                <label className="uppercase tracking-wide">温度</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  className={`w-24 rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                    theme === "light"
                      ? "border-zinc-300 bg-white focus:ring-rose-200"
                      : "border-zinc-700 bg-[#0f0f19] text-zinc-100 focus:ring-purple-600/40"
                  }`}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white shadow ${themeClasses.btnPrimary} ${
                  sending ? "opacity-60" : ""
                }`}
              >
                {sending ? "送信中…" : "送信"}
              </button>
            </div>
          </div>
        </section>

        <CardDock
          cards={cards}
          selectedId={selectedCard}
          onSelect={setSelectedCard}
          onRegisterClick={handleRegisterCard}
          onDropFiles={handleFilesToCards}
          onRemove={handleRemoveCard}
          themeClasses={themeClasses}
        />

        <input
          type="file"
          ref={hiddenFileInputRef}
          accept="image/png"
          className="hidden"
          onChange={(event) => handleFilesToCards(event.target.files)}
        />

        <PayPalGrid />
      </main>
    </div>
  );
};

export default App;
