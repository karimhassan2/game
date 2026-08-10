import { World } from "./world.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Save } from "./save.js";

let renderer, scene, camera, world, player, profile;
let running=false, nearGroup=null;
const clock = new THREE.Clock();
const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;

function initBoot(){
  const list=document.getElementById("profileList");
  Save.listProfiles().forEach(name=>{
    const chip=document.createElement("div");
    chip.className="profile-chip"; chip.textContent="👤 "+name;
    chip.onclick=()=>{ document.getElementById("playerName").value=name; };
    list.appendChild(chip);
  });
  const last=Save.lastPlayed();
  if(last) document.getElementById("playerName").value=last;
  document.getElementById("startBtn").onclick=start;
}

function start(){
  const name=(document.getElementById("playerName").value||"").trim();
  if(!name){ const e=document.getElementById("bootError"); e.hidden=false;
    e.textContent="Please enter an agent name. / أدخل اسمًا."; return; }
  profile=Save.load(name);
  document.getElementById("boot").hidden=true;
  document.getElementById("hud").hidden=false;
  const rb=document.getElementById("rankBadge"); if(rb) rb.textContent="🕵️ Pentester";
  if(isTouch) document.getElementById("touchControls").hidden=false;
  initScene();
  initInput();
  restoreProgress();
  UI.updateHUD(profile);
  updateObjective();
  running=true;
  animate();
}

function initScene(){
  const canvas=document.getElementById("scene");
  renderer=new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  world=new World(scene);
  player=new Player(scene, camera, canvas);

  addEventListener("resize", ()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function restoreProgress(){
  Object.keys(profile.discovered||{}).forEach(id=>{
    if(profile.discovered[id].correct) world.setNodeCaptured(id);
  });
}

function initInput(){
  addEventListener("keydown", e=>{
    if(e.code==="KeyE") tryInteract();
    if(e.code==="Escape") UI.close();
  });
  document.getElementById("touchInteract").onclick=tryInteract;
  document.getElementById("helpBtn").onclick=showHelp;
  document.getElementById("muteBtn").onclick=()=>{
    const m=Audio.toggleMute();
    document.getElementById("muteBtn").textContent=m?"🔇":"🔊";
  };
}

function showHelp(){
  UI.showDiscovery({
    district:"acme", tag:{en:"Help",ar:"مساعدة"},
    title:{en:"How to play",ar:"كيفية اللعب"},
    card:{en:"Move with WASD or the joystick — your character runs where the camera faces. Drag the mouse (or the right side of the screen) to swing the camera; mouse-wheel to zoom. Walk onto the glowing AcmeBank node and press E (or the E button) to enter the hacking lab. Inside, edit the address bar to exploit Broken Access Control and capture the flag.",
          ar:"تحرّك بـ WASD أو عصا التحكم — تجري الشخصية باتجاه الكاميرا. اسحب الفأرة (أو الجهة اليمنى) لتدوير الكاميرا، وعجلة الفأرة للتكبير. قف على نقطة AcmeBank المتوهجة واضغط E لدخول معمل الاختراق. بالداخل، عدّل شريط العنوان لاستغلال التحكم المعطّل بالوصول والتقاط الفلاج."}
  }, true, null, null);
}

function tryInteract(){
  if(!document.getElementById("modalRoot").hidden) return;
  const near=world.nearestNode(player.pos, 6);
  if(!near){ UI.toast("Get closer to AcmeBank / اقترب من AcmeBank", true); return; }
  const node=NODES.find(n=>n.id===near.group.userData.nodeId);
  const done=profile.discovered[node.id]?.correct;
  UI.showDiscovery(node, !!done,
    ()=> UI.showLab(node, solved=>onLab(node, solved)),
    null);
}

function onLab(node, solved){
  if(solved){
    const first=!profile.discovered[node.id]?.correct;
    Save.recordAttempt(profile, node, true);
    world.setNodeCaptured(node.id);
    UI.close();
    UI.updateHUD(profile);
    updateObjective();
    if(first){ Audio.levelup(); setTimeout(()=>UI.showWin(profile), 500); }
    else UI.toast("Lab already solved ✅ / تم الحل");
  } else {
    Save.recordAttempt(profile, node, false);
    UI.toast("Lab left — come back anytime / يمكنك العودة", true);
  }
}

function updateObjective(){
  const done = profile.flags >= TOTAL_NODES;
  UI.setObjective(done
    ? "✅ Flag captured — free roam / تم الالتقاط"
    : "🎯 Reach AcmeBank & press E / اذهب إلى AcmeBank واضغط E");
}

let outOfScope=false, lastViolation=0;
function enforceScope(){
  const out=world.isOutOfScope(player.pos);
  if(out && !outOfScope){
    outOfScope=true;
    const now=performance.now();
    if(now-lastViolation>1500){
      lastViolation=now; Audio.violation(); Save.recordViolation(profile);
      UI.toast("⚠️ OUT OF SCOPE / خارج النطاق", true);
    }
    const len=Math.hypot(player.pos.x, player.pos.z)||1;
    player.pos.x *= 127/len; player.pos.z *= 127/len;
  } else if(!out){ outOfScope=false; }
}

function animate(){
  if(!running) return;
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  world.update(dt);
  enforceScope();

  if(world.sun){
    world.sun.position.set(player.pos.x+40, player.pos.y+80, player.pos.z+30);
    world.sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
  }

  const near=world.nearestNode(player.pos, 6);
  if(near && near.group!==nearGroup){
    nearGroup=near.group;
    UI.toast("✨ Press E to enter the lab / اضغط E لدخول المعمل");
  } else if(!near){ nearGroup=null; }

  renderer.render(scene, camera);
}

initBoot();
