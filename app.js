/* ===== 主選單、登入、個人資料、成就、設定 ===== */
const ACH = [
  { id: 'first', n: '初出茅廬', d: '第一次答對題目', t: () => P.totals.correct >= 1 },
  { id: 'c100', n: '小有學問', d: '累計答對 100 題', t: () => P.totals.correct >= 100 },
  { id: 'c500', n: '博學多聞', d: '累計答對 500 題', t: () => P.totals.correct >= 500 },
  { id: 'c1000', n: '學富五車', d: '累計答對 1000 題', t: () => P.totals.correct >= 1000 },
  { id: 'c3000', n: '行走的百科全書', d: '累計答對 3000 題', t: () => P.totals.correct >= 3000 },
  { id: 's5', n: '才高八斗', d: '連續答對 5 題', t: () => P.totals.maxStreak >= 5 },
  { id: 's10', n: '天下無雙', d: '連續答對 10 題', t: () => P.totals.maxStreak >= 10 },
  { id: 's20', n: '神之腦袋', d: '連續答對 20 題', t: () => P.totals.maxStreak >= 20 },
  { id: 'surv10', n: '打不死的小強', d: '生存模式連勝 10 題', t: () => P.best.survival >= 10 },
  { id: 'surv25', n: '九命怪貓', d: '生存模式連勝 25 題', t: () => P.best.survival >= 25 },
  { id: 'sp15', n: '閃電俠', d: '限時快答答對 15 題', t: () => P.best.speed >= 15 },
  { id: 'sp25', n: '光速腦袋', d: '限時快答答對 25 題', t: () => P.best.speed >= 25 },
  { id: 'd7', n: '全勤寶寶', d: '完成 7 天每日挑戰', t: () => Object.keys(P.daily).length >= 7 },
  { id: 'chk7', n: '大腦保健師', d: '每日健檢連續 7 天', t: () => chkStreak() >= 7 },
  { id: 'young', n: '凍齡大腦', d: '腦年齡比實際年輕', t: () => P.brain.ages.some(a => a.ba < a.age) },
  { id: 'bw1', n: '擂台新秀', d: '對戰拿下第一次冠軍', t: () => P.best.battleWins >= 1 },
  { id: 'bw10', n: '擂台霸主', d: '對戰拿下 10 次冠軍', t: () => P.best.battleWins >= 10 },
  { id: 'bd5', n: '幸運之星', d: '九宮格贏 5 次', t: () => P.best.boardWins >= 5 },
  { id: 'rich', n: '小富翁', d: '金幣達到 1000', t: () => P.coins >= 1000 },
  { id: 'g50', n: '遊戲成癮（誤）', d: '遊玩 50 場', t: () => P.totals.games >= 50 },
  ...CATS.map(c => ({ id: 'cat-' + c.id, n: c.title, d: `「${c.name}」類別答對 30 題`, t: () => (P.stats[c.id] || {}).c >= 30, cat: c.id }))
];
function checkAch() {
  if (!P) return; let got = [];
  ACH.forEach(a => { if (!P.ach[a.id] && a.t()) { P.ach[a.id] = today(); got.push(a); addCoins(20); } });
  got.forEach((a, i) => setTimeout(() => { SFX.play('fanfare'); toast(`🏅 獲得稱號「${a.n}」！＋20 金幣`); }, 800 + i * 1500));
  if (got.length) save();
}

