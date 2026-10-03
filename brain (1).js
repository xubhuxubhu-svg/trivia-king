/* ===== 大腦訓練專區 ===== */
const BAREA = { mem: '記憶力', att: '專注力', spd: '反應速度', flx: '轉換能力', spa: '空間推理', log: '邏輯推理', lng: '語言能力' };
const BG = {};

/* 1. 記憶方格（工作記憶） */
BG.mem = { name: '記憶方格', icon: '🧠', area: 'mem', how: '方格會亮起幾秒，記住亮的位置，熄滅後把它們全部點出來。答對會越來越難！',
  run(el, lv, done) {
    let round = 0, ok = 0, n = 2 + lv, sum = 0; const R = 6;
    const play = () => {
      if (round >= R) return done({ score: clamp(Math.round(sum / R * 7.5 + ok / R * 25), 0, 100), acc: ok / R, lv: n - 2 });
      const G = n > 8 ? 5 : 4; const cells = shuffle([...Array(G * G).keys()]).slice(0, n); const hit = new Set();
      el.innerHTML = `<div class="gauge">第 ${round + 1}/${R} 回・要記住 ${n} 格</div><div class="mgrid" style="grid-template-columns:repeat(${G},1fr)">${Array.from({ length: G * G }, (_, i) => `<button class="mcell" data-i="${i}"></button>`).join('')}</div><div class="muted" id="mtip">記住亮起的位置！</div>`;
      const bs = $$('.mcell', el); cells.forEach(i => bs[i].classList.add('on')); SFX.play('flip');
      let can = false;
      setTimeout(() => { bs.forEach(b => b.classList.remove('on')); can = true; $('#mtip').textContent = '換你點出來！'; }, 900 + n * 180);
      bs.forEach(b => b.onclick = () => {
        if (!can) return; const i = +b.dataset.i; if (hit.has(i)) return;
        if (cells.includes(i)) { hit.add(i); b.classList.add('ok'); SFX.play('pop'); if (hit.size === n) { can = false; ok++; sum += n; SFX.play('correct'); n = Math.min(14, n + 1); round++; setTimeout(play, 700); } }
        else { can = false; b.classList.add('ng'); SFX.play('wrong'); cells.forEach(k => bs[k].classList.add('on')); sum += hit.size * .6; n = Math.max(2, n - 1); round++; setTimeout(play, 1200); }
      });
    };
    play();
  } };

/* 2. 顏色干擾（專注與抑制） */
BG.att = { name: '顏色大作戰', icon: '🎨', area: 'att', how: '畫面上的字會用某種顏色寫出來，請選「字的顏色」，不是字的意思！例如藍色的「紅」字要選藍色。',
  run(el, lv, done) {
    const C = [['紅', '#e53935'], ['藍', '#1e88e5'], ['綠', '#43a047'], ['黃', '#f9a825'], ['紫', '#8e24aa']];
    let ok = 0, ng = 0, cur;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">答對 0</div><div class="stroop-word" id="sw"></div><div class="grid3" id="sb"></div>`;
    const nxt = () => {
      const w = rnd(5); let c = rnd(5); if (Math.random() < .8) while (c === w) c = rnd(5); cur = c;
      $('#sw').textContent = C[w][0]; $('#sw').style.color = C[c][1];
      const order = lv >= 4 ? shuffle([0, 1, 2, 3, 4]) : [0, 1, 2, 3, 4];
      $('#sb').innerHTML = order.map(k => `<button class="btn" data-k="${k}" style="${lv >= 6 ? 'color:' + C[rnd(5)][1] : ''}">${C[k][0]}色</button>`).join('');
      $$('#sb .btn').forEach(b => b.onclick = () => { if (+b.dataset.k === cur) { ok++; SFX.play('pop'); } else { ng++; SFX.play('wrong'); } $('#bsc').textContent = `答對 ${ok}・答錯 ${ng}`; nxt(); });
    };
    nxt();
    const sec = 30; const t = Timer(sec, l => $('#btb').firstChild.style.width = l / sec * 100 + '%', () => done({ score: clamp(Math.round(ok * 4.2 - ng * 4), 0, 100), acc: ok / Math.max(1, ok + ng) }));
    BrainRun.timer = t;
  } };

/* 3. 快速比大小（處理速度） */
BG.spd = { name: '閃電比大小', icon: '⚡', area: 'spd', how: '左右兩邊誰比較大？越快點越好！等級越高，數字越接近，還會出現算式。',
  run(el, lv, done) {
    let ok = 0, ng = 0, big;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">答對 0</div><div class="row" style="margin-top:24px"><button class="btn bbig" id="L" style="min-height:120px"></button><button class="btn bbig" id="Rr" style="min-height:120px"></button></div>`;
    const mk = () => { const range = lv < 4 ? 50 : 99; const a = 1 + rnd(range); let b; do { b = a + (rnd(2) ? 1 : -1) * (1 + rnd(Math.max(2, 20 - lv * 2))); } while (b < 1 || b === a); return [a, b]; };
    const txt = v => { if (lv >= 5 && Math.random() < .5) { const x = 1 + rnd(Math.max(1, v - 1)); return x < v ? `${x}+${v - x}` : String(v); } return String(v); };
    const nxt = () => { const [a, b] = mk(); big = a > b ? 'L' : 'Rr'; $('#L').textContent = txt(a); $('#Rr').textContent = txt(b); $('#L').style.fontSize = $('#Rr').style.fontSize = '1.4em'; };
    ['L', 'Rr'].forEach(id => $('#' + id).onclick = () => { if (id === big) { ok++; SFX.play('pop'); } else { ng++; SFX.play('wrong'); } $('#bsc').textContent = `答對 ${ok}・答錯 ${ng}`; nxt(); });
    nxt();
    const sec = 30; BrainRun.timer = Timer(sec, l => $('#btb').firstChild.style.width = l / sec * 100 + '%', () => done({ score: clamp(Math.round(ok * 3.4 - ng * 3), 0, 100), acc: ok / Math.max(1, ok + ng) }));
  } };

/* 4. 規則轉換（認知彈性） */
BG.flx = { name: '規則大變身', icon: '🔀', area: 'flx', how: '上方會告訴你現在要「看數字」還是「看顏色」。看數字就判斷奇數或偶數；看顏色就判斷紅色或藍色。規則隨時會變喔！',
  run(el, lv, done) {
    let ok = 0, ng = 0, rule = 0, ans;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">答對 0</div><div style="margin-top:10px"><span class="rule" id="rl"></span></div><div class="flex-card" id="fc"></div><div class="row"><button class="btn" id="b0" style="min-height:70px">奇數 ／ 🔴紅色</button><button class="btn" id="b1" style="min-height:70px">偶數 ／ 🔵藍色</button></div>`;
    const nxt = () => {
      if (Math.random() < .25 + lv * .04) { rule = 1 - rule; SFX.play('whoosh'); $('#rl').animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], 300); }
      const num = 1 + rnd(9), red = rnd(2) === 0;
      $('#rl').textContent = rule ? '🎨 看顏色！' : '🔢 看數字！'; $('#fc').textContent = num; $('#fc').style.color = red ? '#e53935' : '#1e88e5';
      ans = rule ? (red ? 0 : 1) : (num % 2 ? 0 : 1);
    };
    [0, 1].forEach(k => $('#b' + k).onclick = () => { if (k === ans) { ok++; SFX.play('pop'); } else { ng++; SFX.play('wrong'); } $('#bsc').textContent = `答對 ${ok}・答錯 ${ng}`; nxt(); });
    nxt();
    const sec = 35; BrainRun.timer = Timer(sec, l => $('#btb').firstChild.style.width = l / sec * 100 + '%', () => done({ score: clamp(Math.round(ok * 4 - ng * 4), 0, 100), acc: ok / Math.max(1, ok + ng) }));
  } };

