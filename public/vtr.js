/* จอรูปเต็มจอ: วิ่งสุ่มรูปตอนประกาศเข้ารอบ → ค้างรูปคนที่ประกาศ → รายชื่อผู้เข้ารอบ → VTR
   server ส่งแค่ "สถานะ" (q) ตัวจับเวลา เฟด และการวิ่งสุ่มทำฝั่งจอเอง โดยคำนวณเวลาจาก q.ts (เวลาเซิร์ฟเวอร์) */
const CSS = `
#qv{position:fixed;inset:0;background:#000;z-index:60;opacity:0;pointer-events:none;overflow:hidden}
#qv .qs{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:50% 50%}
#qv .ql{position:absolute;inset:0;opacity:0;background:#000;overflow:hidden}
#qv .ql img,#qv .ql video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#qv .ql img.bgi{object-fit:cover}
@keyframes qzoom{from{transform:scale(1)}to{transform:scale(1.05)}}
#qv .ql img.z{animation:qzoom var(--zs,8s) linear forwards}
@keyframes qrow{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
#qv .lw{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:"Prompt",system-ui,sans-serif;color:var(--c3,#f4e9d3)}
#qv .lr{display:flex;align-items:baseline;gap:.5em;width:1360px;border-bottom:1px solid rgba(255,255,255,.14);box-sizing:border-box;padding:0 8px;opacity:0;animation:qrow .5s ease-out forwards;white-space:nowrap;text-transform:uppercase;letter-spacing:.04em;align-items:center}
#qv .lr b{color:var(--c1,#e3b95a);min-width:2.4em;text-align:right;font-weight:600;margin-right:.5em}
#qv .lr span{font-weight:500;overflow:hidden;text-overflow:ellipsis}
#qv .lr i{font-style:normal;opacity:.72;font-size:.62em;margin-left:auto;overflow:hidden;text-overflow:ellipsis}
`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function qScreen(host) {
  if (!document.getElementById('qv-css')) { const s = document.createElement('style'); s.id = 'qv-css'; s.textContent = CSS; document.head.appendChild(s); }
  host.innerHTML = '<div class="qs"></div>';
  const st = host.firstChild;
  let on = false, q = null, off = 0, sig = '', gen = 0, ver = 0, tmr = 0, drw = 0, wt = 0;
  const fit = () => { st.style.transform = `translate(-50%,-50%) scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  fit(); addEventListener('resize', fit);
  const cache = new Map();
  const pre = u => { if (u && !cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im); } };
  const kill = el => { el.querySelectorAll('video').forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }); el.remove(); };
  // วางเลเยอร์ใหม่ทับของเดิม แล้วค่อยๆ เฟดเข้า (เลเยอร์เก่าค้างอยู่จนเฟดเสร็จ จะไม่มีช่วงจอจางกลางทาง)
  const layer = (html, fade, style) => {
    const prev = [...st.children], d = document.createElement('div'); d.className = 'ql'; if (style) d.setAttribute('style', style);
    d.innerHTML = html; d.style.transition = fade > 0 ? `opacity ${fade}s linear` : 'none'; st.append(d);
    void d.offsetWidth; d.style.opacity = 1;
    if (fade > 0) setTimeout(() => prev.forEach(kill), fade * 1000 + 60); else prev.forEach(kill);
    return d;
  };
  const stop = () => { clearTimeout(tmr); clearTimeout(wt); clearInterval(drw); gen++; };
  const wait = (ms, g) => new Promise(res => { wt = setTimeout(res, ms); void g; });

  const phaseOf = (qq, el) => {
    const c = qq.cfg, lp = t => (c.au && c.ls > 0 && t >= c.ls * 1000 ? 'vtr' : 'list'), lnext = (t, p) => (p === 'list' && c.au && c.ls > 0 ? c.ls * 1000 - t : 0);
    if (qq.m === 'vtr') return {p: 'vtr', next: 0};
    if (qq.m === 'list') { const p = lp(el); return {p, next: lnext(el, p)}; }
    if (qq.annI >= 0 && qq.held && el < c.hold * 1000) return {p: 'hold', next: c.hold * 1000 - el};
    if (qq.n > 0 && qq.annI >= qq.n - 1) { const t = el - (qq.held ? c.hold * 1000 : 0), p = lp(t); return {p, next: lnext(t, p)}; }
    return {p: 'draw', next: 0};
  };

  const listHTML = qq => {
    const n = qq.list.length, rh = Math.max(34, Math.min(88, Math.floor(920 / Math.max(1, n)))), fs = Math.round(rh * 0.58);
    const bg = qq.bg ? `<img class="bgi" src="${esc(qq.bg)}" alt=""><div style="position:absolute;inset:0;background:rgba(0,0,0,.45)"></div>` : '';
    const rows = qq.list.map((r, i) => {
      const a = qq.big === 'name' ? r.name : (r.country || r.name), b = qq.big === 'name' ? r.country : (r.country ? r.name : '');
      return `<div class="lr" style="height:${rh}px;font-size:${fs}px;animation-delay:${(i * 0.13).toFixed(2)}s"><b>${esc(r.no)}</b><span>${esc(a)}</span>${b ? `<i>${esc(b)}</i>` : ''}</div>`;
    }).join('');
    return `${bg}<div class="lw" style="--c1:${esc(qq.col.c1)};--c3:${esc(qq.col.c3)}">${rows}</div>`;
  };

  const playItem = (it, g, c, fade, single) => new Promise(async res => {
    const sec = it.sec > 0 ? it.sec : c.is;
    if (it.k === 'i') {
      layer(`<img class="${c.zm ? 'z' : ''}" style="--zs:${sec + c.fx}s" src="${esc(it.u)}" alt="">`, fade);
      if (single) return res('stay');
      await wait(sec * 1000, g); return res('next');
    }
    const d = layer(`<video playsinline preload="auto" src="${esc(it.u)}"></video>`, fade), v = d.firstChild;
    let done = false; const fin = r => { if (!done) { done = true; res(r); } };
    if (single) v.loop = true;
    v.addEventListener('ended', () => fin('next')); v.addEventListener('error', () => setTimeout(() => fin('next'), 1500));
    const to = setTimeout(() => { if (v.readyState < 2) fin('next'); }, 20000);
    try { await v.play(); } catch (e) { v.muted = true; try { await v.play(); } catch (e2) { fin('next'); } }
    if (single) fin('stay');
    void to;
  });

  const runVtr = async (g, c, fade) => {
    const items = q.vtr; if (!items.length) { layer('', fade); return; }
    let i = 0;
    while (g === gen) {
      const r = await playItem(items[i % items.length], g, c, fade, items.length === 1); i++;
      if (g !== gen || r === 'stay') return;
      fade = c.fx;
    }
  };

  let lastP = '';
  const run = async (entering) => {
    stop(); const g = gen, c = q.cfg, el = Date.now() + off - q.ts, {p, next} = phaseOf(q, el);
    const prev = lastP; lastP = p;
    if (p === 'draw') {
      const pool = q.pool, d = layer('<img alt="">', entering ? c.fi : 0), im = d.firstChild; let last = '';
      if (!pool.length) im.remove();
      else drw = setInterval(() => { let u = pool[Math.floor(Math.random() * pool.length)]; if (pool.length > 1 && u === last) u = pool[(pool.indexOf(u) + 1) % pool.length]; last = u; im.src = u; }, 75);
    } else if (p === 'hold') {
      layer(`<img src="${esc(q.held)}" alt="">`, entering ? c.fi : 0);
    } else if (p === 'list') {
      layer(listHTML(q), entering ? c.fi : 0.5);
    } else { // vtr: มาจากรายชื่อ/รูป = เฟดดำก่อนแล้วค่อยขึ้น VTR
      let fade = entering ? c.fi : c.fi;
      if (!entering && prev !== 'vtr') { layer('', c.fo); await sleep(c.fo * 1000 + 80); if (g !== gen) return; }
      runVtr(g, c, fade);
    }
    if (next > 0) tmr = setTimeout(() => { if (g === gen) run(false); }, next + 30);
  };

  const exit = async () => {
    on = false; ver++; stop(); lastP = ''; sig = '';
    const fo = (q && q.cfg ? q.cfg.fo : 0.6);
    [...st.children].forEach(d => { d.style.transition = fo > 0 ? `opacity ${fo}s linear` : 'none'; d.style.opacity = 0; });
    await sleep(fo * 1000); if (on) return;
    host.style.transition = fo > 0 ? `opacity ${fo}s linear` : 'none'; host.style.opacity = 0;
    await sleep(fo * 1000 + 60); if (on) return;
    [...st.children].forEach(kill); host.style.pointerEvents = 'none';
  };

  return {
    async update(q2, sn) {
      if (!q2) { if (on) exit(); return; }
      if (sn) off = sn - Date.now();
      const sg = JSON.stringify([q2.m, q2.ts, q2.annI, q2.n, q2.held, q2.pool.length, q2.vtr.map(x => x.u + x.sec), q2.list.map(x => x.no), q2.bg, q2.cfg, q2.big]);
      const same = sg === sig && on; q = q2;
      q2.pool.forEach(pre); q2.vtr.forEach(x => x.k === 'i' && pre(x.u)); pre(q2.held); pre(q2.bg);
      if (same) return;
      sig = sg; const v = ++ver;
      if (!on) {
        on = true; [...st.children].forEach(kill); host.style.pointerEvents = 'auto';
        host.style.transition = q.cfg.fi > 0 ? `opacity ${q.cfg.fi}s linear` : 'none'; host.style.opacity = 1;
        await sleep(q.cfg.fi * 1000 + 40); if (v !== ver) return;
        run(true);
      } else run(false);
    },
  };
}
