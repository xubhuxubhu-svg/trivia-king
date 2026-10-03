/* ===== 幸運九宮格跑馬燈 ===== */
const SPECIAL = { ask: { icon: '❓', name: '問號' }, chance: { icon: '🍀', name: '機會' }, fate: { icon: '🎲', name: '命運' } };
const CHANCE = [
  { t: '🎁 撿到紅包！加 100 分', f: (B, p) => p.sc += 100, s: 'coin' },
  { t: '✨ 智慧加持！下一題答對分數加倍', f: (B, p) => p.dbl = true, s: 'levelup' },
  { t: '🦊 狐假虎威！向第一名偷 60 分', f: (B, p) => { const top = B.top(p); if (top) { top.sc -= 60; p.sc += 60; } }, s: 'slide' },
  { t: '🔁 好運連連！再轉一次', f: (B, p) => B.again = true, s: 'boing' },
  { t: '🧰 獲得道具「去掉兩個」一個', f: (B, p) => { if (p.me) P.items.fifty++; else p.sc += 30; }, s: 'coin' },
  { t: '🍗 老闆請吃雞腿！加 50 分', f: (B, p) => p.sc += 50, s: 'coin' }
];
const FATE = [
  { t: '💨 噗～放了一個響屁，大家笑倒！扣 30 分', f: (B, p) => p.sc -= 30, s: 'fart' },
  { t: '🍌 踩到香蕉皮滑倒！暫停一回合', f: (B, p) => p.skip = true, s: 'slide' },
  { t: '🔄 乾坤大挪移！和最後一名交換分數', f: (B, p) => { const low = B.low(p); if (low) [p.sc, low.sc] = [low.sc, p.sc]; }, s: 'whoosh' },
  { t: '🧧 做善事！送最後一名 50 分', f: (B, p) => { const low = B.low(p); if (low) { p.sc -= 50; low.sc += 50; } }, s: 'coin' },
  { t: '😱 被老師點名！加考一題高難度，答對加 200 分', f: (B, p) => B.bonusQ = true, s: 'warn' },
  { t: '🐦 被鳥大便打中……扣 20 分', f: (B, p) => p.sc -= 20, s: 'boing' }
];
function boardSetup() {
  stopGame();
  let size = 3, n = 2, lvl = 1, rounds = 5, diff = 0;
  setTop('🎰 幸運九宮格', Home, () => showHowto('board'));
  const draw = () => {
    view(`<div class="card"><div class="h2">🎰 幸運九宮格跑馬燈</div><p class="muted">燈號繞著格子跑，停在哪格就考哪一類！還有問號、機會、命運格。</p>
    <div class="h3">棋盤大小</div><div class="row" id="ssel">${[[3, '小・8 格'], [4, '中・12 格'], [5, '大・16 格']].map(([k, t]) => `<button class="btn ${k === size ? 'primary' : ''}" data-s="${k}">${t}</button>`).join('')}</div>
    <div class="h3">電腦玩家</div><div class="row" id="nsel">${[1, 2, 3].map(k => `<button class="btn ${k === n ? 'primary' : ''}" data-n="${k}">${k} 位</button>`).join('')}</div>
    <div class="row" id="lsel" style="margin-top:6px">${AIL.map((a, k) => `<button class="btn ${k === lvl ? 'gold' : ''}" data-l="${k}" style="padding:8px 4px;font-size:.85em">${a.av}<br>${a.n}</button>`).join('')}</div>
    <div class="h3">每人回合數</div><div class="row" id="rsel">${[5, 8, 10].map(k => `<button class="btn ${k === rounds ? 'primary' : ''}" data-r="${k}">${k} 回合</button>`).join('')}</div>
    <div class="h3">難度</div><div class="row" id="dsel">${[0, 1, 2, 3].map(d => `<button class="btn ${d === diff ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
    <button class="btn primary block" id="go">開始轉動！</button></div>`);
    $$('#ssel .btn').forEach(b => b.onclick = () => { size = +b.dataset.s; draw(); });
    $$('#nsel .btn').forEach(b => b.onclick = () => { n = +b.dataset.n; draw(); });
    $$('#lsel .btn').forEach(b => b.onclick = () => { lvl = +b.dataset.l; draw(); });
    $$('#rsel .btn').forEach(b => b.onclick = () => { rounds = +b.dataset.r; draw(); });
    $$('#dsel .btn').forEach(b => b.onclick = () => { diff = +b.dataset.d; draw(); });
    $('#go').onclick = () => {
      const ringN = (size - 1) * 4; const nSp = Math.max(2, Math.round(ringN * .25));
      const cats = shuffle(CATS.map(c => c.id)).slice(0, ringN - nSp);
      const sps = Array.from({ length: nSp }, (_, i) => ['ask', 'chance', 'fate'][i % 3]);
      const cells = shuffle(cats.map(c => ({ cat: c })).concat(sps.map(s => ({ sp: s }))));
      const players = [{ n: PNAME, av: '😎', me: true, sc: 0, ok: 0 }].concat(Array.from({ length: n }, (_, i) => ({ n: AIL[lvl].n + (n > 1 ? (i + 1) : ''), av: AIL[lvl].av, ai: lvl, sc: 0, ok: 0 })));
      Board.start({ size, cells, usedCells: [], used: [], players, turn: 0, round: 0, rounds, diff, pos: 0 });
    };
  };
  draw();
}
const Board = {
  st: null, timers: [],
  top(p) { return this.st.players.filter(x => x !== p).sort((a, b) => b.sc - a.sc)[0]; },
  low(p) { return this.st.players.filter(x => x !== p).sort((a, b) => a.sc - b.sc)[0]; },
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); },
  clear() { this.timers.forEach(clearTimeout); this.timers = []; if (this.tm) this.tm.stop(); this.tm = null; },
  ring(N) { const r = []; for (let c = 0; c < N; c++) r.push([0, c]); for (let i = 1; i < N; i++) r.push([i, N - 1]); for (let c = N - 2; c >= 0; c--) r.push([N - 1, c]); for (let i = N - 2; i > 0; i--) r.push([i, 0]); return r; },
  start(st) {
    stopGame(); this.st = st; this.used = new Set(st.used); this.spinning = false;
    Game.stop = () => this.clear();
    Game.snapshot = () => { if (this.st && !this.st.done) { this.st.used = [...this.used]; P.session = JSON.parse(JSON.stringify(Object.assign({ board: true }, this.st))); } };
    setTop('🎰 幸運九宮格', () => this.quit(), () => showHowto('board'));
    const N = st.size, R = this.ring(N);
    const cellsHtml = R.map(([r, c], i) => { const cell = st.cells[i]; const sp = cell.sp ? SPECIAL[cell.sp] : null; const ct = cell.cat ? CAT[cell.cat] : null;
      return `<div class="cell ${sp ? 'special' : ''} ${st.usedCells.includes(i) ? 'used' : ''}" data-i="${i}" style="grid-row:${r + 1};grid-column:${c + 1}"><span class="ci">${sp ? sp.icon : ct.icon}</span>${sp ? sp.name : ct.name}</div>`; }).join('');
    view(`<div class="players" id="pls"></div>
      <div class="board-wrap"><div class="board" id="board" style="grid-template-columns:repeat(${N},1fr)">${cellsHtml}
      <button class="cell center" id="spin" style="grid-row:2/${N};grid-column:2/${N};aspect-ratio:auto"><span class="ci">🎯</span><span id="spinTx">開始</span></button></div></div>
      <div class="hostrow" style="margin-top:12px"><div class="owl"></div><div class="bubble" id="bubble"></div></div>
      <div id="qarea"></div><div id="explain"></div><div id="nextArea" class="center" style="margin-top:10px"></div>`);
    $('#spin').onclick = () => { const p = this.cur(); if (p.me && !this.spinning && !this.st.done && this.waiting) this.spin(); };
    this.lit(st.pos); this.turn();
  },
  cur() { return this.st.players[this.st.turn]; },
  pls() { const st = this.st; $('#pls').innerHTML = st.players.map((p, i) => `<div class="pl ${i === st.turn ? 'turn' : ''}">${p.dbl ? '<span class="mark">✨</span>' : p.skip ? '<span class="mark">🍌</span>' : ''}<span class="av">${p.av}</span><div class="nm">${esc(p.n)}</div><div class="sc">${p.sc} 分</div><div class="muted">答對 ${p.ok}</div></div>`).join(''); },
  lit(i) { $$('#board .cell[data-i]').forEach(c => c.classList.toggle('lit', +c.dataset.i === i)); },
  turn() {
    const st = this.st; this.clear(); this.waiting = false;
    if (st.round >= st.rounds) return this.end();
    this.pls(); $('#qarea').innerHTML = ''; $('#explain').innerHTML = ''; $('#nextArea').innerHTML = '';
    const p = this.cur();
    $('#spinTx').textContent = `第 ${st.round + 1}/${st.rounds} 回合`;
    if (p.skip) { p.skip = false; $('#bubble').textContent = `${p.n} 滑倒還沒爬起來，這回合暫停！`; SFX.play('slide'); return this.later(() => this.endTurn(), 1800); }
    if (p.me) { this.waiting = true; $('#bubble').innerHTML = '輪到你了！點中間的 <b>🎯 開始</b> 轉動跑馬燈！'; $('#spinTx').textContent = '點我開始！'; Voice.say('輪到你了，請按開始！'); Owl.set('talk', 1500); }
    else { $('#bubble').textContent = `輪到 ${p.n}……`; this.later(() => this.spin(), 1400); }
  },
  spin() {
    if (this.spinning) return; this.spinning = true; this.waiting = false; SFX.play('drum');
    const st = this.st, L = st.cells.length; const steps = L * (2 + rnd(2)) + rnd(L);
    let k = 0, pos = st.pos; $('#spinTx').textContent = '轉轉轉～';
    const step = () => {
      pos = (pos + 1) % L; k++; this.lit(pos); SFX.play('lightTick');
      const rem = steps - k; if (rem <= 0) { st.pos = pos; return this.land(pos); }
      const prog = k / steps; const d = prog < .15 ? 110 - prog * 400 : prog < .7 ? 50 : 50 + Math.pow((prog - .7) / .3, 2.2) * 480;
      this.later(step, d);
    };
    step();
  },
  async land(i) {
    const st = this.st, cell = st.cells[i], p = this.cur(); this.spinning = false;
    SFX.play('lightStop'); const el = $(`#board .cell[data-i="${i}"]`); el.classList.add('final'); setTimeout(() => el.classList.remove('final'), 1600);
    await sleep(900);
    let sp = cell.sp; if (sp === 'ask') { sp = Math.random() < .5 ? 'chance' : 'fate'; banner('❓ 問號揭曉：' + SPECIAL[sp].name + '！', 'pop'); await sleep(1200); }
    if (sp) return this.event(sp);
    // 類別格
    let cat = cell.cat;
    if (st.usedCells.includes(i) && p.me) {
      const r = await ask('這格已經考過了！', `「${CAT[cat].name}」之前出過題了，要怎麼做？<br><span class="muted">（題目一定不會重複）</span>`, [{ t: '同類別再出一題新的', v: 'same' }, { t: '換一格，重新轉！', v: 'spin', cls: 'gold' }]);
      if (r === 'spin') { this.waiting = true; $('#bubble').textContent = '好，再轉一次！'; return this.spin(); }
    }
    if (QB.remain(cat, st.diff, this.used) === 0) {
      let r = 'switch';
      if (p.me) r = await ask('題目被考光了！', `「${CAT[cat].name}」這個類別的題目快被你們考光了！`, [{ t: '換成其他類別', v: 'switch' }, { t: '重新洗牌（允許出過的題目）', v: 'reset', cls: 'gold' }]);
      if (r === 'reset') [...this.used].filter(id => id.startsWith(cat + '-')).forEach(id => this.used.delete(id));
      else { const alt = CATS.map(c => c.id).filter(c => QB.remain(c, st.diff, this.used) > 0); cat = pickOne(alt); toast('改考「' + CAT[cat].name + '」'); }
    }
    if (!st.usedCells.includes(i)) { st.usedCells.push(i); el.classList.add('used'); }
    this.ask(cat, st.diff);
  },
  event(sp) {
    const st = this.st, p = this.cur(); const ev = pickOne(sp === 'chance' ? CHANCE : FATE);
    this.again = false; this.bonusQ = false;
    ev.f(this, p); SFX.play(ev.s); if (ev.s === 'fart') shakeScreen();
    banner((sp === 'chance' ? '🍀 機會：' : '🎲 命運：') + ev.t.slice(0, 14));
    $('#bubble').textContent = `${p.n}：${ev.t}`; Voice.say(ev.t.replace(/^\S+\s/, ''));
    Owl.set(sp === 'chance' ? 'happy' : 'sad', 1800); this.pls(); save();
    if (this.bonusQ) return this.later(() => this.ask(pickOne(CATS).id, 3, 200), 1800);
    if (this.again) return this.later(() => { if (p.me) { this.waiting = true; $('#bubble').textContent = '再轉一次！點中間開始！'; $('#spinTx').textContent = '再轉一次！'; } else this.spin(); }, 1600);
    this.later(() => this.endTurn(), 2200);
  },
  ask(cat, diff, bonus) {
    const p = this.cur(), st = this.st;
    const q = this.q = QB.pick({ cat, diff, exclude: this.used, types: ['choice', 'tf'], special: false }); this.used.add(q.id);
    this.qv = QView($('#qarea'), q, { onPick: (ok, pk) => this.res(ok, pk, bonus), canPick: () => p.me });
    $('#bubble').textContent = p.me ? '請作答！' : `${p.n} 思考中……`; Owl.set('read', 1500);
    if (S.readQ) Voice.say(q.q);
    $('#qarea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (p.me) { const sec = S.elder ? 0 : 20; if (sec) this.tm = Timer(sec, l => { if (l < 4 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => this.res(false, null, bonus)); }
    else { const a = AIL[p.ai]; this.later(() => { const ok = Math.random() < a.acc[q.diff - 1]; const pk = ok ? 0 : pickOne(q.opts.map((_, k) => k).filter(k => k)); this.qv.markPick(pk); this.later(() => this.res(ok, pk, bonus), 700); }, (a.sp[0] + Math.random() * 2) * 1000); }
  },
  res(ok, pk, bonus) {
    if (this.qv.done) return; this.qv.done = true; if (this.tm) this.tm.stop(); this.tm = null;
    const p = this.cur(), q = this.q; this.qv.reveal(pk);
    if (p.me) recordAnswer(q, ok);
    if (ok) {
      let g = bonus || Math.round(100 * DMUL[q.diff]); if (p.dbl) { g *= 2; p.dbl = false; }
      p.sc += g; p.ok++; SFX.play('correct'); Owl.set('happy', 1500);
      $('#bubble').innerHTML = `${p.n} 答對了！<b>＋${g}</b>`; if (p.me) { addXP(12 * DMUL[q.diff]); addCoins(3); Voice.say(line('correct')); }
    } else { p.dbl = false; SFX.play('wrong'); Owl.set('sad', 1500); $('#bubble').textContent = `${p.n} 答錯了！`; if (p.me) Voice.say(line('wrong')); }
    if (q.exp) $('#explain').innerHTML = `<div class="explain">💡 <b>答案：${esc(q.opts[0])}</b> ${esc(q.exp)}</div>`;
    this.pls(); save();
    $('#nextArea').innerHTML = `<button class="btn primary" id="btnNext">下一位 ▶</button>`;
    $('#btnNext').onclick = () => this.endTurn();
    this.later(() => { if ($('#btnNext')) this.endTurn(); }, p.me ? 8000 : 4500);
  },
  endTurn() {
    const st = this.st; this.clear(); window.scrollTo({ top: 0, behavior: 'smooth' });
    st.turn = (st.turn + 1) % st.players.length; if (st.turn === 0) st.round++;
    Game.snapshot(); save(); this.turn();
  },
  quit() { ask('要離開棋盤嗎？', '進度會自動儲存，下次可以繼續。', [{ t: '先離開', v: 1 }, { t: '繼續玩', v: 0, cls: 'gold' }]).then(v => { if (v) { Game.snapshot(); save(); stopGame(); Home(); } }); },
  end() {
    const st = this.st; st.done = true; this.clear(); P.session = null; Game.snapshot = null;
    const rank = st.players.slice().sort((a, b) => b.sc - a.sc); const win = rank[0].me; P.totals.games++;
    if (win) { P.best.boardWins++; addCoins(30); addXP(60); SFX.play('fanfare'); confetti(100); Voice.say('恭喜你成為九宮格大贏家！'); } else { addCoins(8); SFX.play('lose'); }
    save(); checkAch();
    view(`<div class="card center"><div class="owl home-owl" data-s="${win ? 'dance' : 'sad'}"></div><div class="h2">🎰 九宮格結算</div>
    ${rank.map((p, k) => `<div class="lb-row"><span class="rk">${['🥇', '🥈', '🥉', '4'][k]}</span><span style="font-size:1.6em">${p.av}</span><span style="flex:1;text-align:left"><b>${esc(p.n)}</b>${p.me ? '（你）' : ''}</span><span>答對 ${p.ok}・<b>${p.sc} 分</b></span></div>`).join('')}
    <div class="row" style="margin-top:12px"><button class="btn primary" id="again">再來一局</button><button class="btn" id="home">回首頁</button></div></div>`);
    setTop('九宮格結算', Home); $('#again').onclick = boardSetup; $('#home').onclick = Home;
  }
};
