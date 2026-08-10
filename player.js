// ============================================================
// player.js — first-person controller.
// Desktop: WASD + mouse-drag look. Touch: on-screen joystick +
// right-side drag look. Reads world.heightAt for ground follow.
// ============================================================
import * as THREE from "three";
import { heightAt } from "./world.js";

const EYE = 3.2;         // camera height above ground
const SPEED = 22;        // units / second
const LOOK = 0.0028;     // mouse sensitivity

export class Player {
  constructor(camera, canvas){
    this.cam = camera;
    this.canvas = canvas;
    this.pos = new THREE.Vector3(-95, 0, -125); // spawn near Recon Ridge
    this.yaw = 0.6;
    this.pitch = -0.05;
    this.keys = {};
    this.joy = { x:0, y:0, active:false };
    this._look = { id:null, lx:0, ly:0 };
    this._bind();
  }

  _bind(){
    // keyboard
    addEventListener("keydown", e=>{ this.keys[e.code]=true; });
    addEventListener("keyup",   e=>{ this.keys[e.code]=false; });

    // mouse-drag look (desktop) — only when dragging on the canvas
    let dragging=false, px=0, py=0;
    this.canvas.addEventListener("mousedown", e=>{ dragging=true; px=e.clientX; py=e.clientY; });
    addEventListener("mouseup", ()=> dragging=false);
    addEventListener("mousemove", e=>{
      if(!dragging) return;
      this.yaw   -= (e.clientX-px)*LOOK;
      this.pitch -= (e.clientY-py)*LOOK;
      this._clampPitch(); px=e.clientX; py=e.clientY;
    });

    // touch look — any touch that starts on the RIGHT half of the screen
    this.canvas.addEventListener("touchstart", e=>{
      for(const t of e.changedTouches){
        if(t.clientX > innerWidth*0.4 && this._look.id===null){
          this._look.id=t.identifier; this._look.lx=t.clientX; this._look.ly=t.clientY;
        }
      }
    }, {passive:true});
    this.canvas.addEventListener("touchmove", e=>{
      for(const t of e.changedTouches){
        if(t.identifier===this._look.id){
          this.yaw   -= (t.clientX-this._look.lx)*LOOK*1.4;
          this.pitch -= (t.clientY-this._look.ly)*LOOK*1.4;
          this._clampPitch(); this._look.lx=t.clientX; this._look.ly=t.clientY;
        }
      }
    }, {passive:true});
    const endTouch = e=>{ for(const t of e.changedTouches){ if(t.identifier===this._look.id) this._look.id=null; } };
    this.canvas.addEventListener("touchend", endTouch);
    this.canvas.addEventListener("touchcancel", endTouch);

    this._bindJoystick();
  }

  _bindJoystick(){
    const stick=document.getElementById("joystick");
    const knob=document.getElementById("joyKnob");
    if(!stick) return;
    const R=45; let id=null, cx=0, cy=0;
    const start=(x,y,pid)=>{ id=pid; const r=stick.getBoundingClientRect();
      cx=r.left+r.width/2; cy=r.top+r.height/2; move(x,y); };
    const move=(x,y)=>{ let dx=x-cx, dy=y-cy; const d=Math.hypot(dx,dy);
      if(d>R){ dx=dx/d*R; dy=dy/d*R; }
      knob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joy.x=dx/R; this.joy.y=dy/R; this.joy.active=true; };
    const end=()=>{ id=null; knob.style.transform="translate(-50%,-50%)"; this.joy={x:0,y:0,active:false}; };
    stick.addEventListener("touchstart", e=>{ const t=e.changedTouches[0]; start(t.clientX,t.clientY,t.identifier); }, {passive:true});
    stick.addEventListener("touchmove", e=>{ for(const t of e.changedTouches) if(t.identifier===id) move(t.clientX,t.clientY); }, {passive:true});
    stick.addEventListener("touchend", e=>{ for(const t of e.changedTouches) if(t.identifier===id) end(); });
    // also allow mouse-drag joystick (useful on laptops)
    stick.addEventListener("mousedown", e=>start(e.clientX,e.clientY,"m"));
    addEventListener("mousemove", e=>{ if(id==="m") move(e.clientX,e.clientY); });
    addEventListener("mouseup", ()=>{ if(id==="m") end(); });
  }

  _clampPitch(){ this.pitch=Math.max(-1.2, Math.min(0.9, this.pitch)); }

  // move relative to facing; keys and joystick combine
  update(dt){
    let fwd=0, str=0;
    if(this.keys["KeyW"]||this.keys["ArrowUp"]) fwd+=1;
    if(this.keys["KeyS"]||this.keys["ArrowDown"]) fwd-=1;
    if(this.keys["KeyD"]||this.keys["ArrowRight"]) str+=1;
    if(this.keys["KeyA"]||this.keys["ArrowLeft"]) str-=1;
    if(this.joy.active){ fwd += -this.joy.y; str += this.joy.x; }

    const len=Math.hypot(fwd,str);
    if(len>0.001){
      fwd/=Math.max(1,len); str/=Math.max(1,len);
      const sin=Math.sin(this.yaw), cos=Math.cos(this.yaw);
      this.pos.x += (fwd*sin + str*cos) * SPEED * dt;
      this.pos.z += (fwd*cos - str*sin) * SPEED * dt;
    }

    // follow ground
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.cam.position.set(this.pos.x, this.pos.y+EYE, this.pos.z);

    // apply look
    const dir=new THREE.Vector3(
      Math.sin(this.yaw)*Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw)*Math.cos(this.pitch)
    );
    this.cam.lookAt(this.cam.position.clone().add(dir));
  }
}
