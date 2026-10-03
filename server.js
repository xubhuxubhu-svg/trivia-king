/* 叫我全能智慧王：連線版伺服器
   功能：帳號（名稱＋密碼）、雲端存檔、全服排行榜、多人連線對戰房間
   需要環境變數 DATABASE_URL（Neon 資料庫連線字串），資料表一律以 tk_ 開頭，不影響其他遊戲。 */
'use strict';
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const { Pool } = require('pg');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL || '';
const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: /localhost|127\.0\.0\.1/.test(DB_URL) ? false : { rejectUnauthorized: false }, max: 5 }) : null;
let dbReady = false;

async function initDb() {
  if (!pool) { console.log('⚠️ 沒有設定 DATABASE_URL，帳號與存檔功能停用（只能用連線對戰）'); return; }
  await pool.query(`CREATE TABLE IF NOT EXISTS tk_users (
    name TEXT PRIMARY KEY, pw TEXT NOT NULL, salt TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb, xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tk_sessions (
    token TEXT PRIMARY KEY, name TEXT NOT NULL REFERENCES tk_users(name) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE INDEX IF NOT EXISTS tk_users_xp ON tk_users (xp DESC)`);
  dbReady = true; console.log('✅ 資料庫已連線');
}

const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const newToken = () => crypto.randomBytes(24).toString('hex');
const cleanName = n => String(n || '').trim().slice(0, 12);
const okName = n => n.length >= 1 && n.length <= 12 && !/[<>"'&\\\/]/.test(n);

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: 'text/plain', limit: '2mb' }));

app.get('/api/ping', (req, res) => res.json({ ok: true, app: 'trivia-king', db: dbReady }));

function needDb(res) { if (!dbReady) { res.status(503).json({ error: '伺服器資料庫尚未連線，請稍後再試' }); return true; } return false; }
async function userFromToken(token) {
  if (!token) return null;
  const r = await pool.query('SELECT name FROM tk_sessions WHERE token=$1', [String(token)]);
  return r.rows[0] ? r.rows[0].name : null;
}
const bodyOf = req => typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (e) { return {}; } })() : (req.body || {});
const authToken = req => { const h = req.get('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7) : (bodyOf(req).token || ''); };

/* 註冊 */
app.post('/api/register', async (req, res) => {
  if (needDb(res)) return;
  try {
    const b = bodyOf(req); const name = cleanName(b.name), pw = String(b.pw || '');
    if (!okName(name)) return res.status(400).json({ error: '名稱需為 1～12 個字，且不能有特殊符號' });
    if (pw.length < 1 || pw.length > 40) return res.status(400).json({ error: '請輸入密碼' });
    const salt = crypto.randomBytes(12).toString('hex');
    const data = b.data && typeof b.data === 'object' ? b.data : {};
    const r = await pool.query('INSERT INTO tk_users (name,pw,salt,data,xp) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (name) DO NOTHING RETURNING name',
      [name, hashPw(pw, salt), salt, data, Math.max(0, parseInt(data.xp, 10) || 0)]);
    if (!r.rows.length) return res.status(409).json({ error: '這個名稱已經有人用了' });
    const token = newToken(); await pool.query('INSERT INTO tk_sessions (token,name) VALUES ($1,$2)', [token, name]);
    res.json({ ok: true, token, name, data });
  } catch (e) { console.error(e); res.status(500).json({ error: '伺服器錯誤' }); }
});

/* 登入 */
app.post('/api/login', async (req, res) => {
  if (needDb(res)) return;
  try {
    const b = bodyOf(req); const name = cleanName(b.name), pw = String(b.pw || '');
    const r = await pool.query('SELECT pw,salt,data FROM tk_users WHERE name=$1', [name]);
    if (!r.rows.length) return res.status(404).json({ error: '找不到這位玩家，請先建立新玩家' });
    const u = r.rows[0];
    if (!crypto.timingSafeEqual(Buffer.from(u.pw, 'hex'), Buffer.from(hashPw(pw, u.salt), 'hex'))) return res.status(401).json({ error: '密碼錯誤！' });
    const token = newToken(); await pool.query('INSERT INTO tk_sessions (token,name) VALUES ($1,$2)', [token, name]);
    res.json({ ok: true, token, name, data: u.data });
  } catch (e) { console.error(e); res.status(500).json({ error: '伺服器錯誤' }); }
});

/* 讀檔 */
app.get('/api/load', async (req, res) => {
  if (needDb(res)) return;
  try {
    const name = await userFromToken(authToken(req)); if (!name) return res.status(401).json({ error: '請重新登入' });
    const r = await pool.query('SELECT data FROM tk_users WHERE name=$1', [name]);
    res.json({ ok: true, name, data: r.rows[0] ? r.rows[0].data : {} });
  } catch (e) { console.error(e); res.status(500).json({ error: '伺服器錯誤' }); }
});

/* 存檔 */
app.post('/api/save', async (req, res) => {
  if (needDb(res)) return;
  try {
    const b = bodyOf(req); const name = await userFromToken(authToken(req)); if (!name) return res.status(401).json({ error: '請重新登入' });
    if (!b.data || typeof b.data !== 'object') return res.status(400).json({ error: '資料格式錯誤' });
    await pool.query('UPDATE tk_users SET data=$2, xp=$3, updated_at=now() WHERE name=$1', [name, b.data, Math.max(0, parseInt(b.data.xp, 10) || 0)]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: '伺服器錯誤' }); }
});

/* 登出 */
app.post('/api/logout', async (req, res) => {
  if (needDb(res)) return;
  try { await pool.query('DELETE FROM tk_sessions WHERE token=$1', [String(authToken(req))]); } catch (e) { }
  res.json({ ok: true });
});

/* 排行榜（只取排行需要的欄位） */
app.get('/api/rank', async (req, res) => {
  if (needDb(res)) return;
  try {
    const day = String(req.query.day || '').slice(0, 10);
    const r = await pool.query(`SELECT name, xp, data->'title' AS title, data->'frame' AS frame, data->'best' AS best,
      data->'daily'->$1 AS daily, data->'brain'->'ages' AS ages FROM tk_users ORDER BY xp DESC LIMIT 500`, [day]);
    res.json({ ok: true, list: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: '伺服器錯誤' }); }
});

/* 靜態檔案（遊戲本體） */
const stOpt = { setHeaders: res => res.setHeader('Cache-Control', 'no-cache') };
['css', 'js', 'q'].forEach(d => app.use('/' + d, express.static(path.join(__dirname, d), stOpt)));
app.get(['/', '/index.html'], (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'index.html')); });
app.use((req, res) => res.status(404).send('找不到頁面'));

