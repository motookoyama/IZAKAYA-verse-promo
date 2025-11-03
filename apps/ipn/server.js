import dotenv from "dotenv";
dotenv.config();

import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 4119;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "admin";
const BFF_BASE_URL = (process.env.BFF_BASE_URL || "http://localhost:4117").replace(/\/+$/, "");
const PAYPAL_VERIFY_URL =
  process.env.PAYPAL_VERIFY_URL || "https://ipnpb.paypal.com/cgi-bin/webscr";

const TX_ID_REGEX = /^TX-\d{8}-[A-Z0-9]{6,}$/i;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateTxId(prefix = "TX") {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${yyyymmdd}-${random}`;
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
    // ignore JSON parse errors and fall back to key-value parsing
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
      const yyyymmdd = getTodayUtcDate().replace(/-/g, "");
      return `TX-${yyyymmdd}-${trimmed}`;
    }
  }
  return generateTxId("TX");
}

async function verifyWithPayPal(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  }
  const verificationBody = `cmd=_notify-validate&${params.toString()}`;
  const response = await fetch(PAYPAL_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verificationBody,
  });
  const text = (await response.text()).trim();
  return text === "VERIFIED";
}

async function grantPoints(userId, amount, transactionId) {
  const url = `${BFF_BASE_URL}/wallet/grant`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IZK-UID": ADMIN_USER_ID,
    },
    body: JSON.stringify({ userId, amount, transactionId }),
  });
  const responseText = await response.text().catch(() => "");
  if (response.status === 409) {
    console.warn("[IPN] duplicate transaction detected", { userId, transactionId });
    return { ok: true, duplicate: true };
  }
  if (!response.ok) {
    console.error("[IPN] wallet/grant failed", {
      userId,
      amount,
      transactionId,
      status: response.status,
      body: responseText?.slice(0, 256),
    });
    return { ok: false, status: response.status, body: responseText };
  }
  console.log("[IPN] wallet/grant success", { userId, amount, transactionId });
  return { ok: true, duplicate: false };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ipn-relay", bff: BFF_BASE_URL });
});

app.post("/paypal/ipn", async (req, res) => {
  const payload = req.body ?? {};
  console.log("[IPN] received payload", { keys: Object.keys(payload) });
  try {
    const verified = await verifyWithPayPal(payload);
    if (!verified) {
      console.warn("[IPN] verification failed");
      return res.status(200).send("INVALID");
    }

    const paymentStatus = (payload.payment_status || payload.paymentStatus || "").toLowerCase();
    if (paymentStatus && paymentStatus !== "completed") {
      console.info("[IPN] non-completed payment", { paymentStatus });
      return res.status(200).send("IGNORED");
    }

    const customMeta = parseCustomField(payload.custom || payload.memo || payload.note);
    const userId = extractUserId(payload, customMeta);
    const amountPoints = extractPoints(payload, customMeta);
    if (!userId) {
      console.warn("[IPN] missing user id", { payloadPreview: Object.keys(payload) });
      return res.status(200).send("MISSING_USER");
    }
    if (!Number.isInteger(amountPoints) || amountPoints <= 0) {
      console.warn("[IPN] invalid amount", { userId, amountPoints });
      return res.status(200).send("INVALID_POINTS");
    }

    const txId = normalizeTxId(
      customMeta.tx_id || customMeta.txid || payload.tx_id || payload.txn_id || payload.parent_txn_id,
    );

    const grantResult = await grantPoints(userId, amountPoints, txId);
    if (!grantResult.ok) {
      return res.status(200).send("GRANT_FAILED");
    }
    return res.status(200).send(grantResult.duplicate ? "DUPLICATE" : "OK");
  } catch (error) {
    console.error("[IPN] unexpected error", error);
    return res.status(500).send("ERROR");
  }
});

app.listen(PORT, () => {
  console.log(`[IPN] relay server listening on port ${PORT} (BFF=${BFF_BASE_URL})`);
});