/* ---------- 遊戲說明 ---------- */
const HOWTO = {
  general: ['🎯 <b>遊戲目標</b>：答題累積經驗值，從「幼稚園」一路畢業到「叫我全能智慧王」！', '📚 共 19 大類題目，加上「綜合」類別可以無限玩下去，題目會優先出你沒看過的。', '🎚️ 每題分為 <b>普通、中等、高難度</b>，越難分數越高（一倍、一點五倍、兩倍）。', '🧰 <b>道具</b>：✂️ 去掉兩個錯誤答案、⏳ 加十秒、👥 看大家選什麼、⏭️ 跳過、🧪 復活藥（生存模式）。金幣可以到商店購買。', '🎲 答題時偶爾會出現隨機事件：分數加倍、財神降臨、考官打瞌睡、題目喝醉搖晃……', '💾 每答一題、離開、返回都會<b>自動存檔</b>，下次登入會問你要不要接著玩。', '🔊 右上角「設定」可以調整語音、音效、背景音樂、字體大小與主題風格。'],
  level: ['🏯 每個類別分普通、中等、高難度，各有十關，每關十題。', '⭐ 答對 6 題得一星並解鎖下一關、8 題兩星、全對三星。', '💰 每顆星可得 10 金幣。'],
  speed: ['⚡ 六十秒內盡量多答，答錯不扣時間，但會浪費時間！', '🏆 挑戰最高答對數的紀錄。'],
  survival: ['💀 你有 <b>兩次機會</b>（兩顆愛心），答錯或超時會扣一顆。', '💔 只剩一顆時會亮紅燈並提醒你！', '🧪 兩顆都用完時，可以喝「復活藥」再續一命。', '📈 選「混合」難度時，題目會從普通慢慢變難。'],
  endless: ['🌀 隨機出題、沒有題數上限，按「休息一下」就會結算。', '⏱️ 每題有三十秒，比較輕鬆。'],
  daily: ['📅 每天十題，所有玩家題目相同，不能用道具。', '🎁 每天第一次完成可得 30 金幣。'],
  wrong: ['📕 答錯的題目會自動收進錯題本。', '✅ 在這裡答對的題目會從錯題本移除。'],
  buzz: ['🔔 主持人讀完題目後才開放搶答，按下大紅色搶答鈕（電腦可按空白鍵）。', '✅ 搶到的人答對得分；答錯扣 50 分，其他人可以再搶！', '📊 畫面會顯示誰最先搶到，以及每個人搶到幾題。'],
  sync: ['🎯 所有人同時作答，十八秒內選好答案。', '🥇 答對的人中，最快的人有額外加分（第一名＋60、第二名＋30……）。'],
  duel: ['⚔️ 一對一血量對決，每人 100 點血。', '💥 只有你答對：攻擊對手 25 點；兩人都答對：比較快的人攻擊 15 點；題目越難傷害越高。', '🏆 血量先歸零的人輸，題目結束時血量多的人贏。'],
  board: ['🎰 點中間的「開始」，燈號會像跑馬燈一樣繞圈，越轉越慢，最後停在某一格。', '📚 停在類別格就回答該類題目；格子考過會打勾，再停到時會問你要同類別出新題，還是換一格重轉。', '🔒 同一局內題目絕對不會重複；某類題目被考光時，會問你要換類別還是重新洗牌。', '🍀 機會格：加分、加倍、偷分、再轉一次……', '🎲 命運格：放屁扣分、滑倒暫停、交換分數、加考難題……', '❓ 問號格：揭曉後可能是機會，也可能是命運！'],
  brain: ['🩺 <b>每日大腦健檢</b>：每天系統挑三款小遊戲，約五分鐘，完成可蓋章、累積連續天數。', '🎂 <b>腦年齡測驗</b>：輸入真實年齡與性別，完成五項測驗，得到腦年齡、評等、分析與改善建議。', '🎮 <b>自由訓練</b>：五大能力（記憶、專注、速度、轉換、空間）任意練習。', '🎚️ 系統會依你的表現自動調整難度，讓你維持七、八成的答對率，訓練效果最好。', '📊 <b>大腦報告</b>：能力雷達圖、每日進步曲線、打卡日曆、腦年齡紀錄。']
};
function showHowto(k) {
  const titles = { general: '遊戲玩法', ...Object.fromEntries(Object.entries(MODES).map(([a, b]) => [a, b.name])), ...Object.fromEntries(Object.entries(BMODES).map(([a, b]) => [a, b.name])), board: '幸運九宮格', brain: '大腦訓練' };
  modal(`<div class="mt">📖 ${titles[k] || '遊戲說明'}</div><div class="howto">${(HOWTO[k] || HOWTO.general).map(t => `<p>${t}</p>`).join('')}</div><button class="btn primary block" onclick="closeModal()">我知道了！</button>`);
}

