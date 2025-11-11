// bookmarklet.js — Enhanced Image Collector
(function () {
  if (window.__IMG_COLLECTOR_ACTIVE) {
    window.__IMG_COLLECTOR_TOGGLE && window.__IMG_COLLECTOR_TOGGLE();
    return;
  }
  window.__IMG_COLLECTOR_ACTIVE = true;

  async function loadResource(tag, attrs, container = document.head) {
    return new Promise((res, rej) => {
      const el = document.createElement(tag);
      Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
      el.onload = () => res(el);
      el.onerror = rej;
      container.appendChild(el);
    });
  }

  const cdns = {
    swal: "https://cdn.jsdelivr.net/npm/sweetalert2@11",
    jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    html2canvas: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    filesaver: "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js",
    iconsCSS: "https://fonts.googleapis.com/icon?family=Material+Icons"
  };

  Promise.resolve()
    .then(() => loadResource('link', { rel: 'stylesheet', href: cdns.iconsCSS }))
    .then(() => loadResource('script', { src: cdns.swal + "/dist/sweetalert2.all.min.js" }))
    .then(() => loadResource('script', { src: cdns.jszip }))
    .then(() => loadResource('script', { src: cdns.filesaver }))
    .then(() => loadResource('script', { src: cdns.html2canvas }))
    .then(() => loadResource('script', { src: cdns.jspdf }))
    .then(init)
    .catch(err => {
      console.error("Failed to load resources", err);
      alert("Failed to load bookmarklet resources. Check console.");
      cleanup();
    });

  // Utility functions
  function highQualityFromImgEl(img) {
    const attrs = ['srcset', 'data-srcset', 'data-src', 'data-original', 'data-lazy-src', 'src'];
    for (const a of attrs) {
      const v = img.getAttribute(a);
      if (!v) continue;
      if (a.includes('srcset')) {
        const parsed = v.split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(p => {
            const [url, descr] = p.split(/\s+/);
            return { url, w: descr && descr.endsWith('w') ? parseInt(descr) : 0 };
          })
          .sort((a, b) => b.w - a.w);
        if (parsed.length) return parsed[0].url;
      } else return v;
    }
    return img.src || null;
  }

  function filenameFromUrl(url, fallback = 'image') {
    try {
      const u = new URL(url, location.href);
      return decodeURIComponent(u.pathname.split('/').pop().split('?')[0]) || fallback;
    } catch {
      return fallback;
    }
  }

  let selected = new Set();
  let selectionMode = 'dblclick';
  let uiRoot = null;

  function SwalToast(text, icon = 'success', timer = 2500) {
    Swal.fire({
      toast: true, position: 'top-end', icon, title: text,
      showConfirmButton: false, timer, timerProgressBar: true
    });
  }

  // Main UI
  function init() {
    uiRoot = document.createElement('div');
    uiRoot.id = '__img_collector_root';
    Object.assign(uiRoot.style, {
      position: 'fixed', right: '16px', top: '16px', zIndex: 2147483647,
      fontFamily: 'Inter, Roboto, Arial, sans-serif', cursor: 'move'
    });
    document.body.appendChild(uiRoot);

    uiRoot.innerHTML = `
      <div id="__img_collector_panel" style="backdrop-filter:blur(6px);padding:10px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.35);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,240,255,0.85));min-width:220px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="material-icons" style="font-size:20px">photo_library</span>
          <div style="flex:1;font-weight:600">Image Collector</div>
          <button id="__img_collector_close" style="border:0;background:transparent;cursor:pointer"><span class="material-icons">close</span></button>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <button id="__img_collector_mode" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Mode: Double-click</button>
          <button id="__img_collector_extract" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Start</button>
          <button id="__img_collector_clear" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Clear</button>
        </div>

        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
          <label style="font-size:12px;color:#555">Export</label>
          <select id="__img_collector_export" style="flex:1;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)">
            <option value="zip">ZIP</option>
            <option value="pdf">PDF</option>
            <option value="onebyone">One-by-one</option>
          </select>
        </div>

        <div style="font-size:12px;color:#666">Selected: <span id="__img_collector_count">0</span></div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          <button id="__img_collector_download" style="flex:1;padding:8px;border-radius:10px;background:#4f46e5;color:white;border:0;cursor:pointer">Download</button>
        </div>

        <div style="margin-top:8px;font-size:11px;color:#888">Tips: Drag to move. Double-click to select images.</div>
      </div>
    `;

    // Draggable UI
    let isDragging = false, offsetX = 0, offsetY = 0;
    uiRoot.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, select, input')) return;
      isDragging = true;
      offsetX = e.clientX - uiRoot.getBoundingClientRect().left;
      offsetY = e.clientY - uiRoot.getBoundingClientRect().top;
      uiRoot.style.opacity = "0.85";
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      uiRoot.style.left = e.clientX - offsetX + 'px';
      uiRoot.style.top = e.clientY - offsetY + 'px';
      uiRoot.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { isDragging = false; uiRoot.style.opacity = "1"; });

    // event listeners
    document.getElementById('__img_collector_close').onclick = cleanup;
    document.getElementById('__img_collector_mode').onclick = toggleMode;
    document.getElementById('__img_collector_extract').onclick = startExtraction;
    document.getElementById('__img_collector_clear').onclick = clearSelection;
    document.getElementById('__img_collector_download').onclick = exportSelection;

    const style = document.createElement('style');
    style.textContent = `
      .__img_collector_selected{outline:4px solid rgba(79,70,229,0.8);outline-offset:6px;filter:drop-shadow(0 6px 18px rgba(79,70,229,0.15));}
    `;
    document.head.appendChild(style);

    attachDblclick();
    SwalToast('Collector ready', 'success');
    window.__IMG_COLLECTOR_TOGGLE = cleanup;
  }

  let dblHandler;
  function attachDblclick() {
    detachDblclick();
    dblHandler = e => {
      const img = e.target.closest('img');
      if (!img) return;
      e.preventDefault(); e.stopPropagation();
      toggleSelectImg(img);
    };
    document.addEventListener('dblclick', dblHandler, true);
  }
  function detachDblclick() { if (dblHandler) document.removeEventListener('dblclick', dblHandler, true); }

  function toggleMode() {
    const btn = document.getElementById('__img_collector_mode');
    selectionMode = selectionMode === 'dblclick' ? 'bulk' : 'dblclick';
    btn.textContent = `Mode: ${selectionMode === 'dblclick' ? 'Double-click' : 'Bulk'}`;
    SwalToast(selectionMode + ' mode active', 'info');
  }

  function toggleSelectImg(img) {
    const url = highQualityFromImgEl(img);
    if (!url) return;
    if (selected.has(url)) {
      selected.delete(url);
      img.classList.remove('__img_collector_selected');
    } else {
      selected.add(url);
      img.classList.add('__img_collector_selected');
    }
    document.getElementById('__img_collector_count').textContent = selected.size;
  }

  function clearSelection() {
    document.querySelectorAll('.__img_collector_selected').forEach(el => el.classList.remove('__img_collector_selected'));
    selected.clear();
    document.getElementById('__img_collector_count').textContent = '0';
    SwalToast('Selection cleared', 'info');
  }

  async function startExtraction() {
    if (selectionMode === 'bulk') {
      const { value: sel } = await Swal.fire({
        title: 'Bulk Selector',
        input: 'text', inputPlaceholder: 'img',
        inputLabel: 'Enter CSS selector for images',
        showCancelButton: true
      });
      if (!sel) return;
      document.querySelectorAll(sel).forEach(img => {
        const url = highQualityFromImgEl(img);
        if (url && !selected.has(url)) {
          selected.add(url);
          img.classList.add('__img_collector_selected');
        }
      });
      document.getElementById('__img_collector_count').textContent = selected.size;
      SwalToast(`Selected ${selected.size} images`, 'success');
    } else {
      Swal.fire('Double-click images to select', '', 'info');
    }
  }

  async function fetchBlob(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed: ' + url);
    return await res.blob();
  }

  async function exportSelection() {
    if (selected.size === 0) return Swal.fire('No images selected', '', 'warning');
    const { value: fname } = await Swal.fire({
      title: 'File name',
      input: 'text',
      inputValue: document.title.replace(/[^\w\d\s_-]+/g, '').trim() || 'images',
      showCancelButton: true
    });
    if (!fname) return;

    const type = document.getElementById('__img_collector_export').value;
    const arr = Array.from(selected);
    if (type === 'zip') await exportZip(arr, fname);
    else if (type === 'pdf') await exportPdf(arr, fname);
    else await exportOneByOne(arr);
  }

  async function exportZip(urls, name) {
    Swal.fire({ title: 'Preparing ZIP...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const zip = new JSZip();
    let i = 0;
    for (const u of urls) {
      const blob = await fetchBlob(u);
      zip.file(filenameFromUrl(u, 'img' + (++i)), blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${name}.zip`);
    Swal.close(); SwalToast('ZIP downloaded', 'success');
  }

  async function exportPdf(urls, name) {
    Swal.fire({ title: 'Preparing PDF...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'px', format: 'a4' });
    let first = true;
    for (const u of urls) {
      const blob = await fetchBlob(u);
      const bmp = await createImageBitmap(blob);
      const maxW = 575, maxH = 822;
      const r = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
      const w = bmp.width * r, h = bmp.height * r;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      const dataUrl = c.toDataURL('image/jpeg', 0.9);
      if (!first) doc.addPage();
      doc.addImage(dataUrl, 'JPEG', 10, 10, w, h);
      first = false;
    }
    const blob = doc.output('blob');
    saveAs(blob, `${name}.pdf`);
    Swal.close(); SwalToast('PDF downloaded', 'success');
  }

  async function exportOneByOne(urls) {
    Swal.fire({ title: 'Downloading...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    let i = 0;
    for (const u of urls) {
      const blob = await fetchBlob(u);
      saveAs(blob, filenameFromUrl(u, 'img' + (++i)));
    }
    Swal.close(); SwalToast('All images downloaded', 'success');
  }

  function cleanup() {
    detachDblclick();
    const el = document.getElementById('__img_collector_root');
    if (el) el.remove();
    document.querySelectorAll('.__img_collector_selected').forEach(e => e.classList.remove('__img_collector_selected'));
    selected.clear();
    window.__IMG_COLLECTOR_ACTIVE = false;
    SwalToast('Collector closed', 'info');
  }
})();
