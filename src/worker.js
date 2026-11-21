import { buildDisplay } from '../public/core.js';

const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const eq = (a, b) => { if (!a || !b || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const txt = (s, n = 100) => String(s ?? '').trim().slice(0, n);
// ชื่อทุกอย่าง (เวที/รอบ/ผู้เข้าประกวด/ประเทศ/กรรมการ) บังคับเป็นตัวพิมพ์ใหญ่ ไม่ว่าจะพิมพ์เล็กมา (ไทยไม่กระทบ) รหัสเข้าระบบไม่แตะ
const nm = (s, n = 100) => txt(s, n).toUpperCase();
const UP = s => String(s ?? '').toUpperCase();
const r2 = n => Math.round(n * 100) / 100;
const DEF = { max: '10', jw: '100', vm: 'share', agg: 'avg', vmode: 'all', rank: '0', mode: 'current', hide: '0', pre: 'dash', introSec: '4', holdSec: '0', sumPer: '10', sumSec: '8', showPV: '1', showJN: '1', sumScale: '100', barScale: '100', cardScale: '100', lang: 'th', showLogo: '0', showRound: '1', auto: '0', c1: '#e3b95a', c2: '#1c1006', c3: '#f4e9d3', round: '0', cur: '0' };
const HEX = /^#[0-9a-fA-F]{6}$/;

// ---------- CO-ADMIN: รหัสผู้ช่วยแอดมินของแต่ละเวที ติ๊กสิทธิ์ได้ (edit=แก้ไขข้อมูล/ตั้งค่า, scores=แก้คะแนน, advance=จัดการผู้เข้ารอบ, screen=สั่งขึ้นจอ) ----------
let coReady = null;
const ensureCo = env => (coReady = coReady || env.DB.prepare('CREATE TABLE IF NOT EXISTS coadmins (id INTEGER PRIMARY KEY AUTOINCREMENT, pg INTEGER NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, perms TEXT NOT NULL DEFAULT \'{}\')').run().catch(e => { coReady = null; throw e; }));
const PKEYS = ['edit', 'scores', 'advance', 'screen'];
const parsePerms = s => { let o = {}; try { o = JSON.parse(s || '{}') || {}; } catch (e) {} const r = {}; PKEYS.forEach(k => (r[k] = !!o[k])); return r; };
const cleanPerms = o => { const r = {}; PKEYS.forEach(k => (r[k] = !!(o && o[k]))); return JSON.stringify(r); };
// สิทธิ์ที่แต่ละคำสั่งต้องใช้ (admin = เฉพาะแอดมินเวที/ผู้ดูแลหลัก CO-ADMIN ทำไม่ได้) คำสั่งที่ไม่อยู่ในรายการ CO-ADMIN จะทำไม่ได้
const PERM = {
  addc: 'edit', addcs: 'edit', editc: 'edit', delc: 'edit', delmany: 'edit', addj: 'edit', editj: 'edit', jcode: 'edit', delj: 'edit', rdadd: 'edit', rdren: 'edit', rddel: 'edit', intotal: 'edit', img: 'edit',
  setscores: 'scores', savevotes: 'scores',
  out: 'advance', outmany: 'advance', rd: 'advance',
  cur: 'screen', step: 'screen', reveal: 'screen', revmany: 'screen',
  coadd: 'admin', coedit: 'admin', cocode: 'admin', codel: 'admin',
};
const SCREEN_KEYS = ['hide', 'mode', 'rank'];

async function getS(env, pg) {
  const o = { ...DEF };
  (await env.DB.prepare('SELECT key,value FROM settings WHERE pg=?').bind(pg).all()).results.forEach(r => (o[r.key] = r.value));
  return o;
}
const setS = (env, pg, k, v) => env.DB.prepare('INSERT INTO settings(pg,key,value) VALUES(?,?,?) ON CONFLICT(pg,key) DO UPDATE SET value=excluded.value').bind(pg, k, String(v)).run();
const bump = (env, pg) => env.DB.prepare('UPDATE pageants SET rev=rev+1 WHERE id=?').bind(pg).run();
const logE = (env, pg, who, round, c, what, from, to) => env.DB.prepare('INSERT INTO log(pg,t,who,round,c,what,from_v,to_v) VALUES(?,?,?,?,?,?,?,?)').bind(pg, Date.now(), who, round, c, what, from == null ? null : String(from), to == null ? null : String(to)).run();

// ภาพรวมข้อมูลของเวที (รูปแบบเดียวกับหน้าเว็บ) ใช้เฉพาะฝั่งเซิร์ฟเวอร์ ห้ามส่งออกตรง ๆ ให้หน้าจอสาธารณะ
async function snapshot(env, pgId, opt = {}) {
  const db = env.DB, P = await db.prepare('SELECT id,name,adm,rev FROM pageants WHERE id=?').bind(pgId).first();
  if (!P) return null;
  const s = await getS(env, pgId);
  const rounds = (await db.prepare('SELECT id,name,in_total FROM rounds WHERE pg=? ORDER BY id').bind(pgId).all()).results;
  const cs = (await db.prepare('SELECT id,no,name,country,votes FROM contestants WHERE pg=? ORDER BY no,id').bind(pgId).all()).results;
  const js = (await db.prepare('SELECT id,name,code FROM judges WHERE pg=? ORDER BY id').bind(pgId).all()).results;
  const sc = (await db.prepare('SELECT s.round_id,s.contestant_id,s.judge_id,s.score FROM scores s JOIN rounds r ON r.id=s.round_id WHERE r.pg=?').bind(pgId).all()).results;
  const rs = (await db.prepare('SELECT x.round_id,x.contestant_id,x.revealed,x.is_out,x.votes FROM results x JOIN rounds r ON r.id=x.round_id WHERE r.pg=?').bind(pgId).all()).results;
  const im = {};
  (await db.prepare("SELECT kind,id,updated FROM images WHERE (kind='contestant' AND id IN (SELECT id FROM contestants WHERE pg=?)) OR (kind='judge' AND id IN (SELECT id FROM judges WHERE pg=?)) OR (kind='logo' AND id=?)").bind(pgId, pgId, pgId).all()).results.forEach(r => (im[r.kind + r.id] = r.updated));
  const iu = (k, id) => (im[k + id] ? `/api/img/${k}/${id}?v=${im[k + id]}` : null);
  let round = +s.round; if (!rounds.some(r => r.id === round)) round = rounds[0] ? rounds[0].id : 0;
  const p = {
    id: P.id, name: UP(P.name), rev: P.rev, max: +s.max, jw: +s.jw, vm: s.vm, agg: s.agg, vmode: s.vmode, rank: +s.rank, mode: s.mode, hide: s.hide === '1', pre: s.pre, introSec: +s.introSec, holdSec: +s.holdSec, sumPer: +s.sumPer, sumSec: +s.sumSec, showPV: s.showPV === '1', showJN: s.showJN === '1', sumScale: +s.sumScale, barScale: +s.barScale, cardScale: +s.cardScale, lang: s.lang,
    showLogo: s.showLogo === '1', showRound: s.showRound === '1', auto: s.auto === '1', col: { c1: s.c1, c2: s.c2, c3: s.c3 }, logo: iu('logo', pgId), round, cur: +s.cur,
    rounds: rounds.map(r => ({ id: r.id, name: UP(r.name), inTotal: !!r.in_total })),
    C: cs.map(c => ({ id: c.id, no: c.no, name: UP(c.name), country: UP(c.country), votes: c.votes, img: iu('contestant', c.id) })),
    J: js.map(j => ({ id: j.id, name: UP(j.name), img: iu('judge', j.id), ...(opt.codes ? { code: j.code } : {}) })),
    sc: {}, res: {},
  };
  if (opt.codes) { await ensureCo(env); p.CO = (await db.prepare('SELECT id,name,code,perms FROM coadmins WHERE pg=? ORDER BY id').bind(pgId).all()).results.map(x => ({ id: x.id, name: UP(x.name), code: x.code, perms: parsePerms(x.perms) })); }
  sc.forEach(x => { p.sc[x.round_id + ':' + x.contestant_id + ':' + x.judge_id] = x.score; });
  rs.forEach(x => { p.res[x.round_id + ':' + x.contestant_id] = { rev: !!x.revealed, votes: x.votes, out: !!x.is_out }; });
  return p;
}

// ตรวจสิทธิ์: ผู้ดูแลหลัก (SUPER_PASSWORD) / แอดมินเวที (รหัสของเวที) / กรรมการ (รหัสที่แอดมินเวทีตั้ง) พร้อมกันเดารหัส
async function auth(req, env) {
  const pass = (req.headers.get('x-pass') || '').trim(), pg = parseInt(req.headers.get('x-pg') || '0', 10) || 0;
  if (!pass) return { err: 401 };
  const ip = req.headers.get('cf-connecting-ip') || 'x', now = Date.now();
  const f = await env.DB.prepare('SELECT COUNT(*) n FROM attempts WHERE ip=? AND t>?').bind(ip, now - 600000).first();
  if (f.n >= 40) return { err: 429 };
  let id = null;
  if (env.SUPER_PASSWORD && eq(pass, env.SUPER_PASSWORD)) id = { role: 'super', pg };
  else if (pg) {
    const P = await env.DB.prepare('SELECT id,name,adm FROM pageants WHERE id=?').bind(pg).first();
    if (P) {
      if (eq(pass.toUpperCase(), String(P.adm).toUpperCase())) id = { role: 'admin', pg, name: UP(P.name) };
      else { const j = await env.DB.prepare('SELECT id,name FROM judges WHERE pg=? AND upper(code)=upper(?)').bind(pg, pass).first(); if (j) id = { role: 'judge', pg, jid: j.id, name: UP(j.name), pgName: UP(P.name) };
        else { await ensureCo(env); const co = await env.DB.prepare('SELECT id,name,perms FROM coadmins WHERE pg=? AND upper(code)=upper(?)').bind(pg, pass).first(); if (co) id = { role: 'co', pg, coId: co.id, name: UP(co.name), pgName: UP(P.name), perms: parsePerms(co.perms) }; } }
    }
  }
  if (!id) { await env.DB.prepare('INSERT INTO attempts(ip,t) VALUES(?,?)').bind(ip, now).run(); if (Math.random() < .05) await env.DB.prepare('DELETE FROM attempts WHERE t<?').bind(now - 3600000).run(); return { err: 401 }; }
  return { id };
}

const own = (env, table, id, pg) => env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND pg=?`).bind(id, pg).first();
const ownRound = (env, id, pg) => own(env, 'rounds', id, pg);
const codeTaken = async (env, pg, code, exceptId, exceptCo) => {
  const P = await env.DB.prepare('SELECT adm FROM pageants WHERE id=?').bind(pg).first();
  if (P && String(P.adm).toUpperCase() === code.toUpperCase()) return true;
  const j = await env.DB.prepare('SELECT id FROM judges WHERE pg=? AND upper(code)=upper(?) AND id<>?').bind(pg, code, exceptId || 0).first();
  if (j) return true;
  await ensureCo(env);
  return !!(await env.DB.prepare('SELECT id FROM coadmins WHERE pg=? AND upper(code)=upper(?) AND id<>?').bind(pg, code, exceptCo || 0).first());
};
// ตกรอบในรอบก่อนหน้า (รอบเรียงตาม id) = ไม่อยู่ในรอบนี้
const NOT_ELIM = 'NOT EXISTS (SELECT 1 FROM results e JOIN rounds er ON er.id=e.round_id WHERE e.contestant_id=c.id AND e.is_out=1 AND er.pg=c.pg AND er.id<?)';
const elimBefore = async (env, pg, rid, cid) => !!(await env.DB.prepare('SELECT 1 x FROM results e JOIN rounds er ON er.id=e.round_id WHERE e.contestant_id=? AND e.is_out=1 AND er.pg=? AND er.id<? LIMIT 1').bind(cid, pg, rid).first());
const ownIds = async (env, pg, raw) => {
  const ids = [...new Set((Array.isArray(raw) ? raw : []).map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 500), ok = [];
  for (let i = 0; i < ids.length; i += 50) {
    const ch = ids.slice(i, i + 50);
    (await env.DB.prepare(`SELECT id FROM contestants WHERE pg=? AND id IN (${ch.map(() => '?').join(',')})`).bind(pg, ...ch).all()).results.forEach(r => ok.push(r.id));
  }
  return ok;
};
const firstContestant = async (env, pg, roundId) => {
  const r = await env.DB.prepare('SELECT c.id FROM contestants c WHERE c.pg=? AND ' + NOT_ELIM + ' ORDER BY c.no,c.id LIMIT 1').bind(pg, roundId).first();
  return r ? r.id : 0;
};
const curRound = async (env, pg, s) => {
  const r = s ? await ownRound(env, +s.round, pg) : null;
  return r || (await env.DB.prepare('SELECT * FROM rounds WHERE pg=? ORDER BY id LIMIT 1').bind(pg).first());
};
const activeIds = async (env, pg, rid) => (await env.DB.prepare('SELECT c.id FROM contestants c WHERE c.pg=? AND ' + NOT_ELIM + ' ORDER BY c.no,c.id').bind(pg, rid).all()).results.map(x => x.id);
// ซ่อนจออัตโนมัติ: เมื่อคะแนนของ "คนสุดท้ายของรอบ" เปิดอยู่บนจอและตั้งเวลาค้างไว้ (holdSec > 0) พอคะแนนเฟดหายแล้วให้ตั้ง hide=1 เอง
// ahAt = เวลาที่คะแนนคนสุดท้ายเริ่มโชว์ (0 = ไม่มีอะไรรอซ่อน) เซิร์ฟเวอร์เป็นคนเช็กตอนมีคนโพลล์ /api/rev จึงไม่ต้องเปิดหน้าแอดมินค้างไว้
const ahSet = (env, pg, v) => setS(env, pg, 'ahAt', v);
async function lastShown(env, pg, s) {
  if (!(+s.holdSec > 0) || s.mode !== 'current' || s.hide === '1' || !+s.cur) return false;
  const rd = await curRound(env, pg, s); if (!rd) return false;
  const l = await activeIds(env, pg, rd.id); if (!l.length || l[l.length - 1] !== +s.cur) return false;
  const rs = await env.DB.prepare('SELECT revealed FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, +s.cur).first();
  return !!(rs && rs.revealed);
}
async function armAH(env, pg) { await ahSet(env, pg, (await lastShown(env, pg, await getS(env, pg))) ? Date.now() : 0); }
async function autoHide(env, pg, at) {
  const s = await getS(env, pg);
  if (!(await lastShown(env, pg, s))) { await ahSet(env, pg, 0); return false; }
  if (Date.now() < at + +s.holdSec * 1000 + 1500) return false;
  await ahSet(env, pg, 0); await setS(env, pg, 'hide', '1'); await bump(env, pg);
  return true;
}
const setReveal = (env, rid, cid, on) => env.DB.prepare('INSERT INTO results(round_id,contestant_id,revealed) VALUES(?,?,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET revealed=excluded.revealed').bind(rid, cid, on ? 1 : 0).run();

async function judgeSubmit(env, me, b) {
  const pg = me.pg, s = await getS(env, pg), rd = await curRound(env, pg, s);
  const c = +s.cur ? await own(env, 'contestants', +s.cur, pg) : null;
  if (!rd || !c) return J({ error: 'ยังไม่มีผู้เข้าประกวดที่เปิดให้ให้คะแนน' }, 409);
  const rs = await env.DB.prepare('SELECT revealed,is_out FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first();
  if (await elimBefore(env, pg, rd.id, c.id)) return J({ error: 'ผู้เข้าประกวดคนนี้ไม่ได้อยู่ในรอบนี้' }, 409);
  if (rs && rs.revealed) return J({ error: 'เปิดคะแนนแล้ว แก้ไขไม่ได้' }, 409);
  const max = +s.max, v = r2(Number(b.score));
  if (b.score === '' || b.score == null || !Number.isFinite(v) || v < 0 || v > max) return J({ error: `คะแนนต้องอยู่ระหว่าง 0 ถึง ${max}` }, 400);
  const r = await env.DB.prepare('INSERT INTO scores(round_id,contestant_id,judge_id,score) VALUES(?,?,?,?) ON CONFLICT(round_id,contestant_id,judge_id) DO NOTHING').bind(rd.id, c.id, me.jid, v).run();
  if (r.meta.changes !== 1) return J({ error: 'ส่งคะแนนไปแล้ว ล็อกแล้ว แก้ไขเองไม่ได้ ถ้าต้องแก้ให้แจ้งผู้ดูแล' }, 409);
  if (s.auto === '1') {
    const n = (await env.DB.prepare('SELECT COUNT(*) n FROM scores WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first()).n;
    const t = (await env.DB.prepare('SELECT COUNT(*) n FROM judges WHERE pg=?').bind(pg).first()).n;
    if (t > 0 && n >= t) { await setReveal(env, rd.id, c.id, 1); await armAH(env, pg); }
  }
  await bump(env, pg);
  return J({ ok: true, score: v });
}

async function adminAction(env, a, b, pg, role, me) {
  const db = env.DB, who = role === 'super' ? 'ผู้ดูแลหลัก' : role === 'co' ? 'CO-ADMIN ' + UP((me && me.name) || '') : 'แอดมินเวที', id = +b.id || 0;
  const s = await getS(env, pg), rd = await curRound(env, pg, s);
  const bad = m => J({ error: m }, 400);
  if (role === 'co') {
    const need = a === 'settings' ? (SCREEN_KEYS.includes(b.k) ? 'screen' : 'edit') : PERM[a];
    if (!need || need === 'admin' || !(me && me.perms && me.perms[need])) return J({ error: 'CO-ADMIN นี้ไม่ได้รับอนุญาตให้ทำคำสั่งนี้' }, 403);
  }
  switch (a) {
    case 'coadd': {
      await ensureCo(env);
      const name = nm(b.name), code = txt(b.code, 40); if (!name || !code) return bad('กรอกชื่อและรหัสของ CO-ADMIN');
      if ((await db.prepare('SELECT COUNT(*) n FROM coadmins WHERE pg=?').bind(pg).first()).n >= 30) return bad('เพิ่ม CO-ADMIN ได้ไม่เกิน 30 คนต่อเวที');
      if (await codeTaken(env, pg, code)) return bad('รหัสนี้ถูกใช้แล้วในเวทีนี้');
      await db.prepare('INSERT INTO coadmins(pg,name,code,perms) VALUES(?,?,?,?)').bind(pg, name, code, cleanPerms(b.perms)).run(); break;
    }
    case 'coedit': {
      await ensureCo(env);
      const c = await db.prepare('SELECT id FROM coadmins WHERE id=? AND pg=?').bind(id, pg).first(); if (!c) return bad('ไม่พบ CO-ADMIN');
      if (b.name != null) { const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อ'); await db.prepare('UPDATE coadmins SET name=? WHERE id=?').bind(name, id).run(); }
      if (b.perms) await db.prepare('UPDATE coadmins SET perms=? WHERE id=?').bind(cleanPerms(b.perms), id).run(); break;
    }
    case 'cocode': {
      await ensureCo(env);
      const c = await db.prepare('SELECT id FROM coadmins WHERE id=? AND pg=?').bind(id, pg).first(); if (!c) return bad('ไม่พบ CO-ADMIN');
      const code = txt(b.code, 40); if (!code || (await codeTaken(env, pg, code, 0, id))) return bad('รหัสว่างหรือซ้ำ');
      await db.prepare('UPDATE coadmins SET code=? WHERE id=?').bind(code, id).run(); break;
    }
    case 'codel': {
      await ensureCo(env);
      await db.prepare('DELETE FROM coadmins WHERE id=? AND pg=?').bind(id, pg).run(); break;
    }
    case 'addc': {
      const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อ');
      const no = parseInt(b.no, 10) || (await db.prepare('SELECT COALESCE(MAX(no),0)+1 n FROM contestants WHERE pg=?').bind(pg).first()).n;
      await db.prepare('INSERT INTO contestants(pg,no,name,country) VALUES(?,?,?,?)').bind(pg, no, name, nm(b.country) || null).run(); break;
    }
    case 'addcs': {
      // เพิ่มผู้เข้าประกวดหลายคนพร้อมรูป (ไม่บังคับ) ในครั้งเดียว ใช้ D1 batch เพื่อไม่ให้ชนลิมิตจำนวน query ต่อคำขอ
      const rows = Array.isArray(b.rows) ? b.rows : [];
      if (!rows.length) return bad('ไม่มีรายชื่อที่จะเพิ่ม');
      if (rows.length > 30) return bad('เพิ่มได้ครั้งละไม่เกิน 30 คน');
      const list = [];
      for (const r of rows) {
        const name = nm(r && r.name); if (!name) return bad('มีแถวที่ยังไม่ได้กรอกชื่อ');
        const img = r.img || null;
        if (img && (typeof img !== 'string' || img.length > 450000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(img))) return bad('รูปของ "' + name + '" ไม่ถูกต้องหรือใหญ่เกินไป');
        list.push({ no: Math.min(parseInt(r.no, 10) || 0, 99999), name, country: nm(r.country) || null, img });
      }
      // เลขที่ที่เว้นว่าง = เลขของแถวก่อนหน้า + 1 (แถวแรกต่อจากเลขสูงสุดที่มีอยู่)
      let cur = (await db.prepare('SELECT COALESCE(MAX(no),0) n FROM contestants WHERE pg=?').bind(pg).first()).n;
      for (const r of list) { if (r.no <= 0) r.no = cur + 1; cur = r.no; }
      const ins = await db.batch(list.map(r => db.prepare('INSERT INTO contestants(pg,no,name,country) VALUES(?,?,?,?)').bind(pg, r.no, r.name, r.country)));
      const now = Date.now(), imgs = [];
      ins.forEach((res, i) => { const cid = Number(res.meta && res.meta.last_row_id); if (cid && list[i].img) imgs.push(db.prepare('INSERT INTO images(kind,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind('contestant', cid, list[i].img, now)); });
      let warn = '';
      if (imgs.length) { try { await db.batch(imgs); } catch (e) { warn = 'เพิ่มรายชื่อแล้ว แต่บันทึกรูปไม่สำเร็จ ลองใส่รูปทีหลังที่ปุ่ม "รูป" ของแต่ละคน'; } }
      await bump(env, pg);
      return J(warn ? { ok: true, warn } : { ok: true });
    }
    case 'editc': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อ');
      await db.prepare('UPDATE contestants SET no=?,name=?,country=? WHERE id=?').bind(parseInt(b.no, 10) || 0, name, nm(b.country) || null, id).run(); break;
    }
    case 'delc': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      await db.prepare('DELETE FROM scores WHERE contestant_id=?').bind(id).run();
      await db.prepare('DELETE FROM results WHERE contestant_id=?').bind(id).run();
      await db.prepare("DELETE FROM images WHERE kind='contestant' AND id=?").bind(id).run();
      await db.prepare('DELETE FROM contestants WHERE id=?').bind(id).run();
      if (+s.cur === id) await setS(env, pg, 'cur', 0); break;
    }
    case 'addj': {
      const name = nm(b.name), code = txt(b.code, 40); if (!name || !code) return bad('กรอกชื่อและรหัสเข้าระบบของกรรมการ');
      if (await codeTaken(env, pg, code)) return bad('รหัสนี้ถูกใช้แล้วในเวทีนี้');
      await db.prepare('INSERT INTO judges(pg,name,code) VALUES(?,?,?)').bind(pg, name, code).run(); break;
    }
    case 'editj': {
      if (!(await own(env, 'judges', id, pg))) return bad('ไม่พบกรรมการ');
      const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อ');
      await db.prepare('UPDATE judges SET name=? WHERE id=?').bind(name, id).run(); break;
    }
    case 'jcode': {
      if (!(await own(env, 'judges', id, pg))) return bad('ไม่พบกรรมการ');
      const code = txt(b.code, 40); if (!code || (await codeTaken(env, pg, code, id))) return bad('รหัสว่างหรือซ้ำ');
      await db.prepare('UPDATE judges SET code=? WHERE id=?').bind(code, id).run(); break;
    }
    case 'delj': {
      if (!(await own(env, 'judges', id, pg))) return bad('ไม่พบกรรมการ');
      await db.prepare('DELETE FROM scores WHERE judge_id=?').bind(id).run();
      await db.prepare("DELETE FROM images WHERE kind='judge' AND id=?").bind(id).run();
      await db.prepare('DELETE FROM judges WHERE id=?').bind(id).run(); break;
    }
    case 'rdadd': {
      const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อรอบ');
      await db.prepare('INSERT INTO rounds(pg,name) VALUES(?,?)').bind(pg, name).run(); break;
    }
    case 'rdren': {
      if (!(await ownRound(env, id, pg))) return bad('ไม่พบรอบ');
      const name = nm(b.name); if (!name) return bad('กรุณากรอกชื่อรอบ');
      await db.prepare('UPDATE rounds SET name=? WHERE id=?').bind(name, id).run(); break;
    }
    case 'rddel': {
      if (!(await ownRound(env, id, pg))) return bad('ไม่พบรอบ');
      if ((await db.prepare('SELECT COUNT(*) n FROM rounds WHERE pg=?').bind(pg).first()).n < 2) return bad('ต้องมีอย่างน้อย 1 รอบ');
      await db.prepare('DELETE FROM scores WHERE round_id=?').bind(id).run();
      await db.prepare('DELETE FROM results WHERE round_id=?').bind(id).run();
      await db.prepare('DELETE FROM rounds WHERE id=?').bind(id).run();
      if (+s.rank === id) await setS(env, pg, 'rank', 0);
      if (rd && rd.id === id) { const f = await db.prepare('SELECT id FROM rounds WHERE pg=? ORDER BY id LIMIT 1').bind(pg).first(); await setS(env, pg, 'round', f.id); await setS(env, pg, 'cur', await firstContestant(env, pg, f.id)); }
      break;
    }
    case 'rd': { // เริ่มรอบใหม่ แล้วกลับไปคนที่ 1 ของรอบนั้น
      if (!(await ownRound(env, id, pg))) return bad('ไม่พบรอบ');
      await setS(env, pg, 'round', id); await setS(env, pg, 'cur', await firstContestant(env, pg, id));
      await setS(env, pg, 'hide', '1'); break; // ซ่อนจอทั้งหมดไว้ก่อน จนกว่าจะกด "แสดงจอ" คนแรกถึงจะขึ้น
    }
    case 'intotal': {
      if (!(await ownRound(env, id, pg))) return bad('ไม่พบรอบ');
      await db.prepare('UPDATE rounds SET in_total=? WHERE id=?').bind(b.on ? 1 : 0, id).run(); break;
    }
    case 'cur': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      await setS(env, pg, 'cur', id); break;
    }
    case 'step': {
      const l = (await db.prepare('SELECT c.id FROM contestants c WHERE c.pg=? AND ' + NOT_ELIM + ' ORDER BY c.no,c.id').bind(pg, rd.id).all()).results.map(x => x.id);
      if (!l.length) break;
      const i = l.indexOf(+s.cur);
      await setS(env, pg, 'cur', b.dir === 'prev' ? l[Math.max(0, i < 0 ? 0 : i - 1)] : l[Math.min(l.length - 1, i + 1)]); break;
    }
    case 'reveal': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      await setReveal(env, rd.id, id, b.on); break;
    }
    case 'out': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      const tr = +b.round ? await ownRound(env, +b.round, pg) : rd; if (!tr) return bad('ไม่พบรอบ');
      const x = await db.prepare('SELECT is_out FROM results WHERE round_id=? AND contestant_id=?').bind(tr.id, id).first();
      await db.prepare('INSERT INTO results(round_id,contestant_id,revealed,is_out) VALUES(?,?,0,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET is_out=excluded.is_out').bind(tr.id, id, x && x.is_out ? 0 : 1).run(); break;
    }
    case 'outmany': {
      const ids = await ownIds(env, pg, b.ids); if (!rd || !ids.length) break;
      await db.batch(ids.map(cid => db.prepare('INSERT INTO results(round_id,contestant_id,revealed,is_out) VALUES(?,?,0,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET is_out=excluded.is_out').bind(rd.id, cid, b.on ? 1 : 0))); break;
    }
    case 'revmany': {
      const ids = await ownIds(env, pg, b.ids); if (!rd || !ids.length) break;
      await db.batch(ids.map(cid => db.prepare('INSERT INTO results(round_id,contestant_id,revealed) VALUES(?,?,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET revealed=excluded.revealed').bind(rd.id, cid, b.on ? 1 : 0))); break;
    }
    case 'delmany': {
      const ids = await ownIds(env, pg, b.ids); if (!ids.length) break;
      for (let i = 0; i < ids.length; i += 40) {
        const ch = ids.slice(i, i + 40), q = ch.map(() => '?').join(',');
        await db.batch([
          db.prepare(`DELETE FROM scores WHERE contestant_id IN (${q})`).bind(...ch),
          db.prepare(`DELETE FROM results WHERE contestant_id IN (${q})`).bind(...ch),
          db.prepare(`DELETE FROM images WHERE kind='contestant' AND id IN (${q})`).bind(...ch),
          db.prepare(`DELETE FROM contestants WHERE id IN (${q})`).bind(...ch)
        ]);
      }
      if (ids.includes(+s.cur)) await setS(env, pg, 'cur', 0); break;
    }
    case 'setscores': {
      const c = await own(env, 'contestants', id, pg); if (!c) return bad('ไม่พบผู้เข้าประกวด');
      const max = +s.max, sc = b.scores || {}, js = (await db.prepare('SELECT id,name FROM judges WHERE pg=?').bind(pg).all()).results;
      const okv = v => v === '' || v == null || (v !== true && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= max);
      if (!js.every(j => okv(sc[j.id]))) return bad(`คะแนนต้องอยู่ระหว่าง 0 ถึง ${max}`);
      const old = {}; (await db.prepare('SELECT judge_id,score FROM scores WHERE round_id=? AND contestant_id=?').bind(rd.id, id).all()).results.forEach(x => (old[x.judge_id] = x.score));
      for (const j of js) {
        if (!(j.id in sc)) continue;
        const nw = sc[j.id] === '' || sc[j.id] == null ? null : r2(Number(sc[j.id])), o = old[j.id] ?? null;
        if (o === nw) continue;
        await logE(env, pg, who, rd.name, c.name, 'คะแนนของ ' + j.name, o, nw);
        if (nw === null) await db.prepare('DELETE FROM scores WHERE round_id=? AND contestant_id=? AND judge_id=?').bind(rd.id, id, j.id).run();
        else await db.prepare('INSERT INTO scores(round_id,contestant_id,judge_id,score) VALUES(?,?,?,?) ON CONFLICT(round_id,contestant_id,judge_id) DO UPDATE SET score=excluded.score').bind(rd.id, id, j.id, nw).run();
      }
      break;
    }
    case 'savevotes': {
      const mr = s.vmode === 'round', V = b.votes || {};
      const num = v => (v === '' || v == null ? null : (v !== true && Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : undefined));
      const cs = (await db.prepare('SELECT id,name FROM contestants WHERE pg=?').bind(pg).all()).results;
      const rds = (await db.prepare('SELECT id,name FROM rounds WHERE pg=?').bind(pg).all()).results;
      const ops = [];
      if (mr) { for (const r of rds) for (const c of cs) { const raw = (V[r.id] || {})[c.id]; if (raw === undefined) continue; const v = num(raw); if (v === undefined) return bad('จำนวนโหวตต้องเป็นตัวเลขไม่ติดลบ'); ops.push({ r, c, v }); } }
      else { for (const c of cs) { const raw = V[c.id]; if (raw === undefined) continue; const v = num(raw); if (v === undefined) return bad('จำนวนโหวตต้องเป็นตัวเลขไม่ติดลบ'); ops.push({ c, v }); } }
      for (const o of ops) {
        if (mr) {
          const old = (await db.prepare('SELECT votes FROM results WHERE round_id=? AND contestant_id=?').bind(o.r.id, o.c.id).first());
          const ov = old ? old.votes : null; if (ov === o.v) continue;
          await logE(env, pg, who, o.r.name, o.c.name, 'โหวต', ov, o.v);
          await db.prepare('INSERT INTO results(round_id,contestant_id,revealed,votes) VALUES(?,?,0,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET votes=excluded.votes').bind(o.r.id, o.c.id, o.v).run();
        } else {
          const ov = (await db.prepare('SELECT votes FROM contestants WHERE id=?').bind(o.c.id).first()).votes; if (ov === o.v) continue;
          await logE(env, pg, who, '(ทั้งงาน)', o.c.name, 'โหวตรวม', ov, o.v);
          await db.prepare('UPDATE contestants SET votes=? WHERE id=?').bind(o.v, o.c.id).run();
        }
      }
      break;
    }
    case 'settings': {
      const k = b.k, v = String(b.v ?? '');
      const bool = x => (x === '1' || x === 'true' ? '1' : '0');
      if (k === 'mode' && ['current', 'ranking'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'agg' && ['avg', 'sum'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'vm' && ['share', 'top'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'vmode' && ['all', 'round'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'pre' && ['name', 'dash', 'none', 'card'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'sumPer' && v !== '' && Number(v) >= 1 && Number(v) <= 20) await setS(env, pg, k, Math.round(Number(v)));
      else if (['introSec', 'holdSec', 'sumSec'].includes(k) && v !== '' && Number(v) >= 0 && Number(v) <= 600) await setS(env, pg, k, Math.round(Number(v) * 10) / 10);
      else if (['barScale', 'cardScale', 'sumScale'].includes(k) && v !== '' && Number(v) >= 30 && Number(v) <= 150) await setS(env, pg, k, Math.round(Number(v)));
      else if (k === 'lang' && ['th', 'en'].includes(v)) await setS(env, pg, k, v);
      else if (['auto', 'hide', 'showLogo', 'showRound', 'showPV', 'showJN'].includes(k)) await setS(env, pg, k, bool(v));
      else if (k === 'max' && Number(v) >= 1 && Number(v) <= 1000) await setS(env, pg, k, Number(v));
      else if (k === 'jw' && v !== '' && Number(v) >= 0 && Number(v) <= 100) await setS(env, pg, k, Math.round(Number(v)));
      else if (k === 'rank' && (Number(v) === 0 || (await ownRound(env, Number(v), pg)))) await setS(env, pg, k, Number(v));
      else if (k === 'colors') { const c = v.split(','); if (c.length !== 3 || !c.every(x => HEX.test(x))) return bad('สีไม่ถูกต้อง'); await setS(env, pg, 'c1', c[0]); await setS(env, pg, 'c2', c[1]); await setS(env, pg, 'c3', c[2]); }
      else return bad('ค่าไม่ถูกต้อง');
      break;
    }
    case 'img': {
      const kind = b.kind, tid = kind === 'logo' ? pg : id;
      if (!['contestant', 'judge', 'logo'].includes(kind)) return bad('ไม่ถูกต้อง');
      if (kind === 'contestant' && !(await own(env, 'contestants', tid, pg))) return bad('ไม่พบผู้เข้าประกวด');
      if (kind === 'judge' && !(await own(env, 'judges', tid, pg))) return bad('ไม่พบกรรมการ');
      if (!b.data) await db.prepare('DELETE FROM images WHERE kind=? AND id=?').bind(kind, tid).run();
      else {
        if (typeof b.data !== 'string' || b.data.length > 450000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(b.data)) return bad('รูปไม่ถูกต้องหรือใหญ่เกินไป');
        await db.prepare('INSERT INTO images(kind,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(kind, tid, b.data, Date.now()).run();
      }
      break;
    }
    default: return J({ error: 'not found' }, 404);
  }
  if (['reveal', 'revmany', 'step', 'cur', 'rd', 'rddel', 'settings', 'out', 'outmany', 'delc', 'delmany'].includes(a)) await armAH(env, pg);
  await bump(env, pg);
  return J({ ok: true });
}


// ลบเวทีและข้อมูลทั้งหมดของเวที (ใช้ทั้งตอนลบเวทีและตอนคัดลอกล้มเหลว)
async function deletePageant(env, id) {
  const db = env.DB; await ensureCo(env);
  await db.prepare('DELETE FROM scores WHERE round_id IN (SELECT id FROM rounds WHERE pg=?)').bind(id).run();
  await db.prepare('DELETE FROM results WHERE round_id IN (SELECT id FROM rounds WHERE pg=?)').bind(id).run();
  await db.prepare("DELETE FROM images WHERE (kind='contestant' AND id IN (SELECT id FROM contestants WHERE pg=?)) OR (kind='judge' AND id IN (SELECT id FROM judges WHERE pg=?)) OR (kind='logo' AND id=?)").bind(id, id, id).run();
  for (const t of ['rounds', 'contestants', 'judges', 'log', 'coadmins']) await db.prepare(`DELETE FROM ${t} WHERE pg=?`).bind(id).run();
  await db.prepare('DELETE FROM settings WHERE pg=?').bind(id).run();
  await db.prepare('DELETE FROM pageants WHERE id=?').bind(id).run();
}

// คัดลอกข้อมูลจากเวทีเดิมไปเวทีใหม่ตามที่ติ๊ก: settings=การตั้งค่าไลฟ์/คะแนน colors=สี logo=โลโก้ contestants=ผู้เข้าประกวด(+รูป) judges=กรรมการ(+รหัส+รูป) rounds=ทำที่ผู้เรียกแล้ว
// ไม่คัดลอก: คะแนน ผลการเปิดคะแนน/ตกรอบ ประวัติ CO-ADMIN และสถานะหน้าจอขณะนั้น (รอบที่ใช้ คนปัจจุบัน ซ่อนจอ โหมด)
async function copyParts(env, from, to, parts) {
  const db = env.DB, now = Date.now(), RUNTIME = new Set(['round', 'cur', 'hide', 'mode', 'rank', 'ahAt']), COL = new Set(['c1', 'c2', 'c3']);
  const st = (await db.prepare('SELECT key,value FROM settings WHERE pg=?').bind(from).all()).results.filter(x => !RUNTIME.has(x.key) && (COL.has(x.key) ? parts.colors : x.key === 'showLogo' ? parts.logo : parts.settings));
  for (let i = 0; i < st.length; i += 40) await db.batch(st.slice(i, i + 40).map(x => db.prepare('INSERT INTO settings(pg,key,value) VALUES(?,?,?) ON CONFLICT(pg,key) DO UPDATE SET value=excluded.value').bind(to, x.key, x.value)));
  if (parts.logo) await db.prepare("INSERT INTO images(kind,id,data,updated) SELECT 'logo', ?, data, ? FROM images WHERE kind='logo' AND id=?").bind(to, now, from).run();
  const jobs = [];
  if (parts.contestants) jobs.push({ kind: 'contestant', rows: (await db.prepare('SELECT id,no,name,country FROM contestants WHERE pg=? ORDER BY no,id').bind(from).all()).results, ins: x => db.prepare('INSERT INTO contestants(pg,no,name,country) VALUES(?,?,?,?)').bind(to, x.no, x.name, x.country) });
  if (parts.judges) jobs.push({ kind: 'judge', rows: (await db.prepare('SELECT id,name,code FROM judges WHERE pg=? ORDER BY id').bind(from).all()).results, ins: x => db.prepare('INSERT INTO judges(pg,name,code) VALUES(?,?,?)').bind(to, x.name, x.code) });
  for (const j of jobs) {
    for (let i = 0; i < j.rows.length; i += 40) {
      const ch = j.rows.slice(i, i + 40), res = await db.batch(ch.map(j.ins)), imgs = [];
      res.forEach((r, k) => { const nid = Number(r.meta && r.meta.last_row_id); if (nid) imgs.push(db.prepare("INSERT INTO images(kind,id,data,updated) SELECT ?, ?, data, ? FROM images WHERE kind=? AND id=?").bind(j.kind, nid, now, j.kind, ch[k].id)); });
      if (imgs.length) await db.batch(imgs);
    }
  }
}

async function superAction(env, a, b) {
  const db = env.DB, id = +b.id || 0;
  if (a === 'pgadd') {
    const name = nm(b.name), adm = txt(b.adm, 40); if (!name || !adm) return J({ error: 'กรอกชื่อเวทีและรหัสแอดมิน' }, 400);
    const from = +b.from || 0, parts = (b.parts && typeof b.parts === 'object') ? b.parts : {};
    if (from) {
      if (!(await db.prepare('SELECT id FROM pageants WHERE id=?').bind(from).first())) return J({ error: 'ไม่พบเวทีที่จะคัดลอก' }, 404);
      if (parts.judges && (await db.prepare('SELECT id FROM judges WHERE pg=? AND upper(code)=upper(?)').bind(from, adm).first())) return J({ error: 'รหัสแอดมินซ้ำกับรหัสกรรมการที่คัดลอกมา กรุณาตั้งรหัสอื่น' }, 400);
    }
    const r = await db.prepare('INSERT INTO pageants(name,adm) VALUES(?,?)').bind(name, adm).run();
    const pid = Number(r.meta.last_row_id);
    try {
      let rounds = 0;
      if (from && parts.rounds) {
        const rs = (await db.prepare('SELECT name,in_total FROM rounds WHERE pg=? ORDER BY id').bind(from).all()).results;
        if (rs.length) { await db.batch(rs.map(x => db.prepare('INSERT INTO rounds(pg,name,in_total) VALUES(?,?,?)').bind(pid, x.name, x.in_total))); rounds = rs.length; }
      }
      if (!rounds) await db.prepare("INSERT INTO rounds(pg,name) VALUES(?,'รอบที่ 1')").bind(pid).run();
      if (from) await copyParts(env, from, pid, parts);
    } catch (e) { await deletePageant(env, pid); return J({ error: 'คัดลอกเวทีไม่สำเร็จ ลองใหม่อีกครั้ง' }, 500); }
    return J({ ok: true, id: pid });
  }
  const P = await db.prepare('SELECT id FROM pageants WHERE id=?').bind(id).first(); if (!P) return J({ error: 'ไม่พบเวที' }, 404);
  if (a === 'pgren') { const n = nm(b.name); if (!n) return J({ error: 'กรุณากรอกชื่อ' }, 400); await db.prepare('UPDATE pageants SET name=? WHERE id=?').bind(n, id).run(); }
  else if (a === 'pgcode') {
    const c = txt(b.adm, 40); if (!c) return J({ error: 'กรุณากรอกรหัส' }, 400);
    if ((await db.prepare('SELECT id FROM judges WHERE pg=? AND upper(code)=upper(?)').bind(id, c).first()) || (await ensureCo(env), await db.prepare('SELECT id FROM coadmins WHERE pg=? AND upper(code)=upper(?)').bind(id, c).first())) return J({ error: 'รหัสนี้ซ้ำกับรหัสกรรมการหรือ CO-ADMIN ของเวทีนี้' }, 400);
    await db.prepare('UPDATE pageants SET adm=? WHERE id=?').bind(c, id).run();
  } else if (a === 'pgdel') {
    await deletePageant(env, id);
    return J({ ok: true });
  } else return J({ error: 'not found' }, 404);
  await bump(env, id);
  return J({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const p = url.pathname.slice(5), m = req.method;
    try {
      // ---------- สาธารณะ (ไม่ต้องล็อกอิน) ----------
      if (p === 'pageants' && m === 'GET') return J((await env.DB.prepare('SELECT id,name FROM pageants ORDER BY id').all()).results.map(x => ({ ...x, name: UP(x.name) })));
      if (p === 'rev' && m === 'GET') {
        const pgId = +url.searchParams.get('pg') || 0;
        const r = await env.DB.prepare("SELECT rev,(SELECT value FROM settings WHERE pg=pageants.id AND key='ahAt') ah FROM pageants WHERE id=?").bind(pgId).first();
        if (!r) return J({ error: 'ไม่พบเวที' }, 404);
        if (+r.ah > 0 && (await autoHide(env, pgId, +r.ah))) return J({ rev: (await env.DB.prepare('SELECT rev FROM pageants WHERE id=?').bind(pgId).first()).rev });
        return J({ rev: r.rev });
      }
      if (p === 'display' && m === 'GET') {
        const sn = await snapshot(env, +url.searchParams.get('pg') || 0); if (!sn) return J({ error: 'ไม่พบเวที' }, 404);
        return J(buildDisplay(sn));
      }
      const im = p.match(/^img\/(contestant|judge|logo)\/(\d+)$/);
      if (im && m === 'GET') {
        const r = await env.DB.prepare('SELECT data FROM images WHERE kind=? AND id=?').bind(im[1], +im[2]).first();
        if (!r) return new Response('', { status: 404 });
        const mt = r.data.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        return new Response(Uint8Array.from(atob(r.data.split(',')[1]), c => c.charCodeAt(0)), { headers: { 'content-type': mt, 'cache-control': 'public, max-age=31536000, immutable' } });
      }
      // ---------- ต้องล็อกอิน ----------
      const a = await auth(req, env); if (a.err) return J({ error: a.err === 429 ? 'ลองรหัสผิดหลายครั้งเกินไป กรุณารอ 10 นาที' : 'รหัสไม่ถูกต้อง' }, a.err);
      const me = a.id;
      if (p === 'me') return J({ role: me.role, pg: me.pg, name: me.name || '', pgName: me.pgName || '', jid: me.jid || 0, perms: me.perms || null });
      if (me.role === 'judge') {
        if (p === 'judge' && m === 'GET') {
          const s = await getS(env, me.pg), rd = await curRound(env, me.pg, s), c = +s.cur ? await own(env, 'contestants', +s.cur, me.pg) : null;
          const rs = c && rd ? await env.DB.prepare('SELECT revealed,is_out FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first() : null;
          const mine = c && rd ? await env.DB.prepare('SELECT score FROM scores WHERE round_id=? AND contestant_id=? AND judge_id=?').bind(rd.id, c.id, me.jid).first() : null;
          const hasImg = c ? await env.DB.prepare("SELECT updated FROM images WHERE kind='contestant' AND id=?").bind(c.id).first() : null;
          const ok = c && rd && !(await elimBefore(env, me.pg, rd.id, c.id));
          // ตอนจอไลฟ์กำลังโชว์ตารางคะแนนรวม ส่งข้อมูลชุดเดียวกันให้จอกรรมการด้วย (เฉพาะคะแนนที่เปิดแล้ว เหมือนจอสาธารณะ)
          let ranking = null;
          if (s.mode === 'ranking') { const sn = await snapshot(env, me.pg); ranking = sn ? buildDisplay(sn).sum : null; }
          return J({ ranking, name: me.name, pgName: me.pgName, max: +s.max, round: rd ? UP(rd.name) : '', rev: (await env.DB.prepare('SELECT rev FROM pageants WHERE id=?').bind(me.pg).first()).rev,
            current: ok ? { id: c.id, no: c.no, name: UP(c.name), country: UP(c.country), img: hasImg ? `/api/img/contestant/${c.id}?v=${hasImg.updated}` : null, revealed: !!(rs && rs.revealed) } : null, mine: mine ? mine.score : null });
        }
        if (p === 'score' && m === 'POST') return judgeSubmit(env, me, await req.json());
        return J({ error: 'ไม่มีสิทธิ์' }, 403);
      }
      if (me.role === 'super' && p === 'super' && m === 'GET') {
        const l = (await env.DB.prepare('SELECT g.id,g.name,g.adm,(SELECT COUNT(*) FROM judges WHERE pg=g.id) judges,(SELECT COUNT(*) FROM contestants WHERE pg=g.id) contestants FROM pageants g ORDER BY g.id').all()).results.map(x => ({ ...x, name: UP(x.name) }));
        return J({ pageants: l });
      }
      if (me.role === 'super' && p.startsWith('super/') && m === 'POST') return superAction(env, p.slice(6), await req.json());
      // แอดมินเวที หรือ ผู้ดูแลหลักที่เข้าไปจัดการเวที (ส่ง x-pg)
      const pg = me.pg; if (!pg) return J({ error: 'ไม่ได้เลือกเวที' }, 400);
      if (me.role === 'super' && !(await env.DB.prepare('SELECT id FROM pageants WHERE id=?').bind(pg).first())) return J({ error: 'ไม่พบเวที' }, 404);
      if (p === 'admin' && m === 'GET') {
        const sn = await snapshot(env, pg, { codes: me.role !== 'co' }); if (!sn) return J({ error: 'ไม่พบเวที' }, 404);
        sn.log = (await env.DB.prepare('SELECT t,who,round,c,what,from_v,to_v FROM log WHERE pg=? ORDER BY id DESC LIMIT 300').bind(pg).all()).results.map(x => ({ t: x.t, who: x.who, round: x.round, c: x.c, what: x.what, from: x.from_v == null ? null : isNaN(+x.from_v) ? x.from_v : +x.from_v, to: x.to_v == null ? null : isNaN(+x.to_v) ? x.to_v : +x.to_v }));
        return J(sn);
      }
      if (p.startsWith('admin/') && m === 'POST') return adminAction(env, p.slice(6), await req.json(), pg, me.role, me);
      return J({ error: 'not found' }, 404);
    } catch (e) { return J({ error: 'เซิร์ฟเวอร์ผิดพลาด' }, 500); }
  },
};