/* ===== 多人連線對戰 ===== */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map();
const DMUL = { 1: 1, 2: 1.5, 3: 2 };
const MODES = { buzz: '搶答擂台', sync: '同步作答', duel: '一對一對決' };
const AVS = ['😎', '🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🐱'];
let seq = 0;

function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function newCode() { let c; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(c)); return c; }
function pub(p) { return { id: p.id, n: p.n, av: p.av, sc: p.sc, ok: p.ok, buzz: p.buzz, hp: p.hp, gone: !!p.gone }; }
function roomState(r) { return { code: r.code, host: r.host, mode: r.mode, cat: r.cat, diff: r.diff, count: r.count, phase: r.phase, players: r.players.map(pub) }; }
function bc(r, msg) { r.players.forEach(p => { if (!p.gone) send(p.ws, msg); }); }
function bcState(r) { bc(r, { t: 'room', room: roomState(r) }); }
function clearT(r) { (r.timers || []).forEach(t => clearTimeout(t)); r.timers = []; }
function later(r, fn, ms) { r.timers.push(setTimeout(fn, ms)); }
function alive(r) { return r.players.filter(p => !p.gone && !(r.mode === 'duel' && p.hp <= 0)); }

function leave(ws) {
  const r = ws.room; if (!r) return; ws.room = null;
  const p = r.players.find(x => x.ws === ws); if (!p) return;
  if (r.phase === 'lobby') r.players = r.players.filter(x => x !== p); else p.gone = true;
  const live = r.players.filter(x => !x.gone);
  if (!live.length) { clearT(r); rooms.delete(r.code); return; }
  if (r.host === p.id) r.host = live[0].id;
  bc(r, { t: 'info', msg: `${p.n} 離開了房間` });
  bcState(r);
  if (r.phase === 'play') {
    if (r.mode === 'duel' && live.length < 2) return endGame(r);
    if (live.length < 1) return endGame(r);
    checkRound(r);
  }
}

