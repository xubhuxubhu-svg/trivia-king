/* ===== 題庫系統 =====
 題目格式（每一題一行）：[難度, "題目", "正確答案", "錯誤1", "錯誤2", "錯誤3", "解說"]
 難度：1 普通、2 中等、3 高難度。是非題寫成：[難度, "題目", "對", "錯", "解說"]（正確的放第一個）
 選項顯示時會自動打亂。擴充題目時，請一律加在檔案最後面，不要刪改前面的題目順序（存檔靠順序記住答過哪些題）。
*/
const CATS = [
  { id: 'history', name: '歷史', icon: '📜', title: '時空旅人', tr: ['🏺', '傳國玉璽'] },
  { id: 'geography', name: '地理', icon: '🗺️', title: '環遊世界王', tr: ['🧭', '鄭和羅盤'] },
  { id: 'ent', name: '娛樂明星', icon: '🎬', title: '八卦小天后', tr: ['🎤', '金曲麥克風'] },
  { id: 'sports', name: '體育', icon: '⚽', title: '頭號鐵粉', tr: ['🏅', '奧運金牌'] },
  { id: 'health', name: '健康醫學', icon: '🩺', title: '養生達人', tr: ['💊', '華佗藥箱'] },
  { id: 'zodiac', name: '星座命理', icon: '🔮', title: '鐵口直斷', tr: ['🔮', '水晶球'] },
  { id: 'myth', name: '神話傳說', icon: '🐉', title: '神話說書人', tr: ['🐉', '龍珠'] },
  { id: 'tech', name: '科技生活', icon: '📱', title: '數位仙人', tr: ['💾', '傳說隨身碟'] },
  { id: 'science', name: '自然科學', icon: '🔬', title: '小小科學家', tr: ['🔭', '伽利略望遠鏡'] },
  { id: 'money', name: '商業理財', icon: '💰', title: '理財小財神', tr: ['💰', '聚寶盆'] },
  { id: 'arts', name: '藝術文學', icon: '🎨', title: '文藝青年', tr: ['🖌️', '神筆'] },
  { id: 'acg', name: '動漫電玩', icon: '🎮', title: '宅界大師', tr: ['🕹️', '黃金搖桿'] },
  { id: 'lang', name: '語文成語', icon: '✍️', title: '國文小老師', tr: ['🖋️', '文房四寶'] },
  { id: 'trivia', name: '冷知識', icon: '🧊', title: '冷知識之王', tr: ['🧊', '萬年冰塊'] },
  { id: 'food', name: '美食生活', icon: '🍜', title: '美食評審', tr: ['🥢', '黃金筷子'] },
  { id: 'law', name: '法律公民', icon: '⚖️', title: '正義使者', tr: ['⚖️', '包公鍘刀'] },
  { id: 'news', name: '時事新聞', icon: '📰', title: '新聞主播', tr: ['📰', '號外報紙'] },
  { id: 'logic', name: '動腦推理', icon: '🧩', title: '名偵探', tr: ['🔍', '偵探放大鏡'] },
  { id: 'funny', name: '爆笑搞怪', icon: '🤪', title: '搞笑藝人', tr: ['🤡', '整人玩具盒'] }
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const DIFF = { 0: '混合', 1: '普通', 2: '中等', 3: '高難度' };
const DMUL = { 1: 1, 2: 1.5, 3: 2 };

const QB = {
  list: [], byCat: {}, orders: [], matches: [],
  add(cat, rows) {
    const arr = this.byCat[cat] || (this.byCat[cat] = []);
    for (const r of rows) {
      const n = arr.length;
      const exp = r[r.length - 1]; const opts = r.slice(2, r.length - 1);
      const q = { id: cat + '-' + n, cat, diff: r[0], q: r[1], opts, exp, type: opts.length === 2 ? 'tf' : 'choice' };
      arr.push(q); this.list.push(q);
    }
  },
  order(cat, diff, prompt, items, exp = '') { this.orders.push({ cat, diff, prompt, items, exp, k: this.orders.length }); },
  match(cat, diff, prompt, pairs, exp = '') { this.matches.push({ cat, diff, prompt, pairs, exp, k: this.matches.length }); },
  count(cat) { return cat === 'mix' ? this.list.length : (this.byCat[cat] || []).length; },

  /* 排序題、配對題（從資料自動組合，數量很多） */
  makeOrder(t) {
    const n = Math.min(4, t.items.length); let idx = shuffle(t.items.map((_, i) => i)).slice(0, n).sort((a, b) => a - b);
    return { id: 'o' + t.k + '-' + idx.join('.'), cat: t.cat, diff: t.diff, type: 'order', q: t.prompt, items: idx.map(i => t.items[i]), exp: t.exp || ('正確順序：' + idx.map(i => t.items[i]).join(' → ')) };
  },
  makeMatch(t) {
    const idx = shuffle(t.pairs.map((_, i) => i)).slice(0, 4).sort((a, b) => a - b);
    return { id: 'm' + t.k + '-' + idx.join('.'), cat: t.cat, diff: t.diff, type: 'match', q: t.prompt, pairs: idx.map(i => t.pairs[i]), exp: t.exp || idx.map(i => t.pairs[i].join('－')).join('、') };
  },

  /* 程式自動出題（無限量） */
  gen: {
    arith(d) {
      let a, b, op, ans, q;
      if (d === 1) { a = 2 + rnd(48); b = 2 + rnd(48); op = pickOne(['+', '-']); if (op === '-' && b > a) [a, b] = [b, a]; ans = op === '+' ? a + b : a - b; q = `${a} ${op} ${b} = ？`; }
      else if (d === 2) { a = 3 + rnd(17); b = 3 + rnd(17); const c = 2 + rnd(30); ans = a * b + c; q = `${a} × ${b} ＋ ${c} = ？`; }
      else { a = 12 + rnd(30); b = 11 + rnd(18); const c = 2 + rnd(9); ans = a * b - c * c; q = `${a} × ${b} － ${c}² = ？`; }
      const w = new Set(); while (w.size < 3) { const x = ans + pickOne([-10, -2, -1, 1, 2, 10, 9, -9, 3]) * (d === 1 ? 1 : pickOne([1, 1, 2])); if (x !== ans && x >= 0) w.add(x); }
      return { q: '速算題：' + q, opts: [String(ans), ...[...w].map(String)], exp: '答案是 ' + ans + '，心算練習可以活化大腦喔！' };
    },
    seq(d) {
      let s = [], ans, rule;
      const t = d === 1 ? rnd(2) : d === 2 ? 1 + rnd(3) : 2 + rnd(3);
      if (t === 0) { const a = 1 + rnd(20), k = 2 + rnd(8); for (let i = 0; i < 5; i++) s.push(a + k * i); rule = '每次加 ' + k; }
      else if (t === 1) { const a = 1 + rnd(4), k = 2 + rnd(2); for (let i = 0; i < 5; i++) s.push(a * k ** i); rule = '每次乘 ' + k; }
      else if (t === 2) { const o = rnd(5); for (let i = 1; i <= 5; i++) s.push((i + o) ** 2); rule = '連續數字的平方'; }
      else if (t === 3) { let a = 1 + rnd(3), b = a + 1 + rnd(3); s = [a, b]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); rule = '前兩項相加等於下一項'; }
      else { const a = 2 + rnd(10); let k = 1; s = [a]; while (s.length < 5) { s.push(s[s.length - 1] + k); k += 2; } rule = '差距依序是 1、3、5、7…'; }
      ans = s.pop();
      const w = new Set(); while (w.size < 3) { const x = ans + pickOne([-3, -2, -1, 1, 2, 4, 5, -5, 6]); if (x !== ans && x > 0) w.add(x); }
      return { q: '找規律：' + s.join('、') + '、？', opts: [String(ans), ...[...w].map(String)], exp: '規律：' + rule + '，所以是 ' + ans };
    },
    days(d) {
      const wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const s = rnd(7), n = d === 1 ? 2 + rnd(6) : d === 2 ? 10 + rnd(40) : 100 + rnd(300);
      const ans = wd[(s + n) % 7];
      return { q: `今天是${wd[s]}，再過 ${n} 天是星期幾？`, opts: [ans, ...shuffle(wd.filter(x => x !== ans)).slice(0, 3)], exp: `${n} 除以 7 餘 ${n % 7}，所以往後數 ${n % 7} 天，是${ans}。` };
    },
    pct(d) {
      const base = pickOne([200, 400, 500, 800, 1000, 1200, 1500, 2000]), p = pickOne(d === 1 ? [10, 20, 50] : d === 2 ? [15, 25, 30, 40] : [12, 35, 45, 65]);
      const ans = base * p / 100;
      const w = new Set(); while (w.size < 3) { const x = ans + pickOne([-50, -20, -10, 10, 20, 30, 50, 100]); if (x > 0 && x !== ans) w.add(x); }
      return { q: `百貨週年慶！原價 ${base} 元的商品打折省下 ${p}%，請問省了多少錢？`, opts: [String(ans), ...[...w].map(String)], exp: `${base} × ${p}% ＝ ${ans} 元` };
    }
  },
  genQ(diff) {
    const d = diff || 1 + rnd(3); const k = pickOne(Object.keys(this.gen)); const g = this.gen[k](d);
    return { id: 'g-' + k + '-' + g.q, cat: 'logic', diff: d, type: 'choice', q: g.q, opts: g.opts, exp: g.exp, gen: true };
  },

  /* 出題：優先出沒看過的題目 */
  pick({ cat = 'mix', diff = 0, exclude = new Set(), types = ['choice', 'tf', 'order', 'match'], special = true } = {}) {
    const inCat = x => cat === 'mix' || x.cat === cat;
    const okD = x => !diff || x.diff === diff;
    const seen = P ? P.seen : {};
    // 特殊題型
    if (special) {
      const roll = Math.random();
      if (types.includes('order') && roll < .07) { const ts = this.orders.filter(t => inCat(t) && okD(t)); if (ts.length) { for (let i = 0; i < 6; i++) { const q = this.makeOrder(pickOne(ts)); if (!exclude.has(q.id)) return q; } } }
      if (types.includes('match') && roll >= .07 && roll < .13) { const ts = this.matches.filter(t => inCat(t) && okD(t)); if (ts.length) { for (let i = 0; i < 6; i++) { const q = this.makeMatch(pickOne(ts)); if (!exclude.has(q.id)) return q; } } }
      if ((cat === 'logic' && Math.random() < .35) || (cat === 'mix' && Math.random() < .05)) { const q = this.genQ(diff); if (!exclude.has(q.id)) return q; }
    }
    let pool = (cat === 'mix' ? this.list : (this.byCat[cat] || [])).filter(x => okD(x) && types.includes(x.type) && !exclude.has(x.id));
    if (!pool.length && diff) pool = (cat === 'mix' ? this.list : (this.byCat[cat] || [])).filter(x => types.includes(x.type) && !exclude.has(x.id));
    if (!pool.length) { for (let i = 0; i < 20; i++) { const q = this.genQ(diff); if (!exclude.has(q.id)) return q; } return this.genQ(diff); }
    const fresh = pool.filter(x => !seen[x.id]);
    return pickOne(fresh.length ? fresh : pool);
  },
  /* 某類別（某難度）還有幾題沒出過 */
  remain(cat, diff, exclude) { return (cat === 'mix' ? this.list : (this.byCat[cat] || [])).filter(x => (!diff || x.diff === diff) && !exclude.has(x.id)).length; },
  find(id) { return this.list.find(x => x.id === id); }
};
