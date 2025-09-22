// telegraph-gallery-direct.js - Send img tags with original URLs
(function() {
    // Load SweetAlert2 if not already loaded
    if (typeof Swal === 'undefined') {
        let script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
        
        // Wait for SweetAlert to load
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

        // Find suitable images
        let images = Array.from(document.images).filter(img => 
            img.naturalWidth > 100 && img.naturalHeight > 100
        );

        if (images.length === 0) {
            Swal.fire('No Images', 'No suitable images found on this page.', 'info');
            return;
        }

        let selectedImages = new Set();

        // Add click handlers
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.classList.add('telegraph-gallery-highlight');
            img.addEventListener('click', handleImageClick);
        });

        function handleImageClick(e) {
            e.stopPropagation();
            e.preventDefault();
            
            let img = this;
            
            // Toggle selection
            if (selectedImages.has(img)) {
                selectedImages.delete(img);
                img.classList.remove('telegraph-gallery-selected');
                img.classList.add('telegraph-gallery-highlight');
            } else {
                selectedImages.add(img);
                img.classList.remove('telegraph-gallery-highlight');
                img.classList.add('telegraph-gallery-selected');
            }

            // Double click to process
            if (e.detail === 2) {
                processImages(img);
            }
        }

        function processImages(triggerImg) {
            // Find similar images
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
                    let title = document.getElementById('telegraph-title').value;
                    let addStyles = document.getElementById('add-styles').checked;
                    let includeOriginal = document.getElementById('include-original').checked;
                    return { title: title, images: imageUrls, addStyles: addStyles, includeOriginal: includeOriginal };
                }
            }).then(result => {
                if (result.isConfirmed) {
                    generateImageTags(result.value.title, result.value.images, result.value.addStyles, result.value.includeOriginal);
                }
            });
        }

        function generateImageTags(title, imageUrls, addStyles, includeOriginal) {
            let htmlContent = '';
            
            // Add title if provided
            if (title) {
                htmlContent += `<h1>${title}</h1>\n\n`;
            }
            
            // Generate image tags
            imageUrls.forEach((url, index) => {
                if (addStyles) {
                    htmlContent += `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Image ${index + 1}">\n\n`;
                } else {
                    htmlContent += `<img src="${url}" alt="Image ${index + 1}">\n\n`;
                }
                
                // Include original URL if requested
                if (includeOriginal) {
                    htmlContent += `<small>Source: <a href="${url}" target="_blank">${url}</a></small>\n\n`;
                }
            });

            // Create final HTML document
            let fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Image Gallery'}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        img { display: block; margin: 20px auto; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

            // Show the result
            Swal.fire({
                title: 'HTML Generated!',
                html: `
                    <div style="text-align: left; max-height: 300px; overflow-y: auto; background: #f5f5f5; padding: 10px; border-radius: 5px;">
                        <pre style="white-space: pre-wrap; font-size: 12px;">${htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                    <p style="margin-top: 15px;">Copied to clipboard! Ready to paste.</p>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Copy HTML Only',
                cancelButtonText: 'View Full Page'
            }).then(result => {
                if (result.isConfirmed) {
                    // Copy just the image tags to clipboard
                    copyToClipboard(htmlContent);
                    Swal.fire('Copied!', 'Image tags copied to clipboard.', 'success');
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    // Show full HTML page
                    showFullHtmlPage(fullHtml, title || 'Image Gallery');
                }
            });

            // Copy to clipboard automatically
            copyToClipboard(htmlContent);
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).catch(err => {
                console.error('Clipboard copy failed: ', err);
                // Fallback method
                let textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            });
        }

        function showFullHtmlPage(html, title) {
            let newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();
            Swal.fire('Opened!', `Full HTML page opened in new tab: ${title}`, 'info');
        }
    }
})();
