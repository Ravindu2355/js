function init(){
  // Load SweetAlert2
  if (typeof Swal === 'undefined') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js';
    script.onload = initBookmarklet;
    document.head.appendChild(script);
  } else {
    initBookmarklet();
  }

  function initBookmarklet() {
    // Show confirmation
    Swal.fire({
      title: 'Video Extractor Activated',
      text: 'Double-click on any link to extract video sources. Click OK to continue.',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Prevent all link redirections
      preventLinkRedirections();
      
      // Add double-click listener to links
      document.addEventListener('dblclick', handleDoubleClick);
      
      // Show status indicator
      showStatusIndicator();
    });
  }

  function preventLinkRedirections() {
    // Method 1: Prevent default on click
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    
    // Method 2: Remove href attributes temporarily
    document.querySelectorAll('a').forEach(link => {
      link.dataset.originalHref = link.href;
      link.href = 'javascript:void(0)';
    });
  }

  function handleDoubleClick(e) {
    let target = e.target;
    let link = target.closest('a');
    
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      
      const url = link.dataset.originalHref || link.href;
      
      if (url && url.startsWith('http')) {
        extractVideoData(url);
      } else {
        Swal.fire('Error', 'No valid URL found for this link.', 'error');
      }
    }
  }

  function extractVideoData(url) {
    Swal.fire({
      title: 'Extracting Video Data',
      text: 'Please wait while we extract video information...',
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false
    });
    
    // Your Google Apps Script endpoint
    const endpoint = 'https://script.google.com/macros/s/AKfycbwq0ix26hILtUpPqx3jd2glvCcG1Qb8-RVvLVB-9N--jzOou7GYuItkBzfbL212Y9oWsw/exec';
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    })
    .then(response => response.json())
    .then(data => {
      Swal.close();
      if (data.status === 'success') {
        createVideoPlayer(data.data);
      } else {
        Swal.fire('Error', data.message || 'Failed to extract video data', 'error');
      }
    })
    .catch(error => {
      Swal.close();
      Swal.fire('Error', 'Failed to connect to the extraction service', 'error');
      console.error(error);
    });
  }

  function createVideoPlayer(videoData) {
    // Remove existing player if any
    const existingPlayer = document.getElementById('videoExtractorPlayer');
    if (existingPlayer) {
      existingPlayer.remove();
    }
    
    // Create player container
    const playerContainer = document.createElement('div');
    playerContainer.id = 'videoExtractorPlayer';
    playerContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 640px;
      max-width: 90vw;
      background: #1a1a1a;
      color: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 10000;
      font-family: Arial, sans-serif;
      overflow: hidden;
      transition: all 0.3s ease;
    `;
    
    // Create header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: #252525;
      border-bottom: 1px solid #333;
    `;
    
    const title = document.createElement('h3');
    title.textContent = videoData.title || 'Video Player';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70%;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    `;
    closeBtn.addEventListener('click', () => {
      playerContainer.remove();
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.style.cssText = `
      width: 100%;
      max-height: 360px;
      background: #000;
    `;
    videoElement.controls = true;
    videoElement.poster = videoData.videoPoster || '';
    
    if (videoData.videoSources && videoData.videoSources.length > 0) {
      videoData.videoSources.forEach(src => {
        const source = document.createElement('source');
        source.src = src;
        // Try to detect type from extension
        if (src.includes('.mp4')) source.type = 'video/mp4';
        else if (src.includes('.webm')) source.type = 'video/webm';
        else if (src.includes('.ogg')) source.type = 'video/ogg';
        videoElement.appendChild(source);
      });
    }
    
    // Create source selector if multiple sources
    let sourceSelector = null;
    if (videoData.videoSources && videoData.videoSources.length > 1) {
      const selectorContainer = document.createElement('div');
      selectorContainer.style.cssText = `
        padding: 10px 20px;
        background: #252525;
        border-top: 1px solid #333;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      
      const label = document.createElement('span');
      label.textContent = 'Video Quality:';
      label.style.fontSize = '14px';
      
      sourceSelector = document.createElement('select');
      sourceSelector.style.cssText = `
        flex: 1;
        padding: 8px;
        border-radius: 4px;
        background: #333;
        color: white;
        border: 1px solid #555;
      `;
      
      videoData.videoSources.forEach((src, index) => {
        const option = document.createElement('option');
        option.value = src;
        option.textContent = `Source ${index + 1}`;
        // Try to detect quality from URL
        if (src.includes('1080')) option.textContent += ' (1080p)';
        else if (src.includes('720')) option.textContent += ' (720p)';
        else if (src.includes('480')) option.textContent += ' (480p)';
        else if (src.includes('360')) option.textContent += ' (360p)';
        sourceSelector.appendChild(option);
      });
      
      sourceSelector.addEventListener('change', () => {
        const newSrc = sourceSelector.value;
        videoElement.src = newSrc;
        videoElement.load();
        videoElement.play();
      });
      
      selectorContainer.appendChild(label);
      selectorContainer.appendChild(sourceSelector);
      playerContainer.appendChild(selectorContainer);
    }
    
    // Create download buttons
    const downloadContainer = document.createElement('div');
    downloadContainer.style.cssText = `
      padding: 15px 20px;
      background: #252525;
      border-top: 1px solid #333;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    `;
    
    if (videoData.videoSources && videoData.videoSources.length > 0) {
      videoData.videoSources.forEach((src, index) => {
        const downloadBtn = document.createElement('a');
        downloadBtn.href = src;
        downloadBtn.download = `video_source_${index + 1}.mp4`;
        downloadBtn.target = '_blank';
        downloadBtn.style.cssText = `
          padding: 8px 15px;
          background: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        `;
        
        const icon = document.createElement('span');
        icon.innerHTML = '&#x2193;'; // Down arrow
        downloadBtn.appendChild(icon);
        
        const text = document.createElement('span');
        let qualityText = `Download ${index + 1}`;
        if (src.includes('1080')) qualityText = 'Download 1080p';
        else if (src.includes('720')) qualityText = 'Download 720p';
        else if (src.includes('480')) qualityText = 'Download 480p';
        else if (src.includes('360')) qualityText = 'Download 360p';
        
        text.textContent = qualityText;
        downloadBtn.appendChild(text);
        
        downloadContainer.appendChild(downloadBtn);
      });
    } else {
      const noSources = document.createElement('div');
      noSources.textContent = 'No video sources found';
      noSources.style.color = '#ccc';
      downloadContainer.appendChild(noSources);
    }
    
    // Assemble the player
    playerContainer.appendChild(header);
    playerContainer.appendChild(videoElement);
    playerContainer.appendChild(downloadContainer);
    
    // Add to page
    document.body.appendChild(playerContainer);
    
    // Auto play the first source
    if (videoData.videoSources && videoData.videoSources.length > 0) {
      videoElement.src = videoData.videoSources[0];
      videoElement.load();
    }
  }

  function showStatusIndicator() {
    // Remove existing indicator if any
    const existingIndicator = document.getElementById('videoExtractorStatus');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create status indicator
    const indicator = document.createElement('div');
    indicator.id = 'videoExtractorStatus';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      z-index: 9999;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    `;
    
    const text = document.createElement('span');
    text.textContent = 'Video Extractor Active';
    
    indicator.appendChild(dot);
    indicator.appendChild(text);
    
    // Add styles for animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(indicator);
    
    // Make indicator draggable
    let isDragging = false;
    let offset = [0, 0];
    
    indicator.addEventListener('mousedown', function(e) {
      isDragging = true;
      offset = [
        indicator.offsetLeft - e.clientX,
        indicator.offsetTop - e.clientY
      ];
    });
    
    document.addEventListener('mousemove', function(e) {
      e.preventDefault();
      if (isDragging) {
        indicator.style.left = (e.clientX + offset[0]) + 'px';
        indicator.style.top = (e.clientY + offset[1]) + 'px';
      }
    });
    
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });
    
    // Click to deactivate
    indicator.addEventListener('click', function() {
      // Remove event listeners
      document.removeEventListener('dblclick', handleDoubleClick);
      
      // Restore original links
      document.querySelectorAll('a').forEach(link => {
        if (link.dataset.originalHref) {
          link.href = link.dataset.originalHref;
        }
      });
      
      // Remove indicator
      indicator.remove();
      
      Swal.fire('Deactivated', 'Video extractor has been deactivated', 'info');
    });
  }
}