/* ---------- 登入 ---------- */
function Login() {
  stopGame(); hideTop();
  const names = NET.on ? [] : Object.keys(Profile.all());
  view(`${logoHtml()}<div class="owl home-owl" data-s="talk"></div>
  <div class="card scroll-card"><div class="h2 center">登入／註冊</div>
    <input class="field" id="nm" maxlength="12" placeholder="玩家名稱（最多 12 字）">
    <input class="field" id="pw" type="password" maxlength="20" placeholder="密碼">
    <div class="row"><button class="btn primary" id="login">登入</button><button class="btn gold" id="reg">建立新玩家</button></div>
    ${names.length ? `<div class="h3">這台裝置上的玩家</div><div class="row">${names.map(n => `<button class="btn" data-n="${esc(n)}" style="flex:none">👤 ${esc(n)}</button>`).join('')}</div>` : ''}
    <p class="muted center">${NET.on ? '🌐 連線版：進度存在伺服器上，手機、電腦用同一組名稱和密碼登入就能接著玩。' : '單機版的進度存在這台裝置上。'}</p></div>
  <div class="center muted">遊戲製作：Eric Hu</div>`);
  $$('[data-n]').forEach(b => b.onclick = () => { $('#nm').value = b.dataset.n; $('#pw').focus(); });
  $('#login').onclick = () => {
    const n = $('#nm').value.trim(), p = $('#pw').value;
    if (!n || !p) return toast('請輸入名稱和密碼');
    if (NET.on) return NET.login(n, p).then(() => afterLogin()).catch(e => { SFX.play('wrong'); toast(e.message); });
    if (!Profile.all()[n]) return toast('找不到這位玩家，請先建立新玩家');
    if (!Profile.check(n, p)) { SFX.play('wrong'); return toast('密碼錯誤！'); }
    Profile.load(n); afterLogin();
  };
  $('#reg').onclick = () => {
    const n = $('#nm').value.trim(), p = $('#pw').value;
    if (!n || !p) return toast('請輸入名稱和密碼');
    if (NET.on) return NET.register(n, p).then(moved => { SFX.play('levelup'); if (moved) toast('已把這台裝置上的單機進度帶到雲端！'); afterLogin(!moved); }).catch(e => { SFX.play('wrong'); toast(e.message); });
    if (Profile.all()[n]) return toast('這個名稱已經有人用了');
    Profile.create(n, p); SFX.play('levelup'); afterLogin(true);
  };
  $('#pw').onkeydown = e => { if (e.key === 'Enter') $('#login').click(); };
}
function afterLogin(isNew) {
  SFX.init();
  const d = today();
  if (P.lastLogin !== d) { P.lastLogin = d; if (!isNew) { addCoins(20); setTimeout(() => { toast('🌞 每日登入獎勵＋20 金幣'); SFX.play('coin'); }, 600); } }
  save(); Voice.say(`歡迎${isNew ? '' : '回來'}，${PNAME}！`);
  if (!P.tutorial) return tutorial();
  if (P.session) return askResume();
  Home();
}
async function askResume() {
  const s = P.session; const nm = s.battle ? BMODES[s.mode].name : s.board ? '幸運九宮格' : (MODES[s.mode] || {}).name;
  Home();
  const r = await ask('📂 發現未完成的進度', `上次的「${nm}」還沒玩完（第 ${(s.qi || s.round || 0) + 1} ${s.board ? '回合' : '題'}），要繼續嗎？`, [{ t: '繼續上次進度', v: 1 }, { t: '放棄，重新開始', v: 0, cls: 'gold' }]);
  if (!r) { P.session = null; save(); return; }
  resumeSession();
}
function resumeSession() { const s = P.session; if (!s) return; if (s.battle) Battle.start(s); else if (s.board) Board.start(s); else Quiz.start(s); }
function tutorial() {
  const pages = [
    ['🦉 嗨！我是博士喵', '我是這裡的主持人，會幫你出題、讀題，也會吐槽你（誤）。'],
    ['📚 什麼都考', '歷史、地理、明星、體育、星座、科技、時事、冷知識、爆笑題……一共 19 大類，還有無限出題的「綜合」類！'],
    ['🎓 從幼稚園讀到全能王', '答對累積經驗值就能升級：幼稚園 → 國小 → … → 博士 → 教授 → 院士 → 叫我全能智慧王！'],
    ['⚔️ 各種玩法', '個人挑戰、和電腦對戰、幸運九宮格、大腦訓練……玩累了隨時離開，進度會自動儲存。'],
    ['🎁 送你見面禮', '120 金幣和一些道具已經放進你的背包，祝你玩得開心！']
  ];
  let i = 0;
  const show = () => {
    const [t, d] = pages[i];
    const box = modal(`<div class="owl home-owl" data-s="${['talk', 'read', 'cool', 'happy', 'dance'][i]}"></div><div class="mt">${t}</div><p class="center" style="line-height:1.8">${d}</p><div class="center muted">${i + 1} / ${pages.length}</div><button class="btn primary block" id="tn">${i < pages.length - 1 ? '下一頁 ▶' : '開始遊戲！'}</button>`, { dismiss: false });
    Voice.say(t.replace(/^\S+\s/, '') + '。' + d);
    $('#tn', box).onclick = () => { SFX.play('click'); i++; if (i < pages.length) show(); else { closeModal(); P.tutorial = true; save(); Home(); } };
  };
  Home(); show();
}

