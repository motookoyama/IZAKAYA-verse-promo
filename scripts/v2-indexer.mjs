#!/usr/bin/env node
// V2 Card indexer: scans repo for JSON/.sAtd/PNG cards and builds docs/v2/manifest.json
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT = process.cwd();
const TARGETS = [
  'docs/V2card',
  'docs/v2',
  'IZAKAYA verse',
  'IZAKAYAライト',
];

function exists(p){ try{ fs.accessSync(p); return true; }catch{ return false; } }
function isDir(p){ try{ return fs.statSync(p).isDirectory(); }catch{ return false; } }
function readText(p){ return fs.readFileSync(p, 'utf8'); }
function writeJSON(p, obj){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

function walk(dir){
  const out = [];
  const stack = [dir];
  while(stack.length){
    const d = stack.pop();
    let ents = [];
    try{ ents = fs.readdirSync(d, {withFileTypes:true}); }catch{ continue; }
    for(const e of ents){
      const p = path.join(d, e.name);
      if(e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function parseLooseJson(txt){
  try{ return JSON.parse(txt); }catch{}
  const a = txt.indexOf('{'); const b = txt.lastIndexOf('}');
  if(a!==-1 && b!==-1 && b>a){
    try{ return JSON.parse(txt.slice(a, b+1)); }catch{}
  }
  return null;
}

function inflate(buf){ try{ return zlib.inflateSync(buf); }catch{ return null; } }

function parsePngForJson(filePath){
  let buf; try{ buf = fs.readFileSync(filePath); }catch{ return null; }
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  if(buf.length<8 || !buf.slice(0,8).equals(sig)) return null;
  const texts = [];
  let p=8;
  while(p+8 <= buf.length){
    const len = buf.readUInt32BE(p); p+=4;
    const type = buf.slice(p,p+4).toString('latin1'); p+=4;
    const data = buf.slice(p,p+len); p+=len; p+=4; // skip CRC
    if(type==='tEXt'){
      const nul = data.indexOf(0);
      const text = (nul>=0? data.slice(nul+1): data).toString('latin1');
      texts.push(text);
    } else if(type==='iTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++; // keyword
      const compressionFlag = data[q+1]; const compressionMethod = data[q+2];
      q+=3; while(q<data.length && data[q]!==0) q++; q++; // languageTag\0
      while(q<data.length && data[q]!==0) q++; q++; // translatedKeyword\0
      let textBytes = data.slice(q);
      if(compressionFlag===1 && compressionMethod===0){
        const inf = inflate(textBytes); if(inf) texts.push(inf.toString('utf8'));
      } else { texts.push(textBytes.toString('utf8')); }
    } else if(type==='zTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++; q++; // after NUL
      const comp = data.slice(q);
      const inf = inflate(comp); if(inf) texts.push(inf.toString('utf8'));
    }
    if(type==='IEND') break;
  }
  for(const t of texts){ const obj = parseLooseJson(t); if(obj) return obj; }
  return null;
}

// Normalization per guide
function pickFirstMes(o){ return o?.data?.first_mes ?? o?.spec?.first_mes ?? o?.card?.first_mes ?? o?.first_mes ?? o?.prompt ?? ''; }
function pickName(o){ return o?.name ?? o?.character ?? o?.title ?? o?.data?.name ?? ''; }
function pickBehavior(o){ return o?.description ?? o?.system_prompt ?? o?.behavior ?? o?.data?.description ?? ''; }
function pickLinks(o){ return Array.isArray(o?.links) ? o.links : (Array.isArray(o?.data?.links) ? o.data.links : []); }

const results = [];
const errors = [];

for(const t of TARGETS){
  const abs = path.join(ROOT, t);
  if(!exists(abs) || !isDir(abs)) continue;
  for(const fp of walk(abs)){
    const ext = path.extname(fp).toLowerCase();
    if(!['.json','.satd','.png'].includes(ext)) continue;
    let obj=null, type='';
    try{
      if(ext==='.png') { obj = parsePngForJson(fp); type='png'; }
      else { const txt = readText(fp); obj = parseLooseJson(txt); type = (ext==='.satd'?'sAtd':'json'); }
    }catch(e){ errors.push({path:fp, error:String(e)}); continue; }
    if(!obj){ errors.push({path:fp, error:'no_json_detected'}); continue; }
    const name = pickName(obj);
    const first_mes = pickFirstMes(obj);
    const behavior = pickBehavior(obj);
    const links = pickLinks(obj);
    const id = obj.id || (name ? 'v2_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') : '');
    results.push({ path: fp, type, id, name, first_mes, behavior, linksCount: Array.isArray(links)? links.length:0 });
  }
}

const out = { generatedAt: new Date().toISOString(), count: results.length, items: results, errors };
writeJSON(path.join(ROOT, 'docs/v2/manifest.json'), out);
console.log(`[v2-indexer] scanned: ${results.length} items, errors: ${errors.length}`);
console.log('manifest:', 'docs/v2/manifest.json');
#!/usr/bin/env node
// V2 Card indexer (spec v0.09): scans repo for JSON/.sAtd/PNG cards and builds docs/v2/manifest.json
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT = process.cwd();
const TARGETS = [
  'docs/V2card',
  'docs/v2',
  'IZAKAYA verse',
  'IZAKAYAライト'
];

function exists(p){ try{ fs.accessSync(p); return true; }catch{ return false; } }
function isDir(p){ try{ return fs.statSync(p).isDirectory(); }catch{ return false; } }
function readText(p){ return fs.readFileSync(p, 'utf8'); }
function writeJSON(p, obj){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

function walk(dir){
  const out = [];
  const stack = [dir];
  while(stack.length){
    const d = stack.pop();
    let ents = [];
    try{ ents = fs.readdirSync(d, {withFileTypes:true}); }catch{ continue; }
    for(const e of ents){
      const p = path.join(d, e.name);
      if(e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function parseLooseJson(txt){
  try{ return JSON.parse(txt); }catch{}
  const a = txt.indexOf('{'); const b = txt.lastIndexOf('}');
  if(a!==-1 && b!==-1 && b>a){
    try{ return JSON.parse(txt.slice(a, b+1)); }catch{}
  }
  return null;
}

function inflate(buf){ try{ return zlib.inflateSync(buf); }catch{ return null; } }

function parsePngForJson(filePath){
  let buf; try{ buf = fs.readFileSync(filePath); }catch{ return {error:'E_READ'}; }
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  if(buf.length<8 || !buf.slice(0,8).equals(sig)) return {error:'E_NOT_PNG'};
  const texts = []; // {kw, text}
  let p=8;
  while(p+8 <= buf.length){
    const len = buf.readUInt32BE(p); p+=4;
    const type = buf.slice(p,p+4).toString('latin1'); p+=4;
    const data = buf.slice(p,p+len); p+=len; p+=4; // skip CRC
    if(type==='tEXt'){
      const nul = data.indexOf(0);
      const kw = nul>=0? data.slice(0,nul).toString('latin1'): '';
      const text = (nul>=0? data.slice(nul+1): data).toString('latin1');
      texts.push({kw, text});
    } else if(type==='iTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++; // keyword
      const kw = data.slice(0,q).toString('latin1');
      const compressionFlag = data[q+1]; const compressionMethod = data[q+2];
      q+=3; while(q<data.length && data[q]!==0) q++; q++; // languageTag\0
      while(q<data.length && data[q]!==0) q++; q++; // translatedKeyword\0
      let textBytes = data.slice(q);
      if(compressionFlag===1 && compressionMethod===0){
        const inf = inflate(textBytes); if(inf) texts.push({kw, text: inf.toString('utf8')});
      } else { texts.push({kw, text: textBytes.toString('utf8')}); }
    } else if(type==='zTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++; const kw = data.slice(0,q).toString('latin1'); q++;
      const comp = data.slice(q);
      const inf = inflate(comp); if(inf) texts.push({kw, text: inf.toString('utf8')});
    }
    if(type==='IEND') break;
  }
  const chara = texts.filter(t => (t.kw||'').toLowerCase()==='chara');
  const ordered = chara.length ? [chara[chara.length-1]] : texts;
  for(const t of ordered){ const obj = parseLooseJson(t.text); if(obj) return {obj}; }
  return {error:'E_PNG_EXTRACT'};
}

// Normalization per unified spec
function pickFirstMes(o){ return o?.data?.first_mes ?? o?.spec?.first_mes ?? o?.card?.first_mes ?? o?.first_mes ?? ''; }
function pickName(o){ return o?.name ?? o?.character ?? o?.title ?? o?.data?.name ?? ''; }
function pickBehavior(o){ return o?.description ?? o?.system_prompt ?? o?.behavior ?? o?.data?.description ?? ''; }
function pickLinks(o){ return Array.isArray(o?.links) ? o.links : (Array.isArray(o?.data?.links) ? o.data.links : []); }

const results = [];
const errors = [];

for(const t of TARGETS){
  const abs = path.join(ROOT, t);
  if(!exists(abs) || !isDir(abs)) continue;
  for(const fp of walk(abs)){
    const ext = path.extname(fp).toLowerCase();
    if(!['.json','.satd','.png'].includes(ext)) continue;
    let obj=null, type='';
    try{
      if(ext==='.png') { const r = parsePngForJson(fp); if(r.error){ errors.push({path:fp,error:r.error}); continue; } obj = r.obj; type='png'; }
      else { const txt = readText(fp); obj = parseLooseJson(txt); type = (ext==='.satd'?'sAtd':'json'); if(!obj) { errors.push({path:fp,error:'E_PARSE'}); continue; } }
    }catch(e){ errors.push({path:fp, error:String(e)}); continue; }
    const name = pickName(obj);
    const first_mes = pickFirstMes(obj);
    const behavior = pickBehavior(obj);
    const links = pickLinks(obj);
    const id = obj.id || (name ? 'v2_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') : '');
    results.push({ path: fp, type, id, name, first_mes, behavior, linksCount: Array.isArray(links)? links.length:0 });
  }
}

const out = { generatedAt: new Date().toISOString(), count: results.length, items: results, errors };
writeJSON(path.join(ROOT, 'docs/v2/manifest.json'), out);
console.log(`[v2-indexer] scanned: ${results.length} items, errors: ${errors.length}`);
console.log('manifest:', 'docs/v2/manifest.json');

