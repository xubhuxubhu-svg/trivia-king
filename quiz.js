/* ===== 答題引擎與個人挑戰模式 ===== */
const Game = { snapshot: null, stop: null };
function stopGame() { if (Game.stop) { try { Game.stop(); } catch (e) { } } Game.stop = null; Game.snapshot = null; Voice.stop(); }

/* ---------- 題目畫面元件 ---------- */
function QView(el, q, cb) {
  const K = ['甲', '乙', '丙', '丁'];
  let locked = false, order = [], mSel = null, mPairs = {};
  const meta = `<div class="qmeta"><span class="tag">${CAT[q.cat] ? CAT[q.cat].icon + ' ' + CAT[q.cat].name : '🧩 動腦'}</span><span class="tag d${q.diff}">${DIFF[q.diff]}</span>${q.type === 'tf' ? '<span class="tag">是非題</span>' : ''}${q.type === 'order' ? '<span class="tag">排序題</span>' : ''}${q.type === 'match' ? '<span class="tag">配對題</span>' : ''}</div>`;
  const qtext = esc(q.q).replace(/([\u{1F300}-\u{1FAFF}☀-➿]+(?:\s*[＋+]\s*[\u{1F300}-\u{1FAFF}☀-➿]+)*)/gu, '<span class="emoji">$1</span>');
  let body = '';
  const disp = q.type === 'choice' || q.type === 'tf' ? (q.type === 'tf' ? [0, 1].sort((a, b) => q.opts[a] === '對' ? -1 : 1) : shuffle(q.opts.map((_, i) => i))) : [];
  if (q.type === 'choice' || q.type === 'tf') {
    body = `<div class="opts ${q.type === 'tf' ? 'tf' : ''}">${disp.map((oi, k) => `<button class="opt" data-o="${oi}">${q.type === 'tf' ? (q.opts[oi] === '對' ? '⭕ 對' : '❌ 錯') : `<span class="k">${K[k]}</span><span>${esc(q.opts[oi])}</span>`}</button>`).join('')}</div>`;
  } else if (q.type === 'order') {
    const sh = shuffle(q.items.map((_, i) => i));
    body = `<div class="muted center" style="margin-bottom:6px">依序點選，第一個點的是第 1 名</div><div class="order-items">${sh.map(i => `<button class="oitem" data-i="${i}"><span class="no"></span><span>${esc(q.items[i])}</span></button>`).join('')}</div><div class="center" style="margin-top:8px"><button class="btn" id="oReset">↺ 重排</button></div>`;
  } else if (q.type === 'match') {
    const L = shuffle([0, 1, 2, 3].slice(0, q.pairs.length)), R = shuffle([0, 1, 2, 3].slice(0, q.pairs.length));
    body = `<div class="muted center" style="margin-bottom:6px">先點左邊，再點右邊配成一對</div><div class="match-cols"><div class="order-items">${L.map(i => `<button class="mitem" data-l="${i}">${esc(q.pairs[i][0])}</button>`).join('')}</div><div class="order-items">${R.map(i => `<button class="mitem" data-r="${i}">${esc(q.pairs[i][1])}</button>`).join('')}</div></div>`;
  }
  el.innerHTML = `<div class="qcard">${meta}<div class="qtext">${qtext}</div></div>${body}`;
  const finish = (correct, picked) => { if (locked) return; locked = true; cb && cb.onPick && cb.onPick(correct, picked); };
  if (q.type === 'choice' || q.type === 'tf') {
    $$('.opt', el).forEach(b => b.onclick = () => { if (locked || (cb.canPick && !cb.canPick())) return; SFX.play('click'); finish(+b.dataset.o === 0, +b.dataset.o); });
  } else if (q.type === 'order') {
    $$('.oitem', el).forEach(b => b.onclick = () => {
      if (locked || b.classList.contains('sel')) return; SFX.play('pop'); order.push(+b.dataset.i); b.classList.add('sel'); $('.no', b).textContent = order.length;
      if (order.length === q.items.length) setTimeout(() => finish(order.every((v, i) => v === i), order), 250);
    });
    $('#oReset', el).onclick = () => { if (locked) return; order = []; $$('.oitem', el).forEach(b => { b.classList.remove('sel'); $('.no', b).textContent = ''; }); };
  } else if (q.type === 'match') {
    let pc = 0;
    $$('.mitem[data-l]', el).forEach(b => b.onclick = () => { if (locked || b.dataset.p) return; $$('.mitem.active', el).forEach(x => x.classList.remove('active')); mSel = b; b.classList.add('active'); SFX.play('pop'); });
    $$('.mitem[data-r]', el).forEach(b => b.onclick = () => {
      if (locked || !mSel || b.dataset.p) return; const c = 'p' + pc++; mSel.classList.remove('active'); mSel.classList.add(c); b.classList.add(c);
      mSel.dataset.p = b.dataset.r; b.dataset.p = mSel.dataset.l; mPairs[mSel.dataset.l] = +b.dataset.r; mSel = null; SFX.play('pop');
      if (Object.keys(mPairs).length === q.pairs.length) setTimeout(() => finish(Object.entries(mPairs).every(([l, r]) => +l === r), mPairs), 250);
    });
  }
  return {
    get locked() { return locked; },
    lock() { locked = true; $$('.opts', el).forEach(o => o.classList.add('locked')); },
    reveal(picked) {
      locked = true; $$('.opts', el).forEach(o => o.classList.add('locked'));
      if (q.type === 'choice' || q.type === 'tf') { $$('.opt', el).forEach(b => { if (+b.dataset.o === 0) b.classList.add('right'); else if (picked != null && +b.dataset.o === picked) b.classList.add('wrong'); }); }
      else if (q.type === 'order') { $$('.oitem', el).forEach(b => { $('.no', b).textContent = +b.dataset.i + 1; b.classList.add('sel'); b.style.order = b.dataset.i; }); $('.order-items', el).style.display = 'flex'; $('.order-items', el).style.flexDirection = 'column'; }
      else if (q.type === 'match') { $$('.mitem[data-l]', el).forEach(b => b.classList.add(mPairs[b.dataset.l] === +b.dataset.l ? 'right' : 'wrong')); }
    },
    markPick(o) { const b = $(`.opt[data-o="${o}"]`, el); if (b) b.classList.add('picked'); },
    fifty() { if (q.type !== 'choice') return false; const wr = shuffle($$('.opt', el).filter(b => +b.dataset.o !== 0)).slice(0, 2); wr.forEach(b => b.classList.add('gone')); return true; },
    audience() {
      if (!(q.type === 'choice' || q.type === 'tf')) return false;
      const bs = $$('.opt:not(.gone)', el); const right = [80, 62, 48][q.diff - 1] + rnd(15); let rest = 100 - right; const others = bs.filter(b => +b.dataset.o !== 0);
      const vals = others.map((_, i) => { if (i === others.length - 1) return rest; const v = rnd(rest + 1); rest -= v; return v; });
      bs.forEach(b => { const v = +b.dataset.o === 0 ? right : vals[others.indexOf(b)]; b.insertAdjacentHTML('beforeend', `<span class="pct">${v}%</span>`); }); return true;
    }
  };
}