/* 5. 旋轉辨識（空間推理） */
BG.spa = { name: '旋轉積木', icon: '🧊', area: 'spa', how: '右邊的積木是左邊的積木「轉動」後的樣子，還是「翻面（鏡像）」後的樣子？',
  run(el, lv, done) {
    let i = 0, ok = 0, tsum = 0; const N = 10, size = Math.min(8, 4 + Math.floor(lv / 2));
    const poly = () => { const s = [[0, 0]]; while (s.length < size) { const [x, y] = pickOne(s); const [dx, dy] = pickOne([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (!s.some(p => p[0] === x + dx && p[1] === y + dy)) s.push([x + dx, y + dy]); } return s; };
    const svg = (s, col) => { const xs = s.map(p => p[0]), ys = s.map(p => p[1]); const mx = Math.min(...xs), my = Math.min(...ys); const w = Math.max(...xs) - mx + 1, h = Math.max(...ys) - my + 1; const u = 100 / Math.max(w, h, 3); const ox = (130 - w * u) / 2, oy = (130 - h * u) / 2; return `<svg viewBox="0 0 130 130">${s.map(([x, y]) => `<rect x="${ox + (x - mx) * u}" y="${oy + (y - my) * u}" width="${u - 2}" height="${u - 2}" rx="4" fill="${col}"/>`).join('')}</svg>`; };
    const nxt = () => {
      if (i >= N) return done({ score: clamp(Math.round(ok * 10 - Math.max(0, tsum / N - 3) * 5), 0, 100), acc: ok / N });
      let s = poly(); let t = s.map(p => p.slice()); let mir = Math.random() < .5;
      // 確保鏡像後和原圖真的不同（對稱圖形就重抽）
      const norm = a => { const mx = Math.min(...a.map(p => p[0])), my = Math.min(...a.map(p => p[1])); return a.map(p => (p[0] - mx) + ',' + (p[1] - my)).sort().join('|'); };
      const rots = a => { let r = a, out = []; for (let k = 0; k < 4; k++) { out.push(norm(r)); r = r.map(([x, y]) => [-y, x]); } return out; };
      let tries = 0; while (rots(s).includes(norm(s.map(([x, y]) => [-x, y]))) && tries++ < 20) s = poly(); t = s.map(p => p.slice());
      if (mir) t = t.map(([x, y]) => [-x, y]); const k = 1 + rnd(3); for (let r = 0; r < k; r++) t = t.map(([x, y]) => [-y, x]);
      el.innerHTML = `<div class="gauge">第 ${i + 1}/${N} 題</div><div class="shapes">${svg(s, '#f5a623')}${svg(t, '#3a86ff')}</div><div class="row"><button class="btn" id="same" style="min-height:64px">🔄 一樣（只是轉動）</button><button class="btn" id="mirr" style="min-height:64px">🪞 鏡像（翻面了）</button></div>`;
      const t0 = Date.now();
      const pick = m => { tsum += (Date.now() - t0) / 1000; if (m === mir) { ok++; SFX.play('correct'); } else { SFX.play('wrong'); brainMiss({ type: 'rot', g: 'spa', s, t, mir }); } i++; BrainRun.later(nxt, 350); };
      $('#same').onclick = () => pick(false); $('#mirr').onclick = () => pick(true);
    };
    nxt();
  } };

/* ---------- 共用工具 ---------- */
const BrainRun = { timer: null, tos: [], keys: null,
  later(fn, ms) { const t = setTimeout(fn, ms); this.tos.push(t); return t; },
  clear() { if (this.timer) this.timer.stop(); this.timer = null; this.tos.forEach(t => clearTimeout(t)); this.tos = []; document.onkeydown = null; }
};
function bTimer(el, sec, onEnd) { const bar = $('#btb', el); BrainRun.timer = Timer(sec, l => { if (bar) bar.firstChild.style.width = l / sec * 100 + '%'; }, onEnd); return BrainRun.timer; }
/* 錯題（可以重做的題目）記下來，到「錯題複習」再練 */
function brainMiss(item) {
  const W = P.brain.wrong || (P.brain.wrong = []);
  const key = item.type === 'mcq' ? item.q + '|' + item.a : JSON.stringify(item.s) + item.mir;
  if (W.some(w => w.key === key)) return;
  W.push(Object.assign({ key, d: today() }, item)); if (W.length > 200) W.shift();
}
const EMO = ['🍎', '🍌', '🍇', '🍓', '🍉', '🍒', '🥝', '🍑', '🐶', '🐱', '🐼', '🐸', '🐵', '🐧', '🦊', '🐯', '🚗', '🚀', '⚽', '🎈', '🎸', '🌈', '⭐', '🌙', '🍦', '🍩', '🎁', '👑', '🌻', '🍄'];

/* ===== 記憶力 ===== */
BG.match = { name: '翻牌配對', icon: '🃏', area: 'mem', how: '牌面朝下，一次翻兩張，圖案一樣就配對成功。記住翻過的位置，用最少的次數全部配完！',
  run(el, lv, done) {
    const pairs = clamp(3 + lv, 4, 10); const cols = pairs > 8 ? 5 : 4;
    const deck = shuffle(shuffle(EMO).slice(0, pairs).flatMap(e => [e, e]));
    let open = [], got = 0, moves = 0, lock = false, fin = false;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">翻牌 0 次・配對 0 / ${pairs}</div><div class="mgrid" style="grid-template-columns:repeat(${cols},1fr);max-width:${cols * 72}px">${deck.map((e, i) => `<button class="mcell card-back" data-i="${i}"></button>`).join('')}</div>`;
    const bs = $$('.mcell', el);
    const end = () => { if (fin) return; fin = true; const sc = got < pairs ? Math.round(got / pairs * 50) : clamp(Math.round(100 - Math.max(0, moves - pairs * 1.4) * 4), 30, 100); done({ score: sc, acc: got < pairs ? .4 : Math.min(1, pairs * 1.6 / moves) }); };
    bs.forEach(b => b.onclick = () => {
      const i = +b.dataset.i; if (lock || fin || b.classList.contains('ok') || open.includes(i)) return;
      b.textContent = deck[i]; b.classList.remove('card-back'); SFX.play('flip'); open.push(i);
      if (open.length === 2) {
        moves++; const [x, y] = open;
        if (deck[x] === deck[y]) { bs[x].classList.add('ok'); bs[y].classList.add('ok'); got++; open = []; SFX.play('pop'); if (got === pairs) { SFX.play('correct'); BrainRun.later(end, 600); } }
        else { lock = true; BrainRun.later(() => { [x, y].forEach(k => { bs[k].textContent = ''; bs[k].classList.add('card-back'); }); open = []; lock = false; }, 800); }
        $('#bsc', el).textContent = `翻牌 ${moves} 次・配對 ${got} / ${pairs}`;
      }
    });
    bTimer(el, 60 + pairs * 8, end);
  } };

BG.simon = { name: '跟著我按', icon: '🚦', area: 'mem', how: '四個彩色按鈕會依序亮起並發出聲音，等它演示完，照同樣的順序按一次。每過一關就多一個，錯兩次就結束。',
  run(el, lv, done) {
    const F = [330, 392, 494, 587], COL = ['#e53935', '#1e88e5', '#43a047', '#f9a825'];
    let seq = [], step = 0, can = false, life = 2, best = 0; const start = clamp(2 + Math.floor(lv / 3), 2, 5), spd = Math.max(330, 650 - lv * 30);
    el.innerHTML = `<div class="gauge" id="bsc">準備……</div><div class="simon">${COL.map((c, i) => `<button class="spad" data-i="${i}" style="background:${c}"></button>`).join('')}</div><div class="muted" id="stip">看清楚順序！</div>`;
    const pads = $$('.spad', el);
    const flash = i => { pads[i].classList.add('lit'); SFX.tone(F[i], .3, 'triangle', .25); BrainRun.later(() => pads[i].classList.remove('lit'), spd * .6); };
    const show = () => { can = false; step = 0; $('#stip', el).textContent = '看清楚順序！'; $('#bsc', el).textContent = `第 ${seq.length} 個・剩 ${life} 次機會`; seq.forEach((v, k) => BrainRun.later(() => flash(v), 600 + k * spd)); BrainRun.later(() => { can = true; $('#stip', el).textContent = '換你按！'; }, 600 + seq.length * spd); };
    const grow = () => { seq.push(rnd(4)); show(); };
    for (let k = 0; k < start - 1; k++) seq.push(rnd(4)); grow();
    const fin = () => done({ score: clamp(Math.round((best - 1) * 11), 0, 100), acc: best >= start + 4 ? .9 : best >= start + 2 ? .75 : .5 });
    pads.forEach(b => b.onclick = () => {
      if (!can) return; const i = +b.dataset.i; flash(i);
      if (i === seq[step]) { step++; if (step === seq.length) { can = false; best = Math.max(best, seq.length); SFX.play('correct'); BrainRun.later(grow, 700); } }
      else { can = false; life--; SFX.play('wrong'); best = Math.max(best, seq.length - 1); if (life <= 0) BrainRun.later(fin, 800); else { $('#stip', el).textContent = '按錯了，再看一次！'; BrainRun.later(show, 1000); } }
    });
  } };

BG.nback = { name: '位置回想', icon: '🔁', area: 'mem', how: '九宮格會一格一格亮起。如果現在亮的位置，和「往前數第 N 次」亮的位置一樣，就按「一樣！」。N 會隨等級變大，是公認最能訓練工作記憶的方法。',
  run(el, lv, done) {
    const N = lv <= 3 ? 1 : lv <= 6 ? 2 : 3, L = 18 + N, gap = Math.max(1500, 2400 - lv * 80);
    const seq = []; for (let i = 0; i < L; i++) seq.push(i >= N && Math.random() < .32 ? seq[i - N] : rnd(9));
    let i = -1, pressed = false, hit = 0, miss = 0, fa = 0, cr = 0;
    el.innerHTML = `<div class="gauge" id="bsc">往前數第 <b>${N}</b> 次・準備</div><div class="mgrid" style="grid-template-columns:repeat(3,1fr);max-width:240px">${Array.from({ length: 9 }, (_, k) => `<div class="mcell" data-i="${k}"></div>`).join('')}</div><button class="btn primary block" id="same" style="min-height:64px;font-size:1.2em">一樣！</button>`;
    const cs = $$('.mcell', el);
    const judge = () => { if (i < N) return; const t = seq[i] === seq[i - N]; if (t && pressed) hit++; else if (t) miss++; else if (pressed) fa++; else cr++; };
    const tick = () => {
      if (i >= 0) judge(); i++; pressed = false; $('#same', el).classList.remove('gold');
      if (i >= L) { const T = hit + miss, NT = fa + cr; const sc = clamp(Math.round((T ? hit / T : 1) * 60 + (NT ? cr / NT : 1) * 40), 0, 100); return done({ score: sc, acc: (hit + cr) / Math.max(1, T + NT) }); }
      $('#bsc', el).innerHTML = `往前數第 <b>${N}</b> 次・${i + 1} / ${L}`;
      cs.forEach(c => c.classList.remove('on')); cs[seq[i]].classList.add('on'); SFX.play('lightTick');
      BrainRun.later(() => cs[seq[i]] && cs[seq[i]].classList.remove('on'), gap * .55); BrainRun.later(tick, gap);
    };
    $('#same', el).onclick = () => { if (i < N || pressed) return; pressed = true; $('#same', el).classList.add('gold'); SFX.play(seq[i] === seq[i - N] ? 'pop' : 'wrong'); };
    BrainRun.later(tick, 1000);
  } };

BG.palace = { name: '記憶宮殿', icon: '🏠', area: 'mem', how: '跟著博士喵逛一圈房子，每個房間都放了一樣東西。逛完後回答「哪個房間放了什麼」。把東西和房間想像成有趣的畫面，會記得更牢！',
  run(el, lv, done) {
    const ROOMS = ['🚪 門口', '🛋️ 客廳', '🍳 廚房', '🛏️ 臥室', '🛁 浴室', '🌿 陽台', '📚 書房', '🚗 車庫'];
    const ITEMS = ['🍎 蘋果', '🎸 吉他', '🐟 魚', '⏰ 鬧鐘', '🧸 玩偶', '☂️ 雨傘', '👟 球鞋', '🍰 蛋糕', '📱 手機', '🔑 鑰匙', '🌵 仙人掌', '🎩 帽子', '🥚 雞蛋', '🪁 風箏', '🧦 襪子', '🍉 西瓜', '🐢 烏龜', '🎺 喇叭', '🧹 掃把', '📷 相機'];
    const n = clamp(3 + Math.floor(lv / 2), 3, 8); const rooms = ROOMS.slice(0, n); const items = shuffle(ITEMS).slice(0, n);
    let k = 0, ok = 0;
    const walk = () => {
      if (k >= n) { k = 0; return ask1(); }
      el.innerHTML = `<div class="gauge">參觀中 ${k + 1} / ${n}</div><div class="palace"><div class="room">${rooms[k]}</div><div class="pitem">${items[k].split(' ')[0]}</div><div class="h2">${items[k].split(' ')[1]}</div></div>`;
      SFX.play('whoosh'); k++; BrainRun.later(walk, Math.max(1300, 2300 - lv * 100));
    };
    const order = shuffle([...Array(n).keys()]);
    const ask1 = () => {
      if (k >= n) return done({ score: Math.round(ok / n * 100), acc: ok / n });
      const r = order[k]; const opts = shuffle([items[r], ...shuffle(items.filter((_, j) => j !== r).concat(shuffle(ITEMS.filter(x => !items.includes(x))).slice(0, 2))).slice(0, 3)]);
      el.innerHTML = `<div class="gauge">第 ${k + 1} / ${n} 題</div><div class="h2" style="margin:18px 0">「${rooms[r]}」放了什麼？</div><div class="grid2">${opts.map(o => `<button class="btn" style="min-height:64px">${o}</button>`).join('')}</div>`;
      $$('.btn', el).forEach(b => b.onclick = () => { if (b.textContent === items[r]) { ok++; SFX.play('correct'); } else { SFX.play('wrong'); } k++; BrainRun.later(ask1, 300); });
    };
    walk();
  } };

/* ===== 專注力 ===== */
BG.oddc = { name: '眼明找字', icon: '🔍', area: 'att', how: '一大堆長得很像的字裡面，只有一個不一樣，越快找到越好！例如一堆「己」裡面藏了一個「已」。',
  run(el, lv, done) {
    const PAIRS = [['己', '已'], ['未', '末'], ['人', '入'], ['日', '曰'], ['大', '太'], ['土', '士'], ['戊', '戌'], ['王', '玉'], ['天', '夭'], ['刀', '力'], ['千', '干'], ['田', '由'], ['甲', '申'], ['鳥', '烏'], ['今', '令'], ['問', '間'], ['候', '侯'], ['貝', '見'], ['免', '兔'], ['冶', '治'], ['崇', '祟'], ['斤', '斥'], ['折', '拆'], ['母', '毋'], ['犬', '太'], ['白', '百']];
    let ok = 0, ng = 0; const G = clamp(4 + Math.floor(lv / 2), 4, 8);
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">找到 0</div><div class="mgrid" id="og" style="grid-template-columns:repeat(${G},1fr);max-width:${G * 52}px"></div>`;
    const nxt = () => {
      const [a, b] = shuffle(pickOne(PAIRS)); const t = rnd(G * G);
      $('#og', el).innerHTML = Array.from({ length: G * G }, (_, i) => `<button class="mcell chr" data-t="${i === t ? 1 : 0}">${i === t ? b : a}</button>`).join('');
      $$('#og .mcell', el).forEach(c => c.onclick = () => { if (c.dataset.t === '1') { ok++; SFX.play('pop'); nxt(); } else { ng++; SFX.play('wrong'); c.classList.add('ng'); } $('#bsc', el).textContent = `找到 ${ok}・點錯 ${ng}`; });
    };
    nxt();
    bTimer(el, 40, () => done({ score: clamp(Math.round(ok * (6 + G) - ng * 6), 0, 100), acc: ok / Math.max(1, ok + ng) * (ok >= 8 ? 1 : .8) }));
  } };

BG.maze = { name: '走迷宮', icon: '🌀', area: 'att', how: '從左上角的博士喵出發，走到右下角的星星。可以點方向鍵、用鍵盤方向鍵，或直接點迷宮旁邊的格子。限時內走完越多座越好！',
  run(el, lv, done) {
    const N = clamp(5 + lv, 6, 15); let done2 = 0, bumps = 0, fin = false, maze, px, py;
    const gen = () => { const W = Array.from({ length: N * N }, () => [1, 1, 1, 1]); const seen = new Set([0]); const st = [0];
      while (st.length) { const c = st[st.length - 1], x = c % N, y = Math.floor(c / N); const nb = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]].filter(([dx, dy]) => x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N && !seen.has((y + dy) * N + x + dx));
        if (!nb.length) { st.pop(); continue; } const [dx, dy, w, o] = pickOne(nb); const n = (y + dy) * N + x + dx; W[c][w] = 0; W[n][o] = 0; seen.add(n); st.push(n); }
      return W; };
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">完成 0 座</div><canvas id="mz" width="330" height="330" style="max-width:100%;touch-action:none"></canvas>
      <div class="dpad"><span></span><button class="btn" data-d="0">⬆️</button><span></span><button class="btn" data-d="3">⬅️</button><span></span><button class="btn" data-d="1">➡️</button><span></span><button class="btn" data-d="2">⬇️</button><span></span></div>`;
    const cv = $('#mz', el), cx = cv.getContext('2d'), S = 330 / N;
    const draw = () => { cx.clearRect(0, 0, 330, 330); cx.strokeStyle = cssv('--ink'); cx.lineWidth = 2.5; cx.lineCap = 'round';
      maze.forEach((w, c) => { const x = (c % N) * S, y = Math.floor(c / N) * S; cx.beginPath(); if (w[0]) { cx.moveTo(x, y); cx.lineTo(x + S, y); } if (w[1]) { cx.moveTo(x + S, y); cx.lineTo(x + S, y + S); } if (w[2]) { cx.moveTo(x, y + S); cx.lineTo(x + S, y + S); } if (w[3]) { cx.moveTo(x, y); cx.lineTo(x, y + S); } cx.stroke(); });
      cx.font = `${S * .75}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⭐', (N - .5) * S, (N - .5) * S); cx.fillText('🦉', (px + .5) * S, (py + .5) * S); };
    const newMaze = () => { maze = gen(); px = 0; py = 0; draw(); };
    const mv = d => { if (fin) return; const c = py * N + px; if (maze[c][d]) { bumps++; SFX.play('tickLow'); return; } px += [0, 1, 0, -1][d]; py += [-1, 0, 1, 0][d]; SFX.play('lightTick'); draw();
      if (px === N - 1 && py === N - 1) { done2++; SFX.play('correct'); $('#bsc', el).textContent = `完成 ${done2} 座`; newMaze(); } };
    $$('.dpad .btn', el).forEach(b => b.onclick = () => mv(+b.dataset.d));
    cv.onclick = e => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * N, y = (e.clientY - r.top) / r.height * N; const dx = x - (px + .5), dy = y - (py + .5); if (Math.abs(dx) > Math.abs(dy)) mv(dx > 0 ? 1 : 3); else mv(dy > 0 ? 2 : 0); };
    document.onkeydown = e => { const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (d != null) { e.preventDefault(); mv(d); } };
    newMaze();
    bTimer(el, 75, () => { fin = true; document.onkeydown = null; done({ score: clamp(Math.round(done2 * 34 - bumps * .5), 0, 100), acc: done2 >= 3 ? .9 : done2 >= 2 ? .75 : .5 }); });
  } };

