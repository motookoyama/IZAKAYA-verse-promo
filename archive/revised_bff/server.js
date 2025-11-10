import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fsSync from "fs";
import { promises as fs } from "fs";
import path from "path";

import { callLLM, getProviderTelemetry } from "./services/llmRouter.js";

const app = express();
const PERSONA_ENGINE_URL = process.env.PERSONA_ENGINE_URL || "http://localhost:4105";
const PROVIDER_FILE = process.env.PROVIDER_FILE || path.resolve(process.cwd(), "provider.json");
const PRICING_FILE = process.env.PRICING_FILE || path.resolve(process.cwd(), "data/pricing.json");
const TX_ID_REGEX = /^TX-\d{8}-[A-Z0-9]{6,}$/i;
const IDEMPOTENCY_REGEX = /^[A-Za-z0-9_\-]{6,128}$/;
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "suke-nomi";
const PAYPAL_VERIFY_URL =
  process.env.PAYPAL_VERIFY_URL || "https://ipnpb.paypal.com/cgi-bin/webscr";
const PROJECT_ROOT = path.resolve(process.cwd(), "../../..");
const PERSONA_ENGINE_ROOT = path.join(PROJECT_ROOT, "apps/persona-engine");
const SOUL_CORE_DIR = path.join(PROJECT_ROOT, "apps/persona-engine/soul-core");
const LOGS_DIR = path.join(PROJECT_ROOT, "logs");
const IPN_LOG_FILE = path.join(LOGS_DIR, "ipn.log");
const CARDS_ROOT = path.join(PERSONA_ENGINE_ROOT, "cards");
const ENV_FILE_PATH = path.resolve(process.cwd(), ".env");
const UI_URL = process.env.UI_URL || "http://localhost:5174";
const PORT = Number(process.env.PORT) || 4117;
const BUILD_ID =
  process.env.BUILD_ID ||
  process.env.GIT_COMMIT ||
  process.env.SOURCE_VERSION ||
  process.env.K_REVISION ||
  "dev-local";
const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || new Date().toISOString();

/* --- [FIX] 環境変数チェックの追加 --- */
const requiredEnv = ['PROVIDER', 'API_KEY', 'MODEL_NAME', 'PERSONA_ENGINE_URL'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`[ENV-MISSING] Environment variable $${} is not defined. /chat/v1 may fail.`);
  }
});
/* ------------------------------------- */

const SELF_ORIGIN = (
  process.env.BFF_SELF_ORIGIN ||
  process.env.INTERNAL_BFF_ORIGIN ||
  `http://127.0.0.1:${PORT}`
).replace(/\/+$/, "");
const PUBLIC_BFF_URL = (
  process.env.PUBLIC_BFF_URL ||
  process.env.BFF_PUBLIC_URL ||
  SELF_ORIGIN
).replace(/\/+$/, "");
const PUBLIC_UI_URL = (process.env.PUBLIC_UI_URL || UI_URL).replace(/\/+$/, "");
const STARTED_AT = new Date();

console.log(
  `[BOOT] mini-bff starting | build=${BUILD_ID} | port=${PORT} | self=${SELF_ORIGIN} | public=${PUBLIC_BFF_URL} | ui=${PUBLIC_UI_URL}`,
);

function isTestUserRequest(req) {
  return req?.get?.("x-izk-test-user") === "1";
}

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception", error);
});

function routeExists(pathname, method = "get") {
  const stack = app._router?.stack ?? [];
  return stack.some(
    (layer) => layer.route && layer.route.path === pathname && Boolean(layer.route.methods?.[method]),
  );
}

