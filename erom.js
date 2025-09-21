(async()=>{
  if(window.__dlGalleryActive){window.__dlGalleryActive.close();return;}
  const z=2147483647,
  addCSS=h=>{
    if(!document.querySelector('link[href="'+h+'"]')){
      const l=document.createElement('link');
      l.rel='stylesheet';l.href=h;document.head.appendChild(l);
    }
  },
  addScript=s=>new Promise(r=>{
    if(window._dl_g_scripts&&window._dl_g_scripts[s])return r();
    const t=document.createElement('script');
    t.src=s;
    t.onload=()=>{window._dl_g_scripts=window._dl_g_scripts||{};window._dl_g_scripts[s]=1;r();};
    t.onerror=()=>r();
    document.head.appendChild(t);
  });
  
  addCSS('https://fonts.googleapis.com/icon?family=Material+Icons');
  addCSS('https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css');
  await addScript('https://cdn.jsdelivr.net/npm/sweetalert2@11');

  const sleep=m=>new Promise(r=>setTimeout(r,m));
  const toast=(t,i='success')=>{
    if(window.Swal&&Swal.fire){
      const T=Swal.mixin({toast:true,position:'top-end',showConfirmButton:false,timer:1400,showCloseButton:true});
      T.fire({icon:i,title:t});
    }else{
      let e=document.getElementById('__dl_toast');
      if(!e){
        e=document.createElement('div');e.id='__dl_toast';
        Object.assign(e.style,{position:'fixed',right:'16px',top:'16px',zIndex:z,fontFamily:'sans-serif',background:'rgba(0,0,0,0.75)',color:'#fff',padding:'8px 12px',borderRadius:'8px'});
        document.body.appendChild(e);
      }
      e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',1400);
    }
  };

  function collectMedia(){
    const a=[];
    document.querySelectorAll('img').forEach(i=>{
      try{
        const u=i.currentSrc||i.src||i.getAttribute('data-src')||i.getAttribute('data-original');
        u&&a.push({type:'image',url:u,srcEl:i});
      }catch(e){}
    });
    document.querySelectorAll('*').forEach(el=>{
      try{
        const bg=getComputedStyle(el).backgroundImage;
        if(bg&&bg!=='none'){
          const m=bg.match(/url\((?:'|")?(.*?)(?:'|")?\)/);
          m&&m[1]&&a.push({type:'image',url:m[1],srcEl:el});
        }
      }catch(e){}
    });
    document.querySelectorAll('video').forEach(v=>{
      try{
        const u=v.currentSrc||v.src||(v.querySelector('source')&&v.querySelector('source').src);
        u&&a.push({type:'video',url:u,srcEl:v});
      }catch(e){}
    });
    const map=new Map();a.forEach(it=>{if(it.url&&!map.has(it.url))map.set(it.url,it)});
    return Array.from(map.values());
  }

  async function fetchAndDownload(url,name){
    name=name||(url.split('/').pop().split('?')[0]||'file');
    try{
      toast('Downloading…','info');
      const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);
      const b=await r.blob();const blobUrl=URL.createObjectURL(b);
      const a=document.createElement('a');a.href=blobUrl;a.download=name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(blobUrl),60000);
      toast('Saved: '+name,'success');
    }catch(err){
      console.warn(err);
      if(window.Swal&&Swal.fire){
        const R=await Swal.fire({title:'Cannot fetch directly',text:'CORS or network blocked the direct download. Open source URL in new tab instead?',icon:'warning',showCancelButton:true,confirmButtonText:'Open',cancelButtonText:'Cancel'});
        if(R.isConfirmed)window.open(url,'_blank','noopener');
      }else{
        if(confirm('Cannot fetch directly. Open source URL in new tab?'))window.open(url,'_blank','noopener');
      }
    }
  }

  const overlay=document.createElement('div');overlay.id='__dl_overlay';
  Object.assign(overlay.style,{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:z,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'});
  
  const panel=document.createElement('div');
  Object.assign(panel.style,{width:'92%',maxWidth:'1100px',maxHeight:'86vh',overflow:'auto',background:'#fff',borderRadius:'10px',padding:'12px',boxShadow:'0 10px 40px rgba(0,0,0,0.4)',fontFamily:'Inter, Roboto, sans-serif'});
  
  const header=document.createElement('div');header.style.display='flex';header.style.justifyContent='space-between';header.style.alignItems='center';header.style.marginBottom='8px';
  
  const title=document.createElement('div');title.innerHTML='<strong>Media Gallery</strong><div style="font-size:12px;color:#666">Click a preview to download</div>';
  const actions=document.createElement('div');
  const mkBtn=(icon,tt,cb)=>{
    const b=document.createElement('button');b.title=tt;b.innerHTML=`<span class="material-icons" style="font-size:20px;vertical-align:middle">${icon}</span>`;
    Object.assign(b.style,{border:'none',background:'transparent',padding:'6px 8px',cursor:'pointer',marginLeft:'6px'});b.onclick=cb;return b;
  };
  const closeBtn=mkBtn('close','Close',()=>window.__dlGalleryActive.close());
  const downloadAllBtn=mkBtn('file_download','Download all visible',async()=>{
    const thumbs=panel.querySelectorAll('.__dl_thumb');
    for(const t of thumbs){
      t.style.opacity='0.5';
      const url=t.datasetUrl;
      const name=(new URL(url,location.href).pathname.split('/').pop())||'file';
      await fetchAndDownload(url,name);
      t.style.opacity='1';await sleep(200);
    }
  });
  actions.appendChild(downloadAllBtn);actions.appendChild(closeBtn);
  header.appendChild(title);header.appendChild(actions);

  const grid=document.createElement('div');
  Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px'});
  const items=collectMedia();
  if(items.length===0){
    grid.innerHTML='<div style="padding:18px;color:#666">No images or videos found on this page.</div>';
  }else{
    items.forEach(it=>{
      const box=document.createElement('div');box.className='__dl_thumb';box.datasetUrl=it.url;
      Object.assign(box.style,{background:'#f6f6f6',borderRadius:'8px',overflow:'hidden',height:'110px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',cursor:'pointer',border:'1px solid #eee'});
      if(it.type==='image'){
        const im=document.createElement('img');im.src=it.url;im.alt='';
        Object.assign(im.style,{width:'100%',height:'100%',objectFit:'cover',display:'block'});box.appendChild(im);
      }else{
        const vid=document.createElement('video');vid.src=it.url;vid.muted=true;vid.playsInline=true;vid.preload='metadata';
        Object.assign(vid.style,{width:'100%',height:'100%',objectFit:'cover',display:'block'});box.appendChild(vid);
        const p=document.createElement('div');p.innerHTML='<span class="material-icons">play_circle_filled</span>';
        Object.assign(p.style,{position:'absolute',fontSize:'34px',color:'rgba(255,255,255,0.9)'});box.appendChild(p);
      }
      const cap=document.createElement('div');cap.textContent=it.url.split('/').pop().split('?')[0]||it.url;
      Object.assign(cap.style,{position:'absolute',left:6,bottom:6,right:6,fontSize:'11px',color:'#fff',textShadow:'0 1px 2px rgba(0,0,0,0.6)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'});
      const fade=document.createElement('div');
      Object.assign(fade.style,{position:'absolute',left:0,right:0,bottom:0,height:'40px',background:'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0))'});
      box.appendChild(fade);box.appendChild(cap);
      box.onclick=(ev)=>{ev.stopPropagation();fetchAndDownload(it.url,(it.url.split('/').pop().split('?')[0]||'file'));};
      grid.appendChild(box);
    });
  }

  panel.appendChild(header);panel.appendChild(grid);
  overlay.appendChild(panel);document.body.appendChild(overlay);

  const floatBtn=document.createElement('button');floatBtn.id='__dl_g_button';floatBtn.title='Open Media Gallery';
  floatBtn.innerHTML='<span class="material-icons" style="font-size:22px">collections</span>';
  Object.assign(floatBtn.style,{position:'fixed',right:'14px',bottom:'14px',zIndex:z,width:'54px',height:'54px',borderRadius:'50%',border:'none',background:'#009688',color:'#fff',boxShadow:'0 6px 18px rgba(0,0,0,0.3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'});
  floatBtn.onclick=()=>{const o=document.getElementById('__dl_overlay');o&&(o.style.display='flex');};
  document.body.appendChild(floatBtn);

  window.__dlGalleryActive={close:()=>{
    const o=document.getElementById('__dl_overlay');o&&o.remove();
    const b=document.getElementById('__dl_g_button');b&&b.remove();
    const t=document.getElementById('__dl_toast');t&&t.remove();
    delete window.__dlGalleryActive;toast('Gallery closed','info');
  }};

  await sleep(60);
  const first=panel.querySelector('.__dl_thumb');first&&first.scrollIntoView({behavior:'smooth',block:'center'});
  toast('Gallery ready — click items to download');
})();
