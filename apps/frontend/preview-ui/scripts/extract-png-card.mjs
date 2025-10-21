#!/usr/bin/env node
// Extract embedded JSON from a PNG (tEXt/iTXt/zTXt) per unified V2 spec.
// Usage: node scripts/extract-png-card.mjs <path/to/card.png> [--raw]
// Prints JSON to stdout. Exits 1 on failure.
import fs from 'fs';
import zlib from 'zlib';

function parseLooseJson(txt){
  try{ return JSON.parse(txt); }catch{}
  const a = txt.indexOf('{'); const b = txt.lastIndexOf('}');
  if(a!==-1 && b!==-1 && b>a){ try{ return JSON.parse(txt.slice(a,b+1)); }catch{} }
  return null;
}

function inflate(buf){ try{ return zlib.inflateSync(buf); }catch{ return null; } }

function extractFromPng(filePath){
  const buf = fs.readFileSync(filePath);
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  if(buf.length<8 || !buf.slice(0,8).equals(sig)) throw new Error('Not a PNG');
  const texts = []; // {kw,text}
  let p=8;
  while(p+8 <= buf.length){
    const len = buf.readUInt32BE(p); p+=4;
    const type = buf.slice(p,p+4).toString('latin1'); p+=4;
    const data = buf.slice(p,p+len); p+=len; p+=4; // skip CRC
    if(type==='tEXt'){
      const nul = data.indexOf(0);
      const kw = nul>=0? data.slice(0,nul).toString('latin1'): '';
      const text = (nul>=0? data.slice(nul+1): data).toString('latin1');
      texts.push({kw,text});
    } else if(type==='iTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++;
      const kw = data.slice(0,q).toString('latin1');
      const compressionFlag = data[q+1]; const compressionMethod = data[q+2];
      q+=3; while(q<data.length && data[q]!==0) q++; q++;
      while(q<data.length && data[q]!==0) q++; q++;
      let textBytes = data.slice(q);
      if(compressionFlag===1 && compressionMethod===0){
        const inf = inflate(textBytes); if(inf) texts.push({kw, text: inf.toString('utf8')});
      } else { texts.push({kw, text: textBytes.toString('utf8')}); }
    } else if(type==='zTXt'){
      let q=0; while(q<data.length && data[q]!==0) q++;
      const kw = data.slice(0,q).toString('latin1'); q++;
      const comp = data.slice(q);
      const inf = inflate(comp); if(inf) texts.push({kw, text: inf.toString('utf8')});
    }
    if(type==='IEND') break;
  }
  const chara = texts.filter(t => (t.kw||'').toLowerCase()==='chara');
  const ordered = chara.length ? [chara[chara.length-1]] : texts;
  for(const t of ordered){ const obj = parseLooseJson(t.text); if(obj) return {obj, raw:t.text}; }
  throw new Error('E_PNG_EXTRACT');
}

const file = process.argv[2];
if(!file){ console.error('Usage: node scripts/extract-png-card.mjs <card.png> [--raw]'); process.exit(1); }
try{
  const {obj, raw} = extractFromPng(file);
  if(process.argv.includes('--raw')){ process.stdout.write(raw); }
  else { process.stdout.write(JSON.stringify(obj, null, 2)); }
}catch(e){ console.error(String(e.message||e)); process.exit(1); }

