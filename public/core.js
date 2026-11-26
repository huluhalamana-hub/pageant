// แกนคำนวณคะแนน ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์ (worker) และหน้าเว็บ ไฟล์นี้ต้องเหมือนกันทุกตัวอักษร
export const fmtn = n => String(+Number(n).toFixed(2));
export const key = (r, c, j) => r + ':' + c + ':' + j;
export const gs = (p, r, c, j) => p.sc[key(r, c, j)];
export const gr = (p, r, c) => p.res[r + ':' + c] || {rev: false, votes: null, out: false};
// ตกรอบ: ถ้าถูกกด "ตกรอบ" ในรอบใด จะยังอยู่ในรอบนั้น แต่ไม่อยู่ในทุกรอบถัดไป (เรียงตามลำดับรอบ บนลงล่าง)
export const inR = (p, r, c) => { for (const x of p.rounds) { if (x.id === r) return true; if (gr(p, x.id, c.id).out) return false; } return true; };

export const LBL = {
  th: {avg: 'เฉลี่ย', rank: 'อันดับ ', sum: 'สรุปคะแนน', total: 'คะแนนรวม', tot: 'รวม', jtot: 'คะแนนกรรมการ', votes: 'โหวต', vsc: 'คะแนนโหวต', rv: 'โหวต'},
  en: {avg: 'AVG', rank: 'RANKING · ', sum: 'SUMMARY', total: 'OVERALL', tot: 'TOTAL', jtot: 'JUDGES AVG', votes: 'POPULAR VOTE', vsc: 'VOTE SCORE', rv: 'VOTE'}
};
export const LB = p => LBL[p.lang === 'en' ? 'en' : 'th'];

// คะแนนโหวต (แปลงจำนวนโหวตดิบเป็นคะแนนเต็ม max): vm 'share' = สัดส่วนจากโหวตรวม, 'top' = อิงคนโหวตสูงสุด
const toScore = (p, mine, all) => { const base = p.vm === 'top' ? Math.max(0, ...all) : all.reduce((a, b) => a + b, 0); return base ? mine / base * p.max : 0; };
export const vscoreG = (p, c) => c.votes == null ? null : toScore(p, c.votes, p.C.map(x => x.votes).filter(v => v != null));
export const vsRound = (p, r, c) => {
  const m = gr(p, r, c.id).votes; if (m == null) return null;
  return toScore(p, m, p.C.filter(x => inR(p, r, x)).map(x => gr(p, r, x.id).votes).filter(v => v != null));
};
export const actJ = (p, r) => { const sk = (p.rounds.find(x => x.id === r) || {}).noJ || []; return p.J.filter(j => !sk.includes(j.id)); };
export function calc(p, r, c) {
  const aj = actJ(p, r), scores = p.J.map(j => aj.includes(j) ? gs(p, r, c.id, j.id) ?? null : null);
  return {scores, avg: aj.length ? scores.reduce((a, x) => a + (x || 0), 0) / aj.length : 0, rev: gr(p, r, c.id).rev};
}
export const colsCfg = (p, single, n) => { const hv = p.jw < 100, mr = p.vmode === 'round', gv = hv && mr ? 1 : 0; return {hv, mr, gv, g: n + 1 + gv, tail: single ? (gv ? 1 : 0) : hv && !mr ? 4 : 1}; };

