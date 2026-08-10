// ============================================================
// player.js — THIRD-PERSON controller with a visible character.
// Desktop: WASD move (camera-relative) + mouse-drag to orbit cam.
// Touch: joystick move + right-side drag to orbit cam.
// Reads world.heightAt for ground follow.
// ============================================================
import * as THREE from "three";
import { heightAt } from "./world.js";

const SPEED = 20;
const TURN = 10;         // how fast the character rotates to face movement
const LOOK = 0.005;      // camera orbit sensitivity

export class Player {
  constructor(scene, camera, canvas){
    this.scene = scene;
    this.cam = camera;
    this.canvas = canvas;

    this.pos = new THREE.Vector3(-95, 0, -130); // spawn near Recon Ridge
    this.facing = 0;        // character heading (radians)
    this.camYaw = Math.PI;  // camera orbit angle
    this.camPitch = 0.35;   // camera tilt (radians, 0=level)
    this.camDist = 11;      // distance behind character

    this.keys = {};
    this.joy = { x:0, y:0, active:false };
    this._look = { id:null, lx:0, ly:0 };
    this._camPos = new THREE.Vector3();

    this._buildCharacter();
    this._bind();
  }

  _buildCharacter(){
    const g = new THREE.Group();
    const mk = (geo, color, y, emissive=0x000000) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(
        { color, roughness:0.7, metalness:0.1, emissive, emissiveIntensity:0.5 }));
      m.position.y = y; m.castShadow = true; g.add(m); return m;
    };
    // legs
    const lg = mk(new THREE.BoxGeometry(0.5,1.6,0.5), 0x223357, 0.8); lg.position.x=-0.35;
    const rg = mk(new THREE.BoxGeometry(0.5,1.6,0.5), 0x223357, 0.8); rg.position.x= 0.35;
    // torso (brand teal jacket)
    mk(new THREE.BoxGeometry(1.5,1.7,0.9), 0x2ee6a6, 2.45);
    // backpack (helps read facing direction)
    const bp = mk(new THREE.BoxGeometry(1.0,1.2,0.5), 0x14243a, 2.45); bp.position.z=-0.7;
    // head + glowing visor
    mk(new THREE.SphereGeometry(0.55,20,20), 0xf0c9a0, 3.75);
    const visor = mk(new THREE.BoxGeometry(0.9,0.28,0.2), 0x4da6ff, 3.8, 0x4da6ff);
    visor.position.z = 0.42;
    // small nose/marker forward
    this.group = g;
    g.position.copy(this.pos);
    this.scene.add(g);
  }

  _bind(){
    addEventListener("keydown", e=>{ this.keys[e.code]=true; });
    addEventListener("keyup",   e=>{ this.keys[e.code]=false; });

    // mouse-drag orbits the camera
    let drag=false, px=0, py=0;
    this.canvas.addEventListener("mousedown", e=>{ drag=true; px=e.clientX; py=e.clientY; });
    addEventListener("mouseup", ()=> drag=false);
    addEventListener("mousemove", e=>{
      if(!drag) return;
      this.camYaw   -= (e.clientX-px)*LOOK;
      this.camPitch += (e.clientY-py)*LOOK;
      this._clampPitch(); px=e.clientX; py=e.clientY;
    });
    // wheel to zoom
    this.canvas.addEventListener("wheel", e=>{
      this.camDist = Math.max(5, Math.min(20, this.camDist + Math.sign(e.deltaY)*1.2));
    }, {passive:true});

    // touch look — right half of screen
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
          this.camYaw   -= (t.clientX-this._look.lx)*LOOK*1.5;
          this.camPitch += (t.clientY-this._look.ly)*LOOK*1.5;
          this._clampPitch(); this._look.lx=t.clientX; this._look.ly=t.clientY;
        }
      }
    }, {passive:true});
    const end=e=>{ for(const t of e.changedTouches){ if(t.identifier===this._look.id) this._look.id=null; } };
    this.canvas.addEventListener("touchend", end);
    this.canvas.addEventListener("touchcancel", end);

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
    stick.addEventListener("mousedown", e=>start(e.clientX,e.clientY,"m"));
    addEventListener("mousemove", e=>{ if(id==="m") move(e.clientX,e.clientY); });
    addEventListener("mouseup", ()=>{ if(id==="m") end(); });
  }

  _clampPitch(){ this.camPitch=Math.max(0.05, Math.min(1.15, this.camPitch)); }

  update(dt){
    // ---- gather movement input ----
    let mZ=0, mX=0;
    if(this.keys["KeyW"]||this.keys["ArrowUp"]) mZ+=1;
    if(this.keys["KeyS"]||this.keys["ArrowDown"]) mZ-=1;
    if(this.keys["KeyD"]||this.keys["ArrowRight"]) mX+=1;
    if(this.keys["KeyA"]||this.keys["ArrowLeft"]) mX-=1;
    if(this.joy.active){ mZ += -this.joy.y; mX += this.joy.x; }

    // camera-relative directions (on the ground plane)
    const fwdX=-Math.sin(this.camYaw), fwdZ=-Math.cos(this.camYaw);
    const rgtX= Math.cos(this.camYaw), rgtZ=-Math.sin(this.camYaw);
    let dx=fwdX*mZ + rgtX*mX, dz=fwdZ*mZ + rgtZ*mX;
    const len=Math.hypot(dx,dz);
    const moving = len>0.01;
    if(moving){
      dx/=len; dz/=len;
      this.pos.x += dx*SPEED*dt;
      this.pos.z += dz*SPEED*dt;
      // rotate character smoothly toward movement direction
      const target=Math.atan2(dx,dz);
      let diff=target-this.facing;
      while(diff> Math.PI) diff-=Math.PI*2;
      while(diff<-Math.PI) diff+=Math.PI*2;
      this.facing += diff*Math.min(1, TURN*dt);
    }

    // ground follow + place character
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.facing;
    // simple walk bob
    this.group.position.y += moving ? Math.abs(Math.sin(performance.now()*0.012))*0.15 : 0;

    // ---- third-person camera (orbit + smooth follow) ----
    const cp=Math.cos(this.camPitch), sp=Math.sin(this.camPitch);
    const ox=Math.sin(this.camYaw)*cp*this.camDist;
    const oz=Math.cos(this.camYaw)*cp*this.camDist;
    const oy=sp*this.camDist + 3;
    const ideal=new THREE.Vector3(this.pos.x+ox, this.pos.y+oy, this.pos.z+oz);
    // keep camera above the ground
    const gy=heightAt(ideal.x, ideal.z)+1.5;
    if(ideal.y<gy) ideal.y=gy;
    const t=1-Math.pow(0.002, dt); // frame-rate independent smoothing
    this._camPos.lerp(ideal, this._init?t:1); this._init=true;
    this.cam.position.copy(this._camPos);
    this.cam.lookAt(this.pos.x, this.pos.y+2.6, this.pos.z);
  }
}
