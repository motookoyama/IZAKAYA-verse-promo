#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

const ANSI = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

const SCRIPT_DIR = __dirname;
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const LOG_DIR = path.resolve(WORKSPACE_ROOT, "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const repoCandidates = [
  process.env.IZK_REPO_ROOT ? path.resolve(process.env.IZK_REPO_ROOT) : null,
  path.resolve(WORKSPACE_ROOT, "GitHub/IZAKAYA-verse-promo"),
  path.resolve(WORKSPACE_ROOT, "IZAKAYA-verse-promo"),
  path.resolve("/Users/nohonx/Documents/GitHub/IZAKAYA-verse-promo"),
].filter(Boolean);

const REPO_ROOT = repoCandidates.find((candidate) => {
  try {
    return fs.existsSync(path.join(candidate, "apps"));
  } catch {
    return false;
  }
});

if (!REPO_ROOT) {
  console.error(
    `${ANSI.red}[ERROR] IZAKAYA-verse-promo のルートパスが特定できません。環境変数 IZK_REPO_ROOT を設定してください。${ANSI.reset}`,
  );
  process.exit(1);
}

const SERVICES = [
  {
    name: "UI",
    cwd: path.join(REPO_ROOT, "apps/frontend/preview-ui"),
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"],
    env: { PORT: "5174", VITE_PORT: "5174" },
    logFile: "ui.log",
    port: 5174,
  },
  {
    name: "BFF",
    cwd: path.join(REPO_ROOT, "apps/bff/mini"),
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    env: { PORT: "4117" },
    logFile: "bff.log",
    port: 4117,
  },
  {
    name: "IPN",
    cwd: path.join(REPO_ROOT, "apps/ipn"),
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    env: { PORT: "5018", BFF_BASE_URL: "http://localhost:4117" },
    logFile: "ipn.log",
    port: 5018,
  },
];

const children = [];
let shuttingDown = false;
const SKIP_INSTALL = process.env.IZK_SKIP_INSTALL === "1";

function writeHeader(stream, name) {
  stream.write(`================ ${name} ${new Date().toISOString()} ================\n`);
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: options.stdio ?? "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function tryRun(command, args) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let output = "";
    proc.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.on("error", () => resolve(null));
    proc.on("exit", (code) => {
      if (code === 0 && output.trim().length > 0) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });
  });
}

async function ensureDependencies(service) {
  if (SKIP_INSTALL) {
    console.log(`${ANSI.yellow}[${service.name}] 依存関係チェックをスキップします (IZK_SKIP_INSTALL=1)${ANSI.reset}`);
    return;
  }
  const nodeModulesPath = path.join(service.cwd, "node_modules");
  const packageJsonPath = path.join(service.cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.warn(
      `${ANSI.yellow}[${service.name}] package.json が見つかりません。npm install はスキップします。${ANSI.reset}`,
    );
    return;
  }
  if (fs.existsSync(nodeModulesPath)) {
    return;
  }
  console.log(`${ANSI.cyan}[${service.name}] npm install を実行します…${ANSI.reset}`);
  await runCommand(service.command, ["install"], { cwd: service.cwd, env: process.env });
  console.log(`${ANSI.green}[${service.name}] npm install 完了${ANSI.reset}`);
}

function checkPortAvailability(port) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once("error", (error) => {
        if (error && error.code === "EADDRINUSE") {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(error);
        }
      })
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "0.0.0.0");
  });
}