BG.spot = { name: '大家來找碴', icon: '🧐', area: 'att', how: '上下兩張圖幾乎一樣，下面那張有幾個地方不同。在下面那張點出所有不同的地方！',
  run(el, lv, done) {
    const R = 3; let r = 0, found = 0, total = 0, ng = 0, tl = 0;
    const G = clamp(4 + Math.floor(lv / 3), 4, 6), K = clamp(2 + Math.floor(lv / 3), 2, 5);
    const play = () => {
      if (r >= R) return done({ score: clamp(Math.round(found / total * 80 + tl / R / 25 * 20 - ng * 3), 0, 100), acc: found / total });
      const pool = shuffle(EMO).slice(0, 8); const A = Array.from({ length: G * G }, () => pickOne(pool)); const B = A.slice();
      const diff = shuffle([...Array(G * G).keys()]).slice(0, K); diff.forEach(i => { let e; do { e = pickOne(EMO); } while (e === A[i]); B[i] = e; }); total += K;
      let got = 0;
      el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">第 ${r + 1}/${R} 張・還有 ${K} 處不同</div>
        <div class="spot-tag">🖼️ 原圖（只能看）</div><div class="mgrid spot" style="grid-template-columns:repeat(${G},1fr);max-width:${G * 46}px">${A.map(e => `<div class="mcell">${e}</div>`).join('')}</div>
        <div class="spot-sep"><span>👇 在下面這張點出不同 👇</span></div><div class="mgrid spot spot-b" id="sb2" style="grid-template-columns:repeat(${G},1fr);max-width:${G * 46}px">${B.map((e, i) => `<button class="mcell" data-i="${i}">${e}</button>`).join('')}</div>`;
      const t = bTimer(el, 25, () => { r++; play(); });
      $$('#sb2 .mcell', el).forEach(c => c.onclick = () => { const i = +c.dataset.i; if (c.classList.contains('ok')) return;
        if (diff.includes(i)) { c.classList.add('ok'); got++; found++; SFX.play('pop'); $('#bsc', el).textContent = `第 ${r + 1}/${R} 張・還有 ${K - got} 處不同`; if (got === K) { tl += t.left; t.stop(); r++; SFX.play('correct'); BrainRun.later(play, 600); } }
        else { ng++; SFX.play('wrong'); c.classList.add('ng'); BrainRun.later(() => c.classList.remove('ng'), 400); } });
    };
    play();
  } };

/* ===== 反應速度 ===== */
BG.mole = { name: '打地鼠', icon: '🐹', area: 'spd', how: '地鼠🐹冒出來就快點牠！但是看到炸彈💣千萬不要點。考驗反應，也考驗「忍住不按」的能力。',
  run(el, lv, done) {
    let hit = 0, boom = 0, miss = 0, moles = 0, fin = false; const stay = Math.max(550, 1100 - lv * 55), gap = Math.max(420, 850 - lv * 40);
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">打中 0</div><div class="mgrid" style="grid-template-columns:repeat(3,1fr);max-width:300px">${Array.from({ length: 9 }, (_, i) => `<button class="mcell hole" data-i="${i}"></button>`).join('')}</div>`;
    const hs = $$('.hole', el); const st = Array(9).fill(null);
    const upd = () => $('#bsc', el).textContent = `打中 ${hit}・漏掉 ${miss}・炸到 ${boom}`;
    const pop = () => { if (fin) return; const free = st.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (free.length) { const i = pickOne(free); const bomb = Math.random() < .22; st[i] = bomb ? 'b' : 'm'; if (!bomb) moles++; hs[i].textContent = bomb ? '💣' : '🐹'; hs[i].classList.add('up');
        BrainRun.later(() => { if (st[i]) { if (st[i] === 'm') { miss++; upd(); } st[i] = null; hs[i].textContent = ''; hs[i].classList.remove('up'); } }, stay); }
      BrainRun.later(pop, gap * (.7 + Math.random() * .6)); };
    hs.forEach((h, i) => h.onclick = () => { if (!st[i]) return; if (st[i] === 'm') { hit++; SFX.play('boing'); h.textContent = '💫'; } else { boom++; SFX.play('heart'); shakeScreen(); h.textContent = '💥'; } st[i] = null; h.classList.remove('up'); BrainRun.later(() => { if (!st[i]) h.textContent = ''; }, 250); upd(); });
    pop();
    bTimer(el, 30, () => { fin = true; done({ score: clamp(Math.round(hit / Math.max(1, moles) * 100 - boom * 8), 0, 100), acc: hit / Math.max(1, moles) - boom * .05 }); });
  } };

BG.react = { name: '綠燈快按', icon: '🟢', area: 'spd', how: '圓圈變成綠色的瞬間，馬上按下去！太早按會被扣分。高等級時還會出現黃燈，看到黃燈不能按。',
  run(el, lv, done) {
    const N = 8; let k = 0, times = [], early = 0, state = 'wait', t0 = 0, nogo = 0;
    el.innerHTML = `<div class="gauge" id="bsc">第 1 / ${N} 次</div><button class="react-btn" id="rb">準備</button><div class="muted" id="rtip">看到綠色就按！</div>`;
    const b = $('#rb', el);
    const go = () => {
      if (k >= N) { const avg = times.length ? times.reduce((a, c) => a + c, 0) / times.length : 900; const sc = clamp(Math.round(100 - (avg - 260) * .25 - early * 8 - nogo * 8), 0, 100); return done({ score: sc, acc: avg < 380 && early + nogo <= 1 ? .9 : avg < 480 ? .75 : .5 }); }
      state = 'wait'; b.className = 'react-btn'; b.textContent = '等一下……'; $('#bsc', el).textContent = `第 ${k + 1} / ${N} 次`;
      BrainRun.later(() => {
        if (lv >= 5 && Math.random() < .25) { state = 'nogo'; b.className = 'react-btn yellow'; b.textContent = '黃燈！別按'; BrainRun.later(() => { if (state === 'nogo') { state = 'x'; go(); } }, 1100); return; }
        state = 'go'; b.className = 'react-btn green'; b.textContent = '按！'; t0 = performance.now();
      }, 1000 + Math.random() * 2500);
    };
    b.onclick = () => {
      if (state === 'go') { const ms = Math.round(performance.now() - t0); times.push(ms); k++; state = 'x'; b.textContent = ms + ' 毫秒'; SFX.play('pop'); BrainRun.later(go, 800); }
      else if (state === 'wait') { early++; k++; state = 'x'; BrainRun.clear(); b.className = 'react-btn red'; b.textContent = '太早了！'; SFX.play('wrong'); BrainRun.later(go, 900); }
      else if (state === 'nogo') { nogo++; state = 'x'; b.className = 'react-btn red'; b.textContent = '黃燈不能按！'; SFX.play('wrong'); BrainRun.later(go, 900); }
    };
    go();
  } };

/* ===== 轉換能力 ===== */
BG.trail = { name: '數字連連看', icon: '🔢', area: 'flx', how: '照順序點圓圈：1→2→3……。等級高時要「數字和天干交替」：1→甲→2→乙→3→丙……，考驗大腦切換！',
  run(el, lv, done) {
    const TG = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const alt = lv >= 4; let rd = 0, err = 0, tsum = 0, nsum = 0; const R = 2;
    const play = () => {
      if (rd >= R) { const per = tsum / nsum; return done({ score: clamp(Math.round(100 - Math.max(0, per - .9) * 45 - err * 5), 0, 100), acc: 1 - err / nsum - Math.max(0, per - 1.6) * .3 }); }
      const n = alt ? clamp(10 + lv, 12, 18) : clamp(8 + lv * 2, 10, 16);
      const labels = alt ? Array.from({ length: n }, (_, i) => i % 2 ? TG[(i - 1) / 2] : String(i / 2 + 1)) : Array.from({ length: n }, (_, i) => String(i + 1));
      const pts = []; let tries = 0; while (pts.length < n && tries++ < 5000) { const x = 8 + Math.random() * 84, y = 8 + Math.random() * 84; if (pts.every(p => Math.hypot(p[0] - x, (p[1] - y) * 1.1) > 13)) pts.push([x, y]); }
      let k = 0; const t0 = Date.now();
      el.innerHTML = `<div class="gauge" id="bsc">第 ${rd + 1}/${R} 回・下一個：<b>${labels[0]}</b></div><div class="trail" id="tr">${pts.map((p, i) => `<button class="tnode" data-i="${i}" style="left:${p[0]}%;top:${p[1]}%">${labels[i]}</button>`).join('')}</div>`;
      $$('.tnode', el).forEach(b => b.onclick = () => { const i = +b.dataset.i; if (i < k) return;
        if (i === k) { b.classList.add('ok'); k++; SFX.play('pop'); if (k === n) { tsum += (Date.now() - t0) / 1000; nsum += n; rd++; SFX.play('correct'); BrainRun.later(play, 600); } else $('#bsc', el).innerHTML = `第 ${rd + 1}/${R} 回・下一個：<b>${labels[k]}</b>`; }
        else { err++; SFX.play('wrong'); b.classList.add('ng'); BrainRun.later(() => b.classList.remove('ng'), 300); } });
    };
    play();
  } };

BG.flank = { name: '箭頭看中間', icon: '🏹', area: 'flx', how: '一排箭頭中，請回答「正中間」那支箭頭的方向，不要被旁邊的箭頭騙了！等級高時，底色變成橘色就改成回答「旁邊」箭頭的方向。',
  run(el, lv, done) {
    let ok = 0, ng = 0, ans;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">答對 0</div><div class="flank" id="fk"></div><div class="muted" id="ftip"></div><div class="row"><button class="btn" data-a="L" style="min-height:76px;font-size:2em">⬅️</button><button class="btn" data-a="R" style="min-height:76px;font-size:2em">➡️</button></div>`;
    const nxt = () => {
      const mid = rnd(2) ? 'R' : 'L', side = Math.random() < .55 ? (mid === 'R' ? 'L' : 'R') : mid; const sw = lv >= 4 && Math.random() < .3;
      const ar = d => d === 'R' ? '→' : '←'; const len = lv >= 6 ? 7 : 5; const arr = Array(len).fill(ar(side)); arr[(len - 1) / 2] = ar(mid);
      $('#fk', el).textContent = arr.join(''); $('#fk', el).classList.toggle('swap', sw); $('#ftip', el).textContent = sw ? '🟧 看旁邊！' : '看中間';
      ans = sw ? side : mid;
    };
    $$('[data-a]', el).forEach(b => b.onclick = () => { if (b.dataset.a === ans) { ok++; SFX.play('pop'); } else { ng++; SFX.play('wrong'); } $('#bsc', el).textContent = `答對 ${ok}・答錯 ${ng}`; nxt(); });
    nxt(); bTimer(el, 30, () => done({ score: clamp(Math.round(ok * 3.6 - ng * 5), 0, 100), acc: ok / Math.max(1, ok + ng) }));
  } };

/* ===== 空間推理 ===== */
BG.slide = { name: '數字推盤', icon: '🧩', area: 'spa', how: '點空格旁邊的數字方塊把它推過去，排回 1 到 8 的順序（空格在右下角）。用越少步數越好！',
  run(el, lv, done) {
    const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0]; let b = goal.slice(), prev = -1; const depth = clamp(8 + lv * 4, 10, 44);
    for (let k = 0; k < depth; k++) { const z = b.indexOf(0); const nb = [z - 3, z + 3, z % 3 ? z - 1 : -1, z % 3 < 2 ? z + 1 : -1].filter(x => x >= 0 && x < 9 && x !== prev); const m = pickOne(nb); [b[z], b[m]] = [b[m], b[z]]; prev = z; }
    if (b.join() === goal.join()) { const z = b.indexOf(0); const m = z - 1; [b[z], b[m]] = [b[m], b[z]]; }
    let moves = 0, fin = false;
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">已推 0 步</div><div class="mgrid" id="sp" style="grid-template-columns:repeat(3,1fr);max-width:260px"></div>`;
    const end = solved => { if (fin) return; fin = true; const right = b.filter((v, i) => v && v === goal[i]).length; done(solved ? { score: clamp(Math.round(100 - Math.max(0, moves - depth) * 1.5), 40, 100), acc: moves <= depth * 1.5 ? .9 : moves <= depth * 2.5 ? .75 : .6 } : { score: Math.round(right / 8 * 35), acc: .4 }); };
    const draw = () => {
      $('#sp', el).innerHTML = b.map((v, i) => `<button class="mcell slide ${v ? '' : 'blank'}" data-i="${i}">${v || ''}</button>`).join('');
      $('#bsc', el).textContent = `已推 ${moves} 步`;
      $$('.slide', el).forEach(c => c.onclick = () => { if (fin) return; const i = +c.dataset.i, z = b.indexOf(0); const adj = (Math.abs(i - z) === 3) || (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3)); if (!adj) { SFX.play('tickLow'); return; }
        [b[z], b[i]] = [b[i], b[z]]; moves++; SFX.play('flip'); draw(); if (b.join() === goal.join()) { SFX.play('correct'); if (BrainRun.timer) BrainRun.timer.stop(); BrainRun.later(() => end(true), 500); } });
    };
    bTimer(el, 150, () => end(false));
    draw();
  } };

