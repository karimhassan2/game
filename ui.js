// ============================================================
// ui.js — intro card + interactive lab launcher + win screen.
// Quizzes removed. The lab is the whole challenge.
// ============================================================
import { districtById, TOTAL_NODES } from "./data.js";
import { LABS } from "./labs.js";
import { Audio } from "./audio.js";

const $ = id => document.getElementById(id);
const root = () => $("modalRoot");

export const UI = {
  updateHUD(profile){
    $("flagCount").textContent = `🚩 ${profile.flags}/${TOTAL_NODES}`;
  },
  setObjective(text){ $("objective").textContent = text; },

  toast(msg, bad=false){
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (bad ? " bad" : "");
    t.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(()=>{ t.hidden = true; }, 2400);
  },

  close(){ root().hidden = true; root().innerHTML = ""; },
  _open(html, wide=false){
    root().innerHTML = `<div class="modal"${wide?' style="max-width:760px"':''}>${html}</div>`;
    root().hidden = false;
  },

  // Briefing card → "Enter lab" (or just Close if already solved)
  showDiscovery(node, alreadyDone, onEnter, onClose){
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
          ? `<button class="btn-go" id="cEnter">Replay lab / أعد المعمل</button>
             <button class="btn-ghost" id="cClose">Close / إغلاق</button>`
          : `<button class="btn-go" id="cEnter">Enter the lab 🧪 / ادخل المعمل</button>
             <button class="btn-ghost" id="cClose">Later / لاحقًا</button>`}
      </div>`);
    $("cEnter").onclick = ()=>{ Audio.click(); onEnter(); };
    $("cClose").onclick = ()=>{ Audio.click(); this.close(); onClose && onClose(); };
  },

  // Mount the interactive lab; onResult(true) when solved, (false) if abandoned
  showLab(node, onResult){
    const lab = LABS[node.lab];
    if(!lab){ this.toast("Lab not found / المعمل غير موجود", true); onResult(false); return; }
    this._open(`
      <div class="tag">🧪 Hands-on Lab · ${node.title.en} · +${node.xp} XP</div>
      <h2>${lab.title.en}</h2><div class="ar">${lab.title.ar}</div>
      <div id="labMount"></div>`, true);
    lab.render($("labMount"), (win)=>{
      if(win){ onResult(true); }
      else { this.close(); onResult(false); }
    });
  },

  showWin(profile){
    this._open(`
      <h2>🎉 Engagement complete!</h2><div class="ar">اكتملت المهمة!</div>
      <div class="body">You exploited Broken Access Control end-to-end — IDOR + forced browsing — and captured the flag. That's real, hands-on offensive security.</div>
      <div class="body ar">استغللت التحكم المعطّل بالوصول بالكامل — IDOR والتصفح القسري — والتقطت الفلاج. هذا أمن هجومي تطبيقي حقيقي.</div>
      <div class="actions"><button class="btn-go" id="wOk">Free roam / تجوّل حر</button></div>`);
    Audio.levelup();
    $("wOk").onclick = ()=>{ Audio.click(); this.close(); };
  },
};