// แบ่งรอบเป็นกลุ่ม: รอบที่ไม่คัดคน = ทุกคนผ่าน → คะแนนต่อรวมกับรอบถัดไป กลุ่มจบที่รอบที่มีการคัดคน (ตั้งจำนวนผู้เข้ารอบ) หรือรอบที่ติ๊ก "จบกลุ่มที่รอบนี้"
export function groupsOf(p, show) {
  const G = []; let cur = [];
  show.forEach((r, i) => { cur.push(r); const q = qcfgOf(p, r.id); if (i < show.length - 1 && (q.n > 0 || q.ge)) { G.push(cur); cur = []; } });
  if (cur.length) G.push(cur);
  return G;
}
export function sumData(p, show, opts) {
  const single = !!(opts && opts.single), hv = p.jw < 100, mr = p.vmode === 'round';
  const agg = a => { if (!a.length) return null; const t = a.reduce((x, y) => x + y, 0); return single || p.agg !== 'sum' ? t / a.length : t; };
  const G = groupsOf(p, show), grouped = G.length > 1 && !single && !(opts && opts.flat), gi = r => G.findIndex(g => g.includes(r));
  const rows = p.C.map(c => {
    const per = show.map(r => {
      if (!inR(p, r.id, c)) return null; const k = calc(p, r.id, c); if (!k.rev) return null;
      const vote = mr && hv ? vsRound(p, r.id, c) : null;
      return {scores: k.scores, avg: k.avg, vote, f: vote != null ? k.avg * p.jw / 100 + vote * (100 - p.jw) / 100 : k.avg, cnt: r.inTotal !== false};
    });
    // กลุ่มสุดท้ายที่คนนี้มีคะแนน (ใช้คิดคะแนนรวม/จัดอันดับ) ไม่แบ่งกลุ่ม = ทุกรอบรวมกัน เหมือนเดิม
    let lg = 0; G.forEach((g, i) => { if (inR(p, g[0].id, c) && per.some((x, k) => x && x.cnt && gi(show[k]) === i)) lg = i; }); // กลุ่มที่เปิดคะแนนแล้วล่าสุด (คนที่ผ่านเข้ากลุ่มใหม่แต่ยังไม่เปิดคะแนน ใช้คะแนนกลุ่มก่อนหน้าไปก่อน ไม่งั้นจะหายจากตาราง)
    const inG = i => per.filter((x, k) => x && x.cnt && gi(show[k]) === i), cn = grouped ? inG(lg) : per.filter(x => x && x.cnt), nr = cn.length, jt = agg(cn.map(x => x.avg));
    let tot = null, vsc = null;
    if (hv && mr) tot = agg(cn.map(x => x.f));
    else if (jt != null) { const vs = hv && !single ? vscoreG(p, c) : null; vsc = vs == null ? null : vs * (p.agg === 'sum' ? nr : 1); tot = vsc != null ? jt * p.jw / 100 + vsc * (100 - p.jw) / 100 : jt; }
    // gt[i] = คะแนนรวมของกลุ่มที่ i (ใช้แสดงเฉพาะกลุ่มที่มีหลายรอบ) / gone[i] = ตกรอบไปก่อนถึงรอบนี้แล้ว (ให้ช่องว่าง) / lv = จำนวนรอบที่ "ผ่าน" ใช้จัดอันดับ: ผ่านรอบมากกว่าอยู่เหนือเสมอ
    const gt = G.map((g, i) => { const a = inG(i); return a.length ? agg(a.map(x => x.f)) : null; });
    const gone = show.map(r => !inR(p, r.id, c)), lv = show.filter(r => inR(p, r.id, c) && !gr(p, r.id, c.id).out).length;
    return {c, per, gone, lv, jt, votes: c.votes ?? null, vsc, tot, gt};
  });
  const ranked = rows.filter(r => r.tot != null).sort((a, b) => b.lv - a.lv || b.tot - a.tot || a.c.no - b.c.no); ranked.forEach((r, i) => { r.rank = i + 1; });
  return {rows, ranked, groups: G.map(g => g.length), grouped};
}