async function getPortUsageInfo(port) {
  if (process.platform !== "win32") {
    const lsof = await tryRun("lsof", ["-i", `:${port}`, "-n", "-P"]);
    if (lsof) return lsof;
  }

  const netstatCmd =
    process.platform === "win32"
      ? ["netstat", ["-ano"]]
      : ["netstat", ["-anp", "tcp"]];

  const netstatOutput = await tryRun(netstatCmd[0], netstatCmd[1]);
  if (netstatOutput) {
    const lines = netstatOutput
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${port}`));
    return lines.join("\n");
  }
  return null;
}

async function resolveListeningPids(port) {
  if (process.platform !== "win32") {
    const output = await tryRun("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN", "-n", "-P"]);
    if (!output) return [];
    return output
      .split(/\s+/)
      .map((value) => Number.parseInt(value, 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  }

  const netstatOutput = await tryRun("netstat", ["-ano"]);
  if (!netstatOutput) return [];
  const lines = netstatOutput.split(/\r?\n/);
  const pids = new Set();
  for (const line of lines) {
    if (!line.includes(`:${port}`)) continue;
    if (!line.toUpperCase().includes("LISTEN")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number.parseInt(parts[parts.length - 1], 10);
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
      pids.add(pid);
    }
  }
  return Array.from(pids);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminatePid(pid, force = false) {
  try {
    if (process.platform === "win32") {
      const args = ["/PID", `${pid}`];
      if (force) args.push("/F");
      await runCommand("taskkill", args, { stdio: "ignore" });
    } else {
      process.kill(pid, force ? "SIGKILL" : "SIGTERM");
    }
    return true;
  } catch (error) {
    if (force) {
      console.error(`${ANSI.red}[WARN] PID ${pid} を強制終了できませんでした: ${error.message}${ANSI.reset}`);
    }
    return false;
  }
}

async function freePort(port, serviceName) {
  if (process.platform !== "win32") {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
      console.log(`${ANSI.yellow}[${serviceName}] 先行プロセスを kill -9 で掃除しました (port ${port})${ANSI.reset}`);
    } catch {
      // ignore failures; fallback cleanup will handle the rest
    }
  }

  const pids = await resolveListeningPids(port);
  if (!pids.length) return;
  console.warn(
    `${ANSI.yellow}[${serviceName}] ポート ${port} を使用中のプロセスを検出: ${pids.join(", ")}。終了を試みます。${ANSI.reset}`,
  );

  for (const pid of pids) {
    await terminatePid(pid, false);
  }
  await sleep(500);

  const remaining = await resolveListeningPids(port);
  if (!remaining.length) {
    console.log(`${ANSI.green}[${serviceName}] ポート ${port} を解放しました。${ANSI.reset}`);
    return;
  }

  console.warn(
    `${ANSI.yellow}[${serviceName}] ポート ${port} がまだ使用中です。強制終了を試みます: ${remaining.join(", ")}${ANSI.reset}`,
  );
  for (const pid of remaining) {
    await terminatePid(pid, true);
  }
  await sleep(500);

  const finalCheck = await resolveListeningPids(port);
  if (finalCheck.length) {
    console.error(
      `${ANSI.red}[${serviceName}] ポート ${port} の解放に失敗しました。手動でプロセス(${finalCheck.join(
        ", ",
      )})を停止してください。${ANSI.reset}`,
    );
    throw new Error(`Port ${port} is already in use`);
  }
  console.log(`${ANSI.green}[${serviceName}] ポート ${port} を強制解放しました。${ANSI.reset}`);
}

function startService(service) {
  const logPath = path.join(LOG_DIR, service.logFile);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  writeHeader(logStream, service.name);

  console.log(
    `${ANSI.cyan}[${service.name}] 起動コマンド: ${service.command} ${service.args.join(" ")} (cwd=${service.cwd})${ANSI.reset}`,
  );

  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push({ name: service.name, child, logStream });
  let uiPortAnnounced = false;

  child.stdout.on("data", (chunk) => {
    logStream.write(chunk);
    if (service.name === "UI") {
      const text = chunk.toString();
      if (!uiPortAnnounced && text.includes("localhost:")) {
        const match = text.match(/localhost:(\d+)/);
        if (match) {
          uiPortAnnounced = true;
          console.log(`${ANSI.green}✅ UI起動ポート: ${match[1]}${ANSI.reset}`);
        }
      }
    }
  });
  child.stderr.on("data", (chunk) => {
    logStream.write(chunk);
  });

  child.on("error", (error) => {
    logStream.write(`[error] ${error.stack || error}\n`);
    console.error(`${ANSI.red}[${service.name}] 起動に失敗しました: ${error.message}${ANSI.reset}`);
  });

  child.on("exit", (code, signal) => {
    logStream.write(`[exit] code=${code ?? "null"} signal=${signal ?? "null"} at ${new Date().toISOString()}\n`);
    logStream.end();
    if (!shuttingDown && code !== 0) {
      console.error(
        `${ANSI.red}[${service.name}] プロセスが異常終了しました (code=${code}, signal=${signal}). ログ: ${logPath}${ANSI.reset}`,
      );
    } else {
      console.log(
        `${ANSI.yellow}[${service.name}] プロセス終了 (code=${code}, signal=${signal}). ログ: ${logPath}${ANSI.reset}`,
      );
    }
  });

  console.log(
    `${ANSI.green}[${service.name}] 起動完了 (PID: ${child.pid}) - 停止するには: kill ${child.pid}${ANSI.reset}`,
  );
  return child;
}

function shutdownAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${ANSI.yellow}\n[INFO] 停止処理を開始します…${ANSI.reset}`);
  for (const { name, child } of children) {
    if (!child.killed) {
      console.log(`${ANSI.yellow}[${name}] に SIGTERM を送信します (PID: ${child.pid})${ANSI.reset}`);
      try {
        child.kill("SIGTERM");
      } catch (error) {
        console.error(`${ANSI.red}[${name}] kill 失敗: ${error.message}${ANSI.reset}`);
      }
    }
  }
  setTimeout(() => {
    for (const { name, child } of children) {
      if (!child.killed && !child.exitCode) {
        console.log(`${ANSI.red}[${name}] がまだ終了していません。SIGKILL を送ります。${ANSI.reset}`);
        try {
          child.kill("SIGKILL");
        } catch (error) {
          console.error(`${ANSI.red}[${name}] SIGKILL 失敗: ${error.message}${ANSI.reset}`);
        }
      }
    }
  }, 3000);
}

