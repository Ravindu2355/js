// ImageCollector.js
// Enhanced draggable + minimizeable version of your Image Collector
(function () {
  if (window.__IMG_COLLECTOR_ACTIVE) {
    window.__IMG_COLLECTOR_TOGGLE && window.__IMG_COLLECTOR_TOGGLE();
    return;
  }
  window.__IMG_COLLECTOR_ACTIVE = true;

  function loadResource(tag, attrs, container = document.head) {
    return new Promise((res, rej) => {
      const el = document.createElement(tag);
      Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
      el.onload = () => res(el);
      el.onerror = rej;
      container.appendChild(el);
    });
  }

  const cdns = {
    swal: "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js",
    jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    filesaver: "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js",
    jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    iconsCSS: "https://fonts.googleapis.com/icon?family=Material+Icons"
  };

  Promise.resolve()
    .then(() => loadResource('link', { rel: 'stylesheet', href: cdns.iconsCSS }))
    .then(() => loadResource('script', { src: cdns.swal }))
    .then(() => loadResource('script', { src: cdns.jszip }))
    .then(() => loadResource('script', { src: cdns.filesaver }))
    .then(() => loadResource('script', { src: cdns.jspdf }))
    .then(init)
    .catch(err => { alert("Failed to load bookmarklet libraries."); console.error(err); cleanup(); });

  let selected = new Set();
  let selectionMode = 'dblclick';
  let uiRoot = null;
  let isMinimized = false;
  let dragOffset = { x: 0, y: 0 };

  function SwalToast(text, icon = 'success', timer = 2500) {
    if (window.Swal) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title: text,
        showConfirmButton: false,
        timer,
        timerProgressBar: true
      });
    } else console.log(text);
  }

  function init() {
    uiRoot = document.createElement('div');
    uiRoot.id = '__img_collector_root';
    Object.assign(uiRoot.style, {
      position: 'fixed',
      right: '16px',
      top: '16px',
      zIndex: 2147483647,
      fontFamily: 'Inter, Roboto, Arial, sans-serif'
    });
    document.body.appendChild(uiRoot);

    uiRoot.innerHTML = `
      <div id="__img_collector_panel" style="backdrop-filter: blur(6px); padding:10px; border-radius:16px; box-shadow:0 8px 25px rgba(0,0,0,0.25); background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(235,235,255,0.85)); min-width:220px; cursor:grab;">
        <div id="__collector_header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:move;">
          <span class="material-icons" style="font-size:20px">photo_library</span>
          <div style="flex:1;font-weight:600;">Image Collector</div>
          <button id="__collector_min" title="Minimize" style="border:0;background:transparent;cursor:pointer"><span class="material-icons">remove</span></button>
          <button id="__collector_close" title="Close" style="border:0;background:transparent;cursor:pointer"><span class="material-icons">close</span></button>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <button id="__collector_mode" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Mode: Double-click</button>
          <button id="__collector_extract" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Start</button>
          <button id="__collector_clear" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);cursor:pointer">Clear</button>
        </div>

        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
          <label style="font-size:12px;color:#555">Export</label>
          <select id="__collector_export" style="flex:1;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)">
            <option value="zip">ZIP</option>
            <option value="pdf">PDF</option>
            <option value="onebyone">One-by-one</option>
          </select>
        </div>

        <div style="font-size:12px;color:#666">Selected: <span id="__collector_count">0</span></div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          <button id="__collector_download" style="flex:1;padding:8px;border-radius:10px;background:#4f46e5;color:white;border:0;cursor:pointer">Download</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#888">Tips: Double-click images to toggle. Use Bulk to select via CSS selector.</div>
      </div>
    `;

    // create minimize bubble
    const bubble = document.createElement('div');
    bubble.id = '__collector_bubble';
    bubble.innerHTML = `<span class="material-icons" style="font-size:28px;color:white;">photo_library</span>`;
    Object.assign(bubble.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      zIndex: 2147483647,
      transition: 'all 0.3s ease'
    });
    document.body.appendChild(bubble);

    // event wiring
    document.getElementById('__collector_close').onclick = () => { cleanup(); SwalToast('Collector closed', 'info'); };
    document.getElementById('__collector_min').onclick = () => minimize(true);
    document.getElementById('__collector_mode').onclick = toggleMode;
    document.getElementById('__collector_extract').onclick = startExtraction;
    document.getElementById('__collector_clear').onclick = clearSelection;
    document.getElementById('__collector_download').onclick = exportSelection;
    bubble.onclick = () => minimize(false);

    enableDrag(document.getElementById('__collector_header'), uiRoot);

    stopRedirects();
    attachDblclick();
    window.__IMG_COLLECTOR_TOGGLE = cleanup;
    SwalToast('Collector ready', 'success');
  }

  function minimize(state) {
    const panel = document.getElementById('__img_collector_panel');
    const bubble = document.getElementById('__collector_bubble');
    if (state) {
      panel.style.display = 'none';
      bubble.style.display = 'flex';
      isMinimized = true;
    } else {
      panel.style.display = 'block';
      bubble.style.display = 'none';
      isMinimized = false;
    }
  }

  function enableDrag(handle, element) {
    let pos = { x: 0, y: 0 };
    handle.onmousedown = e => {
      e.preventDefault();
      pos = { x: e.clientX - element.offsetLeft, y: e.clientY - element.offsetTop };
      document.onmousemove = ev => {
        ev.preventDefault();
        element.style.left = (ev.clientX - pos.x) + 'px';
        element.style.top = (ev.clientY - pos.y) + 'px';
        element.style.right = 'auto';
      };
      document.onmouseup = () => { document.onmousemove = null; };
    };
  }

  function stopRedirects() {
    const assign = window.location.assign;
    const replace = window.location.replace;
    window.location.assign = () => SwalToast('Redirect blocked', 'info');
    window.location.replace = () => SwalToast('Redirect blocked', 'info');
    document.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        SwalToast('Navigation blocked while collector active', 'info');
      }
    }, true);
  }

  function toggleMode() {
    const btn = document.getElementById('__collector_mode');
    if (selectionMode === 'dblclick') {
      selectionMode = 'bulk';
      detachDblclick();
      SwalToast('Bulk mode', 'info');
      btn.textContent = 'Mode: Bulk';
    } else {
      selectionMode = 'dblclick';
      attachDblclick();
      SwalToast('Double-click mode', 'info');
      btn.textContent = 'Mode: Double-click';
    }
  }

  let dblHandler = null;
  function attachDblclick() {
    dblHandler = e => {
      const img = e.target.tagName === 'IMG' ? e.target : e.target.querySelector && e.target.querySelector('img');
      if (img) toggleSelectImg(img);
    };
    document.addEventListener('dblclick', dblHandler, true);
  }
  function detachDblclick() {
    document.removeEventListener('dblclick', dblHandler, true);
  }

  function highQualityFromImgEl(img) {
    const attrs = ['srcset', 'data-srcset', 'data-src', 'data-original', 'data-lazy-src', 'src'];
    for (const a of attrs) {
      const v = img.getAttribute(a);
      if (!v) continue;
      if (a.includes('srcset')) {
        const parts = v.split(',').map(s => s.trim());
        const parsed = parts.map(p => {
          const [url, descr] = p.split(/\s+/);
          let w = 0;
          if (descr && descr.endsWith('w')) w = parseInt(descr);
          return { url, w };
        }).sort((a, b) => b.w - a.w);
        if (parsed.length) return parsed[0].url;
      } else return v;
    }
    return img.src || null;
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
    document.getElementById('__collector_count').textContent = selected.size;
  }

  function clearSelection() {
    selected.clear();
    document.querySelectorAll('.__img_collector_selected').forEach(e => e.classList.remove('__img_collector_selected'));
    SwalToast('Selection cleared', 'info');
    document.getElementById('__collector_count').textContent = 0;
  }

  async function startExtraction() {
    if (selectionMode === 'bulk') {
      const { value: sel } = await Swal.fire({
        title: 'Bulk selector',
        input: 'text',
        inputLabel: 'Enter CSS selector (e.g. img, .gallery img)',
        inputPlaceholder: 'img',
        showCancelButton: true
      });
      if (!sel) return;
      const imgs = document.querySelectorAll(sel);
      imgs.forEach(img => selected.add(highQualityFromImgEl(img)));
      SwalToast(`Selected ${imgs.length} images`, 'success');
      document.getElementById('__collector_count').textContent = selected.size;
    } else {
      Swal.fire('Double-click mode', 'Double-click images to select.', 'info');
    }
  }

  async function exportSelection() {
    const type = document.getElementById('__collector_export').value;
    const urls = Array.from(selected);
    if (!urls.length) return Swal.fire('No images selected', '', 'warning');
    if (type === 'onebyone') {
      for (const u of urls) {
        const r = await fetch(u);
        const b = await r.blob();
        saveAs(b, u.split('/').pop());
      }
      SwalToast('Downloads complete', 'success');
    } else if (type === 'zip') {
      const zip = new JSZip();
      let i = 0;
      for (const u of urls) {
        const r = await fetch(u);
        const b = await r.blob();
        zip.file((u.split('/').pop()) || `img${i++}.jpg`, b);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `images-${Date.now()}.zip`);
      SwalToast('ZIP ready', 'success');
    } else {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      for (const u of urls) {
        const img = await fetch(u).then(r => r.blob()).then(b => new Promise(res => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(b);
        }));
        doc.addImage(img, 'JPEG', 10, 10, 180, 160);
        doc.addPage();
      }
      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, `images-${Date.now()}.pdf`);
      SwalToast('PDF ready', 'success');
    }
  }

  function cleanup() {
    document.querySelectorAll('.__img_collector_selected').forEach(e => e.classList.remove('__img_collector_selected'));
    uiRoot && uiRoot.remove();
    const bubble = document.getElementById('__collector_bubble');
    if (bubble) bubble.remove();
    window.__IMG_COLLECTOR_ACTIVE = false;
  }
})();