/* ===== 邏輯推理 ===== */
BG.sudoku = { name: '迷你數獨', icon: '🔲', area: 'log', how: '每一列、每一行、每個粗框小宮格裡，數字都不能重複。點空格，再點下面的數字填入。低等級是四宮格，高等級是六宮格。',
  run(el, lv, done) {
    const n = lv <= 4 ? 4 : 6, br = 2, bc = n === 4 ? 2 : 3;
    const pat = (r, c) => (bc * (r % br) + Math.floor(r / br) + c) % n;
    const sh = a => shuffle(a); const bands = sh([...Array(n / br).keys()]), stacks = sh([...Array(n / bc).keys()]);
    const rows = bands.flatMap(g => sh([...Array(br).keys()]).map(r => g * br + r)), cols = stacks.flatMap(g => sh([...Array(bc).keys()]).map(c => g * bc + c));
    const nums = sh([...Array(n).keys()].map(x => x + 1));
    const sol = rows.map(r => cols.map(c => nums[pat(r, c)]));
    const solve = (g, cnt = { v: 0 }) => { const i = g.indexOf(0); if (i < 0) { cnt.v++; return cnt.v; } const r = Math.floor(i / n), c = i % n;
      for (let v = 1; v <= n; v++) { let okv = true; for (let k = 0; k < n && okv; k++) if (g[r * n + k] === v || g[k * n + c] === v) okv = false;
        const r0 = r - r % br, c0 = c - c % bc; for (let a = 0; a < br && okv; a++) for (let b2 = 0; b2 < bc && okv; b2++) if (g[(r0 + a) * n + c0 + b2] === v) okv = false;
        if (okv) { g[i] = v; solve(g, cnt); g[i] = 0; if (cnt.v > 1) return cnt.v; } } return cnt.v; };
    const flat = sol.flat(); const puz = flat.slice(); const holes = n === 4 ? clamp(6 + lv, 7, 11) : clamp(10 + (lv - 4) * 2, 12, 22); let removed = 0;
    for (const i of shuffle([...Array(n * n).keys()])) { if (removed >= holes) break; const v = puz[i]; puz[i] = 0; if (solve(puz.slice()) !== 1) puz[i] = v; else removed++; }
    const cur = puz.slice(); let sel = -1, mist = 0, fin = false; const t0 = Date.now();
    const draw = () => {
      $('#sg', el).innerHTML = cur.map((v, i) => { const r = Math.floor(i / n), c = i % n; const cls = [puz[i] ? 'given' : 'blankc', i === sel ? 'sel' : '', (c + 1) % bc === 0 && c < n - 1 ? 'rb' : '', (r + 1) % br === 0 && r < n - 1 ? 'bb' : ''].join(' '); return `<button class="sdc ${cls}" data-i="${i}">${v || ''}</button>`; }).join('');
      $$('.sdc', el).forEach(c => c.onclick = () => { const i = +c.dataset.i; if (puz[i] || fin) return; sel = i; SFX.play('click'); draw(); });
    };
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">填錯 0 次</div><div class="sudoku" id="sg" style="grid-template-columns:repeat(${n},1fr)"></div><div class="row" id="np">${[...Array(n).keys()].map(k => `<button class="btn" data-v="${k + 1}" style="padding:12px 0;font-size:1.3em">${k + 1}</button>`).join('')}</div>`;
    const end = solved => { if (fin) return; fin = true; const filled = cur.filter((v, i) => !puz[i] && v === flat[i]).length; const sec = (Date.now() - t0) / 1000;
      done(solved ? { score: clamp(Math.round(100 - mist * 8 - Math.max(0, sec - (n === 4 ? 40 : 100)) / 3), 30, 100), acc: mist <= 1 ? .9 : mist <= 3 ? .75 : .55 } : { score: Math.round(filled / holes * 50), acc: .4 }); };
    $$('#np .btn', el).forEach(b => b.onclick = () => { if (sel < 0 || fin) return toast('先點一個空格'); const v = +b.dataset.v;
      if (v === flat[sel]) { cur[sel] = v; SFX.play('pop'); const nx = cur.findIndex((x, i) => !x && i > sel); sel = nx >= 0 ? nx : cur.indexOf(0); draw(); if (!cur.includes(0)) { SFX.play('correct'); if (BrainRun.timer) BrainRun.timer.stop(); BrainRun.later(() => end(true), 500); } }
      else { mist++; SFX.play('wrong'); $('#bsc', el).textContent = `填錯 ${mist} 次`; const c = $(`.sdc[data-i="${sel}"]`, el); if (c) { c.classList.add('ng'); BrainRun.later(() => c.classList.remove('ng'), 400); } } });
    sel = cur.indexOf(0); draw(); bTimer(el, n === 4 ? 120 : 240, () => end(false));
  } };

