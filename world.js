// ============================================================
// world.js — terrain + districts + props + landmarks + nodes
// + scope boundary + gradient sky + shadow-casting sun.
// Reads data.js for all placement. Exposes heightAt(x,z).
// ============================================================
import * as THREE from "three";
import { DISTRICTS, NODES, SCOPE } from "./data.js";

export function heightAt(x, z){
  return (
    Math.sin(x * 0.035) * 2.2 +
    Math.cos(z * 0.03) * 2.0 +
    Math.sin((x + z) * 0.012) * 1.4
  );
}

export class World {
  constructor(scene){
    this.scene = scene;
    this.nodeMeshes = [];
    this._t = 0;
    this._build();
  }

  _build(){
    this._buildSky();
    this._buildLights();
    this._buildTerrain();
    this._buildScopeBoundary();
    this._buildDistricts();
    this._buildNodes();
    this._scatterProps();
    // horizon-matched fog so distance fades softly instead of going black
    this.scene.fog = new THREE.Fog(0x2a4d6e, 90, 380);
  }

  _buildSky(){
    // Big inverted sphere with a vertical gradient shader = bright sky.
    const geo = new THREE.SphereGeometry(500, 32, 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top:    { value: new THREE.Color(0x0a2a5e) },  // deep blue overhead
        mid:    { value: new THREE.Color(0x2f6f9e) },  // sky blue
        bottom: { value: new THREE.Color(0x8fc7d6) },  // bright teal horizon
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        void main(){ float h = normalize(vP).y;
          vec3 c = h>0.0 ? mix(mid, top, h) : mix(mid, bottom, -h);
          gl_FragColor = vec4(c,1.0); }`
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  _buildLights(){
    // sky/ground fill — natural gradient light, brighter than AmbientLight
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3a2a, 1.1));
    // sun — casts shadows; main.js moves it to follow the player
    const sun = new THREE.DirectionalLight(0xfff2df, 2.6);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;   sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
  }

  _buildTerrain(){
    const size = 520, seg = 140;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    // brighter, higher-contrast ground reads clearly now
    const mat = new THREE.MeshStandardMaterial({ color:0x2c6e57, roughness:0.95, flatShading:true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const grid = new THREE.GridHelper(520, 104, 0x63e0b0, 0x2f5a70);
    grid.position.y = 0.06;
    grid.material.opacity = 0.18; grid.material.transparent = true;
    this.scene.add(grid);
  }

  _buildScopeBoundary(){
    const r = SCOPE.radius, seg = 128, pts = [];
    for(let i=0;i<=seg;i++){
      const a=(i/seg)*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r;
      pts.push(new THREE.Vector3(x, heightAt(x,z)+0.4, z));
    }
    this.scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color:0x2ee6a6 })));
    for(let i=0;i<seg;i+=4){
      const a=(i/seg)*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r;
      const post=new THREE.Mesh(
        new THREE.CylinderGeometry(0.25,0.25,5,6),
        new THREE.MeshStandardMaterial({ color:0x2ee6a6, emissive:0x0d6b4d, emissiveIntensity:0.7 }));
      post.position.set(x, heightAt(x,z)+2.5, z);
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  _buildDistricts(){
    for(const d of DISTRICTS){
      const { x, z } = d.center, y = heightAt(x, z);
      const disc=new THREE.Mesh(
        new THREE.CylinderGeometry(d.radius, d.radius, 0.6, 48),
        new THREE.MeshStandardMaterial({ color:d.color, transparent:true, opacity:0.22 }));
      disc.position.set(x, y+0.35, z); disc.receiveShadow=true;
      this.scene.add(disc);

      const tower=new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2.4, 16, 6),
        new THREE.MeshStandardMaterial({ color:d.color, emissive:d.color, emissiveIntensity:0.3, flatShading:true }));
      tower.position.set(x, y+8, z); tower.castShadow=true;
      this.scene.add(tower);

      const beacon=new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 16, 16),
        new THREE.MeshStandardMaterial({ color:0xffffff, emissive:d.color, emissiveIntensity:1.4 }));
      beacon.position.set(x, y+17, z);
      this.scene.add(beacon);

      const label=this._makeLabel(`${d.order}. ${d.name.en}\n${d.name.ar}`, d.color);
      label.position.set(x, y+22, z);
      this.scene.add(label);
    }
  }

  _buildNodes(){
    for(const n of NODES){
      const { x, z } = n.pos, y = heightAt(x, z);
      const group=new THREE.Group(); group.position.set(x, y, z);

      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,0.4,12),
        new THREE.MeshStandardMaterial({ color:0x1a2540 }));
      base.position.y=0.2; base.receiveShadow=true; group.add(base);

      const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.1,0),
        new THREE.MeshStandardMaterial({ color:0x2ee6a6, emissive:0x2ee6a6, emissiveIntensity:1.0, flatShading:true }));
      core.position.y=2.4; core.castShadow=true; core.userData.nodeId=n.id; group.add(core);

      const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.08,8,32),
        new THREE.MeshStandardMaterial({ color:0x4da6ff, emissive:0x4da6ff, emissiveIntensity:0.9 }));
      ring.rotation.x=Math.PI/2; ring.position.y=2.4; group.add(ring);

      // beam of light so nodes are visible from far away
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,40,6),
        new THREE.MeshBasicMaterial({ color:0x2ee6a6, transparent:true, opacity:0.18 }));
      beam.position.y=20; group.add(beam);

      group.userData={ nodeId:n.id, core, ring, base };
      this.scene.add(group);
      this.nodeMeshes.push(group);
    }
  }

  _scatterProps(){
    const rng=mulberry32(1337);
    const mats=[0x3a5a7a,0x2f4a6a,0x46688a].map(c=>new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:0.9}));
    for(let i=0;i<130;i++){
      const x=(rng()*2-1)*SCOPE.radius*0.92, z=(rng()*2-1)*SCOPE.radius*0.92;
      if(Math.hypot(x,z)>SCOPE.radius-6) continue;
      const h=2+rng()*12, w=2+rng()*4;
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w), mats[i%3]);
      b.position.set(x, heightAt(x,z)+h/2, z); b.rotation.y=rng()*Math.PI;
      b.castShadow=true; b.receiveShadow=true;
      this.scene.add(b);
    }
  }

  _makeLabel(text, color){
    const cv=document.createElement("canvas"); cv.width=512; cv.height=256;
    const g=cv.getContext("2d");
    g.fillStyle="rgba(10,14,26,.82)"; g.fillRect(0,0,512,256);
    g.strokeStyle="#"+color.toString(16).padStart(6,"0"); g.lineWidth=8; g.strokeRect(6,6,500,244);
    g.fillStyle="#e6ecff"; g.textAlign="center"; g.font="bold 44px Segoe UI";
    text.split("\n").forEach((l,i)=>g.fillText(l,256,110+i*70));
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true}));
    spr.scale.set(20,10,1); return spr;
  }

  nearestNode(pos, range=5){
    let best=null, bd=range;
    for(const g of this.nodeMeshes){
      const d=Math.hypot(g.position.x-pos.x, g.position.z-pos.z);
      if(d<bd){ bd=d; best={group:g, dist:d}; }
    }
    return best;
  }

  setNodeCaptured(nodeId){
    const g=this.nodeMeshes.find(m=>m.userData.nodeId===nodeId);
    if(!g) return;
    g.userData.core.material.color.set(0xffd166);
    g.userData.core.material.emissive.set(0xffd166);
    g.userData.captured=true;
  }

  isOutOfScope(pos){ return Math.hypot(pos.x,pos.z) > SCOPE.radius; }

  update(dt){
    this._t += dt;
    for(const g of this.nodeMeshes){
      g.userData.core.rotation.y += dt*1.2;
      g.userData.ring.rotation.z += dt*0.8;
      g.userData.core.position.y = 2.4 + Math.sin(this._t*2 + g.position.x)*0.15;
    }
  }
}

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }
