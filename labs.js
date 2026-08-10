// ============================================================
// labs.js — hands-on interactive labs. Each lab renders a live
// simulated target the player must actually exploit to win.
// The exploit IS the gameplay (no multiple choice).
// ============================================================
import { Audio } from "./audio.js";

// shared inline styles for the fake "browser"
const S = {
  chrome:"background:#0b1120;border:1px solid #243252;border-radius:12px;overflow:hidden;margin:12px 0",
  bar:"display:flex;gap:8px;align-items:center;background:#1a2540;padding:8px;border-bottom:1px solid #243252",
  url:"flex:1;background:#0b1120;border:1px solid #243252;border-radius:8px;padding:9px 12px;color:#e6ecff;font:13px monospace;outline:none",
  go:"background:#2ee6a6;color:#04121a;border:none;border-radius:8px;padding:9px 16px;font-weight:800;cursor:pointer",
  page:"padding:18px;min-height:150px;color:#e6ecff;font-size:14px;line-height:1.7",
  nav:"display:flex;gap:14px;padding:8px 18px;background:#121a2e;border-bottom:1px solid #243252;font-size:13px",
  navlink:"color:#4da6ff;cursor:pointer;text-decoration:underline",
  goal:"display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0",
};

// ---- Broken Access Control lab: "AcmeBank Portal" ----
const ACCOUNTS = {
  "1001": { name:"Sara Malik",  role:"user",  balance:"$4,120", secret:"IBAN ****1001 · phone 010-xxxx" },
  "1002": { name:"YOU (student)", role:"user", balance:"$260",  secret:"your own data" },
  "1003": { name:"Omar Nabil",  role:"user",  balance:"$18,750", secret:"IBAN ****1003 · phone 011-xxxx" },
};
const ADMIN_FLAG = "FLAG{broken_access_control_admin_pwned}";

