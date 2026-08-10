// ============================================================
// world.js — terrain + districts + props + landmarks + nodes
// + scope boundary. Reads data.js for all placement.
// Exposes heightAt(x,z) used by player.js for ground/collision.
// ============================================================
import * as THREE from "three";
import { DISTRICTS, NODES, SCOPE } from "./data.js";

// Gentle procedural terrain — deterministic so it never "moves".
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
    this.nodeMeshes = [];   // interactable node meshes (userData.nodeId)
    this.props = [];
    this._t = 0;
    this._build();
  }

  _build(){
    const s = this.scene;
    s.background = new THREE.Color(0x0a0e1a);
    s.fog = new THREE.Fog(0x0a0e1a, 120, 340);

    // Lighting
    s.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0e1a, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(60, 120, 40);
    s.add(sun);

    this._buildTerrain();
    this._buildScopeBoundary();
    this._buildDistricts();
    this._buildNodes();
    this._scatterProps();
  }

  _buildTerrain(){
    const size = 460, seg = 120;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color:0x14243a, roughness:1, flatShading:true });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);

    // subtle grid to read as a "cyber" range
    const grid = new THREE.GridHelper(460, 92, 0x1f3b5c, 0x142238);
    grid.position.y = 0.05;
    grid.material.opacity = 0.25; grid.material.transparent = true;
    this.scene.add(grid);
  }

  _buildScopeBoundary(){
    // Glowing green ring = the authorized scope. Ethics as a visible rule.
    const r = SCOPE.radius, seg = 128;
    const pts = [];
    for(let i=0;i<=seg;i++){
      const a = (i/seg)*Math.PI*2;
      const x = Math.cos(a)*r, z = Math.sin(a)*r;
      pts.push(new THREE.Vector3(x, heightAt(x,z)+0.4, z));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    this.boundaryLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color:0x2ee6a6 }));
    this.scene.add(this.boundaryLine);

    // faint wall of posts around the ring
    for(let i=0;i<seg;i+=4){
      const a=(i/seg)*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25,0.25,5,6),
        new THREE.MeshStandardMaterial({ color:0x2ee6a6, emissive:0x0d6b4d, emissiveIntensity:0.6 })
      );
      post.position.set(x, heightAt(x,z)+2.5, z);
      this.scene.add(post);
    }
  }

  _buildDistricts(){
    this.districtLabels = [];
    for(const d of DISTRICTS){
      const { x, z } = d.center;
      const y = heightAt(x, z);
      // platform disc
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(d.radius, d.radius, 0.6, 48),
        new THREE.MeshStandardMaterial({ color:d.color, transparent:true, opacity:0.16 })
      );
      disc.position.set(x, y+0.35, z);
      this.scene.add(disc);

      // central landmark: a tower whose color = the district phase
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2.4, 16, 6),
        new THREE.MeshStandardMaterial({ color:d.color, emissive:d.color, emissiveIntensity:0.25, flatShading:true })
      );
      tower.position.set(x, y+8, z);
      this.scene.add(tower);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 16, 16),
        new THREE.MeshStandardMaterial({ color:0xffffff, emissive:d.color, emissiveIntensity:1.2 })
      );
      beacon.position.set(x, y+17, z);
      this.scene.add(beacon);

      // floating billboard label
      const label = this._makeLabel(`${d.order}. ${d.name.en}\n${d.name.ar}`, d.color);
      label.position.set(x, y+22, z);
      this.scene.add(label);
      this.districtLabels.push(label);
    }
  }

  _buildNodes(){
    for(const n of NODES){
      const { x, z } = n.pos;
      const y = heightAt(x, z);
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9,1.1,0.4,12),
        new THREE.MeshStandardMaterial({ color:0x1a2540 })
      );
      base.position.y = 0.2;
      group.add(base);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1, 0),
        new THREE.MeshStandardMaterial({ color:0x2ee6a6, emissive:0x2ee6a6, emissiveIntensity:0.9, flatShading:true })
      );
      core.position.y = 2.4;
      core.userData.nodeId = n.id;
      group.add(core);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.7, 0.08, 8, 32),
        new THREE.MeshStandardMaterial({ color:0x4da6ff, emissive:0x4da6ff, emissiveIntensity:0.8 })
      );
      ring.rotation.x = Math.PI/2; ring.position.y = 2.4;
      group.add(ring);

      group.userData = { nodeId:n.id, core, ring, base };
      this.scene.add(group);
      this.nodeMeshes.push(group);
    }
  }

  _scatterProps(){
    // low-poly "buildings/servers" for a city feel; skip near towers/nodes.
    const rng = mulberry32(1337);
    const mat = [0x1b2b47,0x223357,0x18324d].map(c=>new THREE.MeshStandardMaterial({color:c,flatShading:true}));
    for(let i=0;i<130;i++){
      const x=(rng()*2-1)*SCOPE.radius*0.92, z=(rng()*2-1)*SCOPE.radius*0.92;
      if(Math.hypot(x,z)>SCOPE.radius-6) continue;
      const h=2+rng()*12, w=2+rng()*4;
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w), mat[i%3]);
      b.position.set(x, heightAt(x,z)+h/2, z);
      b.rotation.y=rng()*Math.PI;
      this.scene.add(b);
    }
  }

  _makeLabel(text, color){
    const cv=document.createElement("canvas"); cv.width=512; cv.height=256;
    const g=cv.getContext("2d");
    g.fillStyle="rgba(10,14,26,.8)"; g.fillRect(0,0,512,256);
    g.strokeStyle="#"+color.toString(16).padStart(6,"0"); g.lineWidth=8; g.strokeRect(6,6,500,244);
    g.fillStyle="#e6ecff"; g.textAlign="center"; g.font="bold 44px Segoe UI";
    text.split("\n").forEach((line,i)=>g.fillText(line,256,110+i*70));
    const tex=new THREE.CanvasTexture(cv);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    spr.scale.set(20,10,1);
    return spr;
  }

  // returns {group, dist} of nearest interactable node within range, or null
  nearestNode(pos, range=4.5){
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

// tiny deterministic PRNG so the world is identical every load
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
