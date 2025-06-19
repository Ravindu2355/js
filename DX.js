(async () => {
  const ch = "-1002316025710";
  let taskar = [];
  let mode = 0;

  // Load SweetAlert2 (dark theme) if needed
  if (!window.Swal) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/dark.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    document.head.appendChild(script);
    await new Promise(r => (script.onload = r));
  }

  // Create console panel
  const rxConsoleDiv = document.createElement("div");
  rxConsoleDiv.id = "rx-console";
  rxConsoleDiv.innerHTML = `
    <div class="rx-console-header">
      <span>Console</span><button id="rx-close">✖</button>
    </div>
    <div class="rx-console-body" id="rx-body"></div>`;
  document.body.appendChild(rxConsoleDiv);

  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    #rx-console {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #111;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      width: 300px;
      overflow-y: auto;
      border: 1px solid #0f0;
      z-index: 999999;
      display: none;
    }
    .rx-console-header {
      background: #222;
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rx-console-body {
      padding: 4px;
      max-height: 260px;
      overflow-y: auto;
    }
    .rx-console-log { color: #0f0; margin: 2px 0; }
    .rx-console-error { color: #f00; margin: 2px 0; }
    .rx-btn {
      position: fixed;
      z-index: 999999;
      background: #222;
      color: #fff;
      padding: 10px 14px;
      font-size: 14px;
      font-family: sans-serif;
      border-radius: 8px;
      box-shadow: 0 0 10px #000;
      cursor: pointer;
      user-select: none;
    }
    .rx-left { top: 10px; left: 10px; }
    .rx-right { top: 10px; right: 10px; }
  `;
  document.head.appendChild(styleEl);

  // Toggle console
  document.getElementById("rx-close").onclick = () => {
    const d = rxConsoleDiv.style.display === "none" ? "block" : "none";
    rxConsoleDiv.style.display = d;
  };

  // Logging overrides
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => {
    origLog(...args);
    appendLog(args.join(" "), false);
  };
  console.error = (...args) => {
    origErr(...args);
    appendLog(args.join(" "), true);
  };
  function appendLog(msg, isErr = false) {
    const line = document.createElement("div");
    line.className = isErr ? "rx-console-error" : "rx-console-log";
    line.textContent = msg;
    document.getElementById("rx-body").appendChild(line);
  }

  // SweetAlert wrappers
  const alertSwal = msg => Swal.fire({ title: "Info", text: msg, icon: "info" });
  const promptSwal = msg =>
    Swal.fire({
      title: "Input",
      input: "text",
      inputLabel: msg,
      showCancelButton: true,
    }).then(r => r.value);
  const confirmSwal = msg =>
    Swal.fire({
      title: "Confirm",
      text: msg,
      icon: "question",
      showCancelButton: true,
    }).then(r => r.isConfirmed);

  // Task handlers
  async function addTask(url, chat_id, type, thumbnail_url = null) {
    const data = { url, chat_id, type, thumbnail_url };
    if (mode === 0) {
      try {
        const res = await fetch("https://joyous-locust-gimhan-3992e08d.koyeb.app/add_task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.status === "success") {
          console.log("Task added:", result.message);
          await alertSwal(result.message);
        } else console.error("Error adding task:", result.message);
      } catch (e) {
        console.error("Fetch error:", e);
      }
    } else {
      taskar.push(data);
      if (mode === 1) await alertSwal(`Added: ${JSON.stringify(data)}\nCount: ${taskar.length}`);
    }
  }

  async function sendTasks() {
    try {
      const res = await fetch("https://joyous-locust-gimhan-3992e08d.koyeb.app/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: taskar }),
      });
      const result = await res.json();
      if (result.status === "success") {
        console.log("Tasks sent:", result.message);
        await alertSwal(result.message);
      } else console.error("Error sending tasks:", result.message);
    } catch (e) {
      console.error("Send error:", e);
    }
  }

  async function exall() {
    console.log("Running extractor...");
    const host = window.location.origin;
    const kw = await promptSwal("Enter keyword to extract links:");
    if (!kw) return;
    await alertSwal(`Searching for "${kw}" on ${host}`);
    document.querySelectorAll("a").forEach(a => {
      let href = a.href;
      if (href.includes(kw)) {
        if (!href.startsWith("http")) href = host + (href.startsWith("/") ? "" : "/") + href;
        const data = { url: href, chat_id: ch, type: "desi_page", thumbnail_url: null };
        if (!taskar.some(t => t.url === href)) taskar.push(data);
      }
    });
    await alertSwal(`Found ${taskar.length} links.`);
  }

  // UI buttons and anchors
  function setupUI() {
    const o = (cls, txt, dbl) => {
      const bt = document.createElement("div");
      bt.className = `rx-btn ${cls}`;
      bt.textContent = txt;
      bt.ondblclick = dbl;
      return bt;
    };
    const btnM = o("rx-left", "Mode: 0", async () => {
      mode = (mode + 1) % 3;
      btnM.textContent = `Mode: ${mode}`;
      await alertSwal(
        ["Mode 0: Immediate", "Mode 1: Queue", "Mode 2: Extract"][mode]
      );
    });
    const btnS = o("rx-right", "Send", async () => {
      if (mode === 2) await exall();
      await sendTasks();
    });
    document.body.appendChild(btnM);
    document.body.appendChild(btnS);

    document.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", e => e.preventDefault());
      a.addEventListener("dblclick", async e => {
        e.preventDefault();
        const ok = await confirmSwal(`Add this link?\n${a.href}`);
        if (ok) {
          let hr = a.href;
          if (!hr.startsWith("http"))
            hr = window.location.origin + (hr.startsWith("/") ? "" : "/") + hr;
          await addTask(hr, ch, "desi_page");
        }
      });
    });
  }

  // Init
  setupUI();
  rxConsoleDiv.style.display = "block";
})();