/* ---------- 計時器 ---------- */
function Timer(sec, onTick, onEnd) {
  let left = sec, last = Date.now(), dead = false, paused = false;
  const iv = setInterval(() => {
    if (dead) return; const now = Date.now(); if (paused || !$('#modal').classList.contains('hidden')) { last = now; return; }
    left -= (now - last) / 1000; last = now; onTick && onTick(Math.max(0, left));
    if (left <= 0) { dead = true; clearInterval(iv); onEnd && onEnd(); }
  }, 100);
  return { get left() { return left; }, add(s) { left += s; }, stop() { dead = true; clearInterval(iv); }, pause(p) { paused = p; } };
}

/* ---------- 共用：記錄答題 ---------- */
function recordAnswer(q, ok) {
  const st = P.stats[q.cat] || (P.stats[q.cat] = { a: 0, c: 0 }); st.a++; if (ok) st.c++;
  P.totals.answered++; if (ok) P.totals.correct++;
  if (!q.gen && QB.find(q.id)) {
    P.seen[q.id] = 1;
    if (!ok && !P.wrong.includes(q.id)) { P.wrong.push(q.id); if (P.wrong.length > 300) P.wrong.shift(); }
  }
}

/* ---------- 個人挑戰：模式設定 ---------- */
const MODES = {
  level: { name: '闖關模式', icon: '🏯', desc: '每類十關，逐關解鎖拿星星' },
  speed: { name: '限時快答', icon: '⚡', desc: '六十秒內答越多越好' },
  survival: { name: '生存模式', icon: '💀', desc: '兩次機會，挑戰最長連勝' },
  endless: { name: '綜合無限', icon: '🌀', desc: '隨機出題，玩到天荒地老' },
  daily: { name: '每日挑戰', icon: '📅', desc: '每天十題，全服同題' },
  wrong: { name: '錯題本', icon: '📕', desc: '答錯的題目再練一次' }
};