/* ---------- 首頁 ---------- */
function logoHtml() {
  return `<div class="logo-wrap"><div class="logo"><span class="ch small">叫</span><span class="ch small">我</span><span class="ch">全</span><span class="ch">能</span><span class="ch">智</span><span class="ch">慧</span><span class="ch">王<span class="crown">👑</span></span></div><span class="bang">！！</span><br><span class="subtitle">✦ 博學多聞・爆笑問答 ✦</span></div>`;
}
function nameplate(name = PNAME, d = P) {
  const ri = rankIndex(d.xp); const fr = Math.min(d.frame || 0, ri);
  return `<div class="nameplate np-${fr}"><span style="font-size:1.6em">${RANKS[ri][2]}</span><span><span class="np-title">${esc(d.title || '尚無稱號')}</span>${esc(name)} <span class="np-rank">${RANKS[ri][0]}</span></span></div>`;
}
function Home() {
  stopGame(); closeModal();
  setTop('', null, () => showHowto('general'));
  const ri = rankIndex(), nx = RANKS[ri + 1]; const pct = nx ? Math.round((P.xp - RANKS[ri][1]) / (nx[1] - RANKS[ri][1]) * 100) : 100;
  const tile = (id, ic, nm, ds, badge) => `<button class="tile" id="${id}">${badge ? `<span class="badge">${badge}</span>` : ''}<span class="ic">${ic}</span><span class="nm">${nm}</span><span class="ds">${ds}</span></button>`;
  view(`${logoHtml()}
  <div class="card" style="display:flex;gap:10px;align-items:center"><div class="owl" style="width:90px;height:100px;flex:none"></div>
    <div style="flex:1;min-width:0">${nameplate()}<div class="muted" style="margin-top:6px">經驗值 ${P.xp}${nx ? ` / ${nx[1]}（下一級：${nx[0]}）` : '（已達最高學歷！）'}</div><div class="bar"><i style="width:${pct}%"></i></div></div></div>
  ${P.session ? `<button class="btn gold block" id="resume">📂 繼續上次未完成的進度</button>` : ''}
  <div class="sec-title">🏮 個人挑戰</div><div class="tiles">
    ${tile('m-level', '🏯', '闖關模式', '十九類各三十關')}${tile('m-speed', '⚡', '限時快答', '最佳 ' + P.best.speed + ' 題')}
    ${tile('m-survival', '💀', '生存模式', '兩次機會・最佳 ' + P.best.survival)}${tile('m-endless', '🌀', '綜合無限', '什麼都考，玩不完')}
    ${tile('m-daily', '📅', '每日挑戰', '每天十題', P.daily[today()] == null ? '今日' : '')}${tile('m-wrong', '📕', '錯題本', P.wrong.length + ' 題待複習')}</div>
  <div class="sec-title">⚔️ 多人競賽</div><div class="tiles">
    ${tile('b-buzz', '🔔', '搶答擂台', '誰手快誰先答')}${tile('b-sync', '🎯', '同步作答', '比正確也比速度')}
    ${tile('b-duel', '⚔️', '一對一對決', '血量大對決')}${tile('b-board', '🎰', '幸運九宮格', '跑馬燈＋機會命運')}${NET.on ? tile('b-online', '🌐', '真人連線', '和好友開房對戰', '連線') : ''}</div>
  <div class="sec-title">🧠 大腦訓練</div><div class="tiles">
    ${tile('br-chk', '🩺', '每日大腦健檢', '五分鐘保養大腦', P.brain.checkup[today()] ? '' : '今日')}${tile('br-home', '🎂', '腦年齡與訓練', '測驗、訓練、報告')}</div>
  <div class="sec-title">🎒 更多</div><div class="tiles">
    ${tile('x-me', '🪪', '我的銘牌', '稱號、收藏、戰績')}${tile('x-rank', '🏆', '排行榜', '看看誰最強')}
    ${tile('x-shop', '🛒', '道具商店', '用金幣買道具')}${tile('x-set', '⚙️', '設定', '語音、音效、主題')}
    ${tile('x-how', '📖', '遊戲玩法', '新手必看')}${tile('x-cred', '🎬', '製作聲明', '關於本遊戲')}</div>
  <button class="btn block" id="logout" style="margin-top:18px">🚪 登出</button>`);
  const on = (id, fn) => { const e = $('#' + id); if (e) e.onclick = () => { SFX.play('click'); fn(); }; };
  on('resume', resumeSession);
  ['level', 'speed', 'survival', 'endless', 'daily', 'wrong'].forEach(m => on('m-' + m, () => setupMode(m)));
  ['buzz', 'sync', 'duel'].forEach(m => on('b-' + m, () => battleSetup(m)));
  on('b-board', boardSetup); on('b-online', () => OL.lobby()); on('br-chk', checkup); on('br-home', BrainHome);
  on('x-me', Me); on('x-rank', Ranking); on('x-shop', Shop); on('x-set', Settings); on('x-how', () => showHowto('general')); on('x-cred', Credits);
  on('logout', () => ask('要登出嗎？', '進度已自動儲存。', [{ t: '登出', v: 1 }, { t: '再玩一下', v: 0, cls: 'gold' }]).then(v => { if (v) { if (NET.on) NET.logout().then(Login); else { Profile.logout(); Login(); } } }));
}

