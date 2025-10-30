import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";
import fsSync from "fs";
import { promises as fs } from "fs";
import path from "path";

import { callLLM, getProviderTelemetry } from "./services/llmRouter.js";

const app = express();
const PERSONA_ENGINE_URL = process.env.PERSONA_ENGINE_URL || "http://localhost:4105";
const DATA_DIR = process.env.TX_STORE_DIR || path.resolve(process.cwd(), "data");
const STORE_FILE = process.env.TX_STORE || path.join(DATA_DIR, "tx_store.json");
const PROVIDER_FILE = process.env.PROVIDER_FILE || path.resolve(process.cwd(), "provider.json");
const PRICING_FILE = process.env.PRICING_FILE || path.resolve(process.cwd(), "data/pricing.json");
const LEDGER_LIMIT = Number(process.env.TX_HISTORY_LIMIT || 200);
const HISTORY_RESPONSE_LIMIT = Number(process.env.TX_HISTORY_RESPONSE_LIMIT || 20);
const TX_ID_REGEX = /^TX-\d{8}-[A-Z0-9]{6,}$/i;
const IDEMPOTENCY_REGEX = /^[A-Za-z0-9_\-]{6,128}$/;
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "suke-nomi";
const PAYPAL_VERIFY_URL =
  process.env.PAYPAL_VERIFY_URL || "https://ipnpb.paypal.com/cgi-bin/webscr";
const PERSONA_ENGINE_ROOT = path.resolve(process.cwd(), "../persona-engine");
const SOUL_CORE_DIR = path.join(PERSONA_ENGINE_ROOT, "soul-core");
const CARDS_ROOT = path.join(PERSONA_ENGINE_ROOT, "cards");
const ENV_FILE_PATH = path.resolve(process.cwd(), ".env");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});


const defaultStore = { version: 1, users: {} };
const defaultProviderConfig = {
  provider: "GEMINI",
  model: "gemini-pro",
  apiKey: "",
  endpoint: "",
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  updatedAt: new Date().toISOString(),
};
let providerCache = null;

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

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultStore, null, 2));
  }
}

async function loadStore() {
  await ensureStoreFile();
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.users || typeof parsed.users !== "object") {
      return { ...defaultStore };
    }
    return parsed;
  } catch {
    return { ...defaultStore };
  }
}

async function saveStore(store) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2));
}

function getLedger(store, userId) {
  if (!store.users[userId]) {
    store.users[userId] = { balance: 0, history: [] };
  }
  return store.users[userId];
}

function trimHistory(ledger) {
  if (ledger.history.length > LEDGER_LIMIT) {
    ledger.history = ledger.history.slice(-LEDGER_LIMIT);
  }
}

function toHistoryEntry(entry) {
  return {
    ...entry,
    time: entry.time ?? new Date().toISOString(),
  };
}

function generateTxId(prefix = "TX") {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${yyyymmdd}-${random}`;
}

async function applyRedeem(userId, amountPt, txId, metadata = {}) {
  const store = await loadStore();
  const ledger = getLedger(store, userId);

  if (ledger.history.some((entry) => entry.tx_id === txId && entry.type === "redeem")) {
    return {
      ok: false,
      status: 409,
      error: "Duplicate TX-ID",
      balance: ledger.balance,
    };
  }

  ledger.balance += amountPt;
  ledger.history.push(
    toHistoryEntry({
      type: "redeem",
      tx_id: txId,
      amount_pt: amountPt,
      balance_after: ledger.balance,
      source: metadata.source,
      detail: metadata.detail,
    }),
  );
  trimHistory(ledger);
  await saveStore(store);

  return {
    ok: true,
    balance: ledger.balance,
    store,
  };
}

async function applyConsume(userId, amountPt, sku, idempotencyKey) {
  const store = await loadStore();
  const ledger = getLedger(store, userId);

  if (ledger.balance < amountPt) {
    return { ok: false, status: 402, error: "Insufficient points", balance: ledger.balance };
  }

  if (
    ledger.history.some(
      (entry) => entry.idempotency_key === idempotencyKey && entry.type === "consume",
    )
  ) {
    return { ok: false, status: 409, error: "Duplicate consume idempotency key", balance: ledger.balance };
  }

  ledger.balance -= amountPt;
  ledger.history.push(
    toHistoryEntry({
      type: "consume",
      sku,
      amount_pt: amountPt,
      idempotency_key: idempotencyKey,
      balance_after: ledger.balance,
    }),
  );
  trimHistory(ledger);
  await saveStore(store);

  return { ok: true, balance: ledger.balance };
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
      return `${key}=${value ?? ""}`;
    }
    return line;
  });

  for (const [key, value] of entries) {
    if (!touched.has(key)) {
      outputLines.push(`${key}=${value ?? ""}`);
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
  } catch {
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
      prompt: prompt,
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

function buildPrompt({ soulCoreFiles, personaPrompt, userPrompt }) {
  const sections = [];
  if (Array.isArray(soulCoreFiles) && soulCoreFiles.length > 0) {
    const combined = soulCoreFiles
      .map((file, index) => {
        const header = `### Soul Core ${index + 1}: ${file.name}`;
        return `${header}\n${file.content}`;
      })
      .join("\n\n");
    sections.push(`[SOUL-CORE]\n${combined}`);
  }
  if (personaPrompt) {
    sections.push(`[PERSONA]\n${personaPrompt}`);
  }
  const userSection = userPrompt?.trim() || "";
  if (userSection.length > 0) {
    sections.push(`[USER]\n${userSection}`);
  }
  return sections.join("\n\n");
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

