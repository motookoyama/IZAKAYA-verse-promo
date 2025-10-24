(()=>{
  const $ = s => document.querySelector(s);
  const toasts = $('#toasts');
  function showToast(msg, kind='ok'){ if(!toasts) return; const el=document.createElement('div'); el.className=`toast ${kind}`; el.textContent=msg; toasts.appendChild(el); setTimeout(()=>{ el.remove(); }, 3000); }

  // Theme switcher
  function setTheme(name){
    const link = document.getElementById('theme-link'); if(!link) return;
    link.href = `./themes/${name}.css`;
    localStorage.setItem('izkz:theme', name);
    showToast(`Theme: ${name}`);
  }
  const pick = $('#themePick');
  pick?.addEventListener('change', e=> setTheme(e.target.value));
  // Apply from URL (?theme=dark) or saved
  const urlParams = new URLSearchParams(location.search);
  const qTheme = urlParams.get('theme');
  const saved = localStorage.getItem('izkz:theme');
  const initial = qTheme || saved || (pick?.value || 'dark');
  if(pick){ pick.value = initial; }
  setTheme(initial);

  // Dropzone
  const dz = $('#drop'); const picker = $('#picker'); const img=$('#prevImg'); const pre=$('#prevTxt');
  const pick = ()=> picker?.click();
  async function handleFile(f){
    try{
      if(f.type.startsWith('image/')){ const url=URL.createObjectURL(f); if(img){ img.src=url; } }
      const txt = await f.text().catch(()=> null);
      if(pre){ pre.textContent = txt ? txt.slice(0,800) : '(binary)'; }
      showToast('Loaded file');
    }catch(e){ showToast('Failed: '+e, 'error'); }
  }
  picker?.addEventListener('change', e=>{ const f=e.target.files&&e.target.files[0]; if(f) handleFile(f); e.target.value=''; });
  dz?.addEventListener('click', pick);
  dz?.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
  dz?.addEventListener('dragleave', ()=> dz.classList.remove('drag'));
  dz?.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); const f=e.dataTransfer?.files?.[0]; if(f) handleFile(f); });

  // Expose helpers
  window.IZKZ_UI = { showToast, setTheme };
  // Listen messages from parent (gallery) to update icon/image etc.
  window.addEventListener('message', ev => {
    const msg = ev.data || {};
    if(msg && msg.type === 'setIcon' && typeof msg.dataUrl === 'string'){
      const imgEl = document.getElementById('prevImg') || document.getElementById('brandIcon');
      if(imgEl){ imgEl.src = msg.dataUrl; showToast('Icon applied'); }
    }
    if(msg && msg.type === 'setThemeHref' && typeof msg.href === 'string'){
      const link = document.getElementById('theme-link');
      if(link){ link.href = msg.href; showToast('Theme CSS applied'); }
    }
  });
})();
