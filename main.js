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

// ---------- Boot / profile screen ----------
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
  if(!name){ const e=document.getElementById("bootError"); e.hidden=false; e.textContent="Please enter an agent name. / أدخل اسمًا."; return; }
  profile=Save.load(name);
  document.getElementById("boot").hidden=true;
  document.getElementById("hud").hidden=false;
  if(isTouch) document.getElementById("touchControls").hidden=false;
  initScene();
  initInput();
  restoreProgress();
  UI.updateHUD(profile);
  updateObjective();
  running=true;
  animate();
}

// ---------- Three.js scene ----------
function initScene(){
  const canvas=document.getElementById("scene");
  renderer=new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 600);
  world=new World(scene);
  player=new Player(camera, canvas);
  addEventListener("resize", ()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function restoreProgress(){
  // repaint captured nodes gold + restore badges
  Object.keys(profile.discovered).forEach(id=>{
    if(profile.discovered[id].correct) world.setNodeCaptured(id);
  });
  lastRank=rankName(profile.xp);
}

// ---------- Input wiring ----------
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
    card:{en:"Move with WASD or the joystick. Look with mouse-drag or right-side drag. Walk up to a glowing node and press E (or the E button) to discover a concept, then answer to capture its flag. Fill the XP bar to rank up, and clear every node in a district to earn its badge. Stay inside the green ring!",
          ar:"تحرّك بـ WASD أو عصا التحكم. انظر بسحب الفأرة أو الجهة اليمنى. اقترب من نقطة متوهجة واضغط E لاكتشاف مفهوم ثم أجب لالتقاط علمها. املأ شريط الخبرة للترقية، وأكمل كل النقاط في المنطقة لتنال وسامها. ابقَ داخل الحلقة الخضراء!"}
  }, true, null, null);
}

// ---------- Interaction ----------
function tryInteract(){
  if(!document.getElementById("modalRoot").hidden) return;
  const near=world.nearestNode(player.pos, 5);
  if(!near){ UI.toast("No node in range / لا توجد نقطة قريبة", true); return; }
  const node=NODES.find(n=>n.id===near.group.userData.nodeId);
  const done=profile.discovered[node.id]?.correct;
  UI.showDiscovery(node, !!done,
    ()=> UI.showQuestion(node, correct=>onAnswer(node, correct)),
    null);
}

function onAnswer(node, correct){
  if(correct){
    const first = !profile.discovered[node.id]?.correct;
    Save.recordAttempt(profile, node, true);
    world.setNodeCaptured(node.id);
    UI.close();
    if(first){
      UI.toast(`+${node.xp} XP · 🚩 captured!`);
      checkRankUp();
      checkBadge(node.district);
      checkVictory();
    }
    UI.updateHUD(profile);
    updateObjective();
  } else {
    Save.recordAttempt(profile, node, false);
    UI.close();
    UI.toast("Review the card and retry / راجع البطاقة وحاول", true);
  }
}

function rankName(xp){ let r=RANKS[0]; for(const x of RANKS) if(xp>=x.xp) r=x; return r.name; }

function checkRankUp(){
  const now=rankName(profile.xp);
  if(now!==lastRank){ lastRank=now; Audio.levelup(); UI.toast(`⬆️ Rank up: ${now}!`); }
}

function checkBadge(districtId){
  const all=nodesOf(districtId).every(n=>profile.discovered[n.id]?.correct);
  if(all && Save.recordBadge(profile, districtId)){
    setTimeout(()=>UI.showBadge(districtById(districtId)), 500);
  }
}

function checkVictory(){
  if(profile.flags>=TOTAL_NODES) setTimeout(()=>UI.showVictory(profile), 800);
}

function updateObjective(){
  // find first district with an uncaptured node = current phase
  let target=DISTRICTS.find(d=>nodesOf(d.id).some(n=>!profile.discovered[n.id]?.correct));
  if(!target){ UI.setPhase("All phases complete ✅"); UI.setObjective("Free roam — every flag captured! / تجوّل حر"); return; }
  UI.setPhase(target.phase.en);
  const left=nodesOf(target.id).filter(n=>!profile.discovered[n.id]?.correct).length;
  UI.setObjective(`🎯 ${target.name.en} — ${left} node(s) left / ${target.name.ar}`);
}

// ---------- Scope enforcement (ethics as a mechanic) ----------
let outOfScope=false, lastViolation=0;
function enforceScope(){
  const out=world.isOutOfScope(player.pos);
  if(out && !outOfScope){
    outOfScope=true;
    const now=performance.now();
    if(now-lastViolation>1500){
      lastViolation=now;
      Audio.violation();
      Save.recordViolation(profile);
      UI.toast("⚠️ OUT OF SCOPE — unauthorized! / خارج النطاق!", true);
    }
    // soft-push the player back inside
    const len=Math.hypot(player.pos.x, player.pos.z)||1;
    player.pos.x *= 152/len; player.pos.z *= 152/len;
  } else if(!out){ outOfScope=false; }
}

// ---------- Loop ----------
function animate(){
  if(!running) return;
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  world.update(dt);
  enforceScope();
  // proximity hint
  const near=world.nearestNode(player.pos, 5);
  if(near && near.group!==nearGroup){
    nearGroup=near.group;
    const node=NODES.find(n=>n.id===near.group.userData.nodeId);
    const done=profile.discovered[node.id]?.correct;
    UI.toast(`${done?"↺ Review":"✨ Press E to discover"}: ${node.title.en}`);
  } else if(!near){ nearGroup=null; }
  renderer.render(scene, camera);
}

initBoot();
