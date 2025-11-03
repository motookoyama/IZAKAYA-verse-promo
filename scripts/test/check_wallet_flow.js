#!/usr/bin/env node
/* eslint-disable no-console */
const BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:4117";
const TEST_USER_ID = process.env.TEST_USER_ID ?? "preview-ui";
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "admin";
const GRANT_AMOUNT = Number.parseInt(process.env.TEST_GRANT_AMOUNT ?? "7", 10);
const REVERT = process.env.TEST_REVERT === "0" ? false : true;

if (!Number.isInteger(GRANT_AMOUNT) || GRANT_AMOUNT <= 0) {
  console.error(`FAILED: Invalid TEST_GRANT_AMOUNT (${GRANT_AMOUNT})`);
  process.exit(1);
}

async function request(endpoint, options) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    return {
      ok: response.ok,
      status: response.status,
      json: isJson ? JSON.parse(text || "{}") : null,
      text,
    };
  } catch (error) {
    throw new Error(`Request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runDiagnostic() {
  const result = await request("/admin/wallet/diagnostic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IZK-UID": ADMIN_USER_ID,
    },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      amount: GRANT_AMOUNT,
      revert: REVERT,
    }),
  });
  if (!result.ok) {
    throw new Error(`/admin/wallet/diagnostic failed (${result.status} ${result.text || ""})`);
  }
  const data = result.json;
  if (!data || data.ok !== true) {
    throw new Error(data?.error || result.text || "wallet diagnostic failed");
  }
  if (REVERT && data.finalBalance !== data.initialBalance) {
    throw new Error(
      `Expected balance to revert to ${data.initialBalance}, but received ${data.finalBalance}`,
    );
  }
  if (!REVERT) {
    const expected = data.initialBalance + GRANT_AMOUNT;
    if (data.finalBalance !== expected) {
      throw new Error(
        `Balance mismatch. Expected ${expected}, received ${data.finalBalance} (initial ${data.initialBalance})`,
      );
    }
  }
  if (data.ipnLogHasErrors) {
    throw new Error(data.ipnLogNote || "IPN log contains errors");
  }
  return data;
}

async function main() {
  try {
    const result = await runDiagnostic();
    const summaryParts = [
      `user ${result.userId}`,
      `amount ${result.amount}`,
      `transaction ${result.transactionId}`,
      `balance ${result.initialBalance} -> ${result.grantBalance} -> ${result.finalBalance}`,
      result.reverted ? "reverted ✅" : "kept ❗️",
    ];
    const note = result.ipnLogNote ? ` ${result.ipnLogNote}` : "";
    console.log(
      `OK: wallet diagnostic passed (${summaryParts.join(", ")}).${note}`,
    );
    process.exit(0);
  } catch (error) {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
