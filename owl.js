/* ===== 吉祥物：博士喵（書生貓頭鷹） ===== */
const Owl = {
  hat(ri) {
    // 依學歷換帽子
    if (ri >= 10) return `<g><path d="M62 36 L72 6 L86 26 L100 0 L114 26 L128 6 L138 36 Z" fill="#ffd54a" stroke="#b8860b" stroke-width="3"/><circle cx="100" cy="12" r="5" fill="#e53935"/><circle cx="74" cy="14" r="4" fill="#42a5f5"/><circle cx="126" cy="14" r="4" fill="#66bb6a"/></g>`;
    if (ri >= 4) { const col = ['#222', '#222', '#1a237e', '#4a148c', '#b71c1c', '#004d40', '#3e2723'][ri - 4] || '#222';
      return `<g><path d="M100 4 L160 24 L100 44 L40 24 Z" fill="${col}"/><rect x="72" y="28" width="56" height="16" rx="3" fill="${col}"/><line x1="150" y1="24" x2="154" y2="54" stroke="#ffd54a" stroke-width="3"/><circle cx="154" cy="57" r="5" fill="#ffd54a"/></g>`; }
    if (ri >= 1) return `<g><ellipse cx="100" cy="36" rx="46" ry="10" fill="${['#e53935', '#1e88e5', '#43a047'][ri - 1]}"/><path d="M62 36 Q100 0 138 36 Z" fill="${['#ef5350', '#42a5f5', '#66bb6a'][ri - 1]}"/><circle cx="100" cy="14" r="5" fill="#fff"/></g>`;
    return `<g><path d="M66 38 Q100 4 134 38 Z" fill="#ffca28"/><circle cx="100" cy="12" r="7" fill="#ff7043"/></g>`;
  },
  svg(ri) {
    return `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
<g class="body">
  <ellipse cx="100" cy="212" rx="50" ry="6" fill="rgba(0,0,0,.12)"/>
  <ellipse cx="100" cy="148" rx="60" ry="62" fill="#a8743e"/>
  <ellipse cx="100" cy="160" rx="40" ry="44" fill="#f6e3bf"/>
  <path d="M78 150 q6 6 12 0 M98 150 q6 6 12 0 M88 168 q6 6 12 0 M108 168 q6 6 12 0 M78 184 q6 6 12 0 M98 184 q6 6 12 0" stroke="#d9b98a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g fill="#f29a2e"><path d="M78 206 l-8 8 h20 z"/><path d="M122 206 l-8 8 h20 z"/></g>
  <g class="book extra"><rect x="66" y="150" width="68" height="44" rx="4" fill="#c62828"/><rect x="70" y="153" width="29" height="38" fill="#fff8e1"/><rect x="101" y="153" width="29" height="38" fill="#fff8e1"/><path d="M74 162h20M74 170h20M74 178h16M105 162h20M105 170h20M105 178h16" stroke="#bbb" stroke-width="2"/></g>
  <g class="wingL"><path d="M52 112 Q20 150 44 192 Q60 170 62 130 Z" fill="#8a5a2b"/></g>
  <g class="wingR"><path d="M148 112 Q180 150 156 192 Q140 170 138 130 Z" fill="#8a5a2b"/></g>
  <g class="watch extra"><circle cx="40" cy="178" r="9" fill="#fff" stroke="#555" stroke-width="3"/><path d="M40 172v6l4 3" stroke="#e53935" stroke-width="2" fill="none"/></g>
  <g class="head">
    <path d="M52 60 L44 22 L74 46 Z" fill="#8a5a2b"/><path d="M148 60 L156 22 L126 46 Z" fill="#8a5a2b"/>
    <ellipse cx="100" cy="82" rx="60" ry="52" fill="#a8743e"/>
    <circle cx="76" cy="84" r="25" fill="#fff6e3"/><circle cx="124" cy="84" r="25" fill="#fff6e3"/>
    <g class="eyeball"><circle cx="78" cy="86" r="13" fill="#3a2410"/><circle cx="122" cy="86" r="13" fill="#3a2410"/><circle cx="82" cy="81" r="5" fill="#fff"/><circle cx="126" cy="81" r="5" fill="#fff"/><circle cx="74" cy="91" r="2" fill="#fff"/><circle cx="118" cy="91" r="2" fill="#fff"/></g>
    <g class="smileEye extra" stroke="#3a2410" stroke-width="5" fill="none" stroke-linecap="round"><path d="M66 90 q12 -14 24 0"/><path d="M110 90 q12 -14 24 0"/></g>
    <rect class="lid" x="52" y="60" width="48" height="50" rx="24" fill="#a8743e"/><rect class="lid" x="100" y="60" width="48" height="50" rx="24" fill="#a8743e"/>
    <g stroke="#5a3a1a" stroke-width="3" fill="none" opacity=".75"><circle cx="77" cy="86" r="21"/><circle cx="123" cy="86" r="21"/><path d="M98 84 q2-4 4 0"/></g>
    <circle cx="62" cy="106" r="7" fill="#ff9aa2" opacity=".7"/><circle cx="138" cy="106" r="7" fill="#ff9aa2" opacity=".7"/>
    <path d="M92 100 L108 100 L100 112 Z" fill="#f29a2e"/>
    <path class="beakLow" d="M94 106 L106 106 L100 116 Z" fill="#d97b17"/>
    <g class="shades extra"><rect x="54" y="74" width="44" height="24" rx="10" fill="#111"/><rect x="102" y="74" width="44" height="24" rx="10" fill="#111"/><rect x="96" y="80" width="8" height="4" fill="#111"/><path d="M60 80 l10 0" stroke="#fff" stroke-width="3"/></g>
    <g transform="translate(0,6)">${this.hat(ri)}</g>
    <g class="sweat extra"><path d="M150 60 q8 14 0 18 q-8 -4 0 -18z" fill="#64b5f6"/></g>
  </g>
  <g class="spark extra" fill="#ffd54a"><path d="M20 60 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M178 90 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M170 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>
  <g class="cloud extra"><ellipse cx="100" cy="6" rx="34" ry="14" fill="#90a4ae"/><ellipse cx="80" cy="10" rx="18" ry="12" fill="#90a4ae"/><ellipse cx="122" cy="10" rx="18" ry="12" fill="#90a4ae"/><path d="M84 24v10M100 24v12M116 24v10" stroke="#64b5f6" stroke-width="3" stroke-linecap="round"/></g>
  <g class="zzz extra" font-family="sans-serif" font-weight="900" fill="#7e57c2"><text x="150" y="40" font-size="22">Ｚ</text></g>
  <g class="qmark extra"><text x="160" y="40" font-size="34" font-weight="900" fill="#e53935" font-family="sans-serif">？</text></g>
</g></svg>`;
  },
  mountAll(root = document) {
    const ri = P ? rankIndex() : 0;
    $$('.owl', root).forEach(o => { if (!o.dataset.m || o.dataset.ri != ri) { o.innerHTML = this.svg(ri); o.dataset.m = 1; o.dataset.ri = ri; if (!o.dataset.s) o.dataset.s = 'idle'; } });
  },
  timer: null,
  set(state, ms = 0) {
    clearTimeout(this.timer);
    $$('#view .owl').forEach(o => o.dataset.s = state);
    if (ms) this.timer = setTimeout(() => $$('#view .owl').forEach(o => o.dataset.s = 'idle'), ms);
  }
};
