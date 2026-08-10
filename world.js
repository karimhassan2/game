function buildWorld(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3a72a0);
  scene.fog = new THREE.Fog(0x3a72a0, 80, 300);
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3a2a, 1.2));
  var d = new THREE.DirectionalLight(0xfff2df, 1.4); d.position.set(40,80,30); scene.add(d);

  var g = new THREE.PlaneGeometry(400,400,90,90); g.rotateX(-Math.PI/2);
  var p = g.attributes.position;
  for(var i=0;i<p.count;i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0x2c6e57, roughness:.95, flatShading:true})));

  var gh = new THREE.GridHelper(400,80,0x63e0b0,0x2f5a70);
  gh.position.y=.05; gh.material.opacity=.2; gh.material.transparent=true; scene.add(gh);

  var by = H(NODE.pos.x, NODE.pos.z);
  var bank = new THREE.Mesh(new THREE.BoxGeometry(14,20,12), new THREE.MeshStandardMaterial({color:0x24406a, flatShading:true}));
  bank.position.set(NODE.pos.x, by+10, NODE.pos.z-4); scene.add(bank);
  var sg = new THREE.Mesh(new THREE.BoxGeometry(10,2.4,.6), new THREE.MeshStandardMaterial({color:0xffd166, emissive:0xffd166, emissiveIntensity:.7}));
  sg.position.set(NODE.pos.x, by+16, NODE.pos.z+2.2); scene.add(sg);
  scene.add(label("🏦 AcmeBank", NODE.pos.x, by+22, NODE.pos.z-4));

  ng = new THREE.Group(); ng.position.set(NODE.pos.x, by, NODE.pos.z);
  var core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2,0), new THREE.MeshStandardMaterial({color:0x2ee6a6, emissive:0x2ee6a6, emissiveIntensity:1, flatShading:true})); core.position.y=2.4; ng.add(core);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.8,.08,8,28), new THREE.MeshStandardMaterial({color:0x4da6ff, emissive:0x4da6ff, emissiveIntensity:.9})); ring.rotation.x=Math.PI/2; ring.position.y=2.4; ng.add(ring);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,40,6), new THREE.MeshBasicMaterial({color:0x2ee6a6, transparent:true, opacity:.18})); beam.position.y=20; ng.add(beam);
  ng.userData = { core:core, ring:ring }; scene.add(ng);
}

function label(t,x,y,z){
  var c = document.createElement("canvas"); c.width=512; c.height=140;
  var g = c.getContext("2d");
  g.fillStyle="rgba(10,14,26,.82)"; g.fillRect(0,0,512,140);
  g.strokeStyle="#ffd166"; g.lineWidth=8; g.strokeRect(6,6,500,128);
  g.fillStyle="#e6ecff"; g.textAlign="center"; g.font="bold 52px Segoe UI"; g.fillText(t,256,92);
  var s = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
  s.scale.set(16,4.4,1); s.position.set(x,y,z); return s;
}