process.on("SIGINT", () => {
  console.log("\n[CTRL+C] 受信");
  shutdownAll();
});

process.on("SIGTERM", () => {
  shutdownAll();
});

async function main() {
  console.log(`${ANSI.cyan}IZAKAYAverse ローカル環境起動スクリプト${ANSI.reset}`);
  console.log(`${ANSI.cyan}リポジトリ: ${REPO_ROOT}${ANSI.reset}`);
  console.log(`${ANSI.cyan}ログディレクトリ: ${LOG_DIR}${ANSI.reset}`);
  console.log(`${ANSI.cyan}起動順序: UI → BFF → IPN${ANSI.reset}`);
  console.log("");

  ensureDirExists(LOG_DIR);

  for (const service of SERVICES) {
    await ensureDependencies(service);
  }

  for (const service of SERVICES) {
    if (typeof service.port === "number") {
      await freePort(service.port, service.name);
      try {
        await checkPortAvailability(service.port);
      } catch (error) {
        console.error(
          `${ANSI.red}[${service.name}] ポート ${service.port} が使用中のため起動できません。${ANSI.reset}`,
        );
        const info = await getPortUsageInfo(service.port);
        if (info) {
          console.error(`${ANSI.yellow}--- 現在のポート利用状況 ---\n${info}\n------------------------${ANSI.reset}`);
        }
        console.error(
          `${ANSI.red}プロセスを停止するか、別のポートに変更してから再度実行してください。${ANSI.reset}`,
        );
        throw error;
      }
    }
    startService(service);
  }

  console.log(`${ANSI.green}\nすべてのプロセスを起動しました。停止するには Ctrl+C を押してください。${ANSI.reset}`);
}

main().catch((error) => {
  console.error(`${ANSI.red}[FATAL] 起動スクリプトでエラーが発生しました: ${error.message}${ANSI.reset}`);
  shutdownAll();
  process.exit(1);
});
