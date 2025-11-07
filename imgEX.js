(function(){ // Bookmarklet / Hosted JS: Image Extractor, Downloader, Telegram Uploader // v1.0 — Save this file on GitHub and use its raw URL in the bookmarklet below.

const APP_KEY = 'bookmarklet_image_tool_v1';

// helper: load external script or css function loadScript(src){ return new Promise((res, rej) => { if(document.querySelector(script[src="${src}"])) return res(); const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); } function loadCSS(href){ return new Promise((res, rej)=>{ if(document.querySelector(link[href="${href}"])) return res(); const l = document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=res; l.onerror=rej; document.head.appendChild(l); }); }

// load required libs: SweetAlert2, JSZip, Material Icons async function ensureLibs(){ const libs = { swal: 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js', jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' }; const css = [ 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css', 'https://fonts.googleapis.com/icon?family=Material+Icons' ];

await Promise.all(css.map(loadCSS));
await loadScript(libs.swal);
await loadScript(libs.jszip);

// minimal safe namespace
return {Swal: window.Swal, JSZip: window.JSZip};

}

// Create top-level container with huge z-index function createUIRoot(){ const id = APP_KEY + '_root'; let root = document.getElementById(id); if(root) return root; root = document.createElement('div'); root.id = id; root.style.position = 'fixed'; root.style.right = '18px'; root.style.bottom = '18px'; root.style.zIndex = 2147483647; // max z-index root.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'; document.documentElement.appendChild(root); return root; }

// small floating button that opens the main menu function makeFloatingButton(root, onStart){ const btn = document.createElement('button'); btn.innerHTML = '<span class="material-icons">photo_library</span>' + ' Start'; btn.style.padding = '10px 14px'; btn.style.borderRadius = '12px'; btn.style.border = 'none'; btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)'; btn.style.background = 'linear-gradient(135deg,#6b8cff,#a57bff)'; btn.style.color = 'white'; btn.style.fontSize = '15px'; btn.style.cursor = 'pointer'; btn.style.display = 'flex'; btn.style.alignItems = 'center'; btn.style.gap = '8px'; btn.onclick = onStart; root.appendChild(btn); return btn; }

// highlight images found function highlightElements(list){ cleanupHighlights(); const wrapper = document.createElement('div'); wrapper.id = APP_KEY + '_highlights'; wrapper.style.position = 'absolute'; wrapper.style.top = '0'; wrapper.style.left = '0'; wrapper.style.width = '100%'; wrapper.style.height = '100%'; wrapper.style.pointerEvents = 'none'; wrapper.style.zIndex = 2147483646; document.documentElement.appendChild(wrapper);

list.forEach((el, i)=>{
  try{
    const r = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.style.position='fixed';
    box.style.left = (r.left)+'px';
    box.style.top = (r.top)+'px';
    box.style.width = (r.width)+'px';
    box.style.height = (r.height)+'px';
    box.style.boxSizing = 'border-box';
    box.style.border = '3px dashed rgba(255,200,60,0.95)';
    box.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0))';
    box.style.pointerEvents = 'none';
    wrapper.appendChild(box);
  }catch(e){/*ignore*/}
});

} function cleanupHighlights(){ const old = document.getElementById(APP_KEY + '_highlights'); if(old) old.remove(); }

// store settings function saveSettings(obj){ localStorage.setItem(APP_KEY + '_settings', JSON.stringify(obj)); } function loadSettings(){ try{ return JSON.parse(localStorage.getItem(APP_KEY + '_settings')) || {}; }catch(e){return {};} }

// utility: find elements by selector, fallback to images function findTargets(selector){ try{ if(!selector) return Array.from(document.querySelectorAll('img')); return Array.from(document.querySelectorAll(selector)); }catch(e){ return Array.from(document.querySelectorAll('img')); } }

// ask user for selector and attribute, then extract URLs async function runExtractor(Swal){ const settings = loadSettings();