/* ---------- 我的銘牌 ---------- */
function Me() {
  setTop('🪪 我的銘牌', Home);
  const ri = rankIndex(); const titles = ACH.filter(a => P.ach[a.id]);
  const st = CATS.map(c => { const s = P.stats[c.id] || { a: 0, c: 0 }; return { c, a: s.a, r: s.a ? Math.round(s.c / s.a * 100) : 0 }; });
  const played = st.filter(x => x.a >= 5).sort((a, b) => b.r - a.r);
  view(`<div class="card center">${nameplate()}<p class="muted">建立於 ${P.created}・答題 ${P.totals.answered}・答對 ${P.totals.correct}・最長連勝 ${P.totals.maxStreak}</p></div>
  <div class="card"><div class="h3">🖼️ 銘牌外框（依學歷解鎖）</div><div class="grid2">${RANKS.map((r, i) => `<button class="nameplate np-${i}" data-f="${i}" style="justify-content:center;${i > ri ? 'filter:grayscale(1);opacity:.4' : ''}${(P.frame || 0) === i ? ';outline:3px solid var(--accent)' : ''}">${i > ri ? '🔒 ' : ''}${r[0]}</button>`).join('')}</div></div>
  <div class="card"><div class="h3">🏅 稱號（${titles.length} / ${ACH.length}）</div><div class="row">${ACH.map(a => `<button class="btn" data-t="${a.id}" style="flex:none;padding:6px 10px;font-size:.85em;${P.ach[a.id] ? '' : 'opacity:.4'}${P.title === a.n ? ';outline:3px solid var(--accent)' : ''}" title="${a.d}">${P.ach[a.id] ? '🏅' : '🔒'} ${a.n}</button>`).join('')}</div><p class="muted">點已解鎖的稱號可以戴上；點鎖住的可以看解鎖條件。</p></div>
  <div class="card"><div class="h3">🏺 收藏冊</div><div class="grid3">${CATS.map(c => `<div class="treasure ${P.ach['cat-' + c.id] ? '' : 'lock'}"><div class="ti">${c.tr[0]}</div>${c.tr[1]}<div class="muted">${c.name}</div></div>`).join('')}</div></div>
  <div class="card"><div class="h3">📊 各類別正確率</div>${played.length ? `<p>最擅長：<b>${played[0].c.icon} ${played[0].c.name}</b>・最需加強：<b>${played[played.length - 1].c.icon} ${played[played.length - 1].c.name}</b></p>` : '<p class="muted">每類答滿 5 題後就能分析強弱項</p>'}
  ${st.map(x => `<div class="statrow">${x.c.icon} ${x.c.name}　<span class="muted">${x.a} 題・${x.r}%</span><div class="bar"><i style="width:${x.r}%"></i></div></div>`).join('')}</div>`);
  $$('[data-f]').forEach(b => b.onclick = () => { const i = +b.dataset.f; if (i > ri) return toast(`升到「${RANKS[i][0]}」才能使用`); P.frame = i; save(); SFX.play('click'); Me(); });
  $$('[data-t]').forEach(b => b.onclick = () => { const a = ACH.find(x => x.id === b.dataset.t); if (!P.ach[a.id]) return toast('解鎖條件：' + a.d); P.title = a.n; save(); SFX.play('click'); Me(); });
}

