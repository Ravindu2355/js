ch="-1002316025710";
taskar=[];
mode=0;
function addTask(url, chat_id,type, thumbnail_url = null) {
    if (mode==1){
    data = {
        url: url,
        chat_id: chat_id,
        type:type,
        thumbnail_url:null
       };
        taskar.push(data);
        alert(`list add succsess url: ${JSON.stringify(data)} ${taskar.length} now`)
    }else{
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
    el.addEventListener('dblclick', (event) => {
      // event.preventDefault();
       if (mode==0){
           mode=1;
           alert("mode 1");
       }else{
           mode=0;
           alert("mode 0");
       }
    //console.log("Single click prevented on:", anchor);
  });  

    el2=document.createElement('div');
    el2.className = "rxcont";
    el2.textContent="📃";
    el2.addEventListener('dblclick', async (event) => {
      // event.preventDefault();
      await sendTasks()
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
        await addTask(anchor.href,ch,"desi_page")
    }
    // Custom action for double-click
    //alert(`Double-clicked on: ${anchor.href}`);
  });
});

    document.body.appendChild(el);
}
//init()
