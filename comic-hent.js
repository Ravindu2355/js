(async () => {
    "use strict";

    const CONFIG = {
        api: "https://fbex-ten.vercel.app/api/fetch?url=",
        sweetalert: "https://cdn.jsdelivr.net/npm/sweetalert2@11",
        jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    };

    const loadScript = url => new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(s);
    });

    await loadScript(CONFIG.sweetalert);
    await loadScript(CONFIG.jspdf);

    const { jsPDF } = window.jspdf;
    const img = document.querySelector("#gimg");
    const total = Number(document.querySelector(".total_pages")?.textContent?.trim());

    if (!img || !total)
        return Swal.fire("Error", "Image or page count not found.", "error");

    let src = img.getAttribute("src") || img.getAttribute("data-src");
    if (!src) return Swal.fire("Error", "Image URL not found.", "error");
    if (src.startsWith("//")) src = "https:" + src;

    const match = src.match(/^(.*\/)(\d+)(\.[^.\/?#]+)/);
    if (!match)
        return Swal.fire("Error", "Numbered image URL not detected.", "error");

    const base = match[1];
    const ext = match[3];

    const { value: name } = await Swal.fire({
        title: "PDF File Name",
        input: "text",
        inputValue: (document.title || "images")
            .replace(/[\\/:*?"<>|]/g, " ")
            .trim(),
        showCancelButton: true,
        confirmButtonText: "Create PDF"
    });

    if (!name) return;

    const status = document.createElement("div");
    status.style = `
        position:fixed;
        bottom:15px;
        left:15px;
        background:#171717;
        color:#fff;
        padding:12px 16px;
        border-radius:10px;
        font:14px Arial,sans-serif;
        z-index:999999;
        box-shadow:0 4px 20px #0008;
    `;
    document.body.appendChild(status);

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
    });

    const loadImage = url => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image failed to load"));
        image.src = url;
    });

    /*
     * Your Vercel API returns TEXT.
     * Try to find an image URL inside that text.
     */
    const getImageUrl = async originalUrl => {
        const apiUrl =
            CONFIG.api + encodeURIComponent(originalUrl);

        const response = await fetch(apiUrl, {
            cache: "no-store"
        });

        if (!response.ok)
            throw new Error(`API HTTP ${response.status}`);

        let text = await response.text();

        // Decode common HTML/JSON escaping.
        text = text
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/\\\//g, "/")
            .replace(/\\u002F/g, "/");

        const found =
            text.match(/(?:src|href)\s*=\s*["']([^"']+)["']/i) ||
            text.match(/https?:\/\/[^"'<> \s]+\.(?:jpg|jpeg|png|webp)(?:[?#][^"'<> \s]*)?/i) ||
            text.match(/(?:https?:)?\/\/[^"'<> \s]+\.(?:jpg|jpeg|png|webp)(?:[?#][^"'<> \s]*)?/i);

        if (found) {
            let url = found[1] || found[0];
            if (url.startsWith("//")) url = "https:" + url;
            return url;
        }

        // Nothing useful found in API response.
        return originalUrl;
    };

    for (let page = 1; page <= total; page++) {
        status.textContent = `⬇️ Loading ${page}/${total}...`;

        try {
            const originalUrl =`${base}${page}${ext}`;
            const imageUrl = await getImageUrl(originalUrl);
            const image = await loadImage(imageUrl);

            /*
             * Convert image to JPEG for jsPDF.
             */
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext("2d").drawImage(image, 0, 0);
            const data =canvas.toDataURL(
                    "image/jpeg",
                    0.92
                );

            /*
             * Fit image inside A4.
             */
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const scale = Math.min(
                    pageWidth / image.naturalWidth,
                    pageHeight / image.naturalHeight
                );

            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;
            if (page > 1) pdf.addPage();
            pdf.addImage(
                data,
                "JPEG",
                x,
                y,
                width,
                height
            );

        } catch (error) {
            console.error(`Page ${page} failed:`,error);
            status.textContent =`❌ Failed page ${page}`;
            await new Promise(r =>setTimeout(r, 500));
        }
    }
    status.textContent = "💾 Saving PDF...";
    const filename =name.trim().replace(/\.pdf$/i, "") +".pdf";
    pdf.save(filename);
    status.textContent = "✅ PDF saved";
    setTimeout(() => status.remove(),4000);
})();