function startGame(r, qs) {
  r.qs = qs.slice(0, r.count); r.count = r.qs.length; r.qi = 0; r.phase = 'play';
  r.players.forEach(p => { p.sc = 0; p.ok = 0; p.buzz = 0; p.hp = 100; });
  bcState(r); bc(r, { t: 'start' });
  later(r, () => nextQ(r), 1500);
}
function nextQ(r) {
  clearT(r);
  if (r.qi >= r.count || (r.mode === 'duel' && r.players.some(p => p.hp <= 0)) || !r.players.some(p => !p.gone)) return endGame(r);
  const q = r.qs[r.qi]; r.round = { picks: {}, order: [], out: new Set(), answerer: null, done: false, open: false, start: Date.now() };
  bc(r, { t: 'q', qi: r.qi, n: r.count, id: q.id, players: r.players.map(pub) });
  if (r.mode === 'buzz') {
    const readMs = 1600 + Math.min(2500, (q.len || 30) * 40);
    later(r, () => openBuzz(r), readMs);
  } else {
    r.round.deadline = Date.now() + 18000;
    later(r, () => revealSync(r), 18500);
  }
}
/* 搶答 */
function openBuzz(r) {
  const R = r.round; if (R.done || R.answerer != null) return;
  R.open = true; bc(r, { t: 'open', out: [...R.out], sec: 12 });
  clearT(r); later(r, () => { if (!R.done && R.answerer == null) { R.done = true; bc(r, { t: 'reveal', kind: 'none', players: r.players.map(pub) }); afterQ(r); } }, 12000);
}
function onBuzz(r, p) {
  const R = r.round; if (!R || R.done || !R.open || R.answerer != null || R.out.has(p.id)) return;
  R.answerer = p.id; R.open = false; p.buzz++; clearT(r);
  bc(r, { t: 'buzzed', id: p.id, sec: 8, players: r.players.map(pub) });
  later(r, () => onBuzzAnswer(r, p, false, null, true), 8500);
}
function onBuzzAnswer(r, p, ok, pk, timeout) {
  const R = r.round; if (!R || R.done || R.answerer !== p.id) return;
  clearT(r); const q = r.qs[r.qi];
  if (ok) {
    const g = Math.round(100 * (DMUL[q.diff] || 1)); p.sc += g; p.ok++; R.done = true;
    bc(r, { t: 'reveal', kind: 'buzzok', id: p.id, gain: g, pk, players: r.players.map(pub) }); afterQ(r);
  } else {
    p.sc -= 50; R.out.add(p.id); R.answerer = null;
    const left = r.players.filter(x => !x.gone && !R.out.has(x.id));
    bc(r, { t: 'buzzwrong', id: p.id, timeout: !!timeout, pk, out: [...R.out], players: r.players.map(pub) });
    if (!left.length) { R.done = true; later(r, () => { bc(r, { t: 'reveal', kind: 'allwrong', players: r.players.map(pub) }); afterQ(r); }, 900); }
    else later(r, () => openBuzz(r), 1200);
  }
}
/* 同步作答／對決 */
function onPick(r, p, ok, pk) {
  const R = r.round; if (!R || R.done || r.mode === 'buzz' || R.picks[p.id]) return;
  if (r.mode === 'duel' && p.hp <= 0) return;
  R.picks[p.id] = { ok: !!ok, pk, ms: Date.now() - R.start }; R.order.push(p.id);
  bc(r, { t: 'picked', id: p.id });
  checkRound(r);
}
function checkRound(r) {
  const R = r.round; if (!R || R.done || r.mode === 'buzz') {
    if (R && !R.done && r.mode === 'buzz' && R.answerer != null && r.players.find(x => x.id === R.answerer && x.gone)) onBuzzAnswer(r, r.players.find(x => x.id === R.answerer), false, null, true);
    return;
  }
  if (alive(r).every(p => R.picks[p.id])) { clearT(r); later(r, () => revealSync(r), 500); }
}
function revealSync(r) {
  const R = r.round; if (!R || R.done) return; R.done = true; clearT(r);
  const q = r.qs[r.qi]; const mul = DMUL[q.diff] || 1;
  const right = R.order.filter(id => R.picks[id].ok);
  let attack = null;
  if (r.mode === 'sync') {
    right.forEach((id, k) => { const p = r.players.find(x => x.id === id); p.sc += Math.round(100 * mul + [60, 30, 15, 0, 0][k]); p.ok++; });
  } else {
    const ps = r.players.filter(p => !p.gone).slice(0, 2);
    if (ps.length === 2) {
      const [a, b] = ps; const ra = R.picks[a.id] && R.picks[a.id].ok, rb = R.picks[b.id] && R.picks[b.id].ok;
      if (ra) a.ok++; if (rb) b.ok++;
      let to = null, dmg = 0;
      if (ra && rb) { to = right[0] === a.id ? b : a; dmg = 15; } else if (ra) { to = b; dmg = 25; } else if (rb) { to = a; dmg = 25; }
      dmg = Math.round(dmg * (q.diff === 3 ? 1.4 : q.diff === 2 ? 1.2 : 1));
      if (to) { to.hp -= dmg; const from = to === a ? b : a; from.sc += dmg; attack = { from: from.id, to: to.id, dmg }; }
    }
  }
  bc(r, { t: 'reveal', kind: 'sync', picks: R.picks, first: right[0] || null, attack, players: r.players.map(pub) });
  afterQ(r);
}
function afterQ(r) { r.qi++; later(r, () => nextQ(r), 5500); }
function endGame(r) {
  clearT(r); r.phase = 'end';
  const key = r.mode === 'duel' ? (p => p.hp * 10000 + p.sc) : (p => p.sc);
  const rank = r.players.filter(p => !p.gone).sort((a, b) => key(b) - key(a)).map(pub);
  bc(r, { t: 'end', rank, mode: r.mode });
  r.phase = 'lobby'; r.players = r.players.filter(p => !p.gone); r.players.forEach(p => { p.sc = 0; p.ok = 0; p.buzz = 0; p.hp = 100; });
  bcState(r);
}

