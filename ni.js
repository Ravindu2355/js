(function () {
    const MAX_Z_INDEX = "999999";
    const STORAGE_KEY = "network_requests";

    let requests = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // Create floating inspect button
    const btn = document.createElement("button");
    btn.innerText = "🔍 Inspect";
    Object.assign(btn.style, {
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: MAX_Z_INDEX,
        padding: "10px",
        borderRadius: "5px",
        background: "#ff4757",
        color: "white",
        border: "none",
        cursor: "pointer",
        boxShadow: "2px 2px 10px rgba(0,0,0,0.2)"
    });
    document.body.appendChild(btn);

    // Create the log window
    const logDiv = document.createElement("div");
    Object.assign(logDiv.style, {
        position: "fixed",
        bottom: "50px",
        right: "10px",
        width: "380px",
        height: "450px",
        overflowY: "auto",
        background: "white",
        border: "1px solid #ccc",
        padding: "10px",
        zIndex: MAX_Z_INDEX,
        fontSize: "12px",
        display: "none",
        boxShadow: "2px 2px 10px rgba(0,0,0,0.3)",
        resize: "both",
        overflow: "auto"
    });

    document.body.appendChild(logDiv);

    // Draggable functionality
    let isDragging = false, offsetX, offsetY;
    logDiv.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - logDiv.getBoundingClientRect().left;
        offsetY = e.clientY - logDiv.getBoundingClientRect().top;
        logDiv.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        logDiv.style.left = `${e.clientX - offsetX}px`;
        logDiv.style.top = `${e.clientY - offsetY}px`;
        logDiv.style.position = "fixed";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        logDiv.style.cursor = "default";
    });

    // Toggle visibility
    btn.addEventListener("click", () => {
        logDiv.style.display = logDiv.style.display === "none" ? "block" : "none";
        updateUI();
    });

    function logRequest(type, method, url, status) {
        const color = status >= 200 && status < 300 ? "green"  // Success (2xx)
                     : status >= 400 ? "red"                  // Error (4xx, 5xx)
                     : "orange";                              // Pending (No status yet)

        const requestEntry = { type, method, url, status, color, timestamp: new Date().toLocaleTimeString() };
        requests.push(requestEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
        updateUI();
    }

    function updateUI() {
        logDiv.innerHTML = `
            <b>Network Requests</b> 
            <span style="float:right;cursor:pointer;color:red;" onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload();">❌ Clear</span>
            <hr>
        `;
        requests.forEach(req => {
            const item = document.createElement("div");
            item.innerHTML = `
                <span style="color:${req.color};font-weight:bold;">${req.status || "Pending"}</span> 
                <span style="color:blue">${req.method}</span> → 
                <b>${req.url}</b> 
                <small style="color:gray">[${req.timestamp}]</small>
            `;
            item.style.padding = "5px 0";
            logDiv.appendChild(item);
        });
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    // Capture Fetch API requests
    (function () {
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = args[0];
            logRequest("FETCH", "GET", url, 0);  // Mark as pending
            try {
                const response = await originalFetch.apply(this, args);
                logRequest("FETCH", "GET", url, response.status);
                return response;
            } catch (error) {
                logRequest("FETCH", "GET", url, 500);
                throw error;
            }
        };
    })();

    // Capture XMLHttpRequest requests
    (function () {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.addEventListener("readystatechange", () => {
                if (this.readyState === 4) { // Completed request
                    logRequest("XHR", method, url, this.status);
                }
            });
            logRequest("XHR", method, url, 0);  // Mark as pending
            originalXHROpen.apply(this, arguments);
        };
    })();

    // Capture image, script, and CSS requests
    (function () {
        function captureResourceLoad(event) {
            const url = event.target.src || event.target.href;
            if (url) logRequest("RESOURCE", "GET", url, 200);
        }
        window.addEventListener("load", () => {
            document.querySelectorAll("img, script, link[rel='stylesheet']").forEach(el => {
                el.addEventListener("error", () => logRequest("RESOURCE", "GET", el.src || el.href, 404));
                el.addEventListener("load", captureResourceLoad);
            });
        });
    })();

    // Initialize UI with stored requests
    updateUI();
})();
