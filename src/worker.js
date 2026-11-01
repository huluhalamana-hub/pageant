import { buildDisplay } from '../public/core.js';

const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const eq = (a, b) => { if (!a || !b || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const txt = (s, n = 100) => String(s ?? '').trim().slice(0, n);
const r2 = n => Math.round(n * 100) / 100;
const DEF = { max: '10', jw: '100', vm: 'share', agg: 'avg', vmode: 'all', rank: '0', mode: 'current', hide: '0', pre: 'dash', lang: 'th', showLogo: '0', showRound: '1', auto: '0', c1: '#e3b95a', c2: '#1c1006', c3: '#f4e9d3', round: '0', cur: '0' };
const HEX = /^#[0-9a-fA-F]{6}$/;

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
    id: P.id, name: P.name, rev: P.rev, max: +s.max, jw: +s.jw, vm: s.vm, agg: s.agg, vmode: s.vmode, rank: +s.rank, mode: s.mode, hide: s.hide === '1', pre: s.pre, lang: s.lang,
    showLogo: s.showLogo === '1', showRound: s.showRound === '1', auto: s.auto === '1', col: { c1: s.c1, c2: s.c2, c3: s.c3 }, logo: iu('logo', pgId), round, cur: +s.cur,
    rounds: rounds.map(r => ({ id: r.id, name: r.name, inTotal: !!r.in_total })),
    C: cs.map(c => ({ id: c.id, no: c.no, name: c.name, country: c.country || '', votes: c.votes, img: iu('contestant', c.id) })),
    J: js.map(j => ({ id: j.id, name: j.name, img: iu('judge', j.id), ...(opt.codes ? { code: j.code } : {}) })),
    sc: {}, res: {},
  };
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
      if (eq(pass.toUpperCase(), String(P.adm).toUpperCase())) id = { role: 'admin', pg, name: P.name };
      else { const j = await env.DB.prepare('SELECT id,name FROM judges WHERE pg=? AND upper(code)=upper(?)').bind(pg, pass).first(); if (j) id = { role: 'judge', pg, jid: j.id, name: j.name, pgName: P.name }; }
    }
  }
  if (!id) { await env.DB.prepare('INSERT INTO attempts(ip,t) VALUES(?,?)').bind(ip, now).run(); if (Math.random() < .05) await env.DB.prepare('DELETE FROM attempts WHERE t<?').bind(now - 3600000).run(); return { err: 401 }; }
  return { id };
}

