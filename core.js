/* ===== 核心：工具、存檔、音效、語音、介面 ===== */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rnd = n => Math.floor(Math.random() * n);
const pickOne = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }
function seeded(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function seededShuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function today(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function hashPw(s) { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 儲存（本機） ---------- */
const LS = {
  mem: {},
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? (this.mem[k] ?? d) : JSON.parse(v); } catch (e) { return this.mem[k] ?? d; } },
  set(k, v) { this.mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
};

/* 裝置設定 */
const S = Object.assign({
  sfx: true, music: true, voice: true, readQ: true, rate: 1.05, vol: 0.9,
  theme: 'scholar', big: false, elder: false
}, LS.get('tk_settings', {}));
function saveSettings() { LS.set('tk_settings', S); applySettings(); }
function applySettings() {
  document.body.className = 'theme-' + S.theme + (S.big || S.elder ? ' big' : '');
  const tc = { scholar: '#f6ead2', sakura: '#fff0f4', cute: '#fff8d9', temple: '#fbe3c4', night: '#1b2140' };
  const m = $('meta[name=theme-color]'); if (m) m.content = tc[S.theme] || '#f6ead2';
  Music.toggle(S.music);
}

/* ---------- 玩家資料 ---------- */
function newData() {
  return {
    xp: 0, coins: 120, items: { fifty: 3, time: 3, audience: 2, skip: 2, life: 1 },
    stats: {}, seen: {}, wrong: [], ach: {}, title: '', frame: 0,
    levels: {}, best: { speed: 0, survival: 0, endless: 0, battleWins: 0, boardWins: 0 },
    daily: {}, totals: { answered: 0, correct: 0, maxStreak: 0, games: 0 },
    brain: { lv: {}, hist: [], ages: [], checkup: {} },
    session: null, tutorial: false, created: today(), lastLogin: ''
  };
}
let P = null, PNAME = '';
const Profile = {
  all() { return LS.get('tk_profiles', {}); },
  load(name) {
    const all = this.all(); const rec = all[name]; if (!rec) return false;
    P = Object.assign(newData(), rec.data); PNAME = name;
    P.items = Object.assign(newData().items, P.items || {});
    P.best = Object.assign(newData().best, P.best || {});
    P.totals = Object.assign(newData().totals, P.totals || {});
    P.brain = Object.assign(newData().brain, P.brain || {});
    LS.set('tk_current', name); return true;
  },
  create(name, pw) { const all = this.all(); all[name] = { pw: hashPw(pw), data: newData() }; LS.set('tk_profiles', all); return this.load(name); },
  check(name, pw) { const r = this.all()[name]; return r && r.pw === hashPw(pw); },
  save() { if (!P || !PNAME) return; if (typeof NET !== 'undefined' && NET.on && NET.token) return NET.queueSave(); const all = this.all(); if (!all[PNAME]) return; all[PNAME].data = P; LS.set('tk_profiles', all); },
  logout() { this.save(); P = null; PNAME = ''; LS.del('tk_current'); }
};
function save() { Profile.save(); updateCoins(); }
window.addEventListener('pagehide', () => { if (typeof Game !== 'undefined' && Game.snapshot) Game.snapshot(); Profile.save(); if (typeof NET !== 'undefined') NET.beacon(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (typeof Game !== 'undefined' && Game.snapshot) Game.snapshot(); Profile.save(); if (typeof NET !== 'undefined') NET.flush(); } });

/* ---------- 學歷等級 ---------- */
const RANKS = [
  ['幼稚園', 0, '🧸'], ['國小', 100, '🎒'], ['國中', 300, '📘'], ['高中', 700, '📗'], ['大學', 1300, '🎓'],
  ['碩士', 2200, '📜'], ['博士', 3500, '🧪'], ['博士後研究員', 5200, '🔬'], ['教授', 7500, '👨‍🏫'], ['院士', 10500, '🏛️'], ['叫我全能智慧王', 15000, '👑']
];
function rankIndex(xp = P ? P.xp : 0) { let i = 0; RANKS.forEach((r, k) => { if (xp >= r[1]) i = k; }); return i; }
function rankName(xp) { return RANKS[rankIndex(xp)][0]; }
function addXP(n) {
  const before = rankIndex(); P.xp += Math.round(n); const after = rankIndex();
  if (after > before) { if (typeof OL !== 'undefined' && OL.inGame) OL.pendingGrad = after; else setTimeout(() => graduation(after), 600); }
}
function addCoins(n) { P.coins = Math.max(0, P.coins + Math.round(n)); updateCoins(); }
function updateCoins() { const c = $('#tbCoins'); if (c) c.textContent = '🪙 ' + (P ? P.coins : 0); }

/* ---------- 音效（全部即時合成） ---------- */
const SFX = {
  ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(f, d = .15, type = 'sine', v = .2, t0 = 0, f2 = null) {
    if (!S.sfx || !this.ctx) return; const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v * S.vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
  },
  noise(d = .3, v = .2, freq = 800, t0 = 0, q = 1, type = 'bandpass') {
    if (!S.sfx || !this.ctx) return; const c = this.ctx, t = c.currentTime + t0;
    const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), da = b.getChannelData(0);
    for (let i = 0; i < da.length; i++) da[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v * S.vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  play(n) { this.init(); const fn = this.lib[n]; if (fn) try { fn(this); } catch (e) { } },
  lib: {
    click: s => s.tone(660, .06, 'triangle', .15),
    tick: s => s.tone(1200, .04, 'square', .06),
    tickLow: s => s.tone(500, .07, 'square', .1),
    correct: s => { s.tone(784, .12, 'triangle', .25); s.tone(1046, .25, 'triangle', .25, .1); },
    wrong: s => { s.tone(220, .18, 'sawtooth', .18); s.tone(165, .3, 'sawtooth', .18, .15); },
    buzz: s => { s.tone(880, .08, 'square', .2); s.tone(1320, .2, 'square', .2, .08); },
    coin: s => { s.tone(988, .07, 'square', .12); s.tone(1319, .2, 'square', .12, .07); },
    levelup: s => [523, 659, 784, 1046, 1318].forEach((f, i) => s.tone(f, .25, 'triangle', .22, i * .11)),
    fanfare: s => [[523, 0], [523, .12], [523, .24], [659, .36], [784, .6], [659, .78], [784, .9], [1046, 1.1]].forEach(([f, t]) => s.tone(f, .3, 'square', .1, t)),
    firework: s => { s.tone(300, .5, 'sine', .12, 0, 1400); s.noise(.6, .3, 2000, .5, .5); },
    flip: s => s.noise(.08, .25, 3000, 0, 2),
    dice: s => { for (let i = 0; i < 6; i++) s.noise(.05, .25, 1500 + i * 200, i * .07, 3); },
    heart: s => { s.tone(600, .1, 'triangle', .2); s.tone(300, .4, 'triangle', .2, .1, 120); s.noise(.2, .2, 900, .05); },
    boing: s => s.tone(150, .5, 'sine', .3, 0, 600),
    fart: s => { s.tone(90, .6, 'sawtooth', .22, 0, 55); s.noise(.6, .25, 200, 0, 4, 'lowpass'); },
    slide: s => s.tone(1200, .5, 'sine', .2, 0, 200),
    whoosh: s => s.noise(.35, .2, 1200, 0, .7),
    pop: s => s.tone(400, .08, 'sine', .25, 0, 900),
    drum: s => { for (let i = 0; i < 14; i++) s.noise(.06, .22, 180, i * .06, 2, 'lowpass'); },
    lightTick: s => s.tone(1500 + rnd(400), .05, 'square', .07),
    lightStop: s => { s.tone(1046, .15, 'square', .14); s.tone(1568, .35, 'square', .14, .12); },
    gong: s => { s.tone(110, 1.6, 'sine', .35); s.tone(220, 1.2, 'sine', .15); s.tone(331, 1, 'triangle', .08); },
    warn: s => { s.tone(880, .12, 'square', .14); s.tone(880, .12, 'square', .14, .2); },
    win: s => [659, 784, 880, 1046, 880, 1046, 1318].forEach((f, i) => s.tone(f, .22, 'triangle', .2, i * .12)),
    lose: s => [392, 370, 349, 330].forEach((f, i) => s.tone(f, .35, 'sawtooth', .12, i * .3)),
    stamp: s => { s.noise(.12, .4, 300, 0, 1, 'lowpass'); s.tone(90, .15, 'sine', .3); }
  }
};
/* 背景音樂：五聲音階輕柔旋律 */
const Music = {
  // 五聲音階（宮商角徵羽）的輕快小曲，像古箏撥弦，搭配低音
  timer: null, step: 0, phrase: 0,
  N: { do: 392, re: 440, mi: 494, so: 587, la: 659, Do: 784, Re: 880, Mi: 988, '-': 0 },
  P: [
    ['so', 'la', 'Do', '-', 'la', 'so', 'mi', '-', 're', 'mi', 'so', 'la', 'so', '-', '-', '-'],
    ['mi', 'so', 'la', 'Do', 'Re', '-', 'Do', 'la', 'so', 'la', 'Do', '-', 'la', '-', '-', '-'],
    ['Do', 'la', 'so', 'mi', 're', '-', 'mi', 'so', 'la', 'so', 'mi', 're', 'do', '-', '-', '-'],
    ['la', 'Do', 'Re', 'Mi', 'Re', 'Do', 'la', '-', 'so', 'la', 'Do', 'la', 'so', '-', '-', '-']
  ],
  B: ['do', 'la', 'mi', 'so'],
  toggle(on) { if (on && !this.timer) { this.timer = setInterval(() => this.note(), 300); } else if (!on && this.timer) { clearInterval(this.timer); this.timer = null; } },
  pluck(f, t, v, dur) {
    const c = SFX.ctx; const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * S.vol, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    const g2 = c.createGain(); g2.gain.value = .25; o2.connect(g2).connect(g);
    o.connect(g).connect(c.destination); o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  },
  note() {
    if (!SFX.ctx || !S.music || document.hidden || SFX.ctx.state !== 'running') return;
    const ph = this.P[this.phrase], i = this.step % 16, t = SFX.ctx.currentTime + .02;
    const n = this.N[ph[i]]; if (n) this.pluck(n, t, .045, .9);
    if (i % 8 === 0) this.pluck(this.N[this.B[this.phrase]] / 2, t, .05, 1.6);
    this.step++; if (this.step % 16 === 0) this.phrase = (this.phrase + 1) % this.P.length;
  }
};

/* ---------- 語音 ---------- */
const Voice = {
  v: null, ok: 'speechSynthesis' in window,
  init() {
    if (!this.ok) return;
    const pick = () => { const vs = speechSynthesis.getVoices(); this.v = vs.find(v => /zh[-_]TW/i.test(v.lang)) || vs.find(v => /zh[-_](HK|Hant)/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null; };
    pick(); speechSynthesis.onvoiceschanged = pick;
  },
  say(t, opt = {}) {
    if (!this.ok || !S.voice || !t) return;
    try {
      if (!opt.queue) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(t).replace(/[_＿]{2,}/g, '空格').replace(/[「」『』]/g, ''));
      u.lang = 'zh-TW'; if (this.v) u.voice = this.v; u.rate = (opt.rate || 1) * S.rate; u.pitch = opt.pitch || 1.15; u.volume = S.vol;
      if (opt.onend) u.onend = opt.onend;
      speechSynthesis.speak(u);
    } catch (e) { }
  },
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { } }
};

/* ---------- 主持人台詞 ---------- */
const LINES = {
  correct: ['答對了！你的腦袋是不是有開外掛？', '漂亮！這題難不倒你！', '正確！給你一個讚！', '厲害厲害，我要拿筆記下來！', '答對！你家祖宗都在為你鼓掌！', '這麼快？你是不是偷看答案？', '正解！智慧的光芒好刺眼啊！', '答對了，今晚加雞腿！', '完全正確，貓頭鷹佩服！'],
  wrong: ['哎呀！這題連我家的貓都知道喔～', '答錯了，沒關係，失敗為成功之母，你媽很多！', '嗚嗚，差一點點……其實差很多。', '別難過，我第一次也答錯……好啦我是騙你的。', '錯了！不過你答錯的樣子還是很帥。', '這題出得太壞了，不是你的錯（大概）。', '答錯了，請喝口水冷靜一下！'],
  timeout: ['時間到！你剛剛是不是睡著了？', '叮咚！時間到，腦袋還在開機嗎？', '慢了一步，答案已經坐車走了！'],
  streak3: ['三連勝！小有學問喔！'], streak5: ['五連勝！才高八斗！'], streak10: ['十連勝！天下無雙，請收下我的膝蓋！'], streak20: ['二十連勝！你是人類還是百科全書？'],
  start: ['準備好了嗎？智慧之門要開啟囉！', '來吧！讓我看看你的實力！', '深呼吸，放輕鬆，答錯也不會被當掉的！'],
  idle: ['嗯……好睏……', '你還在嗎？我要打瞌睡囉……']
};
function line(k) { return pickOne(LINES[k] || ['']); }

/* ---------- 介面輔助 ---------- */
let backHandler = null, helpHandler = null;
function setTop(title, back, help) {
  const tb = $('#topbar'); tb.classList.remove('hidden');
  $('#tbTitle').textContent = title || '';
  backHandler = back || null; helpHandler = help || null;
  $('#btnBack').style.visibility = back ? 'visible' : 'hidden';
  $('#btnHelp').style.visibility = help ? 'visible' : 'hidden';
  updateCoins();
}
function hideTop() { $('#topbar').classList.add('hidden'); }
function view(html) { if (typeof Owl !== 'undefined') clearTimeout(Owl.timer); const v = $('#view'); v.innerHTML = html; window.scrollTo(0, 0); Owl.mountAll(); return v; }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('#toast').appendChild(d); setTimeout(() => d.remove(), 2700); }
function banner(t, sound) { const d = document.createElement('div'); d.className = 'event-banner'; d.textContent = t; document.body.appendChild(d); if (sound) SFX.play(sound); setTimeout(() => d.remove(), 1900); }
function modal(html, opts = {}) {
  const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.classList.remove('hidden');
  Owl.mountAll(m);
  m.onclick = e => { if (e.target === m && opts.dismiss !== false) closeModal(); };
  return m.firstChild;
}
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
function ask(title, msg, buttons) {
  return new Promise(res => {
    const box = modal(`<div class="mt">${title}</div><div class="center" style="margin:8px 0 14px;line-height:1.7">${msg}</div><div>${buttons.map((b, i) => `<button class="btn block ${b.cls || (i === 0 ? 'primary' : '')}" data-i="${i}">${b.t}</button>`).join('')}</div>`, { dismiss: false });
    $$('button[data-i]', box).forEach(b => b.onclick = () => { SFX.play('click'); closeModal(); res(buttons[+b.dataset.i].v); });
  });
}
function confetti(n = 60) {
  const fx = $('#fx'); const cols = ['#ff5a5f', '#ffcf00', '#2ec4b6', '#3a86ff', '#8f5cff', '#ff4fa3', '#ff9f1c'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.left = (40 + Math.random() * 20) + '%'; c.style.top = '40%'; c.style.background = pickOne(cols);
    c.style.setProperty('--dx', (Math.random() * 600 - 300) + 'px'); c.style.setProperty('--dy', (Math.random() * 500 - 350) + 'px');
    c.style.animationDuration = (1 + Math.random()) + 's'; fx.appendChild(c); setTimeout(() => c.remove(), 2200);
  }
}
function shakeScreen() { const a = $('#app'); a.classList.remove('shake-screen'); void a.offsetWidth; a.classList.add('shake-screen'); }
/* 背景飄落物 */
let petalTimer = null;
function startPetals() {
  clearInterval(petalTimer);
  petalTimer = setInterval(() => {
    if (document.hidden) return;
    const set = { scholar: ['🍂', '🪶', '📜'], sakura: ['🌸', '🌸', '💮'], cute: ['⭐', '🍬', '💖', '🫧'], temple: ['🏮', '🧧', '✨'], night: ['✨', '⭐', '🌙'] }[S.theme] || ['🌸'];
    const p = document.createElement('span'); p.className = 'petal'; p.textContent = pickOne(set);
    p.style.left = Math.random() * 100 + 'vw'; p.style.animationDuration = (7 + Math.random() * 6) + 's'; p.style.fontSize = (14 + rnd(14)) + 'px';
    $('#bg').appendChild(p); setTimeout(() => p.remove(), 14000);
  }, 1800);
}
/* 升級：畢業典禮 */
function graduation(i) {
  SFX.play('levelup'); confetti(90);
  const r = RANKS[i];
  Voice.say(`恭喜畢業！你現在是${r[0]}等級了！`);
  modal(`<div class="mt">🎓 畢業典禮 🎓</div><div class="owl home-owl" data-s="dance"></div>
  <div class="center h2">恭喜晉升「${r[2]} ${r[0]}」！</div>
  <div class="center muted">新的銘牌框已解鎖，可到「我的資料」更換</div>
  <button class="btn primary block" onclick="closeModal()">太棒了！</button>`);
  save();
}
/* 閒置打瞌睡 */
let idleT = 0;
function poke() { idleT = Date.now(); $$('.owl[data-s=sleep]').forEach(o => o.dataset.s = 'idle'); }
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { poke(); SFX.init(); }, true));
setInterval(() => { if (Date.now() - idleT > 30000) $$('.owl[data-s=idle]').forEach(o => o.dataset.s = 'sleep'); }, 5000);
