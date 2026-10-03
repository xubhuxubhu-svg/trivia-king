/* ===== 連線功能：雲端帳號、雲端存檔、全服排行榜、真人連線對戰 =====
   直接打開檔案或在沒有伺服器的地方遊玩時，會自動變回單機版。 */
const NET = {
  on: false, db: false, token: null, timer: null, ws: null,
  async detect() {
    if (location.protocol === 'file:') return false;
    try {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const to = setTimeout(() => ctl && ctl.abort(), 6000);
      const r = await fetch('api/ping', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }); clearTimeout(to);
      const j = await r.json(); this.on = !!(j && j.app === 'trivia-king'); this.db = !!(j && j.db);
    } catch (e) { this.on = false; }
    this.token = this.on ? LS.get('tk_token', null) : null;
    return this.on;
  },
  async api(path, body) {
    const opt = { method: body ? 'POST' : 'GET', headers: {}, cache: 'no-store' };
    if (this.token) opt.headers.Authorization = 'Bearer ' + this.token;
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let r, j;
    try { r = await fetch('api/' + path, opt); j = await r.json(); } catch (e) { throw new Error('連不上伺服器，請檢查網路'); }
    if (!r.ok || !j.ok) { const err = new Error(j && j.error || '伺服器錯誤'); err.status = r.status; throw err; }
    return j;
  },
  useData(name, data) {
    const all = {}; all[name] = { pw: '', data: data || {} };
    P = Object.assign(newData(), data || {}); PNAME = name;
    P.items = Object.assign(newData().items, P.items || {});
    P.best = Object.assign(newData().best, P.best || {});
    P.totals = Object.assign(newData().totals, P.totals || {});
    P.brain = Object.assign(newData().brain, P.brain || {});
  },
  async login(n, p) {
    const j = await this.api('login', { name: n, pw: p });
    this.token = j.token; LS.set('tk_token', j.token); this.useData(j.name, j.data); return j;
  },
  async register(n, p) {
    // 這台裝置上如果有同名、同密碼的單機玩家，就把單機進度一起帶上雲端
    let data = newData();
    const loc = Profile.all()[n]; if (loc && loc.pw === hashPw(p)) data = loc.data;
    const j = await this.api('register', { name: n, pw: p, data });
    this.token = j.token; LS.set('tk_token', j.token); this.useData(j.name, j.data); return !!(loc && loc.pw === hashPw(p));
  },
  async resume() {
    if (!this.token) return false;
    try { const j = await this.api('load'); this.useData(j.name, j.data); return true; }
    catch (e) { if (e.status === 401) { this.token = null; LS.del('tk_token'); } else toast(e.message); return false; }
  },
  /* 雲端存檔：變動後兩秒內自動上傳；關閉頁面時用背景傳送 */
  queueSave() {
    if (!this.on || !this.token || !P) return;
    clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 2000);
  },
  async flush() {
    clearTimeout(this.timer); if (!this.on || !this.token || !P) return;
    try { await this.api('save', { data: P }); } catch (e) { if (e.status === 401) { toast('登入已過期，請重新登入'); } }
  },
  beacon() {
    if (!this.on || !this.token || !P || !navigator.sendBeacon) return;
    try { navigator.sendBeacon('api/save', new Blob([JSON.stringify({ token: this.token, data: P })], { type: 'text/plain' })); } catch (e) { }
  },
  async logout() {
    await this.flush();
    try { await this.api('logout', { token: this.token }); } catch (e) { }
    this.token = null; LS.del('tk_token'); P = null; PNAME = '';
  },
  /* 全服排行榜 */
  async ranking(tab = 'xp') {
    setTop('🏆 全服排行榜', Home);
    view(`<div class="card center"><div class="owl home-owl" data-s="read"></div><p>排行榜讀取中……</p></div>`);
    let rows = [];
    try { rows = (await this.api('rank?day=' + today())).list; } catch (e) { view(`<div class="card center"><p>${esc(e.message)}</p><button class="btn primary" onclick="Home()">回首頁</button></div>`); return; }
    const all = rows.map(r => ({ n: r.name, d: Object.assign(newData(), { xp: r.xp || 0, title: r.title || '', frame: r.frame || 0, best: Object.assign(newData().best, r.best || {}), daily: r.daily != null ? { [today()]: r.daily } : {}, brain: Object.assign(newData().brain, { ages: r.ages || [] }) }) }));
    const T = { xp: ['總經驗', x => x.d.xp], speed: ['限時快答', x => x.d.best.speed], survival: ['生存連勝', x => x.d.best.survival], daily: ['今日挑戰', x => x.d.daily[today()] || 0], brain: ['腦年齡', x => { const a = x.d.brain.ages; return a.length ? Math.max(...a.map(e => e.age - e.ba)) : -999; }] };
    const list = all.map(x => ({ ...x, v: T[tab][1](x) })).filter(x => x.v > -999 && (tab === 'xp' || tab === 'brain' || x.v > 0)).sort((a, b) => b.v - a.v).slice(0, 50);
    const myRank = list.findIndex(x => x.n === PNAME);
    view(`<div class="row" style="margin-bottom:10px">${Object.entries(T).map(([k, v]) => `<button class="btn ${k === tab ? 'primary' : ''}" data-k="${k}" style="padding:8px 4px;font-size:.85em">${v[0]}</button>`).join('')}</div>
    <div class="card">${list.length ? list.map((x, i) => `<div class="lb-row" ${x.n === PNAME ? 'style="background:rgba(255,200,60,.25);border-radius:10px"' : ''}><span class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span style="flex:1;min-width:0">${nameplate(x.n, x.d)}</span><b>${tab === 'brain' ? (x.v >= 0 ? '年輕 ' + x.v + ' 歲' : '老 ' + (-x.v) + ' 歲') : x.v}</b></div>`).join('') : '<p class="muted center">還沒有紀錄</p>'}</div>
    <p class="muted center">🌐 全服永久排行榜（前 50 名）${myRank >= 0 ? `・你是第 ${myRank + 1} 名` : ''}</p>`);
    $$('[data-k]').forEach(b => b.onclick = () => { SFX.play('click'); this.ranking(b.dataset.k); });
  }
};

