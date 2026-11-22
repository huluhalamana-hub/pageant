import { fmtn, key, gs, gr, inR, vscoreG, vsRound, calc, colsCfg, sumData, buildDisplay, qcfgOf, qualPlan } from './core.js';

const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ph = (u, t) => u ? `<img src="${u}" alt="">` : esc(String(t || '').trim().slice(0, 1));
const th = (u, t) => `<span class="th">${ph(u, t)}</span>`;
function fit() { document.querySelectorAll('.sw').forEach(w => { const c = w.querySelector('.cv'); if (c) c.style.transform = `scale(${w.clientWidth / 1920})`; }); }

/* ---------- จอไลฟ์ ---------- */
const topbar = (t, back) => `<div class="top noprint"><div><b>${t}</b></div><div class="row">${back ? '<button data-a="back">← ผู้ดูแลหลัก</button>' : ''}<button data-a="logout">ออกจากระบบ</button></div></div>`;
function liveV(p) {
  const c = p.C.find(x => x.id === p.cur), rs = c ? gr(p, p.round, c.id) : null;
  const st = p.hide ? 'ซ่อนแถบคะแนนอยู่ (ชื่อรอบและโลโก้ที่เปิดไว้ยังแสดง)' : !c || !inR(p, p.round, c) ? 'แสดงเฉพาะชื่อรอบ (ยังไม่ได้เลือกผู้เข้าประกวด)' : qcfgOf(p, p.round).nm ? ({name: 'แถบรูปและชื่อของ ' + c.name, card: 'การ์ดชื่อของ ' + c.name + ' (เฟดหายเองตามเวลา)'}[p.pre] || 'จอว่างเปล่า') + ' (รอบนี้ไม่แสดงคะแนนบนจอ)' : rs.rev ? 'กำลังแสดงคะแนนของ ' + c.name : ({name: 'แสดงเฉพาะชื่อ รอเปิดคะแนน', dash: 'แสดงช่องคะแนนเป็นขีด รอเปิดคะแนน', none: 'จอว่างเปล่า รอเปิดคะแนน', card: 'การ์ดชื่อ (เฟดหายเองแล้วจอว่าง) รอเปิดคะแนน'})[p.pre || 'dash'];
  return `<p class="mu" style="margin:8px 0">สถานะจอตอนนี้: <b>${esc(st)}</b><br>ชื่อรอบที่มุมซ้ายบนและโลโก้ (ถ้าเปิดไว้) แสดงตลอด ตอนยังไม่เลือกผู้เข้าประกวดหรือกดซ่อน จะไม่มีแถบหรือข้อความอื่นใดบนจอ ถ้าไม่ต้องการชื่อรอบ ปิดได้ที่แท็บจัดการ</p>
  <div class="row"><button data-a="hide" class="${p.hide ? 'p' : ''}">${p.hide ? 'แสดงจอ' : 'ซ่อนจอทั้งหมด'}</button><button data-a="revcur" ${c ? '' : 'disabled'}>${rs && rs.rev ? 'ซ่อนคะแนนคนนี้' : 'เปิดคะแนนคนนี้'}</button><button data-a="prev">← คนก่อนหน้า</button><button data-a="next">คนถัดไป →</button></div>`;
}
function controlV(p) {
  const c = p.C.find(x => x.id === p.cur), rs = c ? gr(p, p.round, c.id) : null, rd = p.rounds.find(x => x.id === p.round) || {name: ''};
  const sub = c ? p.J.filter(j => gs(p, p.round, c.id, j.id) != null).length : 0;
  const B = (a, v, t, on) => `<button data-a="${a}" data-v="${v}" class="${on ? 'p' : ''}">${t}</button>`;
  return dHTMLp(p) + `<div class="box" style="margin-top:10px;text-align:center">${c ? `<div class="jph">${ph(c.img, c.no)}</div><div style="font-size:1.5rem;font-weight:700">${esc(c.country || c.name)}</div>${c.country ? `<div>${esc(c.name)}</div>` : ''}<div class="mu">หมายเลข ${esc(c.no)} · ${esc(rd.name)} · กรรมการส่งแล้ว ${sub}/${p.J.length}</div><div class="mu">${p.J.map(j => (gs(p, p.round, c.id, j.id) != null ? '✓' : '✗') + esc(j.name)).join(' ')}</div>` : '<div class="mu">ยังไม่ได้เลือกผู้เข้าประกวด</div>'}</div>
  <div class="ctl"><button class="big ${rs && !rs.rev ? 'p' : ''}" data-a="revcur" ${c ? '' : 'disabled'}>${rs && rs.rev ? 'ซ่อนคะแนน' : 'เปิดคะแนน'}</button><button class="big ${p.hide ? 'p' : ''}" data-a="hide">${p.hide ? 'แสดงจอ' : 'ซ่อนจอทั้งหมด'}</button><button class="big" data-a="prev">← ก่อนหน้า</button><button class="big" data-a="next">ถัดไป →</button></div>
  <div class="row" style="margin-top:10px">${B('mode', 'current', 'แสดงผู้เข้าประกวด', p.mode === 'current')}${B('mode', 'ranking', 'แสดงอันดับ', p.mode === 'ranking')}</div>
  ${p.mode === 'ranking' ? `<div class="row" style="margin-top:8px">${B('rank', 0, 'สรุปคะแนน', p.rank === 0)}${p.rounds.map(x => B('rank', x.id, esc(x.name), p.rank === x.id)).join('')}</div>` : ''}
  <p class="mu">ปุ่มลัดคีย์บอร์ด (ใช้ได้ในแท็บจอไลฟ์และควบคุมสด): เว้นวรรค = เปิด/ซ่อนคะแนน · H = ซ่อน/แสดงจอ · ลูกศรซ้าย/ขวา = คนก่อนหน้า/ถัดไป · R = สลับผู้เข้าประกวด/อันดับ</p>`;
}
function resultsV(p) {
  const n = p.J.length, d = sumData(p, p.rounds, {flat: true}), list = d.ranked.concat(d.rows.filter(r => r.tot == null)), C = colsCfg(p, false, n), cell0 = v => v == null ? '–' : fmtn(v); const cell = cell0;
  const inc = p.rounds.filter(x => x.inTotal !== false);
  return `<div class="box"><h2>สรุปผลทุกรอบ</h2><p class="mu">คะแนนแต่ละรอบเฉลี่ยกรรมการก่อน แล้วรวมรอบที่ติ๊ก "นับในคะแนนรวม" (${inc.map(x => esc(x.name)).join(', ') || 'ยังไม่ได้เลือกรอบ'}) แบบ${p.agg === 'sum' ? 'บวกรวม' : 'เฉลี่ย'} ${p.jw < 100 ? `ถ้ามีโหวต จะนำมารวมตามสัดส่วนกรรมการ ${p.jw}% / โหวต ${100 - p.jw}%` : 'ตอนนี้ใช้คะแนนกรรมการ 100% (ไม่คิดโหวต)'} เครื่องหมาย * คือรอบที่ไม่ถูกนับ</p>
  <div style="overflow-x:auto"><table><thead><tr><th class="n" rowspan="2">อันดับ</th><th class="n" rowspan="2">เลขที่</th><th rowspan="2">ผู้เข้าประกวด</th>${p.rounds.map(r => `<th class="n" colspan="${C.g}">${esc(r.name)}${r.inTotal === false ? ' *' : ''}</th>`).join('')}<th class="n" colspan="${C.tail}">${C.tail > 1 ? 'คะแนนรวม' : 'รวม'}</th></tr><tr>${p.rounds.map(() => p.J.map(j => `<th class="n">${esc(j.name)}</th>`).join('') + '<th class="n">เฉลี่ย</th>' + (C.gv ? '<th class="n">โหวต</th>' : '')).join('')}${C.tail > 1 ? '<th class="n">คะแนนกรรมการ</th><th class="n">โหวต</th><th class="n">คะแนนโหวต</th><th class="n">รวม</th>' : ''}</tr></thead><tbody>${list.map(r => `<tr><td class="n">${r.rank || '–'}</td><td class="n">${esc(r.c.no)}</td><td>${esc(r.c.country ? r.c.country + ' · ' + r.c.name : r.c.name)}</td>${r.per.map((x, xi) => { const cell = r.gone[xi] ? () => '' : cell0; return p.J.map((j, k) => `<td class="n">${cell(x && x.scores[k])}</td>`).join('') + `<td class="n"><b>${cell(x && x.avg)}</b></td>` + (C.gv ? `<td class="n">${cell(x && x.vote)}</td>` : ''); }).join('')}${C.tail > 1 ? `<td class="n">${cell(r.jt)}</td><td class="n">${r.votes == null ? '–' : r.votes}</td><td class="n">${cell(r.vsc)}</td><td class="n"><b>${cell(r.tot)}</b></td>` : `<td class="n"><b>${cell(r.tot)}</b></td>`}</tr>`).join('')}</tbody></table></div>
  <div class="row noprint" style="margin-top:10px"><button data-a="print">พิมพ์</button><button data-a="copy">คัดลอกตาราง</button><button data-a="csv">ดาวน์โหลด CSV</button></div>
  <p class="mu noprint">ไฟล์ CSV เปิดใน Excel หรือ Google Sheets ได้ (ภาษาไทยแสดงถูกต้อง)</p></div>`;
}
function historyV(p) {
  const L = p.log || [], f = v => v == null ? '–' : esc(v), tm = t => new Date(t).toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'medium'});
  return `<div class="box"><h2>ประวัติการแก้ไขคะแนน</h2><p class="mu">บันทึกทุกครั้งที่แอดมินแก้หรือใส่คะแนนของกรรมการและโหวตในหน้าแอดมิน (ไม่รวมตอนกรรมการส่งคะแนนเอง) บันทึกที่เซิร์ฟเวอร์ ลบหรือแก้ย้อนหลังไม่ได้ เผื่อมีข้อสงสัยจากผู้เข้าประกวด</p>
  ${L.length ? `<div style="overflow-x:auto"><table><thead><tr><th>เวลา</th><th>ผู้แก้</th><th>รอบ</th><th>ผู้เข้าประกวด</th><th>รายการ</th><th class="n">จาก</th><th class="n">เป็น</th></tr></thead><tbody>${L.map(e => `<tr><td>${esc(tm(e.t))}</td><td>${esc(e.who)}</td><td>${esc(e.round)}</td><td>${esc(e.c)}</td><td>${esc(e.what)}</td><td class="n">${f(e.from)}</td><td class="n"><b>${f(e.to)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="mu">ยังไม่มีการแก้ไข</p>'}</div>`;
}
function votesV(p) {
  const mr = p.vmode === 'round', inp = (id, v, dis) => `<input id="${id}" type="number" min="0" step="1" value="${v ?? ''}" ${dis ? 'disabled' : ''} style="width:110px;padding:7px">`;
  return `<div class="box"><h2>คะแนนโหวต</h2><p class="mu">โหมดตอนนี้: <b>${mr ? 'โหวตแยกแต่ละรอบ' : 'โหวตรวมครั้งเดียวทุกรอบ'}</b> (เปลี่ยนได้ที่แท็บจัดการ) กรอกเป็นจำนวนโหวตดิบ ระบบแปลงเป็นคะแนนเอง แล้วนำไปรวมในตารางสรุป${p.jw >= 100 ? '<br><b class="bad">ตอนนี้ตั้งสัดส่วนกรรมการ 100% โหวตจึงยังไม่ถูกนำไปคิด ปรับที่แท็บจัดการ</b>' : ''}</p>
  <div style="overflow-x:auto"><table><thead><tr><th>ผู้เข้าประกวด</th>${mr ? p.rounds.map(r => `<th class="n">${esc(r.name)}</th>`).join('') : '<th class="n">โหวตรวม</th>'}<th class="n">คะแนนโหวต${mr ? ' (' + esc((p.rounds.find(x => x.id === p.round) || {}).name || '') + ')' : ''}</th></tr></thead><tbody>${p.C.map(c => { const v = mr ? vsRound(p, p.round, c) : vscoreG(p, c); return `<tr><td>${esc(c.country ? c.country + ' · ' + c.name : c.name)}</td>${mr ? p.rounds.map(r => `<td class="n">${inp('vr-' + r.id + '-' + c.id, gr(p, r.id, c.id).votes, !inR(p, r.id, c))}</td>`).join('') : `<td class="n">${inp('va-' + c.id, c.votes)}</td>`}<td class="n">${v == null ? '–' : fmtn(v)}</td></tr>`; }).join('') || '<tr><td>ยังไม่มีผู้เข้าประกวด</td></tr>'}</tbody></table></div>
  <div class="row" style="margin-top:10px"><button class="p" data-a="savevotes">บันทึกโหวต</button></div></div>`;
}
/* ---------- CO-ADMIN: สิทธิ์ที่ติ๊กได้ต่อรหัส ---------- */
const COP = [
  ['edit', 'แก้ไขข้อมูลและตั้งค่า (ผู้เข้าประกวด กรรมการ รอบ สี โลโก้ การตั้งค่าจอ)'],
  ['scores', 'แก้ไขคะแนนกรรมการ / คะแนนโหวต'],
  ['advance', 'จัดการผู้เข้ารอบ (ติ๊กเข้ารอบ / ยกเลิกตกรอบ และเปลี่ยนรอบที่ใช้)'],
  ['screen', 'สั่งขึ้นจอ (เลือกคน ถัดไป แสดง/ซ่อนจอ เปิด/ซ่อนคะแนน โหมดตารางอันดับ ประกาศเข้ารอบ)']
];
const NEED = {
  edit: 'addcs addj editc editj jcode jdel del rdadd rdren rddel logoup logoclr preset aadd adel aph aphx img imgdel edall edsave edcancel edph edphx max jw sumPer sumSec sumScale introSec holdSec barScale cardScale annScale agg vm vmode pre big lang',
  screen: 'hide toggle mode rank cur next prev rev revcur ann',
  advance: 'out rd qset qsave qreset qreload',
  scores: 'edsc savesc clrsc savevotes'
};
const NEEDOF = {}; Object.entries(NEED).forEach(([k, s]) => s.split(' ').forEach(x => { NEEDOF[x] = k; }));
const can = k => !ST.co || !!(ST.perms && ST.perms[k]);
const canAny = (...ks) => ks.some(can);
function applyMe(me) { ST.role = me.role === 'co' ? 'admin' : me.role; ST.co = me.role === 'co'; ST.perms = me.perms || null; }
// ซ่อนปุ่ม/กล่องที่ CO-ADMIN คนนี้ไม่มีสิทธิ์ (เซิร์ฟเวอร์ตรวจสิทธิ์จริงอีกชั้นเสมอ)
function coFilter() {
  const hide = el => { el.style.display = 'none'; };
  const needOf = el => { const a = el.dataset.a, v = el.dataset.v; if (a === 'qdo') return can('screen') ? 'advance' : 'screen'; if (a === 'bulk') return ({hide: 'screen', show: 'screen', hideall: 'screen', out: 'advance', qual: 'advance', 'in': 'advance', del: 'edit'})[v]; return a === 'tab' ? null : NEEDOF[a]; };
  app.querySelectorAll('[data-a]').forEach(el => { const n = needOf(el); if (n && !can(n)) hide(el); });
  app.querySelectorAll('[data-need]').forEach(el => { if (!can(el.dataset.need)) hide(el); });
  app.querySelectorAll('[data-need-any]').forEach(el => { if (!canAny(...el.dataset.needAny.split(','))) hide(el); });
  app.querySelectorAll('[data-need-after]').forEach(el => { if (can(el.dataset.needAfter)) return; for (let x = el; x; x = x.nextElementSibling) hide(x); });
  const T = {v: ['scores'], m: ['edit', 'advance', 'screen'], c: ['screen', 'scores']};
  app.querySelectorAll('[data-a="tab"]').forEach(el => { const t = T[el.dataset.v]; if (t && !canAny(...t)) hide(el); });
}
const permBoxes = (cls, perms) => COP.map(([k, t]) => `<label style="margin:4px 0 0;color:var(--ink);display:flex;gap:8px;align-items:flex-start"><input type="checkbox" ${cls}="${k}" ${perms && perms[k] ? 'checked' : ''} style="width:auto;flex:none;margin-top:5px"><span>${t}</span></label>`).join('');
function resetBox() {
  return `<div class="box noprint"><h2>ล้างข้อมูลซ้อม</h2><p class="mu" style="margin:0 0 8px">ล้างแล้วเริ่มซ้อมใหม่ได้ทันที ไม่แตะรายชื่อผู้เข้าประกวด กรรมการ รหัส รูป และค่าตั้งต่าง ๆ ย้อนกลับไม่ได้</p>
    <label style="margin:4px 0 0;color:var(--ink)"><input type="checkbox" id="rs-sc" checked> คะแนนที่กรรมการให้</label>
    <label style="margin:4px 0 0;color:var(--ink)"><input type="checkbox" id="rs-st" checked> สถานะเปิดเผยคะแนน เข้ารอบ/ตกรอบ และการประกาศที่ค้างอยู่ (กลับไปรอบแรก ซ่อนจอ)</label>
    <label style="margin:4px 0 0;color:var(--ink)"><input type="checkbox" id="rs-vt" checked> คะแนนโหวต (Popular Vote)</label>
    <div class="row" style="margin-top:10px"><input id="rs-cf" placeholder="พิมพ์คำว่า ล้าง เพื่อยืนยัน" autocomplete="off"><button class="p" data-a="reset">ล้างข้อมูล</button></div></div>`;
}
function coBox(p) {
  const L = p.CO || [];
  return `<div class="box"><h2>รหัส CO-ADMIN</h2><p class="mu" style="margin:0 0 8px">รหัสผู้ช่วยแอดมินของเวทีนี้ ติ๊กได้ว่าแต่ละรหัสทำอะไรได้บ้าง (ติ๊กแล้วบันทึกทันที) CO-ADMIN จะไม่เห็นรหัสของกรรมการและไม่สามารถสร้าง/ลบ CO-ADMIN คนอื่นได้</p>
    ${L.map(c => `<div class="ci" data-co="${c.id}" style="align-items:flex-start"><div style="min-width:0;flex:1 1 260px"><b>${esc(c.name)}</b><div class="mu">รหัสเข้าระบบ: <b>${esc(c.code)}</b></div>${permBoxes('data-cop', c.perms)}</div><div class="btns"><button data-a="coren" data-id="${c.id}">แก้ชื่อ</button><button data-a="cocode" data-id="${c.id}">เปลี่ยนรหัส</button><button class="d" data-a="codel" data-id="${c.id}">ลบ</button></div></div>`).join('') || '<p class="mu">ยังไม่มี CO-ADMIN</p>'}
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)"><b>เพิ่ม CO-ADMIN</b><div class="row" style="margin-top:6px"><input id="con" placeholder="ชื่อ เช่น STAGE MANAGER"><input id="coc" placeholder="รหัสเข้าระบบ (ตั้งเอง)"></div>${permBoxes('data-newcop', {screen: true})}<button class="p" data-a="coadd" style="margin-top:8px">เพิ่ม CO-ADMIN</button></div></div>`;
}
function copyOpts(list) {
  if (!list.length) return '';
  return `<label>คัดลอกจากเวทีก่อนหน้า (ไม่บังคับ)</label><select id="npf" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;font:inherit;background:var(--bg);color:var(--ink)"><option value="0">ไม่คัดลอก (เวทีเปล่า)</option>${list.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
    <div id="npparts" hidden style="margin-top:6px">${[['settings', 'การตั้งค่าจอไลฟ์และการคิดคะแนน (เวลา ขนาด ภาษา วิธีคิดคะแนน ฯลฯ)'], ['colors', 'สี'], ['logo', 'โลโก้'], ['contestants', 'ผู้เข้าประกวด (ชื่อ ประเทศ เลขที่ รูป — ไม่รวมคะแนน)'], ['judges', 'กรรมการ (ชื่อ รหัส รูป)'], ['rounds', 'รอบ (ชื่อรอบ และการนับรวม — ไม่รวมคะแนน)']].map(([k, t]) => `<label style="margin:4px 0 0;color:var(--ink);display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-npp="${k}" checked style="width:auto;flex:none;margin-top:5px"><span>${t}</span></label>`).join('')}<p class="mu" style="margin:6px 0 0">ไม่คัดลอก: คะแนน ผลเปิดคะแนน/ตกรอบ ประวัติ รหัส CO-ADMIN และสถานะหน้าจอตอนนั้น</p></div>`;
}
const SEL = new Set();
let FOLD = {}; try { FOLD = JSON.parse(localStorage.getItem('pg_fold') || '{}') || {}; } catch (e) {}
const saveFold = () => { try { localStorage.setItem('pg_fold', JSON.stringify(FOLD)); } catch (e) {} };
const elimRound = (p, c) => { for (const r of p.rounds) { if (r.id === p.round) break; if (gr(p, r.id, c.id).out) return r; } return null; };
function selUpd() {
  const p = ST.p, n = [...SEL].filter(i => p.C.some(c => c.id === i)).length, s = $('#seln'), al = $('#selall');
  if (s) s.textContent = 'เลือก ' + n + ' คน'; if (al) al.checked = n > 0 && n === p.C.length;
}
function bulkBar(p) {
  if (!p.C.length) return '';
  const n = [...SEL].filter(i => p.C.some(c => c.id === i)).length;
  return `<div class="row noprint" style="margin:4px 0 8px;padding:8px;border:1px dashed var(--bd);border-radius:10px"><label style="margin:0;display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="checkbox" id="selall" style="width:auto" ${n && n === p.C.length ? 'checked' : ''}> เลือกทั้งหมด</label><span class="mu" id="seln">เลือก ${n} คน</span>
    <div class="btns"><button data-a="bulk" data-v="hide">ซ่อนคะแนน</button><button data-a="bulk" data-v="show">เปิดคะแนน</button><button class="p" data-a="bulk" data-v="qual">เข้ารอบ (ที่ไม่ติ๊กจะตกรอบ)</button><button data-a="bulk" data-v="in">ยกเลิกตกรอบ</button><button class="d" data-a="bulk" data-v="del">ลบ</button><button data-a="bulk" data-v="hideall">ซ่อนคะแนนทุกคน</button></div></div>`;
}
/* ---------- คัดผู้เข้ารอบ + ที่นั่ง Popular Vote ---------- */
let QS = {round: 0, ids: null}; // ติ๊กที่แอดมินแก้เองก่อนกดประกาศ (null = ใช้ตามที่ระบบคำนวณ)
const qdisp = c => c.country ? c.country + ' · ' + c.name : c.name;
const qualSel = (p, pl) => QS.round === p.round && QS.ids ? QS.ids : pl.sel;
const qualCnt = (p, pl, sel) => { const ed = sel !== pl.sel && (sel.size !== pl.sel.size || [...sel].some(i => !pl.sel.has(i))); return `ติ๊กเข้ารอบ <b>${sel.size}</b> คน · ตกรอบ <b>${pl.pool.length - sel.size}</b> คน${ed ? ' · <span class="bad">แก้เองจากที่ระบบคำนวณ</span>' : ''}`; };
function qRoundCfg(p, x) {
  const c = qcfgOf(p, x.id);
  return `<div data-need="advance" style="margin-top:6px"><div class="row" style="align-items:center"><span class="mu">ผู้เข้ารอบ</span><input data-qn="${x.id}" type="number" min="0" max="1000" step="1" value="${c.n || ''}" placeholder="ว่าง = ไม่คัด" style="max-width:110px;flex:none"><span class="mu">คน</span><label style="margin:0;color:var(--ink);display:flex;gap:6px;align-items:center"><input type="checkbox" data-qp="${x.id}" ${c.pv ? 'checked' : ''} style="width:auto"> ที่นั่ง Popular Vote</label><button data-a="qset" data-id="${x.id}">บันทึก</button></div><label style="margin:6px 0 0;color:var(--ink);display:flex;gap:6px;align-items:center"><input type="checkbox" data-qm="${x.id}" ${c.nm ? 'checked' : ''} style="width:auto"> ไม่แสดงคะแนน</label><label style="margin:6px 0 0;color:var(--ink);display:flex;gap:6px;align-items:center"><input type="checkbox" data-qg="${x.id}" ${c.ge ? 'checked' : ''} style="width:auto"> จบกลุ่มที่รอบนี้ (รอบถัดไปไม่เอาคะแนนรอบนี้มารวม แม้ไม่ได้คัดคน)</label><p class="mu" style="margin:2px 0 0">รอบที่ตั้งจำนวนผู้เข้ารอบจะจบกลุ่มเอง · รอบที่ไม่คัดคน (ทุกคนผ่าน) คะแนนจะรวมกับรอบถัดไปในตารางสรุป</p>${c.nm ? '<p class="mu" style="margin:2px 0 0">กรรมการให้คะแนนปกติและเข้าตารางสรุปปกติ · คนสุดท้ายเฟดแล้ว ถ้ากรรมการส่งครบ จะซ่อนจอแล้วไปรอบถัดไปเอง (ถ้าตั้งจำนวนผู้เข้ารอบไว้ จะรอประกาศเข้ารอบก่อน) · ต้องตั้ง "การ์ดชื่อ" (วินาที) มากกว่า 0</p>' : ''}</div>`;
}
function annBar(p) {
  return `<div class="noprint" style="margin:6px 0 10px;padding:8px;border:1px dashed var(--bd);border-radius:10px"><div class="row" style="align-items:center;margin-bottom:4px"><span class="mu">ขนาดการ์ดประกาศบนจอ (% · 100 = ปกติ)</span><input id="annScale" type="number" min="30" max="200" value="${p.annScale || 100}" style="max-width:90px;flex:none"><button data-a="annScale">บันทึก</button></div><div class="btns" style="margin-top:6px"><button class="p" data-a="ann" data-v="start">▶ เริ่มประกาศเข้ารอบ</button><button data-a="ann" data-v="stop">หยุดประกาศ</button>${p.annOn ? `<button data-a="prev">◀ ก่อนหน้า</button><button class="p" data-a="next">ถัดไป ▶</button>` : ''}</div>${p.annOn ? `<div style="margin-top:8px"><b>ลำดับประกาศ</b><ol style="margin:4px 0 0;padding-left:22px">${(p.annIds || []).map((id, i) => { const c = p.C.find(x => x.id === id); return c ? `<li style="${i === p.annI ? 'color:var(--gold);font-weight:700' : i < p.annI ? 'opacity:.5' : ''}">${esc(c.country ? c.country + ' · ' + c.name : c.name)}${i === p.annI ? ' ◀ กำลังขึ้นจอ' : i === p.annI + 1 ? ' (คนถัดไป)' : ''}</li>` : ''; }).join('')}</ol></div><div class="mu" style="margin-top:6px">กำลังประกาศเข้ารอบ: ขึ้นการ์ดแล้ว ${Math.max(0, p.annI + 1)}/${p.annN} คน · กด "ถัดไป" เพื่อขึ้นการ์ดคนต่อไป (การ์ดค้างตามเวลา "การ์ดชื่อ" ที่ตั้งไว้ แล้วเฟดหายเอง) · พอการ์ดคนสุดท้ายเฟดหาย ระบบจะซ่อนจอแล้วไปรอบถัดไปให้เอง (หรือกดถัดไปหลังคนสุดท้ายเพื่อจบทันที)</div>` : ''}</div>`;
}
function qualV(p) {
  const rd = p.rounds.find(x => x.id === p.round); if (!rd) return '';
  const head = `<div class="box" data-need="advance"><h2>คัดผู้เข้ารอบ · ${esc(rd.name)}</h2>${annBar(p)}`;
  const cfg = qcfgOf(p, rd.id), pl = qualPlan(p, rd.id), sel = qualSel(p, pl), nm = id => { const c = p.C.find(x => x.id === id); return c ? esc(qdisp(c)) : ''; };
  let h = head + `<p class="mu" style="margin:0 0 8px">เรียงตามคะแนนกรรมการเฉลี่ยของรอบนี้ แล้วตัดที่จำนวนที่ตั้ง · คนที่โหวตสูงสุดมีสิทธิ์พิเศษ: ถ้าอยู่ในอันดับที่ผ่านอยู่แล้วไม่ต้องทำอะไร ถ้าไม่ถึงจะได้เป็นที่นั่งสุดท้าย และคนอันดับสุดท้ายของคะแนนตกรอบแทน (ไม่ส่งสิทธิ์ต่อให้โหวตอันดับ 2) · เสมอที่ขอบตัด ดูโหวตก่อน ถ้ายังเท่ากันให้แอดมินติ๊กเลือกเอง · ผลนี้เห็นเฉพาะหน้าแอดมิน ยังไม่ขึ้นจอจนกว่าจะกด "ประกาศเข้ารอบ"</p>
    <p class="mu" style="margin:0 0 6px">ค่าที่ตั้งไว้: ${cfg.n ? `เข้ารอบ <b>${cfg.n}</b> คน (รวมที่นั่ง Popular Vote) · ที่นั่ง Popular Vote <b>${cfg.pv ? 'เปิด' : 'ปิด'}</b>` : '<b>ไม่ได้ตั้งจำนวนผู้เข้ารอบ</b>'} · แก้ได้ที่กล่อง "รอบ" ด้านบน (ช่อง "ผู้เข้ารอบ" ของแต่ละรอบ)</p>`;
  if (!pl.pool.length) return h + '<p class="mu">ไม่มีผู้เข้าประกวดเหลืออยู่ในรอบนี้</p></div>';
  if (pl.need) return h + '<p class="mu">รอบนี้ไม่ได้ตั้งจำนวนผู้เข้ารอบ = ไม่คัดคนออกอัตโนมัติ (รอบสุดท้ายก็ปล่อยว่างได้) ถ้าต้องการให้คัด ไปใส่จำนวนที่กล่อง "รอบ" ด้านบน</p></div>';
  const W = t => `<p class="bad" style="margin:6px 0 0">${t}</p>`;
  if (pl.from && pl.from.length) h += `<p class="mu" style="margin:6px 0 0">คิดคะแนนรวมจากรอบ: <b>${pl.from.map(esc).join(' + ')} + ${esc(rd.name)}</b> (รอบก่อนหน้าไม่ได้คัดคน ทุกคนผ่านมา จึงนับคะแนนรวมกัน)</p>`;
  if (pl.miss) h += W(`กรรมการยังให้คะแนนไม่ครบ ${pl.miss} คน จากทั้งหมด ${pl.pool.length} คน ผลด้านล่างคิดจากคะแนนที่มีตอนนี้ (ถ้ากรรมการบางท่านไม่มา กดประกาศได้เมื่อพร้อม)`);
  if (cfg.pv && pl.pvNone) h += W('ยังไม่ได้กรอกโหวตของรอบนี้ (แท็บโหวต) จึงยังไม่มีที่นั่ง Popular Vote ตอนนี้คัดจากคะแนนกรรมการล้วน');
  if (pl.pvTie.length) h += W(`โหวตสูงสุดเท่ากัน ${pl.pvTie.length} คน (${pl.pvTie.map(nm).join(', ')}) ระบบให้คนที่คะแนนกรรมการสูงกว่าก่อน ปรับติ๊กเองได้`);
  if (pl.tie.length) h += W(`เสมอที่ขอบตัดทั้งคะแนนและโหวต: ${pl.tie.map(nm).join(', ')} ระบบเรียงตามเลขที่ไว้ให้ก่อน แอดมินเลือกเองแล้วติ๊กแก้ได้`);
  if (pl.all) h += '<p class="mu" style="margin:6px 0 0">จำนวนที่ตั้งมากกว่าหรือเท่ากับคนที่เหลือในรอบนี้ ทุกคนเข้ารอบ</p>';
  h += `<div style="margin-top:8px">${pl.pool.map((x, i) => { const c = x.c, t = pl.tag[c.id], on = sel.has(c.id), tie = pl.tie.includes(c.id);
    return `<div class="ci ${on ? '' : 'out'}"><div class="l"><input type="checkbox" data-q="${c.id}" ${on ? 'checked' : ''} style="width:auto;flex:none">${th(c.img, c.name)}<div style="min-width:0"><span class="mu">#${i + 1}</span> <b style="color:var(--gold)">${esc(c.no)}</b> ${esc(qdisp(c))}${t === 'pv' ? ' <span class="chip">ที่นั่ง Popular Vote</span>' : t === 'pvin' ? ' <span class="chip">โหวตสูงสุด (อยู่ในอันดับที่ผ่านอยู่แล้ว)</span>' : ''}${tie ? ' <span class="chip" style="color:var(--bad)">เสมอที่ขอบตัด</span>' : ''}<div class="mu">เฉลี่ย ${x.avg == null ? '–' : fmtn(x.avg)} · กรรมการให้แล้ว ${x.cnt}/${pl.nj} · โหวต ${x.votes == null ? '–' : x.votes}</div></div></div></div>`; }).join('')}</div>
    <div class="mu" id="qcnt" style="margin-top:6px">${qualCnt(p, pl, sel)}</div>
    <div class="btns" style="margin-top:8px"><button class="p" data-a="qdo">▶ ประกาศเข้ารอบ</button><button data-a="qsave">บันทึกผลเข้า/ตกรอบ (ยังไม่ประกาศ)</button><button data-a="qreset">รีเซ็ตตามที่ระบบคำนวณ</button><button data-a="qreload">รีเฟรชคะแนนล่าสุด</button></div>
    <p class="mu">กด "ประกาศเข้ารอบ" ปุ่มเดียว: ระบบบันทึกว่าใครเข้า/ตกรอบ แล้วสุ่มลำดับและเริ่มประกาศบนจอเหมือนเดิม (กด "ถัดไป" ทีละคน) · หน้านี้ไม่รีเฟรชเอง ถ้ามีคะแนนเข้าเพิ่มให้กด "รีเฟรชคะแนนล่าสุด"</p></div>`;
  return h;
}
async function qualRun(announce) {
  try { await load(); } catch (e) {}
  const p = ST.p, pl = qualPlan(p, p.round), sel = qualSel(p, pl);
  if (!pl.pool.length) return alert('ไม่มีผู้เข้าประกวดเหลืออยู่ในรอบนี้');
  if (pl.need) return alert('ตั้งจำนวนผู้เข้ารอบก่อน แล้วกดบันทึก');
  if (!sel.size) return alert('ยังไม่ได้ติ๊กผู้เข้ารอบ');
  const out = pl.pool.filter(x => !sel.has(x.c.id));
  if (!confirm(`เข้ารอบ ${sel.size} คน · ตกรอบ ${out.length} คน${out.length ? '\n(ตกรอบ: ' + out.map(x => qdisp(x.c)).join(', ') + ')' : ''}${announce ? '\nจากนั้นเริ่มประกาศเข้ารอบบนจอไลฟ์ทันที' : ''}\nตกลงไหม?`)) return render();
  try { await api('admin/qualify', {ids: [...sel]}); } catch (e) { alert(e.message); try { await load(); } catch (er) {} return render(); }
  QS = {round: 0, ids: null};
  if (announce) return act('annstart', {});
  try { await load(); } catch (e) {} render();
}
/* ---------- แก้ไขผู้เข้าประกวดเป็นช่อง (หลายคนพร้อมกัน) ---------- */
let EDC = null; // {pg, rows:[{id,no,country,name,img,o:{no,country,name}}]}
const edActive = p => { if (EDC && EDC.pg !== p.id) EDC = null; return !!EDC; };
const edChanged = r => r.no !== r.o.no || r.country !== r.o.country || r.name !== r.o.name;
const edRowsV = () => '<div class="addr addh"><span>เลขที่</span><span>รูป</span><span>ประเทศ</span><span>ชื่อ</span><span></span></div>' + EDC.rows.map((r, i) => `<div class="addr"><input class="a-no" data-ei="${i}" data-ef="no" inputmode="numeric" placeholder="เลขที่" value="${esc(r.no)}"><div class="aph a-ph"><button class="ap" data-a="edph" data-id="${i}" title="เปลี่ยนรูป">${r.img ? `<img src="${r.img}" alt="">` : '+'}</button>${r.img ? `<button class="aphx" data-a="edphx" data-id="${i}" title="ลบรูป">×</button>` : ''}</div><input class="a-ct" data-ei="${i}" data-ef="country" placeholder="ประเทศ (ไม่บังคับ)" value="${esc(r.country)}"><input class="a-nm" data-ei="${i}" data-ef="name" placeholder="ชื่อ" value="${esc(r.name)}"><span class="a-dl"></span></div>`).join('');
const refreshEd = () => { const t = $('#edt'); if (t) t.innerHTML = edRowsV(); };
const edSyncImgs = () => { EDC.rows.forEach(r => { const c = ST.p.C.find(x => x.id === r.id); if (c) r.img = c.img; }); };
function editBoxV(p) {
  return `<p class="mu" style="margin:0 0 8px">แก้เลขที่ ประเทศ ชื่อ ในช่องได้เลยหลายคนพร้อมกัน แล้วกด <b>บันทึกทั้งหมด</b> ครั้งเดียว · รูป: แตะวงกลมเพื่อเปลี่ยน กด × เพื่อลบ (รูปบันทึกทันทีที่เลือก/ลบ ไม่ต้องรอปุ่มบันทึก)</p><div id="edt">${edRowsV()}</div>
    <div class="row" style="margin-top:8px"><button class="p" data-a="edsave">บันทึกทั้งหมด</button><button data-a="edcancel">ยกเลิก</button></div>`;
}
function edStart(focusId) {
  const p = ST.p; EDC = {pg: p.id, rows: p.C.map(c => { const o = {no: String(c.no ?? ''), country: c.country || '', name: c.name}; return {id: c.id, img: c.img, ...o, o}; })};
  render();
  if (focusId) setTimeout(() => { const i = EDC ? EDC.rows.findIndex(r => r.id === focusId) : -1, el = i >= 0 && document.querySelector(`[data-ei="${i}"][data-ef="name"]`); if (el) { el.scrollIntoView({block: 'center'}); el.focus(); } }, 0);
}
function foldInit() {
  app.querySelectorAll(':scope > .box > h2:first-child').forEach((h, i) => {
    const bx = h.parentElement, key = view + ':' + i, fb = document.createElement('div'); fb.className = 'fb';
    [...bx.childNodes].slice(1).forEach(nd => fb.appendChild(nd)); bx.appendChild(fb);
    h.classList.add('fold'); h.dataset.fk = key;
    if (FOLD[key]) { h.classList.add('c'); fb.hidden = true; }
  });
}
function foldToggle(h) {
  const fb = h.nextElementSibling; if (!fb || !fb.classList.contains('fb')) return;
  const c = !fb.hidden; fb.hidden = c; h.classList.toggle('c', c); FOLD[h.dataset.fk] = c; saveFold(); fit();
}
function foldAll(on) {
  app.querySelectorAll('h2.fold').forEach(h => { const fb = h.nextElementSibling; if (!fb) return; fb.hidden = on; h.classList.toggle('c', on); FOLD[h.dataset.fk] = on; }); saveFold(); fit();
}
function manageV(p) {
  const rd = p.rounds.find(x => x.id === p.round) || {name: ''}, n = p.J.length;
  const B = (a, v, t, on) => `<button data-a="${a}" data-v="${v}" class="${on ? 'p' : ''}">${t}</button>`;
  return `<div class="row noprint" style="margin-bottom:10px"><button data-a="foldall" data-v="1">ยุบหัวข้อทั้งหมด</button><button data-a="foldall" data-v="0">ขยายทั้งหมด</button></div><div class="box" data-need="edit"><h2>สีและโลโก้บนจอไลฟ์</h2>${dHTMLp(p, true)}
    <div class="row" style="margin-top:10px">${PRE.map((x, i) => `<button data-a="preset" data-id="${i}"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${x[1]};margin-right:6px;vertical-align:middle"></span>${x[0]}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><label style="flex:1">สีหลัก<input id="c1" type="color" value="${p.col.c1}" style="padding:2px;height:42px"></label><label style="flex:1">สีพื้นแถบ<input id="c2" type="color" value="${p.col.c2}" style="padding:2px;height:42px"></label><label style="flex:1">สีตัวหนังสือ<input id="c3" type="color" value="${p.col.c3}" style="padding:2px;height:42px"></label></div>
    <label>ภาษาป้ายบนจอ</label><div class="row">${B('lang', 'th', 'ไทย', (p.lang || 'th') === 'th')}${B('lang', 'en', 'English', p.lang === 'en')}</div><label><input type="checkbox" id="showlogo" style="width:auto" ${p.showLogo ? 'checked' : ''}> แสดงโลโก้บนจอ</label><label><input type="checkbox" id="showround" style="width:auto" ${p.showRound !== false ? 'checked' : ''}> แสดงชื่อรอบที่มุมซ้ายบนจอตลอด (กด "ใช้รอบนี้" แล้วขึ้นทันที)</label><div class="row"><button data-a="logoup">อัปโหลดโลโก้</button>${p.logo ? '<button class="d" data-a="logoclr">ลบโลโก้</button>' : ''}</div></div>
  <div class="box" data-need="edit"><h2>การแสดงผลและคะแนน</h2><div class="row">${B('mode', 'current', 'แสดงผู้เข้าประกวดปัจจุบัน', p.mode === 'current')}${B('mode', 'ranking', 'แสดงอันดับ', p.mode === 'ranking')}</div>
    ${p.mode === 'ranking' ? `<label>อันดับที่จะแสดง</label><div class="row">${B('rank', 0, 'สรุปคะแนน (รอบที่ติ๊ก)', p.rank === 0)}${p.rounds.map(x => B('rank', x.id, esc(x.name), p.rank === x.id)).join('')}</div>` : ''}
    <label>ก่อนเปิดคะแนน จอแสดง</label><div class="row">${B('pre', 'name', 'เฉพาะรูปและชื่อ', p.pre === 'name')}${B('pre', 'dash', 'ช่องคะแนนเป็นขีด', (p.pre || 'dash') === 'dash')}${B('pre', 'none', 'ว่างจนกว่าจะเปิดคะแนน', p.pre === 'none')}${B('pre', 'card', 'การ์ดชื่อโปร่งใส', p.pre === 'card')}</div><label><input type="checkbox" id="preimg" style="width:auto" ${p.preImg !== false ? 'checked' : ''}> แสดงรูปในแถบรูปและชื่อ (ไม่ติ๊ก = เหลือแต่ตัวหนังสือ · พอเปิดคะแนนรูปขึ้นเหมือนเดิม)</label><label>ตัวใหญ่บนการ์ดชื่อและแถบชื่อ</label><div class="row">${B('big', 'country', 'ประเทศตัวใหญ่', (p.big || 'country') === 'country')}${B('big', 'name', 'ชื่อตัวใหญ่', p.big === 'name')}</div>
    <label>การ์ดชื่อค้างไว้ก่อนเฟดหาย (วินาที · 0 = ค้างไว้ไม่เฟดเอง)</label><div class="row"><input id="introSec" type="number" min="0" max="600" step="0.5" value="${p.introSec}" style="max-width:120px;flex:none"><button data-a="introSec">บันทึก</button></div>
    <label>คะแนนค้างไว้ก่อนเฟดออก (วินาที · 0 = ค้างไว้ไม่เฟดเอง)</label><div class="row"><input id="holdSec" type="number" min="0" max="600" step="0.5" value="${p.holdSec}" style="max-width:120px;flex:none"><button data-a="holdSec">บันทึก</button></div><label>ขนาดการ์ดชื่อบนจอ (% · 100 = ปกติ)</label><div class="row"><input id="cardScale" type="number" min="30" max="150" value="${p.cardScale}" style="max-width:120px;flex:none"><button data-a="cardScale">บันทึก</button></div>
    <label>ขนาดตารางคะแนนรวมบนจอ (% · 100 = ปกติ · ตารางอยู่กึ่งกลางจอเสมอ)</label><div class="row"><input id="sumScale" type="number" min="30" max="150" value="${p.sumScale}" style="max-width:120px;flex:none"><button data-a="sumScale">บันทึก</button></div>
    <label>ขนาดแถบคะแนนบนจอ (% · 100 = ปกติ)</label><div class="row"><input id="barScale" type="number" min="30" max="150" value="${p.barScale}" style="max-width:120px;flex:none"><button data-a="barScale">บันทึก</button></div>
    <label>ตารางคะแนนรวม: แสดงทีละกี่คน (ต่อ 1 หน้าต่าง)</label><div class="row"><input id="sumPer" type="number" min="1" max="20" value="${p.sumPer}" style="max-width:120px;flex:none"><button data-a="sumPer">บันทึก</button></div>
    <label>ตารางคะแนนรวม: แต่ละหน้าต่างแสดงกี่วินาที (0 = ค้างหน้าแรกไว้ ไม่เปลี่ยนหน้า ไม่เฟดเอง)</label><div class="row"><input id="sumSec" type="number" min="0" max="600" step="0.5" value="${p.sumSec}" style="max-width:120px;flex:none"><button data-a="sumSec">บันทึก</button></div>
    <p class="mu">เรียงจากคะแนนรวมมาก→น้อย เช่น มี 24 คน ตั้ง 10 คน = หน้าต่าง 1 (อันดับ 1-10) → 2 (11-20) → 3 (21-24) พอหน้าต่างสุดท้ายครบเวลาจะเฟดหายไปเลย ตัวอย่างในหน้าแอดมินแสดงเฉพาะหน้าต่างแรก</p>
    <p class="mu">เวลาทั้งสองค่าทำงานบนจอไลฟ์จริง (ตัวอย่างในหน้าแอดมินแสดงค้างไว้ไม่เฟดเอง) การ์ดชื่อใช้เฉพาะเมื่อเลือกโหมด "การ์ดชื่อ" ด้านบน</p>
    <label>คะแนนรวม คิดแบบ</label><div class="row">${B('agg', 'avg', 'เฉลี่ยทุกรอบ', p.agg === 'avg')}${B('agg', 'sum', 'บวกรวมทุกรอบ', p.agg === 'sum')}</div>
    <label><input type="checkbox" id="auto" style="width:auto" ${p.auto ? 'checked' : ''}> เปิดคะแนนอัตโนมัติเมื่อกรรมการส่งครบ</label>
    <label>คะแนนเต็ม</label><div class="row"><input id="max" type="number" value="${p.max}" style="max-width:120px;flex:none"><button data-a="max">บันทึก</button></div>
    <label>สัดส่วน: กรรมการ <b>${p.jw}%</b> · โหวต <b>${100 - p.jw}%</b></label><div class="row"><input id="jw" type="number" min="0" max="100" value="${p.jw}" style="max-width:120px;flex:none"><button data-a="jw">บันทึก (% ของกรรมการ)</button></div><p class="mu">วิธีคิด: เอาคะแนนกรรมการของแต่ละรอบมาเฉลี่ยก่อน แล้วรวมรอบที่ติ๊กไว้ ถ้าไม่มีโหวต (หรือตั้งกรรมการ 100%) นั่นคือคะแนนรวมเลย ถ้ามีโหวต เอาคะแนนกรรมการที่เฉลี่ยแล้วมาคิดกับคะแนนโหวตตามสัดส่วน (กรรมการ ${p.jw}% + โหวต ${100 - p.jw}%) แล้วค่อยรวม กรอกโหวตที่แท็บ "โหวต"</p>
    <label>การนับโหวต</label><div class="row">${B('vmode', 'all', 'โหวตรวมครั้งเดียวทุกรอบ', (p.vmode || 'all') === 'all')}${B('vmode', 'round', 'โหวตแยกแต่ละรอบ', p.vmode === 'round')}</div>
    <label>แปลงจำนวนโหวตเป็นคะแนน</label><div class="row">${B('vm', 'share', 'สัดส่วนจากโหวตรวม', p.vm === 'share')}${B('vm', 'top', 'อิงคนโหวตสูงสุด', p.vm === 'top')}</div>
    <p class="mu">${p.vm === 'share' ? `สัดส่วนจากโหวตรวม: คะแนนโหวต = โหวตของคนนั้น ÷ โหวตรวมของทุกคน x ${p.max} เช่น โหวตรวม 1600 ได้ 1000 → ${fmtn(1000 / 1600 * p.max)}, 500 → ${fmtn(500 / 1600 * p.max)}, 100 → ${fmtn(100 / 1600 * p.max)}` : `อิงคนโหวตสูงสุด: คนโหวตมากสุดได้เต็ม ${p.max} คนอื่นตามสัดส่วน เช่น 1000 → ${p.max}, 500 → ${fmtn(p.max / 2)}, 100 → ${fmtn(p.max / 10)}`}</p></div>
  <div class="box" data-need-any="edit,advance"><h2>รอบ</h2><p class="mu" style="margin:0 0 8px">กด "ใช้รอบนี้" แล้วจอจะถูกซ่อนไว้ก่อน (เหมือนกด "ซ่อนจอทั้งหมด") กด "แสดงจอ" เมื่อพร้อมให้คนแรกขึ้น</p>${p.rounds.map(x => `<div class="ci"><div>${esc(x.name)} ${x.id === p.round ? '<span class="ok">· กำลังใช้</span>' : ''}<label data-need="edit" style="margin:4px 0 0;color:var(--ink)"><input type="checkbox" data-t="${x.id}" ${x.inTotal !== false ? 'checked' : ''} style="width:auto"> นับในคะแนนรวม</label>${qRoundCfg(p, x)}</div><div class="btns">${x.id === p.round ? '' : `<button data-a="rd" data-id="${x.id}">ใช้รอบนี้</button>`}<button data-a="rdren" data-id="${x.id}">เปลี่ยนชื่อ</button><button class="d" data-a="rddel" data-id="${x.id}">ลบ</button></div></div>`).join('')}
    <div class="row" data-need="edit" style="margin-top:10px"><input id="rn" placeholder="ชื่อรอบ เช่น รอบชุดราตรี"><button class="p" data-a="rdadd">เพิ่มรอบ</button></div></div>
  ${qualV(p)}<div class="box"><h2>ผู้เข้าประกวด · รอบ: ${esc(rd.name)}</h2>${edActive(p) ? editBoxV(p) : '<div class="row noprint" data-need="edit" style="margin:0 0 8px"><button data-a="edall">✎ แก้ไขชื่อ/เลขที่/รูป เป็นช่อง (หลายคนพร้อมกัน)</button></div>' + bulkBar(p) + (p.C.map(c => {
    const rs = gr(p, p.round, c.id), k = calc(p, p.round, c), got = p.J.filter(j => gs(p, p.round, c.id, j.id) != null).length, cu = c.id === p.cur, gone = !inR(p, p.round, c), er = gone ? elimRound(p, c) : null;
    const ed = editing === c.id ? `<div class="box" style="margin:8px 0"><div class="mu">แก้คะแนนรอบ ${esc(rd.name)} ของ ${esc(c.name)} (เต็ม ${p.max}) เว้นว่าง = ยังไม่ให้</div><div class="row" style="margin-top:6px">${p.J.map(j => `<label style="flex:1;min-width:100px">${esc(j.name)}<input id="se-${j.id}" type="number" step="0.01" value="${gs(p, p.round, c.id, j.id) ?? ''}"></label>`).join('')}</div><div class="row" style="margin-top:8px"><button class="p" data-a="savesc" data-id="${c.id}">บันทึกคะแนน</button><button data-a="edsc" data-id="0">ปิด</button></div></div>` : '';
    return `<div class="ci ${gone ? 'out' : ''}"><div class="l"><input type="checkbox" data-s="${c.id}" ${SEL.has(c.id) ? 'checked' : ''} style="width:auto;flex:none">${th(c.img, c.name)}<div style="min-width:0"><b style="color:var(--gold)">${esc(c.no)}</b> ${esc(c.country || c.name)}${c.country ? ` <span class="mu">· ${esc(c.name)}</span>` : ''}${rs.rev ? ' <span class="ok">· เปิดแล้ว</span>' : ''}${gone ? ` <span class="chip">ตกรอบแล้ว (${esc(er.name)})</span>` : rs.out ? ' <span class="chip" style="color:var(--bad)">ตกรอบ · ไม่ไปรอบถัดไป</span>' : ''}<div class="mu">กรรมการให้แล้ว ${got}/${n}${got ? ' · เฉลี่ยรอบนี้ ' + fmtn(k.avg) : ''}${cu && !gone ? ' · กำลังให้คะแนน' : ''}</div></div></div>
    <div class="btns">${cu || gone ? '' : `<button data-a="cur" data-id="${c.id}">ให้คะแนนคนนี้</button>`}${gone ? '' : `<button data-a="rev" data-id="${c.id}" class="${cu && !rs.rev ? 'p' : ''}">${rs.rev ? 'ซ่อนคะแนน' : 'เปิดคะแนน'}</button><button data-a="edsc" data-id="${c.id}">ใส่/แก้คะแนน</button>${got ? `<button class="d" data-a="clrsc" data-id="${c.id}">ล้างคะแนน</button>` : ''}`}${gone ? `<button data-a="out" data-id="${c.id}" data-r="${er.id}">ยกเลิกตกรอบ</button>` : `${rs.out ? `<button data-a="out" data-id="${c.id}">ยกเลิกตกรอบ</button>` : ''}`}<button data-a="img" data-k="C" data-id="${c.id}">รูป</button>${c.img ? `<button data-a="imgdel" data-k="C" data-id="${c.id}">ลบรูป</button>` : ''}<button data-a="editc" data-id="${c.id}">แก้ไข</button><button class="d" data-a="del" data-id="${c.id}">ลบ</button></div></div>${ed}`;
  }).join('') || '<p class="mu">ยังไม่มีผู้เข้าประกวด</p>')}
    <h2 data-need-after="edit" style="margin:16px 0 2px">เพิ่มผู้เข้าประกวด</h2><p class="mu" style="margin:0 0 8px">กรอกแค่ชื่อก็เพิ่มได้ ส่วนรูป ประเทศ เลขที่ ใส่หรือไม่ใส่ก็ได้ (เว้นเลขที่ไว้ ระบบรันเลขต่อให้เอง) วางข้อมูลจาก Excel / Google Sheets ลงช่องไหนก็ได้ แล้วค่อยกลับมาแก้ทีหลังได้</p>
    <div id="addt">${addRowsV()}</div>
    <div class="row" style="margin-top:6px"><button data-a="aadd" data-v="1">+ เพิ่มแถว</button><button data-a="aadd" data-v="5">+ 5 แถว</button><button class="p" data-a="addcs">เพิ่มทั้งหมด (<span id="addn">${addCount()}</span> คน)</button></div>
    <p class="mu">"ตกรอบ" ใช้เมื่อบางคนไม่ได้ไปต่อ เขายังอยู่ในรอบนี้ (ยังเห็นคะแนนของรอบนี้) แต่จะไม่มีชื่ออยู่ในทุกรอบถัดไป (เรียงจากบนลงล่างในรายการรอบ) ผู้เข้าประกวดที่เพิ่มใหม่จะอยู่ในทุกรอบ และรอบที่เพิ่มใหม่จะดึงผู้เข้าประกวดทุกคนที่ยังไม่ตกรอบเข้ามาเอง ถ้ากดผิด กด "ยกเลิกตกรอบ" ได้ที่รอบเดิมหรือรอบถัดไป</p></div>
  ${ST.co ? '' : coBox(p)}${ST.co ? '' : resetBox()}<div class="box" data-need="edit"><h2>กรรมการ</h2>${p.J.map(j => `<div class="ci"><div class="l">${th(j.img, j.name)}<div>${esc(j.name)}<div class="mu">รหัสเข้าระบบ: <b>${j.code == null ? '••••' : esc(j.code)}</b></div></div></div><div class="btns"><button data-a="editj" data-id="${j.id}">แก้ชื่อ</button><button data-a="img" data-k="J" data-id="${j.id}">รูป</button>${j.img ? `<button data-a="imgdel" data-k="J" data-id="${j.id}">ลบรูป</button>` : ''}<button data-a="jcode" data-id="${j.id}">แก้รหัส</button><button class="d" data-a="jdel" data-id="${j.id}">ลบ</button></div></div>`).join('') || '<p class="mu">ยังไม่มีกรรมการ</p>'}
    <div class="row" style="margin-top:10px"><input id="jnm" placeholder="ชื่อกรรมการ"><input id="jcd" placeholder="รหัสเข้าระบบ (ตั้งเอง)"><button class="p" data-a="addj">เพิ่ม</button></div>
    <label><input type="checkbox" id="showjn" style="width:auto" ${p.showJN !== false ? 'checked' : ''}> แสดงชื่อกรรมการใต้รูปในตารางคะแนนรวม (ไม่ติ๊ก = แสดงแต่รูป)</label>
    <p class="mu">รหัสกรรมการตั้งเองได้ ไม่ซ้ำกันในเวทีเดียวกัน กรรมการแต่ละคนเห็นแค่คะแนนที่ตัวเองให้จนกว่าจะเปิดคะแนน และเมื่อกด "ยืนยัน" แล้วคะแนนจะล็อก กรรมการแก้เองไม่ได้ ถ้าต้องแก้ แอดมินแก้ให้ได้ที่ปุ่ม "ใส่/แก้คะแนน"</p></div>`;
}

/* ---------- กรรมการ (ปุ่มกดแบบเครื่องคิดเลข) ---------- */
function stkFit() {
  const a = document.getElementById('stk'), b = document.getElementById('stks'); if (!a || !b) return;
  const f = () => { b.style.height = a.offsetHeight + 'px'; };
  f(); if (window.ResizeObserver) new ResizeObserver(f).observe(a); else addEventListener('resize', f);
}
function adminV() {
  const p = ST.p;
  app.innerHTML = '<div class="stk noprint" id="stk">' + topbar(esc(p.name) + ' · ' + (ST.co ? 'CO-ADMIN' : 'แอดมิน'), ST.fromSuper) + `<div class="tabs noprint"><button data-a="tab" data-v="d" class="${view === 'd' ? 'on' : ''}">จอไลฟ์</button><button data-a="tab" data-v="c" class="${view === 'c' ? 'on' : ''}">ควบคุมสด</button><button data-a="tab" data-v="r" class="${view === 'r' ? 'on' : ''}">สรุปผล</button><button data-a="tab" data-v="v" class="${view === 'v' ? 'on' : ''}">โหวต</button><button data-a="tab" data-v="h" class="${view === 'h' ? 'on' : ''}">ประวัติแก้ไข</button><button data-a="tab" data-v="m" class="${view === 'm' ? 'on' : ''}">จัดการ</button></div></div><div class="stks noprint" id="stks"></div>` + (view === 'd' ? dHTMLp(p) + liveV(p) + linkBox(p) : view === 'c' ? controlV(p) : view === 'r' ? resultsV(p) : view === 'v' ? votesV(p) : view === 'h' ? historyV(p) : manageV(p));
  if (ST.co) coFilter();
  foldInit(); fit();
  stkFit();
}

/* ====== ส่วนเชื่อมกับเซิร์ฟเวอร์ (API) ====== */
const Q = new URLSearchParams(location.search);
const PRE = [['ทอง', '#e3b95a', '#1c1006', '#f4e9d3'], ['ชมพู', '#ff8fb8', '#2a0f1e', '#fff0f6'], ['ฟ้า', '#6fc3ff', '#0b1b2e', '#eaf6ff'], ['เขียว', '#6fe0a6', '#0b2a1c', '#eafff4'], ['ม่วง', '#c79bff', '#1b1030', '#f5eeff']];
let ST = {code: '', pg: 0, role: null, fromSuper: false, co: false, perms: null, p: null, list: [], sel: null};
let view = 'd', editing = 0, timer = null;
const SK = 'pg_sess2';

/* ---------- ตารางเพิ่มผู้เข้าประกวดหลายคน (ร่างเก็บไว้ในหน้า ไม่หายเวลาวาดหน้าใหม่) ---------- */
const MAXADD = 60, blankAdd = n => Array.from({length: n}, () => ({no: '', country: '', name: '', img: null}));
let ADD = blankAdd(5);
const addCount = () => ADD.filter(r => r.name.trim()).length;
const addRowsV = () => '<div class="addr addh"><span>เลขที่</span><span>รูป</span><span>ประเทศ</span><span>ชื่อ</span><span></span></div>' + ADD.map((r, i) => `<div class="addr"><input class="a-no" data-i="${i}" data-f="no" inputmode="numeric" placeholder="เลขที่" value="${esc(r.no)}"><div class="aph a-ph"><button class="ap" data-a="aph" data-id="${i}" title="เลือกรูป (ไม่บังคับ)">${r.img ? `<img src="${r.img}" alt="">` : '+'}</button>${r.img ? `<button class="aphx" data-a="aphx" data-id="${i}" title="เอารูปออก">×</button>` : ''}</div><input class="a-ct" data-i="${i}" data-f="country" placeholder="ประเทศ (ไม่บังคับ)" value="${esc(r.country)}"><input class="a-nm" data-i="${i}" data-f="name" placeholder="ชื่อ" value="${esc(r.name)}"><button class="d a-dl" data-a="adel" data-id="${i}" title="ลบแถว">✕</button></div>`).join('');
const refreshAdd = () => { const t = $('#addt'); if (t) t.innerHTML = addRowsV(); const n = $('#addn'); if (n) n.textContent = addCount(); };
const saveSess = () => localStorage.setItem(SK, JSON.stringify({code: ST.code, pg: ST.pg, role: ST.role, fromSuper: ST.fromSuper}));
const clearSess = () => localStorage.removeItem(SK);
const poll = (fn, ms) => { clearInterval(timer); timer = setInterval(() => fn().catch(() => {}), ms); };

async function api(path, body) {
  const h = {'content-type': 'application/json', 'x-pg': String(ST.pg || 0)};
  if (ST.code) h['x-pass'] = ST.code;
  const r = await fetch('/api/' + path, {method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'เกิดข้อผิดพลาด'), {status: r.status});
  return d;
}
const pub = async path => (await fetch('/api/' + path)).json();

/* ---------- วาดจอไลฟ์จากข้อมูลที่เซิร์ฟเวอร์ส่งมา ---------- */
/* ชื่อบรรทัดใหญ่/เล็ก: [ใหญ่, เล็ก] ตามตั้งค่า big (ไม่มีประเทศ = ชื่อบรรทัดเดียว) */
const nm2 = d => { const c = d.c; return !c.country ? [c.name, ''] : d.big === 'name' ? [c.name, c.country] : [c.country, c.name]; };
/* ขนาดช่องกรรมการ: ถึง 8 คนช่องหดตามจำนวนในพื้นที่ 920px (เหมือนเดิม) เกิน 8 คนคงขนาดช่องไว้ที่ ~102px แล้วขยายแถบยาวออกไปแทน (extra) ส่วนเกินจอให้ตัวย่ออัตโนมัติใน barHTML จัดการ */
function barDims(b) {
  const n = b.judges.length, col = Math.min(190, Math.max(102, Math.floor(920 / (n + 1)))), extra = b.cols ? Math.max(0, (n + 1) * col - 920) : 0;
  const ni = !b.c.img, W = (b.cols ? 1680 : 760) - (ni ? 120 : 0) + extra, left = ni ? (1920 - W) / 2 : 150 - extra / 2;
  return {n, col, extra, ni, W, left};
}
function barCore(b, L) {
  const {n, col, ni, W, left} = barDims(b), R = b.R;
  const jp = Math.max(40, Math.min(92, col - 14)), jn = Math.max(13, Math.min(22, Math.round(col * .15))), jsz = Math.max(22, Math.min(48, Math.round(col * .36))), t0 = n * .3 + .2;
  const jc = b.judges.map((j, i) => { const v = R ? R.scores[i] : null; return `<div class="jc" style="width:${col}px"><div class="jp">${ph(j.img, j.name)}</div><div class="jn">${esc(j.name)}</div><div class="js ${v == null ? 'dim' : ''}" ${v != null ? `style="animation-delay:${i * .3}s"` : ''}>${v == null ? '–' : fmtn(v)}</div></div>`; }).join('');
  const av = `<div class="jc av" style="width:${col}px"><div class="jp ic bars"><b style="height:30%"></b><b style="height:60%"></b><b style="height:90%"></b></div><div class="jn">${esc(L.avg)}</div><div class="js ${R ? '' : 'dim'}" ${R ? `style="animation-delay:${t0}s"` : ''}>${R ? fmtn(R.avg) : '–'}</div></div>`;
  // ไม่มีรูป: ไม่วาดวงกลมรูป ย่อแถบลง แล้วจัดทั้งแถบให้อยู่กึ่งกลางจอ (มีรูป: ตำแหน่งเดิม ซึ่งรวมวงกลมรูปแล้วก็อยู่กึ่งกลางพอดี)
  return `<div class="bar${ni ? ' ni' : ''}${b.cols ? '' : ' nc'}" style="left:${left}px;width:${W}px;--jp:${jp}px;--jn:${jn}px;--js:${jsz}px">${ni ? '' : `<div class="cph"><img src="${b.c.img}" alt=""></div>`}<div class="info"><div class="cn2">${esc(nm2(b)[0])}</div>${nm2(b)[1] ? `<div class="cc">${esc(nm2(b)[1])}</div>` : ''}</div>${b.cols ? `<div class="jrow">${jc}${av}</div>` : ''}</div>`;
}
function barHTML(b, L, z) {
  const W = barDims(b).W, s = Math.min((z || 100) / 100, 1880 / W);
  return `<div class="scl" style="transform:scale(${+s.toFixed(3)});transform-origin:50% 1000px">${barCore(b, L)}</div>`;
}
/* แบ่งตารางคะแนนรวมเป็นหน้าต่างละ per คน (หน้าละกี่คนตั้งได้ที่แท็บจัดการ) */
const sumPages = s => Math.max(1, Math.ceil(s.rows.length / (s.per || 10)));
const sumPage = (s, i) => { const per = s.per || 10, n = s.rows.length, np = sumPages(s); i = Math.min(Math.max(0, i | 0), np - 1); return {...s, rows: s.rows.slice(i * per, (i + 1) * per), cap: Math.min(per, n)}; };
function sumVMHTML(s, L, z) {
  const {n, single, show, C, J, rows} = s, grp = s.grp, tl2 = grp && C.tail === 1 ? 0 : C.tail, pv = s.pv ? 1 : 0, pvW = 110;
  // ไม่มีใครมีรูปเลย → ตัดคอลัมน์รูปออก (pc=0) ตารางจะแคบลงและยังอยู่กึ่งกลางจอ
  const pc = rows.some(r => r.c.img) ? 1 : 0, lead = 2 + pc, fx = 56 + 56 * pc, c0 = lead + 1, rc = [], tc = [], pq = [], nc = (() => { let col = c0, i = 0; (grp || [show.length]).forEach((len, gx) => { for (let k = 0; k < len; k++) { rc[i++] = col; col += C.g; } tc[gx] = grp && (len > 1 || C.gv) ? col++ : 0; pq[gx] = grp && s.pgv && s.pgv[gx] ? col++ : 0; }); return col - c0 + tl2; })(), gaps = (nc + lead - 1 + pv) * 6, avail = 1760 - fx - gaps - pv * pvW; let nameW = 300, cw = Math.floor((avail - nameW) / nc);
  if (cw < 56) { nameW = 150; cw = Math.floor((avail - nameW) / nc); }
  cw = Math.max(30, Math.min(118, cw));
  const W = 80 + fx + nameW + nc * cw + gaps + pv * pvW, H = 178 + (pc ? 72 : 59) * (s.cap || rows.length), k = Math.min((z || 100) / 100, 1880 / W, 1040 / H), fs = Math.max(16, Math.min(32, Math.round(cw * .36))), hs = Math.max(10, Math.min(20, Math.round(cw * .17))), pw = Math.max(18, Math.min(40, cw - 6));
  const tpl = `56px ${pc ? '56px ' : ''}${nameW}px repeat(${nc}, ${cw}px)${pv ? ` ${pvW}px` : ''}`;
  // หัวตาราง 2 แถวอยู่ใน grid เดียว ช่องที่ผสาน 2 แถว (ชื่อตาราง, TOTAL, POPULAR VOTE) วางกึ่งกลางช่อง เส้นนอนใต้แถวบนจึงไม่ลากผ่านช่องที่ผสาน
  const leadW = fx + nameW + (lead - 1) * 6, tl = [...String(s.title)].length, tfs = Math.max(24, Math.min(54, Math.floor((leadW - 20) / (tl * .66))));
  const ts = c0 + nc - tl2, ps = ts + tl2;
  const BI = '<i class="bi"><b style="height:35%"></b><b style="height:65%"></b><b style="height:100%"></b></i>', GL = '<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4" ry="9.5"/><path d="M2.5 12h19M4 7.5h16M4 16.5h16"/></svg>';
  const last = []; if (grp) { let i = 0; grp.forEach((len, gx) => { i += len; last[i - 1] = gx; }); }
  // ช่องคะแนนรวมของกลุ่ม (กลุ่มที่รวมหลายรอบ): ต่อท้ายรอบสุดท้ายของกลุ่ม
  const gtc = (r, xi) => { const gx = last[xi]; if (gx == null) return ''; const gn = r.gone && r.gone[xi - grp[gx] + 1]; let o = '';
    if (tc[gx]) { const v = r.gt && r.gt[gx]; o += `<span class="sc${gn ? '' : ' bd'} av">${gn ? '' : v == null ? '–' : fmtn(v)}</span>`; }
    if (pq[gx]) { const v = r.pg && r.pg[gx]; o += `<span class="sc${gn ? '' : ' bd'}" style="font-size:${Math.min(fs, 26)}px">${gn ? '' : v == null ? '–' : v.toLocaleString('en-US')}</span>`; }
    return o; };
  const cell = (c, r, t, cls) => `<span class="${cls}" style="grid-column:${c}${t ? ` / span ${t}` : ''};grid-row:${r}">`;
  let h = `<span class="rk-t mg" style="grid-column:1 / span ${lead};grid-row:1 / span 2;font-size:${tfs}px">${esc(s.title)}</span>`;
  show.forEach((r, i) => {
    const c = rc[i], hf = Math.max(11, Math.min(Math.round(hs * 1.15), Math.floor(C.g * (cw + 6) / (Math.max(4, [...String(r.name)].length) * .68))));
    h += `<span class="rh g bd hb" style="grid-column:${c} / span ${C.g};grid-row:1;font-size:${hf}px;white-space:nowrap">${esc(r.name)}</span>`;
    J.forEach((j, k2) => { h += `<div class="jh ${k2 === 0 ? 'bd' : ''}" style="grid-column:${c + k2};grid-row:2"><div class="ph2">${ph(j.img, j.name)}</div>${s.jn === false ? '' : `<div class="nm">${esc(j.name)}</div>`}</div>`; });
    h += `${cell(c + n, 2, 0, 'rh g')}${esc(L.avg)}</span>`;
    if (C.gv) h += `${cell(c + n + 1, 2, 0, 'rh')}${esc(L.rv)}</span>`;
  });
  (grp || []).forEach((len, gx) => { if (tc[gx]) h += `<span class="rh g bd ic" style="grid-column:${tc[gx]};grid-row:1 / span 2">${BI}${esc(L.tot)}</span>`; if (pq[gx]) h += `<span class="rh g bd ic pvh" style="grid-column:${pq[gx]};grid-row:1 / span 2;font-size:${Math.max(11, Math.min(hs, 16))}px">${GL}${esc(L.votes)}</span>`; });
  if (C.tail > 1) h += `${cell(ts, 1, C.tail, 'rh g bd hb')}${esc(L.total)}</span>${cell(ts, 2, 0, 'rh bd')}${esc(L.jtot)}</span>${cell(ts + 1, 2, 0, 'rh')}${esc(L.votes)}</span>${cell(ts + 2, 2, 0, 'rh')}${esc(L.vsc)}</span>${cell(ts + 3, 2, 0, 'rh g ic')}${BI}${esc(L.tot)}</span>`;
  else if (tl2 === 1) h += `<span class="rh g bd ic" style="grid-column:${ts};grid-row:1 / span 2">${BI}${esc(L.tot)}</span>`;
  if (pv) h += `<span class="rh g bd ic pvh" style="grid-column:${ps};grid-row:1 / span 2;font-size:${Math.max(12, Math.min(hs, 18))}px">${GL}${esc(L.votes)}</span>`;
  const head = `<div class="rrow hd h2 hg" style="grid-template-columns:${tpl}">${h}</div>`;
  const body = rows.map((r, i) => `<div class="rrow" style="grid-template-columns:${tpl};--fs:${fs}px;animation-delay:${i * .1}s"><span class="rn">${r.rank}</span>${pc ? `<span class="rp">${ph(r.c.img, r.c.name)}</span>` : ''}<span class="rtn">${(n2 => n2[1] ? esc(n2[0]) + `<small>${esc(n2[1])}</small>` : esc(n2[0]))(nm2({c: r.c, big: s.big}))}</span>${r.per.map((x, xi) => (r.gone && r.gone[xi] ? J.map((j, k2) => `<span class="sc ${k2 === 0 && !(xi > 0 && r.gone[xi - 1]) ? 'bd' : ''}"></span>`).join('') + '<span class="sc av"></span>' + (C.gv ? '<span class="sc"></span>' : '') : J.map((j, k2) => `<span class="sc ${k2 === 0 ? 'bd' : ''}">${x && x.scores[k2] != null ? fmtn(x.scores[k2]) : '–'}</span>`).join('') + `<span class="sc av">${x ? fmtn(x.avg) : '–'}</span>` + (C.gv ? `<span class="sc">${x && x.vote != null ? fmtn(x.vote) : '–'}</span>` : '')) + gtc(r, xi)).join('')}${C.tail > 1 ? `<span class="sc bd av">${fmtn(r.jt)}</span><span class="sc">${r.votes == null ? '–' : r.votes.toLocaleString('en-US')}</span><span class="sc">${r.vsc == null ? '–' : fmtn(r.vsc)}</span><span class="sc av">${fmtn(r.tot)}</span>` : tl2 === 1 ? `<span class="sc bd av">${fmtn(r.tot)}</span>` : ''}${pv ? `<span class="sc bd" style="font-size:${Math.min(fs, 26)}px">${r.pvv == null ? '–' : r.pvv.toLocaleString('en-US')}</span>` : ''}</div>`).join('');
  return `<div class="rkw" style="left:${(1920 - W) / 2}px;width:${W}px;transform:translateY(-50%) scale(${+k.toFixed(4)})"><div class="rkp" style="width:${W}px;--hs:${hs}px;--pw:${pw}px">${head}${body}</div></div>`;
}
function cardHTML(d, z) {
  const c = d.c, big = nm2(d)[0], len = [...big].length, fs = len > 22 ? 46 : len > 16 ? 58 : len > 11 ? 70 : 86, s = (z || 100) / 100;
  return `<div class="scl" style="transform:scale(${s});transform-origin:50% 990px"><div class="ncard"><div class="n1" style="font-size:${fs}px">${esc(big)}</div>${nm2(d)[1] ? `<i></i><div class="n2">${esc(nm2(d)[1])}</div>` : ''}</div></div>`;
}
const partOf = vm => vm.bar ? barHTML(vm.bar, vm.L, (vm.z || {}).bar) : vm.card ? cardHTML(vm.card, (vm.z || {}).card) : vm.sum ? sumVMHTML(sumPage(vm.sum, vm.pg || 0), vm.L, (vm.z || {}).sum) : '';
function innerVM(vm) {
  let h = '';
  if (vm.chip) h += `<div class="stg">${esc(vm.chip)}</div>`;
  if (vm.logo !== null && vm.logo !== undefined) h += `<div class="lg${vm.logo ? '' : ' ph'}">${vm.logo ? `<img src="${vm.logo}" alt="">` : 'LOGO'}</div>`;
  h += partOf(vm);
  return h;
}
const varsOf = vm => `--c1:${vm.col.c1};--c2:${vm.col.c2};--c3:${vm.col.c3}`;
/* ตัวอย่างจอในหน้าแอดมิน: ทำตามเวลาค้างของการ์ดชื่อ/คะแนนเหมือนจอไลฟ์จริง */
const pv = {part: '', t0: 0, exp: false, tm: 0, timed: 0, vm: null};
function pvVM(p) {
  const vm = buildDisplay(p), part = partOf(vm), timed = vm.card ? vm.t.intro : vm.bar ? (vm.bar.R ? vm.t.hold : vm.t.intro) : 0;
  if (part !== pv.part) { pv.part = part; pv.t0 = Date.now(); pv.exp = false; }
  if (timed > 0 && !pv.exp && Date.now() - pv.t0 >= timed * 1000) pv.exp = true;
  pv.timed = timed; pv.vm = vm;
  return timed > 0 && pv.exp ? {...vm, bar: null, card: null} : vm;
}
function pvArm() {
  clearTimeout(pv.tm);
  const sw = document.querySelector('.sw[data-live]'); if (!sw || !(pv.timed > 0) || pv.exp) return;
  pv.tm = setTimeout(async () => {
    const part = pv.part, cv = sw.querySelector('.cv'); if (!cv || !document.contains(sw)) return;
    await fadeOut(cv, false);
    if (pv.part !== part || !document.contains(sw)) return;
    pv.exp = true; cv.innerHTML = innerVM({...pv.vm, bar: null, card: null});
  }, Math.max(0, pv.t0 + pv.timed * 1000 - Date.now()));
}
const dHTMLp = (p, force) => { const vm = force ? buildDisplay(p, {force}) : pvVM(p); return `<div class="sw"${force ? '' : ' data-live="1"'} style="${varsOf(vm)}"><div class="cv">${innerVM(vm)}</div></div>`; };

/* เฟดออก 1 วินาที (ใช้ทั้งจอไลฟ์จริงและตัวอย่างในหน้าแอดมิน) */
async function fadeOut(cv, scoresOnly) {
  const bar = cv && cv.querySelector('.bar'), pan = cv && cv.querySelector('.rkp'), card = cv && cv.querySelector('.ncard');
  if (!bar && !pan && !card) return false;
  if (bar) {
    bar.querySelectorAll(scoresOnly ? '.js:not(.dim)' : '.js').forEach(e => { e.style.animationDelay = '0s'; e.classList.add('fo'); });
    if (!scoresOnly) { bar.style.animationDelay = '0s'; bar.classList.add('fo'); }
  } else if (card) {
    card.style.animationDelay = '0s'; card.classList.add('fo');
  } else {
    const rows = [...pan.querySelectorAll('.rrow:not(.hd)')], n = rows.length, st = n > 1 ? .4 / (n - 1) : 0;
    rows.forEach((e, i) => { e.style.animationDelay = ((n - 1 - i) * st) + 's'; e.classList.add('fo'); });
    pan.style.animationDelay = '0s'; pan.classList.add('fo');
  }
  await new Promise(res => setTimeout(res, 1050));
  return true;
}
/* ---------- หน้าจอไลฟ์สาธารณะ (/?display=1&pg=เลขเวที พื้นหลังโปร่งใสเสมอ) ---------- */
function displayMode() {
  document.body.classList.add('disp'); if (!Q.get('bg')) document.body.classList.add('tr');
  app.innerHTML = '<div class="cv" id="cv"></div>';
  const cv = $('#cv'), pg = +Q.get('pg') || 0; let last = -1, lastKey = '';
  const fitD = () => { cv.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  fitD(); addEventListener('resize', fitD);
  let lastPart = '', lastBid = '', busy = false, gen = 0, timer = 0, expired = '', latest = null, pidx = 0, skey = '';
  // หมดเวลาค้าง: เฟดออกแล้วจอว่าง (ไม่แสดงซ้ำจนกว่าเนื้อหาจะเปลี่ยน)
  const expire = async (g, part, vm) => {
    if (g !== gen) return;
    await fadeOut(cv, false); if (g !== gen) return;
    expired = part; const sh = {...vm, bar: null, card: null, sum: null}, h = innerVM(sh);
    lastKey = varsOf(vm) + h; lastPart = ''; lastBid = ''; cv.innerHTML = h;
  };
  // ตารางคะแนนรวม: หมดเวลาหน้าต่างนี้ → เฟดออกแล้วขึ้นหน้าต่างถัดไป
  const nextPage = async g => {
    if (g !== gen) return;
    if (busy) { timer = setTimeout(() => nextPage(g), 300); return; }
    busy = true;
    try { pidx++; await apply(latest); } catch (e) {} finally { busy = false; }
  };
  const apply = async vm0 => {
    const sk = vm0.sum ? JSON.stringify(vm0.sum) : '';
    if (sk !== skey) { skey = sk; pidx = 0; }
    const np = vm0.sum ? sumPages(vm0.sum) : 1; if (pidx >= np) pidx = np - 1;
    const vm = {...vm0, pg: pidx};
    const part = partOf(vm), timed = vm.card ? vm.t.intro : vm.bar ? (vm.bar.R ? vm.t.hold : vm.t.intro) : vm.sum ? vm.sum.sec : 0;
    if (part !== expired) expired = '';
    const isExp = !!timed && part === expired, sh = isExp ? {...vm, bar: null, card: null, sum: null} : vm;
    const html = innerVM(sh), k = varsOf(vm) + html, shownPart = isExp ? '' : part;
    if (k !== lastKey) {
      // แอนิเมชันออก (ย้อนกลับของตอนเข้า) เมื่อแถบคะแนน/การ์ดชื่อ/ตารางอันดับเปลี่ยนหรือถูกซ่อน
      const bid = !isExp && vm.bar ? vm.bar.c.no + '|' + vm.bar.c.name : '';
      clearTimeout(timer);
      if (shownPart !== lastPart) await fadeOut(cv, bid && bid === lastBid);
      lastBid = bid; lastKey = k; lastPart = shownPart; const g = ++gen;
      cv.setAttribute('style', cv.getAttribute('style').replace(/--c\d:[^;]*;?/g, '') + ';' + varsOf(vm)); cv.innerHTML = html;
      if (timed > 0 && !isExp) timer = setTimeout(() => (vm.sum && pidx + 1 < np ? nextPage(g) : expire(g, part, vm)), timed * 1000);
    }
  };
  const tick = async () => {
    if (busy) return; busy = true;
    try {
      const r = await pub('rev?pg=' + pg); if (r.rev === undefined || r.rev === last) return;
      const vm = await pub('display?pg=' + pg); last = r.rev; latest = vm;
      await apply(vm);
    } catch (e) {} finally { busy = false; }
  };
  tick(); setInterval(tick, 2000);
}

/* ---------- เข้าสู่ระบบ ---------- */
const TT_URL = 'https://www.tiktok.com/@moohong.org'; // ใส่ลิงก์ TikTok ของ MHO ตรงนี้ เช่น 'https://www.tiktok.com/@xxxx' (ว่างไว้ = MHO เป็นข้อความเฉย ๆ ไม่มีลิงก์)
async function loginV(msg, cached) {
  const keep = $('#code') ? $('#code').value : '';
  let list = ST.list; if (!cached || !list.length) { try { list = await pub('pageants'); } catch (e) {} ST.list = list; }
  if (ST.sel === null || (ST.sel !== 0 && !list.some(x => x.id === ST.sel))) ST.sel = list[0] ? list[0].id : 0;
  const sc0 = $('.pgl') ? $('.pgl').scrollTop : -1;
  app.innerHTML = `<div class="lgn"><h1>Pageant Scoring System</h1><div class="box"><label style="margin-top:0">เลือกเวที (เลื่อนหาแล้วแตะที่ชื่อ)</label><div class="pgl">${list.map(p => `<button data-pg="${p.id}" class="${ST.sel === p.id ? 'p' : ''}">${esc(p.name)}</button>`).join('')}<button data-pg="0" class="${ST.sel === 0 ? 'p' : ''}" style="font-style:italic">ผู้ดูแลหลัก</button></div>
    <label>${ST.sel === 0 ? 'รหัสผู้ดูแลหลัก' : 'รหัส (กรรมการหรือแอดมินเวที)'}</label><input id="code" type="password" autocomplete="off" placeholder="รหัส"><div style="margin-top:10px"><button class="p" id="go" style="width:100%">เข้าสู่ระบบ</button></div><div class="bad" id="lm" style="text-align:center">${esc(msg || '')}</div></div><div class="pres">Presented by ${TT_URL.startsWith('https://') || TT_URL.startsWith('http://') ? `<a href="${esc(TT_URL)}" target="_blank" rel="noopener noreferrer">MHO</a>` : 'MHO'}</div></div>`;
  { const l = $('.pgl'), on = l.querySelector('button.p'); if (sc0 >= 0) l.scrollTop = sc0; else if (on) l.scrollTop = Math.max(0, on.offsetTop - l.clientHeight / 2 + on.offsetHeight / 2); }
  document.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { ST.sel = +b.dataset.pg; loginV('', true); });
  $('#code').value = keep;
  const go = async () => {
    const code = $('#code').value.trim(); if (!code) return;
    ST.code = code; ST.pg = ST.sel;
    try { const me = await api('me'); applyMe(me); ST.fromSuper = false; if (me.role === 'super') ST.pg = 0; saveSess(); start(); }
    catch (e) { ST.code = ''; ST.role = null; loginV(e.status === 429 ? e.message : 'รหัสไม่ถูกต้อง'); }
  };
  $('#go').onclick = go; $('#code').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function logout() { clearInterval(timer); clearSess(); ST = {code: '', pg: 0, role: null, fromSuper: false, p: null, list: [], sel: ST.sel}; view = 'd'; editing = 0; ADD = blankAdd(5); loginV(); }

/* ---------- ผู้ดูแลหลัก ---------- */
async function superLoad() { ST.list = (await api('super')).pageants; }
function superV() {
  app.innerHTML = topbar('ผู้ดูแลหลัก') + `<div class="box"><h2>เวทีทั้งหมด</h2>${ST.list.map(p => `<div class="ci"><div><b>${esc(p.name)}</b><div class="mu">รหัสแอดมินเวที: <b>${esc(p.adm)}</b> · กรรมการ ${p.judges} คน · ผู้เข้าประกวด ${p.contestants} คน</div></div><div class="btns"><button class="p" data-a="enter" data-id="${p.id}">เข้าไปจัดการ</button><button data-a="pgren" data-id="${p.id}">เปลี่ยนชื่อ</button><button data-a="pgcode" data-id="${p.id}">เปลี่ยนรหัสแอดมิน</button><button class="d" data-a="pgdel" data-id="${p.id}">ลบ</button></div></div>`).join('') || '<p class="mu">ยังไม่มีเวที</p>'}
    <h2 style="margin-top:14px">เพิ่มเวทีใหม่</h2><div class="row"><input id="npn" placeholder="ชื่อเวที เช่น Miss Hong"><input id="npc" placeholder="รหัสแอดมินเวที (ตั้งเอง)"></div>${copyOpts(ST.list)}<div class="row" style="margin-top:10px"><button class="p" data-a="pgadd">เพิ่มเวที</button></div>
    <p class="mu">ส่งรหัสแอดมินให้ผู้จัดเวทีนั้น เขาจะตั้งค่ารอบ ผู้เข้าประกวด กรรมการและรหัสกรรมการ สี และโลโก้ได้เองโดยไม่ต้องผ่านคุณ และมองไม่เห็นข้อมูลของเวทีอื่น</p></div>`;
}
async function sact(a, body) { try { await api('super/' + a, body); await superLoad(); } catch (e) { alert(e.message); } superV(); }

/* ---------- แอดมินเวที ---------- */
async function load() { ST.p = await api('admin'); }
function fadeKind(a, b) {
  if (a === 'step' || a === 'cur' || a === 'rd' || a === 'annstart' || a === 'annstop') return 'all';
  if (a === 'settings' && b && b.k === 'hide' && b.v === '1') return 'all';
  if ((a === 'reveal' || a === 'revmany') && b && b.on === false) return 'scores';
  return null;
}
// รวมค่าตั้งคัดผู้เข้ารอบ/แสดงแค่ชื่อของรอบหนึ่งจากหน้าจอ (over = ค่าที่เพิ่งเปลี่ยน)
function qArgs(id, over) {
  const q = s => document.querySelector(`[data-${s}="${id}"]`);
  return {id, n: q('qn').value, pv: q('qp').checked, nm: q('qm').checked, ge: q('qg').checked, ...(over || {})};
}
async function act(a, body) {
  const fk = fadeKind(a, body), pv = fk ? document.querySelector('.sw .cv') : null;
  try { await Promise.all([api('admin/' + a, body || {}), pv ? fadeOut(pv, fk === 'scores') : 0]); } catch (e) { alert(e.message); } try { await load(); } catch (e) {} render(); }
function linkBox(p) {
  const u = `${location.origin}/?display=1&pg=${p.id}`;
  return `<div class="box noprint" style="margin-top:12px"><h2>ลิงก์จอไลฟ์สำหรับ OBS</h2><p class="mu">ใน OBS เพิ่มแหล่งภาพแบบ Browser ใส่ลิงก์นี้ ขนาด 1920 x 1080 พื้นหลังโปร่งใสให้อัตโนมัติ ซ้อนบนภาพกล้องได้เลย</p><input readonly value="${esc(u)}" onclick="this.select()"><p class="mu" style="margin-top:8px">เปิดในเบราว์เซอร์ธรรมดาจะเห็นพื้นหลังเป็นสีขาว ซึ่งปกติ ถ้าอยากดูบนพื้นเข้มตอนทดสอบ ต่อท้ายลิงก์ด้วย &amp;bg=1</p></div>`;
}
function tableData(p) {
  const n = p.J.length, d = sumData(p, p.rounds, {flat: true}), list = d.ranked.concat(d.rows.filter(r => r.tot == null)), C = colsCfg(p, false, n), c = v => v == null ? '' : fmtn(v);
  const hdr = ['อันดับ', 'เลขที่', 'ผู้เข้าประกวด'].concat(...p.rounds.map(r => p.J.map(j => r.name + ' ' + j.name).concat(r.name + ' เฉลี่ย', C.gv ? [r.name + ' โหวต'] : [])), C.tail > 1 ? ['คะแนนกรรมการ', 'โหวต', 'คะแนนโหวต', 'รวม'] : ['รวม']);
  const rows = list.map(r => [r.rank || '', r.c.no, r.c.country ? r.c.country + ' ' + r.c.name : r.c.name].concat(...r.per.map(x => p.J.map((j, k) => c(x && x.scores[k])).concat(c(x && x.avg), C.gv ? [c(x && x.vote)] : [])), C.tail > 1 ? [c(r.jt), r.votes ?? '', c(r.vsc), c(r.tot)] : [c(r.tot)]));
  return [hdr].concat(rows);
}
function copyTable() {
  const t = tableData(ST.p).map(r => r.join('\t')).join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => alert('คัดลอกแล้ว วางใน Excel หรือ Google Sheets ได้'), () => alert('คัดลอกไม่ได้ ใช้ปุ่มดาวน์โหลด CSV หรือพิมพ์แทน'));
}
function csvTable() {
  const q = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = '\ufeff' + tableData(ST.p).map(r => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'})); a.download = `สรุปคะแนน-${ST.p.name}.csv`; document.body.appendChild(a); a.click(); a.remove();
}
/* หน้าต่างครอบรูป (สี่เหลี่ยมจัตุรัส): ลากเลื่อน ซูมด้วยแถบเลื่อน/ล้อเมาส์/บีบนิ้ว เริ่มต้นอยู่ตรงกลางเหมือนที่ระบบเคยตัดให้เอง ได้ null ถ้ายกเลิก */
function cropDialog(bmp) {
  return new Promise(res => {
    const S = Math.max(200, Math.min(340, innerWidth - 64, innerHeight - 300)), OUT = 240, w = bmp.width, h = bmp.height, base = S / Math.min(w, h);
    let z = 1, ox = (S - w * base) / 2, oy = (S - h * base) / 2, lastD = 0;
    const ov = document.createElement('div'); ov.tabIndex = -1;
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:16px;outline:none';
    ov.innerHTML = `<div style="background:#111;border:1px solid #333;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;max-width:100%">
      <div style="color:#fff;font-size:16px;text-align:center">ลากรูปเพื่อเลือกส่วนที่ต้องการ · ซูมด้วยแถบเลื่อนหรือบีบนิ้ว</div>
      <div style="position:relative;width:${S}px;height:${S}px"><canvas width="${S}" height="${S}" style="width:${S}px;height:${S}px;display:block;border-radius:8px;touch-action:none;cursor:grab"></canvas><div style="position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.8);pointer-events:none"></div></div>
      <div style="color:#aaa;font-size:13px;text-align:center">วงกลม = ส่วนที่ขึ้นบนแถบผู้เข้าประกวด · สี่เหลี่ยม = รูปกรรมการ</div>
      <input type="range" min="100" max="400" value="100" style="width:100%">
      <div class="row" style="justify-content:center"><button data-cx="0">ยกเลิก</button><button class="p" data-cx="1">ตกลง</button></div></div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), rg = ov.querySelector('input');
    const clamp = () => { const sc = base * z; ox = Math.min(0, Math.max(S - w * sc, ox)); oy = Math.min(0, Math.max(S - h * sc, oy)); };
    const draw = () => { clamp(); const sc = base * z; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S); ctx.drawImage(bmp, ox, oy, w * sc, h * sc); };
    const setZ = nz => { nz = Math.min(4, Math.max(1, nz)); const sc = base * z, cx = (S / 2 - ox) / sc, cy = (S / 2 - oy) / sc; z = nz; const s2 = base * z; ox = S / 2 - cx * s2; oy = S / 2 - cy * s2; rg.value = Math.round(z * 100); draw(); };
    const pts = new Map(), dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x: e.clientX, y: e.clientY}); if (pts.size === 2) lastD = dist(); cv.style.cursor = 'grabbing'; };
    cv.onpointermove = e => {
      const pr = pts.get(e.pointerId); if (!pr) return;
      const dx = e.clientX - pr.x, dy = e.clientY - pr.y; pr.x = e.clientX; pr.y = e.clientY;
      if (pts.size === 1) { ox += dx; oy += dy; draw(); }
      else if (pts.size === 2) { const d = dist(); if (lastD > 0) setZ(z * d / lastD); lastD = d; }
    };
    const up = e => { pts.delete(e.pointerId); lastD = 0; cv.style.cursor = 'grab'; };
    cv.onpointerup = up; cv.onpointercancel = up;
    cv.addEventListener('wheel', e => { e.preventDefault(); setZ(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, {passive: false});
    rg.oninput = () => setZ(rg.value / 100);
    const done = ok => {
      let d = null;
      if (ok) { const sc = base * z, ss = S / sc, c = document.createElement('canvas'); c.width = c.height = OUT; c.getContext('2d').drawImage(bmp, Math.min(Math.max(0, -ox / sc), w - ss), Math.min(Math.max(0, -oy / sc), h - ss), ss, ss, 0, 0, OUT, OUT); d = c.toDataURL('image/jpeg', .8); }
      ov.remove(); res(d);
    };
    ov.addEventListener('click', e => { const b = e.target.closest('[data-cx]'); if (b) done(b.dataset.cx === '1'); });
    ov.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') done(false); });
    draw(); ov.focus();
  });
}
function pick(logo, cb) {
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    try {
      const b = await createImageBitmap(file); let data;
      if (logo) { const c = document.createElement('canvas'), s = Math.min(1, 400 / b.width); c.width = Math.round(b.width * s); c.height = Math.round(b.height * s); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); data = c.toDataURL('image/png'); }
      else { data = await cropDialog(b); if (!data) return; }
      await cb(data);
    } catch (e) { alert('ใส่รูปไม่สำเร็จ'); }
  };
  f.click();
}
const numOrNull = v => { v = String(v ?? '').trim(); return v === '' ? '' : v; };
const onClick = async e => {
  const fh = e.target.closest('h2.fold'); if (fh) return foldToggle(fh);
  const kb = e.target.closest('[data-k]');
  if (kb && !kb.dataset.a) { if (ST.role === 'judge') press(kb.dataset.k); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = +b.dataset.id, v = b.dataset.v, p = ST.p;
  if (a === 'logout') return logout();
  if (a === 'back') { ST.role = 'super'; ST.pg = 0; ST.fromSuper = false; ST.p = null; saveSess(); await superLoad().catch(() => {}); return render(); }
  if (a === 'tab') { view = v; return render(); }
  if (a === 'print') return window.print();
  if (a === 'copy') return copyTable();
  if (a === 'csv') return csvTable();
  if (a === 'edsc') { editing = editing === id ? 0 : id; return render(); }
  // ผู้ดูแลหลัก
  if (a === 'enter') { ST.pg = id; ST.role = 'admin'; ST.co = false; ST.perms = null; ST.fromSuper = true; view = 'm'; editing = 0; ADD = blankAdd(5); saveSess(); try { await load(); } catch (er) { alert(er.message); } render(); return start(true); }
  if (a === 'pgadd') { const from = +(($('#npf') || {}).value || 0), parts = {}; if (from) document.querySelectorAll('input[data-npp]').forEach(x => { parts[x.dataset.npp] = x.checked; }); return sact('pgadd', {name: $('#npn').value, adm: $('#npc').value, from, parts}); }
  if (a === 'pgren') { const x = ST.list.find(y => y.id === id), n = prompt('ชื่อเวที', x.name); return n === null ? null : sact('pgren', {id, name: n}); }
  if (a === 'pgcode') { const x = ST.list.find(y => y.id === id), n = prompt('รหัสแอดมินเวทีใหม่', x.adm); return n === null ? null : sact('pgcode', {id, adm: n}); }
  if (a === 'pgdel') { if (!confirm('ลบเวทีนี้และข้อมูลทั้งหมด (ลบแล้วกู้คืนไม่ได้)?')) return; return sact('pgdel', {id}); }
  // แอดมินเวที
  const st = (k, val) => act('settings', {k, v: val});
  if (['mode', 'agg', 'vm', 'vmode', 'pre', 'big', 'lang', 'rank'].includes(a)) return st(a, v);
  if (a === 'toggle') return st('mode', p.mode === 'ranking' ? 'current' : 'ranking');
  if (a === 'hide') return st('hide', p.hide ? '0' : '1');
  if (a === 'max') return st('max', $('#max').value);
  if (a === 'jw') return st('jw', $('#jw').value);
  if (['introSec', 'holdSec', 'sumPer', 'sumSec', 'barScale', 'cardScale', 'annScale', 'sumScale'].includes(a)) return st(a, $('#' + a).value);
  if (a === 'preset') { const x = PRE[id]; return st('colors', [x[1], x[2], x[3]].join(',')); }
  if (a === 'logoup') return pick(true, async d => { try { await api('admin/img', {kind: 'logo', data: d}); await api('admin/settings', {k: 'showLogo', v: '1'}); } catch (er) { alert(er.message); } await load(); render(); });
  if (a === 'logoclr') return act('img', {kind: 'logo', data: ''});
  if (a === 'rd') return act('rd', {id});
  if (a === 'rdadd') return act('rdadd', {name: $('#rn').value});
  if (a === 'rdren') { const x = p.rounds.find(y => y.id === id), n = prompt('ชื่อรอบ', x.name); return n === null ? null : act('rdren', {id, name: n}); }
  if (a === 'rddel') { if (p.rounds.length < 2) return alert('ต้องมีอย่างน้อย 1 รอบ'); if (!confirm('ลบรอบนี้และคะแนนทั้งหมดของรอบ?')) return; return act('rddel', {id}); }
  if (a === 'cur') return act('cur', {id});
  if (a === 'rev' || a === 'revcur') {
    const cid = a === 'revcur' ? p.cur : id, r = gr(p, p.round, cid);
    if (!cid) return;
    if (!r.rev && cid === p.cur && p.J.some(j => gs(p, p.round, cid, j.id) == null) && !confirm('กรรมการยังส่งไม่ครบ เปิดคะแนนเลยไหม?')) return;
    return act('reveal', {id: cid, on: !r.rev});
  }
  if (a === 'foldall') return foldAll(v === '1');
  if (a === 'coadd') { const perms = {}; document.querySelectorAll('input[data-newcop]').forEach(x => { perms[x.dataset.newcop] = x.checked; }); return act('coadd', {name: $('#con').value, code: $('#coc').value, perms}); }
  if (a === 'coren') { const c = (p.CO || []).find(x => x.id === id), n = prompt('ชื่อ CO-ADMIN', c ? c.name : ''); return n === null ? null : act('coedit', {id, name: n}); }
  if (a === 'cocode') { const n = prompt('รหัสเข้าระบบใหม่ของ CO-ADMIN'); return n === null ? null : act('cocode', {id, code: n}); }
  if (a === 'codel') { if (!confirm('ลบ CO-ADMIN คนนี้? (รหัสนี้จะใช้เข้าระบบไม่ได้อีก)')) return; return act('codel', {id}); }
  if (a === 'out') return act('out', {id, round: b.dataset.r ? +b.dataset.r : 0});
  if (a === 'bulk') {
    const sel = [...SEL].filter(i => p.C.some(c => c.id === i));
    if (v === 'hideall') { const ids = p.C.filter(c => inR(p, p.round, c) && gr(p, p.round, c.id).rev).map(c => c.id); if (!ids.length) return alert('ตอนนี้ยังไม่มีใครที่เปิดคะแนนอยู่'); return act('revmany', {ids, on: false}); }
    if (!sel.length) return alert('ยังไม่ได้เลือกผู้เข้าประกวด (ติ๊กหน้าชื่อ หรือกด "เลือกทั้งหมด")');
    const inr = sel.filter(i => inR(p, p.round, p.C.find(c => c.id === i)));
    if (v === 'hide') return act('revmany', {ids: inr, on: false});
    if (v === 'show') return act('revmany', {ids: inr, on: true});
    if (v === 'qual') { if (!inr.length) return alert('ไม่มีคนที่ติ๊กอยู่ในรอบนี้'); const m = p.C.filter(c => inR(p, p.round, c)).length - inr.length; if (!confirm(`ผู้เข้ารอบ ${inr.length} คน อีก ${m} คนที่ไม่ได้ติ๊กจะตกรอบ ตกลงไหม?`)) return; return act('qualify', {ids: inr}); }
    if (v === 'in') return act('outmany', {ids: inr, on: false});
    if (v === 'del') { if (!confirm(`ลบผู้เข้าประกวด ${sel.length} คน และคะแนนทุกรอบ? (กู้คืนไม่ได้)`)) return; SEL.clear(); return act('delmany', {ids: sel}); }
    return;
  }
  if (a === 'ann') return act(v === 'start' ? 'annstart' : 'annstop', {});
  if (a === 'qset') { QS = {round: 0, ids: null}; return act('qset', qArgs(id)); }
  if (a === 'qreset') { QS = {round: 0, ids: null}; return render(); }
  if (a === 'qreload') { try { await load(); } catch (er) { alert(er.message); } return render(); }
  if (a === 'qsave' || a === 'qdo') return qualRun(a === 'qdo');
  if (a === 'reset') {
    const o = {scores: $('#rs-sc').checked, status: $('#rs-st').checked, votes: $('#rs-vt').checked, confirm: $('#rs-cf').value.trim()};
    if (!o.scores && !o.status && !o.votes) return alert('ยังไม่ได้ติ๊กสิ่งที่จะล้าง');
    if (o.confirm !== 'ล้าง') return alert('พิมพ์คำว่า ล้าง ในช่องยืนยันก่อน');
    if (!confirm('ล้างข้อมูลที่เลือกทั้งหมดของเวทีนี้ ย้อนกลับไม่ได้ ตกลงไหม?')) return;
    return act('reset', o);
  }
  if (a === 'next' || a === 'prev') return act('step', {dir: a});
  if (a === 'clrsc') { const c = p.C.find(x => x.id === id), rn = (p.rounds.find(x => x.id === p.round) || {}).name || '', got = p.J.filter(j => gs(p, p.round, id, j.id) != null).length; if (!c || !confirm(`ล้างคะแนนรอบ ${rn} ของ ${c.country ? c.country + ' · ' : ''}${c.name} ทั้งหมด (${got} กรรมการ)?\nคะแนนที่เปิดบนจออยู่จะถูกซ่อน และบันทึกในประวัติแก้ไข`)) return; editing = 0; return act('clearscores', {id}); }
  if (a === 'savesc') { const scores = {}; p.J.forEach(j => { scores[j.id] = $('#se-' + j.id).value; }); editing = 0; return act('setscores', {id, scores}); }
  if (a === 'img') return pick(false, async d => { try { await api('admin/img', {kind: b.dataset.k === 'C' ? 'contestant' : 'judge', id, data: d}); } catch (er) { alert(er.message); } await load(); render(); });
  if (a === 'del') { if (!confirm('ลบผู้เข้าประกวดคนนี้และคะแนนทุกรอบ?')) return; return act('delc', {id}); }
  if (a === 'editc') return edStart(id);
  if (a === 'edall') return edStart(0);
  if (a === 'edcancel') { if (EDC && EDC.rows.some(edChanged) && !confirm('ยกเลิกการแก้ที่ยังไม่ได้บันทึก?')) return; EDC = null; return render(); }
  if (a === 'edsave') {
    if (!EDC) return;
    const ch = EDC.rows.filter(edChanged);
    if (ch.some(r => !r.name.trim())) return alert('มีแถวที่ชื่อว่าง กรุณากรอกชื่อ');
    if (!ch.length) { EDC = null; return render(); }
    b.disabled = true;
    try { await api('admin/editcs', {rows: ch.map(r => ({id: r.id, no: r.no, name: r.name, country: r.country}))}); EDC = null; } catch (er) { alert(er.message); b.disabled = false; return; }
    try { await load(); } catch (er) {} return render();
  }
  if (a === 'edph') return pick(false, async d => { const r = EDC && EDC.rows[id]; if (!r) return; try { await api('admin/img', {kind: 'contestant', id: r.id, data: d}); await load(); edSyncImgs(); } catch (er) { alert(er.message); } refreshEd(); });
  if (a === 'edphx') { const r = EDC && EDC.rows[id]; if (!r || !confirm('ลบรูปของ ' + (r.name || 'คนนี้') + '?')) return; try { await api('admin/img', {kind: 'contestant', id: r.id, data: ''}); await load(); edSyncImgs(); } catch (er) { alert(er.message); } return refreshEd(); }
  if (a === 'imgdel') { if (!confirm('ลบรูปนี้?')) return; return act('img', {kind: b.dataset.k === 'C' ? 'contestant' : 'judge', id, data: ''}); }
  if (a === 'aadd') { ADD.push(...blankAdd(Math.max(0, Math.min(+v || 1, MAXADD - ADD.length)))); return refreshAdd(); }
  if (a === 'adel') { ADD.splice(id, 1); if (!ADD.length) ADD = blankAdd(1); return refreshAdd(); }
  if (a === 'aphx') { if (ADD[id]) { ADD[id].img = null; refreshAdd(); } return; }
  if (a === 'aph') return pick(false, d => { if (ADD[id]) { ADD[id].img = d; refreshAdd(); } });
  if (a === 'addcs') {
    const bad = ADD.findIndex(r => !r.name.trim() && (r.no.trim() || r.country.trim() || r.img));
    if (bad >= 0) return alert('แถวที่ ' + (bad + 1) + ' ยังไม่ได้กรอกชื่อ');
    const rows = ADD.filter(r => r.name.trim());
    if (!rows.length) return alert('กรอกชื่อผู้เข้าประกวดอย่างน้อย 1 คน');
    b.disabled = true;
    // ส่งทีละ 15 คน (กันชนลิมิตจำนวน query ต่อคำขอของ Cloudflare) ถ้าล้มกลางทาง แถวที่บันทึกแล้วจะถูกเอาออกจากตาราง กดซ้ำได้โดยไม่ซ้ำคน
    let done = 0, warn = '', fail = '';
    try { for (; done < rows.length; done += 15) { const r = await api('admin/addcs', {rows: rows.slice(done, done + 15)}); warn = warn || r.warn || ''; } done = rows.length; } catch (er) { fail = er.message; }
    const saved = new Set(rows.slice(0, done)); ADD = ADD.filter(r => !saved.has(r)); if (!fail || !ADD.length) ADD = fail ? ADD : blankAdd(5);
    if (fail) alert(fail + (done ? '\n(บันทึกไปแล้ว ' + done + ' คน ที่เหลือยังอยู่ในตาราง แก้แล้วกด "เพิ่มทั้งหมด" ได้เลย)' : '')); else if (warn) alert(warn);
    try { await load(); } catch (er) {}
    return render();
  }
  if (a === 'addj') return act('addj', {name: $('#jnm').value, code: $('#jcd').value});
  if (a === 'jcode') { const j = p.J.find(x => x.id === id), n = prompt('รหัสเข้าระบบใหม่', j.code); return n === null ? null : act('jcode', {id, code: n}); }
  if (a === 'editj') { const j = p.J.find(x => x.id === id), n = prompt('ชื่อกรรมการ', j.name); return n === null ? null : act('editj', {id, name: n}); }
  if (a === 'jdel') { if (!confirm('ลบกรรมการคนนี้และคะแนนที่เขาให้?')) return; return act('delj', {id}); }
  if (a === 'savevotes') {
    const mr = p.vmode === 'round', V = {};
    const rd = el => { const x = $('#' + el); return !x || x.disabled ? undefined : String(x.value).trim(); };
    p.C.forEach(c => { if (mr) p.rounds.forEach(r => { const t = rd('vr-' + r.id + '-' + c.id); if (t !== undefined) (V[r.id] = V[r.id] || {})[c.id] = t; }); else { const t = rd('va-' + c.id); if (t !== undefined) V[c.id] = t; } });
    return act('savevotes', {votes: V});
  }
};
const onInput = e => {
  if (e.target.dataset && e.target.dataset.ef && EDC) { const r = EDC.rows[+e.target.dataset.ei]; if (r) r[e.target.dataset.ef] = e.target.value; return; }
  const t = e.target, f = t.dataset && t.dataset.f, r = f && ADD[+t.dataset.i]; if (!r || ST.role !== 'admin') return;
  r[f] = t.value; if (f === 'name') { const n = $('#addn'); if (n) n.textContent = addCount(); }
};
// วางข้อมูลหลายบรรทัด/หลายคอลัมน์จากสเปรดชีต: 1 คอลัมน์ = ลงช่องที่วาง · 2 คอลัมน์ = ประเทศ, ชื่อ · 3 คอลัมน์ = เลขที่, ประเทศ, ชื่อ
const onPaste = e => {
  const t = e.target, f = t.dataset && t.dataset.f; if (!f || !ADD[+t.dataset.i] || ST.role !== 'admin') return;
  const tx = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\r/g, '').replace(/\n+$/, ''); if (!/[\t\n]/.test(tx)) return;
  e.preventDefault();
  const lines = tx.split('\n').filter(l => l.trim() !== ''), k = Math.max(...lines.map(l => l.split('\t').length)), cols = k === 1 ? [f] : k === 2 ? ['country', 'name'] : ['no', 'country', 'name'], i0 = +t.dataset.i;
  while (ADD.length < Math.min(MAXADD, i0 + lines.length)) ADD.push(...blankAdd(1));
  lines.forEach((l, li) => { const r = ADD[i0 + li]; if (r) l.split('\t').slice(0, cols.length).forEach((x, ci) => { r[cols[ci]] = x.trim(); }); });
  if (i0 + lines.length > MAXADD) alert('วางได้สูงสุด ' + MAXADD + ' แถว ส่วนที่เกินถูกตัดออก');
  refreshAdd();
};
const onChange = e => {
  const t0 = e.target;
  if (t0.id === 'npf') { const d = $('#npparts'); if (d) d.hidden = !(+t0.value); return; }
  if (ST.role !== 'admin') return; const t = e.target;
  if (t.dataset && t.dataset.cop) { const row = t.closest('[data-co]'), perms = {}; row.querySelectorAll('input[data-cop]').forEach(x => { perms[x.dataset.cop] = x.checked; }); return act('coedit', {id: +row.dataset.co, perms}); }
  if (t.dataset && t.dataset.s) { const i = +t.dataset.s; if (t.checked) SEL.add(i); else SEL.delete(i); return selUpd(); }
  if (t.id === 'selall') { ST.p.C.forEach(c => { if (t.checked) SEL.add(c.id); else SEL.delete(c.id); }); document.querySelectorAll('input[data-s]').forEach(x => { x.checked = t.checked; }); return selUpd(); }
  if (['c1', 'c2', 'c3'].includes(t.id)) return act('settings', {k: 'colors', v: ['c1', 'c2', 'c3'].map(i => $('#' + i).value).join(',')});
  if (t.dataset && t.dataset.qp) { QS = {round: 0, ids: null}; const rid = +t.dataset.qp; return act('qset', qArgs(rid, {pv: t.checked})); }
  if (t.dataset && t.dataset.qg) { QS = {round: 0, ids: null}; const rid = +t.dataset.qg; return act('qset', qArgs(rid, {ge: t.checked})); }
  if (t.dataset && t.dataset.qm) { QS = {round: 0, ids: null}; const rid = +t.dataset.qm; return act('qset', qArgs(rid, {nm: t.checked})); }
  if (t.dataset && t.dataset.q) { const p = ST.p, pl = qualPlan(p, p.round); if (!(QS.round === p.round && QS.ids)) QS = {round: p.round, ids: new Set(pl.sel)}; const i = +t.dataset.q; if (t.checked) QS.ids.add(i); else QS.ids.delete(i); const row = t.closest('.ci'); if (row) row.classList.toggle('out', !t.checked); const q = $('#qcnt'); if (q) q.innerHTML = qualCnt(p, pl, QS.ids); return; }
  if (t.id === 'showlogo') return act('settings', {k: 'showLogo', v: t.checked ? '1' : '0'});
  if (t.id === 'preimg') return act('settings', {k: 'preImg', v: t.checked ? '1' : '0'});
  if (t.id === 'showjn') return act('settings', {k: 'showJN', v: t.checked ? '1' : '0'});
  if (t.id === 'showround') return act('settings', {k: 'showRound', v: t.checked ? '1' : '0'});
  if (t.id === 'auto') return act('settings', {k: 'auto', v: t.checked ? '1' : '0'});
  if (t.dataset && t.dataset.t) return act('intotal', {id: +t.dataset.t, on: t.checked});
};

/* ---------- กรรมการ (ปุ่มกดแบบเครื่องคิดเลข) ---------- */
let JD = null, kv = '', jmsg = '', jkey = '', jbusy = false;
async function judgeLoad() { JD = await api('judge'); }
// ตารางคะแนนรวมบนจอกรรมการ (ชุดเดียวกับที่จอไลฟ์กำลังโชว์ อ่านง่ายบนมือถือ เลื่อนดูได้ทุกอันดับ)
function rankV(s, d) {
  const cols = s.single ? [] : s.show, cell = v => v == null ? '–' : fmtn(v);
  return `<div class="box"><div class="mu" style="text-align:center">${esc(d.pgName)}</div><h2 style="text-align:center">${esc(s.title)}</h2><div style="overflow-x:auto"><table><thead><tr><th class="n">#</th><th>ผู้เข้าประกวด</th>${cols.map(r => `<th class="n">${esc(r.name)}</th>`).join('')}<th class="n">รวม</th></tr></thead><tbody>${s.rows.map(r => `<tr><td class="n"><b>${r.rank}</b></td><td>${esc(r.c.country ? r.c.country + ' · ' + r.c.name : r.c.name)}</td>${cols.map((x, i) => `<td class="n">${cell(r.per[i] && r.per[i].avg)}</td>`).join('')}<td class="n"><b>${cell(r.tot)}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}
function judgeRender() {
  const d = JD, c = d.current, mine = d.mine, k2 = d.round + ':' + (c ? c.id : 0);
  if (jkey !== k2) { jkey = k2; kv = mine == null ? '' : String(mine); jmsg = ''; }
  if (d.ranking) { app.innerHTML = topbar('กรรมการ: ' + esc(d.name)) + rankV(d.ranking, d); return; }
  app.innerHTML = topbar('กรรมการ: ' + esc(d.name)) + `<div class="box" style="text-align:center"><div class="mu">${esc(d.pgName)} · ${esc(d.round)}</div>` + (!c ? '<p class="mu">รอผู้ดูแลเลือกผู้เข้าประกวด…</p>' : `${c.img ? `<div class="jph" style="margin-top:8px">${ph(c.img)}</div>` : ''}<div style="font-size:2.2rem;font-weight:700;line-height:1.2;text-transform:uppercase;margin-top:${c.img ? 0 : 14}px">${esc(c.country || c.name)}</div>${c.country ? `<div style="font-size:1.4rem;font-weight:500;line-height:1.25;margin-top:2px;text-transform:uppercase">${esc(c.name)}</div>` : ''}`
    + (c.revealed ? `<p class="mu">เปิดคะแนนแล้ว แก้ไขไม่ได้ คะแนนที่คุณให้: ${mine ?? '-'}</p>` : mine != null ? `<div class="val">${fmtn(mine)}</div><p class="ok" style="margin:6px 0">ส่งคะแนนแล้ว ล็อกเรียบร้อย แก้ไขไม่ได้</p><p class="mu">ถ้าต้องแก้ไข ให้แจ้งผู้ดูแล</p>` : `<div class="val">${kv === '' ? '<span class="mu">–</span>' : esc(kv)}</div><div class="mu">คะแนนเต็ม ${d.max}</div><div class="kp">${'123456789'.split('').map(k => `<button data-k="${k}">${k}</button>`).join('')}<button data-k="max">${d.max}</button><button data-k=".">.</button><button data-k="0">0</button><button data-k="del">⌫</button><button class="cf" data-k="ok">ยืนยัน</button></div><p class="bad" style="margin:8px 0 0">${esc(jmsg)}</p>`)) + '</div>';
}
async function press(k) {
  const d = JD, c = d.current; if (!c || c.revealed || d.mine != null || jbusy) return;
  jmsg = '';
  if (k === 'del') kv = kv.slice(0, -1);
  else if (k === 'max') kv = String(d.max);
  else if (k === '.') { if (!kv.includes('.')) kv = (kv || '0') + '.'; }
  else if (k === 'ok') {
    if (kv === '' || kv === '.' || isNaN(+kv)) jmsg = 'กรุณากรอกคะแนน';
    else {
      jbusy = true;
      try { await api('score', {score: kv}); await judgeLoad(); }
      catch (e) { jmsg = e.status === 409 ? e.message : 'ส่งไม่สำเร็จ กรุณาลองอีกครั้ง'; if (e.status === 409) { try { await judgeLoad(); } catch (x) {} } }
      jbusy = false;
    }
  } else {
    let n = kv === '0' ? k : kv + k;
    // ถ้าต่อเลขแล้วเกินคะแนนเต็ม (เช่น เต็ม 10 กด 9 แล้วกด 5 = 95) ให้เติมจุดทศนิยมให้เอง เป็น 9.5
    if (kv !== '' && kv !== '0' && !kv.includes('.') && +n > d.max) n = kv + '.' + k;
    if (/^\d*\.?\d{0,2}$/.test(n) && +n <= d.max) kv = n;
  }
  judgeRender();
}

/* ---------- เริ่มต้น ---------- */
function render() {
  document.body.classList.toggle('jd', ST.role === 'judge');
  if (!ST.role) return loginV();
  if (ST.role === 'super') return superV();
  if (ST.role === 'admin') { const r = adminV(); pvArm(); return r; }
  if (JD) judgeRender();
}
async function start(fromEnter) {
  clearInterval(timer);
  try {
    if (ST.role === 'super') { await superLoad(); render(); }
    else if (ST.role === 'admin') {
      await load(); if (!fromEnter) render();
      poll(async () => {
        if (editing || view === 'v' || view === 'm' || (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) return;
        const r = await pub('rev?pg=' + ST.pg); if (r.rev !== ST.p.rev) { await load(); render(); }
      }, 4000);
    } else {
      await judgeLoad(); render();
      poll(async () => { const r = await pub('rev?pg=' + ST.pg); if (r.rev !== JD.rev && !jbusy) { await judgeLoad(); render(); } }, 3000);
    }
  } catch (e) { logout(); }
}
async function boot() {
  if (Q.get('display')) return displayMode();
  app.addEventListener('click', onClick); app.addEventListener('change', onChange); app.addEventListener('input', onInput); app.addEventListener('paste', onPaste);
  addEventListener('resize', fit);
  addEventListener('keydown', e => {
    if (ST.role !== 'admin' || (view !== 'd' && view !== 'c')) return;
    const t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    const a = {' ': 'revcur', h: 'hide', H: 'hide', ArrowRight: 'next', ArrowLeft: 'prev', r: 'toggle', R: 'toggle'}[e.key]; if (!a) return;
    e.preventDefault(); onClick({target: {closest: s => s === '[data-a]' ? {dataset: {a, id: '', v: ''}} : null}});
  });
  let s = null; try { s = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) {}
  if (!s || !s.code) return loginV();
  ST.code = s.code; ST.pg = s.pg; ST.role = s.role; ST.fromSuper = !!s.fromSuper;
  try {
    const me = await api('me');
    if (me.role === 'super') { if (!ST.fromSuper) { ST.role = 'super'; ST.pg = 0; } else ST.role = 'admin'; ST.co = false; ST.perms = null; } else { applyMe(me); ST.fromSuper = false; ST.pg = me.pg; }
    start();
  } catch (e) { clearSess(); ST.code = ''; ST.role = null; loginV(); }
}
boot();
