// telegraph-gallery.js - Host this file on your server
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
                title: 'Create Telegraph Gallery',
                html: `<input id="telegraph-title" class="swal2-input" placeholder="Gallery title" value="${document.title.replace(/[^\w\s]/gi, '').substring(0, 50)}">
                       <p>Found ${imageUrls.length} images</p>`,
                showCancelButton: true,
                confirmButtonText: 'Create Gallery',
                preConfirm: () => {
                    let title = document.getElementById('telegraph-title').value;
                    if (!title) {
                        Swal.showValidationMessage('Title is required');
                        return false;
                    }
                    return { title: title, images: imageUrls };
                }
            }).then(result => {
                if (result.isConfirmed) {
                    createTelegraphGallery(result.value.title, result.value.images);
                }
            });
        }

        async function createTelegraphGallery(title, imageUrls) {
            Swal.fire({
                title: 'Creating Gallery...',
                html: `Uploading images to Telegraph<br><small>0/${imageUrls.length}</small>`,
                allowOutsideClick: false,
                showConfirmButton: false
            });

            let telegraphContent = [];

            for (let i = 0; i < imageUrls.length; i++) {
                try {
                    let uploadResult = await uploadToTelegraph(imageUrls[i]);
                    if (uploadResult && uploadResult[0] && uploadResult[0].src) {
                        telegraphContent.push({
                            tag: 'img',
                            attrs: { src: uploadResult[0].src }
                        });
                        Swal.update({
                            html: `Uploading images to Telegraph<br><small>${i + 1}/${imageUrls.length}</small>`
                        });
                    }
                } catch (e) {
                    console.error('Upload failed:', e);
                }
            }

            if (telegraphContent.length === 0) {
                Swal.fire('Error', 'No images were uploaded successfully', 'error');
                return;
            }

            // Create Telegraph page
            let pageData = {
                title: title,
                content: JSON.stringify(telegraphContent)
            };

            fetch('https://api.telegra.ph/createPage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pageData)
            })
            .then(r => r.json())
            .then(result => {
                if (result.ok) {
                    Swal.fire({
                        title: 'Gallery Created!',
                        html: `Your Telegraph gallery is ready:<br>
                               <a href="${result.result.url}" target="_blank">${result.result.url}</a>`,
                        icon: 'success'
                    });
                } else {
                    Swal.fire('Error', 'Failed to create Telegraph page', 'error');
                }
            })
            .catch(err => {
                Swal.fire('Error', 'Network error: ' + err.message, 'error');
            });
        }

        async function uploadToTelegraph(imageUrl) {
            let formData = new FormData();
            try {
                let response = await fetch(imageUrl);
                let blob = await response.blob();
                formData.append('file', blob);
                
                let uploadResponse = await fetch('https://telegra.ph/upload', {
                    method: 'POST',
                    body: formData
                });
                return await uploadResponse.json();
            } catch (e) {
                return null;
            }
        }
    }
})();