BG.hanoi = { name: '河內塔', icon: '🗼', area: 'log', how: '把左邊柱子上的圓盤全部搬到右邊柱子。一次只能搬最上面的一個，而且大盤子不能壓在小盤子上面。先點要拿的柱子，再點要放的柱子。',
  run(el, lv, done) {
    const n = lv <= 3 ? 3 : lv <= 7 ? 4 : 5, opt = 2 ** n - 1; const T = [[...Array(n).keys()].map(i => n - i), [], []]; let pick = -1, moves = 0, fin = false;
    const COL = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5'];
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc">已搬 0 步・最少 ${opt} 步</div><div class="hanoi" id="hn"></div>`;
    const draw = () => { $('#hn', el).innerHTML = T.map((t, i) => `<button class="peg ${pick === i ? 'sel' : ''}" data-i="${i}"><span class="pole"></span>${t.map(d => `<span class="disk" style="width:${25 + d * 14}%;background:${COL[d - 1]}"></span>`).reverse().join('')}</button>`).join('');
      $$('.peg', el).forEach(b => b.onclick = () => tap(+b.dataset.i)); };
    const end = solved => { if (fin) return; fin = true; done(solved ? { score: clamp(Math.round(100 - (moves - opt) * 4), 30, 100), acc: moves <= opt * 1.3 ? .9 : moves <= opt * 2 ? .75 : .55 } : { score: Math.round(T[2].length / n * 40), acc: .4 }); };
    const tap = i => { if (fin) return;
      if (pick < 0) { if (!T[i].length) return; pick = i; SFX.play('click'); return draw(); }
      if (pick === i) { pick = -1; return draw(); }
      const d = T[pick][T[pick].length - 1], top = T[i][T[i].length - 1];
      if (top && top < d) { SFX.play('wrong'); toast('大盤子不能壓在小盤子上！'); pick = -1; return draw(); }
      T[i].push(T[pick].pop()); pick = -1; moves++; SFX.play('pop'); $('#bsc', el).textContent = `已搬 ${moves} 步・最少 ${opt} 步`; draw();
      if (T[2].length === n) { SFX.play('correct'); if (BrainRun.timer) BrainRun.timer.stop(); BrainRun.later(() => end(true), 600); } };
    draw(); bTimer(el, n === 3 ? 90 : n === 4 ? 150 : 240, () => end(false));
  } };

BG.peg = { name: '孔明棋', icon: '⚪', area: 'log', how: '點一顆棋子，再點它「隔一格」的空洞，就能跳過去並吃掉中間那顆。一直跳到不能再跳為止，剩越少顆越厲害！只剩一顆就是滿分。卡住了可以按「重來」。',
  run(el, lv, done) {
    const cells = []; for (let r = 0; r < 5; r++) for (let c = 0; c <= r; c++) cells.push([r, c]);
    const idx = (r, c) => r < 0 || c < 0 || c > r || r > 4 ? -1 : r * (r + 1) / 2 + c;
    const D = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]];
    let B, sel = -1, best = 14, fin = false; const empty0 = lv <= 3 ? 0 : rnd(15);
    const reset = () => { B = Array(15).fill(1); B[empty0] = 0; sel = -1; draw(); };
    const movesFrom = i => { const [r, c] = cells[i]; return D.map(([dr, dc]) => [idx(r + dr, c + dc), idx(r + 2 * dr, c + 2 * dc)]).filter(([m, t]) => m >= 0 && t >= 0 && B[m] && !B[t]); };
    const anyMove = () => B.some((v, i) => v && movesFrom(i).length);
    const draw = () => {
      const left = B.filter(Boolean).length;
      $('#bsc', el).textContent = `剩 ${left} 顆・最佳 ${best === 14 ? '－' : best} 顆`; $('#pg', el).innerHTML = `<div class="pegb">${cells.map(([r, c], i) => `<button class="pegh ${B[i] ? 'on' : ''} ${i === sel ? 'sel' : ''}" data-i="${i}" style="left:${50 + (c - r / 2) * 18}%;top:${8 + r * 19}%"></button>`).join('')}</div>`;
      $$('.pegh', el).forEach(b => b.onclick = () => tap(+b.dataset.i));
      if (!anyMove()) { best = Math.min(best, left); $('#bsc', el).textContent = left === 1 ? '🎉 只剩一顆，完美！' : `沒有棋可以跳了，剩 ${left} 顆（可以按重來再挑戰）`; if (left === 1) { SFX.play('fanfare'); finish(); } }
    };
    const tap = i => { if (fin) return; if (B[i]) { sel = i; SFX.play('click'); return draw(); } if (sel < 0) return;
      const m = movesFrom(sel).find(([, t]) => t === i); if (!m) { SFX.play('tickLow'); return; } B[sel] = 0; B[m[0]] = 0; B[i] = 1; sel = -1; SFX.play('pop'); draw(); };
    const finish = () => { if (fin) return; fin = true; if (BrainRun.timer) BrainRun.timer.stop(); const b = Math.min(best, B.filter(Boolean).length) ; BrainRun.later(() => done({ score: { 1: 100, 2: 80, 3: 60, 4: 45 }[b] || 25, acc: b <= 2 ? .9 : b <= 3 ? .75 : .5 }), 900); };
    el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc"></div><div id="pg"></div><button class="btn block" id="rst">↺ 重來</button>`;
    $('#rst', el).onclick = () => { if (fin) return; SFX.play('whoosh'); reset(); };
    reset(); bTimer(el, 150, finish);
  } };

