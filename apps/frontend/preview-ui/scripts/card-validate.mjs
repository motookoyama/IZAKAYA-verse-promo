#!/usr/bin/env node
// Simple validator for SillyTavern V2 character cards (JSON). Scans a folder and prints a report.
// Usage: node scripts/card-validate.mjs [dir]
import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const dir = process.argv[2] || 'docs/V2card';

const OK = (s) => console.log(`OK   ${s}`);
const WARN = (s) => console.log(`WARN ${s}`);
const ERR = (s) => console.log(`ERR  ${s}`);

async function* walk(p) {
  const ents = await fs.readdir(p, { withFileTypes: true });
  for (const e of ents) {
    const full = path.join(p, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function brief(s, n = 64) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function main() {
  const abs = path.join(root, dir);
  try { await fs.access(abs); }
  catch { ERR(`Directory not found: ${dir}`); process.exit(1); }

  const files = [];
  for await (const f of walk(abs)) {
    if (f.toLowerCase().endsWith('.json')) files.push(f);
  }
  if (files.length === 0) {
    WARN(`No JSON files under ${dir}`);
    return;
  }

  console.log(`Scan: ${dir} (found ${files.length} JSON)`);
  console.log('---------------------------------------------');
  for (const f of files) {
    let raw = '';
    try { raw = await fs.readFile(f, 'utf8'); }
    catch (e) { ERR(`${f}: cannot read (${e.message})`); continue; }
    let j;
    try { j = JSON.parse(raw); }
    catch (e) { ERR(`${f}: invalid JSON (${e.message})`); continue; }

    const spec = j.spec; const ver = j.spec_version;
    const data = j.data || {};
    const name = data.name;
    const sys = data.system_prompt ?? data.post_history_instructions;
    const scenario = data.scenario;
    const first = data.first_mes ?? data.first_message;
    const tags = data.tags; const wi = data.world_info;

    const issues = [];
    if (spec !== 'chara_card_v2') issues.push('spec != chara_card_v2');
    if (!ver || typeof ver !== 'string') issues.push('spec_version missing or not string');
    if (!name) issues.push('data.name missing');
    if (!sys) issues.push('system_prompt/post_history_instructions missing');

    if (issues.length) {
      WARN(`${f}: ${issues.join('; ')}`);
    } else {
      OK(`${f}: name="${name}", sys=${brief(sys, 48)}`);
    }

    const extras = [];
    if (scenario) extras.push(`scenario:${brief(scenario, 48)}`);
    if (first) extras.push(`first_mes:${brief(first, 48)}`);
    if (Array.isArray(tags)) extras.push(`tags:${tags.length}`);
    if (Array.isArray(wi)) extras.push(`world_info:${wi.length}`);
    if (extras.length) console.log(`      ${extras.join(' | ')}`);
  }
}

main().catch(e => { ERR(e.stack || String(e)); process.exit(1); });

