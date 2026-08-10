// ============================================================
// main.js — wiring + game rules + loop + gamification.
// ============================================================
import * as THREE from "three";
import { GAME, DISTRICTS, NODES, TOTAL_NODES, districtById, nodesOf, RANKS } from "./data.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Save } from "./save.js";

let renderer, scene, camera, world, player, profile;
let running=false, lastRank=null, nearGroup=null;
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
  const ch=document.getElementById("crosshair"); if(ch) ch.style.display="none"; // 3rd-person: no crosshair
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
  player=new Player(scene, camera, canvas);   // <-- new third-person signature

  addEventListener("resize", ()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function restoreProgress(){
  Object.keys(profile.discovered).forEach(id=>{
    if(profile.discovered[id].correct) world.setNodeCaptured(id);
  });
  lastRank=rankName(profile.xp);
}

function initInput(){
  addEventListener("keydown", e=>{
    if(e.code==="KeyE") tryInteract();
    if(e.code==="KeyM") toggleMap();
    if(e.code==="KeyJ") UI.showJournal(profile);
    if(e.code==="Escape") UI.close();
  });
  document.getElementById("touchInteract").onclick=tryInteract;
  document.getElementById("mapBtn").onclick=toggleMap;
  document.getElementById("journalBtn").onclick=()=>UI.showJournal(profile);
  document.getElementById("helpBtn").onclick=showHelp;
  document.getElementById("muteBtn").onclick=()=>{
    const m=Audio.toggleMute();
    document.getElementById("muteBtn").textContent=m?"🔇":"🔊";
  };
}

function toggleMap(){
  const r=document.getElementById("modalRoot");
  if(!r.hidden){ UI.close(); return; }
  UI.showMap(profile, player.pos);
}

function showHelp(){
  UI.showDiscovery({
    district:"recon", tag:{en:"Help",ar:"مساعدة"},
    title:{en:"How to play",ar:"كيفية اللعب"},
    card:{en:"Move with WASD or the joystick — your character runs where the camera faces. Drag the mouse (or the right side of the screen) to swing the camera around, mouse-wheel to zoom. Walk onto a glowing node and press E (or the E button) to discover a concept, then answer to capture its flag 🚩. Fill the XP bar to rank up; clear every node in a district for its badge. Stay inside the green ring!",
          ar:"تحرّك بـ WASD أو عصا التحكم — تجري الشخصية باتجاه الكاميرا. اسحب الفأرة (أو الجهة اليمنى من الشاشة) لتدوير الكاميرا، وعجلة الفأرة للتكبير. قف على نقطة متوهجة واضغط E لاكتشاف مفهوم ثم أجب لالتقاط علمها 🚩. املأ شريط الخبرة للترقية؛ أكمل كل نقاط المنطقة لنيل وسامها. ابقَ داخل الحلقة الخضراء!"}
  }, true, null, null);
}

function tryInteract(){
  if(!document.getElementById("modalRoot").hidden) return;
  const near=world.nearestNode(player.pos, 5.5);
  if(!near){ UI.toast("No node in range / لا توجد نقطة قريبة", true); return; }
  const node=NODES.find(n=>n.id===near.group.userData.nodeId);
  const done=profile.discovered[node.id]?.correct;
  UI.showDiscovery(node, !!done,
    ()=> UI.showQuestion(node, correct=>onAnswer(node, correct)), null);
}

function onAnswer(node, correct){
  if(correct){
    const first=!profile.discovered[node.id]?.correct;
    Save.recordAttempt(profile, node, true);
    world.setNodeCaptured(node.id);
    UI.close();
    if(first){
      UI.toast(`+${node.xp} XP · 🚩 captured!`);
      checkRankUp(); checkBadge(node.district); checkVictory();
    }
    UI.updateHUD(profile); updateObjective();
  } else {
    Save.recordAttempt(profile, node, false);
    UI.close();
    UI.toast("Review the card and retry / راجع البطاقة وحاول", true);
  }
}

function rankName(xp){ let r=RANKS[0]; for(const x of RANKS) if(xp>=x.xp) r=x; return r.name; }
function checkRankUp(){ const now=rankName(profile.xp);
  if(now!==lastRank){ lastRank=now; Audio.levelup(); UI.toast(`⬆️ Rank up: ${now}!`); } }
function checkBadge(districtId){
  const all=nodesOf(districtId).every(n=>profile.discovered[n.id]?.correct);
  if(all && Save.recordBadge(profile, districtId))
    setTimeout(()=>UI.showBadge(districtById(districtId)), 500);
}
function checkVictory(){ if(profile.flags>=TOTAL_NODES) setTimeout(()=>UI.showVictory(profile), 800); }

function updateObjective(){
  let target=DISTRICTS.find(d=>nodesOf(d.id).some(n=>!profile.discovered[n.id]?.correct));
  if(!target){ UI.setPhase("All phases complete ✅"); UI.setObjective("Free roam — every flag captured!"); return; }
  UI.setPhase(target.phase.en);
  const left=nodesOf(target.id).filter(n=>!profile.discovered[n.id]?.correct).length;
  UI.setObjective(`🎯 ${target.name.en} — ${left} node(s) left / ${target.name.ar}`);
}

let outOfScope=false, lastViolation=0;
function enforceScope(){
  const out=world.isOutOfScope(player.pos);
  if(out && !outOfScope){
    outOfScope=true;
    const now=performance.now();
    if(now-lastViolation>1500){
      lastViolation=now; Audio.violation(); Save.recordViolation(profile);
      UI.toast("⚠️ OUT OF SCOPE — unauthorized! / خارج النطاق!", true);
    }
    const len=Math.hypot(player.pos.x, player.pos.z)||1;
    player.pos.x *= 152/len; player.pos.z *= 152/len;
  } else if(!out){ outOfScope=false; }
}

function animate(){
  if(!running) return;
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  world.update(dt);
  enforceScope();

  // keep the sun (and its shadow box) following the player for crisp shadows
  if(world.sun){
    world.sun.position.set(player.pos.x+40, player.pos.y+80, player.pos.z+30);
    world.sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
  }

  const near=world.nearestNode(player.pos, 5.5);
  if(near && near.group!==nearGroup){
    nearGroup=near.group;
    const node=NODES.find(n=>n.id===near.group.userData.nodeId);
    const done=profile.discovered[node.id]?.correct;
    UI.toast(`${done?"↺ Review":"✨ Press E to discover"}: ${node.title.en}`);
  } else if(!near){ nearGroup=null; }

  renderer.render(scene, camera);
}

initBoot();