/* ===== 真人連線對戰 ===== */
const OL = {
  ws: null, me: null, room: null, q: null, qv: null, tm: null, inGame: false, myPick: null, answered: false, out: new Set(), answerer: null, opt: Object.assign({ mode: 'sync', cat: 'mix', diff: 0, count: 10 }, LS.get('tk_ol_opt', {})),
  connect() {
    return new Promise((res, rej) => {
      if (this.ws && this.ws.readyState === 1) return res();
      const ws = this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      let opened = false;
      ws.onopen = () => { opened = true; res(); };
      ws.onerror = () => { if (!opened) rej(new Error('連不上對戰伺服器')); };
      ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; if (opened && (this.room || this.inGame)) { toast('⚠️ 與伺服器的連線中斷了'); this.reset(); Home(); } };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } this.onMsg(m); };
    });
  },
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },
  reset() { this.stopT(); this.room = null; this.inGame = false; this.q = null; this.showingEnd = false; this.answerer = null; this.out = new Set(); },
  close() { OLC.leaveAll(); this.reset(); if (this.ws) { const w = this.ws; this.ws = null; try { w.send(JSON.stringify({ t: 'leave' })); } catch (e) { } try { w.close(); } catch (e) { } } },
  stopT() { if (this.tm) this.tm.stop(); this.tm = null; },
  isHost() { return this.room && this.room.host === this.me; },
  pl(id) { return this.room && this.room.players.find(p => p.id === id); },

  /* 大廳：建立或加入房間 */
  lobby() {
    stopGame(); this.close();
    Game.stop = () => this.close();
    setTop('🌐 真人連線對戰', Home, () => showHowto('online'));
    const o = this.opt;
    const draw = () => {
      const last = LS.get('tk_ol_last', null); const back = last && Date.now() - last.t < 30 * 60 * 1000 ? last : null;
      view(`<div class="hostrow"><div class="owl" data-s="cool"></div><div class="bubble">開一個房間，把房號告訴朋友，就能一起比賽！手機、電腦都可以加入。</div></div>
      ${back ? `<button class="btn gold block" id="rejoin">📂 回到剛剛的比賽（房號 ${back.code}）</button>` : ''}
      <div class="card"><div class="h2">🔑 加入朋友的房間</div>
        <input class="field" id="code" inputmode="numeric" maxlength="4" placeholder="輸入四位數房號" style="text-align:center;font-size:1.4em;letter-spacing:.3em">
        <button class="btn primary block" id="join">加入房間</button></div>
      <div class="card"><div class="h2">🏠 自己開房間</div>
        <div class="h3">玩法</div><div class="row" id="msel">${Object.entries(BMODES).map(([k, m]) => `<button class="btn ${k === o.mode ? 'primary' : ''}" data-m="${k}" style="padding:8px 4px;font-size:.9em">${m.icon}<br>${m.name}</button>`).join('')}</div>
        <p class="muted">${BMODES[o.mode].desc}${o.mode === 'duel' ? '（限兩人）' : '（二到五人）'}</p>
        <div class="h3">難度</div><div class="row" id="dsel">${[0, 1, 2, 3].map(d => `<button class="btn ${d === o.diff ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
        <div class="h3">題數</div><div class="row" id="csel">${[10, 20, 30, 50].map(k => `<button class="btn ${k === o.count ? 'primary' : ''}" data-c="${k}">${k} 題</button>`).join('')}</div>
        <div class="h3">類別</div><select class="field" id="catSel"><option value="mix">🌈 綜合（所有類別）</option>${CATS.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select>
        <button class="btn gold block" id="create">建立房間</button></div>`);
      $$('#msel .btn').forEach(b => b.onclick = () => { o.mode = b.dataset.m; SFX.play('click'); draw(); });
      $$('#dsel .btn').forEach(b => b.onclick = () => { o.diff = +b.dataset.d; SFX.play('click'); draw(); });
      $$('#csel .btn').forEach(b => b.onclick = () => { o.count = +b.dataset.c; SFX.play('click'); draw(); });
      $('#catSel').value = o.cat; $('#catSel').onchange = e => o.cat = e.target.value;
      if ($('#rejoin')) $('#rejoin').onclick = async () => { SFX.play('click'); try { await this.connect(); this.send({ t: 'join', code: back.code, name: PNAME }); } catch (e) { toast(e.message); } };
      $('#create').onclick = async () => { SFX.play('click'); LS.set('tk_ol_opt', o); try { await this.connect(); this.send({ t: 'create', name: PNAME, ...o }); } catch (e) { toast(e.message); } };
      $('#join').onclick = async () => {
        const c = $('#code').value.replace(/\D/g, ''); if (c.length !== 4) return toast('請輸入四位數房號');
        SFX.play('click'); try { await this.connect(); this.send({ t: 'join', code: c, name: PNAME }); } catch (e) { toast(e.message); }
      };
      $('#code').onkeydown = e => { if (e.key === 'Enter') $('#join').click(); };
    };
    draw();
  },
  /* 房間（等待開始） */
  roomView() {
    const r = this.room; if (!r) return;
    const host = this.isHost();
    setTop('🌐 房間 ' + r.code, () => this.leaveAsk(), () => showHowto('online'));
    const m = BMODES[r.mode]; const max = r.mode === 'duel' ? 2 : 5;
    view(`<div class="card center"><div class="muted">房間號碼</div><div style="font-size:2.6em;font-weight:900;letter-spacing:.25em">${r.code}</div>
      <p class="muted">請朋友打開遊戲 → 首頁「🌐 真人連線」→ 輸入這個房號</p></div>
      <div class="card"><div class="h3">👥 玩家（${r.players.length} / ${max}）</div>
      ${r.players.map(p => `<div class="lb-row"><span style="font-size:1.6em">${p.av}</span><span style="flex:1"><b>${esc(p.n)}</b>${p.id === this.me ? '（你）' : ''}${p.voice ? ' 🎙️' : ''}</span>${p.id === r.host ? '<span class="tag">👑 房主</span>' : ''}</div>`).join('')}</div>
      <div class="card"><div class="h3">⚙️ 比賽設定${host ? '' : '（由房主決定）'}</div>
      ${host ? `<div class="row" id="msel">${Object.entries(BMODES).map(([k, x]) => `<button class="btn ${k === r.mode ? 'primary' : ''}" data-m="${k}" style="padding:8px 4px;font-size:.9em">${x.icon}<br>${x.name}</button>`).join('')}</div>
        <div class="row" id="dsel" style="margin-top:6px">${[0, 1, 2, 3].map(d => `<button class="btn ${d === r.diff ? 'primary' : ''}" data-d="${d}">${DIFF[d]}</button>`).join('')}</div>
        <div class="row" id="csel" style="margin-top:6px">${[10, 20, 30, 50].map(k => `<button class="btn ${k === r.count ? 'primary' : ''}" data-c="${k}">${k} 題</button>`).join('')}</div>
        <select class="field" id="catSel"><option value="mix">🌈 綜合（所有類別）</option>${CATS.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select>`
        : `<p>${m.icon} ${m.name}・${DIFF[r.diff]}・${r.count} 題・${r.cat === 'mix' ? '🌈 綜合' : (CAT[r.cat] ? CAT[r.cat].icon + ' ' + CAT[r.cat].name : r.cat)}</p>`}</div>
      ${host ? `<button class="btn primary block" id="start" ${r.players.length < 2 ? 'disabled' : ''}>${r.players.length < 2 ? '等待朋友加入……' : '🔔 開始比賽！'}</button>` : `<p class="center muted">等待房主開始比賽……</p>`}
      <button class="btn block" id="leave">離開房間</button>`);
    if (host) {
      $$('#msel .btn').forEach(b => b.onclick = () => { SFX.play('click'); this.send({ t: 'set', mode: b.dataset.m }); });
      $$('#dsel .btn').forEach(b => b.onclick = () => { SFX.play('click'); this.send({ t: 'set', diff: +b.dataset.d }); });
      $$('#csel .btn').forEach(b => b.onclick = () => { SFX.play('click'); this.send({ t: 'set', count: +b.dataset.c }); });
      $('#catSel').value = r.cat; $('#catSel').onchange = e => this.send({ t: 'set', cat: e.target.value });
      $('#start').onclick = () => {
        SFX.play('gong'); const used = new Set(); const qs = [];
        for (let i = 0; i < r.count; i++) { const q = QB.pick({ cat: r.cat, diff: r.diff, exclude: used, types: ['choice', 'tf'], special: false }); if (q.gen) continue; used.add(q.id); qs.push({ id: q.id, diff: q.diff, len: q.q.length }); }
        this.send({ t: 'start', qs });
      };
    }
    $('#leave').onclick = () => this.leaveAsk();
    OLC.bar();
  },
  leaveAsk() {
    ask('要離開房間嗎？', this.inGame ? '比賽進行中離開，就沒辦法拿到獎勵喔！' : '', [{ t: '離開', v: 1 }, { t: '留下來', v: 0, cls: 'gold' }]).then(v => { if (v) { this.close(); this.lobby(); } });
  },
  /* 比賽畫面 */
  gameView() {
    const r = this.room; const m = BMODES[r.mode];
    setTop(m.icon + ' ' + m.name + '（連線）', () => this.leaveAsk(), () => showHowto(r.mode));
    view(`<div class="players" id="pls"></div><div class="qhead"><span class="chip" id="qn"></span><span class="chip" id="phase">準備</span></div>
      <div class="timebar" id="tbar"><i style="width:100%"></i></div>
      <div class="hostrow"><div class="owl" data-s="talk"></div><div class="bubble" id="bubble">連線比賽開始！各位選手請就位！</div></div>
      <div id="qarea"></div><div id="buzzArea"></div><div id="explain"></div>
      <div class="row" id="emo" style="margin-top:10px">${['👍', '😂', '😱', '🔥', '🙏'].map(e => `<button class="btn" data-e="${e}" style="padding:6px;font-size:1.3em">${e}</button>`).join('')}</div>`);
    $$('#emo [data-e]').forEach(b => b.onclick = () => this.send({ t: 'chat', msg: b.dataset.e }));
    Voice.say(m.name + '，連線比賽開始！');
    document.onkeydown = e => { if (e.code === 'Space' && this.room && this.room.mode === 'buzz') { e.preventDefault(); this.buzz(); } };
    Game.stop = () => { document.onkeydown = null; this.close(); };
    OLC.bar();
  },
  pls(marks = {}) {
    const r = this.room; const el = $('#pls'); if (!r || !el) return;
    el.innerHTML = r.players.map(p => `<div class="pl ${marks.buzz === p.id ? 'buzz' : ''} ${this.out.has(p.id) || p.gone || (r.mode === 'duel' && p.hp <= 0) ? 'out' : ''}">
      ${marks[p.id] ? `<span class="mark">${marks[p.id]}</span>` : ''}<span class="av">${p.av}</span><div class="nm">${esc(p.n)}${p.id === this.me ? '（你）' : ''}${p.voice ? '🎙️' : ''}</div>
      ${r.mode === 'duel' ? `<div class="hpbar"><i style="width:${Math.max(0, p.hp)}%"></i></div><div class="sc">❤️ ${Math.max(0, p.hp)}</div>` : `<div class="sc">${p.sc} 分</div>`}
      ${r.mode === 'buzz' ? `<div class="muted">搶到 ${p.buzz} 題</div>` : `<div class="muted">答對 ${p.ok}</div>`}</div>`).join('');
  },
  bar(sec) {
    this.stopT(); const b = $('#tbar'); if (!b) return;
    this.tm = Timer(sec, l => { const x = $('#tbar'); if (x) { x.firstChild.style.width = clamp(l / sec * 100, 0, 100) + '%'; x.classList.toggle('low', l / sec < .25); } if (l < 4 && Math.ceil(l) !== this._lt) { this._lt = Math.ceil(l); SFX.play('tick'); } }, () => { });
  },
  record(ok) {
    if (this.recorded) return; this.recorded = true;
    recordAnswer(this.q, ok);
    if (ok) { addXP(12 * DMUL[this.q.diff]); addCoins(3); }
    save();
  },
  buzz() {
    const ph = $('#phase'); if (!ph || ph.textContent !== '🔔 開放搶答' || this.out.has(this.me) || this.answerer) return;
    this.send({ t: 'buzz' }); const b = $('#buzzer'); if (b) b.disabled = true;
  },
  onQ(m) {
    const r = this.room; r.players = m.players;
    this.q = QB.find(m.id); this.myPick = null; this.answered = false; this.recorded = false; this.out = new Set(); this.answerer = null;
    if (!$('#qarea')) this.gameView();
    $('#qn').textContent = `第 ${m.qi + 1} / ${m.n} 題`; $('#explain').innerHTML = ''; $('#buzzArea').innerHTML = '';
    this.pls();
    if (!this.q) { $('#qarea').innerHTML = '<div class="card center">⚠️ 你的題庫版本和房主不同，這題無法顯示。請重新整理網頁更新遊戲。</div>'; if (r.mode !== 'buzz') this.send({ t: 'ans', ok: false, pk: null }); return; }
    const q = this.q;
    if (r.mode === 'buzz') {
      const canBuzz = () => { const ph = $('#phase'); return ph && ph.textContent === '🔔 開放搶答' && !this.answerer && !this.out.has(this.me); };
      this.qv = QView($('#qarea'), q, {
        onPick: (ok, pk) => { const mine = this.answerer === this.me; this.answered = true; this.myPick = pk; this.qv.markPick(pk); this.qv.lock(); this.stopT(); this.send({ t: mine ? 'ans' : 'buzzans', ok, pk }); this.record(ok); $('#bubble').textContent = '已作答，等待結果……'; },
        canPick: () => { if (this.answered) return false; if (this.answerer === this.me || canBuzz()) return true; toast(this.out.has(this.me) ? '你這題已經答錯了' : this.answerer ? '別人搶到了，等一下喔' : '題目讀完才能搶答'); return false; }
      });
      $('#phase').textContent = '📖 聽題中';
      $('#buzzArea').innerHTML = `<button class="buzzer" id="buzzer" disabled>🔔 搶答！</button><div class="muted center">電腦可以按空白鍵搶答</div>`;
      $('#buzzer').onclick = () => this.buzz();
      $('#bubble').textContent = '請聽題……讀完題目才可以搶答喔！'; Owl.set('read');
    } else {
      this.qv = QView($('#qarea'), q, { onPick: (ok, pk) => { this.answered = true; this.myPick = pk; this.qv.markPick(pk); this.qv.lock(); SFX.play('click'); this.send({ t: 'ans', ok, pk }); this.lastOk = ok; $('#bubble').textContent = '已作答！等待其他玩家……'; }, canPick: () => !this.answered && !(r.mode === 'duel' && (this.pl(this.me) || {}).hp <= 0) });
      $('#phase').textContent = '✏️ 大家作答中'; $('#bubble').textContent = '大家一起作答，越快越好！'; Owl.set('read', 1500);
      this.bar(18);
    }
    if (S.readQ) Voice.say(q.q);
  },
  onMsg(m) {
    const r = this.room;
    switch (m.t) {
      case 'joined': this.me = m.you; break;
      case 'room': this.room = m.room; if (m.room.phase === 'lobby' && !this.showingEnd) this.roomView(); break;
      case 'err': SFX.play('wrong'); toast(m.msg); break;
      case 'info': toast(m.msg); break;
      case 'left': this.room = null; break;
      case 'chat': OLC.onChat(m); break;
      case 'voice': OLC.onVoice(m); break;
      case 'rtc': OLC.onRtc(m); break;
      case 'start': if (r) LS.set('tk_ol_last', { code: r.code, t: Date.now() }); this.inGame = true; this.showingEnd = false; this.gameView(); this.pls(); break;
      case 'q': if (r) this.onQ(m); break;
      case 'open': {
        if (!r || !$('#phase')) return; this.out = new Set(m.out); this.answerer = null;
        if (!this.out.has(this.me)) { this.answered = false; $$('.opts', $('#qarea')).forEach(o => o.classList.remove('locked')); }
        $('#phase').textContent = '🔔 開放搶答'; SFX.play('pop'); Owl.set('idle');
        const b = $('#buzzer'); if (b) b.disabled = this.out.has(this.me);
        $('#bubble').textContent = this.out.has(this.me) ? '你這題已經答錯了，看看別人吧！' : '開放搶答！'; this.bar(m.sec); break;
      }
      case 'buzzed': {
        if (!r) return; r.players = m.players; this.answerer = m.id; const p = this.pl(m.id);
        SFX.play('buzz'); $('#phase').textContent = `🙋 ${p ? p.n : ''} 作答中`; this.pls({ buzz: m.id });
        const b = $('#buzzer'); if (b) b.disabled = true;
        banner(`🔔 ${m.id === this.me ? '你' : p.n} 搶到了！`);
        if (m.id === this.me) { $('#bubble').textContent = '你搶到了！請在 8 秒內作答！'; Voice.say('你搶到了！'); this.bar(m.sec); }
        else { $('#bubble').textContent = `${p.n} 搶到了，正在作答……`; Voice.say(p.n + '搶到了！'); this.stopT(); }
        break;
      }
      case 'buzzwrong': {
        if (!r) return; r.players = m.players; this.out = new Set(m.out); this.answerer = null; this.stopT();
        const p = this.pl(m.id); SFX.play('wrong'); Owl.set('sad', 1200);
        if (m.id === this.me && !this.recorded) this.record(false);
        if (m.id === this.me && m.pk != null) { const ob = $(`.opt[data-o="${m.pk}"]`); if (ob) ob.classList.add('wrong'); }
        if (m.id !== this.me && m.pk != null && this.qv) this.qv.markPick(m.pk);
        const marks = {}; this.out.forEach(k => marks[k] = '❌'); this.pls(marks);
        $('#bubble').textContent = `${m.id === this.me ? '你' : p.n} ${m.timeout ? '時間到' : '答錯了'}！扣 50 分，其他人可以再搶答！`; break;
      }
      case 'reveal': this.onReveal(m); break;
      case 'end': this.onEnd(m); break;
    }
  },
  onReveal(m) {
    const r = this.room; if (!r || !this.q) { if (r) r.players = m.players; return; }
    r.players = m.players; this.stopT(); const q = this.q;
    $('#phase').textContent = '公布答案'; const b = $('#buzzer'); if (b) b.disabled = true;
    const marks = {};
    if (m.kind === 'sync') {
      const mine = m.picks[this.me];
      this.qv.reveal(this.myPick); this.record(!!(mine && mine.ok));
      r.players.forEach(p => { const pk = m.picks[p.id]; marks[p.id] = !pk ? '⌛' : pk.ok ? '✅' : '❌'; });
      if (m.first && r.mode === 'sync') marks[m.first] = '🥇';
      if (m.attack) { shakeScreen(); SFX.play(m.attack.to === this.me ? 'heart' : 'boing'); const f = this.pl(m.attack.from); setTimeout(() => banner(`💥 ${f ? f.n : ''} 攻擊！造成 ${m.attack.dmg} 點傷害`), 200); }
      if (mine && mine.ok) { SFX.play('correct'); Owl.set('happy', 1500); $('#bubble').textContent = m.first === this.me ? '你答對了，而且是最快的！' : '答對了！不過有人比你快喔！'; Voice.say(line('correct')); }
      else { SFX.play('wrong'); Owl.set('sad', 1500); $('#bubble').textContent = mine ? line('wrong') : '你沒有作答喔！'; }
    } else if (m.kind === 'buzzok') {
      const p = this.pl(m.id); this.qv.reveal(m.pk); marks[m.id] = '✅';
      SFX.play('correct'); Owl.set('happy', 1500);
      $('#bubble').innerHTML = `${m.id === this.me ? '你' : esc(p.n)} 答對了！<b>＋${m.gain}</b>`;
      if (m.id === this.me) Voice.say(line('correct')); else Voice.say(p.n + '答對了！');
    } else {
      this.qv.reveal(this.myPick); SFX.play('gong');
      $('#bubble').textContent = m.kind === 'none' ? '沒有人搶答……大家都在發呆嗎？' : '沒有人答對！這題太難啦！'; Owl.set(m.kind === 'none' ? 'sleep' : 'sad', 1500);
    }
    this.out.forEach(k => { if (!marks[k]) marks[k] = '❌'; });
    this.pls(marks);
    if (q.exp) $('#explain').innerHTML = `<div class="explain">💡 <b>答案：${esc(q.opts[0])}</b> ${esc(q.exp)}</div><p class="muted center">下一題馬上開始……</p>`;
  },
  onEnd(m) {
    this.stopT(); this.inGame = false; this.showingEnd = true; document.onkeydown = null; LS.del('tk_ol_last');
    const win = m.rank[0] && m.rank[0].id === this.me; P.totals.games++;
    if (win) { P.best.battleWins++; addCoins(30); addXP(60); SFX.play('fanfare'); confetti(100); Voice.say('恭喜你獲得冠軍！'); }
    else { addCoins(8); SFX.play('lose'); Voice.say((m.rank[0] ? m.rank[0].n : '') + '獲得冠軍！下次再加油！'); }
    save(); checkAch();
    if (this.pendingGrad != null) { const g = this.pendingGrad; this.pendingGrad = null; setTimeout(() => graduation(g), 1800); }
    setTop('比賽結果', () => this.leaveAsk());
    view(`<div class="card center"><div class="owl home-owl" data-s="${win ? 'dance' : 'sad'}"></div><div class="h2">🏆 連線比賽結果</div>
      ${m.rank.map((p, k) => `<div class="lb-row"><span class="rk">${['🥇', '🥈', '🥉', '4', '5'][k]}</span><span style="font-size:1.6em">${p.av}</span><span style="flex:1;text-align:left"><b>${esc(p.n)}</b>${p.id === this.me ? '（你）' : ''}</span><span>${m.mode === 'buzz' ? `搶到 ${p.buzz}・` : ''}答對 ${p.ok}・<b>${m.mode === 'duel' ? '❤️ ' + Math.max(0, p.hp) : p.sc + ' 分'}</b></span></div>`).join('')}
      <p>${win ? '🎉 你是冠軍！獲得 30 金幣' : '再接再厲！獲得 8 金幣參加獎'}</p>
      <div class="row"><button class="btn primary" id="again">回房間再來一局</button><button class="btn" id="out">離開</button></div></div>`);
    $('#again').onclick = () => { this.showingEnd = false; this.roomView(); };
    $('#out').onclick = () => { this.close(); Home(); };
  }
};
HOWTO.online = [
  '🌐 真人連線對戰可以和朋友用手機、電腦一起比賽。',
  '🏠 一個人按「建立房間」，會得到四位數房號；其他人在「加入朋友的房間」輸入房號就能進來。',
  '👑 房主可以選擇玩法（搶答擂台、同步作答、一對一對決）、難度、題數和類別，人到齊後按「開始比賽」。',
  '🔔 搶答擂台：題目讀完才開放搶答，最快按下的人作答，答錯扣分、其他人可以再搶。',
  '🎯 同步作答：大家同時作答，答對而且越快分數越高。⚔️ 一對一對決：答對就能攻擊對手，血量先歸零的人輸。',
  '😂 比賽中可以按下方的表情按鈕和大家互動。冠軍可以獲得 30 金幣，參加就有 8 金幣。'
];

/* ===== 房間聊天與即時語音 ===== */
const OLC = {
  msgs: [], unread: 0, open: false, voiceOn: false, stream: null, pcs: {}, auds: {}, muteAll: false,
  ICE: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }],
  QUICK: ['大家好！', '加油！', '好難喔😵', '太強了吧！', '再來一局！', '等我一下', '我先離開囉，掰掰👋', '哈哈哈😂'],
  bar() {
    let b = $('#olbar');
    document.body.classList.toggle('olpad', !!OL.room);
    if (!OL.room) { if (b) b.remove(); const d = $('#olchat'); if (d) d.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'olbar'; document.body.appendChild(b); }
    b.innerHTML = `<button class="olb ${this.voiceOn ? 'on' : ''}" id="olv" title="語音">${this.voiceOn ? '🎙️' : '🎤'}<small>${this.voiceOn ? '語音中' : '語音'}</small></button>
      ${this.voiceOn ? `<button class="olb ${this.muteAll ? '' : 'on'}" id="olm">${this.muteAll ? '🔇' : '🔊'}<small>${this.muteAll ? '已靜音' : '聽聲音'}</small></button>` : ''}
      <button class="olb" id="olc">💬<small>聊天</small>${this.unread ? `<span class="olbadge">${this.unread}</span>` : ''}</button>`;
    $('#olv').onclick = () => this.voiceOn ? this.stopVoice() : this.startVoice();
    if ($('#olm')) $('#olm').onclick = () => { this.muteAll = !this.muteAll; Object.values(this.auds).forEach(a => a.muted = this.muteAll); this.bar(); };
    $('#olc').onclick = () => this.toggleChat();
  },
  toggleChat(force) {
    this.open = force != null ? force : !this.open; let d = $('#olchat');
    if (!this.open) { if (d) d.remove(); return; }
    this.unread = 0; this.bar();
    if (!d) { d = document.createElement('div'); d.id = 'olchat'; document.body.appendChild(d); }
    d.innerHTML = `<div class="olch-head"><b>💬 房間聊天</b><button class="tb-btn" id="olx">✕</button></div><div class="olch-list" id="oll"></div>
      <div class="olch-quick">${this.QUICK.map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <div class="olch-in"><input class="field" id="oli" maxlength="80" placeholder="輸入訊息……" style="margin:0"><button class="btn primary" id="ols">送出</button></div>`;
    $('#olx').onclick = () => this.toggleChat(false);
    const sendIt = t => { t = String(t || '').trim(); if (!t) return; OL.send({ t: 'chat', msg: t }); $('#oli').value = ''; };
    $('#ols').onclick = () => sendIt($('#oli').value);
    $('#oli').onkeydown = e => { if (e.key === 'Enter') sendIt($('#oli').value); };
    $$('.olch-quick .chip', d).forEach(c => c.onclick = () => sendIt(c.dataset.q));
    this.render();
  },
  render() {
    const l = $('#oll'); if (!l) return;
    l.innerHTML = this.msgs.length ? this.msgs.map(m => `<div class="olmsg ${m.me ? 'me' : ''}"><span class="olwho">${m.av} ${esc(m.n)}</span><span class="oltx">${esc(m.msg)}</span></div>`).join('') : '<p class="muted center">還沒有訊息，打個招呼吧！</p>';
    l.scrollTop = l.scrollHeight;
  },
  onChat(m) {
    const p = OL.pl(m.id); const me = m.id === OL.me;
    this.msgs.push({ n: m.n, av: p ? p.av : '🙂', msg: m.msg, me }); if (this.msgs.length > 60) this.msgs.shift();
    if (this.open) this.render(); else { if (!me) { this.unread++; banner(`${p ? p.av : ''} ${m.n}：${m.msg}`); } this.bar(); }
    if (!me) SFX.play('pop');
  },
  /* ---- 語音（點對點直接連線，聲音不經過伺服器） ---- */
  async startVoice() {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) return toast('這個瀏覽器不支援語音通話');
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { return toast('需要允許使用麥克風才能語音喔！'); }
    this.voiceOn = true; this.muteAll = false; OL.send({ t: 'voice', on: true }); this.bar(); toast('🎙️ 已開啟語音，其他開啟語音的玩家可以聽到你');
    if (S.music) Music.toggle(false);
    (OL.room ? OL.room.players : []).forEach(p => { if (p.id !== OL.me && p.voice && OL.me < p.id) this.call(p.id); });
  },
  stopVoice(silent) {
    Object.keys(this.pcs).forEach(id => this.hang(id));
    if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null;
    if (this.voiceOn && !silent) OL.send({ t: 'voice', on: false });
    this.voiceOn = false; this.bar(); if (S.music) Music.toggle(true);
  },
  peer(id) {
    if (this.pcs[id]) return this.pcs[id];
    const pc = new RTCPeerConnection({ iceServers: this.ICE }); this.pcs[id] = pc;
    if (this.stream) this.stream.getTracks().forEach(t => pc.addTrack(t, this.stream));
    pc.onicecandidate = e => { if (e.candidate) OL.send({ t: 'rtc', to: id, data: { cand: e.candidate } }); };
    pc.ontrack = e => { let a = this.auds[id]; if (!a) { a = this.auds[id] = new Audio(); a.autoplay = true; a.playsInline = true; } a.srcObject = e.streams[0]; a.muted = this.muteAll; const pr = a.play(); if (pr && pr.catch) pr.catch(() => toast('點一下畫面就能聽到語音')); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { const p = OL.pl(id); toast(`⚠️ 和 ${p ? p.n : '對方'} 的語音連不上（網路限制）`); this.hang(id); } };
    return pc;
  },
  hang(id) { const pc = this.pcs[id]; if (pc) { try { pc.close(); } catch (e) { } delete this.pcs[id]; } const a = this.auds[id]; if (a) { a.srcObject = null; delete this.auds[id]; } },
  async call(id) { const pc = this.peer(id); const o = await pc.createOffer(); await pc.setLocalDescription(o); OL.send({ t: 'rtc', to: id, data: { sdp: pc.localDescription } }); },
  async onRtc(m) {
    if (!this.voiceOn) return; const d = m.data || {};
    try {
      if (d.sdp) {
        const pc = this.peer(m.from); await pc.setRemoteDescription(d.sdp);
        if (d.sdp.type === 'offer') { const a = await pc.createAnswer(); await pc.setLocalDescription(a); OL.send({ t: 'rtc', to: m.from, data: { sdp: pc.localDescription } }); }
      } else if (d.cand && this.pcs[m.from]) await this.pcs[m.from].addIceCandidate(d.cand);
    } catch (e) { }
  },
  onVoice(m) {
    const p = OL.pl(m.id); if (p) p.voice = m.on;
    if (m.id === OL.me) return;
    if (!m.on) this.hang(m.id);
    else if (this.voiceOn && OL.me < m.id) this.call(m.id);
    if (p) toast(`${p.av} ${p.n} ${m.on ? '開啟' : '關閉'}了語音`);
    if (OL.room && OL.room.phase === 'lobby' && !OL.showingEnd && !OL.inGame) OL.roomView(); else OL.pls();
  },
  leaveAll() { this.stopVoice(true); this.msgs = []; this.unread = 0; this.open = false; const d = $('#olchat'); if (d) d.remove(); const b = $('#olbar'); if (b) b.remove(); document.body.classList.remove('olpad'); }
};
HOWTO.online.push('💬 房間裡右下角有「聊天」按鈕，可以打字或點快速用語；🎤「語音」按鈕可以開麥克風和其他開語音的玩家直接講話（第一次會詢問是否允許使用麥克風）。');
