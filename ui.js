function toast(m,b){ var t=$("toast"); t.textContent=m; t.className="tst"+(b?" bad":""); t.hidden=false; clearTimeout(tt); tt=setTimeout(function(){t.hidden=true;},2400); }
function closeM(){ $("mr").hidden=true; $("mr").innerHTML=""; }

function card(){
  $("mr").hidden=false;
  $("mr").innerHTML='<div class="md"><h2>Broken Access Control (OWASP #1)</h2><div class="ar">التحكم المعطّل بالوصول</div><div class="by">تقدر تتصرف خارج صلاحياتك — تشوف بيانات غيرك (IDOR) أو تفتح صفحات الأدمن مباشرة. ده الخطر الأول للويب. هتستغل مثال حي بنفسك.</div><div class="act"><button class="go" id="en">'+(solved?"Replay lab":"ادخل المعمل 🧪")+'</button><button class="gh" id="lt">Later</button></div></div>';
  $("en").onclick=function(){ showLab(); };
  $("lt").onclick=closeM;
}

function showLab(){
  $("mr").innerHTML='<div class="md"><h2>Lab: Broken Access Control</h2><div class="ar">معمل: التحكم المعطّل بالوصول</div><div id="mt"></div></div>';
  lab($("mt"), function(ok){
    if(ok){
      solved=true; $("flag").textContent="🚩 1/1"; $("obj").textContent="✅ Flag captured / تم";
      ng.userData.core.material.color.set(0xffd166); ng.userData.core.material.emissive.set(0xffd166);
      win();
    } else closeM();
  });
}

function win(){
  $("mr").innerHTML='<div class="md"><h2>🎉 Engagement complete!</h2><div class="ar">اكتملت المهمة!</div><div class="by">استغللت التحكم المعطّل بالوصول بالكامل — IDOR + الوصول المباشر — والتقطت الفلاج.</div><div class="act"><button class="go" id="rm">Free roam / تجوّل</button></div></div>';
  $("rm").onclick=closeM;
}