const own = (env, table, id, pg) => env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND pg=?`).bind(id, pg).first();
const ownRound = (env, id, pg) => own(env, 'rounds', id, pg);
const codeTaken = async (env, pg, code, exceptId) => {
  const P = await env.DB.prepare('SELECT adm FROM pageants WHERE id=?').bind(pg).first();
  if (P && String(P.adm).toUpperCase() === code.toUpperCase()) return true;
  const j = await env.DB.prepare('SELECT id FROM judges WHERE pg=? AND upper(code)=upper(?) AND id<>?').bind(pg, code, exceptId || 0).first();
  return !!j;
};
const firstContestant = async (env, pg, roundId) => {
  const r = await env.DB.prepare('SELECT c.id FROM contestants c LEFT JOIN results x ON x.contestant_id=c.id AND x.round_id=? WHERE c.pg=? AND COALESCE(x.is_out,0)=0 ORDER BY c.no,c.id LIMIT 1').bind(roundId, pg).first();
  return r ? r.id : 0;
};
const curRound = async (env, pg, s) => {
  const r = s ? await ownRound(env, +s.round, pg) : null;
  return r || (await env.DB.prepare('SELECT * FROM rounds WHERE pg=? ORDER BY id LIMIT 1').bind(pg).first());
};
const setReveal = (env, rid, cid, on) => env.DB.prepare('INSERT INTO results(round_id,contestant_id,revealed) VALUES(?,?,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET revealed=excluded.revealed').bind(rid, cid, on ? 1 : 0).run();

async function judgeSubmit(env, me, b) {
  const pg = me.pg, s = await getS(env, pg), rd = await curRound(env, pg, s);
  const c = +s.cur ? await own(env, 'contestants', +s.cur, pg) : null;
  if (!rd || !c) return J({ error: 'ยังไม่มีผู้เข้าประกวดที่เปิดให้ให้คะแนน' }, 409);
  const rs = await env.DB.prepare('SELECT revealed,is_out FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first();
  if (rs && rs.is_out) return J({ error: 'ผู้เข้าประกวดคนนี้ไม่ได้อยู่ในรอบนี้' }, 409);
  if (rs && rs.revealed) return J({ error: 'เปิดคะแนนแล้ว แก้ไขไม่ได้' }, 409);
  const max = +s.max, v = r2(Number(b.score));
  if (b.score === '' || b.score == null || !Number.isFinite(v) || v < 0 || v > max) return J({ error: `คะแนนต้องอยู่ระหว่าง 0 ถึง ${max}` }, 400);
  const r = await env.DB.prepare('INSERT INTO scores(round_id,contestant_id,judge_id,score) VALUES(?,?,?,?) ON CONFLICT(round_id,contestant_id,judge_id) DO NOTHING').bind(rd.id, c.id, me.jid, v).run();
  if (r.meta.changes !== 1) return J({ error: 'ส่งคะแนนไปแล้ว ล็อกแล้ว แก้ไขเองไม่ได้ ถ้าต้องแก้ให้แจ้งผู้ดูแล' }, 409);
  if (s.auto === '1') {
    const n = (await env.DB.prepare('SELECT COUNT(*) n FROM scores WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first()).n;
    const t = (await env.DB.prepare('SELECT COUNT(*) n FROM judges WHERE pg=?').bind(pg).first()).n;
    if (t > 0 && n >= t) await setReveal(env, rd.id, c.id, 1);
  }
  await bump(env, pg);
  return J({ ok: true, score: v });
}

async function adminAction(env, a, b, pg, role) {
  const db = env.DB, who = role === 'super' ? 'ผู้ดูแลหลัก' : 'แอดมินเวที', id = +b.id || 0;
  const s = await getS(env, pg), rd = await curRound(env, pg, s);
  const bad = m => J({ error: m }, 400);
  switch (a) {
    case 'addc': {
      const name = txt(b.name); if (!name) return bad('กรุณากรอกชื่อ');
      const no = parseInt(b.no, 10) || (await db.prepare('SELECT COALESCE(MAX(no),0)+1 n FROM contestants WHERE pg=?').bind(pg).first()).n;
      await db.prepare('INSERT INTO contestants(pg,no,name,country) VALUES(?,?,?,?)').bind(pg, no, name, txt(b.country) || null).run(); break;
    }
    case 'editc': {
      if (!(await own(env, 'contestants', id, pg))) return bad('ไม่พบผู้เข้าประกวด');
      const name = txt(b.name); if (!name) return bad('กรุณากรอกชื่อ');
      await db.prepare('UPDATE contestants SET no=?,name=?,country=? WHERE id=?').bind(parseInt(b.no, 10) || 0, name, txt(b.country) || null, id).run(); break;
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
      const name = txt(b.name), code = txt(b.code, 40); if (!name || !code) return bad('กรอกชื่อและรหัสเข้าระบบของกรรมการ');
      if (await codeTaken(env, pg, code)) return bad('รหัสนี้ถูกใช้แล้วในเวทีนี้');
      await db.prepare('INSERT INTO judges(pg,name,code) VALUES(?,?,?)').bind(pg, name, code).run(); break;
    }
    case 'editj': {
      if (!(await own(env, 'judges', id, pg))) return bad('ไม่พบกรรมการ');
      const name = txt(b.name); if (!name) return bad('กรุณากรอกชื่อ');
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
      const name = txt(b.name); if (!name) return bad('กรุณากรอกชื่อรอบ');
      await db.prepare('INSERT INTO rounds(pg,name) VALUES(?,?)').bind(pg, name).run(); break;
    }
    case 'rdren': {
      if (!(await ownRound(env, id, pg))) return bad('ไม่พบรอบ');
      const name = txt(b.name); if (!name) return bad('กรุณากรอกชื่อรอบ');
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
      await setS(env, pg, 'round', id); await setS(env, pg, 'cur', await firstContestant(env, pg, id)); break;
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
      const l = (await db.prepare('SELECT c.id FROM contestants c LEFT JOIN results x ON x.contestant_id=c.id AND x.round_id=? WHERE c.pg=? AND COALESCE(x.is_out,0)=0 ORDER BY c.no,c.id').bind(rd.id, pg).all()).results.map(x => x.id);
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
      const x = await db.prepare('SELECT is_out FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, id).first();
      await db.prepare('INSERT INTO results(round_id,contestant_id,revealed,is_out) VALUES(?,?,0,?) ON CONFLICT(round_id,contestant_id) DO UPDATE SET is_out=excluded.is_out, revealed=0').bind(rd.id, id, x && x.is_out ? 0 : 1).run(); break;
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
      else if (k === 'pre' && ['name', 'dash', 'none'].includes(v)) await setS(env, pg, k, v);
      else if (k === 'lang' && ['th', 'en'].includes(v)) await setS(env, pg, k, v);
      else if (['auto', 'hide', 'showLogo', 'showRound'].includes(k)) await setS(env, pg, k, bool(v));
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
  await bump(env, pg);
  return J({ ok: true });
}

async function superAction(env, a, b) {
  const db = env.DB, id = +b.id || 0;
  if (a === 'pgadd') {
    const name = txt(b.name), adm = txt(b.adm, 40); if (!name || !adm) return J({ error: 'กรอกชื่อเวทีและรหัสแอดมิน' }, 400);
    const r = await db.prepare('INSERT INTO pageants(name,adm) VALUES(?,?)').bind(name, adm).run();
    const pid = Number(r.meta.last_row_id);
    await db.prepare("INSERT INTO rounds(pg,name) VALUES(?,'รอบที่ 1')").bind(pid).run();
    return J({ ok: true, id: pid });
  }
  const P = await db.prepare('SELECT id FROM pageants WHERE id=?').bind(id).first(); if (!P) return J({ error: 'ไม่พบเวที' }, 404);
  if (a === 'pgren') { const n = txt(b.name); if (!n) return J({ error: 'กรุณากรอกชื่อ' }, 400); await db.prepare('UPDATE pageants SET name=? WHERE id=?').bind(n, id).run(); }
  else if (a === 'pgcode') {
    const c = txt(b.adm, 40); if (!c) return J({ error: 'กรุณากรอกรหัส' }, 400);
    if ((await db.prepare('SELECT id FROM judges WHERE pg=? AND upper(code)=upper(?)').bind(id, c).first())) return J({ error: 'รหัสนี้ซ้ำกับรหัสกรรมการของเวทีนี้' }, 400);
    await db.prepare('UPDATE pageants SET adm=? WHERE id=?').bind(c, id).run();
  } else if (a === 'pgdel') {
    await db.prepare('DELETE FROM scores WHERE round_id IN (SELECT id FROM rounds WHERE pg=?)').bind(id).run();
    await db.prepare('DELETE FROM results WHERE round_id IN (SELECT id FROM rounds WHERE pg=?)').bind(id).run();
    await db.prepare("DELETE FROM images WHERE (kind='contestant' AND id IN (SELECT id FROM contestants WHERE pg=?)) OR (kind='judge' AND id IN (SELECT id FROM judges WHERE pg=?)) OR (kind='logo' AND id=?)").bind(id, id, id).run();
    for (const t of ['rounds', 'contestants', 'judges', 'log']) await db.prepare(`DELETE FROM ${t} WHERE pg=?`).bind(id).run();
    await db.prepare('DELETE FROM settings WHERE pg=?').bind(id).run();
    await db.prepare('DELETE FROM pageants WHERE id=?').bind(id).run();
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
      if (p === 'pageants' && m === 'GET') return J((await env.DB.prepare('SELECT id,name FROM pageants ORDER BY id').all()).results);
      if (p === 'rev' && m === 'GET') { const r = await env.DB.prepare('SELECT rev FROM pageants WHERE id=?').bind(+url.searchParams.get('pg') || 0).first(); return r ? J({ rev: r.rev }) : J({ error: 'ไม่พบเวที' }, 404); }
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
      if (p === 'me') return J({ role: me.role, pg: me.pg, name: me.name || '', pgName: me.pgName || '', jid: me.jid || 0 });
      if (me.role === 'judge') {
        if (p === 'judge' && m === 'GET') {
          const s = await getS(env, me.pg), rd = await curRound(env, me.pg, s), c = +s.cur ? await own(env, 'contestants', +s.cur, me.pg) : null;
          const rs = c && rd ? await env.DB.prepare('SELECT revealed,is_out FROM results WHERE round_id=? AND contestant_id=?').bind(rd.id, c.id).first() : null;
          const mine = c && rd ? await env.DB.prepare('SELECT score FROM scores WHERE round_id=? AND contestant_id=? AND judge_id=?').bind(rd.id, c.id, me.jid).first() : null;
          const hasImg = c ? await env.DB.prepare("SELECT updated FROM images WHERE kind='contestant' AND id=?").bind(c.id).first() : null;
          const ok = c && !(rs && rs.is_out);
          return J({ name: me.name, pgName: me.pgName, max: +s.max, round: rd ? rd.name : '', rev: (await env.DB.prepare('SELECT rev FROM pageants WHERE id=?').bind(me.pg).first()).rev,
            current: ok ? { id: c.id, no: c.no, name: c.name, country: c.country || '', img: hasImg ? `/api/img/contestant/${c.id}?v=${hasImg.updated}` : null, revealed: !!(rs && rs.revealed) } : null, mine: mine ? mine.score : null });
        }
        if (p === 'score' && m === 'POST') return judgeSubmit(env, me, await req.json());
        return J({ error: 'ไม่มีสิทธิ์' }, 403);
      }
      if (me.role === 'super' && p === 'super' && m === 'GET') {
        const l = (await env.DB.prepare('SELECT g.id,g.name,g.adm,(SELECT COUNT(*) FROM judges WHERE pg=g.id) judges,(SELECT COUNT(*) FROM contestants WHERE pg=g.id) contestants FROM pageants g ORDER BY g.id').all()).results;
        return J({ pageants: l });
      }
      if (me.role === 'super' && p.startsWith('super/') && m === 'POST') return superAction(env, p.slice(6), await req.json());
      // แอดมินเวที หรือ ผู้ดูแลหลักที่เข้าไปจัดการเวที (ส่ง x-pg)
      const pg = me.pg; if (!pg) return J({ error: 'ไม่ได้เลือกเวที' }, 400);
      if (me.role === 'super' && !(await env.DB.prepare('SELECT id FROM pageants WHERE id=?').bind(pg).first())) return J({ error: 'ไม่พบเวที' }, 404);
      if (p === 'admin' && m === 'GET') {
        const sn = await snapshot(env, pg, { codes: true }); if (!sn) return J({ error: 'ไม่พบเวที' }, 404);
        sn.log = (await env.DB.prepare('SELECT t,who,round,c,what,from_v,to_v FROM log WHERE pg=? ORDER BY id DESC LIMIT 300').bind(pg).all()).results.map(x => ({ t: x.t, who: x.who, round: x.round, c: x.c, what: x.what, from: x.from_v == null ? null : isNaN(+x.from_v) ? x.from_v : +x.from_v, to: x.to_v == null ? null : isNaN(+x.to_v) ? x.to_v : +x.to_v }));
        return J(sn);
      }
      if (p.startsWith('admin/') && m === 'POST') return adminAction(env, p.slice(6), await req.json(), pg, me.role);
      return J({ error: 'not found' }, 404);
    } catch (e) { return J({ error: 'เซิร์ฟเวอร์ผิดพลาด' }, 500); }
  },
};
