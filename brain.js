/* ===== 大腦訓練專區 ===== */
const BAREA = { mem: '記憶力', att: '專注力', spd: '反應速度', flx: '轉換能力', spa: '空間推理' };
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
      const pick = m => { tsum += (Date.now() - t0) / 1000; if (m === mir) { ok++; SFX.play('correct'); } else SFX.play('wrong'); i++; setTimeout(nxt, 350); };
      $('#same').onclick = () => pick(false); $('#mirr').onclick = () => pick(true);
    };
    nxt();
  } };

/* ---------- 執行器 ---------- */
const BrainRun = { timer: null };
function runBrainGames(keys, opts, finish) {
  // opts: { title, fixedLv } ; finish(results)
  stopGame(); const res = {}; let k = 0;
  Game.stop = () => { if (BrainRun.timer) BrainRun.timer.stop(); };
  const one = () => {
    if (k >= keys.length) return finish(res);
    const key = keys[k], g = BG[key];
    setTop(`${opts.title}（${k + 1}/${keys.length}）`, () => ask('要中斷訓練嗎？', '這次的訓練不會被記錄喔。', [{ t: '中斷離開', v: 1 }, { t: '繼續', v: 0, cls: 'gold' }]).then(v => { if (v) { stopGame(); BrainHome(); } }));
    view(`<div class="card bgame"><div class="owl home-owl" data-s="talk" style="width:110px;height:120px"></div><div class="h2">${g.icon} ${g.name}</div><div class="seal">${BAREA[g.area]}</div><p style="line-height:1.7">${g.how}</p><button class="btn primary block" id="go">準備好了，開始！</button></div>`);
    Voice.say(g.name + '。' + g.how);
    $('#go').onclick = () => {
      Voice.stop(); SFX.play('gong');
      const lv = opts.fixedLv || P.brain.lv[key] || 3;
      view(`<div class="card bgame" id="ga"></div>`);
      g.run($('#ga'), lv, r => {
        if (BrainRun.timer) BrainRun.timer.stop();
        res[key] = r.score;
        if (!opts.fixedLv) { const cur = P.brain.lv[key] || 3; P.brain.lv[key] = clamp(r.acc > .85 ? cur + 1 : r.acc < .65 ? cur - 1 : cur, 1, 10); }
        SFX.play(r.score >= 60 ? 'correct' : 'pop');
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

/* ---------- 大腦訓練首頁 ---------- */
function BrainHome() {
  stopGame();
  setTop('🧠 大腦訓練專區', Home, () => showHowto('brain'));
  const done = !!P.brain.checkup[today()];
  view(`<div class="hostrow"><div class="owl"></div><div class="bubble">大腦就像肌肉，每天練一點點最有效！建議每天花五到十分鐘。</div></div>
    <div class="tiles">
      <button class="tile" id="t1">${done ? '' : '<span class="badge">今日未完成</span>'}<span class="ic">🩺</span><span class="nm">每日大腦健檢</span><span class="ds">每天三款，約五分鐘</span></button>
      <button class="tile" id="t2"><span class="ic">🎂</span><span class="nm">腦年齡測驗</span><span class="ds">測出你的大腦幾歲</span></button>
      <button class="tile" id="t3"><span class="ic">🎮</span><span class="nm">自由訓練</span><span class="ds">五大能力任你選</span></button>
      <button class="tile" id="t4"><span class="ic">📊</span><span class="nm">我的大腦報告</span><span class="ds">雷達圖、進步曲線</span></button>
    </div>`);
  $('#t1').onclick = checkup; $('#t2').onclick = ageTest; $('#t3').onclick = freeTrain; $('#t4').onclick = brainReport;
}
function checkup() {
  const d = today(); const keys = seededShuffle(Object.keys(BG), seeded('chk' + d)).slice(0, 3);
  if (P.brain.checkup[d]) { ask('今天已經健檢過了！', `今日分數：${P.brain.checkup[d]} 分<br>要再做一次嗎？（以較高分記錄）`, [{ t: '再做一次', v: 1 }, { t: '不用了', v: 0, cls: 'gold' }]).then(v => v && go()); return; }
  go();
  function go() {
    runBrainGames(keys, { title: '每日健檢' }, res => {
      const avg = Math.round(Object.values(res).reduce((a, b) => a + b, 0) / keys.length);
      const first = !P.brain.checkup[d]; P.brain.checkup[d] = Math.max(P.brain.checkup[d] || 0, avg); recordBrain('check', res);
      if (first) addCoins(20); SFX.play('stamp'); confetti(50); checkAch(); save();
      const streak = chkStreak();
      view(`<div class="card center"><div class="owl home-owl" data-s="dance"></div><div class="h2">🩺 今日健檢完成！</div><div class="result-score">${avg}</div><div class="muted">今日大腦分數</div>
        ${keys.map(k => `<div class="statrow" style="text-align:left">${BG[k].icon} ${BAREA[BG[k].area]}：<b>${res[k]}</b><div class="bar"><i style="width:${res[k]}%"></i></div></div>`).join('')}
        <p>🔥 已連續健檢 <b>${streak}</b> 天 ${first ? '・獲得 20 金幣' : ''}</p><div class="row"><button class="btn primary" id="rp">看大腦報告</button><button class="btn" id="bk">返回</button></div></div>`);
      setTop('健檢結果', BrainHome); $('#rp').onclick = brainReport; $('#bk').onclick = BrainHome;
      Voice.say('今日健檢完成，大腦分數' + avg + '分！');
    });
  }
}
function chkStreak() { let n = 0; const d = new Date(); for (; ;) { if (P.brain.checkup[today(d)]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }
function freeTrain() {
  setTop('🎮 自由訓練', BrainHome);
  view(`<div class="tiles">${Object.entries(BG).map(([k, g]) => `<button class="tile" data-k="${k}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="ds">${BAREA[g.area]}・第 ${P.brain.lv[k] || 3} 級</span></button>`).join('')}</div>`);
  $$('.tile').forEach(b => b.onclick = () => runBrainGames([b.dataset.k], { title: '自由訓練' }, res => { recordBrain('free', res); checkAch(); freeTrain(); }));
}

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
  Object.keys(BAREA).forEach(k => { const v = h.filter(e => e.s[k] != null).slice(-5).map(e => e.s[k]); if (v.length) latest[k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length); });
  const byDay = {}; h.forEach(e => { const v = Object.values(e.s); (byDay[e.d] = byDay[e.d] || []).push(...v); });
  const pts = Object.keys(byDay).sort().slice(-30).map(d => ({ d, v: Math.round(byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length) }));
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth(); const days = new Date(Y, M + 1, 0).getDate();
  const ages = P.brain.ages.slice(-6).reverse();
  view(`<div class="card"><div class="h3">🕸️ 能力雷達圖（最近五次平均）</div><canvas class="chart" id="radar" width="520" height="360"></canvas>
    ${Object.keys(latest).length < 5 ? '<p class="muted center">完成腦年齡測驗或每日健檢，就能填滿雷達圖！</p>' : `<p class="center">最強：<b>${BAREA[Object.entries(latest).sort((a, b) => b[1] - a[1])[0][0]]}</b>・待加強：<b>${BAREA[Object.entries(latest).sort((a, b) => a[1] - b[1])[0][0]]}</b></p>`}</div>
    <div class="card"><div class="h3">📈 進步曲線（每日平均分數）</div><canvas class="chart" id="line" width="520" height="260"></canvas></div>
    <div class="card"><div class="h3">📅 ${M + 1} 月健檢打卡（連續 ${chkStreak()} 天）</div><div>${Array.from({ length: days }, (_, i) => { const d = today(new Date(Y, M, i + 1)); return `<span class="stamp ${P.brain.checkup[d] ? 'done' : ''}">${P.brain.checkup[d] ? '腦' : i + 1}</span>`; }).join('')}</div></div>
    <div class="card"><div class="h3">🎂 腦年齡紀錄</div>${ages.length ? ages.map(a => `<div class="lb-row"><span>${a.d}</span><span style="flex:1"></span><span>實際 ${a.age} 歲 → 大腦 <b>${a.ba}</b> 歲（${a.score} 分）</span></div>`).join('') : '<p class="muted">還沒有測驗紀錄</p>'}</div>`);
  drawRadar($('#radar'), latest); drawLine($('#line'), pts);
}
