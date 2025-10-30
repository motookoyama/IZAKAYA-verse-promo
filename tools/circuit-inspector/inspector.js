#!/usr/bin/env node
/**
 * Circuit Inspector v1
 * --------------------
 * Read-only preflight checker for IZAKAYA verse services.
 *
 * Usage:
 *   node tools/circuit-inspector/inspector.js           # check all services
 *   node tools/circuit-inspector/inspector.js --service bff-mini
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more services reported problems
 *   20/21 = configuration errors
 */

import fs from "fs";
import path from "path";
import process from "process";

const repoRoot = path.resolve(process.cwd());
const CONFIG_PATH = path.resolve(repoRoot, "tools/circuit-inspector/circuit.config.json");

const exists = (p) => {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));

const parseEnvFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf-8");
  const map = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+?)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim();
    map[key] = value;
  });
  return map;
};

const toPad = (text, len) => (text + " ".repeat(len)).slice(0, len);

if (!exists(CONFIG_PATH)) {
  console.error(`[FATAL] config file not found: ${CONFIG_PATH}`);
  process.exit(20);
}

const config = readJSON(CONFIG_PATH);
const requestedId = process.argv.find((arg) => arg.startsWith("--service"))?.split("=")[1];

const services = requestedId
  ? (config.services || []).filter((svc) => svc.id === requestedId)
  : config.services || [];

if (!services.length) {
  console.error(
    `[FATAL] no services configured for ${
      requestedId ? `id "${requestedId}"` : "inspection"
    }.`
  );
  process.exit(21);
}

const summary = [];

for (const svc of services) {
  const reports = [];
  let ok = true;

  const root = path.resolve(repoRoot, svc.root);
  const entryPath = path.resolve(root, svc.entry || "server.js");
  const envPath = path.resolve(root, svc.envFile || ".env");

  // 1. ensure paths exist
  if (!exists(root)) {
    ok = false;
    reports.push({ level: "ERROR", code: "ROOT_MISSING", message: `root not found: ${root}` });
    summary.push({ id: svc.id, ok, reports });
    continue;
  }

  if (!exists(entryPath)) {
    ok = false;
    reports.push({
      level: "ERROR",
      code: "ENTRY_MISSING",
      message: `entry file not found: ${entryPath}`,
    });
  } else {
    // 2. dotenv markers
    const source = fs.readFileSync(entryPath, "utf-8");
    if (svc.sourceChecks?.requireDotenvAtTop) {
      const markers = svc.sourceChecks.dotenvMarkers || [];
      const hasMarker = markers.some((marker) => source.includes(marker));
      if (!hasMarker) {
        ok = false;
        reports.push({
          level: "ERROR",
          code: "DOTENV_NOT_INITIALIZED",
          message: `dotenv initialization marker not found in ${svc.entry}`,
        });
      } else {
        reports.push({
          level: "OK",
          code: "DOTENV_FOUND",
          message: "dotenv initialization detected",
        });
      }

      if (svc.sourceChecks.expectedPortLiteral) {
        if (!source.includes(svc.sourceChecks.expectedPortLiteral)) {
          reports.push({
            level: "WARN",
            code: "PORT_LITERAL_ABSENT",
            message: `expected port literal "${svc.sourceChecks.expectedPortLiteral}" not found in source`,
          });
        } else {
          reports.push({
            level: "OK",
            code: "PORT_LITERAL_FOUND",
            message: `port literal "${svc.sourceChecks.expectedPortLiteral}" detected`,
          });
        }
      }
    }
  }

  // 3. env file presence and required keys
  if (!exists(envPath)) {
    ok = false;
    reports.push({
      level: "ERROR",
      code: "ENV_MISSING",
      message: `.env file not found at ${envPath}`,
    });
  } else if (svc.requiredEnv?.anyOf?.length) {
    const envMap = parseEnvFile(envPath);
    const satisfied = svc.requiredEnv.anyOf.some((group) =>
      group.every((key) => typeof envMap[key] === "string" && envMap[key].length > 0)
    );
    if (!satisfied) {
      ok = false;
      reports.push({
        level: "ERROR",
        code: "ENV_KEYS_MISSING",
        message: `.env does not satisfy any required key combinations`,
      });
    } else {
      reports.push({
        level: "OK",
        code: "ENV_KEYS_PRESENT",
        message: "required environment key set found",
      });
    }
  }

  summary.push({ id: svc.id, ok, reports });
}

let exitCode = 0;
for (const svc of summary) {
  console.log(`\n=== Service: ${svc.id} ===`);
  for (const report of svc.reports) {
    const badge = report.level === "OK" ? "✅" : report.level === "WARN" ? "⚠️ " : "❌";
    console.log(
      `${badge} ${toPad(report.level, 5)} ${toPad(report.code, 24)} ${report.message}`
    );
  }
  console.log(`--- Result: ${svc.ok ? "ALL GREEN" : "HAS PROBLEMS"}`);
  if (!svc.ok) exitCode = 1;
}

process.exit(exitCode);