// prompt for selector
const {value: selector} = await Swal.fire({
  title: 'Selector for images or anchors',
  input: 'text',
  inputPlaceholder: settings.selector || 'e.g. a.rel-link or img',
  showCancelButton: true
});
if(!selector) return;

const els = findTargets(selector);
if(els.length===0){
  await Swal.fire('No elements found for that selector');
  return;
}

// determine candidate attributes for quality
const candidateAttrs = new Set();
els.forEach(el=>{
  if(el.tagName.toLowerCase()==='a'){
    // if anchor contains img
    const img = el.querySelector('img');
    if(img){ Object.keys(img.dataset).forEach(k=>candidateAttrs.add('data-'+k));
      if(img.getAttribute('src')) candidateAttrs.add('src');
      if(img.getAttribute('data-src')) candidateAttrs.add('data-src');
    }
    if(el.getAttribute('href')) candidateAttrs.add('href');
  } else if(el.tagName.toLowerCase()==='img'){
    Object.keys(el.dataset).forEach(k=>candidateAttrs.add('data-'+k));
    if(el.getAttribute('src')) candidateAttrs.add('src');
    if(el.getAttribute('data-src')) candidateAttrs.add('data-src');
  }
});

const attrOptions = Array.from(candidateAttrs);
const {value: attr} = await Swal.fire({
  title: 'Which attribute contains the best quality URL?',
  input: 'select',
  inputOptions: attrOptions.reduce((o,k)=>{o[k]=k;return o},{}) ,
  inputValue: settings.qualityAttr || attrOptions[0] || 'src',
  showCancelButton: true
});
if(!attr) return;

// save settings
settings.selector = selector; settings.qualityAttr = attr;
saveSettings(settings);

// build list of image urls and element references
const items = [];
els.forEach(el=>{
  let url = null; let thumb=null;
  if(el.tagName.toLowerCase()==='a'){
    const img = el.querySelector('img');
    if(img){ url = img.getAttribute(attr) || img.getAttribute('src') || el.getAttribute('href'); thumb = img.getAttribute('src') || img.getAttribute('data-src'); }
    else url = el.getAttribute(attr) || el.getAttribute('href');
  } else if(el.tagName.toLowerCase()==='img'){
    url = el.getAttribute(attr) || el.getAttribute('src'); thumb = el.getAttribute('src');
  }
  if(url) items.push({el, url: url, thumb});
});

highlightElements(items.map(i=>i.el));

// ask what to do: download, zip, upload
const {value: action} = await Swal.fire({
  title: 'What now?',
  input: 'radio',
  inputOptions: { 'download-one':'Download one-by-one', 'download-zip':'Make ZIP and download', 'upload-telegram':'Upload to Telegram (media_group)', 'upload-zip-telegram':'Make ZIP and upload as file' },
  inputValue: 'download-one',
  showCancelButton: true
});
if(!action) return;

// store items in settings for selection step
settings.lastItems = items.map(it=>({url: it.url, thumb: it.thumb}));
saveSettings(settings);

if(action.startsWith('download')){
  if(action==='download-one'){
    await downloadSequential(items, Swal);
  } else {
    await zipAndDownload(items, Swal);
  }
} else if(action.startsWith('upload')){
  const creds = await ensureBotCreds(Swal);
  if(!creds) return;
  if(action==='upload-zip-telegram'){
    const blob = await buildZipBlob(items);
    await uploadZipToTelegram(creds.token, creds.chatId, blob, Swal);
  } else {
    await uploadMediaGroupToTelegram(creds.token, creds.chatId, items, Swal);
  }
}

}

// prompt for bot token and chat id; store in localStorage async function ensureBotCreds(Swal){ const settings = loadSettings(); if(settings.botToken && settings.chatId){ const {value: ok} = await Swal.fire({title:'Use saved bot/token?', showCancelButton:true, input:'radio', inputOptions:{use_saved:'Use saved', change:'Change token/chat id'}, inputValue:'use_saved'}); if(ok==='use_saved') return {token: settings.botToken, chatId: settings.chatId}; } const {value: token} = await Swal.fire({title:'Telegram Bot Token', input:'text', inputPlaceholder:'123456:ABC-DEF...', showCancelButton:true}); if(!token) return null; const {value: chatId} = await Swal.fire({title:'Chat ID', input:'text', inputPlaceholder:'-1001234567890 or 123456789', showCancelButton:true}); if(!chatId) return null; settings.botToken = token; settings.chatId = chatId; saveSettings(settings); return {token, chatId}; }

