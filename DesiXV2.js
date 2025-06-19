const ch = "-1002316025710";
    let taskar = [];
    let mode = 0;

    // Inject SweetAlert2 (Dark Theme)
    if (!window.Swal) {
        const swalCSS = document.createElement("link");
        swalCSS.rel = "stylesheet";
        swalCSS.href = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/dark.min.css";
        document.head.appendChild(swalCSS);

        const swalScript = document.createElement("script");
        swalScript.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        document.head.appendChild(swalScript);
        await new Promise(r => swalScript.onload = r);
    }

    // Override console
    const rxConsoleDiv = document.createElement("div");
    rxConsoleDiv.id = "rx-console";
    rxConsoleDiv.innerHTML = `<div class="rx-console-header">Console <button id="rx-close">✖</button></div><div class="rx-console-body" id="rx-body"></div>`;
    document.body.appendChild(rxConsoleDiv);

    const rxStyles = document.createElement("style");
    rxStyles.innerHTML = `
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
            padding: 4px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .rx-console-body {
            padding: 5px;
            max-height: 260px;
            overflow-y: auto;
        }
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
            user-select: none;
            cursor: pointer;
        }
        .rx-left { top: 10px; left: 10px; }
        .rx-right { top: 10px; right: 10px; }
        .rx-console-log { color: #0f0; margin: 2px 0; }
        .rx-console-error { color: #f00; margin: 2px 0; }
    `;
    document.head.appendChild(rxStyles);

    document.getElementById("rx-close").onclick = () => {
        rxConsoleDiv.style.display = rxConsoleDiv.style.display === "none" ? "block" : "none";
    };

    const log = (msg, isErr = false) => {
        const line = document.createElement("div");
        line.className = isErr ? "rx-console-error" : "rx-console-log";
        line.textContent = msg;
        document.getElementById("rx-body").appendChild(line);
    };

    // Hook console
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...args) => {
        origLog(...args);
        log(args.join(" "), false);
    };
    console.error = (...args) => {
        origErr(...args);
        log(args.join(" "), true);
    };

    async function alertSwal(message) {
        return Swal.fire({ title: "Info", text: message, icon: "info", toast: false });
    }

    async function promptSwal(message) {
        const { value } = await Swal.fire({
            title: "Input",
            input: "text",
            inputLabel: message,
            inputPlaceholder: "Type here...",
            inputAttributes: { autocapitalize: "off" },
            showCancelButton: true,
        });
        return value;
    }

    async function confirmSwal(message) {
        const { isConfirmed } = await Swal.fire({
            title: "Confirm",
            text: message,
            icon: "question",
            showCancelButton: true,
        });
        return isConfirmed;
    }

    async function addTask(url, chat_id, type, thumbnail_url = null) {
        const data = { url, chat_id, type, thumbnail_url };
        if (mode === 0) {
            try {
                const res = await fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/add_task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.status === 'success') {
                    console.log('Task added:', result.message);
                    await alertSwal(result.message);
                } else {
                    console.error('Error adding task:', result.message);
                }
            } catch (err) {
                console.error("Fetch error", err);
            }
        } else {
            taskar.push(data);
            if (mode === 1) {
                await alertSwal(`Added to list: ${JSON.stringify(data)}\nTotal: ${taskar.length}`);
            }
        }
    }

    async function sendTasks() {
        const data = { tasks: taskar };
        try {
            const res = await fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/multi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.status === 'success') {
                console.log('Tasks sent:', result.message);
                await alertSwal(result.message);
            } else {
                console.error('Error sending tasks:', result.message);
            }
        } catch (err) {
            console.error("Send error", err);
        }
    }

    function get_host(url) {
        return window.location.origin;
    }

    async function exall() {
        console.log("Running extractor...");
        const host = get_host(location.href);
        const keyword = await promptSwal("Enter common part of links to extract:");
        if (keyword && keyword.trim() !== "") {
            await alertSwal(`Searching for links with: "${keyword}" on ${host}`);
            document.querySelectorAll('a').forEach(a => {
                let link = a.href;
                if (link.includes(keyword)) {
                    if (!link.startsWith("http")) {
                        link = link.startsWith("/") ? host + link : host + "/" + link;
                    }
                    const data = { url: link, chat_id: ch, type: "desi_page", thumbnail_url: null };
                    if (!taskar.some(t => t.url === data.url)) {
                        taskar.push(data);
                    }
                }
            });
            await alertSwal(`Found ${taskar.length} links! Sending...`);
        }
    }

    function setupButtons() {
        const btnMode = document.createElement('div');
        btnMode.className = "rx-btn rx-left";
        btnMode.textContent = "Mode: 0";
        btnMode.ondblclick = async () => {
            mode = (mode + 1) % 3;
            btnMode.textContent = `Mode: ${mode}`;
            await alertSwal([
                "Mode 0: Upload task immediately on double click",
                "Mode 1: Add multiple tasks and send manually",
                "Mode 2: Extract multiple links and send"
            ][mode]);
        };

        const btnSend = document.createElement('div');
        btnSend.className = "rx-btn rx-right";
        btnSend.textContent = "Send";
        btnSend.ondblclick = async () => {
            if (mode === 2) {
                await exall();
            }
            await sendTasks();
        };

        document.body.appendChild(btnMode);
        document.body.appendChild(btnSend);
    }

    function setupAnchors() {
        const host = get_host(location.href);
        document.querySelectorAll('a').forEach(anchor => {
            anchor.addEventListener('click', e => e.preventDefault());
            anchor.addEventListener('dblclick', async e => {
                e.preventDefault();
                const confirmed = await confirmSwal(`Add this link?\n${anchor.href}`);
                if (confirmed) {
                    let hr = anchor.href;
                    if (!hr.includes("http")) {
                        hr = hr.startsWith("/") ? hr.slice(1) : hr;
                        hr = host + "/" + hr;
                    }
                    await addTask(hr, ch, "desi_page");
                }
            });
        });
    }

    setupButtons();
    setupAnchors();
    rxConsoleDiv.style.display = "block";
