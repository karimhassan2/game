// ============================================================
// audio.js — bilingual speech (Web Speech API) + WebAudio sfx.
// Everything degrades gracefully if APIs are unavailable.
// ============================================================
let muted = false;
let ctx = null;

function ac(){
  if(ctx) return ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  return ctx;
}

function beep(freq, dur=0.12, type="sine", gain=0.06){
  const a = ac(); if(!a || muted) return;
  if(a.state === "suspended") a.resume();
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(a.destination);
  const t = a.currentTime;
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur);
}

export const Audio = {
  isMuted(){ return muted; },
  toggleMute(){ muted = !muted; if(muted) this.stopSpeech(); return muted; },

  // sfx presets
  discover(){ beep(660,0.10,"triangle"); setTimeout(()=>beep(880,0.12,"triangle"),90); },
  correct(){ beep(720,0.10,"square",0.05); setTimeout(()=>beep(1040,0.16,"square",0.05),90); },
  wrong(){ beep(220,0.22,"sawtooth",0.05); },
  levelup(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.16,"triangle"),i*110)); },
  violation(){ beep(160,0.3,"sawtooth",0.07); },
  click(){ beep(440,0.05,"sine",0.04); },

  // Bilingual narration: speak EN then AR when available.
  speak(en, ar){
    if(muted || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const uEn = new SpeechSynthesisUtterance(en); uEn.lang="en-US"; uEn.rate=1;
      speechSynthesis.speak(uEn);
      if(ar){
        const uAr = new SpeechSynthesisUtterance(ar); uAr.lang="ar-SA"; uAr.rate=1;
        speechSynthesis.speak(uAr);
      }
    } catch {}
  },
  stopSpeech(){ if("speechSynthesis" in window){ try{ speechSynthesis.cancel(); }catch{} } },
};