// download helpers async function downloadSequential(items, Swal){ for(let i=0;i<items.length;i++){ const it = items[i]; const name = urlToFilename(it.url) || image_${i+1}; await downloadUrl(it.url, name); await Swal.fire({title:Downloaded ${i+1}/${items.length}, timer:700, toast:true, position:'top-end', showConfirmButton:false}); } await Swal.fire('Done downloading'); } function urlToFilename(url){ try{ return url.split('?')[0].split('/').pop(); }catch(e){return null;} } async function downloadUrl(url, filename){ // attempt to download by creating anchor; if CORS blocks blob fetch it will still try direct link try{ const res = await fetch(url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(blobUrl), 5000); }catch(e){ // fallback: create link open in new tab (no redirect requirement but user will have to save) const a = document.createElement('a'); a.href = url; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove(); } }

async function buildZipBlob(items){ const zip = new window.JSZip(); const folder = zip.folder('images'); let index = 0; for(const it of items){ index++; try{ const res = await fetch(it.url); const buf = await res.arrayBuffer(); const name = urlToFilename(it.url) || image_${index}.jpg; folder.file(name, buf); }catch(e){ // skip failing file } } return await zip.generateAsync({type:'blob'}); } async function zipAndDownload(items, Swal){ const blob = await buildZipBlob(items); const a = document.createElement('a'); const u = URL.createObjectURL(blob); a.href = u; a.download = 'images.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000); await Swal.fire('ZIP downloaded'); }

// Telegram upload helpers — NOTE: many browsers block direct Telegram requests due to CORS. async function uploadMediaGroupToTelegram(token, chatId, items, Swal){ // build media array with up to 10 items per media_group const chunkSize = 10; const chunks = []; for(let i=0;i<items.length;i+=chunkSize) chunks.push(items.slice(i,i+chunkSize));

for(const chunk of chunks){
  const form = new FormData();
  const media = [];
  for(let i=0;i<chunk.length;i++){
    const it = chunk[i];
    try{
      const res = await fetch(it.url);
      const blob = await res.blob();
      const name = urlToFilename(it.url) || `photo${i+1}.jpg`;
      form.append('photo'+i, blob, name);
      media.push({type:'photo', media:`attach://photo${i}`});
    }catch(e){
      // fallback to sending by URL (Telegram accepts URLs in media_group), but requires bot api call; we'll include direct URL if fetch fails
      media.push({type:'photo', media: it.url});
    }
  }
  form.append('chat_id', chatId);
  form.append('media', JSON.stringify(media));

  const url = `https://api.telegram.org/bot${token}/sendMediaGroup`;
  try{
    const resp = await fetch(url, {method:'POST', body: form});
    if(!resp.ok) throw new Error(await resp.text());
    await Swal.fire({title:'Uploaded chunk', timer:800, toast:true, position:'top-end', showConfirmButton:false});
  }catch(err){
    // Show helpful error and suggestion for CORS
    await Swal.fire({
      icon:'error',
      title:'Upload failed (CORS or API error)',
      html:`Browser -> Telegram upload often blocked by CORS. Error: ${String(err).slice(0,250)}<br><br>Use a simple proxy/server (Cloudflare Worker / small server) to proxy requests to Telegram API or upload server-side.`
    });
    return;
  }
}

await Swal.fire('All chunks uploaded');

}

async function uploadZipToTelegram(token, chatId, blob, Swal){ const form = new FormData(); form.append('chat_id', chatId); form.append('document', blob, 'images.zip'); const url = https://api.telegram.org/bot${token}/sendDocument; try{ const resp = await fetch(url, {method:'POST', body: form}); if(!resp.ok) throw new Error(await resp.text()); await Swal.fire('ZIP uploaded'); }catch(err){ await Swal.fire({icon:'error', title:'Upload failed (CORS or API error)', html:${String(err).slice(0,300)}<br>Consider using a proxy.}); } }

// selection by double click: toggle selection class function enableDoubleClickSelection(){ const selClass = APP_KEY + '_selected'; const handler = function(e){ const el = e.target.closest('img, a'); if(!el) return; e.preventDefault(); e.stopPropagation(); el.classList.toggle(selClass); if(el.classList.contains(selClass)){ el.style.outline = '4px solid rgba(52, 211, 153, 0.85)'; } else { el.style.outline = ''; } }; document.addEventListener('dblclick', handler, true); return ()=>document.removeEventListener('dblclick', handler, true); }

// small settings menu using Swal2.fire HTML content async function openSettings(Swal){ const settings = loadSettings(); const html = <div style="text-align:left"> <label>Selector: <input id="b_sel" style="width:100%" value="${escapeHtml(settings.selector||'')}"></label> <label>Quality attribute: <input id="b_attr" style="width:100%" value="${escapeHtml(settings.qualityAttr||'src')}"></label> <label>Bot Token: <input id="b_token" style="width:100%" value="${escapeHtml(settings.botToken||'')}"></label> <label>Chat ID: <input id="b_chat" style="width:100%" value="${escapeHtml(settings.chatId||'')}"></label> <div style="margin-top:8px;display:flex;gap:8px"><button id="b_reset">Reset</button></div> </div>; await Swal.fire({title:'Settings', html, showConfirmButton:true, showCancelButton:true, didOpen: ()=>{ document.getElementById('b_reset').onclick = ()=>{ localStorage.removeItem(APP_KEY + '_settings'); Swal.close(); Swal.fire('Settings reset'); }; }}); // on confirm save const b_sel = document.getElementById('b_sel'); if(b_sel){ settings.selector = b_sel.value || settings.selector; settings.qualityAttr = document.getElementById('b_attr').value || settings.qualityAttr; settings.botToken = document.getElementById('b_token').value || settings.botToken; settings.chatId = document.getElementById('b_chat').value || settings.chatId; saveSettings(settings); } }

function escapeHtml(s){ return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>'); }

// show main UI using Swal as menu for simplicity async function showMainMenu(Swal){ const res = await Swal.fire({ title: 'Image Extractor', showCancelButton: true, showDenyButton: true, confirmButtonText: 'Start', denyButtonText: 'Settings', html: 'Click <b>Start</b> to pick selector and run. Double-click images to select while active.' }); if(res.isDenied) return await openSettings(Swal); if(res.isConfirmed) return await runExtractor(Swal); }

// initialization (async function init(){ try{ const libs = await ensureLibs(); const root = createUIRoot(); const btn = makeFloatingButton(root, ()=>showMainMenu(libs.Swal));

// small context menu to show settings or quit
  const qBtn = document.createElement('button');
  qBtn.innerHTML = '<span class="material-icons">settings</span>';
  qBtn.style.marginLeft='8px'; qBtn.style.padding='10px'; qBtn.style.borderRadius='10px'; qBtn.style.border='none';
  qBtn.style.background='white'; qBtn.style.boxShadow='0 6px 18px rgba(0,0,0,0.12)'; qBtn.onclick=()=>openSettings(libs.Swal);
  root.appendChild(qBtn);

  // enable double click selection and keep handle for later removal (not used now)
  enableDoubleClickSelection();

  // cleanup when page navigates or user reloads is automatic; we avoid redirects per user request
  libs.Swal.fire({title:'Bookmarklet ready', toast:true, position:'top-end', timer:1200, showConfirmButton:false});
}catch(err){
  console.error('Failed to initialize bookmarklet:', err);
  alert('Failed to load bookmarklet libraries. See console for details.');
}

})();

})();