// ---------- คัดผู้เข้ารอบ + ที่นั่ง Popular Vote (wildcard) ----------
// ค่าตั้งต่อรอบเก็บที่ p.qcfg = {รหัสรอบ: {n: จำนวนผู้เข้ารอบ "รวมที่นั่งโหวต" แล้ว, pv: ใช้ที่นั่งโหวตในรอบนี้ไหม (ไม่ตั้ง = เปิด)}}
export const qcfgOf = (p, rid) => { const x = (p.qcfg || {})[rid] || {}; return {n: Math.max(0, Math.floor(+x.n || 0)), pv: x.pv !== false, nm: !!x.nm, ge: !!x.ge, jc: !!x.jc, ob: x.ob === 'n' ? 'n' : 'a', pk: !!x.pk, pn: Math.max(0, Math.floor(+x.pn || 0))}; };
const rv4 = v => v == null ? null : Math.round(v * 1e4), nv = v => v == null ? -Infinity : v, cmpDesc = (x, y) => nv(y) > nv(x) ? 1 : nv(y) < nv(x) ? -1 : 0;
// คำนวณว่าใครควรเข้ารอบ (ใช้แสดงในหน้าแอดมินเท่านั้น ไม่ขึ้นจอจนกว่าแอดมินจะกดประกาศ)
// 1) เรียงตามคะแนนกรรมการเฉลี่ยของรอบนี้ (เสมอ → ดูโหวต → เลขที่) แล้วตัดที่ n คน
// 2) คนโหวตสูงสุดมีสิทธิ์พิเศษ: อยู่ใน n อันดับแรกอยู่แล้ว = ไม่ทำอะไรพิเศษ / ไม่ถึง = ได้ที่นั่งสุดท้าย แล้วคนอันดับ n ตามคะแนนตกรอบแทน (ไม่ส่งสิทธิ์ต่อให้โหวตอันดับ 2)
// 3) เสมอที่ขอบตัดทั้งคะแนนและโหวต → บอกใน tie ให้แอดมินเลือกเอง
export function qualPlan(p, rid) {
  const cfg = qcfgOf(p, rid), nj = actJ(p, rid).length;
  // รอบก่อนหน้าที่ไม่ได้คัดคน (ทุกคนผ่าน) ต้องเอาคะแนนมารวมคิดด้วย ย้อนไปจนถึงรอบที่มีการคัดคนแล้ว (หรือติ๊กจบกลุ่ม) ซึ่งไม่เอามาคิด
  const ix = p.rounds.findIndex(x => x.id === rid), from = [];
  for (let i = ix - 1; i >= 0; i--) { const q = qcfgOf(p, p.rounds[i].id); if (q.n > 0 || q.ge) break; if (p.rounds[i].inTotal !== false) from.unshift(p.rounds[i]); }
  const rs = from.concat(ix >= 0 ? [p.rounds[ix]] : []);
  const votesOf = c => { if (p.vmode !== 'round') return c.votes; const v = rs.map(x => gr(p, x.id, c.id).votes).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  // รอบโหมดติ๊กเลือกคน: เรียงตามจำนวนกรรมการที่ติ๊กเลือกคนนี้ก่อน (เสมอ → คะแนนเฉลี่ย → โหวต → เลขที่)
  const pkDone = cfg.pk ? ((p.pkJ || {})[rid] || []).filter(id => actJ(p, rid).some(j => j.id === id)).length : 0;
  const pool = p.C.filter(c => inR(p, rid, c)).map(c => {
    const s = cfg.pk ? {length: pkDone} : actJ(p, rid).map(j => gs(p, rid, c.id, j.id)).filter(x => x != null);
    const avs = rs.map(x => { const t = actJ(p, x.id).map(j => gs(p, x.id, c.id, j.id)).filter(v => v != null); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null; }).filter(v => v != null);
    return {c, cnt: s.length, pk: cfg.pk ? (p.pk || {})[rid + ':' + c.id] || 0 : 0, avg: avs.length ? avs.reduce((a, b) => a + b, 0) / avs.length : null, votes: votesOf(c) ?? null};
  }).sort((a, b) => (b.pk - a.pk) || cmpDesc(rv4(a.avg), rv4(b.avg)) || cmpDesc(a.votes, b.votes) || a.c.no - b.c.no || a.c.id - b.c.id);
  const same = (a, b) => a.pk === b.pk && rv4(a.avg) === rv4(b.avg) && a.votes === b.votes;
  const res = {cfg, from: from.map(x => x.name), pool, nj, sel: new Set(), tag: {}, tie: [], pvId: 0, pvIn: false, pvTie: [], pvNone: false, need: false, all: false, miss: pool.filter(x => x.cnt < nj).length};
  if (!pool.length) return res;
  if (!cfg.n) { res.need = true; pool.forEach(x => res.sel.add(x.c.id)); return res; }
  if (cfg.n >= pool.length) { res.all = true; pool.forEach(x => { res.sel.add(x.c.id); res.tag[x.c.id] = 'score'; }); return res; }
  let pv = null;
  if (cfg.pv) {
    const vs = pool.filter(x => x.votes != null), mx = vs.length ? Math.max(...vs.map(x => x.votes)) : 0;
    if (mx <= 0) res.pvNone = true;
    else { const top = vs.filter(x => x.votes === mx); pv = top[0]; if (top.length > 1) res.pvTie = top.map(x => x.c.id); } // เสมอโหวตสูงสุด: เอาคนที่คะแนนกรรมการสูงกว่าก่อน (pool เรียงคะแนนอยู่แล้ว)
  }
  let list = pool, k = cfg.n;
  if (pv) { res.pvId = pv.c.id; if (pool.indexOf(pv) < cfg.n) res.pvIn = true; else { list = pool.filter(x => x !== pv); k = cfg.n - 1; } }
  list.slice(0, k).forEach(x => { res.sel.add(x.c.id); res.tag[x.c.id] = 'score'; });
  if (pv) { res.sel.add(pv.c.id); res.tag[pv.c.id] = res.pvIn ? 'pvin' : 'pv'; }
  pool.forEach(x => { if (!res.sel.has(x.c.id)) res.tag[x.c.id] = 'cut'; });
  if (k >= 1 && list[k] && same(list[k - 1], list[k])) res.tie = list.filter(x => same(x, list[k - 1])).map(x => x.c.id);
  return res;
}

const tn = (v, d) => (v === '' || v == null || !Number.isFinite(+v) ? d : +v);
// ข้อมูลสำหรับวาดจอไลฟ์ (view model) เซิร์ฟเวอร์ส่งเฉพาะสิ่งที่เปิดคะแนนแล้วให้หน้าจอสาธารณะ
export function summaryVM(p) {
  const n = p.J.length, single = !!p.rank, L = LB(p); let show, title;
  if (single) { const r = p.rounds.find(x => x.id === p.rank); show = r ? [r] : []; title = L.rank + (r ? r.name : ''); }
  else { show = p.rounds.filter(x => x.inTotal !== false); title = L.sum;
    const sc = show.filter(x => actJ(p, x.id).length && p.C.some(c => inR(p, x.id, c) && calc(p, x.id, c).rev)); if (sc.length) show = sc; }
  const d = sumData(p, show, {single}); if (!d.ranked.length) return null;
  // ส่งทุกคนเรียงจากคะแนนรวมมาก→น้อย ฝั่งหน้าจอเป็นคนแบ่งหน้าต่างตาม per (คนต่อหน้าต่าง) และ sec (วินาทีต่อหน้าต่าง)
  const per = Math.max(1, Math.min(20, Math.round(tn(p.sumPer, 10)))), sec = Math.max(0, tn(p.sumSec, 8));
  // POPULAR VOTE = จำนวนโหวตดิบ แสดงเฉยๆ ไม่นำไปคิดคะแนน (โหวตแยกรอบ = รวมโหวตของรอบที่แสดง)
  const pvOf = r => { if (p.vmode !== 'round') return r.c.votes ?? null; const v = show.map(x => gr(p, x.id, r.c.id).votes).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  const CC = colsCfg(p, single, n);
  // โหวตแยกรอบ + ตารางแบ่งกลุ่ม: คอลัมน์ POPULAR VOTE ต่อท้าย TOTAL ของแต่ละกลุ่ม (โหวตรวมของรอบในกลุ่ม) กลุ่มที่ไม่มีใครมีโหวตเลย = ไม่ขึ้น
  const gl = groupsOf(p, show), multi = p.vmode === 'round' && !single && d.grouped;
  const pgOf = r => gl.map(g => { const v = g.map(x => gr(p, x.id, r.c.id).votes).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; });
  const rows = d.ranked.map(r => ({rank: r.rank, pg: multi ? pgOf(r) : null, gone: r.gone, c: {id: r.c.id, no: r.c.no, name: r.c.name, country: r.c.country, img: r.c.img}, per: r.per, jt: r.jt, votes: r.votes, vsc: r.vsc, tot: r.tot, gt: r.gt, pvv: pvOf(r)}));
  return {title, show: show.map(x => ({id: x.id, name: x.name})), single, rows, grp: d.grouped ? d.groups : null, pgv: multi ? gl.map((g, i) => rows.some(r => r.pg[i] != null)) : null, C: CC, pv: !multi && CC.tail <= 1 && rows.some(r => r.pvv != null), jn: p.showJN !== false, n, J: p.J.map(j => ({name: j.name, img: j.img})), agg: p.agg, jw: p.jw, per, sec};
}
/* ---------- VTR / จอรูปประกาศเข้ารอบ ---------- */
export const VXD = {rv: 0, hold: 5, lo: 'ann', ll: 'both', ls: 8, au: 1, is: 5, fi: 0.6, fo: 0.6, fx: 0.5, hf: 0.5, zm: 1};
export const vxCfg = (p, rid) => ({...VXD, ...((((p.vx || {}).cfg) || {})[rid] || {})});
// ข้อมูลที่จอต้องใช้วาดโหมดรูปเต็มจอ (ตัวจับเวลา/เฟด/วิ่งสุ่มทำฝั่งจอเอง ไฟล์ vtr.js)
function qVM(p) {
  const qv = (p.vx || {}).qv; if (!qv || !qv.m) return null;
  const rid = qv.rid || p.round, cfg = vxCfg(p, rid), all = ((p.vx || {}).items || []);
  // รูปของคน (cid > 0) ใช้ร่วมทุกรอบ: ถ้ารอบนี้มีรูปของคนนั้นใช้ของรอบนี้ ไม่มีก็ใช้ชุดจากรอบล่าสุดที่เคยอัป · ไฟล์ทั่วไป/พื้นหลังก็ใช้ร่วมทุกรอบ (พื้นหลัง: ใช้ของรอบนี้ก่อน ไม่มีก็ใช้อันล่าสุดที่เคยอัป)
  const src = new Map(); all.forEach(x => { if (x.cid > 0) { const o = src.get(x.cid); if (o === undefined || (o !== rid && (x.rid === rid || x.rid > o))) src.set(x.cid, x.rid); } });
  const items = all.filter(x => x.cid > 0 ? src.get(x.cid) === x.rid : true);
  const byId = new Map(p.C.map(c => [c.id, c])), ann = Array.isArray(qv.ids) ? qv.ids : p.annOn ? (p.annIds || []) : [];
  const done = new Set(ann.slice(0, Math.max(0, (+p.annI || 0) + 1))), imgOf = new Map();
  items.forEach(x => { if (x.k === 'i' && x.cid > 0 && byId.has(x.cid) && !imgOf.has(x.cid)) imgOf.set(x.cid, x.u); });
  // วิ่งสุ่ม: ทุกคนที่แข่งในรอบนี้และมีรูป ยกเว้นคนที่ประกาศไปแล้ว
  const pool = [...imgOf].filter(([cid]) => inR(p, rid, byId.get(cid)) && !done.has(cid)).map(([, u]) => u);
  const held = qv.m === 'draw' && +p.annI >= 0 && ann[+p.annI] ? (imgOf.get(ann[+p.annI]) || null) : null;
  // VTR: รูป/วิดีโอทั่วไป + ของคนที่ผ่านเข้ารอบ (คนที่ไม่เข้ารอบถูกตัดออก) ส่วนรูปพื้นหลังรายชื่อ (cid = -1) ไม่ขึ้นใน VTR
  const vtr = items.filter(x => x.cid === 0 || (x.cid > 0 && byId.has(x.cid) && inR(p, rid, byId.get(x.cid)) && !gr(p, rid, x.cid).out)).map(x => ({k: x.k, u: x.u, sec: x.sec}));
  let list = ann.map(id => byId.get(id)).filter(Boolean).map(c => ({no: c.no, name: c.name, country: c.country}));
  if (cfg.lo === 'az') list = list.slice().sort((a, b) => String(a.country || a.name).localeCompare(String(b.country || b.name), 'en', {sensitivity: 'base'}) || String(a.name).localeCompare(String(b.name), 'en', {sensitivity: 'base'}));
  const bgs = items.filter(x => x.cid === -1 && x.k === 'i'), bg = ((bgs.find(x => x.rid === rid) || bgs[bgs.length - 1]) || {}).u || null;
  return {m: qv.m, ts: qv.ts || 0, annI: +p.annI, n: ann.length, cfg, pool, held, vtr, list, bg, col: p.col, big: p.big === 'name' ? 'name' : 'country'};
}
function buildDisplay0(p, opts) {
  const force = !!(opts && opts.force);
  const rd = p.rounds.find(x => x.id === p.round) || {name: ''};
  const vm = {col: p.col, L: LB(p), chip: p.showRound !== false && p.mode !== 'ranking' && rd.name ? rd.name : null, logo: null, bar: null, card: null, sum: null, rev: p.rev, t: {intro: tn(p.introSec, 4), hold: tn(p.holdSec, 0)}, z: {bar: tn(p.barScale, 100), card: tn(p.cardScale, 100), sum: tn(p.sumScale, 100)}};
  if (p.showLogo) vm.logo = p.logo || (force ? '' : null);
  if (!force && p.vx && p.vx.qv && p.vx.qv.m) { const q = qVM(p); if (q) { vm.q = q; vm.chip = null; vm.logo = null; return vm; } }
  if (p.hide && !force) return vm;
  if (p.annOn && !force) { const ac = p.annId ? p.C.find(x => x.id === p.annId) : null; vm.chip = null; if (ac) { const cc = {no: ac.no, name: ac.name, country: ac.country, img: null};
      // ประกาศเข้ารอบตามตั้งค่า "ก่อนเปิดคะแนน จอแสดง": รูปและชื่อ → แถบรูปและชื่อ (ไม่มีช่องคะแนน)
      // รูปและชื่อ / ขีด / ไม่แสดง → แถบรูปและชื่อแบบไม่มีรูป / การ์ดชื่อ → การ์ดชื่อ
      // ประกาศ (ทั้งเข้ารอบและผู้ชนะ) ใช้ตามตั้งค่า "ก่อนเปิดคะแนน จอแสดง": การ์ดชื่อโปร่งใส → การ์ด / แบบอื่น → แถบรูปและชื่อ (ไม่มีช่องคะแนน) รูปตามช่องติ๊ก "แสดงรูปในแถบรูปและชื่อ"
      if (p.pre === 'card') vm.card = {c: cc, lbl: p.annL || ''};
      else vm.bar = {c: cc, judges: p.J.map(j => ({name: j.name, img: j.img})), R: null, cols: false, lbl: p.annL || ''};
      const as = tn(p.annScale, 100); vm.z.card = Math.round(vm.z.card * as / 100); vm.z.bar = Math.round(vm.z.bar * as / 100); }
    return vm; } // โหมดประกาศผู้เข้ารอบ: ขึ้นการ์ดชื่อของคนที่ประกาศอยู่ (ยังไม่กดถัดไป = จอว่าง)
  if (p.mode === 'ranking') { vm.sum = summaryVM(p); return vm; }
  let c = p.C.find(x => x.id === p.cur);
  if (force && (!c || !inR(p, p.round, c))) c = {id: -1, no: 1, name: 'ชื่อผู้เข้าประกวด', country: '', img: null};
  if (!c || (c.id !== -1 && !inR(p, p.round, c))) return vm;
  const qn = qcfgOf(p, p.round);
  if (!force && qn.nm) { // รอบ "ไม่แสดงคะแนน": ไม่มีแถบคะแนนบนจอ หน้าตาตามตัวเลือก "ก่อนเปิดคะแนน จอแสดง" (ขีด = ว่าง เพราะรอบนี้ไม่มีช่องคะแนนให้ขีด)
    const pre = p.pre || 'dash', cc = {no: c.no, name: c.name, country: c.country, img: p.preImg === false ? null : c.img};
    if (pre === 'card') vm.card = {c: cc};
    else if (pre === 'name') vm.bar = {c: cc, judges: p.J.map(j => ({name: j.name, img: j.img})), R: null, cols: false};
    return vm;
  } // กรรมการให้คะแนน/ตารางสรุปปกติ
  const k = calc(p, p.round, c); let R = k.rev ? {scores: k.scores, avg: k.avg} : null;
  if (!R && force) { const sc = p.J.map((_, i) => [8, 7.5, 9, 8.5, 7][i % 5]); R = {scores: sc, avg: sc.reduce((a, b) => a + b, 0) / (sc.length || 1)}; }
  const pre = p.pre || 'dash';
  if (!R && !force && pre === 'none') return vm;
  if (!R && !force && pre === 'card') { vm.card = {c: {no: c.no, name: c.name, country: c.country, img: c.img}}; return vm; }
  const noImg = !R && !force && pre === 'name' && p.preImg === false; // ยังไม่เปิดคะแนน + ปิดรูป: เหลือแต่ตัวหนังสือ พอคะแนนขึ้นรูปกลับมา
  vm.bar = {c: {no: c.no, name: c.name, country: c.country, img: noImg ? null : c.img}, judges: p.J.map(j => ({name: j.name, img: j.img})), R, cols: !(!R && !force && pre === 'name')};
  return vm;
}
// ตัวใหญ่บนการ์ดชื่อ/แถบชื่อ: p.big = 'country' (ประเทศตัวใหญ่ ชื่อตัวเล็ก) หรือ 'name' (สลับกัน) ใช้ทุกที่ที่ขึ้นชื่อบนจอ
export function buildDisplay(p, opts) {
  const vm = buildDisplay0(p, opts), big = p.big === 'name' ? 'name' : 'country';
  if (vm.bar) vm.bar.big = big;
  if (vm.card) vm.card.big = big;
  if (vm.sum) vm.sum.big = big;
  return vm;
}
