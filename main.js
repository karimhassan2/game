function interact(){
  if(!$("mr").hidden) return;
  if(Math.hypot(P.pos.x-NODE.pos.x, P.pos.z-NODE.pos.z) > 7){ toast("اقترب من AcmeBank",1); return; }
  card();
}

function start(){
  try{
    if(typeof THREE==="undefined"){ showErr("Three.js not loaded."); return; }
    clock=new THREE.Clock(); P.pos=new THREE.Vector3(0,0,6); P.cam=new THREE.Vector3();
    $("boot").hidden=true; $("hud").hidden=false; if(isT)$("touch").hidden=false;
    $("obj").textContent="🎯 روح لـ AcmeBank ودوس E";
    renderer=new THREE.WebGLRenderer({canvas:$("scene"), antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
    camera=new THREE.PerspectiveCamera(60, innerWidth/innerHeight, .1, 1000);
    buildWorld(); buildPlayer();
    addEventListener("resize",function(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
    addEventListener("keydown",function(e){ if(e.code==="KeyE")interact(); if(e.code==="Escape")closeM(); });
    $("ti").onclick=interact;
    run=true; loop();
  }catch(e){ showErr("start: "+(e&&e.message)); }
}

function loop(){
  try{
    if(!run) return;
    requestAnimationFrame(loop);
    var dt=Math.min(clock.getDelta(), .05);
    upP(dt);
    var t=performance.now()*.001;
    ng.userData.core.rotation.y+=dt*1.2; ng.userData.ring.rotation.z+=dt*.8; ng.userData.core.position.y=2.4+Math.sin(t*2)*.15;
    var d=Math.hypot(P.pos.x-NODE.pos.x, P.pos.z-NODE.pos.z);
    if(d<7&&!near){ near=true; if(!solved)toast("✨ اضغط E لدخول المعمل"); } else if(d>=7) near=false;
    renderer.render(scene,camera);
  }catch(e){ run=false; showErr("loop: "+(e&&e.message)); }
}

// wire the Start button (last thing — proves this file loaded fully)
var sb=document.getElementById("startBtn");
sb.disabled=false;
sb.textContent="▶ Start / ابدأ";
sb.onclick=start;
