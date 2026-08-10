// ============================================================
// data.js — ALL content. Single focus: Broken Access Control.
// No quizzes — the lab IS the challenge.
// ============================================================
export const GAME = {
  title: { en:"Cyber Range: BAC Lab", ar:"نطاق التدريب: معمل BAC" },
};

export const SCOPE = { radius: 130, penalty: 15 };

// One district = the target site
export const DISTRICTS = [
  { id:"acme", order:1, color:0x4da6ff, center:{x:-95,z:-110}, radius:34,
    name:{ en:"AcmeBank HQ", ar:"مقر AcmeBank" },
    phase:{ en:"Target — Broken Access Control", ar:"الهدف — التحكم المعطّل بالوصول" },
    intro:{ en:"Break access control to reach the admin panel.",
            ar:"اكسر التحكم بالوصول للوصول إلى لوحة الإدارة." } },
];

// One node, wired to the interactive BAC lab
export const NODES = [
  { id:"bac", district:"acme", pos:{x:-95,z:-108}, xp:100, lab:"bac",
    title:{ en:"Broken Access Control (OWASP #1)", ar:"التحكم المعطّل بالوصول (OWASP #1)" },
    tag:{ en:"OWASP Top 10 · Hands-on", ar:"OWASP · تطبيقي" },
    card:{ en:"Broken Access Control lets a user act outside their permissions — reading others' data (IDOR) or opening admin pages directly. It's the #1 web risk. In this lab you'll exploit a live example yourself.",
           ar:"يتيح التحكم المعطّل بالوصول للمستخدم تجاوز صلاحياته — رؤية بيانات غيره (IDOR) أو فتح صفحات الإدارة مباشرةً. إنه الخطر الأول للويب. في هذا المعمل ستستغل مثالًا حيًا بنفسك." } },
];

export const TOTAL_NODES = NODES.length;
export const MAX_XP = NODES.reduce((s,n)=>s+n.xp,0);
export const nodesOf = (d)=> NODES.filter(n=>n.district===d);
export const districtById = (id)=> DISTRICTS.find(d=>d.id===id);
