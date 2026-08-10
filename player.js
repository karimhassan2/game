function buildPlayer(){
  var cv = $("scene"); grp = new THREE.Group();
  function mk(ge,c,y,e){ var m=new THREE.Mesh(ge,new THREE.MeshStandardMaterial({color:c,roughness:.7,emissive:e||0,emissiveIntensity:.5})); m.position.y=y; grp.add(m); return m; }
  var a=mk(new THREE.BoxGeometry(.5,1.6,.5),0x223357,.8); a.position.x=-.35;
  var b=mk(new THREE.BoxGeometry(.5,1.6,.5),0x223357,.8); b.position.x=.35;
  mk(new THREE.BoxGeometry(1.5,1.7,.9),0x2ee6a6,2.45);
  var bp=mk(new THREE.BoxGeometry(1,1.2,.5),0x14243a,2.45); bp.position.z=-.7;
  mk(new THREE.SphereGeometry(.55,18,18),0xf0c9a0,3.75);
  var v=mk(new THREE.BoxGeometry(.9,.28,.2),0x4da6ff,3.8,0x4da6ff); v.position.z=.42;
  scene.add(grp);

  addEventListener("keydown",function(e){P.keys[e.code]=true;});
  addEventListener("keyup",function(e){P.keys[e.code]=false;});
  var dr=false,px=0,py=0;
  cv.addEventListener("mousedown",function(e){dr=true;px=e.clientX;py=e.clientY;});
  addEventListener("mouseup",function(){dr=false;});
  addEventListener("mousemove",function(e){if(!dr)return;P.cy-=(e.clientX-px)*.005;P.cp+=(e.clientY-py)*.005;cl();px=e.clientX;py=e.clientY;});
  cv.addEventListener("wheel",function(e){P.cd=Math.max(6,Math.min(20,P.cd+(e.deltaY>0?1.2:-1.2)));},{passive:true});

  var lk=null;
  cv.addEventListener("touchstart",function(e){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.clientX>innerWidth*.4&&lk===null){lk=t.identifier;px=t.clientX;py=t.clientY;}}},{passive:true});
  cv.addEventListener("touchmove",function(e){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===lk){P.cy-=(t.clientX-px)*.007;P.cp+=(t.clientY-py)*.007;cl();px=t.clientX;py=t.clientY;}}},{passive:true});
  function en(e){for(var i=0;i<e.changedTouches.length;i++)if(e.changedTouches[i].identifier===lk)lk=null;}
  cv.addEventListener("touchend",en); cv.addEventListener("touchcancel",en);
  joyBind();
}

function cl(){ P.cp = Math.max(.05, Math.min(1.15, P.cp)); }

function joyBind(){
  var s=$("joy"), k=$("kn"); if(!s) return;
  var R=44, id=null, cx=0, cy=0;
  function st(x,y,pid){ id=pid; var r=s.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2; mv(x,y); }
  function mv(x,y){ var dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy); if(d>R){dx=dx/d*R;dy=dy/d*R;} k.style.transform="translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px))"; P.joy.x=dx/R; P.joy.y=dy/R; P.joy.a=true; }
  function en(){ id=null; k.style.transform="translate(-50%,-50%)"; P.joy={x:0,y:0,a:false}; }
  s.addEventListener("touchstart",function(e){var t=e.changedTouches[0];st(t.clientX,t.clientY,t.identifier);},{passive:true});
  s.addEventListener("touchmove",function(e){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===id)mv(t.clientX,t.clientY);}},{passive:true});
  s.addEventListener("touchend",function(e){for(var i=0;i<e.changedTouches.length;i++)if(e.changedTouches[i].identifier===id)en();});
  s.addEventListener("mousedown",function(e){st(e.clientX,e.clientY,"m");});
  addEventListener("mousemove",function(e){if(id==="m")mv(e.clientX,e.clientY);});
  addEventListener("mouseup",function(){if(id==="m")en();});
}

function upP(dt){
  var mz=0,mx=0;
  if(P.keys.KeyW||P.keys.ArrowUp)mz+=1; if(P.keys.KeyS||P.keys.ArrowDown)mz-=1;
  if(P.keys.KeyD||P.keys.ArrowRight)mx+=1; if(P.keys.KeyA||P.keys.ArrowLeft)mx-=1;
  if(P.joy.a){mz+=-P.joy.y;mx+=P.joy.x;}
  var fx=-Math.sin(P.cy),fz=-Math.cos(P.cy),rx=Math.cos(P.cy),rz=-Math.sin(P.cy);
  var dx=fx*mz+rx*mx, dz=fz*mz+rz*mx, ln=Math.hypot(dx,dz), mo=ln>.01;
  if(mo){ dx/=ln; dz/=ln; P.pos.x+=dx*14*dt; P.pos.z+=dz*14*dt;
    var tg=Math.atan2(dx,dz), df=tg-P.face; while(df>Math.PI)df-=6.283; while(df<-Math.PI)df+=6.283; P.face+=df*Math.min(1,10*dt); }
  if(Math.hypot(P.pos.x,P.pos.z)>SCOPE){ var l=Math.hypot(P.pos.x,P.pos.z)||1; P.pos.x*=(SCOPE-3)/l; P.pos.z*=(SCOPE-3)/l; toast("⚠️ OUT OF SCOPE / خارج النطاق",1); }
  P.pos.y=H(P.pos.x,P.pos.z);
  grp.position.set(P.pos.x, P.pos.y+(mo?Math.abs(Math.sin(performance.now()*.012))*.15:0), P.pos.z);
  grp.rotation.y=P.face;
  var cp=Math.cos(P.cp), sp=Math.sin(P.cp);
  var id=new THREE.Vector3(P.pos.x+Math.sin(P.cy)*cp*P.cd, P.pos.y+sp*P.cd+3, P.pos.z+Math.cos(P.cy)*cp*P.cd);
  var gy=H(id.x,id.z)+1.5; if(id.y<gy)id.y=gy;
  P.cam.lerp(id, P.init?1-Math.pow(.002,dt):1); P.init=true;
  camera.position.copy(P.cam); camera.lookAt(P.pos.x, P.pos.y+2.6, P.pos.z);
}