/* ===== 語言能力 ===== */
const IDIOMS = '一心一意 三心二意 半途而廢 亡羊補牢 守株待兔 畫蛇添足 對牛彈琴 井底之蛙 狐假虎威 自相矛盾 刻舟求劍 掩耳盜鈴 拔苗助長 杯弓蛇影 望梅止渴 臥薪嘗膽 破釜沉舟 紙上談兵 指鹿為馬 四面楚歌 完璧歸趙 負荊請罪 三顧茅廬 草船借箭 聞雞起舞 鑿壁偷光 一石二鳥 一舉兩得 七上八下 九牛一毛 十全十美 千鈞一髮 萬無一失 百發百中 百折不撓 一鳴驚人 一帆風順 一見鍾情 一諾千金 一針見血 二話不說 三言兩語 四海為家 五花八門 六神無主 七嘴八舌 八面玲瓏 九死一生 十萬火急 千山萬水 萬紫千紅 畫龍點睛 龍飛鳳舞 虎頭蛇尾 馬到成功 雞飛狗跳 鶴立雞群 對症下藥 雪中送炭 錦上添花 水落石出 風和日麗 春暖花開 鳥語花香 山明水秀 青出於藍 學以致用 溫故知新 舉一反三 熟能生巧 精益求精 循序漸進 持之以恆 鍥而不捨 滴水穿石 聚沙成塔 積少成多 同心協力 眾志成城 齊心協力 和睦相處 助人為樂 見義勇為 捨己為人 光明磊落 實事求是 言而有信 表裡如一 心花怒放 喜出望外 手舞足蹈 眉開眼笑 垂頭喪氣 愁眉苦臉 怒髮衝冠 目瞪口呆 胸有成竹 不知所措 半信半疑 恍然大悟 津津有味 廢寢忘食 全神貫注 專心致志 目不轉睛 迫不及待 寸步難行 無影無蹤 千變萬化 日新月異 天長地久 海闊天空 異想天開 天真無邪 自言自語 大同小異 小題大作 前因後果 左思右想 東張西望 南轅北轍 古今中外 生龍活虎 如魚得水 對答如流 爭先恐後 名列前茅 金玉良言 良藥苦口 忠言逆耳 入鄉隨俗 安居樂業 豐衣足食 國泰民安 風調雨順'.split(' ');
const ANTONYM = [['高', '矮'], ['快', '慢'], ['冷', '熱'], ['新', '舊'], ['多', '少'], ['長', '短'], ['胖', '瘦'], ['早', '晚'], ['輕', '重'], ['遠', '近'], ['深', '淺'], ['乾', '濕'], ['甜', '苦'], ['買', '賣'], ['哭', '笑'], ['真', '假'], ['成功', '失敗'], ['勇敢', '膽小'], ['安靜', '吵鬧'], ['乾淨', '骯髒'], ['簡單', '困難'], ['增加', '減少'], ['開始', '結束'], ['熱鬧', '冷清'], ['聰明', '愚笨'], ['勤勞', '懶惰'], ['光明', '黑暗'], ['危險', '安全'], ['美麗', '醜陋'], ['寬闊', '狹窄'], ['謙虛', '驕傲'], ['緊張', '輕鬆'], ['富有', '貧窮'], ['進步', '退步'], ['歡迎', '拒絕'], ['整齊', '凌亂']];
const ASSOC = [['筷子', '碗'], ['老師', '黑板'], ['醫生', '聽診器'], ['廚師', '鍋鏟'], ['鉛筆', '橡皮擦'], ['下雨', '雨傘'], ['牙刷', '牙膏'], ['鑰匙', '鎖頭'], ['枕頭', '棉被'], ['郵差', '信件'], ['農夫', '稻田'], ['漁夫', '漁網'], ['蜜蜂', '花朵'], ['熊貓', '竹子'], ['猴子', '香蕉'], ['小貓', '毛線球'], ['小狗', '骨頭'], ['兔子', '紅蘿蔔'], ['火車', '鐵軌'], ['飛機', '機場'], ['輪船', '港口'], ['圖書館', '書本'], ['消防員', '水管'], ['警察', '警車'], ['畫家', '畫筆'], ['歌手', '麥克風'], ['理髮師', '剪刀'], ['足球', '球門'], ['游泳', '泳池'], ['釣魚', '魚竿'], ['生日', '蛋糕'], ['中秋節', '月餅'], ['端午節', '粽子'], ['過年', '紅包'], ['冬天', '圍巾'], ['夏天', '電扇'], ['寫信', '郵票'], ['照相', '相機'], ['刷卡', '收銀機'], ['看病', '掛號']];
const COMPOSE = [['女', '子', '好'], ['日', '月', '明'], ['木', '木', '林'], ['人', '木', '休'], ['小', '大', '尖'], ['田', '力', '男'], ['不', '正', '歪'], ['山', '石', '岩'], ['火', '火', '炎'], ['土', '也', '地'], ['亻', '言', '信'], ['氵', '每', '海'], ['口', '木', '呆'], ['女', '馬', '媽'], ['口', '馬', '嗎'], ['木', '目', '相'], ['禾', '火', '秋'], ['相', '心', '想'], ['門', '口', '問'], ['門', '日', '間'], ['門', '耳', '聞'], ['言', '青', '請'], ['氵', '青', '清'], ['日', '青', '晴'], ['目', '青', '睛'], ['米', '分', '粉'], ['魚', '羊', '鮮'], ['舌', '甘', '甜'], ['弓', '長', '張'], ['亻', '尔', '你'], ['亻', '也', '他'], ['女', '也', '她'], ['牛', '勿', '物'], ['木', '交', '校'], ['雨', '田', '雷'], ['雨', '相', '霜'], ['竹', '合', '答'], ['艹', '化', '花'], ['艹', '早', '草'], ['艹', '田', '苗'], ['力', '口', '加'], ['古', '月', '胡'], ['女', '古', '姑'], ['木', '古', '枯'], ['艹', '古', '苦'], ['白', '水', '泉'], ['白', '勺', '的'], ['手', '目', '看'], ['自', '心', '息'], ['田', '心', '思'], ['今', '心', '念'], ['亡', '心', '忘'], ['女', '生', '姓'], ['夕', '夕', '多'], ['禾', '口', '和'], ['王', '里', '理'], ['王', '求', '球'], ['足', '包', '跑'], ['口', '乞', '吃'], ['口', '昌', '唱'], ['口', '鳥', '鳴'], ['犭', '苗', '貓'], ['犭', '句', '狗'], ['日', '生', '星'], ['口', '口', '回'], ['木', '子', '李'], ['子', '小', '孫'], ['老', '子', '孝'], ['田', '介', '界'], ['金', '同', '銅']];
function mcqGame(el, lv, done, gkey, make) {
  const N = 10; let i = 0, ok = 0, t0 = Date.now(); const seen = new Set();
  el.innerHTML = `<div class="timebar" id="btb"><i style="width:100%"></i></div><div class="gauge" id="bsc"></div><div id="mq"></div>`;
  const nxt = () => {
    if (i >= N) { const sec = (Date.now() - t0) / 1000; return done({ score: clamp(Math.round(ok * 10 - Math.max(0, sec - N * 5) * .4), 0, 100), acc: ok / N }); }
    let q; do { q = make(lv); } while (seen.has(q.q) && seen.size < 200); seen.add(q.q);
    const opts = shuffle([q.a, ...q.w]);
    $('#bsc', el).textContent = `第 ${i + 1} / ${N} 題・答對 ${ok}`;
    $('#mq', el).innerHTML = `<div class="mq-q">${q.q}</div><div class="grid2">${opts.map(o => `<button class="btn" style="min-height:62px;font-size:1.25em">${o}</button>`).join('')}</div>`;
    $$('#mq .btn', el).forEach(b => b.onclick = () => { $$('#mq .btn', el).forEach(x => { x.disabled = true; if (x.textContent === q.a) x.classList.add('primary'); });
      if (b.textContent === q.a) { ok++; SFX.play('correct'); } else { SFX.play('wrong'); b.classList.add('ngbtn'); brainMiss({ type: 'mcq', g: gkey, q: q.q, a: q.a, w: q.w, exp: q.exp || '' }); }
      i++; BrainRun.later(nxt, b.textContent === q.a ? 450 : 1300); });
  };
  nxt(); bTimer(el, 90, () => { i = N; nxt(); });
}
BG.idiom = { name: '成語補一字', icon: '📜', area: 'lng', how: '成語裡少了一個字，從四個選項中選出正確的字。答錯的題目會收進「錯題複習」。',
  run(el, lv, done) { mcqGame(el, lv, done, 'idiom', () => { const w = pickOne(IDIOMS); const p = rnd(4); const others = shuffle([...new Set(IDIOMS.join('').split(''))].filter(c => c !== w[p] && !w.includes(c))).slice(0, 3);
    return { q: [...w].map((c, k) => k === p ? '<span class="blank">？</span>' : c).join(''), a: w[p], w: others, exp: '正確成語：' + w }; }); } };
BG.assoc = { name: '詞語聯想', icon: '💭', area: 'lng', how: '選出和題目關係最密切的詞，或是意思相反的詞。考驗詞彙量和聯想速度！',
  run(el, lv, done) { mcqGame(el, lv, done, 'assoc', () => {
    if (Math.random() < .5) { const [a, b] = shuffle(pickOne(ANTONYM)); const w = shuffle(ANTONYM.flat().filter(x => x !== a && x !== b && x.length === b.length)).slice(0, 3); return { q: `「${a}」的相反詞是？`, a: b, w, exp: `${a} ↔ ${b}` }; }
    const [a, b] = pickOne(ASSOC); const w = shuffle(ASSOC.map(x => x[1]).filter(x => x !== b)).slice(0, 3); return { q: `看到「${a}」，最先想到哪一個？`, a: b, w, exp: `${a} → ${b}` }; }); } };
BG.compose = { name: '部件組字', icon: '🀄', area: 'lng', how: '把兩個部件合起來，會變成哪一個字？例如「女＋子」是「好」。',
  run(el, lv, done) { mcqGame(el, lv, done, 'compose', () => { const [a, b, c] = pickOne(COMPOSE); const pool = COMPOSE.map(x => x[2]).filter(x => x !== c);
    const near = pool.filter(x => COMPOSE.find(y => y[2] === x).some(p => p === a || p === b)); const w = shuffle([...new Set([...shuffle(near).slice(0, 2), ...shuffle(pool)])]).filter(x => x !== c).slice(0, 3);
    return { q: `${a} ＋ ${b} ＝ ？`, a: c, w, exp: `${a}＋${b}＝${c}` }; }); } };

/* ---------- 執行器 ---------- */
function runBrainGames(keys, opts, finish) {
  // opts: { title, fixedLv } ; finish(results)
  stopGame(); const res = {}; let k = 0;
  Game.stop = () => BrainRun.clear();
  const one = () => {
    if (k >= keys.length) return finish(res);
    const key = keys[k], g = BG[key];
    setTop(`${opts.title}（${k + 1}/${keys.length}）`, () => ask('要中斷訓練嗎？', '這次的訓練不會被記錄喔。', [{ t: '中斷離開', v: 1 }, { t: '繼續', v: 0, cls: 'gold' }]).then(v => { if (v) { stopGame(); BrainHome(); } }));
    view(`<div class="card bgame"><div class="owl home-owl" data-s="talk" style="width:110px;height:120px"></div><div class="h2">${g.icon} ${g.name}</div><div class="seal">${BAREA[g.area]}</div><p style="line-height:1.7">${g.how}</p><button class="btn primary block" id="go">準備好了，開始！</button></div>`);
    Voice.say(g.name + '。' + g.how);
    $('#go').onclick = () => {
      Voice.stop(); SFX.play('gong'); BrainRun.clear();
      const lv = opts.fixedLv || P.brain.lv[key] || 3;
      view(`<div class="card bgame" id="ga"></div>`);
      let fired = false;
      g.run($('#ga'), lv, r => {
        if (fired) return; fired = true; BrainRun.clear();
        r.acc = clamp(r.acc || 0, 0, 1); res[key] = r.score;
        if (!opts.fixedLv) { const cur = P.brain.lv[key] || 3; P.brain.lv[key] = clamp(r.acc > .85 ? cur + 1 : r.acc < .65 ? cur - 1 : cur, 1, 10); }
        save(); SFX.play(r.score >= 60 ? 'correct' : 'pop');
        view(`<div class="card center"><div class="owl home-owl" data-s="${r.score >= 60 ? 'happy' : 'think'}"></div><div class="h2">${g.icon} ${g.name}</div><div class="result-score">${r.score}</div><div class="muted">${BAREA[g.area]} 分數（滿分 100）</div>
          ${!opts.fixedLv ? `<p class="muted">下次難度：第 ${P.brain.lv[key]} 級（系統會讓你維持七、八成的答對率，訓練效果最好）</p>` : ''}
          <button class="btn primary block" id="nx">${k + 1 < keys.length ? '下一項 ▶' : '看結果 🏁'}</button></div>`);
        Voice.say(r.score >= 80 ? '太厲害了！' : r.score >= 60 ? '表現不錯！' : '加油，多練習會進步！');
        $('#nx').onclick = () => { k++; one(); };
      });
    };
  };
  one();
}
function recordBrain(type, res) { P.brain.hist.push({ d: today(), t: type, s: res }); if (P.brain.hist.length > 500) P.brain.hist.shift(); save(); }
const areaOf = k => BG[k] ? BG[k].area : k;
/* 從不同能力中各挑一款遊戲 */
function pickByArea(nAreas, rand) {
  const R = rand || Math.random; const areas = seededShuffle(Object.keys(BAREA), R).slice(0, nAreas);
  return areas.map(a => { const gs = Object.keys(BG).filter(k => BG[k].area === a); return gs[Math.floor(R() * gs.length)]; });
}

