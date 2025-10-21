(()=>{
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Unified spec endpoints (override-able via window.V2_PATHS)
  const V2_PATHS = Object.assign({
    list: '/api/v2/cards',
    detail: id => `/api/v2/cards/${id}`,
    savePut: id => `/api/v2/cards/${id}`,
    savePost: '/api/v2/cards'
  }, (window.V2_PATHS||{}));

  const ui = {
    baseUrl: $('#baseUrl'), status: $('#status'),
    btnFindLoad: $('#btnFindLoad'), btnReload: $('#btnReload'), btnNew: $('#btnNew'),
    list: $('#cards'),
    btnSave: $('#btnSave'), btnImport: $('#btnImport'), btnExport: $('#btnExport'), fileImport: $('#fileImport'),
    id: $('#card_id'), name: $('#card_name'), icon: $('#card_icon'),
    prompt: $('#card_prompt'), behavior: $('#card_behavior'), links: $('#card_links'),
    raw: $('#card_raw'),
    desc: $('#card_description'), scenario: $('#card_scenario'), firstmes: $('#card_firstmes'),
    tags: $('#card_tags'), talk: $('#card_talk'), fav: $('#card_fav'),
    bookWrap: $('#book_entries'), btnAddBook: $('#btnAddBook')
  };

  let foundListPath='';
  let cacheList=[]; let current=null; let bookEntries=[];
  let previewUrl='';
  const PLACEHOLDER_SVG =
    'data:image/svg+xml;utf8,'+
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#e2e8f0"/>
            <stop offset="1" stop-color="#f8fafc"/>
          </linearGradient>
        </defs>
        <rect fill="url(#g)" x="0" y="0" width="600" height="900"/>
        <g fill="#94a3b8">
          <circle cx="300" cy="360" r="80"/>
          <rect x="160" y="500" width="280" height="180" rx="18"/>
        </g>
        <text x="300" y="740" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Noto Sans JP" font-size="24" text-anchor="middle" fill="#64748b">No Image</text>
      </svg>`
    );
  let tui=null; // image editor instance
  let cropper=null; // simple editor instance

  function setStatus(s){ if(ui.status) ui.status.textContent=s; }
  function getBase(){ return (ui.baseUrl?.value || 'http://localhost:8787').replace(/\/$/,''); }
  function toUrl(p){ return getBase()+p; }

  async function tryFetchJson(url, opts){
    const res = await fetch(url, { ...opts, headers:{'content-type':'application/json', ...(opts?.headers||{})} });
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if(res.status===204) return null; return await res.json();
  }

  async function findListEndpoint(){
    foundListPath = V2_PATHS.list;
    await tryFetchJson(toUrl(foundListPath));
    setStatus(`list: ${foundListPath}`);
    return foundListPath;
  }

  // spec normalization helpers
  const pickName = o => o?.name ?? o?.character ?? o?.title ?? o?.data?.name ?? '';
  const pickFirstMes = o => o?.data?.first_mes ?? o?.spec?.first_mes ?? o?.card?.first_mes ?? o?.first_mes ?? '';
  const pickBehavior = o => o?.description ?? o?.system_prompt ?? o?.behavior ?? o?.data?.description ?? '';
  const pickLinks = o => (Array.isArray(o?.links)?o.links:(Array.isArray(o?.data?.links)?o.data.links:[]));

  // --- Mojibake fixer (latin1-UTF8 double decoding) ---
  const hasMojibake = (s)=> /[ÃÂ]/.test(s) || /[\u00C0-\u00FF]/.test(s) && !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(s);
  function fixMojibakeString(s){
    if(typeof s!== 'string' || !hasMojibake(s)) return s;
    const bytes = new Uint8Array(Array.from(s, c => c.charCodeAt(0) & 0xFF));
    try{ return new TextDecoder('utf-8').decode(bytes); }catch{ return s; }
  }
  function deepFixMojibake(x){
    if(Array.isArray(x)) return x.map(deepFixMojibake);
    if(x && typeof x==='object'){ for(const k in x){ x[k]=deepFixMojibake(x[k]); } return x; }
    return fixMojibakeString(x);
  }

  function validateInternal(o){
    const errs=[]; if(!o||typeof o!=='object') return ['E_PARSE'];
    if(!o.id || typeof o.id!=='string') errs.push('E_REQUIRED:id');
    if(!o.name || typeof o.name!=='string') errs.push('E_REQUIRED:name');
    if(o.links){
      if(!Array.isArray(o.links)) errs.push('E_TYPE:links');
      else for(const [i,it] of o.links.entries()){
        if(!it||typeof it!=='object'){ errs.push(`E_TYPE:links[${i}]`); continue; }
        if(typeof it.title!=='string') errs.push(`E_REQUIRED:links[${i}].title`);
        if(typeof it.url!=='string') errs.push(`E_REQUIRED:links[${i}].url`);
        else { try{ new URL(it.url); }catch{ errs.push(`E_URL:links[${i}].url`); } }
      }
    }
    return errs;
  }

  function renderList(items){
    if(!ui.list) return; ui.list.innerHTML='';
    items.forEach(c=>{
      const li=document.createElement('li');
      const icon=c.icon||c?.meta?.icon||'🃏';
      li.innerHTML=`<span style="font-size:18px">${icon}</span><span>${c.name||c.title||'(no name)'}</span> <span class="id">${c.id||''}</span>`;
      li.onclick=()=>loadCard(c.id);
      ui.list.appendChild(li);
    });
  }

  function renderBook(){
    if(!ui.bookWrap) return; ui.bookWrap.innerHTML='';
    bookEntries.forEach((e,idx)=>{
      const wrap=document.createElement('div'); wrap.className='book-entry';
      wrap.innerHTML=`<div class="head"><strong>Entry #${idx}</strong> <button type="button" class="remove">Remove</button></div>
      <div class="row"><label>Comment</label><input type="text" value="${(e.comment||'').replaceAll('"','&quot;')}"></div>
      <div class="row"><label>Content</label><textarea rows="6">${e.content||''}</textarea></div>`;
      const [inp,ta]=wrap.querySelectorAll('input,textarea');
      wrap.querySelector('.remove').onclick=()=>{ bookEntries.splice(idx,1); renderBook(); };
      inp.oninput=()=>{ e.comment=inp.value; }; ta.oninput=()=>{ e.content=ta.value; };
      ui.bookWrap.appendChild(wrap);
    });
  }

  function fillForm(obj){
    current = obj||{};
    if(ui.id) ui.id.value=current.id||'';
    if(ui.name) ui.name.value=pickName(current);
    if(ui.icon) ui.icon.value=current.icon||current?.meta?.icon||'';
    if(ui.prompt) ui.prompt.value=current.prompt||pickFirstMes(current)||current?.meta?.prompt||'';
    if(ui.behavior) ui.behavior.value=current.behavior||pickBehavior(current);
    if(ui.links){ try{ ui.links.value=JSON.stringify(pickLinks(current),null,2);}catch{ ui.links.value='[]'; } }
    if(ui.desc) ui.desc.value=current.description||current?.data?.description||'';
    if(ui.scenario) ui.scenario.value=current.scenario||'';
    if(ui.firstmes) ui.firstmes.value=current.first_mes||'';
    if(ui.tags){ const t=current.tags||current?.data?.tags||[]; ui.tags.value=Array.isArray(t)?t.join(', '):String(t||''); }
    if(ui.talk){ const talk=current.talkativeness ?? current?.extensions?.talkativeness ?? current?.data?.extensions?.talkativeness; ui.talk.value=(talk??0.5); }
    if(ui.fav) ui.fav.checked=Boolean(current.fav ?? current?.extensions?.fav ?? false);
    bookEntries = (current.character_book?.entries || current?.data?.character_book?.entries || []).map(e=>({ id:e.id??null, comment:e.comment||'', content:e.content||'' }));
    renderBook();
    if(ui.raw){ try{ ui.raw.value=JSON.stringify(current,null,2);}catch{ ui.raw.value=''; } }
  }

  function readForm(){
    let obj=null; const raw=ui.raw?.value?.trim(); if(raw){ try{ obj=JSON.parse(raw);}catch{} }
    if(!obj) obj={};
    obj.id = (ui.id?.value||'').trim() || obj.id;
    obj.name = (ui.name?.value||'').trim() || obj.name;
    const ic=(ui.icon?.value||'').trim(); if(ic) obj.icon=ic;
    const fm=(ui.prompt?.value||''); if(fm){ obj.first_mes=fm; obj.prompt=fm; }
    const beh=(ui.behavior?.value||''); if(beh){ obj.behavior=beh; obj.description=obj.description||beh; }
    try{ const ll=JSON.parse(ui.links?.value||'[]'); if(Array.isArray(ll)) obj.links=ll; }catch{}
    // v3-like extras for export
    const desc=ui.desc?.value; if(desc) obj.description=desc;
    const scen=ui.scenario?.value; if(scen) obj.scenario=scen;
    const fms=ui.firstmes?.value; if(fms) obj.first_mes=fms;
    const tags=(ui.tags?.value||'').split(',').map(s=>s.trim()).filter(Boolean); if(tags.length) obj.tags=tags;
    const talk=parseFloat(ui.talk?.value||''); if(!Number.isNaN(talk)) obj.talkativeness=talk;
    obj.fav=!!ui.fav?.checked;
    return obj;
  }

  // --- PNG iTXt embed (keyword='chara', UTF-8, compressionFlag=0) ---
  function crc32(buf){ // simple CRC32
    let c=~0; for(let i=0;i<buf.length;i++){ c ^= buf[i]; for(let k=0;k<8;k++){ c = (c>>>1) ^ (0xEDB88320 & -(c & 1)); } } return ~c >>> 0;
  }
  function stringToBytes(s){ return new TextEncoder().encode(s); }
  async function embedITXtChara(pngBlob, jsonText){
    const png = new Uint8Array(await pngBlob.arrayBuffer());
    const sig = [137,80,78,71,13,10,26,10];
    if(png.length<8 || !sig.every((v,i)=>png[i]===v)) throw new Error('Not a PNG');
    let p=8; const chunks=[];
    while(p+8<=png.length){
      const len=(png[p]<<24)|(png[p+1]<<16)|(png[p+2]<<8)|png[p+3]; p+=4;
      const type=String.fromCharCode(png[p],png[p+1],png[p+2],png[p+3]); p+=4;
      const data=png.slice(p,p+len); p+=len; const crc=png.slice(p,p+4); p+=4;
      // skip existing 'chara' iTXt/zTXt
      if(type==='iTXt' || type==='zTXt'){
        // keyword until NUL
        let q=0; while(q<data.length && data[q]!==0) q++;
        const kw = new TextDecoder('latin1').decode(data.slice(0,q)).toLowerCase();
        if(kw==='chara') continue;
      }
      if(type==='IEND'){ // insert new iTXt before IEND
        const keyword = stringToBytes('chara');
        const nul = new Uint8Array([0]);
        const compressionFlag = new Uint8Array([0]);
        const compressionMethod = new Uint8Array([0]);
        const languageTag = new Uint8Array([0]);
        const translatedKeyword = new Uint8Array([0]);
        const text = stringToBytes(jsonText);
        const payload = new Uint8Array(keyword.length + 1 + 1 + 1 + 1 + 1 + text.length);
        let o=0;
        payload.set(keyword, o); o+=keyword.length; payload.set(nul, o++);
        payload.set(compressionFlag, o++); payload.set(compressionMethod, o++);
        payload.set(languageTag, o++); payload.set(translatedKeyword, o++);
        payload.set(text, o); // no compression
        const typeBytes = stringToBytes('iTXt');
        const lenBytes = new Uint8Array([ (payload.length>>>24)&255, (payload.length>>>16)&255, (payload.length>>>8)&255, payload.length&255 ]);
        const crcBuf = new Uint8Array(typeBytes.length + payload.length); crcBuf.set(typeBytes,0); crcBuf.set(payload,typeBytes.length);
        const crcVal = crc32(crcBuf);
        const crcBytes = new Uint8Array([ (crcVal>>>24)&255, (crcVal>>>16)&255, (crcVal>>>8)&255, crcVal&255 ]);
        // push new iTXt
        chunks.push(lenBytes, typeBytes, payload, crcBytes);
      }
      // push original chunk
      const lenBytes = new Uint8Array([ (data.length>>>24)&255, (data.length>>>16)&255, (data.length>>>8)&255, data.length&255 ]);
      const typeBytes = stringToBytes(type);
      chunks.push(lenBytes, typeBytes, data, crc);
    }
    // assemble
    const outLen = 8 + chunks.reduce((a,b)=>a+b.length,0);
    const out = new Uint8Array(outLen); out.set(sig,0);
    let o=8; for(const part of chunks){ out.set(part,o); o+=part.length; }
    return new Blob([out], {type:'image/png'});
  }

  function buildCharaCardV3(){
    const o=readForm(); const now=new Date();
    return {
      name:o.name||'', description:o.description||o.prompt||'', personality:o.personality||'',
      scenario:o.scenario||'', first_mes:o.first_mes||'', mes_example:o.mes_example||'<START>',
      creatorcomment:o.creatorcomment||'', avatar:o.avatar||'none', chat:o.chat||'',
      talkativeness:o.talkativeness??0.5, fav:!!o.fav, spec:'chara_card_v3', spec_version:'3.0',
      data:{ name:o.name||'', description:o.description||o.prompt||'', personality:o.personality||'',
        scenario:o.scenario||'', first_mes:o.first_mes||'', mes_example:o.mes_example||'<START>',
        creator_notes:o.creator_notes||'', system_prompt:o.system_prompt||'', post_history_instructions:o.post_history_instructions||'',
        tags:Array.isArray(o.tags)?o.tags:[], creator:o.creator||'', character_version:o.character_version||'', alternate_greetings:o.alternate_greetings||[],
        extensions:{ talkativeness:o.talkativeness??0.5, fav:!!o.fav, world:o.world||'', depth_prompt:{prompt:o.prompt||'',depth:4,role:'system'} },
        character_book:{ entries: bookEntries.map((e,i)=>({ id:e.id??i, keys:[], secondary_keys:[], comment:e.comment||'', content:e.content||'', constant:false, selective:true, insertion_order:100, enabled:true, position:'before_char', use_regex:true, extensions:{ position:0, exclude_recursion:false, display_index:i, probability:100, useProbability:true, depth:4, selectiveLogic:0, group:'', group_override:false, group_weight:100, prevent_recursion:false, delay_until_recursion:false, scan_depth:null, match_whole_words:null, use_group_scoring:false, case_sensitive:null, automation_id:'', role:0, vectorized:false, sticky:0, cooldown:0, delay:0 } })), name:o.book_name||'' },
        group_only_greetings:[] },
      create_date:o.create_date||now.toISOString(), tags:Array.isArray(o.tags)?o.tags:[]
    };
  }

  function parseLooseJson(txt){ try{ return JSON.parse(txt);}catch{} const a=txt.indexOf('{'), b=txt.lastIndexOf('}'); if(a!==-1&&b!==-1&&b>a){ try{ return JSON.parse(txt.slice(a,b+1)); }catch{} } return null; }

  async function extractJsonFromPng(file){
    const buf=new Uint8Array(await file.arrayBuffer());
    const SIG=[137,80,78,71,13,10,26,10]; for(let i=0;i<8;i++){ if(buf[i]!==SIG[i]) throw new Error('Not a PNG'); }
    const tdLatin=new TextDecoder('latin1'), tdUtf8=new TextDecoder('utf-8');
    const texts=[]; let p=8;
    const inflateBytes = async (bytes)=>{
      // Prefer pako (works in all browsers), fallback to DecompressionStream
      if(window.pako){
        try{ const out = window.pako.inflate(bytes); return (out instanceof Uint8Array)? out : new Uint8Array(out); }catch{}
      }
      if('DecompressionStream' in window){
        try{ const ds=new DecompressionStream('deflate'); const stream=new Blob([bytes]).stream().pipeThrough(ds); const ab=await new Response(stream).arrayBuffer(); return new Uint8Array(ab); }catch{}
      }
      return null;
    };
    while(p+8<=buf.length){
      const len=(buf[p]<<24)|(buf[p+1]<<16)|(buf[p+2]<<8)|buf[p+3]; p+=4;
      const type=String.fromCharCode(buf[p],buf[p+1],buf[p+2],buf[p+3]); p+=4;
      const data=buf.slice(p,p+len); p+=len; p+=4;
      if(type==='tEXt'){
        // keyword (latin1) NUL text(latin1). 一部ツールはUTF-8をtEXtに入れることがあるのでバイトも保持
        let q=0; while(q<data.length && data[q]!==0) q++;
        const kw = tdLatin.decode(data.slice(0,q));
        const textBytes = data.slice(q+1);
        const textLatin = tdLatin.decode(textBytes);
        texts.push({kw, text: textLatin, bytes: textBytes});
      } else if(type==='iTXt'){
        let q=0; while(q<data.length && data[q]!==0) q++; const kw=tdLatin.decode(data.slice(0,q)); const compressionFlag=data[q+1], compressionMethod=data[q+2]; q+=3; while(q<data.length && data[q]!==0) q++; q++; while(q<data.length && data[q]!==0) q++; q++; let textBytes=data.slice(q);
        if(compressionFlag===1 && compressionMethod===0){ const out = await inflateBytes(textBytes); if(out) texts.push({kw,text:tdUtf8.decode(out), bytes: out}); }
        else { texts.push({kw,text:tdUtf8.decode(textBytes), bytes: textBytes}); }
      } else if(type==='zTXt'){
        let q=0; while(q<data.length && data[q]!==0) q++; const kw=tdLatin.decode(data.slice(0,q)); q++; const comp=data.slice(q);
        const out = await inflateBytes(comp); if(out) texts.push({kw,text:tdUtf8.decode(out), bytes: out});
      }
      if(type==='IEND') break;
    }
    const KEYWORDS=['chara','chara_card','chara_card_v2','chara_card_v3','json','ai_character'];
    const hits = texts.filter(t=> KEYWORDS.includes((t.kw||'').toLowerCase()));
    const ordered = hits.length ? [hits[hits.length-1]] : texts;
    // Try JSON parse; if fails, try base64 decode then parse
    for(const t of ordered){
      let obj=parseLooseJson(t.text);
      // 失敗時は bytes を UTF-8 として再解釈（tEXtでUTF-8を突っ込まれているケース）
      if(!obj && t.bytes){ try{ obj = parseLooseJson(tdUtf8.decode(t.bytes)); }catch{} }
      // さらにmojibake修復を試す
      if(!obj){ const fixed = fixMojibakeString(t.text); if(fixed && fixed!==t.text){ obj = parseLooseJson(fixed); } }
      if(!obj){
        const b64 = (t.text||'').replace(/\s+/g,'');
        if(/^[A-Za-z0-9+/=]+$/.test(b64) && b64.length>64){
          try{ const decoded = atob(b64); obj = parseLooseJson(decoded); }catch{}
        }
      }
      if(obj) return obj;
    }
    throw new Error('E_PNG_EXTRACT');
  }

  async function loadList(){
    if(!foundListPath) await findListEndpoint(); setStatus('loading...');
    const data=await tryFetchJson(toUrl(foundListPath)); cacheList = Array.isArray(data)?data:(data?.items||[]);
    renderList(cacheList); setStatus(`items: ${cacheList.length}`);
  }

  async function loadCard(id){ if(!id) return; setStatus(`loading ${id}...`);
    let detail=null; try{ detail=await tryFetchJson(toUrl(V2_PATHS.detail(id))); }catch{}
    if(!detail) detail = cacheList.find(x=>x.id===id) || {id};
    fillForm(detail); setStatus(`loaded ${id}`);
  }

  async function saveCurrent(){
    const obj=readForm(); if(!obj.id){ alert('ID is required'); return; }
    const errs=validateInternal(obj); if(errs.length){ setStatus('E_REQUIRED'); alert('Validation failed: '+errs.join(', ')); return; }
    setStatus('saving...'); ui.btnSave.disabled=true; let saved=false, errLast='';
    const attempts=[{m:'PUT',p:V2_PATHS.savePut(obj.id)},{m:'POST',p:V2_PATHS.savePost}];
    for(const cand of attempts){ try{ const res=await fetch(toUrl(cand.p),{method:cand.m,headers:{'content-type':'application/json'},body:JSON.stringify(obj)}); if(res.ok){ saved=true; break; } errLast=`${res.status} ${res.statusText}`; }catch(e){ errLast=String(e); } }
    ui.btnSave.disabled=false; if(saved){ setStatus('saved'); await loadList(); await loadCard(obj.id); } else { setStatus(errLast||'E_SAVE'); alert('Save failed: '+(errLast||'E_SAVE')); }
  }

  function exportCurrent(){ const o=readForm(); const blob=new Blob([JSON.stringify(o,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${o.id||'card'}.json`; a.click(); URL.revokeObjectURL(a.href); setStatus('exported'); }
  function exportCurrentV3(){ const v3=buildCharaCardV3(); const safe=(v3.name||'card').replace(/\s+/g,'_'); const blob=new Blob([JSON.stringify(v3,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${safe}.json`; a.click(); URL.revokeObjectURL(a.href); setStatus('exported v3'); }

  function importFromFile(){ ui.fileImport?.click(); }
  ui.fileImport?.addEventListener('change', async (e)=>{
    const f=e.target.files && e.target.files[0]; if(!f) return; await processFile(f); ui.fileImport.value='';
  });

  // Drag & Drop handling + preview updates
  async function processFile(file){
    try{
      let obj=null;
      const isPng=((file.type||'').includes('png')||/\.png$/i.test(file.name));
      const img=$('#card_preview');
      if(isPng){
        obj=await extractJsonFromPng(file);
        if(previewUrl){ try{ URL.revokeObjectURL(previewUrl); }catch{} }
        previewUrl = URL.createObjectURL(file);
        if(img){ img.src=previewUrl; img.style.display='block'; }
      } else if(/\.sAtd$/i.test(file.name)) {
        const txt=await file.text(); obj=parseLooseJson(txt);
        // no image in this case; keep existing or show placeholder
        if(img && !previewUrl){ img.src = PLACEHOLDER_SVG; img.style.display='block'; }
      } else {
        const txt=await file.text(); obj=parseLooseJson(txt);
        if(img && !previewUrl){ img.src = PLACEHOLDER_SVG; img.style.display='block'; }
      }
      if(!obj) throw new Error('E_PARSE');
      obj = deepFixMojibake(obj);
      fillForm(obj);
      // prompt preview
      const pv=$('#prompt_preview'); if(pv){ const p = obj.first_mes || pickFirstMes(obj) || ''; pv.textContent=p; pv.style.display=p? 'block':'none'; }
      setStatus('imported');
    }catch(err){ setStatus(err.message||'E_PARSE'); alert('Import failed: '+(err.message||'E_PARSE')); }
  }

  (function setupDropzone(){
    const dz=$('#dropzone'); if(!dz) return;
    const picker=()=>ui.fileImport?.click();
    dz.addEventListener('click', picker);
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
    dz.addEventListener('drop', async e=>{ e.preventDefault(); dz.classList.remove('drag'); const f=e.dataTransfer?.files?.[0]; if(!f) return; await processFile(f); });
  })();

  // --- Image Editor (Toast UI) integration ---
  async function openImageEditor(){
    const modal = document.getElementById('imgEditorModal');
    const cont = document.getElementById('imgEditor');
    if(!modal || !cont) return;
    modal.style.display='flex';
    cont.innerHTML='';
    const imageUrl = previewUrl || (document.getElementById('card_preview')?.src)||'';
    tui = new window.tui.ImageEditor(cont, {
      includeUI: {
        loadImage: { path: imageUrl || '', name: 'card' },
        theme: {},
        menu: ['crop','flip','rotate','draw','shape','icon','text','mask','filter'],
        initMenu: 'crop',
        uiSize: { width: '100%', height: '100%' },
        menuBarPosition: 'bottom'
      },
      cssMaxWidth: 1000, cssMaxHeight: 800, selectionStyle:{cornerSize:8, rotatingPointOffset:20}
    });
  }
  document.getElementById('card_preview')?.addEventListener('dblclick', openImageEditor);
  document.getElementById('btnImgCancel')?.addEventListener('click', ()=>{
    document.getElementById('imgEditorModal').style.display='none';
    try{ tui?.destroy(); }catch{} tui=null;
  });
  document.getElementById('btnImgApply')?.addEventListener('click', async ()=>{
    try{
      if(!tui){ return; }
      const dataUrl = tui.toDataURL({ format:'png' });
      const res = await fetch(dataUrl); const editedBlob = await res.blob();
      // embed current JSON into PNG as iTXt 'chara'
      const jsonObj = readForm();
      const normalized = {
        id: jsonObj.id || '',
        name: jsonObj.name || '',
        first_mes: jsonObj.first_mes || jsonObj.prompt || '',
        behavior: jsonObj.description || jsonObj.behavior || '',
        links: jsonObj.links || [],
        icon: jsonObj.icon || '🃏'
      };
      const pngWithJson = await embedITXtChara(editedBlob, JSON.stringify(normalized));
      if(previewUrl){ try{ URL.revokeObjectURL(previewUrl);}catch{} }
      previewUrl = URL.createObjectURL(pngWithJson);
      const img = document.getElementById('card_preview'); if(img){ img.src = previewUrl; img.style.display='block'; }
      // Offer download
      const a=document.createElement('a'); a.href=previewUrl; a.download=(normalized.id || 'card') + '.png'; a.click();
      // Close modal
      document.getElementById('imgEditorModal').style.display='none';
    }catch(e){ alert('Image apply failed: ' + e); }
    finally{ try{ tui?.destroy(); }catch{} tui=null; }
  });

  // --- Simple editor (Cropper.js) ---
  function openSimpleEditor(){
    const modal = document.getElementById('cropModal');
    const img = document.getElementById('cropImg');
    if(!modal || !img) return;
    modal.style.display='flex';
    const src = previewUrl || document.getElementById('card_preview')?.src || '';
    img.onload = ()=>{
      try{ cropper?.destroy(); }catch{}
      cropper = new window.Cropper(img, {
        aspectRatio: 2/3, // 400x600
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        movable: true,
        scalable: false,
        zoomable: true,
        rotatable: false,
        responsive: true,
        background: false
      });
    };
    img.src = src || PLACEHOLDER_SVG;
  }
  document.getElementById('btnSimpleEdit')?.addEventListener('click', openSimpleEditor);
  document.getElementById('btnCropCancel')?.addEventListener('click', ()=>{
    document.getElementById('cropModal').style.display='none';
    try{ cropper?.destroy(); }catch{} cropper=null;
  });
  document.getElementById('btnCropApply')?.addEventListener('click', async ()=>{
    try{
      if(!cropper){ return; }
      const canvas = cropper.getCroppedCanvas({ width:400, height:600, imageSmoothingQuality:'high' });
      const editedBlob = await new Promise(res=> canvas.toBlob(b=>res(b),'image/png',0.92));
      const jsonObj = readForm();
      const normalized = {
        id: jsonObj.id || '',
        name: jsonObj.name || '',
        first_mes: jsonObj.first_mes || jsonObj.prompt || '',
        behavior: jsonObj.description || jsonObj.behavior || '',
        links: jsonObj.links || [],
        icon: jsonObj.icon || '🃏'
      };
      const pngWithJson = await embedITXtChara(editedBlob, JSON.stringify(normalized));
      if(previewUrl){ try{ URL.revokeObjectURL(previewUrl);}catch{} }
      previewUrl = URL.createObjectURL(pngWithJson);
      const pvImg = document.getElementById('card_preview'); if(pvImg){ pvImg.src = previewUrl; pvImg.style.display='block'; }
      const a=document.createElement('a'); a.href=previewUrl; a.download=(normalized.id || 'card') + '.png'; a.click();
      document.getElementById('cropModal').style.display='none';
    }catch(e){ alert('Simple edit apply failed: ' + e); }
    finally{ try{ cropper?.destroy(); }catch{} cropper=null; }
  });

  // wire
  ui.btnFindLoad?.addEventListener('click', loadList);
  ui.btnReload?.addEventListener('click', loadList);
  ui.btnNew?.addEventListener('click', ()=>{ current=null; bookEntries=[]; fillForm({id:'',name:'',icon:'',prompt:''}); setStatus('new'); });
  ui.btnSave?.addEventListener('click', saveCurrent);
  ui.btnExport?.addEventListener('click', exportCurrent);
  ui.btnImport?.addEventListener('click', importFromFile);
  ui.btnAddBook?.addEventListener('click', ()=>{ bookEntries.push({comment:'',content:''}); renderBook(); });
  (function addV3Btn(){ const tools=document.querySelector('.editor-pane .tools'); if(!tools) return; const btn=document.createElement('button'); btn.textContent='Export v3 (chara_card_v3)'; btn.type='button'; btn.onclick=exportCurrentV3; tools.insertBefore(btn, ui.btnSave); })();

  // restore
  if(ui.baseUrl){ const base0=localStorage.getItem('v2ce:base'); if(base0){ try{ ui.baseUrl.value=JSON.parse(base0);}catch{} } ui.baseUrl.addEventListener('change',()=>localStorage.setItem('v2ce:base', JSON.stringify(ui.baseUrl.value))); }
  // default placeholder image
  const img0 = document.getElementById('card_preview');
  if(img0){ img0.src = PLACEHOLDER_SVG; img0.style.display='block'; }
})();
