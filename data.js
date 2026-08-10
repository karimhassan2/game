// shared content + state + helpers (loads first)
var NODE = { pos:{ x:0, z:-30 } };
var SCOPE = 110;

var scene, camera, renderer, ng, grp, clock;
var P = { pos:null, face:Math.PI, cy:0, cp:.4, cd:12, keys:{}, joy:{x:0,y:0,a:false}, cam:null, init:false };
var solved = false, run = false, near = false, tt;
var isT = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;

function $(i){ return document.getElementById(i); }
function H(x,z){ return Math.sin(x*.035)*2.2 + Math.cos(z*.03)*2 + Math.sin((x+z)*.012)*1.4; }

if(typeof THREE==="undefined") showErr("Three.js not loaded — connect to internet & refresh.");