/* ---------- 排行榜 ---------- */
function Ranking(tab = 'xp') {
  if (NET.on) return NET.ranking(tab);
  setTop('🏆 排行榜', Home);
  const all = Object.entries(Profile.all()).map(([n, r]) => ({ n, d: Object.assign(newData(), r.data) }));
  const T = { xp: ['總經驗', x => x.d.xp], speed: ['限時快答', x => x.d.best.speed], survival: ['生存連勝', x => x.d.best.survival], daily: ['今日挑戰', x => x.d.daily[today()] || 0], brain: ['腦年齡', x => { const a = x.d.brain.ages; return a.length ? Math.max(...a.map(e => e.age - e.ba)) : -999; }] };
  const list = all.map(x => ({ ...x, v: T[tab][1](x) })).filter(x => x.v > -999).sort((a, b) => b.v - a.v).slice(0, 50);
  view(`<div class="row" style="margin-bottom:10px">${Object.entries(T).map(([k, v]) => `<button class="btn ${k === tab ? 'primary' : ''}" data-k="${k}" style="padding:8px 4px;font-size:.85em">${v[0]}</button>`).join('')}</div>
  <div class="card">${list.length ? list.map((x, i) => `<div class="lb-row"><span class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span style="flex:1;min-width:0">${nameplate(x.n, x.d)}</span><b>${tab === 'brain' ? (x.v >= 0 ? '年輕 ' + x.v + ' 歲' : '老 ' + (-x.v) + ' 歲') : x.v}</b></div>`).join('') : '<p class="muted center">還沒有紀錄</p>'}</div>
  <p class="muted center">單機版顯示這台裝置上的玩家；連線版為全服永久排行榜。</p>`);
  $$('[data-k]').forEach(b => b.onclick = () => Ranking(b.dataset.k));
}