app.get("/health/ping", (_req, res) => {
  try {
    const telemetry = getProviderTelemetry();
    res.status(200).json({
      ok: true,
      service: "mini-bff",
      provider: telemetry.provider,
      model: telemetry.model,
      endpoint: telemetry.endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
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

  const store = await loadStore();
  const ledger = getLedger(store, userId);

  res.json({
    user_id: userId,
    unit: "pt",
    balance: ledger.balance,
    history: ledger.history.slice(-HISTORY_RESPONSE_LIMIT),
  });
});

app.post("/wallet/redeem", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { amount_pt, tx_id } = req.body ?? {};
  if (!Number.isInteger(amount_pt) || amount_pt <= 0) {
    return res.status(400).json({ error: "amount_pt must be a positive integer" });
  }
  if (typeof tx_id !== "string" || !TX_ID_REGEX.test(tx_id)) {
    return res.status(400).json({ error: "tx_id must match pattern TX-YYYYMMDD-XXXXXX" });
  }

  const result = await applyRedeem(userId, amount_pt, tx_id, { source: "api" });
  if (!result.ok) {
    return res.status(result.status ?? 500).json({
      error: result.error ?? "redeem_failed",
      balance: result.balance,
    });
  }

  res.status(201).json({
    user_id: userId,
    balance: result.balance,
    unit: "pt",
  });
});

app.post("/wallet/consume", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { amount_pt, sku, idempotency_key } = req.body ?? {};
  if (!Number.isInteger(amount_pt) || amount_pt <= 0) {
    return res.status(400).json({ error: "amount_pt must be a positive integer" });
  }
  if (typeof sku !== "string" || !sku.trim()) {
    return res.status(400).json({ error: "sku is required" });
  }
  if (typeof idempotency_key !== "string" || !IDEMPOTENCY_REGEX.test(idempotency_key)) {
    return res.status(400).json({ error: "idempotency_key must be 6-128 chars (A-Z,0-9,_,-)" });
  }

  const result = await applyConsume(userId, amount_pt, sku, idempotency_key);
  if (!result.ok) {
    return res
      .status(result.status ?? 500)
      .json({ error: result.error ?? "consume_failed", balance: result.balance });
  }

  res.status(201).json({
    user_id: userId,
    balance: result.balance,
    unit: "pt",
  });
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

    const redeemResult = await applyRedeem(userId, amountPoints, txId, {
      source: "paypal-ipn",
      detail: {
        txn_id: payload.txn_id || payload.txnId,
        payer_email: payload.payer_email,
        gross: payload.mc_gross,
        currency: payload.mc_currency,
      },
    });

    if (!redeemResult.ok) {
      console.warn("[IPN] redeem rejected", redeemResult);
      return res.status(200).send("DUPLICATE");
    }

    console.log(
      `[IPN] redeemed ${amountPoints}pt for ${userId} (tx=${txId}, balance=${redeemResult.balance})`,
    );
    res.status(200).send("OK");
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

app.get("/heartbeat", (_req, res) => {
  try {
    const telemetry = getProviderTelemetry();
    res.json({ status: "ok", ...telemetry });
  } catch (error) {
    res.status(500).json({ status: "error", error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/chat/v1", async (req, res) => {
  const { prompt, message, temperature } = req.body ?? {};
  const content = typeof message === "string" ? message : typeof prompt === "string" ? prompt : "";
  if (!content.trim()) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const soulCoreFiles = await loadSoulCoreFiles();
    if (!soulCoreFiles.length) {
      return res.status(500).json({ error: "soul_core_missing", detail: SOUL_CORE_DIR });
    }
    const cardId = typeof req.body?.cardId === "string" ? req.body.cardId : null;
    const persona = await loadPersona(cardId);
    const finalPrompt = buildPrompt({
      soulCoreFiles,
      personaPrompt: persona?.prompt ?? null,
      userPrompt: content,
    });

    const result = await callLLM(finalPrompt);
    res.json({
      reply: result.reply,
      meta: {
        provider: result.provider,
        model: result.model,
        endpoint: result.endpoint,
        temperature: typeof temperature === "number" ? temperature : undefined,
        soul_core_paths: soulCoreFiles.map((file) => file.path),
        persona_path: persona?.path ?? null,
        persona_source: persona?.source ?? null,
      },
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: messageText });
  }
});

const PORT = Number(process.env.PORT) || 4117;
loadProviderConfig()
  .then((config) => {
    console.log(`[PROVIDER] active => ${config.provider}`);
  })
  .catch((error) => {
    console.warn("[PROVIDER] failed to load configuration", error);
  });

app.listen(PORT, () => {
  console.log(`Mini BFF running on port ${PORT}`);
});