const Quiz = {
  st: null, t: null, qv: null, q: null, used: null, busy: false,
  start(st) {
    stopGame();
    this.st = st; this.used = new Set(st.used || []); this.busy = false;
    Game.snapshot = () => { if (this.st && !this.st.done) { this.st.used = [...this.used].slice(-400); P.session = JSON.parse(JSON.stringify(this.st)); } };
    Game.stop = () => { if (this.t) this.t.stop(); this.t = null; };
    const m = MODES[st.mode];
    setTop(m.icon + ' ' + m.name + (st.cat && st.cat !== 'mix' ? '・' + CAT[st.cat].name : ''), () => this.quit(), () => showHowto(st.mode));
    view(`<div class="qhead" id="qhead"></div><div class="timebar" id="tbar"><i style="width:100%"></i></div>
      <div class="hostrow"><div class="owl" data-s="talk"></div><div class="bubble" id="bubble">${line('start')}</div></div>
      <div id="qarea"></div><div id="explain"></div><div class="lifelines" id="ll"></div><div id="nextArea" class="center" style="margin-top:12px"></div>`);
    if (st.mode === 'speed') { this.t = Timer(st.timeLeft ?? 60, l => { st.timeLeft = l; this.bar(l / 60); if (l < 10 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => this.end()); }
    if (!st.qi) Voice.say(line('start'));
    this.next(800);
  },
  bar(p) { const b = $('#tbar'); if (!b) return; b.firstChild.style.width = clamp(p * 100, 0, 100) + '%'; b.classList.toggle('low', p < .25); },
  head() {
    const st = this.st, h = $('#qhead'); if (!h) return;
    let parts = [`<span class="chip">🏆 ${st.score}</span>`, `<span class="chip">🔥 連勝 ${st.streak}</span>`];
    const cur = this.busy ? st.qi : st.qi + 1; if (st.n) parts.unshift(`<span class="chip">第 ${Math.min(Math.max(cur, 1), st.n)} / ${st.n} 題</span>`); else parts.unshift(`<span class="chip">第 ${Math.max(cur, 1)} 題</span>`);
    if (st.mode === 'survival') parts.push(`<span class="hearts ${st.lives === 1 ? 'danger' : ''}">${'❤️'.repeat(st.lives)}<span class="lost">${'🖤'.repeat(Math.max(0, st.maxLives - st.lives))}</span></span>`);
    if (st.mode === 'speed') parts.push(`<span class="chip">✅ ${st.correct}</span>`);
    h.innerHTML = parts.join('');
  },
  pickQ() {
    const st = this.st;
    if (st.mode === 'daily') { const id = st.ids[st.qi]; return QB.find(id) || QB.pick({ cat: 'mix' }); }
    if (st.mode === 'wrong') { const id = st.ids[st.qi]; return QB.find(id); }
    let diff = st.diff;
    if (st.mode === 'survival' && !diff) diff = st.qi < 5 ? 1 : st.qi < 15 ? 2 : 3;
    return QB.pick({ cat: st.cat || 'mix', diff, exclude: this.used, types: st.mode === 'speed' ? ['choice', 'tf'] : undefined });
  },
  next(delay = 0) {
    const st = this.st;
    if (st.n && st.qi >= st.n) return this.end();
    setTimeout(() => {
      if (this.st !== st || !$('#qarea')) return;
      const q = this.q = this.pickQ(); if (!q) return this.end();
      this.used.add(q.id); this.busy = false; st.event = null;
      $('#explain').innerHTML = ''; $('#nextArea').innerHTML = '';
      $('#qarea').className = '';
      // 隨機事件
      if (!['daily', 'speed', 'wrong'].includes(st.mode) && Math.random() < .14) {
        const ev = pickOne(['double', 'coins', 'doze', 'wobble']); st.event = ev;
        const txt = { double: '✨ 本題分數加倍！', coins: '💰 財神降臨！送你 10 金幣', doze: '😴 考官打瞌睡，多給你 8 秒', wobble: '🌀 題目喝醉了，搖搖晃晃！' }[ev];
        setTimeout(() => banner(txt, ev === 'coins' ? 'coin' : 'boing'), 100);
        if (ev === 'coins') addCoins(10);
        if (ev === 'wobble') $('#qarea').className = 'wobble';
      }
      this.qv = QView($('#qarea'), q, { onPick: (ok, pk) => this.answer(ok, pk) });
      this.head(); this.lifelines();
      Owl.set('read', 1500);
      $('#bubble').textContent = pickOne(['請聽題！', '下一題來囉～', '這題有點意思喔！', '仔細看清楚再作答！', '看我出題的功力！']);
      if (S.readQ) Voice.say(q.q + (q.type === 'choice' ? '。' + q.opts.length + '個選項' : ''));
      // 每題計時
      if (st.mode !== 'speed') {
        if (this.t) this.t.stop(); this.t = null;
        const sec = S.elder ? 0 : (st.mode === 'endless' ? 30 : q.type === 'order' || q.type === 'match' ? 30 : 20) + (st.event === 'doze' ? 8 : 0);
        if (sec) { let w = false; this.t = Timer(sec, l => { this.bar(l / sec); if (l < 5 && !w) { w = true; Owl.set('worry'); } if (l < 5 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => this.answer(false, null, true)); this.qsec = sec; }
        else { $('#tbar').firstChild.style.width = '100%'; }
      }
      this.qStart = Date.now();
    }, delay);
  },
  lifelines() {
    const it = P.items, st = this.st, q = this.q;
    const L = [['fifty', '✂️', '去掉兩個', q.type === 'choice'], ['time', '⏳', '加十秒', st.mode !== 'speed' && !!this.t], ['audience', '👥', '看大家選', q.type === 'choice' || q.type === 'tf'], ['skip', '⏭️', '跳過', true]];
    if (st.mode === 'daily') { $('#ll').innerHTML = '<span class="muted">每日挑戰不能使用道具，公平競爭！</span>'; return; }
    $('#ll').innerHTML = L.map(([k, ic, nm, ok]) => `<button class="ll" data-k="${k}" ${!ok || !it[k] ? 'disabled' : ''}><b>${ic}</b>${nm}<span class="muted">×${it[k] || 0}</span></button>`).join('');
    $$('#ll .ll').forEach(b => b.onclick = () => {
      if (this.busy || this.qv.locked) return; const k = b.dataset.k; if (!P.items[k]) return;
      let ok = true;
      if (k === 'fifty') ok = this.qv.fifty();
      if (k === 'audience') ok = this.qv.audience();
      if (k === 'time') { if (this.t) { this.t.add(10); this.qsec += 10; } }
      if (!ok) return;
      P.items[k]--; SFX.play('whoosh'); b.disabled = true; b.querySelector('.muted').textContent = '×' + P.items[k];
      if (k === 'skip') { this.qv.lock(); if (this.t && st.mode !== 'speed') this.t.stop(); $('#bubble').textContent = '好吧，這題我們假裝沒看到……'; st.qi++; save(); this.next(400); }
      save();
    });
  },
  answer(ok, picked, timeout) {
    if (this.busy) return; this.busy = true;
    const st = this.st, q = this.q;
    if (this.t && st.mode !== 'speed') this.t.stop();
    this.qv.reveal(picked);
    recordAnswer(q, ok);
    let gain = 0;
    if (ok) {
      st.correct++; st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
      P.totals.maxStreak = Math.max(P.totals.maxStreak, st.streak);
      const tl = this.t && st.mode !== 'speed' ? Math.max(0, this.t.left) : 0;
      gain = Math.round(100 * DMUL[q.diff] + tl * 5 + (st.streak >= 3 ? Math.min(st.streak, 10) * 20 : 0));
      if (st.event === 'double') gain *= 2;
      st.score += gain; addXP(10 * DMUL[q.diff]); addCoins(Math.round(2 * DMUL[q.diff]));
      SFX.play('correct');
      const sk = { 3: 'streak3', 5: 'streak5', 10: 'streak10', 20: 'streak20' }[st.streak];
      const msg = sk ? line(sk) : line('correct');
      $('#bubble').innerHTML = `${msg} <b style="color:var(--accent)">＋${gain}</b>`;
      Owl.set(st.streak >= 5 ? 'cool' : 'happy', 1800);
      if (sk) { banner('🔥 ' + LINES[sk][0], 'fanfare'); confetti(40); }
      Voice.say(msg);
    } else {
      st.streak = 0; SFX.play(timeout ? 'gong' : 'wrong'); shakeScreen();
      const msg = timeout ? line('timeout') : line('wrong');
      $('#bubble').textContent = msg; Owl.set('sad', 2000);
      if (st.mode === 'survival') {
        st.lives--;
        if (st.lives === 1) { SFX.play('heart'); setTimeout(() => { banner('💔 小心！只剩最後一次機會！', 'warn'); Voice.say('小心！只剩最後一次機會囉！'); }, 500); }
        else Voice.say(msg);
      } else Voice.say(msg);
      if (st.mode === 'speed') { st.timeLeft = Math.max(0, (this.t ? this.t.left : 0)); }
    }
    if (st.mode === 'wrong' && ok) P.wrong = P.wrong.filter(x => x !== q.id);
    st.qi++; this.head(); Game.snapshot(); save(); checkAch();
    if (q.exp) $('#explain').innerHTML = `<div class="explain">💡 <b>${ok ? '答對了！' : '正確答案：' + esc(q.type === 'choice' || q.type === 'tf' ? q.opts[0] : '')}</b> ${esc(q.exp)}</div>`;
    if (st.mode === 'speed') return this.next(ok ? 450 : 900);
    if (st.mode === 'survival' && st.lives <= 0) return this.reviveOrEnd();
    $('#nextArea').innerHTML = `<button class="btn primary" id="btnNext">${st.n && st.qi >= st.n ? '看成績 🏁' : '下一題 ▶'}</button>${st.mode === 'endless' ? ' <button class="btn" id="btnStop">休息一下</button>' : ''}`;
    $('#btnNext').onclick = () => { SFX.play('click'); this.next(); };
    if ($('#btnStop')) $('#btnStop').onclick = () => this.end();
  },
  async reviveOrEnd() {
    if (P.items.life > 0) {
      const r = await ask('💀 兩次機會都用完了！', `要使用「🧪 復活藥」再多一條命嗎？<br>（剩 ${P.items.life} 瓶）`, [{ t: '喝下復活藥！', v: 1 }, { t: '不用了，結算', v: 0 }]);
      if (r) { P.items.life--; this.st.lives = 1; SFX.play('levelup'); banner('🧪 滿血復活！', ''); this.head(); save(); return this.next(600); }
    }
    this.end();
  },
  quit() {
    const st = this.st;
    if (st && !st.done && st.qi > 0 && st.mode !== 'endless') {
      ask('要離開嗎？', '進度已經自動儲存，下次登入可以接著玩。', [{ t: '先離開，下次繼續', v: 1 }, { t: '繼續作答', v: 0, cls: 'gold' }]).then(v => { if (v) { Game.snapshot(); save(); stopGame(); Home(); } });
    } else if (st && st.mode === 'endless' && st.qi > 0) { this.end(); }
    else { P.session = null; save(); stopGame(); Home(); }
  },
  end() {
    const st = this.st; if (!st || st.done) return; st.done = true;
    if (this.t) this.t.stop(); this.t = null; P.session = null; Game.snapshot = null;
    P.totals.games++;
    let stars = 0, extra = '', rec = false;
    const acc = st.qi ? st.correct / st.qi : 0;
    if (st.mode === 'level') {
      stars = st.correct >= 10 ? 3 : st.correct >= 8 ? 2 : st.correct >= 6 ? 1 : 0;
      const key = st.cat + '-' + st.diff; const arr = P.levels[key] || (P.levels[key] = []);
      arr[st.level] = Math.max(arr[st.level] || 0, stars);
      extra = stars ? `第 ${st.level + 1} 關過關！${st.level < 9 ? '下一關已解鎖' : '本難度全部破關！'}` : '答對 6 題才能過關，再接再厲！';
      addCoins(stars * 10);
    }
    if (st.mode === 'speed') { if (st.correct > P.best.speed) { P.best.speed = st.correct; rec = true; } extra = `六十秒答對 ${st.correct} 題`; addCoins(st.correct * 2); }
    if (st.mode === 'survival') { if (st.maxStreak > P.best.survival) { P.best.survival = st.maxStreak; rec = true; } extra = `共撐過 ${st.qi} 題，最長連勝 ${st.maxStreak}`; addCoins(st.correct * 2); }
    if (st.mode === 'endless') { P.best.endless = Math.max(P.best.endless, st.correct); extra = `這次答了 ${st.qi} 題，答對 ${st.correct} 題`; }
    if (st.mode === 'daily') {
      const d = today(); const first = !P.daily[d]; if (first) { P.daily[d] = st.score; addCoins(30); } else P.daily[d] = Math.max(P.daily[d], st.score);
      extra = first ? '今日挑戰完成！獲得 30 金幣 🎁' : '今天已經挑戰過，這次成績不重複發獎勵';
    }
    if (st.mode === 'wrong') extra = `答對的 ${st.correct} 題已從錯題本移除`;
    save(); checkAch();
    const good = acc >= .6 || stars >= 1 || rec;
    SFX.play(good ? 'win' : 'lose'); if (good) confetti(80);
    const cmt = acc >= .9 ? '太神啦！你根本是行走的百科全書！' : acc >= .7 ? '表現很棒！離全能智慧王不遠了！' : acc >= .5 ? '還不錯，繼續加油！' : '沒關係，多玩幾次就會變強的！';
    Voice.say(cmt);
    view(`<div class="card center"><div class="owl home-owl" data-s="${good ? 'dance' : 'sad'}"></div>
      <div class="h2">${MODES[st.mode].icon} ${MODES[st.mode].name} 結算</div>
      ${st.mode === 'level' ? `<div class="stars">${[1, 2, 3].map(i => `<span class="${stars >= i ? '' : 'off'}">⭐</span>`).join('')}</div>` : ''}
      <div class="result-score">${st.score}</div><div class="muted">總分</div>
      ${rec ? '<div class="seal" style="margin:8px">🎉 新紀錄！</div>' : ''}
      <p>答對 <b>${st.correct}</b> / ${st.qi} 題（正確率 ${Math.round(acc * 100)}%）・最長連勝 <b>${st.maxStreak}</b></p>
      <p>${extra}</p><p class="muted">${cmt}</p>
      <div class="row"><button class="btn primary" id="again">再玩一次</button><button class="btn" id="home">回首頁</button></div></div>`);
    setTop('結算', Home);
    $('#again').onclick = () => { const s = st; if (s.mode === 'level') levelSelect(s.cat, s.diff); else if (s.mode === 'daily') startDaily(); else if (s.mode === 'wrong') startWrong(); else setupMode(s.mode); };
    $('#home').onclick = Home;
  }
};
function newSt(o) { return Object.assign({ qi: 0, score: 0, correct: 0, streak: 0, maxStreak: 0, used: [], cat: 'mix', diff: 0, n: 0 }, o); }

/* ---------- 開局設定畫面 ---------- */
function setupMode(mode) {
  stopGame();
  const m = MODES[mode];
  if (mode === 'level') return levelCats();
  if (mode === 'daily') return startDaily();
  if (mode === 'wrong') return startWrong();
  let cat = 'mix', diff = 0;
  setTop(m.icon + ' ' + m.name, Home, () => showHowto(mode));
  view(`<div class="card"><div class="h2">${m.icon} ${m.name}</div><p class="muted">${m.desc}</p>
    <div class="h3">選擇難度</div><div class="row" id="dsel">${[0, 1, 2, 3].map(d => `<button class="btn ${d === 0 ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
    <div class="h3">選擇類別</div><div class="grid3" id="csel"><button class="tile" data-c="mix" style="outline:3px solid var(--accent)"><span class="ic">🌈</span><span class="nm">綜合</span></button>${CATS.map(c => `<button class="tile" data-c="${c.id}"><span class="ic">${c.icon}</span><span class="nm">${c.name}</span></button>`).join('')}</div>
    <button class="btn primary block" id="go" style="margin-top:16px">開始挑戰！</button></div>`);
  $$('#dsel .btn').forEach(b => b.onclick = () => { diff = +b.dataset.d; $$('#dsel .btn').forEach(x => x.classList.toggle('primary', x === b)); SFX.play('click'); });
  $$('#csel .tile').forEach(b => b.onclick = () => { cat = b.dataset.c; $$('#csel .tile').forEach(x => x.style.outline = x === b ? '3px solid var(--accent)' : ''); SFX.play('click'); });
  $('#go').onclick = () => {
    SFX.play('gong');
    if (mode === 'speed') Quiz.start(newSt({ mode, cat, diff, timeLeft: 60 }));
    if (mode === 'survival') Quiz.start(newSt({ mode, cat, diff, lives: 2, maxLives: 2 }));
    if (mode === 'endless') Quiz.start(newSt({ mode, cat, diff }));
  };
}
function levelCats() {
  setTop('🏯 闖關模式', Home, () => showHowto('level'));
  const starsOf = c => [1, 2, 3].reduce((s, d) => s + (P.levels[c + '-' + d] || []).reduce((a, b) => a + (b || 0), 0), 0);
  view(`<div class="muted center" style="margin-bottom:10px">每個類別分普通、中等、高難度，各十關</div><div class="grid3">${CATS.map(c => `<button class="tile" data-c="${c.id}"><span class="ic">${c.icon}</span><span class="nm">${c.name}</span><span class="ds">⭐ ${starsOf(c.id)} / 90</span></button>`).join('')}</div>`);
  $$('.tile').forEach(b => b.onclick = () => { SFX.play('click'); levelSelect(b.dataset.c, 1); });
}
function levelSelect(cat, diff = 1) {
  stopGame();
  const c = CAT[cat];
  setTop(c.icon + ' ' + c.name + '・闖關', levelCats, () => showHowto('level'));
  const arr = P.levels[cat + '-' + diff] || [];
  view(`<div class="row" id="dsel" style="margin-bottom:12px">${[1, 2, 3].map(d => `<button class="btn ${d === diff ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
    <div class="grid3">${Array.from({ length: 10 }, (_, i) => { const open = i === 0 || (arr[i - 1] || 0) > 0; const s = arr[i] || 0;
      return `<button class="tile" data-l="${i}" ${open ? '' : 'disabled style="opacity:.45"'}><span class="ic">${open ? ['🏮', '🎐', '🪭', '🏯', '⛩️', '🎎', '🐉', '🌕', '🎇', '👑'][i] : '🔒'}</span><span class="nm">第 ${i + 1} 關</span><span class="ds">${'⭐'.repeat(s)}${'☆'.repeat(3 - s)}</span></button>`; }).join('')}</div>`);
  $$('#dsel .btn').forEach(b => b.onclick = () => levelSelect(cat, +b.dataset.d));
  $$('.tile[data-l]').forEach(b => b.onclick = () => { if (b.disabled) return; SFX.play('gong'); Quiz.start(newSt({ mode: 'level', cat, diff, level: +b.dataset.l, n: 10 })); });
}
function startDaily() {
  const d = today(), r = seeded('daily' + d);
  const pool = seededShuffle(QB.list.filter(q => q.type === 'choice' || q.type === 'tf').map(q => q.id), r).slice(0, 10);
  Quiz.start(newSt({ mode: 'daily', n: 10, ids: pool, date: d }));
}
function startWrong() {
  if (!P.wrong.length) { toast('錯題本是空的，太厲害了！'); return Home(); }
  const ids = shuffle(P.wrong.filter(id => QB.find(id))).slice(0, 10);
  Quiz.start(newSt({ mode: 'wrong', n: ids.length, ids }));
}