/* ---------- 道具商店 ---------- */
const SHOP = [['fifty', '✂️', '去掉兩個', '刪掉兩個錯誤選項', 30], ['time', '⏳', '加十秒', '作答時間多十秒', 20], ['audience', '👥', '看大家選', '偷看其他人的選擇比例', 25], ['skip', '⏭️', '跳過', '跳過不會的題目，不算錯', 25], ['life', '🧪', '復活藥', '生存模式多一條命', 60]];
function Shop() {
  setTop('🛒 道具商店', Home);
  view(`<div class="hostrow"><div class="owl" data-s="cool"></div><div class="bubble">歡迎光臨！本店童叟無欺，金幣拿來，道具帶走～</div></div>
  ${SHOP.map(([k, ic, nm, ds, pr]) => `<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><span style="font-size:2em">${ic}</span><div style="flex:1"><b>${nm}</b>　<span class="muted">擁有 ${P.items[k] || 0}</span><div class="muted">${ds}</div></div><button class="btn gold" data-k="${k}" data-p="${pr}">🪙 ${pr}</button></div>`).join('')}`);
  $$('[data-k]').forEach(b => b.onclick = () => { const pr = +b.dataset.p; if (P.coins < pr) { SFX.play('wrong'); return toast('金幣不夠喔！多答幾題再來～'); } addCoins(-pr); P.items[b.dataset.k] = (P.items[b.dataset.k] || 0) + 1; SFX.play('coin'); save(); Shop(); });
}

