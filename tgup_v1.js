var api="https://middle-kaitlyn-rtys-1f163ec4.koyeb.app/u/";
var pr=api+"progress";
var chat="-1002356041448";
sended=[];

async function upload(ar) {
    for(a of ar){
        str='';
        for(k in a){
            v=a[k];
            console.log("running:"+k);
            if(k!="video_src"&&k!="source_src"&&k!="source_set"){
                str+=`\n**${k} : ${v}**`;
            }else{
                if(v.includes("blob:")==false && v.includes(".html")==false && sended.indexOf(v)==-1){
                    napi=api+`upload?chatid=${chat}&url=${v}&cap=${str}   ➡️${k}`;
                    x=await fetch(napi).then(x=>x.json());
                    console.log(JSON.stringify(x));
                    if(x.s==1){
                        alert("sended: "+v);
                        sended.push(v);
                    }else{
                        alert("sleep for other sends 5s");
                        setTimeout(async ()=>{
                           await upload(ar);
                        },5000);
                        break;
                    }
                }else{
                    sended.push(v);
                }
            }
        }
    }
    cl("green");
}


async function up() {
    cl("orange");
    v=document.querySelectorAll('video');
    tl=document.querySelector('title');
    if (v.length==0) {
       alert("No videos in here!😑");
       return 0;
    }
    vsr=[];
    v.forEach(vel=>{
        obv={title:tl.textContent};
        s=vel.src;
        if (s==null || s=="" || s.includes(".html")==true) {
            se=vel.querySelector("source");
                if (se!=null) {
                    s_src=se.src;
                    s_set=se.getAttribute("srcset");
                    if(s_src!=null && s_set!=null&& s_src.includes(".html")==false){
                        if(s_src==s_set && s_src==s){
                            
                        }else if(s_src==s_set && s_src!=s){
                            obv.source_src=s_src;
                        }else if(s_src!=s_set && s_src==s){
                            obv.source_set=s_set;
                        }else{
                            obv.source_src=s_src;
                            obv.source_set=s_set;
                        }
                    }else{
                        if(s_src!=null && s_src!=s){
                            obv.source_src=s_src;
                        }else if(s_set!=null && s_set!=s){
                            obv.source_set=s_set;
                        }
                    }
                    
                }else{
                    
                }
        }else{
            if (s.includes("blob:")==false) {
                obv.video_src=s;
                se=vel.querySelector("source");
                if (se!=null) {
                    s_src=se.src;
                    s_set=se.getAttribute("srcset");
                    if(s_src!=null && s_set!=null && s_set!=""&&s_src!=""){
                        if(s_src==s_set && s_src==s){
                            
                        }else if(s_src==s_set && s_src!=s){
                            obv.source_src=s_src;
                        }else if(s_src!=s_set && s_src==s){
                            obv.source_set=s_set;
                        }else{
                            obv.source_src=s_src;
                            obv.source_set=s_set;
                        }
                    }else{
                        if(s_src!=null && s_src!=s){
                            obv.source_src=s_src;
                        }else if(s_set!=null && s_set!=s){
                            obv.source_set=s_set;
                        }
                    }
                    
                }else{
                    
                }
                
            }else{
                alert("Sorry playing blobs via http requests!🙂\ncant capture source!")
            }
        }
        vsr.push(obv);
    }) 
    console.log(JSON.stringify(vsr,null,2));
    cl("blue")
   await upload(vsr);
}
function cl(c) {
    el=document.querySelector('.rxcont');
    el.style.background=c;
}
function run() {
    el=document.querySelector('.rxcont');
    
}

function init() {
    sl=document.createElement("style");
    sl.innerHTML=`.rxcont{
    background: black;
    padding: 10px;
    font-size: 30px;
    border-radius: 50%;
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 999999;
}`;
    document.head.appendChild(sl);
    el=document.createElement('div');
    el.className = "rxcont";
    el.textContent="🚀";
    el.onclick=(e)=>{
        up();
    }
    document.body.appendChild(el);
}
init()