wss.on('connection', ws => {
  ws.id = 'p' + (++seq); ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const r = ws.room; const me = r && r.players.find(x => x.ws === ws);
    switch (m.t) {
      case 'create': {
        leave(ws);
        const code = newCode();
        const room = { code, host: ws.id, mode: MODES[m.mode] ? m.mode : 'sync', cat: String(m.cat || 'mix').slice(0, 20), diff: [0, 1, 2, 3].includes(m.diff) ? m.diff : 0, count: [10, 15, 20].includes(m.count) ? m.count : 10, phase: 'lobby', players: [], timers: [] };
        room.players.push({ id: ws.id, ws, n: cleanName(m.name) || '玩家', av: AVS[0], sc: 0, ok: 0, buzz: 0, hp: 100 });
        rooms.set(code, room); ws.room = room;
        send(ws, { t: 'joined', you: ws.id }); bcState(room); break;
      }
      case 'join': {
        const room = rooms.get(String(m.code || '').trim());
        if (!room) return send(ws, { t: 'err', msg: '找不到這個房間號碼' });
        if (room.phase !== 'lobby') return send(ws, { t: 'err', msg: '這個房間已經開始比賽了' });
        const max = room.mode === 'duel' ? 2 : 5;
        if (room.players.length >= max) return send(ws, { t: 'err', msg: `房間已滿（最多 ${max} 人）` });
        let n = cleanName(m.name) || '玩家'; if (room.players.some(p => p.n === n)) n = (n + (room.players.length + 1)).slice(0, 14);
        leave(ws);
        room.players.push({ id: ws.id, ws, n, av: AVS[room.players.length % AVS.length], sc: 0, ok: 0, buzz: 0, hp: 100 });
        ws.room = room; send(ws, { t: 'joined', you: ws.id });
        bc(room, { t: 'info', msg: `${n} 加入了房間` }); bcState(room); break;
      }
      case 'set': {
        if (!r || r.host !== ws.id || r.phase !== 'lobby') return;
        if (MODES[m.mode]) { if (m.mode === 'duel' && r.players.length > 2) return send(ws, { t: 'err', msg: '一對一對決只能兩個人' }); r.mode = m.mode; }
        if (m.cat) r.cat = String(m.cat).slice(0, 20);
        if ([0, 1, 2, 3].includes(m.diff)) r.diff = m.diff;
        if ([10, 15, 20].includes(m.count)) r.count = m.count;
        bcState(r); break;
      }
      case 'start': {
        if (!r || r.host !== ws.id || r.phase !== 'lobby') return;
        if (r.players.length < 2) return send(ws, { t: 'err', msg: '至少要兩個人才能開始' });
        if (r.mode === 'duel' && r.players.length !== 2) return send(ws, { t: 'err', msg: '一對一對決需要剛好兩個人' });
        const qs = Array.isArray(m.qs) ? m.qs.filter(q => q && typeof q.id === 'string').map(q => ({ id: q.id.slice(0, 40), diff: +q.diff || 1, len: +q.len || 30 })) : [];
        if (qs.length < 3) return send(ws, { t: 'err', msg: '題目準備失敗，請再試一次' });
        startGame(r, qs); break;
      }
      case 'buzz': if (r && me && r.phase === 'play' && r.mode === 'buzz') onBuzz(r, me); break;
      case 'ans': if (r && me && r.phase === 'play') { if (r.mode === 'buzz') onBuzzAnswer(r, me, !!m.ok, m.pk); else onPick(r, me, !!m.ok, m.pk); } break;
      case 'chat': if (r && me) bc(r, { t: 'chat', id: me.id, n: me.n, msg: String(m.msg || '').slice(0, 40) }); break;
      case 'leave': leave(ws); send(ws, { t: 'left' }); break;
    }
  });
  ws.on('close', () => leave(ws));
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) { } }), 25000);

server.listen(PORT, () => console.log(`🦉 叫我全能智慧王 伺服器啟動：連接埠 ${PORT}`));
initDb().catch(e => console.error('❌ 資料庫連線失敗：', e.message));