/* ---------- 設定 ---------- */
function Settings() {
  setTop('⚙️ 設定', Home);
  const sw = (k, nm) => `<label class="lb-row"><span style="flex:1">${nm}</span><input type="checkbox" data-s="${k}" ${S[k] ? 'checked' : ''} style="width:24px;height:24px"></label>`;
  const themes = [['scholar', '🏮 古風書院'], ['sakura', '🌸 唯美花見'], ['cute', '🐣 可愛萌系'], ['temple', '🎎 熱鬧廟會'], ['night', '🌙 夜色宮廷']];
  view(`<div class="card"><div class="h3">🔊 聲音</div>${sw('sfx', '音效')}${sw('music', '背景音樂')}<label class="lb-row"><span style="flex:1">🎵 背景音樂曲目</span><select class="field" id="track" style="width:auto;margin:0">${[['all', '六首隨機輪播'], ...Music.TRACKS.map((n, i) => [i + 1, (i + 1) + '．' + n]), ['synth', '古箏小曲（合成）']].map(([v, n]) => `<option value="${v}" ${String(S.track) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${sw('voice', '語音主持人')}${sw('readQ', '語音朗讀題目')}
    <div class="lb-row"><span style="flex:1">語速</span><input type="range" min="0.6" max="1.6" step="0.1" value="${S.rate}" id="rate"></div>
    <div class="lb-row"><span style="flex:1">音量</span><input type="range" min="0.1" max="1" step="0.1" value="${S.vol}" id="vol"></div>
    <button class="btn block" id="test">🗣️ 試聽語音</button>
    <p class="muted">${Voice.ok ? (Voice.v ? '目前語音：' + esc(Voice.v.name) : '找不到中文語音，請到手機或電腦的系統設定安裝中文語音') : '這個瀏覽器不支援語音'}</p></div>
  <div class="card"><div class="h3">🎨 畫面風格</div><div class="grid2">${themes.map(([k, n]) => `<button class="btn ${S.theme === k ? 'primary' : ''}" data-th="${k}">${n}</button>`).join('')}</div></div>
  <div class="card"><div class="h3">👀 閱讀</div>${sw('big', '大字體')}${sw('elder', '長輩模式（大字體、不限時）')}</div>
  <div class="card"><div class="h3">💾 資料</div><button class="btn block" id="reset">🗑️ 重置我的遊戲進度</button></div>`);
  $$('[data-s]').forEach(c => c.onchange = () => { S[c.dataset.s] = c.checked; saveSettings(); SFX.play('click'); });
  $('#rate').oninput = e => { S.rate = +e.target.value; saveSettings(); };
  $('#vol').oninput = e => { S.vol = +e.target.value; saveSettings(); };
  $('#track').onchange = e => { const v = e.target.value; S.track = v === 'all' || v === 'synth' ? v : +v; LS.set('tk_settings', S); Music.change(); SFX.play('click'); };
  $('#test').onclick = () => Voice.say('你好！我是博士喵，歡迎來到叫我全能智慧王！');
  $$('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; saveSettings(); startPetals(); Settings(); });
  $('#reset').onclick = async () => { const v = await ask('確定要重置嗎？', '所有等級、金幣、紀錄都會清空，<b>無法復原</b>！', [{ t: '取消', v: 0 }, { t: '確定重置', v: 1, cls: 'gold' }]); if (v) { const keep = P.created; P = newData(); P.created = keep; P.tutorial = true; save(); toast('已重置'); Home(); } };
}

/* ---------- 製作聲明 ---------- */
function Credits() {
  setTop('🎬 製作聲明', Home);
  const nq = QB.list.length, no = QB.orders.length, nm = QB.matches.length;
  view(`${logoHtml()}<div class="card center scroll-card" style="line-height:2">
    <div class="owl home-owl" data-s="cool"></div>
    <div class="h2">叫我全能智慧王</div><div class="seal">${NET.on ? '連線版' : '單機版'} 1.0</div>
    <p style="font-size:1.2em"><b>遊戲製作：Eric Hu</b></p>
    <p>主持人：博士喵（書生貓頭鷹）</p>
    <p>題庫：${nq} 題知識題・${no} 組排序題型・${nm} 組配對題型<br>＋ 速算、找規律等自動出題（無限量）</p>
    <p class="muted">題目內容力求正確，時事題以製作時的資料為準。<br>大腦訓練與腦年齡測驗為娛樂性質，不能作為醫療診斷。<br>畫面、音效、吉祥物全部由程式繪製產生。</p>
    <p class="muted">© ${new Date().getFullYear()} Eric Hu 版權所有</p></div>`);
  Voice.say('叫我全能智慧王，遊戲製作，Eric Hu');
}

/* ---------- 啟動 ---------- */
$('#btnBack').onclick = () => { SFX.play('click'); if (backHandler) backHandler(); };
$('#btnHelp').onclick = () => { SFX.play('click'); if (helpHandler) helpHandler(); };
// 手機的返回手勢也當作「返回」
try { history.pushState({ tk: 1 }, ''); } catch (e) { } window.addEventListener('popstate', () => { try { history.pushState({ tk: 1 }, ''); } catch (e) { } if (!$('#modal').classList.contains('hidden')) return closeModal(); if (backHandler) backHandler(); });
async function init() {
  applySettings(); Voice.init(); startPetals(); poke();
  if (await NET.detect()) {
    if (!NET.db) toast('⚠️ 伺服器資料庫尚未連線，暫時無法登入');
    return (await NET.resume()) ? afterLogin() : Login();
  }
  const cur = LS.get('tk_current', null);
  if (cur && Profile.load(cur)) afterLogin(); else Login();
}
document.addEventListener('DOMContentLoaded', init);
