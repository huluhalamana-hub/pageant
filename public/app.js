import { fmtn, key, gs, gr, inR, vscoreG, vsRound, calc, colsCfg, sumData, buildDisplay } from './core.js';

const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ph = (u, t) => u ? `<img src="${u}" alt="">` : esc(String(t || '').trim().slice(0, 1));
const th = (u, t) => `<span class="th">${ph(u, t)}</span>`;
function fit() { document.querySelectorAll('.sw').forEach(w => { const c = w.querySelector('.cv'); if (c) c.style.transform = `scale(${w.clientWidth / 1920})`; }); }

/* ---------- จอไลฟ์ ---------- */
const topbar = (t, back) => `<div class="top noprint"><div><b>${t}</b></div><div class="row">${back ? '<button data-a="back">← ผู้ดูแลหลัก</button>' : ''}<button data-a="logout">ออกจากระบบ</button></div></div>`;
function liveV(p) {
  const c = p.C.find(x => x.id === p.cur), rs = c ? gr(p, p.round, c.id) : null;
  const st = p.hide ? 'ซ่อนแถบคะแนนอยู่ (ชื่อรอบและโลโก้ที่เปิดไว้ยังแสดง)' : !c || rs.out ? 'แสดงเฉพาะชื่อรอบ (ยังไม่ได้เลือกผู้เข้าประกวด)' : rs.rev ? 'กำลังแสดงคะแนนของ ' + c.name : ({name: 'แสดงเฉพาะชื่อ รอเปิดคะแนน', dash: 'แสดงช่องคะแนนเป็นขีด รอเปิดคะแนน', none: 'จอว่างเปล่า รอเปิดคะแนน'})[p.pre || 'dash'];
  return `<p class="mu" style="margin:8px 0">สถานะจอตอนนี้: <b>${esc(st)}</b><br>ชื่อรอบที่มุมซ้ายบนและโลโก้ (ถ้าเปิดไว้) แสดงตลอด ตอนยังไม่เลือกผู้เข้าประกวดหรือกดซ่อน จะไม่มีแถบหรือข้อความอื่นใดบนจอ ถ้าไม่ต้องการชื่อรอบ ปิดได้ที่แท็บจัดการ</p>
  <div class="row"><button data-a="hide" class="${p.hide ? 'p' : ''}">${p.hide ? 'แสดงจอ' : 'ซ่อนจอทั้งหมด'}</button><button data-a="revcur" ${c ? '' : 'disabled'}>${rs && rs.rev ? 'ซ่อนคะแนนคนนี้' : 'เปิดคะแนนคนนี้'}</button><button data-a="prev">← คนก่อนหน้า</button><button data-a="next">คนถัดไป →</button></div>`;
}
function controlV(p) {
  const c = p.C.find(x => x.id === p.cur), rs = c ? gr(p, p.round, c.id) : null, rd = p.rounds.find(x => x.id === p.round) || {name: ''};
  const sub = c ? p.J.filter(j => gs(p, p.round, c.id, j.id) != null).length : 0;
  const B = (a, v, t, on) => `<button data-a="${a}" data-v="${v}" class="${on ? 'p' : ''}">${t}</button>`;
  return dHTMLp(p) + `<div class="box" style="margin-top:10px;text-align:center">${c ? `<div class="jph">${ph(c.img, c.no)}</div><div style="font-size:1.5rem;font-weight:700">${esc(c.name)}</div><div class="mu">หมายเลข ${esc(c.no)} · ${esc(rd.name)} · กรรมการส่งแล้ว ${sub}/${p.J.length}</div><div class="mu">${p.J.map(j => (gs(p, p.round, c.id, j.id) != null ? '✓' : '✗') + esc(j.name)).join(' ')}</div>` : '<div class="mu">ยังไม่ได้เลือกผู้เข้าประกวด</div>'}</div>
  <div class="ctl"><button class="big ${rs && !rs.rev ? 'p' : ''}" data-a="revcur" ${c ? '' : 'disabled'}>${rs && rs.rev ? 'ซ่อนคะแนน' : 'เปิดคะแนน'}</button><button class="big ${p.hide ? 'p' : ''}" data-a="hide">${p.hide ? 'แสดงจอ' : 'ซ่อนจอทั้งหมด'}</button><button class="big" data-a="prev">← ก่อนหน้า</button><button class="big" data-a="next">ถัดไป →</button></div>
  <div class="row" style="margin-top:10px">${B('mode', 'current', 'แสดงผู้เข้าประกวด', p.mode === 'current')}${B('mode', 'ranking', 'แสดงอันดับ', p.mode === 'ranking')}</div>
  ${p.mode === 'ranking' ? `<div class="row" style="margin-top:8px">${B('rank', 0, 'สรุปคะแนน', p.rank === 0)}${p.rounds.map(x => B('rank', x.id, esc(x.name), p.rank === x.id)).join('')}</div>` : ''}
  <p class="mu">ปุ่มลัดคีย์บอร์ด (ใช้ได้ในแท็บจอไลฟ์และควบคุมสด): เว้นวรรค = เปิด/ซ่อนคะแนน · H = ซ่อน/แสดงจอ · ลูกศรซ้าย/ขวา = คนก่อนหน้า/ถัดไป · R = สลับผู้เข้าประกวด/อันดับ</p>`;
}
function resultsV(p) {
  const n = p.J.length, d = sumData(p, p.rounds), list = d.ranked.concat(d.rows.filter(r => r.tot == null)), C = colsCfg(p, false, n), cell = v => v == null ? '–' : fmtn(v);
  const inc = p.rounds.filter(x => x.inTotal !== false);
  return `<div class="box"><h2>สรุปผลทุกรอบ</h2><p class="mu">คะแนนแต่ละรอบเฉลี่ยกรรมการก่อน แล้วรวมรอบที่ติ๊ก "นับในคะแนนรวม" (${inc.map(x => esc(x.name)).join(', ') || 'ยังไม่ได้เลือกรอบ'}) แบบ${p.agg === 'sum' ? 'บวกรวม' : 'เฉลี่ย'} ${p.jw < 100 ? `ถ้ามีโหวต จะนำมารวมตามสัดส่วนกรรมการ ${p.jw}% / โหวต ${100 - p.jw}%` : 'ตอนนี้ใช้คะแนนกรรมการ 100% (ไม่คิดโหวต)'} เครื่องหมาย * คือรอบที่ไม่ถูกนับ</p>
  <div style="overflow-x:auto"><table><thead><tr><th class="n" rowspan="2">อันดับ</th><th class="n" rowspan="2">เลขที่</th><th rowspan="2">ผู้เข้าประกวด</th>${p.rounds.map(r => `<th class="n" colspan="${C.g}">${esc(r.name)}${r.inTotal === false ? ' *' : ''}</th>`).join('')}<th class="n" colspan="${C.tail}">${C.tail > 1 ? 'คะแนนรวม' : 'รวม'}</th></tr><tr>${p.rounds.map(() => p.J.map(j => `<th class="n">${esc(j.name)}</th>`).join('') + '<th class="n">เฉลี่ย</th>' + (C.gv ? '<th class="n">โหวต</th>' : '')).join('')}${C.tail > 1 ? '<th class="n">คะแนนกรรมการ</th><th class="n">โหวต</th><th class="n">คะแนนโหวต</th><th class="n">รวม</th>' : ''}</tr></thead><tbody>${list.map(r => `<tr><td class="n">${r.rank || '–'}</td><td class="n">${esc(r.c.no)}</td><td>${esc(r.c.country ? r.c.country + ' · ' + r.c.name : r.c.name)}</td>${r.per.map(x => p.J.map((j, k) => `<td class="n">${cell(x && x.scores[k])}</td>`).join('') + `<td class="n"><b>${cell(x && x.avg)}</b></td>` + (C.gv ? `<td class="n">${cell(x && x.vote)}</td>` : '')).join('')}${C.tail > 1 ? `<td class="n">${cell(r.jt)}</td><td class="n">${r.votes == null ? '–' : r.votes}</td><td class="n">${cell(r.vsc)}</td><td class="n"><b>${cell(r.tot)}</b></td>` : `<td class="n"><b>${cell(r.tot)}</b></td>`}</tr>`).join('')}</tbody></table></div>
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
function manageV(p) {
  const rd = p.rounds.find(x => x.id === p.round) || {name: ''}, n = p.J.length;
  const B = (a, v, t, on) => `<button data-a="${a}" data-v="${v}" class="${on ? 'p' : ''}">${t}</button>`;
  return `<div class="box"><h2>สีและโลโก้บนจอไลฟ์</h2>${dHTMLp(p, true)}
    <div class="row" style="margin-top:10px">${PRE.map((x, i) => `<button data-a="preset" data-id="${i}"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${x[1]};margin-right:6px;vertical-align:middle"></span>${x[0]}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><label style="flex:1">สีหลัก<input id="c1" type="color" value="${p.col.c1}" style="padding:2px;height:42px"></label><label style="flex:1">สีพื้นแถบ<input id="c2" type="color" value="${p.col.c2}" style="padding:2px;height:42px"></label><label style="flex:1">สีตัวหนังสือ<input id="c3" type="color" value="${p.col.c3}" style="padding:2px;height:42px"></label></div>
    <label>ภาษาป้ายบนจอ</label><div class="row">${B('lang', 'th', 'ไทย', (p.lang || 'th') === 'th')}${B('lang', 'en', 'English', p.lang === 'en')}</div><label><input type="checkbox" id="showlogo" style="width:auto" ${p.showLogo ? 'checked' : ''}> แสดงโลโก้บนจอ</label><label><input type="checkbox" id="showround" style="width:auto" ${p.showRound !== false ? 'checked' : ''}> แสดงชื่อรอบที่มุมซ้ายบนจอตลอด (กด "ใช้รอบนี้" แล้วขึ้นทันที)</label><div class="row"><button data-a="logoup">อัปโหลดโลโก้</button>${p.logo ? '<button class="d" data-a="logoclr">ลบโลโก้</button>' : ''}</div></div>
  <div class="box"><h2>การแสดงผลและคะแนน</h2><div class="row">${B('mode', 'current', 'แสดงผู้เข้าประกวดปัจจุบัน', p.mode === 'current')}${B('mode', 'ranking', 'แสดงอันดับ', p.mode === 'ranking')}</div>
    ${p.mode === 'ranking' ? `<label>อันดับที่จะแสดง</label><div class="row">${B('rank', 0, 'สรุปคะแนน (รอบที่ติ๊ก)', p.rank === 0)}${p.rounds.map(x => B('rank', x.id, esc(x.name), p.rank === x.id)).join('')}</div>` : ''}
    <label>ก่อนเปิดคะแนน จอแสดง</label><div class="row">${B('pre', 'name', 'เฉพาะรูปและชื่อ', p.pre === 'name')}${B('pre', 'dash', 'ช่องคะแนนเป็นขีด', (p.pre || 'dash') === 'dash')}${B('pre', 'none', 'ว่างจนกว่าจะเปิดคะแนน', p.pre === 'none')}</div>
    <label>คะแนนรวม คิดแบบ</label><div class="row">${B('agg', 'avg', 'เฉลี่ยทุกรอบ', p.agg === 'avg')}${B('agg', 'sum', 'บวกรวมทุกรอบ', p.agg === 'sum')}</div>
    <label><input type="checkbox" id="auto" style="width:auto" ${p.auto ? 'checked' : ''}> เปิดคะแนนอัตโนมัติเมื่อกรรมการส่งครบ</label>
    <label>คะแนนเต็ม</label><div class="row"><input id="max" type="number" value="${p.max}" style="max-width:120px;flex:none"><button data-a="max">บันทึก</button></div>
    <label>สัดส่วน: กรรมการ <b>${p.jw}%</b> · โหวต <b>${100 - p.jw}%</b></label><div class="row"><input id="jw" type="number" min="0" max="100" value="${p.jw}" style="max-width:120px;flex:none"><button data-a="jw">บันทึก (% ของกรรมการ)</button></div><p class="mu">วิธีคิด: เอาคะแนนกรรมการของแต่ละรอบมาเฉลี่ยก่อน แล้วรวมรอบที่ติ๊กไว้ ถ้าไม่มีโหวต (หรือตั้งกรรมการ 100%) นั่นคือคะแนนรวมเลย ถ้ามีโหวต เอาคะแนนกรรมการที่เฉลี่ยแล้วมาคิดกับคะแนนโหวตตามสัดส่วน (กรรมการ ${p.jw}% + โหวต ${100 - p.jw}%) แล้วค่อยรวม กรอกโหวตที่แท็บ "โหวต"</p>
    <label>การนับโหวต</label><div class="row">${B('vmode', 'all', 'โหวตรวมครั้งเดียวทุกรอบ', (p.vmode || 'all') === 'all')}${B('vmode', 'round', 'โหวตแยกแต่ละรอบ', p.vmode === 'round')}</div>
    <label>แปลงจำนวนโหวตเป็นคะแนน</label><div class="row">${B('vm', 'share', 'สัดส่วนจากโหวตรวม', p.vm === 'share')}${B('vm', 'top', 'อิงคนโหวตสูงสุด', p.vm === 'top')}</div>
    <p class="mu">${p.vm === 'share' ? `สัดส่วนจากโหวตรวม: คะแนนโหวต = โหวตของคนนั้น ÷ โหวตรวมของทุกคน x ${p.max} เช่น โหวตรวม 1600 ได้ 1000 → ${fmtn(1000 / 1600 * p.max)}, 500 → ${fmtn(500 / 1600 * p.max)}, 100 → ${fmtn(100 / 1600 * p.max)}` : `อิงคนโหวตสูงสุด: คนโหวตมากสุดได้เต็ม ${p.max} คนอื่นตามสัดส่วน เช่น 1000 → ${p.max}, 500 → ${fmtn(p.max / 2)}, 100 → ${fmtn(p.max / 10)}`}</p></div>
  <div class="box"><h2>รอบ</h2>${p.rounds.map(x => `<div class="ci"><div>${esc(x.name)} ${x.id === p.round ? '<span class="ok">· กำลังใช้</span>' : ''}<label style="margin:4px 0 0;color:var(--ink)"><input type="checkbox" data-t="${x.id}" ${x.inTotal !== false ? 'checked' : ''} style="width:auto"> นับในคะแนนรวม</label></div><div class="btns">${x.id === p.round ? '' : `<button data-a="rd" data-id="${x.id}">ใช้รอบนี้</button>`}<button data-a="rdren" data-id="${x.id}">เปลี่ยนชื่อ</button><button class="d" data-a="rddel" data-id="${x.id}">ลบ</button></div></div>`).join('')}
    <div class="row" style="margin-top:10px"><input id="rn" placeholder="ชื่อรอบ เช่น รอบชุดราตรี"><button class="p" data-a="rdadd">เพิ่มรอบ</button></div></div>
  <div class="box"><h2>ผู้เข้าประกวด · รอบ: ${esc(rd.name)}</h2>${p.C.map(c => {
    const rs = gr(p, p.round, c.id), k = calc(p, p.round, c), got = p.J.filter(j => gs(p, p.round, c.id, j.id) != null).length, cu = c.id === p.cur;
    const ed = editing === c.id ? `<div class="box" style="margin:8px 0"><div class="mu">แก้คะแนนรอบ ${esc(rd.name)} ของ ${esc(c.name)} (เต็ม ${p.max}) เว้นว่าง = ยังไม่ให้</div><div class="row" style="margin-top:6px">${p.J.map(j => `<label style="flex:1;min-width:100px">${esc(j.name)}<input id="se-${j.id}" type="number" step="0.01" value="${gs(p, p.round, c.id, j.id) ?? ''}"></label>`).join('')}</div><div class="row" style="margin-top:8px"><button class="p" data-a="savesc" data-id="${c.id}">บันทึกคะแนน</button><button data-a="edsc" data-id="0">ปิด</button></div></div>` : '';
    return `<div class="ci ${rs.out ? 'out' : ''}"><div class="l">${th(c.img, c.name)}<div style="min-width:0"><b style="color:var(--gold)">${esc(c.no)}</b> ${esc(c.name)}${c.country ? ` <span class="mu">· ${esc(c.country)}</span>` : ''}${rs.rev ? ' <span class="ok">· เปิดแล้ว</span>' : ''}${rs.out ? ' <span class="chip">ไม่อยู่ในรอบนี้</span>' : ''}<div class="mu">กรรมการให้แล้ว ${got}/${n}${got ? ' · เฉลี่ยรอบนี้ ' + fmtn(k.avg) : ''}${cu && !rs.out ? ' · กำลังให้คะแนน' : ''}</div></div></div>
    <div class="btns">${cu || rs.out ? '' : `<button data-a="cur" data-id="${c.id}">ให้คะแนนคนนี้</button>`}${rs.out ? '' : `<button data-a="rev" data-id="${c.id}" class="${cu && !rs.rev ? 'p' : ''}">${rs.rev ? 'ซ่อนคะแนน' : 'เปิดคะแนน'}</button><button data-a="edsc" data-id="${c.id}">ใส่/แก้คะแนน</button>`}<button data-a="out" data-id="${c.id}">${rs.out ? 'ใส่กลับรอบนี้' : 'ตัดออกจากรอบนี้'}</button><button data-a="img" data-k="C" data-id="${c.id}">รูป</button><button data-a="editc" data-id="${c.id}">แก้ไข</button><button class="d" data-a="del" data-id="${c.id}">ลบ</button></div></div>${ed}`;
  }).join('') || '<p class="mu">ยังไม่มีผู้เข้าประกวด</p>'}
    <div class="row" style="margin-top:10px"><input id="cno" type="number" placeholder="เลขที่" style="max-width:80px;flex:none"><input id="cnm" placeholder="ชื่อ"></div>
    <div class="row" style="margin-top:6px"><input id="cct" placeholder="ประเทศ (ไม่บังคับ)"><button class="p" data-a="addc">เพิ่ม</button></div>
    <p class="mu">"ตัดออกจากรอบนี้" ใช้เมื่อบางคนไม่ได้เข้ารอบต่อ (เช่น รอบชิงเหลือ 5 คน) เขาจะไม่ขึ้นในรอบนั้นและไม่ถูกนับในอันดับของรอบนั้น</p></div>
  <div class="box"><h2>กรรมการ</h2>${p.J.map(j => `<div class="ci"><div class="l">${th(j.img, j.name)}<div>${esc(j.name)}<div class="mu">รหัสเข้าระบบ: <b>${esc(j.code)}</b></div></div></div><div class="btns"><button data-a="img" data-k="J" data-id="${j.id}">รูป</button><button data-a="jcode" data-id="${j.id}">แก้รหัส</button><button class="d" data-a="jdel" data-id="${j.id}">ลบ</button></div></div>`).join('') || '<p class="mu">ยังไม่มีกรรมการ</p>'}
    <div class="row" style="margin-top:10px"><input id="jnm" placeholder="ชื่อกรรมการ"><input id="jcd" placeholder="รหัสเข้าระบบ (ตั้งเอง)"><button class="p" data-a="addj">เพิ่ม</button></div>
    <p class="mu">รหัสกรรมการตั้งเองได้ ไม่ซ้ำกันในเวทีเดียวกัน กรรมการแต่ละคนเห็นแค่คะแนนที่ตัวเองให้จนกว่าจะเปิดคะแนน และเมื่อกด "ยืนยัน" แล้วคะแนนจะล็อก กรรมการแก้เองไม่ได้ ถ้าต้องแก้ แอดมินแก้ให้ได้ที่ปุ่ม "ใส่/แก้คะแนน"</p></div>`;
}

/* ---------- กรรมการ (ปุ่มกดแบบเครื่องคิดเลข) ---------- */
function adminV() {
  const p = ST.p;
  app.innerHTML = topbar(esc(p.name) + ' · แอดมิน', ST.fromSuper) + `<div class="tabs noprint"><button data-a="tab" data-v="d" class="${view === 'd' ? 'on' : ''}">จอไลฟ์</button><button data-a="tab" data-v="c" class="${view === 'c' ? 'on' : ''}">ควบคุมสด</button><button data-a="tab" data-v="r" class="${view === 'r' ? 'on' : ''}">สรุปผล</button><button data-a="tab" data-v="v" class="${view === 'v' ? 'on' : ''}">โหวต</button><button data-a="tab" data-v="h" class="${view === 'h' ? 'on' : ''}">ประวัติแก้ไข</button><button data-a="tab" data-v="m" class="${view === 'm' ? 'on' : ''}">จัดการ</button></div>` + (view === 'd' ? dHTMLp(p) + liveV(p) + linkBox(p) : view === 'c' ? controlV(p) : view === 'r' ? resultsV(p) : view === 'v' ? votesV(p) : view === 'h' ? historyV(p) : manageV(p));
  fit();
}

/* ====== ส่วนเชื่อมกับเซิร์ฟเวอร์ (API) ====== */
const Q = new URLSearchParams(location.search);
const PRE = [['ทอง', '#e3b95a', '#1c1006', '#f4e9d3'], ['ชมพู', '#ff8fb8', '#2a0f1e', '#fff0f6'], ['ฟ้า', '#6fc3ff', '#0b1b2e', '#eaf6ff'], ['เขียว', '#6fe0a6', '#0b2a1c', '#eafff4'], ['ม่วง', '#c79bff', '#1b1030', '#f5eeff']];
let ST = {code: '', pg: 0, role: null, fromSuper: false, p: null, list: [], sel: null};
let view = 'd', editing = 0, timer = null;
const SK = 'pg_sess2';
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
function barHTML(b, L) {
  const n = b.judges.length, R = b.R, col = Math.min(190, Math.floor(920 / (n + 1)));
  const jp = Math.max(40, Math.min(92, col - 14)), jn = Math.max(11, Math.min(19, Math.round(col * .13))), jsz = Math.max(22, Math.min(48, Math.round(col * .36))), t0 = n * .3 + .2;
  const jc = b.judges.map((j, i) => { const v = R ? R.scores[i] : null; return `<div class="jc" style="width:${col}px"><div class="jp">${ph(j.img, j.name)}</div><div class="jn">${esc(j.name)}</div><div class="js ${v == null ? 'dim' : ''}" ${v != null ? `style="animation-delay:${i * .3}s"` : ''}>${v == null ? '–' : fmtn(v)}</div></div>`; }).join('');
  const av = `<div class="jc av" style="width:${col}px"><div class="jp ic bars"><b style="height:30%"></b><b style="height:60%"></b><b style="height:90%"></b></div><div class="jn">${esc(L.avg)}</div><div class="js ${R ? '' : 'dim'}" ${R ? `style="animation-delay:${t0}s"` : ''}>${R ? fmtn(R.avg) : '–'}</div></div>`;
  return `<div class="bar" style="width:${b.cols ? 1680 : 760}px;--jp:${jp}px;--jn:${jn}px;--js:${jsz}px"><div class="cph">${ph(b.c.img, b.c.no)}</div><div class="info"><div class="cn2">${esc(b.c.name)}</div>${b.c.country ? `<div class="cc">${esc(b.c.country)}</div>` : ''}</div>${b.cols ? `<div class="jrow">${jc}${av}</div>` : ''}</div>`;
}
function sumVMHTML(s, L) {
  const {n, single, show, C, J, rows} = s, nc = show.length * C.g + C.tail;
  const gaps = (nc + 2) * 6; let nameW = 300, cw = Math.floor((1760 - 112 - nameW - gaps) / nc);
  if (cw < 56) { nameW = 150; cw = Math.floor((1760 - 112 - nameW - gaps) / nc); }
  cw = Math.max(30, Math.min(118, cw));
  const W = 80 + 112 + nameW + nc * cw + gaps, k = W > 1840 ? 1840 / W : 1, fs = Math.max(16, Math.min(32, Math.round(cw * .36))), hs = Math.max(10, Math.min(20, Math.round(cw * .17))), pw = Math.max(18, Math.min(40, cw - 6));
  const tpl = `56px 56px ${nameW}px repeat(${nc}, ${cw}px)`;
  const jh = J.map((j, k2) => `<div class="jh ${k2 === 0 ? 'bd' : ''}"><div class="ph2">${ph(j.img, j.name)}</div><div class="nm">${esc(j.name)}</div></div>`).join('');
  const tailA = !C.tail ? '' : `<span class="rh g bd" style="grid-column:span ${C.tail}">${esc(C.tail > 1 ? L.total : L.tot)}</span>`;
  const tailB = !C.tail ? '' : C.tail > 1 ? `<span class="rh bd">${esc(L.jtot)}</span><span class="rh">${esc(L.votes)}</span><span class="rh">${esc(L.vsc)}</span><span class="rh g">${esc(L.tot)}</span>` : '<span></span>';
  const h1 = `<div class="rrow hd h1" style="grid-template-columns:${tpl}"><span class="rk-t" style="grid-column:span 3">${esc(s.title)}</span>${show.map(r => `<span class="rh g bd" style="grid-column:span ${C.g}">${esc(r.name)}</span>`).join('')}${tailA}</div>`;
  const h2 = `<div class="rrow hd h2" style="grid-template-columns:${tpl}"><span></span><span></span><span></span>${show.map(() => jh + `<span class="rh g">${esc(L.avg)}</span>` + (C.gv ? `<span class="rh">${esc(L.rv)}</span>` : '')).join('')}${tailB}</div>`;
  const body = rows.map((r, i) => `<div class="rrow" style="grid-template-columns:${tpl};--fs:${fs}px;animation-delay:${i * .1}s"><span class="rn">${r.rank}</span><span class="rp">${ph(r.c.img, r.c.name)}</span><span class="rtn">${r.c.country ? esc(r.c.country) + `<small>${esc(r.c.name)}</small>` : esc(r.c.name)}</span>${r.per.map(x => J.map((j, k2) => `<span class="sc ${k2 === 0 ? 'bd' : ''}">${x && x.scores[k2] != null ? fmtn(x.scores[k2]) : '–'}</span>`).join('') + `<span class="sc av">${x ? fmtn(x.avg) : '–'}</span>` + (C.gv ? `<span class="sc">${x && x.vote != null ? fmtn(x.vote) : '–'}</span>` : '')).join('')}${C.tail > 1 ? `<span class="sc bd av">${fmtn(r.jt)}</span><span class="sc">${r.votes == null ? '–' : r.votes.toLocaleString('en-US')}</span><span class="sc">${r.vsc == null ? '–' : fmtn(r.vsc)}</span><span class="sc av">${fmtn(r.tot)}</span>` : C.tail === 1 ? `<span class="sc bd av">${fmtn(r.tot)}</span>` : ''}</div>`).join('');
  return `<div class="rkw" style="left:${k < 1 ? 40 : (1920 - W) / 2}px;width:${W}px;transform:scale(${k})"><div class="rkp" style="width:${W}px;--hs:${hs}px;--pw:${pw}px">${h1}${h2}${body}</div></div>`;
}
function innerVM(vm) {
  let h = '';
  if (vm.chip) h += `<div class="stg">${esc(vm.chip)}</div>`;
  if (vm.logo !== null && vm.logo !== undefined) h += `<div class="lg">${vm.logo ? `<img src="${vm.logo}" alt="">` : 'LOGO'}</div>`;
  if (vm.bar) h += barHTML(vm.bar, vm.L); else if (vm.sum) h += sumVMHTML(vm.sum, vm.L);
  return h;
}
const varsOf = vm => `--c1:${vm.col.c1};--c2:${vm.col.c2};--c3:${vm.col.c3}`;
const dHTMLp = (p, force) => { const vm = buildDisplay(p, {force}); return `<div class="sw" style="${varsOf(vm)}"><div class="cv">${innerVM(vm)}</div></div>`; };

/* ---------- หน้าจอไลฟ์สาธารณะ (/?display=1&pg=เลขเวที&t=1 โปร่งใส) ---------- */
function displayMode() {
  document.body.classList.add('disp'); if (Q.get('t')) document.body.classList.add('tr');
  app.innerHTML = '<div class="cv" id="cv"></div>';
  const cv = $('#cv'), pg = +Q.get('pg') || 0; let last = -1, lastKey = '';
  const fitD = () => { cv.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  fitD(); addEventListener('resize', fitD);
  const tick = async () => {
    try {
      const r = await pub('rev?pg=' + pg); if (r.rev === undefined || r.rev === last) return;
      const vm = await pub('display?pg=' + pg); last = r.rev;
      const html = innerVM(vm), k = varsOf(vm) + html;
      if (k !== lastKey) { lastKey = k; cv.setAttribute('style', cv.getAttribute('style').replace(/--c\d:[^;]*;?/g, '') + ';' + varsOf(vm)); cv.innerHTML = html; }
    } catch (e) {}
  };
  tick(); setInterval(tick, 2000);
}

/* ---------- เข้าสู่ระบบ ---------- */
async function loginV(msg, cached) {
  const keep = $('#code') ? $('#code').value : '';
  let list = ST.list; if (!cached || !list.length) { try { list = await pub('pageants'); } catch (e) {} ST.list = list; }
  if (ST.sel === null || (ST.sel !== 0 && !list.some(x => x.id === ST.sel))) ST.sel = list[0] ? list[0].id : 0;
  app.innerHTML = `<h1>ระบบลงคะแนนประกวด</h1><div class="box"><h2>เข้าสู่ระบบ</h2><label>เลือกเวที</label><div class="row">${list.map(p => `<button data-pg="${p.id}" class="${ST.sel === p.id ? 'p' : ''}">${esc(p.name)}</button>`).join('')}<button data-pg="0" class="${ST.sel === 0 ? 'p' : ''}">ผู้ดูแลหลัก</button></div>
    <label>${ST.sel === 0 ? 'รหัสผู้ดูแลหลัก' : 'รหัส (กรรมการหรือแอดมินเวที)'}</label><input id="code" type="password" autocomplete="off" placeholder="รหัส"><div style="margin-top:10px"><button class="p" id="go" style="width:100%">เข้าสู่ระบบ</button></div><div class="bad" id="lm">${esc(msg || '')}</div></div>`;
  document.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { ST.sel = +b.dataset.pg; loginV('', true); });
  $('#code').value = keep;
  const go = async () => {
    const code = $('#code').value.trim(); if (!code) return;
    ST.code = code; ST.pg = ST.sel;
    try { const me = await api('me'); ST.role = me.role; ST.fromSuper = false; if (me.role === 'super') ST.pg = 0; saveSess(); start(); }
    catch (e) { ST.code = ''; ST.role = null; loginV(e.status === 429 ? e.message : 'รหัสไม่ถูกต้อง'); }
  };
  $('#go').onclick = go; $('#code').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function logout() { clearInterval(timer); clearSess(); ST = {code: '', pg: 0, role: null, fromSuper: false, p: null, list: [], sel: ST.sel}; view = 'd'; editing = 0; loginV(); }

/* ---------- ผู้ดูแลหลัก ---------- */
async function superLoad() { ST.list = (await api('super')).pageants; }
function superV() {
  app.innerHTML = topbar('ผู้ดูแลหลัก') + `<div class="box"><h2>เวทีทั้งหมด</h2>${ST.list.map(p => `<div class="ci"><div><b>${esc(p.name)}</b><div class="mu">รหัสแอดมินเวที: <b>${esc(p.adm)}</b> · กรรมการ ${p.judges} คน · ผู้เข้าประกวด ${p.contestants} คน</div></div><div class="btns"><button class="p" data-a="enter" data-id="${p.id}">เข้าไปจัดการ</button><button data-a="pgren" data-id="${p.id}">เปลี่ยนชื่อ</button><button data-a="pgcode" data-id="${p.id}">เปลี่ยนรหัสแอดมิน</button><button class="d" data-a="pgdel" data-id="${p.id}">ลบ</button></div></div>`).join('') || '<p class="mu">ยังไม่มีเวที</p>'}
    <h2 style="margin-top:14px">เพิ่มเวทีใหม่</h2><div class="row"><input id="npn" placeholder="ชื่อเวที เช่น Miss Hong"><input id="npc" placeholder="รหัสแอดมินเวที (ตั้งเอง)"><button class="p" data-a="pgadd">เพิ่มเวที</button></div>
    <p class="mu">ส่งรหัสแอดมินให้ผู้จัดเวทีนั้น เขาจะตั้งค่ารอบ ผู้เข้าประกวด กรรมการและรหัสกรรมการ สี และโลโก้ได้เองโดยไม่ต้องผ่านคุณ และมองไม่เห็นข้อมูลของเวทีอื่น</p></div>`;
}
async function sact(a, body) { try { await api('super/' + a, body); await superLoad(); } catch (e) { alert(e.message); } superV(); }

/* ---------- แอดมินเวที ---------- */
async function load() { ST.p = await api('admin'); }
async function act(a, body) { try { await api('admin/' + a, body || {}); } catch (e) { alert(e.message); } try { await load(); } catch (e) {} render(); }
function linkBox(p) {
  const u = `${location.origin}/?display=1&pg=${p.id}`;
  return `<div class="box noprint" style="margin-top:12px"><h2>ลิงก์จอไลฟ์สำหรับ OBS</h2><p class="mu">ใน OBS เพิ่มแหล่งภาพแบบ Browser ใส่ลิงก์นี้ ขนาด 1920 x 1080</p><input readonly value="${esc(u)}" onclick="this.select()"><p class="mu" style="margin-top:8px">แบบพื้นหลังโปร่งใส (ซ้อนบนภาพกล้อง)</p><input readonly value="${esc(u + '&t=1')}" onclick="this.select()"></div>`;
}
function tableData(p) {
  const n = p.J.length, d = sumData(p, p.rounds), list = d.ranked.concat(d.rows.filter(r => r.tot == null)), C = colsCfg(p, false, n), c = v => v == null ? '' : fmtn(v);
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
function pick(logo, cb) {
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    try {
      const b = await createImageBitmap(file), c = document.createElement('canvas'); let data;
      if (logo) { const s = Math.min(1, 400 / b.width); c.width = Math.round(b.width * s); c.height = Math.round(b.height * s); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); data = c.toDataURL('image/png'); }
      else { const s = Math.min(b.width, b.height); c.width = c.height = 240; c.getContext('2d').drawImage(b, (b.width - s) / 2, (b.height - s) / 2, s, s, 0, 0, 240, 240); data = c.toDataURL('image/jpeg', .8); }
      await cb(data);
    } catch (e) { alert('ใส่รูปไม่สำเร็จ'); }
  };
  f.click();
}
const numOrNull = v => { v = String(v ?? '').trim(); return v === '' ? '' : v; };
const onClick = async e => {
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
  if (a === 'enter') { ST.pg = id; ST.role = 'admin'; ST.fromSuper = true; view = 'm'; editing = 0; saveSess(); try { await load(); } catch (er) { alert(er.message); } render(); return start(true); }
  if (a === 'pgadd') return sact('pgadd', {name: $('#npn').value, adm: $('#npc').value});
  if (a === 'pgren') { const x = ST.list.find(y => y.id === id), n = prompt('ชื่อเวที', x.name); return n === null ? null : sact('pgren', {id, name: n}); }
  if (a === 'pgcode') { const x = ST.list.find(y => y.id === id), n = prompt('รหัสแอดมินเวทีใหม่', x.adm); return n === null ? null : sact('pgcode', {id, adm: n}); }
  if (a === 'pgdel') { if (!confirm('ลบเวทีนี้และข้อมูลทั้งหมด (ลบแล้วกู้คืนไม่ได้)?')) return; return sact('pgdel', {id}); }
  // แอดมินเวที
  const st = (k, val) => act('settings', {k, v: val});
  if (['mode', 'agg', 'vm', 'vmode', 'pre', 'lang', 'rank'].includes(a)) return st(a, v);
  if (a === 'toggle') return st('mode', p.mode === 'ranking' ? 'current' : 'ranking');
  if (a === 'hide') return st('hide', p.hide ? '0' : '1');
  if (a === 'max') return st('max', $('#max').value);
  if (a === 'jw') return st('jw', $('#jw').value);
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
  if (a === 'out') return act('out', {id});
  if (a === 'next' || a === 'prev') return act('step', {dir: a});
  if (a === 'savesc') { const scores = {}; p.J.forEach(j => { scores[j.id] = $('#se-' + j.id).value; }); editing = 0; return act('setscores', {id, scores}); }
  if (a === 'img') return pick(false, async d => { try { await api('admin/img', {kind: b.dataset.k === 'C' ? 'contestant' : 'judge', id, data: d}); } catch (er) { alert(er.message); } await load(); render(); });
  if (a === 'del') { if (!confirm('ลบผู้เข้าประกวดคนนี้และคะแนนทุกรอบ?')) return; return act('delc', {id}); }
  if (a === 'editc') {
    const c = p.C.find(x => x.id === id), no = prompt('เลขที่', c.no); if (no === null) return;
    const nm = prompt('ชื่อ', c.name); if (nm === null) return; const ct = prompt('ประเทศ/จังหวัด (เว้นว่างได้)', c.country || ''); if (ct === null) return;
    return act('editc', {id, no, name: nm, country: ct});
  }
  if (a === 'addc') return act('addc', {no: $('#cno').value, name: $('#cnm').value, country: $('#cct').value});
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
const onChange = e => {
  if (ST.role !== 'admin') return; const t = e.target;
  if (['c1', 'c2', 'c3'].includes(t.id)) return act('settings', {k: 'colors', v: ['c1', 'c2', 'c3'].map(i => $('#' + i).value).join(',')});
  if (t.id === 'showlogo') return act('settings', {k: 'showLogo', v: t.checked ? '1' : '0'});
  if (t.id === 'showround') return act('settings', {k: 'showRound', v: t.checked ? '1' : '0'});
  if (t.id === 'auto') return act('settings', {k: 'auto', v: t.checked ? '1' : '0'});
  if (t.dataset && t.dataset.t) return act('intotal', {id: +t.dataset.t, on: t.checked});
};

/* ---------- กรรมการ (ปุ่มกดแบบเครื่องคิดเลข) ---------- */
let JD = null, kv = '', jmsg = '', jkey = '', jbusy = false;
async function judgeLoad() { JD = await api('judge'); }
function judgeRender() {
  const d = JD, c = d.current, mine = d.mine, k2 = d.round + ':' + (c ? c.id : 0);
  if (jkey !== k2) { jkey = k2; kv = mine == null ? '' : String(mine); jmsg = ''; }
  app.innerHTML = topbar('กรรมการ: ' + esc(d.name)) + `<div class="box" style="text-align:center"><div class="mu">${esc(d.pgName)} · ${esc(d.round)}</div>` + (!c ? '<p class="mu">รอผู้ดูแลเลือกผู้เข้าประกวด…</p>' : `<div class="jph" style="margin-top:8px">${ph(c.img, c.no)}</div><div style="font-size:1.4rem;font-weight:600">${esc(c.name)}</div><div class="mu">หมายเลข ${esc(c.no)}${c.country ? ' · ' + esc(c.country) : ''}</div>`
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
  } else { const n = kv === '0' ? k : kv + k; if (/^\d*\.?\d{0,2}$/.test(n) && +n <= d.max) kv = n; }
  judgeRender();
}

/* ---------- เริ่มต้น ---------- */
function render() {
  if (!ST.role) return loginV();
  if (ST.role === 'super') return superV();
  if (ST.role === 'admin') return adminV();
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
  app.addEventListener('click', onClick); app.addEventListener('change', onChange);
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
    if (me.role === 'super') { if (!ST.fromSuper) { ST.role = 'super'; ST.pg = 0; } else ST.role = 'admin'; } else { ST.role = me.role; ST.fromSuper = false; ST.pg = me.pg; }
    start();
  } catch (e) { clearSess(); ST.code = ''; ST.role = null; loginV(); }
}
boot();
