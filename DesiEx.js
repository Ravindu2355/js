ch = "-1002316025710";
taskar = [];
mode = 0;

function addTask(url, chat_id, type, thumbnail_url = null) {
    if (mode == 0) {
        const data = { url, chat_id, type };
        fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/add_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Task added:', data.message);
                    alert(data.message);
                } else {
                    console.error('Error adding task:', data.message);
                }
            }).catch(console.error);
    } else {
        const data = { url, chat_id, type, thumbnail_url: null };
        taskar.push(data);
        if (mode == 1) {
            alert(`Added to list: ${JSON.stringify(data)} | Total: ${taskar.length}`);
        }
    }
}

function asp(message) {
    return new Promise(resolve => {
        const result = confirm(message);
        resolve(result);
    });
}

function sendTasks() {
    const data = { tasks: taskar };
    fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('Tasks sent:', data.message);
                alert(data.message);
            } else {
                console.error('Error sending tasks:', data.message);
            }
        }).catch(console.error);
}

function get_host(url) {
    return window.location.origin;
}

async function exall() {
    console.log("Running extractor...");
    const host = get_host(location.href);
    const keyword = await prompt("Enter common part of links to extract:");
    if (keyword && keyword.trim() !== "") {
        alert(`Searching for links with: "${keyword}" on ${host}`);
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
        alert(`Found ${taskar.length} links! Sending...`);
    }
}

async function init() {
    const baseURL = location.href;
    const host = get_host(baseURL);

    const style = document.createElement("style");
    style.innerHTML = `
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
a {
    background: #def8db !important;
    padding: 4px !important;
    color: #c91d1d !important;
}
`;
    document.head.appendChild(style);

    const btnMode = document.createElement('div');
    btnMode.className = "rx-btn rx-left";
    btnMode.textContent = "Mode: 0";
    btnMode.ondblclick = () => {
        mode = (mode + 1) % 3;
        btnMode.textContent = `Mode: ${mode}`;
        alert([
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

    document.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', e => e.preventDefault());
        anchor.addEventListener('dblclick', async e => {
            e.preventDefault();
            const confirmed = await asp(`Add this link?\n${anchor.href}`);
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

// Uncomment below line to auto-run when the script is injected
// init();
