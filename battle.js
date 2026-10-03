/* ===== 對戰模式（單機版：與電腦玩家對戰；連線版將加入真人） ===== */
const AIL = [
  { n: '小學生小明', av: '🧒', acc: [.75, .5, .3], sp: [4.5, 8], talk: ['我會我會！', '老師說要先舉手！', '這題我上課有聽到！'] },
  { n: '大學生阿華', av: '🧑‍🎓', acc: [.88, .68, .48], sp: [3, 6.5], talk: ['熬夜讀書終於有用了！', '這題考古題有出過！', '學分到手！'] },
  { n: '陳教授', av: '👨‍🏫', acc: [.95, .85, .68], sp: [2.3, 5], talk: ['嗯，這是基本常識。', '年輕人，還要再加強喔。', '當年我寫論文就研究過這個。'] },
  { n: '智多星院士', av: '🧙', acc: [.99, .93, .84], sp: [1.6, 3.8], talk: ['一切盡在我的計算之中。', '呵呵呵，太簡單了。', '老夫掐指一算……'] }
];
const BMODES = {
  buzz: { name: '搶答擂台', icon: '🔔', desc: '按下搶答鈕，最快的人才能作答' },
  sync: { name: '同步作答', icon: '🎯', desc: '大家同時作答，答對又快的人分數最高' },
  duel: { name: '一對一對決', icon: '⚔️', desc: '血量對決，答對就能攻擊對手' }
};
function battleSetup(mode) {
  stopGame();
  const m = BMODES[mode];
  let n = mode === 'duel' ? 1 : 2, lvls = [1, 1, 2], cat = 'mix', diff = 0, count = 10;
  setTop(m.icon + ' ' + m.name, Home, () => showHowto(mode));
  const draw = () => {
    view(`<div class="card"><div class="h2">${m.icon} ${m.name}</div><p class="muted">${m.desc}</p>
    ${mode !== 'duel' ? `<div class="h3">電腦玩家人數</div><div class="row" id="nsel">${[1, 2, 3].map(k => `<button class="btn ${k === n ? 'primary' : ''}" data-n="${k}">${k} 位</button>`).join('')}</div>` : ''}
    <div class="h3">電腦玩家程度</div>${Array.from({ length: n }, (_, i) => `<div class="row" style="margin:4px 0">${AIL.map((a, k) => `<button class="btn ${lvls[i] === k ? 'gold' : ''}" data-ai="${i}" data-k="${k}" style="padding:8px 4px;font-size:.85em">${a.av}<br>${a.n}</button>`).join('')}</div>`).join('')}
    <div class="h3">難度</div><div class="row" id="dsel">${[0, 1, 2, 3].map(d => `<button class="btn ${d === diff ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
    <div class="h3">題數</div><div class="row" id="csel2">${[10, 15, 20].map(k => `<button class="btn ${k === count ? 'primary' : ''}" data-c="${k}">${k} 題</button>`).join('')}</div>
    <div class="h3">類別</div><select class="field" id="catSel"><option value="mix">🌈 綜合（所有類別）</option>${CATS.map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>
    <button class="btn primary block" id="go">開戰！</button>
    <p class="muted center">${typeof NET !== 'undefined' && NET.on ? '想和真人朋友比賽？到首頁的「🌐 真人連線」開房間！' : '連線版可以和真人好友開房間對戰'}</p></div>`);
    $$('#nsel .btn').forEach(b => b.onclick = () => { n = +b.dataset.n; draw(); });
    $$('[data-ai]').forEach(b => b.onclick = () => { lvls[+b.dataset.ai] = +b.dataset.k; draw(); });
    $$('#dsel .btn').forEach(b => b.onclick = () => { diff = +b.dataset.d; draw(); });
    $$('#csel2 .btn').forEach(b => b.onclick = () => { count = +b.dataset.c; draw(); });
    $('#catSel').value = cat; $('#catSel').onchange = e => cat = e.target.value;
    $('#go').onclick = () => {
      SFX.play('gong');
      const players = [{ n: PNAME, av: '😎', me: true, sc: 0, buzz: 0, ok: 0, hp: 100 }].concat(Array.from({ length: n }, (_, i) => { const a = AIL[lvls[i]]; return { n: a.n + (n > 1 && lvls.slice(0, i).includes(lvls[i]) ? (i + 1) : ''), av: a.av, ai: lvls[i], sc: 0, buzz: 0, ok: 0, hp: 100 }; }));
      Battle.start({ mode, cat, diff, n: count, qi: 0, players, used: [] });
    };
  };
  draw();
}

const Battle = {
  st: null, timers: [], qv: null, q: null,
  clear() { this.timers.forEach(t => clearTimeout(t)); this.timers = []; if (this.tm) this.tm.stop(); this.tm = null; },
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; },
  start(st) {
    stopGame(); this.st = st; this.used = new Set(st.used || []);
    Game.stop = () => { this.clear(); document.onkeydown = null; };
    Game.snapshot = () => { if (this.st && !this.st.done) { this.st.used = [...this.used]; P.session = JSON.parse(JSON.stringify(Object.assign({ battle: true }, this.st))); } };
    const m = BMODES[st.mode];
    setTop(m.icon + ' ' + m.name, () => this.quit(), () => showHowto(st.mode));
    view(`<div class="players" id="pls"></div><div class="qhead"><span class="chip" id="qn"></span><span class="chip" id="phase">準備</span></div>
      <div class="timebar" id="tbar"><i style="width:100%"></i></div>
      <div class="hostrow"><div class="owl" data-s="talk"></div><div class="bubble" id="bubble">比賽開始！各位選手請就位！</div></div>
      <div id="qarea"></div><div id="buzzArea"></div><div id="explain"></div><div id="nextArea" class="center" style="margin-top:10px"></div>`);
    Voice.say(m.name + '，比賽開始！');
    document.onkeydown = e => { if (e.code === 'Space' && this.st && this.st.mode === 'buzz') { e.preventDefault(); this.humanBuzz(); } };
    this.later(() => this.next(), 1200);
  },
  pls(marks = {}) {
    const st = this.st;
    $('#pls').innerHTML = st.players.map((p, i) => `<div class="pl ${marks.buzz === i ? 'buzz' : ''} ${marks.out && marks.out.has(i) ? 'out' : ''} ${st.mode === 'duel' && p.hp <= 0 ? 'out' : ''}">
      ${marks[i] ? `<span class="mark">${marks[i]}</span>` : ''}<span class="av">${p.av}</span><div class="nm">${esc(p.n)}</div>
      ${st.mode === 'duel' ? `<div class="hpbar"><i style="width:${Math.max(0, p.hp)}%"></i></div><div class="sc">❤️ ${Math.max(0, p.hp)}</div>` : `<div class="sc">${p.sc} 分</div>`}
      ${st.mode === 'buzz' ? `<div class="muted">搶到 ${p.buzz} 題</div>` : `<div class="muted">答對 ${p.ok}</div>`}</div>`).join('');
  },
  bar(p) { const b = $('#tbar'); if (b) { b.firstChild.style.width = clamp(p * 100, 0, 100) + '%'; b.classList.toggle('low', p < .25); } },
  next() {
    const st = this.st; this.clear();
    if (st.qi >= st.n || (st.mode === 'duel' && st.players.some(p => p.hp <= 0))) return this.end();
    const q = this.q = QB.pick({ cat: st.cat, diff: st.diff, exclude: this.used, types: ['choice', 'tf'] }); this.used.add(q.id);
    $('#qn').textContent = `第 ${st.qi + 1} / ${st.n} 題`; $('#explain').innerHTML = ''; $('#nextArea').innerHTML = '';
    this.out = new Set(); this.answerer = null; this.picks = {}; this.done = false;
    this.pls();
    if (st.mode === 'buzz') return this.buzzRound();
    return this.syncRound();
  },
  /* ---- 搶答 ---- */
  buzzRound() {
    const q = this.q, st = this.st;
    this.qv = QView($('#qarea'), q, { onPick: (ok, pk) => this.resolveBuzz(0, ok, pk), canPick: () => this.answerer === 0 });
    $('#phase').textContent = '📖 聽題中';
    $('#buzzArea').innerHTML = `<button class="buzzer" id="buzzer" disabled>🔔 搶答！</button><div class="muted center">電腦可以按空白鍵搶答</div>`;
    $('#buzzer').onclick = () => this.humanBuzz();
    $('#bubble').textContent = '請聽題……讀完題目才可以搶答喔！'; Owl.set('read');
    if (S.readQ) Voice.say(q.q);
    const readMs = 1600 + Math.min(2500, q.q.length * 40);
    this.later(() => this.openBuzz(), readMs);
  },
  openBuzz() {
    if (this.answerer != null || this.done) return;
    $('#phase').textContent = '🔔 開放搶答'; SFX.play('pop');
    const b = $('#buzzer'); if (b) b.disabled = this.out.has(0);
    $('#bubble').textContent = '開放搶答！'; Owl.set('idle');
    // 電腦玩家準備搶答
    this.st.players.forEach((p, i) => {
      if (!p.me && !this.out.has(i)) { const a = AIL[p.ai]; const d = this.q.diff - 1; const think = (a.sp[0] + Math.random() * (a.sp[1] - a.sp[0])) * (1 + d * .25); this.later(() => this.aiBuzz(i), think * 1000); }
    });
    const sec = 12; this.tm = Timer(sec, l => this.bar(l / sec), () => this.noBuzz());
  },
  humanBuzz() {
    if (this.answerer != null || this.done || this.out.has(0) || $('#phase').textContent !== '🔔 開放搶答') return;
    this.setBuzz(0);
    $('#bubble').textContent = '你搶到了！請在 8 秒內作答！';
    if (this.tm) this.tm.stop(); this.tm = Timer(8, l => { this.bar(l / 8); if (l < 3 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => { if (this.answerer === 0) this.resolveBuzz(0, false, null, true); });
  },
  setBuzz(i) {
    this.clear(); this.answerer = i; const p = this.st.players[i]; p.buzz++;
    SFX.play('buzz'); $('#phase').textContent = `🙋 ${p.n} 作答中`; this.pls({ buzz: i, out: this.out });
    banner(`🔔 ${p.n} 搶到了！`); Voice.say(p.me ? '你搶到了！' : p.n + '搶到了！');
    const b = $('#buzzer'); if (b) b.disabled = true;
  },
  aiBuzz(i) {
    if (this.answerer != null || this.done || this.out.has(i)) return;
    this.setBuzz(i); const p = this.st.players[i];
    $('#bubble').textContent = `${p.n}：「${pickOne(AIL[p.ai].talk)}」`;
    this.later(() => {
      const ok = Math.random() < AIL[p.ai].acc[this.q.diff - 1];
      const pk = ok ? 0 : pickOne(this.q.opts.map((_, k) => k).filter(k => k));
      this.qv.markPick(pk); this.later(() => this.resolveBuzz(i, ok, pk), 700);
    }, 1200 + rnd(1200));
  },
  resolveBuzz(i, ok, pk, timeout) {
    if (this.done) return; this.clear();
    const st = this.st, p = st.players[i], q = this.q;
    if (p.me) recordAnswer(q, ok);
    if (ok) {
      const g = Math.round(100 * DMUL[q.diff]); p.sc += g; p.ok++; this.done = true; this.qv.reveal(pk);
      SFX.play('correct'); $('#bubble').innerHTML = `${p.n} 答對了！<b>＋${g}</b>`; Owl.set('happy', 1500);
      if (p.me) { addXP(12 * DMUL[q.diff]); addCoins(3); Voice.say(line('correct')); } else Voice.say(p.n + '答對了！');
      this.pls({ [i]: '✅' }); this.after();
    } else {
      p.sc -= 50; this.out.add(i); SFX.play('wrong');
      $('#bubble').textContent = `${p.n} ${timeout ? '時間到' : '答錯了'}！扣 50 分，其他人可以再搶答！`; Owl.set('sad', 1200);
      if (p.me) Voice.say(line('wrong'));
      const left = st.players.map((_, k) => k).filter(k => !this.out.has(k));
      const marks = { out: this.out }; this.out.forEach(k => marks[k] = '❌'); this.pls(marks);
      if (!left.length) { this.done = true; this.qv.reveal(null); $('#bubble').textContent = '全部答錯！這題太難啦！'; return this.after(); }
      this.answerer = null; this.later(() => this.openBuzz(), 1200);
    }
  },
  noBuzz() { if (this.done) return; this.done = true; this.clear(); this.qv.reveal(null); SFX.play('gong'); $('#bubble').textContent = '沒有人搶答……大家都在發呆嗎？'; Owl.set('sleep', 1500); this.after(); },
  /* ---- 同步作答／對決 ---- */
  syncRound() {
    const q = this.q, st = this.st; this.order = [];
    this.qv = QView($('#qarea'), q, { onPick: (ok, pk) => this.syncPick(0, ok, pk), canPick: () => this.picks[0] == null });
    $('#buzzArea').innerHTML = ''; $('#phase').textContent = '✏️ 大家作答中';
    $('#bubble').textContent = '大家一起作答，越快越好！'; Owl.set('read', 1500);
    if (S.readQ) Voice.say(q.q);
    const sec = S.elder ? 40 : 18;
    st.players.forEach((p, i) => {
      if (p.me || (st.mode === 'duel' && p.hp <= 0)) return; const a = AIL[p.ai]; const t = (a.sp[0] + Math.random() * (a.sp[1] - a.sp[0])) * (1 + (q.diff - 1) * .3) + 1.2;
      this.later(() => { const ok = Math.random() < a.acc[q.diff - 1]; this.syncPick(i, ok, null); }, Math.min(t, sec - .5) * 1000);
    });
    this.tm = Timer(sec, l => { this.bar(l / sec); if (l < 4 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => this.syncReveal());
  },
  syncPick(i, ok, pk) {
    if (this.done || this.picks[i] != null) return;
    this.picks[i] = { ok, pk }; this.order.push(i);
    const marks = {}; Object.keys(this.picks).forEach(k => marks[k] = '✏️'); this.pls(marks);
    if (i === 0) { this.qv.markPick(pk); this.qv.lock(); SFX.play('click'); $('#bubble').textContent = '已作答！等待其他玩家……'; }
    else SFX.play('pop');
    if (Object.keys(this.picks).length >= this.st.players.filter(p => !(this.st.mode === 'duel' && p.hp <= 0)).length) this.later(() => this.syncReveal(), 500);
  },
  syncReveal() {
    if (this.done) return; this.done = true; this.clear();
    const st = this.st, q = this.q; const me = this.picks[0];
    this.qv.reveal(me ? me.pk : null); recordAnswer(q, !!(me && me.ok));
    const rightOrder = this.order.filter(i => this.picks[i].ok);
    const marks = {};
    st.players.forEach((p, i) => { const pk = this.picks[i]; marks[i] = !pk ? '⌛' : pk.ok ? '✅' : '❌'; });
    if (st.mode === 'sync') {
      rightOrder.forEach((i, r) => { const p = st.players[i]; const g = Math.round(100 * DMUL[q.diff] + [60, 30, 15, 0][r]); p.sc += g; p.ok++; if (r === 0) marks[i] = '🥇'; });
    } else {
      // 對決：答對又最快的人攻擊
      const [a, b] = [0, 1]; const ra = this.picks[a] && this.picks[a].ok, rb = this.picks[b] && this.picks[b].ok;
      if (ra) st.players[a].ok++; if (rb) st.players[b].ok++;
      let dmgTo = null, dmg = 0;
      if (ra && rb) { dmgTo = rightOrder[0] === a ? b : a; dmg = 15; }
      else if (ra) { dmgTo = b; dmg = 25; } else if (rb) { dmgTo = a; dmg = 25; }
      dmg = Math.round(dmg * (q.diff === 3 ? 1.4 : q.diff === 2 ? 1.2 : 1));
      if (dmgTo != null) { st.players[dmgTo].hp -= dmg; st.players[1 - dmgTo].sc += dmg; shakeScreen(); SFX.play(dmgTo === 0 ? 'heart' : 'boing'); this.later(() => banner(`💥 ${st.players[1 - dmgTo].n} 攻擊！造成 ${dmg} 點傷害`), 200); }
    }
    this.pls(marks);
    const meOk = me && me.ok;
    if (meOk) { SFX.play('correct'); addXP(12 * DMUL[q.diff]); addCoins(3); Owl.set('happy', 1500); $('#bubble').textContent = rightOrder[0] === 0 ? '你答對了，而且是最快的！' : '答對了！不過有人比你快喔！'; Voice.say(line('correct')); }
    else { SFX.play('wrong'); Owl.set('sad', 1500); $('#bubble').textContent = me ? line('wrong') : '你沒有作答喔！'; }
    this.after();
  },
  after() {
    const st = this.st, q = this.q; st.qi++; Game.snapshot(); save();
    if (q.exp) $('#explain').innerHTML = `<div class="explain">💡 <b>答案：${esc(q.opts[0])}</b> ${esc(q.exp)}</div>`;
    $('#phase').textContent = '公布答案'; const b = $('#buzzer'); if (b) b.disabled = true;
    $('#nextArea').innerHTML = `<button class="btn primary" id="btnNext">下一題 ▶</button>`;
    $('#btnNext').onclick = () => { SFX.play('click'); this.next(); };
    this.later(() => { if ($('#btnNext')) this.next(); }, 6000);
  },
  quit() {
    ask('要離開比賽嗎？', '目前進度會自動儲存，下次可以繼續。', [{ t: '先離開', v: 1 }, { t: '繼續比賽', v: 0, cls: 'gold' }]).then(v => { if (v) { Game.snapshot(); save(); stopGame(); Home(); } });
  },
  end() {
    const st = this.st; st.done = true; this.clear(); P.session = null; Game.snapshot = null; document.onkeydown = null;
    const key = st.mode === 'duel' ? (p => p.hp * 10000 + p.sc) : (p => p.sc);
    const rank = st.players.map((p, i) => ({ ...p, i })).sort((a, b) => key(b) - key(a));
    const win = rank[0].me; P.totals.games++;
    if (win) { P.best.battleWins++; addCoins(30); addXP(60); SFX.play('fanfare'); confetti(100); Voice.say('恭喜你獲得冠軍！'); }
    else { addCoins(8); SFX.play('lose'); Voice.say(rank[0].n + '獲得冠軍！下次再加油！'); }
    save(); checkAch();
    view(`<div class="card center"><div class="owl home-owl" data-s="${win ? 'dance' : 'sad'}"></div><div class="h2">🏆 比賽結果</div>
      ${rank.map((p, k) => `<div class="lb-row"><span class="rk">${['🥇', '🥈', '🥉', '4'][k]}</span><span style="font-size:1.6em">${p.av}</span><span style="flex:1;text-align:left"><b>${esc(p.n)}</b>${p.me ? '（你）' : ''}</span><span>${st.mode === 'buzz' ? `搶到 ${p.buzz}・` : ''}答對 ${p.ok}・<b>${st.mode === 'duel' ? '❤️ ' + Math.max(0, p.hp) : p.sc + ' 分'}</b></span></div>`).join('')}
      <p>${win ? '🎉 你是冠軍！獲得 30 金幣' : '再接再厲！獲得 8 金幣參加獎'}</p>
      <div class="row"><button class="btn primary" id="again">再來一局</button><button class="btn" id="home">回首頁</button></div></div>`);
    setTop('比賽結果', Home);
    $('#again').onclick = () => battleSetup(st.mode); $('#home').onclick = Home;
  }
};
