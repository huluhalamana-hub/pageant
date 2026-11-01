// แกนคำนวณคะแนน ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์ (worker) และหน้าเว็บ ไฟล์นี้ต้องเหมือนกันทุกตัวอักษร
export const fmtn = n => String(+Number(n).toFixed(2));
export const key = (r, c, j) => r + ':' + c + ':' + j;
export const gs = (p, r, c, j) => p.sc[key(r, c, j)];
export const gr = (p, r, c) => p.res[r + ':' + c] || {rev: false, votes: null, out: false};
export const inR = (p, r, c) => !gr(p, r, c.id).out;

export const LBL = {
  th: {avg: 'เฉลี่ย', rank: 'อันดับ ', sum: 'สรุปคะแนน', total: 'คะแนนรวม', tot: 'รวม', jtot: 'คะแนนกรรมการ', votes: 'โหวต', vsc: 'คะแนนโหวต', rv: 'โหวต'},
  en: {avg: 'AVERAGE', rank: 'RANKING · ', sum: 'SUMMARY', total: 'OVERALL', tot: 'TOTAL', jtot: 'JUDGES AVERAGE', votes: 'POPULAR VOTE', vsc: 'VOTE SCORE', rv: 'VOTE'}
};
export const LB = p => LBL[p.lang === 'en' ? 'en' : 'th'];

// คะแนนโหวต (แปลงจำนวนโหวตดิบเป็นคะแนนเต็ม max): vm 'share' = สัดส่วนจากโหวตรวม, 'top' = อิงคนโหวตสูงสุด
const toScore = (p, mine, all) => { const base = p.vm === 'top' ? Math.max(0, ...all) : all.reduce((a, b) => a + b, 0); return base ? mine / base * p.max : 0; };
export const vscoreG = (p, c) => c.votes == null ? null : toScore(p, c.votes, p.C.map(x => x.votes).filter(v => v != null));
export const vsRound = (p, r, c) => {
  const m = gr(p, r, c.id).votes; if (m == null) return null;
  return toScore(p, m, p.C.filter(x => inR(p, r, x)).map(x => gr(p, r, x.id).votes).filter(v => v != null));
};
export function calc(p, r, c) {
  const scores = p.J.map(j => gs(p, r, c.id, j.id) ?? null);
  return {scores, avg: p.J.length ? scores.reduce((a, x) => a + (x || 0), 0) / p.J.length : 0, rev: gr(p, r, c.id).rev};
}
export const colsCfg = (p, single, n) => { const hv = p.jw < 100, mr = p.vmode === 'round', gv = hv && mr ? 1 : 0; return {hv, mr, gv, g: n + 1 + gv, tail: single ? (gv ? 1 : 0) : hv && !mr ? 4 : 1}; };

export function sumData(p, show, opts) {
  const single = !!(opts && opts.single), hv = p.jw < 100, mr = p.vmode === 'round';
  const agg = a => { if (!a.length) return null; const t = a.reduce((x, y) => x + y, 0); return single || p.agg !== 'sum' ? t / a.length : t; };
  const rows = p.C.map(c => {
    const per = show.map(r => {
      if (!inR(p, r.id, c)) return null; const k = calc(p, r.id, c); if (!k.rev) return null;
      const vote = mr && hv ? vsRound(p, r.id, c) : null;
      return {scores: k.scores, avg: k.avg, vote, f: vote != null ? k.avg * p.jw / 100 + vote * (100 - p.jw) / 100 : k.avg, cnt: r.inTotal !== false};
    });
    const cn = per.filter(x => x && x.cnt), nr = cn.length, jt = agg(cn.map(x => x.avg));
    let tot = null, vsc = null;
    if (hv && mr) tot = agg(cn.map(x => x.f));
    else if (jt != null) { const vs = hv && !single ? vscoreG(p, c) : null; vsc = vs == null ? null : vs * (p.agg === 'sum' ? nr : 1); tot = vsc != null ? jt * p.jw / 100 + vsc * (100 - p.jw) / 100 : jt; }
    return {c, per, jt, votes: c.votes ?? null, vsc, tot};
  });
  const ranked = rows.filter(r => r.tot != null).sort((a, b) => b.tot - a.tot || a.c.no - b.c.no); ranked.forEach((r, i) => { r.rank = i + 1; });
  return {rows, ranked};
}

// ข้อมูลสำหรับวาดจอไลฟ์ (view model) เซิร์ฟเวอร์ส่งเฉพาะสิ่งที่เปิดคะแนนแล้วให้หน้าจอสาธารณะ
function summaryVM(p) {
  const n = p.J.length, single = !!p.rank, L = LB(p); let show, title;
  if (single) { const r = p.rounds.find(x => x.id === p.rank); show = r ? [r] : []; title = L.rank + (r ? r.name : ''); }
  else { show = p.rounds.filter(x => x.inTotal !== false); title = L.sum; }
  const d = sumData(p, show, {single}); if (!d.ranked.length) return null;
  const rows = d.ranked.slice(0, 10).map(r => ({rank: r.rank, c: {no: r.c.no, name: r.c.name, country: r.c.country, img: r.c.img}, per: r.per, jt: r.jt, votes: r.votes, vsc: r.vsc, tot: r.tot}));
  return {title, show: show.map(x => ({id: x.id, name: x.name})), single, rows, C: colsCfg(p, single, n), n, J: p.J.map(j => ({name: j.name, img: j.img})), agg: p.agg, jw: p.jw};
}
export function buildDisplay(p, opts) {
  const force = !!(opts && opts.force);
  const rd = p.rounds.find(x => x.id === p.round) || {name: ''};
  const vm = {col: p.col, L: LB(p), chip: p.showRound !== false && p.mode !== 'ranking' && rd.name ? rd.name : null, logo: null, bar: null, sum: null, rev: p.rev};
  if (p.showLogo) vm.logo = p.logo || (force ? '' : null);
  if (p.hide && !force) return vm;
  if (p.mode === 'ranking') { vm.sum = summaryVM(p); return vm; }
  let c = p.C.find(x => x.id === p.cur);
  if (force && (!c || !inR(p, p.round, c))) c = {id: -1, no: 1, name: 'ชื่อผู้เข้าประกวด', country: '', img: null};
  if (!c || (c.id !== -1 && !inR(p, p.round, c))) return vm;
  const k = calc(p, p.round, c); let R = k.rev ? {scores: k.scores, avg: k.avg} : null;
  if (!R && force) { const sc = p.J.map((_, i) => [8, 7.5, 9, 8.5, 7][i % 5]); R = {scores: sc, avg: sc.reduce((a, b) => a + b, 0) / (sc.length || 1)}; }
  const pre = p.pre || 'dash';
  if (!R && !force && pre === 'none') return vm;
  vm.bar = {c: {no: c.no, name: c.name, country: c.country, img: c.img}, judges: p.J.map(j => ({name: j.name, img: j.img})), R, cols: !(!R && !force && pre === 'name')};
  return vm;
}
