var ACC = {
  "1001":{ n:"Sara Malik", b:"$4,120",  s:"IBAN ****1001" },
  "1002":{ n:"YOU (student)", b:"$260", s:"your own data" },
  "1003":{ n:"Omar Nabil", b:"$18,750", s:"IBAN ****1003" }
};
var FLAG = "FLAG{broken_access_control_admin_pwned}";

function lab(root, done){
  var st = { i:false, a:false };
  root.innerHTML =
    '<div style="background:#0b1120;border:1px solid #243252;border-radius:10px;padding:12px;margin:10px 0">'+
    '<div style="color:#ffd166;font-weight:700;font-size:13px;margin-bottom:6px">🎯 Objectives</div>'+
    '<div style="font-size:13px;margin:4px 0"><span id="g1">⬜</span> 1. IDOR — شوف حساب مستخدم تاني (غيّر الـ <code>id</code>)</div>'+
    '<div style="font-size:13px;margin:4px 0"><span id="g2">⬜</span> 2. افتح <code>/admin</code> مباشرة</div></div>'+
    '<div style="background:#0b1120;border:1px solid #243252;border-radius:12px;overflow:hidden;margin:10px 0">'+
    '<div style="display:flex;gap:8px;align-items:center;background:#1a2540;padding:8px">'+
    '<span style="color:#8ea0c8;font:12px monospace">🔒 https://acmebank.lab</span>'+
    '<input id="ad" value="/account?id=1002" style="flex:1;background:#0b1120;border:1px solid #243252;border-radius:8px;padding:9px;color:#e6ecff;font:13px monospace;outline:none;margin:0"/>'+
    '<button id="gob" style="background:#2ee6a6;color:#04121a;border:none;border-radius:8px;padding:9px 16px;font-weight:800;cursor:pointer">Go</button></div>'+
    '<div style="display:flex;gap:14px;padding:8px 16px;background:#121a2e;font-size:13px">'+
    '<span id="nh" style="color:#4da6ff;cursor:pointer;text-decoration:underline">🏠 My Account</span>'+
    '<span id="nad" style="color:#4da6ff;cursor:pointer;text-decoration:underline">🛡️ Admin Panel</span></div>'+
    '<div id="pg" style="padding:16px;min-height:130px;font-size:14px;line-height:1.7"></div></div>'+
    '<div style="display:flex;gap:10px;align-items:center">'+
    '<button id="hb" class="gh" style="padding:9px 14px;border-radius:8px;border:none">💡 Hint</button>'+
    '<button id="gu" class="gh" style="padding:9px 14px;border-radius:8px;border:none">Leave</button>'+
    '<span id="hn" style="font-size:12px;color:#8ea0c8"></span></div><div id="fb"></div>';

  function q(s){ return root.querySelector(s); }
  var ad=q("#ad"), pg=q("#pg");

  function nav(raw){
    var pt=raw.replace(/^https?:\/\/[^/]+/,"").trim(); if(pt.charAt(0)!=="/")pt="/"+pt; ad.value=pt;
    var pr=pt.split("?"), p0=pr[0], id=(new URLSearchParams(pr[1]||"")).get("id")||"1002";
    if(p0==="/account"){
      var a=ACC[id]; if(!a){ pg.innerHTML='<b style="color:#ff5470">404</b> — no account #'+id; return; }
      pg.innerHTML='<h3 style="color:#4da6ff">Account #'+id+' — '+a.n+'</h3><div>Balance: <b>'+a.b+'</b></div><div style="color:#ffd166">Private: '+a.s+'</div>'+(id!=="1002"?'<div style="margin-top:8px;color:#2ee6a6">⚠️ بتشوف بيانات حد تاني — السيرفر ماتحققش!</div>':'');
      if(id!=="1002"&&!st.i){ st.i=true; q("#g1").textContent="✅"; q("#hn").textContent="IDOR تم! دلوقتي اكتب /admin"; }
    } else if(p0==="/admin"){
      pg.innerHTML='<h3 style="color:#ff5470">🛡️ ADMIN PANEL</h3><div>Users: 3 · Pending transfers: 12</div><div style="margin-top:10px;background:#04121a;border:1px dashed #2ee6a6;border-radius:8px;padding:10px;color:#2ee6a6;font:13px monospace">'+FLAG+'</div>';
      if(!st.a){ st.a=true; q("#g2").textContent="✅"; }
    } else pg.innerHTML='<b style="color:#ff5470">404</b> — '+p0;
    if(st.i&&st.a) w();
  }
  function w(){
    q("#fb").className="fbk";
    q("#fb").innerHTML='✅ <b>Lab solved!</b> استغللت BAC عن طريق IDOR + الوصول المباشر.<br/><b>الإصلاح:</b> طبّق التحكم بالوصول على السيرفر لكل طلب وارفض افتراضيًا.<div style="margin-top:12px"><button id="cap" class="go" style="padding:11px 18px;border-radius:8px;border:none;font-weight:700">Capture flag 🚩</button></div>';
    q("#cap").onclick=function(){ done(true); };
  }
  q("#gob").onclick=function(){ nav(ad.value); };
  ad.addEventListener("keydown",function(e){ if(e.key==="Enter") nav(ad.value); });
  q("#nh").onclick=function(){ nav("/account?id=1002"); };
  q("#nad").onclick=function(){ pg.innerHTML='<b style="color:#ff5470">403 Forbidden</b> — الزرار مقفول لغير الأدمن.<div style="margin-top:8px;color:#8ea0c8">…بس هل ده الطريق الوحيد؟ 🤔</div>'; };
  q("#hb").onclick=function(){ q("#hn").textContent = st.i ? "اكتب /admin في شريط العنوان ودوس Go." : "غيّر id=1002 لـ 1001 ودوس Go."; };
  q("#gu").onclick=function(){ done(false); };
  nav("/account?id=1002");
}
