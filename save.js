// ============================================================
// save.js — profiles + progress, persisted in localStorage.
// ============================================================
const KEY = "cyberRange.save.v1";

function readAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || { profiles:{}, last:null }; }
  catch { return { profiles:{}, last:null }; }
}
function writeAll(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

function freshProfile(name){
  return {
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    xp: 0,
    discovered: {},      // nodeId -> { correct:bool, attempts:int, at:timestamp }
    badges: {},          // districtId -> true when all its nodes captured
    flags: 0,            // total captured
    violations: 0,       // out-of-scope events
    events: [],          // audit trail for the teacher dashboard
  };
}

export const Save = {
  listProfiles(){ return Object.keys(readAll().profiles); },
  lastPlayed(){ return readAll().last; },

  load(name){
    const all = readAll();
    if(!all.profiles[name]) all.profiles[name] = freshProfile(name);
    all.last = name; writeAll(all);
    return all.profiles[name];
  },

  save(profile){
    const all = readAll();
    profile.updatedAt = Date.now();
    all.profiles[profile.name] = profile;
    all.last = profile.name;
    writeAll(all);
  },

  // Record a discovery attempt + log an event for analytics.
  recordAttempt(profile, node, correct){
    const d = profile.discovered[node.id] || { correct:false, attempts:0, at:null };
    d.attempts += 1;
    if(correct && !d.correct){ d.correct = true; d.at = Date.now(); profile.flags += 1; profile.xp += node.xp; }
    profile.discovered[node.id] = d;
    profile.events.push({ t:Date.now(), type:"attempt", node:node.id, district:node.district, correct });
    this.save(profile);
    return d;
  },

  recordViolation(profile){
    profile.violations += 1;
    profile.events.push({ t:Date.now(), type:"scope_violation" });
    this.save(profile);
  },

  recordBadge(profile, districtId){
    if(!profile.badges[districtId]){
      profile.badges[districtId] = true;
      profile.events.push({ t:Date.now(), type:"badge", district:districtId });
      this.save(profile);
      return true;
    }
    return false;
  },

  exportJSON(){ return JSON.stringify(readAll(), null, 2); },
};
