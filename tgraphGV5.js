// telegraph-gallery-direct.js - Send img tags with original URLs + Telegraph publish
(function() {
    // Load SweetAlert2 if not already loaded
    if (typeof Swal === 'undefined') {
        let script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);

        let checkLoad = setInterval(() => {
            if (typeof Swal !== 'undefined') {
                clearInterval(checkLoad);
                initGallery();
            }
        }, 100);
    } else {
        initGallery();
    }

    function initGallery() {
        // Add custom styles
        let style = document.createElement('style');
        style.textContent = `
            .telegraph-gallery-highlight {
                border: 3px solid #0088cc !important;
                transition: all 0.3s ease !important;
            }
            .telegraph-gallery-selected {
                border: 3px solid #00cc88 !important;
                box-shadow: 0 0 10px rgba(0,204,136,0.5) !important;
            }
        `;
        document.head.appendChild(style);

        let images = Array.from(document.images).filter(img =>
            img.naturalWidth > 100 && img.naturalHeight > 100
        );

        if (images.length === 0) {
            Swal.fire('No Images', 'No suitable images found on this page.', 'info');
            return;
        }

        let selectedImages = new Set();

        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.classList.add('telegraph-gallery-highlight');
            img.addEventListener('click', handleImageClick);
        });

        function handleImageClick(e) {
            e.stopPropagation();
            e.preventDefault();

            let img = this;

            if (selectedImages.has(img)) {
                selectedImages.delete(img);
                img.classList.remove('telegraph-gallery-selected');
                img.classList.add('telegraph-gallery-highlight');
            } else {
                selectedImages.add(img);
                img.classList.remove('telegraph-gallery-highlight');
                img.classList.add('telegraph-gallery-selected');
            }

            if (e.detail === 2) {
                processImages(img);
            }
        }

        function processImages(triggerImg) {
            let similarImages = images.filter(img => {
                let props = [];
                if (triggerImg.className) props.push('class:' + triggerImg.className);
                if (triggerImg.src.includes('.')) {
                    let domain = triggerImg.src.split('/').slice(0, 3).join('/');
                    if (img.src.startsWith(domain)) props.push('domain-match');
                }
                return props.length > 0;
            });

            let finalImages = similarImages.length > 1 ? similarImages : [triggerImg];
            let imageUrls = finalImages.map(img => img.src || img.srcset || img.dataset.src)
                .filter(url => url && (url.startsWith('http') || url.startsWith('//')));

            Swal.fire({
                title: 'Generate Image Tags',
                html: `<input id="telegraph-title" class="swal2-input" placeholder="Gallery title (optional)" value="${document.title.replace(/[^\w\s]/gi, '').substring(0, 50)}">
                       <p>Found ${imageUrls.length} images</p>
                       <div style="text-align:left;margin:10px 0;">
                         <label><input type="checkbox" id="add-styles" checked> Add responsive styles</label><br>
                         <label><input type="checkbox" id="include-original" checked> Include original URLs</label>
                       </div>`,
                showCancelButton: true,
                confirmButtonText: 'Generate HTML',
                preConfirm: () => {
                    return {
                        title: document.getElementById('telegraph-title').value,
                        images: imageUrls,
                        addStyles: document.getElementById('add-styles').checked,
                        includeOriginal: document.getElementById('include-original').checked
                    };
                }
            }).then(result => {
                if (result.isConfirmed) {
                    generateImageTags(result.value.title, result.value.images, result.value.addStyles, result.value.includeOriginal);
                }
            });
        }

        function generateImageTags(title, imageUrls, addStyles, includeOriginal) {
            let htmlContent = '';

            if (title) {
                htmlContent += `<h1>${title}</h1>\n\n`;
            }

            imageUrls.forEach((url, index) => {
                if (addStyles) {
                    htmlContent += `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Image ${index + 1}">\n\n`;
                } else {
                    htmlContent += `<img src="${url}" alt="Image ${index + 1}">\n\n`;
                }
                if (includeOriginal) {
                    htmlContent += `<small>Source: <a href="${url}" target="_blank">${url}</a></small>\n\n`;
                }
            });

            let fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title || 'Image Gallery'}</title>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

            Swal.fire({
                title: 'HTML Generated!',
                html: `
                    <div style="text-align:left;max-height:300px;overflow-y:auto;background:#f5f5f5;padding:10px;border-radius:5px;">
                        <pre style="white-space:pre-wrap;font-size:12px;">${htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                    <p style="margin-top:15px;">Choose an action below.</p>
                `,
                icon: 'success',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Copy HTML',
                denyButtonText: 'Create Telegraph',
                cancelButtonText: 'Cancel'
            }).then(result => {
                if (result.isConfirmed) {
                    copyToClipboard(htmlContent);
                    Swal.fire('Copied!', 'Image tags copied to clipboard.', 'success');
                } else if (result.isDenied) {
                    telegraphCreatePage(title || 'Image Gallery', htmlContent);
                }
            });
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).catch(() => {
                let ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            });
        }

        function getTelegraphToken() {
            let token = localStorage.getItem("telegraph_token");
            if (token) return Promise.resolve(token);

            return Swal.fire({
                title: 'Telegraph API Token',
                input: 'text',
                inputLabel: 'Enter your Telegraph access_token',
                inputPlaceholder: 'Paste token here',
                showCancelButton: true,
                confirmButtonText: 'Save'
            }).then(res => {
                if (res.isConfirmed && res.value) {
                    localStorage.setItem("telegraph_token", res.value.trim());
                    return res.value.trim();
                } else {
                    throw new Error("Telegraph token required.");
                }
            });
        }

        function telegraphCreatePage(title, content) {
            getTelegraphToken().then(token => {
                Swal.fire({
                    title: 'Publishing...',
                    text: 'Creating Telegraph page, please wait...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                // GET request instead of POST
                let params = new URLSearchParams({
                    access_token: token,
                    title: title,
                    author_name: "Telegraph Gallery",
                    return_content: "true",
                    content: JSON.stringify([{ tag: "div", children: [content] }])
                });

                fetch(`https://api.telegra.ph/createPage?${params.toString()}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.ok) {
                            Swal.fire({
                                title: 'Telegraph Page Created!',
                                html: `<a href="${data.result.url}" target="_blank">${data.result.url}</a>`,
                                icon: 'success'
                            });
                        } else {
                            Swal.fire('Error', data.error || 'Failed to create page.', 'error');
                        }
                    })
                    .catch(err => {
                        Swal.fire('Error', 'Request failed: ' + err.message, 'error');
                    });
            }).catch(err => {
                Swal.fire('Cancelled', err.message, 'info');
            });
        }
    }
})();