const HEALTHCHECK_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 10000);
const HEALTHCHECK_PROMPT = process.env.HEALTHCHECK_PROMPT || "health-check ping";

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs =
    typeof options.timeout === "number" && Number.isFinite(options.timeout)
      ? options.timeout
      : HEALTHCHECK_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function performWalletProbe() {
  try {
    const response = await fetchWithTimeout(`${SELF_ORIGIN}/wallet/balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-IZK-UID": HEALTHCHECK_USER_ID,
      },
    });
    const payload = await response.json().catch(() => null);
    const ok = response.ok && payload && typeof payload.balance === "number";
    return {
      ok,
      status: response.status,
      balance: payload?.balance ?? null,
      error: ok ? undefined : "invalid_payload",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function performChatProbe() {
  try {
    const response = await fetchWithTimeout(`${SELF_ORIGIN}/chat/v1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IZK-HEALTHCHECK": "1",
      },
      body: JSON.stringify({ text: HEALTHCHECK_PROMPT }),
    });
    const payload = await response.json().catch(() => null);
    const ok = response.ok && payload && typeof payload.reply === "string";
    return {
      ok,
      status: response.status,
      reply: ok ? payload.reply : null,
      error: ok ? undefined : "invalid_reply",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function performFrontendProbe() {
  if (!PUBLIC_UI_URL) {
    return {
      ok: false,
      skipped: true,
      reason: "PUBLIC_UI_URL not configured",
    };
  }
  const result = {
    ok: false,
    status: null,
    version: null,
    warnings: [],
    url: PUBLIC_UI_URL,
  };
  try {
    const response = await fetchWithTimeout(PUBLIC_UI_URL, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    result.status = response.status;
    result.ok = response.ok;
  } catch (error) {
    return {
      ...result,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const versionUrl = `${PUBLIC_UI_URL.replace(/\/+$/, "")}/version.json?ts=${Date.now()}`;
    const versionResponse = await fetchWithTimeout(versionUrl, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (versionResponse.ok) {
      const payload = await versionResponse.json().catch(() => null);
      if (payload && typeof payload === "object") {
        result.version = payload;
      } else {
        result.warnings.push("version_payload_invalid");
      }
    } else {
      result.warnings.push(`version_status_${versionResponse.status}`);
    }
  } catch (error) {
    result.warnings.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With, Authorization, X-IZK-UID, X-IZK-IDEMPOTENCY",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});


const WALLET_VERSION = 1;
const WALLET_DATA_DIR = path.resolve(process.cwd(), "data");
const WALLET_FILE = path.join(WALLET_DATA_DIR, "wallet.json");
const DEFAULT_USER_ALLOWANCE = 100;
const ADMIN_USER_ID = "admin";
const ADMIN_DAILY_ALLOWANCE = 10000;
const HEALTHCHECK_USER_ID = process.env.HEALTHCHECK_USER_ID || ADMIN_USER_ID;
const WALLET_TRANSACTION_LIMIT = 500;

const defaultProviderConfig = {
  provider: "GEMINI",
  model: "gemini-pro",
  apiKey: "",
  endpoint: "",
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  updatedAt: new Date().toISOString(),
};
let providerCache = null;
let walletCache = null;

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function getAllowanceForUser(userId) {
  return userId === ADMIN_USER_ID ? ADMIN_DAILY_ALLOWANCE : DEFAULT_USER_ALLOWANCE;
}

function createWalletStore(dateString = getTodayUtcDate(), { includeAdmin = true } = {}) {
  const store = {
    version: WALLET_VERSION,
    users: {},
  };
  if (includeAdmin) {
    store.users[ADMIN_USER_ID] = {
      balance: ADMIN_DAILY_ALLOWANCE,
      resetAt: dateString,
      transactions: {},
      lastGrantAt: dateString,
    };
  }
  return store;
}

function analyzeIpnLog() {
  try {
    if (!fsSync.existsSync(IPN_LOG_FILE)) {
      return { note: "ipn.log not found" };
    }
    const raw = fsSync.readFileSync(IPN_LOG_FILE, "utf-8");
    if (!raw.trim()) {
      return { note: "ipn.log empty" };
    }
    const lines = raw.split(/\r?\n/);
    let startIndex = 0;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lines[index].includes("[IPN] relay server listening on port")) {
        startIndex = index;
        break;
      }
    }
    const recent = lines.slice(startIndex).join("\n").toLowerCase();
    const hasErrors = recent.includes("error") || recent.includes("wallet/grant failed");
    return {
      note: hasErrors ? "Errors detected in recent ipn.log entries" : "No recent IPN errors detected",
      hasErrors,
    };
  } catch (error) {
    return {
      note: `ipn.log check failed: ${error instanceof Error ? error.message : String(error)}`,
      error: true,
    };
  }
}

async function ensureWalletDirectory() {
  await fs.mkdir(WALLET_DATA_DIR, { recursive: true });
}

async function saveWalletStore(wallet) {
  await ensureWalletDirectory();
  const payload = JSON.stringify(wallet, null, 2);
  const tempPath = `${WALLET_FILE}.tmp-${process.pid}-${Date.now()}`;
  try {
    fsSync.writeFileSync(tempPath, payload);
    fsSync.renameSync(tempPath, WALLET_FILE);
    walletCache = wallet;
    console.log(`[WALLET] persisted wallet store -> ${WALLET_FILE}`);
  } catch (error) {
    console.error("[WALLET] failed to persist wallet store", error);
    try {
      if (fsSync.existsSync(tempPath)) {
        fsSync.rmSync(tempPath, { force: true });
      }
    } catch {
      // ignore cleanup failures
    }
    throw error;
  }
}

async function readWalletFromDisk() {
  await ensureWalletDirectory();
  try {
    const raw = await fs.readFile(WALLET_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== WALLET_VERSION) {
      throw new Error("invalid wallet format");
    }
    if (!parsed.users || typeof parsed.users !== "object") {
      parsed.users = {};
    }
    console.log(`[WALLET] loaded wallet store -> ${WALLET_FILE}`);
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      console.warn("[WALLET] wallet store missing. Creating default ledger...");
      const fallback = createWalletStore(getTodayUtcDate(), { includeAdmin: true });
      await saveWalletStore(fallback);
      return fallback;
    }
    console.error("[WALLET] wallet store corrupt or unreadable. Rebuilding...", error?.message || error);
    const fallback = createWalletStore(getTodayUtcDate(), { includeAdmin: false });
    await saveWalletStore(fallback);
    return fallback;
  }
}

function ensureTransactionsMap(record) {
  if (!record.transactions || typeof record.transactions !== "object") {
    record.transactions = {};
  }
}

function pruneTransactions(record) {
  ensureTransactionsMap(record);
  const ids = Object.keys(record.transactions);
  if (ids.length <= WALLET_TRANSACTION_LIMIT) return;
  const sorted = ids
    .map((id) => ({ id, time: record.transactions[id] }))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const toRemove = sorted.slice(0, Math.max(0, sorted.length - WALLET_TRANSACTION_LIMIT));
  for (const entry of toRemove) {
    delete record.transactions[entry.id];
  }
}

function applyDailyResetIfNeeded(userId, record, today) {
  const allowance = getAllowanceForUser(userId);
  const resetAt = typeof record.resetAt === "string" ? record.resetAt : null;
  if (!resetAt || resetAt !== today) {
    record.balance = allowance;
    record.resetAt = today;
    record.lastGrantAt = today;
    ensureTransactionsMap(record);
    pruneTransactions(record);
    console.log(`[WALLET] daily reset applied for ${userId} -> ${allowance}pt`);
    return true;
  }
  ensureTransactionsMap(record);
  return false;
}

function ensureUserRecord(wallet, userId, today) {
  if (!wallet.users[userId]) {
    wallet.users[userId] = {
      balance: getAllowanceForUser(userId),
      resetAt: today,
      transactions: {},
      lastGrantAt: today,
    };
    console.log(`[WALLET] created ledger for ${userId}`);
    return { record: wallet.users[userId], created: true, reset: false };
  }
  const record = wallet.users[userId];
  const reset = applyDailyResetIfNeeded(userId, record, today);
  return { record, created: false, reset };
}


function generateTxId(prefix = "TX") {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${yyyymmdd}-${random}`;
}

async function loadWalletStore() {
  if (!walletCache) {
    walletCache = await readWalletFromDisk();
  }
  const today = getTodayUtcDate();
  let mutated = false;

  const adminResult = ensureUserRecord(walletCache, ADMIN_USER_ID, today);
  if (adminResult.created || adminResult.reset) {
    mutated = true;
  }

  for (const userId of Object.keys(walletCache.users)) {
    if (userId === ADMIN_USER_ID) continue;
    const { reset } = ensureUserRecord(walletCache, userId, today);
    if (reset) mutated = true;
  }

  if (mutated) {
    await saveWalletStore(walletCache);
  }

  return walletCache;
}

async function getWalletForUser(userId) {
  const wallet = await loadWalletStore();
  const today = getTodayUtcDate();
  const { record, created, reset } = ensureUserRecord(wallet, userId, today);
  if (created || reset) {
    await saveWalletStore(wallet);
  }
  return { wallet, record };
}

async function grantPointsToUser(userId, amount, transactionId, source = "system") {
  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("amount must be a positive integer");
    error.status = 400;
    throw error;
  }
  const { wallet, record } = await getWalletForUser(userId);
  ensureTransactionsMap(record);
  if (transactionId) {
    if (record.transactions[transactionId]) {
      const error = new Error("duplicate_transaction");
      error.status = 409;
      throw error;
    }
    record.transactions[transactionId] = new Date().toISOString();
    pruneTransactions(record);
  }
  record.balance += amount;
  record.lastGrantAt = new Date().toISOString();
  await saveWalletStore(wallet);
  console.log(`[WALLET] grant ${amount}pt to ${userId} (tx:${transactionId || "manual"}) via ${source}`);
  return record.balance;
}

async function consumePointsFromUser(userId, amount, metadata = {}) {
  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("amount must be a positive integer");
    error.status = 400;
    throw error;
  }
  const { wallet, record } = await getWalletForUser(userId);
  if (record.balance < amount) {
    const error = new Error("insufficient_balance");
    error.status = 400;
    error.balance = record.balance;
    throw error;
  }
  ensureTransactionsMap(record);
  const idempotencyKey =
    typeof metadata.idempotencyKey === "string" && metadata.idempotencyKey.trim().length > 0
      ? metadata.idempotencyKey.trim()
      : null;
  if (idempotencyKey) {
    if (record.transactions[idempotencyKey]) {
      const error = new Error("duplicate_consume");
      error.status = 409;
      error.balance = record.balance;
      throw error;
    }
    record.transactions[idempotencyKey] = new Date().toISOString();
    pruneTransactions(record);
  }
  record.balance -= amount;
  await saveWalletStore(wallet);
  console.log(
    `[WALLET] consume ${amount}pt from ${userId} (sku:${metadata.sku || "unknown"}) balance:${record.balance}`,
  );
  return record.balance;
}

async function ensurePricingFile() {
  await fs.mkdir(path.dirname(PRICING_FILE), { recursive: true });
  try {
    await fs.access(PRICING_FILE);
  } catch {
    await fs.writeFile(PRICING_FILE, JSON.stringify([], null, 2));
  }
}

async function loadPricingTable() {
  await ensurePricingFile();
  try {
    const raw = await fs.readFile(PRICING_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function savePricingTable(table) {
  await ensurePricingFile();
  await fs.writeFile(PRICING_FILE, JSON.stringify(table, null, 2));
}

function requireUserId(req, res) {
  const userId = req.header("X-IZK-UID");
  if (!userId) {
    res.status(400).json({ error: "Missing X-IZK-UID header" });
    return null;
  }
  if (userId.length > 128) {
    res.status(400).json({ error: "X-IZK-UID too long" });
    return null;
  }
  return userId;
}

async function ensureProviderFile() {
  await fs.mkdir(path.dirname(PROVIDER_FILE), { recursive: true });
  try {
    await fs.access(PROVIDER_FILE);
  } catch {
    await fs.writeFile(PROVIDER_FILE, JSON.stringify(defaultProviderConfig, null, 2));
  }
}

function sanitizeProviderConfig(config) {
  return {
    provider: (config.provider ?? defaultProviderConfig.provider).toUpperCase(),
    model: config.model ?? defaultProviderConfig.model,
    apiKey: config.apiKey ?? "",
    endpoint: config.endpoint ?? "",
    adminPassword:
      typeof config.adminPassword === "string" && config.adminPassword.length > 0
        ? config.adminPassword
        : DEFAULT_ADMIN_PASSWORD,
    updatedAt: config.updatedAt ?? new Date().toISOString(),
  };
}

async function readProviderFileConfig() {
  await ensureProviderFile();
  try {
    const raw = await fs.readFile(PROVIDER_FILE, "utf-8");
    return sanitizeProviderConfig(JSON.parse(raw));
  } catch {
    const sanitized = sanitizeProviderConfig(defaultProviderConfig);
    await fs.writeFile(PROVIDER_FILE, JSON.stringify(sanitized, null, 2));
    return sanitized;
  }
}

function readProviderEnvConfig() {
  const provider = process.env.PROVIDER ? process.env.PROVIDER.trim().toUpperCase() : "";
  if (!provider) return null;
  const envConfig = {
    provider,
    model: "",
    apiKey: "",
    endpoint: "",
    updatedAt: process.env.PROVIDER_UPDATED_AT || null,
  };

  switch (provider) {
    case "GEMINI":
      envConfig.model = process.env.GEMINI_MODEL || "";
      envConfig.apiKey = process.env.GEMINI_API_KEY || "";
      envConfig.endpoint = process.env.GEMINI_ENDPOINT || envConfig.endpoint;
      break;
    case "OPENAI":
      envConfig.model = process.env.OPENAI_MODEL || "";
      envConfig.apiKey = process.env.OPENAI_API_KEY || "";
      envConfig.endpoint = process.env.OPENAI_ENDPOINT || envConfig.endpoint;
      break;
    case "OLLAMA":
      envConfig.model = process.env.OLLAMA_MODEL || "";
      envConfig.endpoint = process.env.OLLAMA_ENDPOINT || "";
      break;
    case "CUSTOM":
      envConfig.model = process.env.CUSTOM_MODEL || "";
      envConfig.endpoint = process.env.CUSTOM_ENDPOINT || "";
      envConfig.apiKey = process.env.CUSTOM_API_KEY || "";
      break;
    default:
      break;
  }
  return envConfig;
}

function buildEnvUpdatesFromConfig(config) {
  const updates = {
    PROVIDER: config.provider || "",
    PROVIDER_UPDATED_AT: config.updatedAt || new Date().toISOString(),
  };

  switch (config.provider) {
    case "GEMINI":
      if (config.model !== undefined) updates.GEMINI_MODEL = config.model || "";
      if (config.apiKey !== undefined) updates.GEMINI_API_KEY = config.apiKey || "";
      break;
    case "OPENAI":
      if (config.model !== undefined) updates.OPENAI_MODEL = config.model || "";
      if (config.apiKey !== undefined) updates.OPENAI_API_KEY = config.apiKey || "";
      break;
    case "OLLAMA":
      if (config.model !== undefined) updates.OLLAMA_MODEL = config.model || "";
      if (config.endpoint !== undefined && config.endpoint !== "") {
        updates.OLLAMA_ENDPOINT = config.endpoint;
      }
      break;
    case "CUSTOM":
      if (config.model !== undefined) updates.CUSTOM_MODEL = config.model || "";
      if (config.endpoint !== undefined) updates.CUSTOM_ENDPOINT = config.endpoint || "";
      if (config.apiKey !== undefined) updates.CUSTOM_API_KEY = config.apiKey || "";
      break;
    default:
      break;
  }

  return updates;
}

async function updateEnvFile(updates) {
  const entries = Object.entries(updates);
  if (entries.length === 0) return;

  const exists = fsSync.existsSync(ENV_FILE_PATH);
  const original = exists ? await fs.readFile(ENV_FILE_PATH, "utf-8") : "";
  const lines = original ? original.split(/\r?\n/) : [];
  const touched = new Set();
  const outputLines = lines.map((line) => {
    const match = line.match(/^([^#=]+?)=(.*)$/);
    if (!match) return line;
    const key = match[1].trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      touched.add(key);
      const value = updates[key];
      return `${}=${value ?? ""}`;
    }
    return line;
  });

  for (const [key, value] of entries) {
    if (!touched.has(key)) {
      outputLines.push(`${}=${value ?? ""}`);
    }
  }

  if (exists) {
    await fs.writeFile(`${ENV_FILE_PATH}.bak`, original);
  }
  await fs.writeFile(ENV_FILE_PATH, outputLines.join("\n"));

  for (const [key, value] of entries) {
    process.env[key] = value ?? "";
  }
}

async function writeProviderEnv(config) {
  const updates = buildEnvUpdatesFromConfig(config);
  await updateEnvFile(updates);
}

async function loadProviderConfig() {
  if (providerCache) return providerCache;
  const fileConfig = await readProviderFileConfig();
  const envConfig = readProviderEnvConfig();

  const combined = { ...fileConfig };
  if (envConfig) {
    combined.provider = envConfig.provider;
    if (envConfig.model) combined.model = envConfig.model;
    if (envConfig.apiKey) combined.apiKey = envConfig.apiKey;
    if (envConfig.endpoint) combined.endpoint = envConfig.endpoint;
    combined.updatedAt = envConfig.updatedAt || combined.updatedAt;
  }
  if (!combined.updatedAt) {
    combined.updatedAt = new Date().toISOString();
  }
  providerCache = combined;
  return combined;
}

async function saveProviderConfig(config, options = {}) {
  const { updateEnv = false } = options;
  const sanitized = sanitizeProviderConfig(config);
  if (updateEnv) {
    await writeProviderEnv(sanitized);
  }
  providerCache = sanitized;
  await fs.mkdir(path.dirname(PROVIDER_FILE), { recursive: true });
  await fs.writeFile(PROVIDER_FILE, JSON.stringify(sanitized, null, 2));
  if (updateEnv) {
    console.log(`[PROVIDER] configured => ${sanitized.provider}`);
  }
  return sanitized;
}

async function loadSoulCoreFiles() {
  if (!fsSync.existsSync(SOUL_CORE_DIR)) {
    console.warn(`[SOUL_CORE] directory not found: ${SOUL_CORE_DIR}`);
    return [];
  }
  try {
    const entries = await fs.readdir(SOUL_CORE_DIR, { withFileTypes: true });
    const mdFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    const results = [];
    for (const name of mdFiles) {
      const filePath = path.join(SOUL_CORE_DIR, name);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        results.push({ path: filePath, name, content: content.trim() });
      } catch {
        // skip unreadable files but continue loading the rest
      }
    }
    return results;
  } catch (error) {
    console.warn(`[SOUL_CORE] failed to read directory ${SOUL_CORE_DIR}:`, error);
    return [];
  }
}

function extractPersonaPrompt(personaJson) {
  if (!personaJson) return null;
  if (typeof personaJson === "string") {
    return personaJson;
  }
  if (typeof personaJson === "object") {
    if (typeof personaJson.prompt === "string" && personaJson.prompt.trim()) {
      return personaJson.prompt;
    }
    if (typeof personaJson.system === "string" && personaJson.system.trim()) {
      return personaJson.system;
    }
    if (typeof personaJson.description === "string" && personaJson.description.trim()) {
      return personaJson.description;
    }
    return JSON.stringify(personaJson, null, 2);
  }
  return String(personaJson);
}

async function loadPersona(cardId) {
  if (!cardId) return null;
  const personaPath = path.join(CARDS_ROOT, cardId, "persona.json");
  try {
    const raw = await fs.readFile(personaPath, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    const prompt = extractPersonaPrompt(parsed);
    return {
      path: personaPath,
      prompt,
      data: typeof parsed === "object" && parsed ? parsed : null,
      source:
        typeof parsed === "string"
          ? "raw-string"
          : parsed?.prompt
          ? "prompt"
          : parsed?.system
          ? "system"
          : "json",
    };
  } catch {
    return null;
  }
}

function buildPrompt({ soulCoreFiles, personaPrompt, personaData, userPrompt }) {
  const soulCoreText = Array.isArray(soulCoreFiles) && soulCoreFiles.length > 0
    ? soulCoreFiles
        .map((file, index) => `### Soul Core ${index + 1}: ${file.name}
${file.content}`)
        .join("\n\n")
    : "";
  const instructions = [];
  instructions.push(
    "あなたは次のキャラクターとして話します。キャラの性格・口調・世界観・仕草を必ず反映し、“その人が喋っている”ように返答してください。",
  );
  if (personaData) {
    instructions.push(`【V2カード情報】
${JSON.stringify(personaData, null, 2)}`);
  } else if (personaPrompt) {
    instructions.push(`【参考ペルソナ情報】
${personaPrompt}`);
  }
  if (soulCoreText) {
    instructions.push(`【ソウルコア共通ルール】
${soulCoreText}`);
  }
  const outputRules = [
    "必ずキャラ本人の口調・癖・世界観で返答する",
    "「承知しました」「了解しました」などのAI口調は避ける",
    "感情・仕草・情景描写を自然に織り交ぜて没入感を保つ",
    "案内やシステム説明もキャラの人格で伝える。メタ発言の可否は system_behavior.allowed_to_break_fourth_wall に従う",
    "system_behavior.is_guide が true の場合のみ案内役として振る舞い、それ以外は物語没入を最優先する",
    "system_behavior.friendliness と chaos の数値を参考にテンション・ふざけ幅を調整する",
  ];
  instructions.push(`【出力ルール】
- ${outputRules.join("\n- ")}`);
  const userSection = (userPrompt ?? "").trim();
  instructions.push(`【ユーザー入力】
${userSection}`);
  return instructions.join("\n\n");
}

function parseCustomField(raw) {
  if (!raw || typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fall through
  }

  const result = {};
  const pairs = trimmed.split(/[;,|]/);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (!key || rest.length === 0) continue;
    result[key.trim()] = rest.join("=").trim();
  }
  if (!result.uid && !result.user && !result.id) {
    result.uid = trimmed;
  }
  return result;
}

function extractUserId(ipnPayload, customMeta) {
  return (
    customMeta.uid ||
    customMeta.user ||
    customMeta.id ||
    ipnPayload["option_selection1"] ||
    ipnPayload.custom ||
    ipnPayload.payer_email ||
    ipnPayload.email ||
    null
  );
}

function extractPoints(ipnPayload, customMeta) {
  const candidates = [
    customMeta.points,
    customMeta.amount,
    ipnPayload.quantity,
    ipnPayload.mc_quantity,
    ipnPayload.num_cart_items,
  ];
  for (const value of candidates) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const gross = parseFloat(
    Array.isArray(ipnPayload.mc_gross) ? ipnPayload.mc_gross[0] : ipnPayload.mc_gross,
  );
  if (!Number.isNaN(gross) && gross > 0) {
    return Math.round(gross);
  }
  return NaN;
}

function normalizeTxId(maybeTxId) {
  if (typeof maybeTxId === "string" && TX_ID_REGEX.test(maybeTxId)) {
    return maybeTxId;
  }
  if (typeof maybeTxId === "string" && maybeTxId.trim()) {
    const trimmed = maybeTxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-6);
    if (trimmed.length === 6) {
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
      return `TX-${yyyymmdd}-${trimmed}`;
    }
  }
  return generateTxId("TX");
}

app.get("/", (_req, res) => {
  res.send("IZAKAYA Mini BFF is running");
});

app.get("/api/health", (_req, res) => {
  res
    .status(200)
    .json({ status: "ok", service: "IZAKAYA_BFF", persona_engine: PERSONA_ENGINE_URL });
});

app.get("/api/ping", (_req, res) => {
  res.status(200).json({ ok: true, time: Date.now() });
});

app.get("/health/ping", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "mini-bff",
    build_id: BUILD_ID,
    build_timestamp: BUILD_TIMESTAMP,
    uptime_ms: Date.now() - STARTED_AT.getTime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/deep", async (_req, res) => {
  try {
    const wallet = await performWalletProbe();
    const chat = await performChatProbe();
    const errors = [];
    if (!wallet.ok) {
      errors.push({ probe: "wallet", detail: wallet.error ?? wallet.status ?? "unknown" });
    }
    if (!chat.ok) {
      errors.push({ probe: "chat", detail: chat.error ?? chat.status ?? "unknown" });
    }
    const ok = errors.length === 0;
    res.status(ok ? 200 : 503).json({
      ok,
      service: "mini-bff",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
      probes: { wallet, chat },
      errors,
    });
  } catch (error) {
    console.error("[HEALTH] deep probe failure", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      service: "mini-bff",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/status/probe", async (_req, res) => {
  try {
    const [frontend, wallet, chat] = await Promise.all([
      performFrontendProbe(),
      performWalletProbe(),
      performChatProbe(),
    ]);
    const frontendBuildId =
      frontend?.version && typeof frontend.version === "object"
        ? frontend.version.build_id ?? frontend.version.buildId ?? null
        : null;
    const versionMismatch =
      Boolean(frontendBuildId) && Boolean(BUILD_ID) && frontendBuildId !== BUILD_ID;

    const errors = [];
    if (!frontend.ok) {
      errors.push({ probe: "frontend", detail: frontend.error ?? frontend.status ?? "unknown" });
    }
    if (!wallet.ok) {
      errors.push({ probe: "wallet", detail: wallet.error ?? wallet.status ?? "unknown" });
    }
    if (!chat.ok) {
      errors.push({ probe: "chat", detail: chat.error ?? chat.status ?? "unknown" });
    }
    if (versionMismatch) {
      errors.push({
        probe: "version",
        detail: `frontend=${frontendBuildId ?? "unknown"} backend=${BUILD_ID}`,
      });
    }
    const playable = errors.length === 0;
    res.status(playable ? 200 : 503).json({
      playable,
      service: "mini-bff",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
      probes: {
        frontend,
        wallet,
        chat,
      },
      version: {
        frontend: frontend.version ?? null,
        backend: { build_id: BUILD_ID, built_at: BUILD_TIMESTAMP },
        mismatch: versionMismatch,
      },
      errors,
    });
  } catch (error) {
    console.error("[HEALTH] status probe failure", error);
    res.status(500).json({
      playable: false,
      service: "mini-bff",
      build_id: BUILD_ID,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/personas", async (_req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/personas`);
    if (!response.ok) {
      throw new Error(`persona-engine responded ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

app.get("/api/personas/:id", async (req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/personas/${req.params.id}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Persona not found" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

app.get("/api/emotion", async (_req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/emotion`);
    if (!response.ok) {
      throw new Error(`persona-engine responded ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

app.get("/wallet/balance", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const { record } = await getWalletForUser(userId);
    res.json({
      userId,
      unit: "pt",
      balance: record.balance,
      resetAt: record.resetAt,
      dailyAllowance: getAllowanceForUser(userId),
    });
  } catch (error) {
    console.error("[WALLET] balance fetch failed", error);
    res.status(500).json({ error: "wallet_balance_failed" });
  }
});

app.post("/wallet/redeem", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const isTestUser = isTestUserRequest(req);

  const { amount_pt, amount, tx_id, transactionId } = req.body ?? {};
  const candidateAmount = Number.isInteger(amount_pt) ? amount_pt : amount;
  if (!Number.isInteger(candidateAmount) || candidateAmount <= 0) {
    return res.status(400).json({ error: "amount must be a positive integer" });
  }
  const txIdValue =
    typeof tx_id === "string" && TX_ID_REGEX.test(tx_id)
      ? tx_id
      : typeof transactionId === "string"
      ? transactionId
      : null;
  try {
    if (isTestUser) {
      const { record } = await getWalletForUser(userId);
      return res.status(202).json({
        ok: true,
        userId,
        balance: record.balance,
        unit: "pt",
        test_user: true,
        note: "redeem_bypassed_for_test_user",
      });
    }
    const balance = await grantPointsToUser(userId, candidateAmount, txIdValue || undefined, "redeem");
    res.status(201).json({
      userId,
      balance,
      unit: "pt",
      transactionId: txIdValue || null,
    });
  } catch (error) {
    console.error("[WALLET] redeem failed", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "redeem_failed" });
  }
});

app.post("/wallet/grant", async (req, res) => {
  const requesterId = requireUserId(req, res);
  if (!requesterId) return;
  if (requesterId !== ADMIN_USER_ID) {
    return res.status(403).json({ error: "admin_only" });
  }

  const { userId, amount, transactionId } = req.body ?? {};
  const targetUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : requesterId;
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive integer" });
  }
  const txIdValue = typeof transactionId === "string" && transactionId.trim().length > 0 ? transactionId.trim() : null;
  try {
    const balance = await grantPointsToUser(targetUserId, amount, txIdValue || undefined, "grant");
    res.json({
      ok: true,
      userId: targetUserId,
      balance,
      unit: "pt",
      transactionId: txIdValue || null,
    });
  } catch (error) {
    console.error("[WALLET] grant failed", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "grant_failed" });
  }
});

app.post("/wallet/consume", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const isTestUser = isTestUserRequest(req);

  const { amount_pt, amount, sku, idempotency_key, idempotencyKey } = req.body ?? {};
  const candidateAmount = Number.isInteger(amount_pt) ? amount_pt : amount;
  if (!Number.isInteger(candidateAmount) || candidateAmount <= 0) {
    return res.status(400).json({ error: "amount must be a positive integer" });
  }
  const idempotency =
    typeof idempotency_key === "string" && IDEMPOTENCY_REGEX.test(idempotency_key)
      ? idempotency_key
      : typeof idempotencyKey === "string" && IDEMPOTENCY_REGEX.test(idempotencyKey)
      ? idempotencyKey
      : null;
  try {
    if (isTestUser) {
      const { record } = await getWalletForUser(userId);
      return res.status(200).json({
        ok: true,
        balance: record.balance,
        userId,
        unit: "pt",
        test_user: true,
        note: "consume_bypassed_for_test_user",
      });
    }
    const balance = await consumePointsFromUser(userId, candidateAmount, { sku, idempotencyKey: idempotency });
    res.status(200).json({
      ok: true,
      balance,
      userId,
      unit: "pt",
    });
  } catch (error) {
    console.error("[WALLET] consume failed", error);
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || "consume_failed",
      balance: error.balance,
    });
  }
});

app.get("/wallet/pricing", async (_req, res) => {
  try {
    const table = await loadPricingTable();
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

app.post("/paypal/ipn/notify", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    }
    const verificationBody = `cmd=_notify-validate&${params.toString()}`;

    const verifyResponse = await fetch(PAYPAL_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationBody,
    });
    const verificationText = (await verifyResponse.text()).trim();
    const verified = verificationText === "VERIFIED";
    if (!verified) {
      console.warn(`[IPN] verification failed: ${verificationText}`);
      return res.status(200).send("INVALID");
    }

    const paymentStatus = (payload.payment_status || payload.paymentStatus || "").toLowerCase();
    if (paymentStatus && paymentStatus !== "completed") {
      console.info(`[IPN] payment_status=${paymentStatus}, ignoring.`);
      return res.status(200).send("IGNORED");
    }

    const customMeta = parseCustomField(payload.custom || payload.memo || payload.note);
    const userId = extractUserId(payload, customMeta);
    const amountPoints = extractPoints(payload, customMeta);

    if (!userId) {
      console.warn("[IPN] missing user id (custom/payer_email)", payload);
      return res.status(200).send("MISSING_USER");
    }

    if (!Number.isInteger(amountPoints) || amountPoints <= 0) {
      console.warn("[IPN] invalid points", { amountPoints, payload });
      return res.status(200).send("INVALID_POINTS");
    }

    const txId = normalizeTxId(
      customMeta.tx_id || customMeta.txid || payload.tx_id || payload.txn_id || payload.parent_txn_id,
    );

    try {
      const balance = await grantPointsToUser(userId, amountPoints, txId || undefined, "paypal-ipn");
      console.log(
        `[IPN] granted ${amountPoints}pt to ${userId} (tx=${txId || "manual"}, balance=${balance})`,
      );
      return res.status(200).send("OK");
    } catch (error) {
      if (error.message === "duplicate_transaction") {
        console.warn("[IPN] duplicate transaction", { userId, txId });
        return res.status(200).send("DUPLICATE");
      }
      console.error("[IPN] grant failed", error);
      return res.status(500).send("ERROR");
    }
  } catch (error) {
    console.error("[IPN] unexpected error", error);
    res.status(500).send("ERROR");
  }
});

app.post("/wallet/pricing/update", async (req, res) => {
  const { id, cost } = req.body ?? {};
  if (typeof id !== "string" || !id.trim() || typeof cost !== "number") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  try {
    const table = await loadPricingTable();
    const updated = table.map((item) => (item.id === id ? { ...item, cost } : item));
    await savePricingTable(updated);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

app.post("/wallet/pricing/add", async (req, res) => {
  const { id, name, cost } = req.body ?? {};
  if (typeof id !== "string" || !id.trim() || typeof name !== "string" || !name.trim() || typeof cost !== "number") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  try {
    const table = await loadPricingTable();
    if (table.some((item) => item.id === id)) {
      return res.status(409).json({ error: "duplicate_id" });
    }
    table.push({ id, name, cost });
    await savePricingTable(table);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

app.get("/points/list", async (_req, res) => {
  try {
    const table = await loadPricingTable();
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/points/set", async (req, res) => {
  const { content_id, points } = req.body ?? {};
  if (typeof content_id !== "string" || !content_id.trim() || typeof points !== "number" || !Number.isFinite(points)) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  try {
    const id = content_id.trim();
    const cost = Math.max(0, Math.round(points));
    const table = await loadPricingTable();
    let updated = false;
    const nextTable = table.map((item) => {
      if (item.id === id) {
        updated = true;
        return { ...item, cost };
      }
      return item;
    });
    if (!updated) {
      nextTable.push({ id, name: id, cost });
    }
    await savePricingTable(nextTable);
    res.json({ ok: true, id, cost });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/points/config", async (_req, res) => {
  try {
    const table = await loadPricingTable();
    const config = table.reduce((acc, item) => {
      acc[item.id] = item.cost;
      return acc;
    }, {});
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/points/config", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  try {
    const entries = Object.entries(payload);
    const table = await loadPricingTable();
    const nameFallback = new Map(table.map((item) => [item.id, item.name]));
    const seen = new Set();
    const updatedTable = table
      .map((item) => {
        if (!Object.prototype.hasOwnProperty.call(payload, item.id)) return item;
        const value = payload[item.id];
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`invalid cost for ${item.id}`);
        }
        seen.add(item.id);
        return { ...item, cost: Math.max(0, Math.round(value)) };
      })
      .filter(Boolean);

    for (const [key, value] of entries) {
      if (seen.has(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`invalid cost for ${}`);
      }
      const cost = Math.max(0, Math.round(value));
      updatedTable.push({ id: key, name: nameFallback.get(key) ?? key, cost });
    }

    updatedTable.sort((a, b) => a.id.localeCompare(b.id));
    await savePricingTable(updatedTable);
    res.json({ ok: true, updated: Object.keys(payload).length });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/admin/wallet/diagnostic", async (req, res) => {
  const requesterId = requireUserId(req, res);
  if (!requesterId) return;
  if (requesterId !== ADMIN_USER_ID) {
    return res.status(403).json({ error: "admin_only" });
  }

  const { userId, amount, revert } = req.body ?? {};
  const targetUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : "preview-ui";
  const grantAmount = Number.isInteger(amount) && amount > 0 ? amount : 7;
  const shouldRevert = revert !== false;

  try {
    const { record: initialRecord } = await getWalletForUser(targetUserId);
    const initialBalance = initialRecord.balance;
    const transactionId = generateTxId("DIAG");

    const grantBalance = await grantPointsToUser(targetUserId, grantAmount, transactionId, "wallet-diagnostic");

    let finalBalance = grantBalance;
    let reverted = false;
    if (shouldRevert) {
      try {
        await consumePointsFromUser(targetUserId, grantAmount, {
          sku: "wallet-diagnostic",
          idempotencyKey: `diag-${transactionId}`,
        });
        const { record: finalRecord } = await getWalletForUser(targetUserId);
        finalBalance = finalRecord.balance;
        reverted = true;
      } catch (revertError) {
        console.warn("[DIAGNOSTIC] failed to revert wallet diagnostic grant", revertError);
      }
    } else {
      const { record: finalRecord } = await getWalletForUser(targetUserId);
      finalBalance = finalRecord.balance;
    }

    const delta = finalBalance - initialBalance;
    const ipnLogState = analyzeIpnLog();

    res.json({
      ok: true,
      userId: targetUserId,
      amount: grantAmount,
      transactionId,
      initialBalance,
      grantBalance,
      finalBalance,
      delta,
      reverted,
      ipnLogNote: ipnLogState.note,
      ipnLogHasErrors: Boolean(ipnLogState.hasErrors || ipnLogState.error),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DIAGNOSTIC] wallet diagnostic failed", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "wallet_diagnostic_failed" });
  }
});

app.get("/admin/provider", async (_req, res) => {
  const config = await loadProviderConfig();
  res.json({
    provider: config.provider,
    model: config.model,
    endpoint: config.endpoint,
    hasApiKey: Boolean(config.apiKey),
    updatedAt: config.updatedAt,
    source: process.env.PROVIDER ? "env" : "file",
  });
});

app.post("/admin/login", async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const config = await loadProviderConfig();
  const currentPassword = config.adminPassword ?? DEFAULT_ADMIN_PASSWORD;
  if (password !== currentPassword) {
    return res.status(403).json({ error: "incorrect_password" });
  }
  res.json({ status: "ok" });
});

app.post("/admin/provider", async (req, res) => {
  const payload = req.body ?? {};
  const current = await loadProviderConfig();
  const updated = { ...current };

  if (typeof payload.provider === "string" && payload.provider.trim().length > 0) {
    updated.provider = payload.provider.trim().toUpperCase();
  }
  if (typeof payload.model === "string") {
    updated.model = payload.model.trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "apiKey")) {
    if (typeof payload.apiKey === "string") {
      updated.apiKey = payload.apiKey;
    } else if (payload.apiKey === null) {
      updated.apiKey = "";
    }
  }
  if (typeof payload.endpoint === "string") {
    updated.endpoint = payload.endpoint.trim();
  }
  updated.updatedAt = new Date().toISOString();
  const persisted = await saveProviderConfig(updated, { updateEnv: true });
  res.json({
    ok: true,
    provider: persisted.provider,
    model: persisted.model,
    endpoint: persisted.endpoint,
    hasApiKey: Boolean(persisted.apiKey),
    updatedAt: persisted.updatedAt,
  });
});

app.post("/admin/password", async (req, res) => {
  const { current_password, new_password } = req.body ?? {};
  if (typeof current_password !== "string" || typeof new_password !== "string") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const trimmedNewPassword = new_password.trim();
  if (trimmedNewPassword.length < 6) {
    return res.status(400).json({ error: "invalid_new_password" });
  }
  const config = await loadProviderConfig();
  const currentPassword = config.adminPassword ?? DEFAULT_ADMIN_PASSWORD;
  if (current_password !== currentPassword) {
    return res.status(403).json({ error: "incorrect_password" });
  }
  const updated = {
    ...config,
    adminPassword: trimmedNewPassword,
    updatedAt: new Date().toISOString(),
  };
  await saveProviderConfig(updated);
  res.json({ status: "ok" });
});

app.post("/admin/logout", (_req, res) => {
  providerCache = null;
  res.json({ ok: true });
});

app.get("/admin/info", (_req, res) => {
  res.json({
    service: "mini-bff",
    version: "0.1.0",
    health_url: "/health/ping",
    deep_health_url: "/health/deep",
    status_probe_url: "/status/probe",
    build_id: BUILD_ID,
    build_timestamp: BUILD_TIMESTAMP,
    public_bff_url: PUBLIC_BFF_URL,
    public_ui_url: PUBLIC_UI_URL,
    provider: providerCache?.provider ?? "unknown",
  });
});

app.get("/admin/ui-alive", async (_req, res) => {
  const baseUrl = (PUBLIC_UI_URL || UI_URL).replace(/\/+$/, "");
  const endpoint = `${baseUrl}/ui-alive.json`;
  try {
    const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return res.status(500).json({ ok: false, ui: endpoint, status: response.status, body: body.slice(0, 256) });
    }
    const payload = await response.json().catch(() => ({}));
    return res.json({ ok: true, ui: endpoint, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, ui: endpoint, error: message });
  }
});

app.get("/heartbeat", (_req, res) => {
  try {
    const telemetry = getProviderTelemetry();
    res.json({ status: "ok", ...telemetry });
  } catch (error) {
    res.status(500).json({ status: "error", error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/dev/self-check", (_req, res) => {
  const hasAdminInfo = routeExists("/admin/info");
  const hasHealthPing = routeExists("/health/ping");
  res.json({
    ok: hasAdminInfo && hasHealthPing,
    admin_info: hasAdminInfo,
    health_ping: hasHealthPing,
    message: hasAdminInfo && hasHealthPing ? "OK: UIと整合可能" : "NG: UIと整合不可",
  });
});

app.get("/soul-core/debug", async (_req, res) => {
  try {
    const files = await loadSoulCoreFiles();
    res.json({
      total: files.length,
      files: files.map(({ name, path: filePath }) => ({ name, path: filePath })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/chat/v1", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  
  if (Object.keys(body).length === 0) {
      console.error("[BFF-ERROR] Empty or malformed request body detected.");
      return res.status(400).json({ error: "Invalid Request", message: "Request body is empty or not valid JSON." });
  }

  const rawPrompt = typeof body.prompt === "string" ? body.prompt : undefined;
  const rawQuery = typeof body.query === "string" ? body.query : undefined;
  const rawMessage = typeof body.message === "string" ? body.message : undefined;
  const rawText = typeof body.text === "string" ? body.text : undefined;
  const content = rawPrompt ?? rawQuery ?? rawMessage ?? rawText ?? "";
  const trimmedContent = typeof content === "string" ? content.trim() : "";
  const isHealthcheck = req.get("x-izk-healthcheck") === "1";
  if (!trimmedContent && !isHealthcheck) {
    return res.status(422).json({
      error: "PROMPT_REQUIRED",
      message: "request body must include non-empty 'prompt', 'query', or 'text'",
    });
  }
  const temperature = typeof body.temperature === "number" ? body.temperature : undefined;

  if (isHealthcheck) {
    return res.json({
      reply: "mini-bff-healthcheck-ok",
      meta: {
        provider: "healthcheck",
        model: "healthcheck",
        endpoint: PUBLIC_BFF_URL,
        healthcheck: true,
      },
    });
  }

  try {
    const soulCoreFiles = await loadSoulCoreFiles();
    if (!soulCoreFiles.length) {
      console.warn("[SOUL_CORE] no markdown files loaded; proceeding without soul core context");
    }
    const cardId = typeof body.cardId === "string" && body.cardId.trim() ? body.cardId.trim() : null;
    const personaPayload = body.persona && typeof body.persona === "object" ? body.persona : null;
    const personaInfo = personaPayload ? { path: null, prompt: null, data: personaPayload, source: "request" } : await loadPersona(cardId);
    const personaPrompt = personaInfo?.prompt ?? null;
    const personaData = personaPayload ? personaPayload : personaInfo?.data ?? null;
    const finalPrompt = buildPrompt({
      soulCoreFiles,
      personaPrompt,
      personaData,
      userPrompt: trimmedContent,
    });

    const result = await callLLM(finalPrompt);
    res.json({
      reply: result.reply,
      meta: {
        provider: result.provider,
        model: result.model,
        endpoint: result.endpoint,
        temperature,
        soul_core_paths: soulCoreFiles.map((file) => file.path),
        persona_path: personaInfo?.path ?? null,
        persona_source: personaInfo?.source ?? (personaPayload ? "request" : null),
        persona_payload: personaData ?? null,
      },
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.error("[BFF-CRITICAL-ERROR] Exception in /chat/v1 route:", error.stack || error);
    res.status(500).json({ error: "Chat failed (Internal Server Error)", detail: messageText });
  }
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
    requestId: req.headers["x-request-id"] ?? null,
    timestamp: new Date().toISOString(),
  });
});

loadProviderConfig()
  .then((config) => {
    console.log(`[PROVIDER] active => ${config.provider}`);
  })
  .catch((error) => {
    console.warn("[PROVIDER] failed to load configuration", error);
  });
loadWalletStore()
  .then((wallet) => {
    console.log(`[WALLET] ready (users=${Object.keys(wallet.users ?? {}).length})`);
  })
  .catch((error) => {
    console.error("[WALLET] failed to initialize wallet store", error);
  });

app.listen(PORT, () => {
  console.log(`Mini BFF running on port ${PORT}`);
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: Date.now() });
});
2. llmRouter.js (修正後全文)
llmRouter.js は、axios を使用した AI API 呼び出しのエラー詳細ログ出力が適用されています。

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const PROVIDER = (process.env.PROVIDER || "").toLowerCase();

const KNOWN_PROVIDERS = new Set(["openai", "gemini", "ollama"]);

function assertProvider() {
 if (!PROVIDER) {
  throw new Error("PROVIDER is not set");
 }
 if (!KNOWN_PROVIDERS.has(PROVIDER)) {
  throw new Error(`Unknown provider: ${PROVIDER}`);
 }
 return PROVIDER;
}

function getBaseConfig() {
 const provider = assertProvider();

 if (provider === "openai") {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const endpoint = process.env.OPENAI_ENDPOINT;
  if (!apiKey || !model || !endpoint) {
   throw new Error("OPENAI_API_KEY, OPENAI_MODEL, OPENAI_ENDPOINT are required");
  }
  return { provider, apiKey, model, endpoint };
 }

 if (provider === "gemini") {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  const endpoint = process.env.GEMINI_ENDPOINT;
  if (!apiKey || !model || !endpoint) {
   throw new Error("GEMINI_API_KEY, GEMINI_MODEL, GEMINI_ENDPOINT are required");
  }
  return { provider, apiKey, model, endpoint };
 }

 // provider === "ollama" or fallback
 const model = process.env.OLLAMA_MODEL;
 const host = process.env.OLLAMA_HOST || "http://localhost:11434";
 if (!model) {
  throw new Error("OLLAMA_MODEL is required");
 }
 return { provider, model, endpoint: host };
}

export function getProviderTelemetry() {
 const { provider, model, endpoint } = getBaseConfig();
 return { provider, model, endpoint };
}

export async function callLLM(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("callLLM requires a non-empty message string");
  }

  const { provider, model, endpoint, apiKey } = getBaseConfig();
  const prompt = message.trim();

  try {
    if (provider === "openai") {
      const response = await axios.post(
        endpoint,
        {
          model,
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      const choice = response.data?.choices?.[0]?.message?.content;
      if (!choice) {
        console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'choices[0].message.content'`, response.data);
        throw new Error("OpenAI response did not include the generated content.");
      }
      return { provider, model, endpoint, reply: choice };
    }

    if (provider === "gemini") {
      const url = `${endpoint.replace(/\/$/, "")}/${model}:generateContent`;
      const response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
        },
      );
      const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'candidates[0].content.parts[0].text'`, response.data);
        throw new Error("Gemini response did not include the generated content.");
      }
      return { provider, model, endpoint: url, reply };
    }

    // provider === "ollama"
    const url = `${endpoint.replace(/\/$/, "")}/api/generate`;
    const response = await axios.post(url, {
      model,
      prompt,
    });
    const reply = response.data?.response;
    if (!reply) {
      console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'response'`, response.data);
      throw new Error("Ollama response did not include the generated content.");
    }
    return { provider, model, endpoint: url, reply };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'N/A';
      // エラーレスポンスデータ全体をログに出力
      const data = JSON.stringify(error.response?.data || error.response?.statusText || 'No response data', null, 2);
      const url = error.config.url || endpoint;

      // Cloud Run のログに、外部 API から返された HTTP ステータスとエラーボディの詳細を出力
      console.error(`[PROVIDER-AXIOS-ERROR] Failed to call ${provider} (${url}). Status: ${status}. Data: ${data.substring(0, 1024)}`);
      
      // server.js 側に、エラーの種類を識別できるメッセージを投げる
      throw new Error(`AI Provider API call failed: ${provider} returned HTTP ${status}. See logs for details.`);
    }

    // ネットワークエラー、設定エラー、レスポンスパースエラーなど
    console.error("[PROVIDER-CRITICAL-ERROR] Non-Axios error in callLLM:", error.stack || error);
    throw new Error(`AI Provider call failed: ${error.message}.`);
  }
}