export const LABS = {
  bac: {
    title:{ en:"Lab: Broken Access Control", ar:"معمل: التحكم المعطّل بالوصول" },
    brief:{ en:"You are logged into AcmeBank as user #1002. Access control is only enforced in the UI — prove it's broken.",
            ar:"أنت مسجّل الدخول في AcmeBank كمستخدم رقم 1002. التحكم بالوصول مطبّق في الواجهة فقط — أثبت أنه معطّل." },

    render(root, onDone){
      const state = { idor:false, admin:false };
      root.innerHTML = `
        <div class="body">${this.brief.en}</div>
        <div class="body ar">${this.brief.ar}</div>
        <div style="background:#0b1120;border:1px solid #243252;border-radius:10px;padding:12px;margin:10px 0">
          <div style="color:#ffd166;font-weight:700;font-size:13px;margin-bottom:6px">🎯 Objectives</div>
          <div class="${''}" style="${S.goal}"><span id="g1">⬜</span> 1. IDOR — view another user's account (change the <code>id</code>)</div>
          <div style="${S.goal}"><span id="g2">⬜</span> 2. Forced browsing — open <code>/admin</code> directly to grab the flag</div>
        </div>
        <div style="${S.chrome}">
          <div style="${S.bar}">
            <span style="color:#8ea0c8;font:12px monospace">🔒 https://acmebank.lab</span>
            <input id="addr" style="${S.url}" value="/account?id=1002" spellcheck="false" />
            <button id="go" style="${S.go}">Go</button>
          </div>
          <div style="${S.nav}">
            <span style="${S.navlink}" data-nav="/account?id=1002">🏠 My Account</span>
            <span style="${S.navlink}" id="adminBtn">🛡️ Admin Panel</span>
          </div>
          <div id="page" style="${S.page}"></div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="hintBtn" class="btn-ghost" style="padding:9px 14px;border-radius:8px">💡 Hint</button>
          <button id="giveUp" class="btn-ghost" style="padding:9px 14px;border-radius:8px">Leave lab</button>
          <span id="hint" style="font-size:12.5px;color:#8ea0c8"></span>
        </div>
        <div id="labFeedback"></div>`;

      const $ = s => root.querySelector(s);
      const page = $("#page"), addr = $("#addr");

      const navigate = (raw) => {
        Audio.click();
        let path = raw.trim().replace(/^https?:\/\/[^/]+/, "");
        if(!path.startsWith("/")) path = "/" + path;
        addr.value = path;
        const [p, qs] = path.split("?");
        const params = new URLSearchParams(qs || "");

        if(p === "/account"){
          const id = params.get("id") || "1002";
          const acc = ACCOUNTS[id];
          if(!acc){ page.innerHTML = `<b style="color:#ff5470">404</b> — no account #${id}`; return; }
          page.innerHTML = `<h3 style="color:#4da6ff;margin-bottom:8px">Account #${id} — ${acc.name}</h3>
            <div>Role: <b>${acc.role}</b></div><div>Balance: <b>${acc.balance}</b></div>
            <div style="color:#ffd166">Private: ${acc.secret}</div>
            ${id!=="1002" ? `<div style="margin-top:10px;color:#2ee6a6">⚠️ You are viewing someone else's data — the server never checked if you're allowed!</div>` : ``}`;
          if(id !== "1002" && !state.idor){
            state.idor = true; $("#g1").textContent = "✅"; Audio.correct();
            $("#hint").textContent = "Nice — that's IDOR. Now try forced browsing: type /admin";
          }
        }
        else if(p === "/admin"){
          // access control was ONLY in the UI button -> direct URL works
          page.innerHTML = `<h3 style="color:#ff5470;margin-bottom:8px">🛡️ ADMIN PANEL</h3>
            <div>Users: 3 · Pending transfers: 12</div>
            <div style="margin-top:10px;background:#04121a;border:1px dashed #2ee6a6;border-radius:8px;padding:10px;color:#2ee6a6;font:13px monospace">${ADMIN_FLAG}</div>`;
          if(!state.admin){ state.admin = true; $("#g2").textContent = "✅"; Audio.correct(); }
        }
        else { page.innerHTML = `<b style="color:#ff5470">404</b> — ${p} not found`; }

        if(state.idor && state.admin) solved();
      };

      const solved = () => {
        Audio.levelup();
        $("#labFeedback").className = "feedback good";
        $("#labFeedback").innerHTML = `✅ <b>Lab solved!</b> You exploited Broken Access Control two ways: IDOR (changing <code>id</code>) and forced browsing (<code>/admin</code>).<br/>
          <b>Why it worked:</b> authorization was checked only in the UI, not on the server for each request.<br/>
          <b>The fix:</b> enforce access control server-side on every request, deny by default, and use unguessable references.<br/>
          <span dir="rtl">الإصلاح: طبّق التحكم بالوصول على الخادم لكل طلب، وارفض افتراضيًا، واستخدم معرّفات غير قابلة للتخمين.</span>
          <div style="margin-top:12px"><button id="capture" class="btn-go" style="padding:11px 18px;border-radius:8px;border:none">Capture flag 🚩 / التقط العلم</button></div>`;
        $("#capture").onclick = () => { Audio.click(); onDone(true); };
      };

      $("#go").onclick = () => navigate(addr.value);
      addr.addEventListener("keydown", e => { if(e.key === "Enter") navigate(addr.value); });
      root.querySelectorAll("[data-nav]").forEach(el => el.onclick = () => navigate(el.dataset.nav));
      $("#adminBtn").onclick = () => { Audio.wrong();
        page.innerHTML = `<b style="color:#ff5470">403 Forbidden</b> — the button is hidden/blocked for non-admins.
          <div style="margin-top:8px;color:#8ea0c8">…but is that the <i>only</i> way to reach the admin page? 🤔</div>`; };
      $("#hintBtn").onclick = () => { Audio.click();
        $("#hint").textContent = state.idor
          ? "The 403 is UI-only. Type /admin directly in the address bar and press Go."
          : "See id=1002 in the address bar? Change it to 1001 and press Go."; };
      $("#giveUp").onclick = () => { Audio.click(); onDone(false); };

      navigate("/account?id=1002"); // initial page
    }
  },
};
