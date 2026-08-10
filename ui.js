// ============================================================
// ui.js — discovery card + question generator + journal + map
// + HUD. Pure DOM; talks to game via callbacks.
// ============================================================
import { DISTRICTS, NODES, RANKS, TOTAL_NODES, districtById, nodesOf } from "./data.js";
import { Audio } from "./audio.js";

const $ = id => document.getElementById(id);
const root = () => $("modalRoot");

function rankFor(xp){ let r=RANKS[0]; for(const x of RANKS) if(xp>=x.xp) r=x; return r; }

export const UI = {
  // ---------- HUD ----------
  updateHUD(profile){
    const rank = rankFor(profile.xp);
    $("rankBadge").textContent = `${rank.name} · ${rank.ar}`;
    $("xpText").textContent = `${profile.xp} XP`;
    $("flagCount").textContent = `🚩 ${profile.flags}/${TOTAL_NODES}`;
    // progress bar toward next rank
    const next = RANKS.find(r=>r.xp>profile.xp);
    const prev = rankFor(profile.xp);
    const span = next ? (next.xp - prev.xp) : 1;
    const into = next ? (profile.xp - prev.xp) : 1;
    $("xpFill").style.width = `${Math.min(100, Math.round((next? into/span : 1)*100))}%`;
  },

  setPhase(text){ $("phaseText").textContent = text; },
  setObjective(text){ $("objective").textContent = text; },

  toast(msg, bad=false){
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (bad ? " bad" : "");
    t.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(()=>{ t.hidden = true; }, 2200);
  },

  // ---------- Modals ----------
  close(){ root().hidden = true; root().innerHTML = ""; },

  _open(html){
    root().innerHTML = `<div class="modal">${html}</div>`;
    root().hidden = false;
  },

  // Discovery card -> "Prove it" button -> question
  showDiscovery(node, alreadyDone, onProve, onClose){
    Audio.discover();
    Audio.speak(node.title.en, node.title.ar);
    const d = districtById(node.district);
    this._open(`
      <div class="tag">${d.phase.en} · ${node.tag.en} / ${node.tag.ar}</div>
      <h2>${node.title.en}</h2>
      <div class="ar">${node.title.ar}</div>
      <div class="body">${node.card.en}</div>
      <div class="body ar">${node.card.ar}</div>
      <div class="actions">
        ${alreadyDone
          ? `<button class="btn-ghost" id="cCloseBtn">Close / إغلاق</button>`
          : `<button class="btn-go" id="cProveBtn">Prove it 🚩 / أثبت</button>
             <button class="btn-ghost" id="cCloseBtn">Later / لاحقًا</button>`}
      </div>`);
    if(!alreadyDone) $("cProveBtn").onclick = ()=>{ Audio.click(); onProve(); };
    $("cCloseBtn").onclick = ()=>{ Audio.click(); this.close(); onClose&&onClose(); };
  },

  // Auto-generated multiple-choice question with feedback
  showQuestion(node, onResult){
    const q = node.q;
    // shuffle options while tracking the correct index
    const idx = q.options.map((_,i)=>i);
    for(let i=idx.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
    const opts = idx.map(i=>({ o:q.options[i], correct:i===q.answer }));
    this._open(`
      <div class="tag">Capture the flag / التقط العلم · +${node.xp} XP</div>
      <h2>${q.question.en}</h2>
      <div class="ar">${q.question.ar}</div>
      <div id="optWrap">
        ${opts.map((x,i)=>`<button class="opt-btn" data-i="${i}">${x.o.en}<br/><span dir="rtl" style="color:#8ea0c8">${x.o.ar}</span></button>`).join("")}
      </div>
      <div id="qFeedback"></div>
      <div class="actions" id="qActions" hidden></div>`);
    let answered=false;
    root().querySelectorAll(".opt-btn").forEach(btn=>{
      btn.onclick = ()=>{
        if(answered) return; answered=true;
        const i=+btn.dataset.i; const correct=opts[i].correct;
        root().querySelectorAll(".opt-btn").forEach((b,j)=>{
          if(opts[j].correct) b.classList.add("correct");
          if(j===i && !correct) b.classList.add("wrong");
          b.disabled=true;
        });
        const fb=$("qFeedback");
        fb.className = "feedback " + (correct?"good":"bad");
        fb.innerHTML = (correct?"✅ Correct! / صحيح<br/>":"❌ Not quite. / ليس تمامًا<br/>")
          + `<b>${node.q.explain.en}</b><br/><span dir="rtl">${node.q.explain.ar}</span>`;
        correct?Audio.correct():Audio.wrong();
        const act=$("qActions"); act.hidden=false;
        act.innerHTML = correct
          ? `<button class="btn-go" id="qDone">Collect 🚩 / اجمع</button>`
          : `<button class="btn-go" id="qRetry">Try again / حاول مجددًا</button>
             <button class="btn-ghost" id="qClose">Close / إغلاق</button>`;
        if(correct) $("qDone").onclick=()=>{ Audio.click(); onResult(true); };
        else{ $("qRetry").onclick=()=>{ Audio.click(); this.showQuestion(node,onResult); };
              $("qClose").onclick=()=>{ Audio.click(); onResult(false); }; }
      };
    });
  },

  // Journal — every concept, discovered or locked
  showJournal(profile){
    const groups = DISTRICTS.map(d=>{
      const items = nodesOf(d.id).map(n=>{
        const done = profile.discovered[n.id]?.correct;
        return `<div class="journal-item ${done?"":"locked"}">
          <h4>${done?"✅":"🔒"} ${n.title.en} · <span dir="rtl">${n.title.ar}</span></h4>
          <p>${done ? n.card.en : "Discover this node in the world to unlock. / اكتشف هذه النقطة لفتحها."}</p>
        </div>`;
      }).join("");
      return `<div style="margin-bottom:14px"><div class="tag">${d.phase.en}</div>${items}</div>`;
    }).join("");
    this._open(`<h2>📓 Field Journal</h2><div class="ar">دفتر الميدان</div>
      <div style="max-height:52vh;overflow:auto">${groups}</div>
      <div class="actions"><button class="btn-ghost" id="jClose">Close / إغلاق</button></div>`);
    $("jClose").onclick=()=>{ Audio.click(); this.close(); };
  },

  // Minimap drawn to a canvas
  showMap(profile, playerPos){
    this._open(`<h2>🗺️ Range Map</h2><div class="ar">خريطة النطاق</div>
      <canvas id="mapCv" class="map-canvas" width="520" height="520"></canvas>
      <div class="map-legend">
        <span><i class="dot" style="background:#2ee6a6"></i>You / أنت</span>
        <span><i class="dot" style="background:#ffd166"></i>Captured / تم</span>
        <span><i class="dot" style="background:#4da6ff"></i>Undiscovered / غير مكتشف</span>
        <span><i class="dot" style="background:#ff5470"></i>Scope edge / حدود</span>
      </div>
      <div class="actions"><button class="btn-ghost" id="mClose">Close / إغلاق</button></div>`);
    const cv=$("mapCv"), g=cv.getContext("2d"), W=520, S=W/340; // world ~±170 -> canvas
    const tx=x=>W/2 + x*S, tz=z=>W/2 + z*S;
    g.fillStyle="#0b1120"; g.fillRect(0,0,W,W);
    // scope circle
    g.strokeStyle="#ff5470"; g.lineWidth=2; g.beginPath();
    g.arc(W/2,W/2,155*S,0,Math.PI*2); g.stroke();
    // districts
    DISTRICTS.forEach(d=>{
      g.fillStyle="rgba(255,255,255,.05)"; g.beginPath();
      g.arc(tx(d.center.x),tz(d.center.z),d.radius*S,0,Math.PI*2); g.fill();
      g.fillStyle="#8ea0c8"; g.font="11px Segoe UI"; g.textAlign="center";
      g.fillText(`${d.order}. ${d.name.en}`, tx(d.center.x), tz(d.center.z)-d.radius*S-4);
    });
    // nodes
    NODES.forEach(n=>{
      const done=profile.discovered[n.id]?.correct;
      g.fillStyle=done?"#ffd166":"#4da6ff"; g.beginPath();
      g.arc(tx(n.pos.x),tz(n.pos.z),4,0,Math.PI*2); g.fill();
    });
    // player
    if(playerPos){ g.fillStyle="#2ee6a6"; g.beginPath();
      g.arc(tx(playerPos.x),tz(playerPos.z),6,0,Math.PI*2); g.fill(); }
    $("mClose").onclick=()=>{ Audio.click(); this.close(); };
  },

  showBadge(district){
    this._open(`<h2>🏅 Badge earned!</h2><div class="ar">وسام جديد!</div>
      <div class="body">You cleared <b>${district.phase.en}</b> — ${district.name.en}. Every node captured!</div>
      <div class="body ar">أكملت ${district.phase.ar} — ${district.name.ar}. تم التقاط كل النقاط!</div>
      <div class="actions"><button class="btn-go" id="bOk">Onward / للأمام</button></div>`);
    Audio.levelup();
    $("bOk").onclick=()=>{ Audio.click(); this.close(); };
  },

  showVictory(profile){
    this._open(`<h2>🎉 Engagement complete!</h2><div class="ar">اكتملت المهمة!</div>
      <div class="body">You captured all ${TOTAL_NODES} flags and finished the full pentest methodology — from Recon to Reporting. Final rank: <b>${rankFor(profile.xp).name}</b> · ${profile.xp} XP.</div>
      <div class="body ar">التقطت كل الأعلام وأكملت منهجية اختبار الاختراق كاملة — من الاستطلاع إلى التقرير.</div>
      <div class="actions"><button class="btn-go" id="vOk">Free roam / تجوّل حر</button></div>`);
    Audio.levelup();
    $("vOk").onclick=()=>{ Audio.click(); this.close(); };
  },
   // Hands-on interactive lab (falls back to a quiz if no lab defined)
  showLab(node, onResult){
    const lab = LABS[node.lab];
    if(!lab){ this.showQuestion(node, onResult); return; }
    root().hidden = false;
    root().innerHTML = `<div class="modal" style="max-width:760px">
      <div class="tag">🧪 Hands-on Lab · ${node.title.en} · +${node.xp} XP</div>
      <h2>${lab.title.en}</h2><div class="ar">${lab.title.ar}</div>
      <div id="labMount"></div></div>`;
    lab.render(document.getElementById("labMount"), (win)=>{
      if(win){ onResult(true); }
      else { this.close(); onResult(false); }
    });
  },
};
