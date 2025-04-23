ch="-1002316025710";
taskar=[];
mode=0;
function addTask(url, chat_id,type, thumbnail_url = null) {
    if (mode==0){
    const data = {
        url: url,
        chat_id: chat_id,
        type:type
    };

    fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/add_task', {  // Replace with your actual server URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Ensure that the server knows it's JSON
        },
        body: JSON.stringify(data)  // Convert the JavaScript object into a JSON string
    })
    .then(response => response.json())  // Parse the response JSON
    .then(data => {
        if (data.status === 'success') {
            console.log('Task added successfully:', data.message);
            alert(data.message);
        } else {
            console.error('Error adding task:', data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
    }else{
        data = {
        url: url,
        chat_id: chat_id,
        type:type,
        thumbnail_url:null
       };
        taskar.push(data);
        if(mode==1){
        alert(`list add succsess url: ${JSON.stringify(data)} ${taskar.length} now`)
        }
    }
}


function asp(message) {
  return new Promise((resolve) => {
    const result = confirm(message); // Use the native prompt
    resolve(result); // Resolve the result
  });
}

function sendTasks() {
    const data = {
        tasks:taskar
    };

    fetch('https://joyous-locust-gimhan-3992e08d.koyeb.app/multi', {  // Replace with your actual server URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Ensure that the server knows it's JSON
        },
        body: JSON.stringify(data)  // Convert the JavaScript object into a JSON string
    })
    .then(response => response.json())  // Parse the response JSON
    .then(data => {
        if (data.status === 'success') {
            console.log('Task added successfully:', data.message);
            alert(data.message);
        } else {
            console.error('Error adding task:', data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}
function get_host(url){
    return url.replace(/^((\w+:)?\/\/[^\/]+\/?).*$/,'$1');
}

async function exall(){
  console.log("running exall");
  hon=get_host(location.href);
  tx = await prompt("Give me the links same part for extract!");
  if (tx!="" && tx!=null){
    alert(`extracting! ${tx} holding links!`);
    document.querySelectorAll('a').forEach(tty =>{
      link=tty.href;
      if(link.includes(tx)==true){
          if(link.includes("http")==false){
              if(link.startsWith("/")==true){
                  link=link.replace("/","");
                  link=hon+link;
              }else{
                  link=hon+link;
              }
          }
          data = {
        url: link,
        chat_id: ch,
        type:"desi_page",
        thumbnail_url:null
          };
          taskar.push(data);
      }
    })
    console.log(`${taskar.length} of links founded sending!`);
    alert(`${taskar.length} of links founded sending!`);
  }
}
    


async function init() {
    baseU=location.href;
    hon= get_host(baseU);
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
}.rxcont2{
    background: black;
    padding: 10px;
    font-size: 30px;
    border-radius: 50%;
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
}`;
    document.head.appendChild(sl);
    el=document.createElement('div');
    el.className = "rxcont";
    el.textContent="🚀";
    el.addEventListener('dblclick', (event) => {
      // event.preventDefault();
       if (mode==0){
           mode=1;
           alert("mode 1- select and add multitasks and send them via paper");
       }else if(mode==1){
           mode=2;
           alert("mode 2- bulk ex extract duble click paper for extract links from this page and upload them!");
       }else if(mode == 2){
           mode=0;
           alert("mode 0- selected one will be upladed")
           
       }
    //console.log("Single click prevented on:", anchor);
  });  

    el2=document.createElement('div');
    el2.className = "rxcont2";
    el2.textContent="📃";
    el2.addEventListener('dblclick', async (event) => {
      // event.preventDefault();
      if(mode == 2){
          console.log("fetching all links");
        li=await exall();
          console.log("starting send");
        await sendTasks();
      }else{
        await sendTasks();
      }
    //console.log("Single click prevented on:", anchor);
  });  

    // Prevent single-click on <a> and add double-click behavior
  document.querySelectorAll('a').forEach(anchor => {
  // Prevent default single-click behavior
  anchor.style.padding="4px";
  anchor.style.backgroundColor="greenyellow";
  anchor.style.color="red";
  anchor.addEventListener('click', (event) => {
    event.preventDefault();
    //console.log("Single click prevented on:", anchor);
  });  

  // Add custom double-click behavior
  anchor.addEventListener('dblclick', async (event) => {
    event.preventDefault(); // Prevent the default behavior on double-click too
    console.log("Double click triggered on:", anchor);
    x=await asp(`doinfor: ${anchor.href}`)
    console.log(x);
    if (x==true) {
        hr=anchor.href;
        if(hr.includes("http")==false){
            if(hr.startsWith("/")==true){
                hr=hr.replace("/","");
            }
            hr=hon+hr;
        }
        await addTask(hr,ch,"desi_page")
    }
    // Custom action for double-click
    //alert(`Double-clicked on: ${anchor.href}`);
  });
});

    document.body.appendChild(el);
    document.body.appendChild(el2);
}
//init()
