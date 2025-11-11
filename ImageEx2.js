// bookmarklet.js
// Image collector bookmarklet
// Requirements: none (script loads SweetAlert2, JSZip, jsPDF, html2canvas from CDNs)
// Save as a raw-hosted JS file and load via bookmarklet template provided later.

(function () {
  if (window.__IMG_COLLECTOR_ACTIVE) {
    // toggle off if already active
    window.__IMG_COLLECTOR_TOGGLE && window.__IMG_COLLECTOR_TOGGLE();
    return;
  }
  window.__IMG_COLLECTOR_ACTIVE = true;

  // helper to load scripts/styles
  function loadResource(tag, attrs, container = document.head) {
    return new Promise((res, rej) => {
      const el = document.createElement(tag);
      Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
      el.onload = () => res(el);
      el.onerror = (e) => rej(e);
      container.appendChild(el);
    });
  }

  // load required libs (SweetAlert2, Google Material Icons (stylesheet), JSZip, FileSaver-lite, jsPDF, html2canvas)
  const cdns = {
    swal: "https://cdn.jsdelivr.net/npm/sweetalert2@11",
    jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    html2canvas: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    filesaver: "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js",
    iconsCSS: "https://fonts.googleapis.com/icon?family=Material+Icons"
  };

  // chain load
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

  // Utilities
  function highQualityFromImgEl(img) {
    // prioritized attributes
    const attrs = ['srcset', 'data-srcset', 'data-src', 'data-original', 'data-lazy-src', 'src'];
    for (const a of attrs) {
      const v = img.getAttribute(a);
      if (!v) continue;
      if (a.includes('srcset')) {
        // parse srcset, pick last/highest candidate
        const parts = v.split(',').map(s => s.trim()).filter(Boolean);
        // convert to array of {url, w}
        const parsed = parts.map(p => {
          const [url, descr] = p.trim().split(/\s+/);
          let w = 0;
          if (descr && descr.endsWith('w')) w = parseInt(descr);
          return { url, w };
        }).sort((a, b) => b.w - a.w);
        if (parsed.length) return parsed[0].url;
      } else {
        return v;
      }
    }
    // fallback: src
    return img.src || null;
  }

  function filenameFromUrl(url, fallback = 'image') {
    try {
      const u = new URL(url, location.href);
      const p = u.pathname.split('/').filter(Boolean).pop() || fallback;
      return decodeURIComponent(p.split('?')[0]) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Create overlay UI
  let selected = new Set();
  let selectionMode = 'dblclick'; // or 'bulk'
  let uiRoot = null;
  let originalLocationAssign = null;
  let originalReplace = null;
  let pushStateOverride = null;
  let anchorHandler = null;
  let beforeUnloadHandler = null;

  function stopRedirectsWhileActive() {
    // override assign/replace
    originalLocationAssign = window.location.assign;
    originalReplace = window.location.replace;
    window.location.assign = function () { console.warn('navigation blocked by Image Collector'); };
    window.location.replace = function () { console.warn('navigation blocked by Image Collector'); };
    // override pushState/replaceState to no-op navigation that might cause hard nav
    history.pushState = function () { console.warn('history.pushState blocked'); };
    history.replaceState = function () { console.warn('history.replaceState blocked'); };

    // remove meta refresh
    document.querySelectorAll('meta[http-equiv="refresh"]').forEach(m => m.remove());

    // intercept links on capture
    anchorHandler = function (e) {
      // block navigation while UI active unless user clicked inside our UI
      if (!uiRoot.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Link blocked by Image Collector');
        SwalToast('Navigation blocked while collector is active', 'info');
      }
    };
    document.addEventListener('click', anchorHandler, true);

    // block form submissions
    document.addEventListener('submit', function (ev) {
      if (!uiRoot.contains(ev.target)) {
        ev.preventDefault();
        ev.stopPropagation();
        SwalToast('Form submission blocked while collector is active', 'info');
      }
    }, true);

    // beforeunload (page tries to redirect via JS)
    beforeUnloadHandler = function (e) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeUnloadHandler, { capture: true });
  }

  function restoreRedirects() {
    if (originalLocationAssign) window.location.assign = originalLocationAssign;
    if (originalReplace) window.location.replace = originalReplace;
    // can't restore original history functions easily, reload to clean state if necessary
    document.removeEventListener('click', anchorHandler, true);
    window.removeEventListener('beforeunload', beforeUnloadHandler, { capture: true });
  }

  // small toast wrapper
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
    } else {
      console.log(text);
    }
  }

  // Build the UI
  function init() {
    // root container
    uiRoot = document.createElement('div');
    uiRoot.id = '__img_collector_root';
    const style = uiRoot.style;
    style.position = 'fixed';
    style.right = '16px';
    style.top = '16px';
    style.zIndex = 2147483647; // max
    style.fontFamily = 'Inter, Roboto, Arial, sans-serif';
    document.body.appendChild(uiRoot);

    // inner HTML (buttons)
    uiRoot.innerHTML = `
      <div id="__img_collector_panel" style="backdrop-filter: blur(6px); padding:10px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.35); background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,245,255,0.8)); min-width:220px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="material-icons" style="font-size:20px">photo_library</span>
          <div style="flex:1;font-weight:600">Image Collector</div>
          <button id="__img_collector_close" title="Close" style="border:0;background:transparent;cursor:pointer"><span class="material-icons">close</span></button>
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

        <div style="margin-top:8px;font-size:11px;color:#888">Tips: Double-click images to toggle selection in DBL mode. Use Bulk to select by CSS selector.</div>
      </div>
    `;

    // event wiring
    document.getElementById('__img_collector_close').addEventListener('click', () => { cleanup(); SwalToast('Collector closed', 'info'); });
    document.getElementById('__img_collector_mode').addEventListener('click', toggleMode);
    document.getElementById('__img_collector_extract').addEventListener('click', startExtraction);
    document.getElementById('__img_collector_clear').addEventListener('click', clearSelection);
    document.getElementById('__img_collector_download').addEventListener('click', exportSelection);

    // add styles for selected images
    const s = document.createElement('style');
    s.id = '__img_collector_style';
    s.innerHTML = `
      .__img_collector_selected {
        outline: 4px solid rgba(79,70,229,0.8);
        outline-offset: 6px;
        filter: drop-shadow(0 6px 18px rgba(79,70,229,0.15));
      }
      .__img_collector_marker {
        position: absolute;
        background: rgba(79,70,229,0.95);
        color: white;
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 8px;
        z-index: 2147483646;
        pointer-events: none;
      }
    `;
    document.head.appendChild(s);

    // block redirects
    stopRedirectsWhileActive();

    // set initial mode
    setMode(selectionMode);

    // expose toggle to window to allow double call to stop
    window.__IMG_COLLECTOR_TOGGLE = cleanup;

    SwalToast('Collector ready', 'success', 1400);
  }

  function setMode(mode) {
    selectionMode = mode;
    const btn = document.getElementById('__img_collector_mode');
    btn.textContent = mode === 'dblclick' ? 'Mode: Double-click' : 'Mode: Bulk';
    // attach/detach dblclick handler
    if (mode === 'dblclick') {
      attachDblclick();
    } else {
      detachDblclick();
    }
  }

  // dblclick selection
  let dblHandler = null;
  function attachDblclick() {
    detachDblclick();
    dblHandler = function (e) {
      const t = e.target;
      // find image element up the tree
      const img = t.tagName === 'IMG' ? t : t.querySelector && t.querySelector('img');
      if (!img) return;
      e.preventDefault();
      e.stopPropagation();
      toggleSelectImg(img);
    };
    document.addEventListener('dblclick', dblHandler, true);
    SwalToast('Double-click mode active', 'info');
  }

  function detachDblclick() {
    if (dblHandler) {
      document.removeEventListener('dblclick', dblHandler, true);
      dblHandler = null;
    }
  }

  function toggleMode() {
    if (selectionMode === 'dblclick') setMode('bulk');
    else setMode('dblclick');
  }

  function toggleSelectImg(img) {
    try {
      const url = highQualityFromImgEl(img) || img.src;
      if (!url) return;
      const key = url;
      if (selected.has(key)) {
        selected.delete(key);
        img.classList.remove('__img_collector_selected');
        // remove marker
        const marker = img.__img_collector_marker;
        if (marker && marker.parentNode) marker.parentNode.removeChild(marker);
        img.__img_collector_marker = null;
      } else {
        selected.add(key);
        img.classList.add('__img_collector_selected');
        // add small numbered marker
        const rect = img.getBoundingClientRect();
        const marker = document.createElement('div');
        marker.className = '__img_collector_marker';
        marker.style.left = (rect.left + window.scrollX + 6) + 'px';
        marker.style.top = (rect.top + window.scrollY + 6) + 'px';
        marker.textContent = selected.size;
        document.body.appendChild(marker);
        img.__img_collector_marker = marker;
      }
      updateCount();
    } catch (e) {
      console.error(e);
    }
  }

  function updateCount() {
    document.getElementById('__img_collector_count').textContent = selected.size;
  }

  function clearSelection() {
    selected.forEach(k => {
      // find images in document that match URL and remove class
      document.querySelectorAll('img').forEach(img => {
        try {
          const u = highQualityFromImgEl(img) || img.src;
          if (u === k) {
            img.classList.remove('__img_collector_selected');
            if (img.__img_collector_marker) {
              img.__img_collector_marker.remove();
              img.__img_collector_marker = null;
            }
          }
        } catch (e) {}
      });
    });
    selected.clear();
    updateCount();
    SwalToast('Selection cleared', 'info');
  }

  async function startExtraction() {
    if (selectionMode === 'bulk') {
      // ask for selector
      const { value: sel } = await Swal.fire({
        title: 'Bulk selector',
        input: 'text',
        inputLabel: 'Enter CSS selector for images (e.g. img, .gallery img, .post img)',
        inputPlaceholder: 'img',
        showCancelButton: true
      });
      if (!sel) return;
      // find matches and select them
      const nodes = Array.from(document.querySelectorAll(sel));
      if (!nodes.length) {
        Swal.fire('No images found', `Selector "${sel}" matched 0 elements.`, 'warning');
        return;
      }
      // for each node that contains img(s), locate image elements or use node if img
      let count = 0;
      nodes.forEach(n => {
        if (n.tagName === 'IMG') {
          toggleSelectIfNotSelected(n);
          count++;
        } else {
          const imgs = n.querySelectorAll('img');
          if (imgs.length) {
            imgs.forEach(img => { toggleSelectIfNotSelected(img); count++; });
          } else {
            // maybe element itself has background-image style
            const bg = window.getComputedStyle(n).backgroundImage;
            if (bg && bg !== 'none') {
              // try extract url(...) inside bg
              const m = bg.match(/url\\(["']?(.+?)["']?\\)/);
              if (m && m[1]) {
                selected.add(m[1]);
                count++;
              }
            }
          }
        }
      });
      updateCount();
      SwalToast(`Bulk selected ${count} items`, 'success');
    } else {
      // dblclick mode: guide message
      Swal.fire({
        title: 'Double-click selection',
        html: 'Double-click images on the page to toggle selection. When done, click Download in the panel.',
        icon: 'info',
        timer: 3500,
        showConfirmButton: false
      });
    }
  }

  function toggleSelectIfNotSelected(img) {
    try {
      const url = highQualityFromImgEl(img) || img.src;
      if (!url) return;
      if (!selected.has(url)) {
        selected.add(url);
        img.classList.add('__img_collector_selected');
        const rect = img.getBoundingClientRect();
        const marker = document.createElement('div');
        marker.className = '__img_collector_marker';
        marker.style.left = (rect.left + window.scrollX + 6) + 'px';
        marker.style.top = (rect.top + window.scrollY + 6) + 'px';
        marker.textContent = selected.size;
        document.body.appendChild(marker);
        img.__img_collector_marker = marker;
      }
    } catch (e) { console.error(e); }
  }

  // fetch blob helper
  async function fetchBlob(url) {
    // try to fetch with credentials omitted
    try {
      const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!resp.ok) throw new Error('Failed to fetch ' + url);
      return await resp.blob();
    } catch (e) {
      console.warn('Fetch failed, trying via proxy failed: ', e);
      // final fallback: try fetch with no-cors (will produce opaque response) - not ideal
      const resp = await fetch(url, { mode: 'no-cors' });
      return await resp.blob();
    }
  }

  async function exportSelection() {
    if (selected.size === 0) {
      Swal.fire('No images selected', 'Please select images first.', 'warning');
      return;
    }
    const exportType = document.getElementById('__img_collector_export').value;
    const arr = Array.from(selected);
    if (exportType === 'zip') {
      await exportZip(arr);
    } else if (exportType === 'pdf') {
      await exportPdf(arr);
    } else {
      await exportOneByOne(arr);
    }
  }

  async function exportZip(urls) {
    Swal.fire({ title: 'Preparing ZIP...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    const zip = new JSZip();
    let i = 0;
    for (const u of urls) {
      i++;
      try {
        const blob = await fetchBlob(u);
        const name = filenameFromUrl(u, 'image-' + i);
        zip.file(name, blob);
      } catch (e) {
        console.error('Failed to fetch', u, e);
      }
      Swal.getContent().textContent = `Adding ${i}/${urls.length}`;
    }
    const content = await zip.generateAsync({ type: 'blob' }, prog => {
      // could show progress
    });
    saveAs(content, `images-${Date.now()}.zip`);
    Swal.close();
    SwalToast('ZIP ready', 'success');
  }

  async function exportPdf(urls) {
    Swal.fire({ title: 'Preparing PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'px', format: 'a4' }); // px — we'll scale images to fit
    let first = true;
    let i = 0;
    for (const u of urls) {
      i++;
      try {
        const blob = await fetchBlob(u);
        const imgBitmap = await createImageBitmap(blob);
        // scale to fit A4 595x842 px (approx)
        const maxW = 595 - 40;
        const maxH = 842 - 40;
        let w = imgBitmap.width;
        let h = imgBitmap.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
        // draw onto canvas
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgBitmap, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (!first) doc.addPage();
        doc.addImage(dataUrl, 'JPEG', 20, 20, w, h);
        first = false;
      } catch (e) {
        console.error('Failed to add image to PDF', u, e);
      }
      Swal.getContent().textContent = `Adding ${i}/${urls.length}`;
    }
    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, `images-${Date.now()}.pdf`);
    Swal.close();
    SwalToast('PDF ready', 'success');
  }

  async function exportOneByOne(urls) {
    Swal.fire({ title: 'Downloading images...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    let i = 0;
    for (const u of urls) {
      i++;
      try {
        const blob = await fetchBlob(u);
        const name = filenameFromUrl(u, 'image-' + i);
        saveAs(blob, name);
      } catch (e) {
        console.error('Failed to download', u, e);
      }
      Swal.getContent().textContent = `Downloaded ${i}/${urls.length}`;
    }
    Swal.close();
    SwalToast('Downloads complete', 'success');
  }

  function cleanup() {
    try {
      restoreRedirects();
      // remove injected UI
      const root = document.getElementById('__img_collector_root');
      if (root && root.parentNode) root.parentNode.removeChild(root);
      const style = document.getElementById('__img_collector_style');
      if (style && style.parentNode) style.parentNode.removeChild(style);
      // remove markers and classes
      document.querySelectorAll('.__img_collector_selected').forEach(img => {
        img.classList.remove('__img_collector_selected');
        if (img.__img_collector_marker) img.__img_collector_marker.remove();
      });
      // clear global flags
      window.__IMG_COLLECTOR_ACTIVE = false;
      window.__IMG_COLLECTOR_TOGGLE = null;
      SwalToast('Collector stopped', 'info');
    } catch (e) {
      console.error(e);
    }
  }

})();