/* ---------- 大腦訓練首頁 ---------- */
function BrainHome() {
  stopGame();
  setTop('🧠 大腦訓練專區', Home, () => showHowto('brain'));
  const done = !!P.brain.checkup[today()]; const nw = (P.brain.wrong || []).length;
  view(`<div class="hostrow"><div class="owl"></div><div class="bubble">大腦就像肌肉，每天練一點點最有效！建議每天花五到十分鐘。</div></div>
    <div class="tiles">
      <button class="tile" id="t1">${done ? '' : '<span class="badge">今日未完成</span>'}<span class="ic">🩺</span><span class="nm">每日大腦健檢</span><span class="ds">每天換三款，約五分鐘</span></button>
      <button class="tile" id="t2"><span class="ic">🎂</span><span class="nm">腦年齡測驗</span><span class="ds">測出你的大腦幾歲</span></button>
      <button class="tile" id="t3"><span class="ic">🎮</span><span class="nm">自由訓練</span><span class="ds">七大能力・${Object.keys(BG).length} 款遊戲</span></button>
      <button class="tile" id="t5">${nw ? `<span class="badge">${nw}</span>` : ''}<span class="ic">📕</span><span class="nm">錯題複習</span><span class="ds">${nw ? nw + ' 題待複習' : '目前沒有錯題'}</span></button>
      <button class="tile" id="t4"><span class="ic">📊</span><span class="nm">我的大腦報告</span><span class="ds">雷達圖、進步曲線</span></button>
    </div>`);
  $('#t1').onclick = checkup; $('#t2').onclick = ageTest; $('#t3').onclick = freeTrain; $('#t4').onclick = brainReport; $('#t5').onclick = brainReview;
}
function checkup() {
  const d = today(); const keys = pickByArea(3, seeded('chk' + d));
  if (P.brain.checkup[d]) { ask('今天已經健檢過了！', `今日分數：${P.brain.checkup[d]} 分<br>要再做一次嗎？（以較高分記錄）`, [{ t: '再做一次', v: 1 }, { t: '不用了', v: 0, cls: 'gold' }]).then(v => v && go()); return; }
  go();
  function go() {
    runBrainGames(keys, { title: '每日健檢' }, res => {
      const avg = Math.round(Object.values(res).reduce((a, b) => a + b, 0) / keys.length);
      const first = !P.brain.checkup[d]; P.brain.checkup[d] = Math.max(P.brain.checkup[d] || 0, avg); recordBrain('check', res);
      if (first) addCoins(20); SFX.play('stamp'); confetti(50); checkAch(); save();
      const streak = chkStreak();
      view(`<div class="card center"><div class="owl home-owl" data-s="dance"></div><div class="h2">🩺 今日健檢完成！</div><div class="result-score">${avg}</div><div class="muted">今日大腦分數</div>
        ${keys.map(k => `<div class="statrow" style="text-align:left">${BG[k].icon} ${BG[k].name}（${BAREA[BG[k].area]}）：<b>${res[k]}</b><div class="bar"><i style="width:${res[k]}%"></i></div></div>`).join('')}
        <p>🔥 已連續健檢 <b>${streak}</b> 天 ${first ? '・獲得 20 金幣' : ''}</p><p class="muted">明天會換成另外三款遊戲喔！</p><div class="row"><button class="btn primary" id="rp">看大腦報告</button><button class="btn" id="bk">返回</button></div></div>`);
      setTop('健檢結果', BrainHome); $('#rp').onclick = brainReport; $('#bk').onclick = BrainHome;
      Voice.say('今日健檢完成，大腦分數' + avg + '分！');
    });
  }
}
function chkStreak() { let n = 0; const d = new Date(); for (; ;) { if (P.brain.checkup[today(d)]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }
function freeTrain() {
  stopGame(); setTop('🎮 自由訓練', BrainHome, () => showHowto('brain'));
  view(`<button class="tile" id="mix" style="width:100%;margin-bottom:12px"><span class="ic">🌈</span><span class="nm">綜合訓練</span><span class="ds">從五種能力各隨機挑一款，連續挑戰</span></button>
    ${Object.entries(BAREA).map(([a, an]) => `<div class="sec-title">${an}</div><div class="tiles">${Object.entries(BG).filter(([, g]) => g.area === a).map(([k, g]) => `<button class="tile" data-k="${k}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="ds">第 ${P.brain.lv[k] || 3} 級</span></button>`).join('')}</div>`).join('')}`);
  $$('.tile[data-k]').forEach(b => b.onclick = () => { SFX.play('click'); runBrainGames([b.dataset.k], { title: '自由訓練' }, res => { recordBrain('free', res); checkAch(); freeTrain(); }); });
  $('#mix').onclick = () => { SFX.play('click'); const keys = pickByArea(5);
    runBrainGames(keys, { title: '綜合訓練' }, res => { recordBrain('free', res); checkAch(); const avg = Math.round(Object.values(res).reduce((a, b) => a + b, 0) / keys.length);
      view(`<div class="card center"><div class="owl home-owl" data-s="dance"></div><div class="h2">🌈 綜合訓練完成！</div><div class="result-score">${avg}</div><div class="muted">平均分數</div>
        ${keys.map(k => `<div class="statrow" style="text-align:left">${BG[k].icon} ${BG[k].name}（${BAREA[BG[k].area]}）：<b>${res[k]}</b><div class="bar"><i style="width:${res[k]}%"></i></div></div>`).join('')}
        <div class="row"><button class="btn primary" id="ag">再來一輪</button><button class="btn" id="bk">返回</button></div></div>`);
      setTop('綜合訓練結果', freeTrain); $('#ag').onclick = freeTrainMix; $('#bk').onclick = freeTrain; });
  };
}
function freeTrainMix() { freeTrain(); $('#mix').click(); }

/* ---------- 錯題複習 ---------- */
function brainReview() {
  stopGame(); setTop('📕 錯題複習', BrainHome);
  const W = P.brain.wrong || (P.brain.wrong = []);
  if (!W.length) { view(`<div class="card center"><div class="owl home-owl" data-s="happy"></div><div class="h2">目前沒有錯題 🎉</div><p>玩「成語補一字」、「詞語聯想」、「部件組字」和「旋轉積木」時答錯的題目，會自動收集到這裡。</p><button class="btn primary" onclick="BrainHome()">返回</button></div>`); return; }
  const cnt = {}; W.forEach(w => cnt[w.g] = (cnt[w.g] || 0) + 1);
  view(`<div class="card"><div class="h3">📕 共 ${W.length} 題待複習</div>${Object.entries(cnt).map(([g, n]) => `<div class="lb-row"><span>${BG[g] ? BG[g].icon + ' ' + BG[g].name : g}</span><span style="flex:1"></span><b>${n} 題</b></div>`).join('')}
    <p class="muted">答對的題目會從錯題本移除，答錯的會留下來下次再練。</p><button class="btn primary block" id="go">開始複習（最多 10 題）</button><button class="btn block" id="clr">清空錯題本</button></div>`);
  $('#clr').onclick = () => ask('確定清空嗎？', '', [{ t: '清空', v: 1 }, { t: '取消', v: 0, cls: 'gold' }]).then(v => { if (v) { P.brain.wrong = []; save(); brainReview(); } });
  $('#go').onclick = () => {
    const list = shuffle(W).slice(0, 10); let i = 0, ok = 0;
    const nxt = () => {
      if (i >= list.length) { save(); view(`<div class="card center"><div class="owl home-owl" data-s="${ok === list.length ? 'dance' : 'happy'}"></div><div class="h2">複習完成！</div><div class="result-score">${ok} / ${list.length}</div><p>還有 ${P.brain.wrong.length} 題待複習</p><div class="row"><button class="btn primary" id="ag">繼續複習</button><button class="btn" id="bk">返回</button></div></div>`); $('#ag').onclick = brainReview; $('#bk').onclick = BrainHome; return; }
      const it = list[i]; const fin = good => { if (good) { ok++; P.brain.wrong = P.brain.wrong.filter(w => w.key !== it.key); SFX.play('correct'); } else SFX.play('wrong'); i++; BrainRun.later(nxt, good ? 500 : 1500); };
      if (it.type === 'mcq') {
        const opts = shuffle([it.a, ...it.w]);
        view(`<div class="card bgame"><div class="gauge">${BG[it.g] ? BG[it.g].icon + ' ' + BG[it.g].name : ''}・${i + 1} / ${list.length}</div><div class="mq-q">${it.q}</div><div class="grid2">${opts.map(o => `<button class="btn" style="min-height:62px;font-size:1.25em">${o}</button>`).join('')}</div><div id="ex"></div></div>`);
        $$('.grid2 .btn').forEach(b => b.onclick = () => { $$('.grid2 .btn').forEach(x => { x.disabled = true; if (x.textContent === it.a) x.classList.add('primary'); }); if (b.textContent !== it.a) b.classList.add('ngbtn'); if (it.exp) $('#ex').innerHTML = `<div class="explain">💡 ${esc(it.exp)}</div>`; fin(b.textContent === it.a); });
      } else {
        view(`<div class="card bgame"><div class="gauge">🧊 旋轉積木・${i + 1} / ${list.length}</div><div class="shapes">${rotSvg(it.s, '#f5a623')}${rotSvg(it.t, '#3a86ff')}</div><div class="row"><button class="btn" id="same" style="min-height:64px">🔄 一樣（只是轉動）</button><button class="btn" id="mirr" style="min-height:64px">🪞 鏡像（翻面了）</button></div></div>`);
        $('#same').onclick = () => fin(!it.mir); $('#mirr').onclick = () => fin(it.mir);
      }
    };
    stopGame(); Game.stop = () => BrainRun.clear(); nxt();
  };
}
function rotSvg(s, col) { const xs = s.map(p => p[0]), ys = s.map(p => p[1]); const mx = Math.min(...xs), my = Math.min(...ys); const w = Math.max(...xs) - mx + 1, h = Math.max(...ys) - my + 1; const u = 100 / Math.max(w, h, 3); const ox = (130 - w * u) / 2, oy = (130 - h * u) / 2; return `<svg viewBox="0 0 130 130">${s.map(([x, y]) => `<rect x="${ox + (x - mx) * u}" y="${oy + (y - my) * u}" width="${u - 2}" height="${u - 2}" rx="4" fill="${col}"/>`).join('')}</svg>`; }
/* ---------- 腦年齡測驗 ---------- */
function ageTest() {
  setTop('🎂 腦年齡測驗', BrainHome, () => showHowto('brain'));
  const last = P.brain.ages[P.brain.ages.length - 1] || {};
  view(`<div class="card"><div class="owl home-owl" data-s="think"></div><div class="h2 center">🎂 腦年齡測驗</div>
    <p>測驗包含五項能力（記憶、專注、速度、轉換、空間），約八分鐘。請先填寫基本資料，作為同年齡、同性別比較用。</p>
    <div class="h3">真實年齡</div><input class="field" id="age" type="number" min="6" max="110" inputmode="numeric" placeholder="例如：45" value="${last.age || ''}">
    <div class="h3">性別</div><div class="row" id="gsel"><button class="btn ${last.g === '男' ? 'primary' : ''}" data-g="男">👨 男</button><button class="btn ${last.g === '女' ? 'primary' : ''}" data-g="女">👩 女</button><button class="btn ${last.g === '不透露' ? 'primary' : ''}" data-g="不透露">🙂 不透露</button></div>
    <button class="btn primary block" id="go" style="margin-top:14px">開始測驗</button>
    <p class="muted">※ 本測驗為娛樂與自我訓練參考，不是醫學診斷。</p></div>`);
  let g = last.g || '';
  $$('#gsel .btn').forEach(b => b.onclick = () => { g = b.dataset.g; $$('#gsel .btn').forEach(x => x.classList.toggle('primary', x === b)); SFX.play('click'); });
  $('#go').onclick = () => {
    const age = +$('#age').value; if (!age || age < 6 || age > 110) return toast('請輸入正確的年齡');
    if (!g) return toast('請選擇性別');
    runBrainGames(['mem', 'att', 'spd', 'flx', 'spa'], { title: '腦年齡測驗', fixedLv: 3 }, res => ageResult(age, g, res));
  };
}
function expectedScore(age) { return age < 20 ? 74 + (age - 10) * .6 : age <= 28 ? 80 : 80 - (age - 28) * .42; }
function ageResult(age, g, res) {
  const vals = Object.values(res); const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const exp = expectedScore(age);
  let ba = Math.round(age + (exp - score) / .42 * .7); ba = clamp(ba, Math.max(6, Math.min(age, 18)), Math.min(99, age + 30));
  const grade = score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  const gradeTx = { S: '天才等級！', A: '非常優秀', B: '表現良好', C: '還有進步空間', D: '需要多多鍛鍊' }[grade];
  P.brain.ages.push({ d: today(), age, g, ba, score, s: res }); recordBrain('age', res); save(); checkAch();
  const diff = age - ba;
  const head = diff > 0 ? `比實際年齡年輕 <b>${diff}</b> 歲！🎉` : diff < 0 ? `比實際年齡大了 <b>${-diff}</b> 歲 😅` : '剛好和實際年齡一樣！';
  const DESC = {
    mem: ['記憶力像大象，過目不忘！', '記憶力中規中矩，偶爾會忘記鑰匙放哪。', '記憶力像金魚，三秒就重新開機。'],
    att: ['專注力超強，就算旁邊在放鞭炮也不受影響！', '專注力還不錯，但手機一響就會分心。', '注意力容易被干擾，看到顏色就忘了規則。'],
    spd: ['反應快如閃電，蒼蠅都打得到！', '反應速度普通，跟得上大部分的節奏。', '反應慢半拍，像下載中的網頁。'],
    flx: ['腦筋轉得超快，規則一變馬上切換！', '轉換能力還可以，偶爾會卡一下。', '規則一變就當機，習慣用固定方式思考。'],
    spa: ['空間感一流，停車一次就停進去！', '空間感普通，組家具偶爾需要看說明書。', '空間感有點迷路，常常分不清左右翻轉。']
  };
  const TIP = {
    mem: '多玩「記憶方格」，平常可以練習倒背電話號碼、記購物清單不看紙條。',
    att: '多玩「顏色大作戰」，生活中可以練習靜坐冥想、一次只專心做一件事。',
    spd: '多玩「閃電比大小」，也可以玩打地鼠、桌球等需要快速反應的活動。',
    flx: '多玩「規則大變身」，試著換一條路回家、用另一隻手刷牙，打破固定習慣。',
    spa: '多玩「旋轉積木」，平常可以玩俄羅斯方塊、拼圖、看地圖找路。'
  };
  const lvl = v => v >= 75 ? 0 : v >= 50 ? 1 : 2;
  const weak = Object.entries(res).sort((a, b) => a[1] - b[1]).slice(0, 2).map(e => e[0]);
  const strong = Object.entries(res).sort((a, b) => b[1] - a[1])[0][0];
  const gtx = g === '不透露' ? `${age} 歲玩家` : `${age} 歲${g}性`;
  SFX.play(diff >= 0 ? 'fanfare' : 'pop'); if (diff >= 0) confetti(80);
  Voice.say(`測驗完成！你的大腦年齡是${ba}歲。`);
  setTop('腦年齡結果', BrainHome);
  view(`<div class="card center scroll-card"><div class="owl home-owl" data-s="${diff >= 0 ? 'dance' : 'think'}"></div>
    <div class="muted">你的大腦年齡</div><div class="result-score">${ba} 歲</div><p>${head}</p>
    <div class="row" style="justify-content:center"><div><div class="h2" style="font-size:2.4em;color:var(--accent)">${grade}</div><div class="muted">評等・${gradeTx}</div></div><div><div class="h2" style="font-size:2.4em">${score}</div><div class="muted">總分（滿分 100）</div></div></div>
    <p class="muted">同為 ${gtx} 的平均約 ${Math.round(exp)} 分</p></div>
    <div class="card"><div class="h3">📊 五項能力分析</div><canvas class="chart" id="radar" width="520" height="360"></canvas>
    ${Object.entries(res).map(([k, v]) => `<div class="statrow"><b>${BG[k].icon} ${BAREA[k]}：${v} 分</b> ${v >= exp ? '<span class="tag d1">高於平均</span>' : '<span class="tag d3">低於平均</span>'}<div class="bar"><i style="width:${v}%"></i></div><div class="muted">${DESC[k][lvl(v)]}</div></div>`).join('')}</div>
    <div class="card"><div class="h3">📝 結果說明</div><p style="line-height:1.8">你最強的是「${BAREA[strong]}」，${DESC[strong][0]}<br>比較需要加強的是「${weak.map(k => BAREA[k]).join('」和「')}」。${score >= exp ? '整體表現優於同齡平均，大腦保養得很好！' : '整體略低於同齡平均，別擔心，大腦是可以練出來的！'}</p>
    <div class="h3">💪 建議改善方向</div><ol style="line-height:1.8;padding-left:22px">${weak.map(k => `<li><b>${BAREA[k]}</b>：${TIP[k]}</li>`).join('')}
    <li><b>交叉訓練</b>：不要只玩擅長的，每天的「大腦健檢」會自動輪換項目。</li>
    <li><b>規律運動</b>：每週三次、每次三十分鐘的快走或游泳，能促進大腦健康。</li>
    <li><b>睡飽睡好</b>：睡眠是大腦整理記憶的關鍵時間，盡量睡滿七小時。</li>
    <li><b>學點新東西</b>：學一種新語言、樂器或玩策略桌遊，效果不輸任何遊戲！</li></ol>
    <p class="muted">※ 娛樂性質測驗，結果僅供參考，不能取代醫療評估。若有記憶或健康上的疑慮，請諮詢專業醫師。</p>
    <div class="row"><button class="btn primary" id="rp">大腦報告</button><button class="btn" id="bk">返回</button></div></div>`);
  drawRadar($('#radar'), res);
  $('#rp').onclick = brainReport; $('#bk').onclick = BrainHome;
}

/* ---------- 圖表 ---------- */
function cssv(n) { return getComputedStyle(document.body).getPropertyValue(n).trim() || '#888'; }
function drawRadar(cv, vals) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 50;
  x.clearRect(0, 0, W, H); const keys = Object.keys(BAREA); const ang = i => -Math.PI / 2 + i * 2 * Math.PI / keys.length;
  x.strokeStyle = cssv('--line'); x.lineWidth = 1.5;
  for (let r = 1; r <= 4; r++) { x.beginPath(); keys.forEach((_, i) => { const a = ang(i), rr = R * r / 4; i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }); x.closePath(); x.stroke(); }
  keys.forEach((k, i) => { const a = ang(i); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke();
    x.fillStyle = cssv('--ink'); x.font = 'bold 17px sans-serif'; x.textAlign = 'center'; x.fillText(BAREA[k] + (vals[k] != null ? ' ' + vals[k] : ''), cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 24) + 6); });
  x.beginPath(); keys.forEach((k, i) => { const a = ang(i), rr = R * (vals[k] || 0) / 100; i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }); x.closePath();
  x.fillStyle = cssv('--accent') + '55'; x.fill(); x.strokeStyle = cssv('--accent'); x.lineWidth = 3; x.stroke();
  keys.forEach((k, i) => { const a = ang(i), rr = R * (vals[k] || 0) / 100; x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 5, 0, 7); x.fillStyle = cssv('--accent'); x.fill(); });
}
function drawLine(cv, pts) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, L = 40, B = 34, T = 16, Rr = 14; x.clearRect(0, 0, W, H);
  x.strokeStyle = cssv('--line'); x.fillStyle = cssv('--sub'); x.font = '14px sans-serif'; x.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach(v => { const y = T + (H - T - B) * (1 - v / 100); x.beginPath(); x.moveTo(L, y); x.lineTo(W - Rr, y); x.stroke(); x.textAlign = 'right'; x.fillText(v, L - 6, y + 5); });
  if (!pts.length) { x.textAlign = 'center'; x.fillText('還沒有資料，先去做訓練吧！', W / 2, H / 2); return; }
  const px = i => L + (W - L - Rr) * (pts.length === 1 ? .5 : i / (pts.length - 1)), py = v => T + (H - T - B) * (1 - v / 100);
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(px(i), py(p.v)) : x.moveTo(px(i), py(p.v))); x.strokeStyle = cssv('--accent'); x.lineWidth = 3; x.stroke();
  pts.forEach((p, i) => { x.beginPath(); x.arc(px(i), py(p.v), 4.5, 0, 7); x.fillStyle = cssv('--accent'); x.fill(); });
  x.fillStyle = cssv('--sub'); x.textAlign = 'center'; const step = Math.ceil(pts.length / 6);
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) x.fillText(p.d.slice(5).replace('-', '/'), px(i), H - 10); });
}
function brainReport() {
  stopGame(); setTop('📊 我的大腦報告', BrainHome);
  const h = P.brain.hist; const latest = {};
  Object.keys(BAREA).forEach(a => { const v = []; h.forEach(e => Object.entries(e.s).forEach(([k, s]) => { if (areaOf(k) === a) v.push(s); })); const l = v.slice(-5); if (l.length) latest[a] = Math.round(l.reduce((x, y) => x + y, 0) / l.length); });
  const byDay = {}; h.forEach(e => { const v = Object.values(e.s); (byDay[e.d] = byDay[e.d] || []).push(...v); });
  const pts = Object.keys(byDay).sort().slice(-30).map(d => ({ d, v: Math.round(byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length) }));
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth(); const days = new Date(Y, M + 1, 0).getDate();
  const ages = P.brain.ages.slice(-6).reverse(); const nA = Object.keys(BAREA).length;
  view(`<div class="card"><div class="h3">🕸️ 七大能力雷達圖（最近五次平均）</div><canvas class="chart" id="radar" width="520" height="380"></canvas>
    ${Object.keys(latest).length < nA ? `<p class="muted center">已測 ${Object.keys(latest).length} / ${nA} 項能力，到「自由訓練」玩其他類別就能填滿雷達圖！</p>` : ''}
    ${Object.keys(latest).length >= 2 ? `<p class="center">最強：<b>${BAREA[Object.entries(latest).sort((a, b) => b[1] - a[1])[0][0]]}</b>・待加強：<b>${BAREA[Object.entries(latest).sort((a, b) => a[1] - b[1])[0][0]]}</b></p>` : ''}</div>
    <div class="card"><div class="h3">📈 進步曲線（每日平均分數）</div><canvas class="chart" id="line" width="520" height="260"></canvas></div>
    <div class="card"><div class="h3">📅 ${M + 1} 月健檢打卡（連續 ${chkStreak()} 天）</div><div>${Array.from({ length: days }, (_, i) => { const d = today(new Date(Y, M, i + 1)); return `<span class="stamp ${P.brain.checkup[d] ? 'done' : ''}">${P.brain.checkup[d] ? '腦' : i + 1}</span>`; }).join('')}</div></div>
    <div class="card"><div class="h3">🎂 腦年齡紀錄</div>${ages.length ? ages.map(a => `<div class="lb-row"><span>${a.d}</span><span style="flex:1"></span><span>實際 ${a.age} 歲 → 大腦 <b>${a.ba}</b> 歲（${a.score} 分）</span></div>`).join('') : '<p class="muted">還沒有測驗紀錄</p>'}</div>`);
  drawRadar($('#radar'), latest); drawLine($('#line'), pts);
}
