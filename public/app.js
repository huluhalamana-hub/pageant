(function () {
  "use strict";
  var BANK = { bank: "ช่องทางชำระเงิน", no: "", holder: "" };
  var CONT = [{ key: "area", label: "พื้นที่" }];
  var PROMPT_LINES = [
    "Use the exact same character from the reference image, STRICTLY preserve Roblox character identity, keep the exact same face, facial features, makeup, hairstyle, hair color, outfit, accessories, body shape, and proportions EXACTLY, do not change anything",
    "stylized Roblox character render, NOT real human, NOT photorealistic / game-like aesthetic, smooth plastic-like texture",
    "single character in a high-fashion beauty queen editorial photoshoot (no crown)",
    "@POSE@",
    "facial expression: neutral confident face, subtle smirk (slight corner lip raise), sharp eyes, fierce and calm, beauty queen attitude, spies vibe, NOT smiling, NOT cheerful",
    "strong eye contact with camera, slightly lifted chin for powerful presence",
    "professional black studio setup: deep black seamless background, luxury minimal aesthetic",
    "studio lighting: soft key light from front for face clarity, strong rim light from behind to create glowing edge highlights around hair and body, subtle shadow contrast for dramatic depth, glossy highlights on outfit",
    "cinematic high contrast lighting, rich shadows, premium editorial mood",
    "ultra sharp focus, crisp details, high clarity, 8k quality",
    "clean dark color grading, gold/neutral highlight tones, polished luxury finish",
    "minimal composition, centered framing",
    "4:5 aspect ratio"
  ];
  var POSES = [
    "elegant pose: standing confidently, body slightly angled, one hand on waist, model posture, poised and graceful",
    "elegant pose: standing confidently, body slightly angled, one hand softly touching the collarbone, model posture, poised and graceful"
  ];
  var RULES = [
    { h: "คุณสมบัติผู้สมัคร", items: [
      "ผู้สมัคร 1 คน ลงแข่งขันได้ 1 พื้นที่เท่านั้น",
      "ใช้ Username เดียวกันสมัครซ้ำไม่ได้",
      "ไม่สามารถนำสังกัดบ้านมาใช้เป็นนามสกุลได้"
    ] },
    { h: "กติกาการสมัคร", items: [
      "ผู้สมัครต้องเลือกพื้นที่ที่ต้องการลงประกวด",
      { key: "พื้นที่ที่ยืนยันแล้วถูกล็อกทันที ใครกดยืนยันก่อนได้ก่อน" },
      "ไม่มีค่าสมัคร เมื่อกดยืนยัน พื้นที่จะถูกล็อกให้คุณทันที",
      "ชื่อจะขึ้นในทำเนียบผู้สมัครหลังทีมงานตรวจและกดยืนยันแล้ว",
      "เมื่อส่งใบสมัคร ถือว่ายอมรับกติกาและผลการตัดสินทั้งหมดของเวที",
      "ตรวจเช็กทุกอย่างให้เรียบร้อยก่อนกดยืนยัน"
    ] }
  ];
  var VIEWS = ["home", "roster", "register", "admin"];

  function slugify(n) { return n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  var COUNTRIES = [], BY_SLUG = {};
  function syncRegions(list) { COUNTRIES = (list || []).map(function (r) { return { slug: r.slug, name: r.name, cont: "area" }; }); BY_SLUG = {}; COUNTRIES.forEach(function (c) { BY_SLUG[c.slug] = c; }); }

  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function contLabel() { return ""; }
  function fmtAcct(n) { return n.slice(0, 3) + "-" + n.slice(3, 4) + "-" + n.slice(4, 9) + "-" + n.slice(9); }
  function baht(n) { return Number(n).toLocaleString("th-TH") + " บาท"; }
  function fmtDate(v) { try { return new Date(v).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }); } catch (e) { return String(v || ""); } }
  function mmss(ms) { if (ms < 0) ms = 0; var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s = s % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function dhm(ms) { var m = Math.max(1, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); m = m % 60; return (d ? d + " วัน " : "") + (h ? h + " ชม. " : "") + (d ? "" : m + " นาที"); }
  function toLocalInput(ms) { if (!ms) return ""; var d = new Date(ms), p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function fromLocalInput(v) { if (!v) return null; var t = new Date(v).getTime(); return isNaN(t) ? null : t; }

  /* ---------- owner token (identifies this browser) ---------- */
  function makeToken() { var a = new Uint8Array(24); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
  var memToken = null;
  function ownerToken() {
    try { var t = localStorage.getItem("mm-owner"); if (!t) { t = makeToken(); localStorage.setItem("mm-owner", t); } return t; }
    catch (e) { if (!memToken) memToken = makeToken(); return memToken; }
  }

  var S = {
    offset: 0, settings: {}, content: {}, taken: {}, approved: [], me: [], admin: false, adminList: [],
    regions: [], regSig: "", fontSig: "", themeSig: "", brandSig: "", loaded: false, view: "home", tab: "area", q: "", sel: null, busy: false, lastMe: {},
    rTab: "all", rQ: "", aTab: "all", aQ: "", mineSig: "", edSig: "", heroSig: "", settingsFilled: false,
    heroIdx: 0, heroTimer: null, polling: false, pollTimer: null, queue: Promise.resolve(), blobs: {}
  };
  function nowMs() { return Date.now() + S.offset; }

  /* ---------- api ---------- */
  async function api(path, opts) {
    opts = opts || {};
    var headers = { "x-owner": ownerToken() };
    var init = { method: opts.method || "GET", headers: headers, credentials: "same-origin" };
    if (opts.json) { headers["content-type"] = "application/json"; init.body = JSON.stringify(opts.json); }
    if (opts.form) init.body = opts.form;
    var res, data = {};
    try { res = await fetch(path, init); } catch (e) { return { ok: false, status: 0, data: { message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" } }; }
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data };
  }
  async function poll() {
    if (S.polling) return; S.polling = true;
    try {
      var r = await api("/api/state");
      if (r.ok) {
        var d = r.data; S.offset = d.now - Date.now(); S.settings = d.settings || {}; S.content = d.content || {};
        S.regions = d.regions || []; syncRegions(S.regions); S.taken = d.taken || {}; S.approved = d.approved || []; S.admin = !!d.admin;
        var prev = S.lastMe; S.me = d.me || []; S.lastMe = {};
        S.me.forEach(function (m) { S.lastMe[m.slug] = m; });
        if (S.loaded) Object.keys(prev).forEach(function (k) { if (!S.lastMe[k] && !prev[k].slipAt) setStatus("พื้นที่ " + prev[k].country + " ไม่ได้อยู่กับคุณแล้ว (หมดเวลาหรือถูกปล่อย) ต้องกรอกและเลือกใหม่", true); });
        S.loaded = true; $("adminLink").hidden = !S.admin;
        if (S.admin && S.view === "admin") { var l = await api("/api/admin/list"); if (l.ok) S.adminList = l.data.list || []; }
        if (!$("status").dataset.sticky) setStatus("");
        render();
      } else { setStatus("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่...", true); }
    } finally { S.polling = false; scheduleNext(); }
  }
  function scheduleNext() {
    clearTimeout(S.pollTimer);
    var ms = S.view === "register" ? 5000 : S.view === "admin" ? 8000 : 20000;
    S.pollTimer = setTimeout(function () { if (document.hidden) scheduleNext(); else poll(); }, ms);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });

  /* ---------- derived state ---------- */
  var STATE_TH = { unpaid: "รอยืนยัน", pending: "รอแอดมินยืนยัน", approved: "ยืนยันแล้ว", rejected: "ไม่ผ่าน" };
  function chip(st) { return mk("span", "chip " + st, STATE_TH[st]); }
  function chFee(ch) { return ch && ch.fee != null && ch.fee !== "" ? ch.fee : (S.settings.fee != null && S.settings.fee !== "" ? S.settings.fee : null); }
  function feeTextFor(ch) { var f = chFee(ch); return f != null ? baht(f) : "ตามที่ทีมงานแจ้ง"; }
  function feeText() { return S.settings.fee != null && S.settings.fee !== "" ? baht(S.settings.fee) : "ตามที่ทีมงานแจ้ง"; }
  function schedule() {
    var s = S.settings, now = nowMs();
    if (s.open === false) return { open: false, text: "ปิดรับสมัครชั่วคราว" };
    if (s.opensAt && now < s.opensAt) return { open: false, text: "เปิดรับสมัคร " + fmtDate(s.opensAt) + " (อีก " + dhm(s.opensAt - now) + ")" };
    if (s.closesAt && now >= s.closesAt) return { open: false, text: "ปิดรับสมัครแล้ว" };
    if (s.closesAt) return { open: true, text: "ปิดรับสมัคร " + fmtDate(s.closesAt) + " (เหลือ " + dhm(s.closesAt - now) + ")" };
    return { open: true, text: "เปิดรับสมัครแล้ว" };
  }
  function isOpen() { return schedule().open; }
  function mineOf(slug) { return S.lastMe[slug] || null; }

  function setStatus(msg, warn) {
    var n = $("status");
    if (!msg) { n.hidden = true; delete n.dataset.sticky; return; }
    n.hidden = false; n.textContent = msg; n.className = "notice" + (warn ? " warn" : "");
  }
  function copyText(text, btn, label) {
    var done = function () { btn.textContent = "คัดลอกแล้ว"; setTimeout(function () { btn.textContent = label; }, 1500); };
    var fb = function () { btn.textContent = "คัดลอกไม่ได้ เลือกข้อความเอง"; };
    try { navigator.clipboard.writeText(text).then(done, fb); } catch (e) { fb(); }
  }
  function makeTabs(host, items, cur, onPick) {
    host.textContent = "";
    items.forEach(function (it) {
      var b = mk("button", "tab"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(cur === it.key));
      b.appendChild(mk("span", null, it.label)); if (it.sub != null) b.appendChild(mk("small", null, it.sub));
      b.addEventListener("click", function () { onPick(it.key); }); host.appendChild(b);
    });
  }

  /* ---------- images ---------- */
  function checkFile(f) {
    if (!f) return "กรุณาเลือกรูป";
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return "รองรับเฉพาะไฟล์ png, jpg หรือ webp";
    if (f.size > 30 * 1024 * 1024) return "ไฟล์ใหญ่เกิน 30 MB";
    return "";
  }
  function toBlob(cv, type, q) { return new Promise(function (res) { cv.toBlob(res, type, q); }); }
  async function compress(file, maxDim, maxBytes) {
    maxBytes = maxBytes || 1700000;
    var bmp = await createImageBitmap(file), scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height)), best = null;
    for (var round = 0; round < 5; round++) {
      var w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var ctx = cv.getContext("2d"); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
      for (var q = 0.9; q >= 0.45; q -= 0.15) {
        var b = await toBlob(cv, "image/webp", q);
        if (!b || b.type !== "image/webp") b = await toBlob(cv, "image/jpeg", q);
        if (b) { best = b; if (b.size <= maxBytes) return b; }
      }
      scale *= 0.8;
    }
    if (bmp.close) bmp.close();
    return best;
  }
  function imgUrl(id) { return "/img/" + id; }
  function picEl(assetId, alt) {
    if (assetId) {
      var img = document.createElement("img"); img.alt = alt || ""; img.src = imgUrl(assetId); img.loading = "lazy";
      img.addEventListener("error", function () { img.replaceWith(mk("div", "ph", "✦")); });
      return img;
    }
    return mk("div", "ph", "✦");
  }
  async function secureBlobUrl(id) {
    if (S.blobs[id]) return S.blobs[id];
    var res = await fetch("/img/" + id, { headers: { "x-owner": ownerToken() }, credentials: "same-origin" });
    if (!res.ok) throw new Error("http " + res.status);
    return (S.blobs[id] = URL.createObjectURL(await res.blob()));
  }
  function secureImg(id, alt, cls) {
    var img = mk("img", cls || ""); img.alt = alt || ""; img.style.background = "var(--panel-2)";
    secureBlobUrl(id).then(function (u) { img.src = u; }, function () { img.replaceWith(mk("div", "ph", "✦")); });
    return img;
  }
  function saveBlob(filename, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ---------- modal ---------- */
  function closeModal() { $("modalHost").textContent = ""; document.removeEventListener("keydown", onEsc); }
  function onEsc(e) { if (e.key === "Escape" && !S.busy) closeModal(); }
  function modal(build, wide) {
    var host = $("modalHost"); host.textContent = "";
    var veil = mk("div", "veil"), m = mk("div", "modal" + (wide ? " wide" : ""));
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    build(m); veil.appendChild(m); host.appendChild(veil);
    veil.addEventListener("click", function (e) { if (e.target === veil && !S.busy) closeModal(); });
    document.addEventListener("keydown", onEsc);
    var f = m.querySelector("button.btn:not(.ghost)"); if (f) f.focus();
    return m;
  }
  function summary(m, rows) { var dl = mk("dl"); rows.forEach(function (r) { dl.appendChild(mk("dt", null, r[0])); dl.appendChild(mk("dd", null, r[1])); }); m.appendChild(dl); }
  function showResult(m, title, body, ok) {
    m.textContent = ""; m.appendChild(mk("h3", null, title)); if (body) m.appendChild(mk("p", null, body));
    var row = mk("div", "row"); row.style.justifyContent = "flex-end";
    var b = mk("button", "btn", ok ? "เรียบร้อย" : "ปิด"); b.type = "button"; b.addEventListener("click", closeModal);
    row.appendChild(b); m.appendChild(row); b.focus();
  }
  function lightbox(title, srcPromise, saveFn) {
    modal(function (m) {
      m.appendChild(mk("h3", null, title));
      var img = mk("img", "big"); img.alt = title; m.appendChild(img);
      Promise.resolve(srcPromise).then(function (u) { img.src = u; });
      var row = mk("div", "row"); row.style.justifyContent = "flex-end";
      if (saveFn) { var sv = mk("button", "btn", "บันทึกรูป"); sv.type = "button"; sv.addEventListener("click", saveFn); row.appendChild(sv); }
      var cl = mk("button", "btn ghost", "ปิด"); cl.type = "button"; cl.addEventListener("click", closeModal); row.appendChild(cl); m.appendChild(row);
    }, true);
  }

  function renderRules(host) {
    host.textContent = "";
    RULES.forEach(function (g) {
      var d = mk("div"); d.appendChild(mk("h3", null, g.h)); var ul = mk("ul");
      g.items.forEach(function (it) { ul.appendChild(mk("li", typeof it === "string" ? "" : "key", typeof it === "string" ? it : it.key)); });
      d.appendChild(ul); host.appendChild(d);
    });
  }
  function defaultPayments() { return [{ name: BANK.bank, no: "", holder: "", note: "ทีมงานจะแจ้งช่องทางชำระเงินให้ทราบ", qr: "", logo: "" }]; }
  function getPayments() { var p = S.content && S.content.payments; return p && p.length ? p : defaultPayments(); }
  var payPick = 0;
  function payCard(ch, showNote) {
    var b = mk("div", "bank");
    if (ch.name) b.appendChild(mk("div", "pn", ch.name));
    if (ch.no) b.appendChild(mk("div", "acct", ch.no));
    if (ch.holder) b.appendChild(mk("div", null, "ชื่อบัญชี " + ch.holder));
    if (showNote && ch.note) b.appendChild(mk("div", "hint", ch.note));
    if (ch.qr) {
      var q = mk("img", "payqr"); q.src = imgUrl(ch.qr); q.alt = "QR " + (ch.name || "ชำระเงิน"); q.loading = "lazy";
      q.addEventListener("click", function () { lightbox("QR " + (ch.name || "ชำระเงิน"), Promise.resolve(imgUrl(ch.qr))); }); b.appendChild(q);
    }
    if (ch.no) {
      var cp = mk("button", "btn ghost sm", "คัดลอกเลขบัญชี"); cp.type = "button"; cp.style.alignSelf = "flex-start";
      var digits = ch.no.replace(/[^0-9]/g, "");
      cp.addEventListener("click", function () { copyText(digits.length >= 6 ? digits : ch.no, cp, "คัดลอกเลขบัญชี"); }); b.appendChild(cp);
    }
    return b;
  }
  function bankBox(onFee) {
    var w = mk("div", "paybox"), chs = getPayments();
    var feeRow = mk("div", "bank"), feeAmt = mk("span", "amt");
    feeRow.appendChild(document.createTextNode("ค่าสมัคร ")); feeRow.appendChild(feeAmt);
    function showFee(ch) { feeAmt.textContent = feeTextFor(ch); if (onFee) onFee(chFee(ch)); }
    if (chs.length === 1) { w.appendChild(payCard(chs[0], true)); showFee(chs[0]); w.appendChild(feeRow); return w; }
    w.appendChild(mk("div", "hint", "เลือกช่องทางชำระเงิน"));
    var grid = mk("div", "paygrid"), detail = mk("div", "paydetail");
    function pick(i) {
      payPick = i;
      Array.prototype.forEach.call(grid.children, function (el, k) { el.setAttribute("aria-pressed", String(k === i)); });
      detail.textContent = ""; detail.appendChild(payCard(chs[i], false)); showFee(chs[i]);
    }
    chs.forEach(function (ch, i) {
      var t = mk("button", "paytile"); t.type = "button";
      var head = mk("span", "pth");
      if (ch.logo) { var lg = mk("img", "ptl"); lg.src = imgUrl(ch.logo); lg.alt = ""; lg.loading = "lazy"; head.appendChild(lg); }
      head.appendChild(mk("span", "ptn", ch.name || "ช่องทาง")); t.appendChild(head);
      if (ch.note) t.appendChild(mk("span", "ptd", ch.note));
      if (ch.fee != null && ch.fee !== "") t.appendChild(mk("span", "ptf", baht(ch.fee)));
      t.addEventListener("click", function () { pick(i); }); grid.appendChild(t);
    });
    w.appendChild(grid); w.appendChild(detail); pick(Math.min(payPick, chs.length - 1));
    w.appendChild(feeRow);
    return w;
  }

  /* ---------- HOME ---------- */
  function renderHero() {
    var slides = (S.content.hero || []).filter(function (x) { return x && x.asset; });
    var sig = slides.map(function (x) { return x.asset; }).join(",");
    if (sig !== S.heroSig) {
      S.heroSig = sig; S.heroIdx = 0;
      var stage = $("heroStage"), dots = $("heroDots"); stage.textContent = ""; dots.textContent = "";
      if (S.heroTimer) { clearInterval(S.heroTimer); S.heroTimer = null; }
      if (!slides.length) stage.appendChild(mk("div", "hero-empty"));
      else {
        slides.forEach(function (s, i) {
          var im = mk("img", "slide" + (i === 0 ? " on" : "")); im.alt = "ภาพหน้าแรก " + (i + 1); im.src = imgUrl(s.asset); stage.appendChild(im);
          if (slides.length > 1) { var d = mk("button"); d.type = "button"; d.setAttribute("aria-label", "ภาพที่ " + (i + 1)); d.setAttribute("aria-current", String(i === 0)); d.addEventListener("click", function () { goHero(i); }); dots.appendChild(d); }
        });
        if (slides.length > 1 && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
          S.heroTimer = setInterval(function () { goHero((S.heroIdx + 1) % slides.length); }, 5500);
        }
      }
    }
    $("heroSt").textContent = schedule().text;
  }
  function goHero(i) {
    S.heroIdx = i;
    document.querySelectorAll("#heroStage .slide").forEach(function (el, k) { el.classList.toggle("on", k === i); });
    document.querySelectorAll("#heroDots button").forEach(function (el, k) { el.setAttribute("aria-current", String(k === i)); });
  }
  function personCard(c) {
    var li = mk("li", "person" + (mineOf(c.slug) ? " me" : ""));
    var pic = mk("div", "pic"); pic.appendChild(picEl(c.photoId, "รูปของ " + c.fullName)); li.appendChild(pic);
    var m = mk("div", "meta");
    m.appendChild(mk("div", "c", c.country)); m.appendChild(mk("div", "nm", c.fullName)); m.appendChild(mk("div", "u", c.username));
    m.appendChild(chip("approved")); li.appendChild(m); return li;
  }
  function renderInfo() {
    var info = S.content.info || {}, f = (info.format || []).filter(function (x) { return x.label || x.text; }), s = (info.schedule || []).filter(function (x) { return x.when || x.title || x.text; });
    $("infoSec").hidden = !f.length && !s.length; $("fmtSec").hidden = !f.length; $("schSec").hidden = !s.length;
    var fl = $("fmtList"); fl.textContent = ""; f.forEach(function (x) { var c = mk("div", "fmt-card"); if (x.label) c.appendChild(mk("b", null, x.label)); if (x.text) c.appendChild(mk("p", null, x.text)); fl.appendChild(c); });
    var sl = $("schList"); sl.textContent = ""; s.forEach(function (x) { var li = mk("li"); if (x.when) li.appendChild(mk("div", "w", x.when)); if (x.title) li.appendChild(mk("div", "t", x.title)); if (x.text) li.appendChild(mk("div", "d", x.text)); sl.appendChild(li); });
  }
  function renderHome() {
    renderHero(); renderInfo();
    var note = S.settings.note; $("homeNote").hidden = !note; if (note) $("homeNote").textContent = note;
    var list = S.approved.slice(-8).reverse(), host = $("homePeople"); host.textContent = "";
    list.forEach(function (c) { host.appendChild(personCard(c)); });
    $("homeEmpty").hidden = list.length > 0;
  }
  function renderRoster() {
    var q = S.rQ.trim().toLowerCase();
    var list = S.approved.filter(function (c) { return !q || (c.country + " " + c.fullName + " " + c.username).toLowerCase().indexOf(q) !== -1; });
    var host = $("rPeople"); host.textContent = ""; list.forEach(function (c) { host.appendChild(personCard(c)); });
    $("rEmpty").hidden = list.length > 0;
  }

  /* ---------- REGISTER ---------- */
  var photoFile = null;
  function renderConts() {
    var total = COUNTRIES.length, taken = 0; COUNTRIES.forEach(function (x) { if (S.taken[x.slug]) taken++; });
    $("conts").textContent = "ว่าง " + (total - taken) + " / " + total + " พื้นที่";
  }
  function renderRegisterBoard() {
    renderConts();
    var host = $("grid"); host.textContent = "";
    var q = S.q.trim().toLowerCase(), open = isOpen();
    var list = COUNTRIES.filter(function (c) { return !q || c.name.toLowerCase().indexOf(q) !== -1; });
    $("noMatch").hidden = list.length > 0;
    list.forEach(function (c) {
      var t = S.taken[c.slug], li = mk("li");
      if (t) {
        var mine = mineOf(c.slug);
        li.className = "tile " + (mine ? "mine" : "taken");
        li.appendChild(mk("span", "n", c.name));
        li.appendChild(mk("span", "w", mine ? "ของคุณ" : t.paid ? "จองแล้ว" : "กำลังจอง..."));
      } else {
        var b = mk("button", "tile"); b.type = "button"; b.setAttribute("aria-pressed", String(S.sel === c.slug));
        b.disabled = !S.loaded || !open;
        b.appendChild(mk("span", "n", c.name)); b.appendChild(mk("span", "w", "ว่าง"));
        b.addEventListener("click", function () { S.sel = S.sel === c.slug ? null : c.slug; renderRegisterBoard(); renderDock(); });
        li.appendChild(b);
      }
      host.appendChild(li);
    });
  }
  function myClaims() { return S.me; }
  function dockProblem(c) {
    if (!c) return "";
    var mine = myClaims();
    if (mine.length >= 1) return "คุณลงสมัครไปแล้ว 1 พื้นที่ (สมัครได้คนละ 1 พื้นที่)";
    return "";
  }
  function renderDock() {
    var c = S.sel && BY_SLUG[S.sel];
    if (c && S.taken[c.slug]) { S.sel = null; c = null; }
    var open = isOpen(), prob = dockProblem(c);
    $("dock").hidden = !(c && S.view === "register" && open);
    $("dockMsg").hidden = !prob; $("dockMsg").textContent = prob;
    $("goBtn").disabled = !open || !!prob;
    if (c) { $("dockName").textContent = c.name; $("dockCont").textContent = ""; }
  }
  function mineSignature() {
    return JSON.stringify(S.me.map(function (m) { return [m.slug, m.photoId || "", m.slipAt || 0, m.expiresAt || 0, m.state, (m.slip || {}).imageId || "", m.note || "", S.settings.fee, JSON.stringify((S.content && S.content.payments) || 0)]; }));
  }
  function renderMine(force) {
    $("mineSec").hidden = S.me.length === 0;
    var sig = mineSignature(); if (!force && sig === S.mineSig) return; S.mineSig = sig;
    var host = $("mineList"); host.textContent = "";
    S.me.forEach(function (m) {
      var card = mk("div", "card"), top = mk("div", "top"); top.appendChild(picEl(m.photoId, "รูปของ " + m.fullName));
      var b = mk("div", "b");
      b.appendChild(mk("div", "c", m.country)); b.appendChild(mk("div", "s", m.fullName + " · " + m.username));
      if (!m.photoId) {
        var lab = mk("label", "btn ghost sm", "อัปโหลดรูปโปรไฟล์"); lab.style.cursor = "pointer"; lab.style.marginTop = "6px";
        var inp = mk("input"); inp.type = "file"; inp.accept = "image/png,image/jpeg,image/webp"; inp.style.display = "none";
        inp.addEventListener("change", function () { if (inp.files[0]) attachPhoto(m.slug, inp.files[0], lab); });
        lab.appendChild(inp); b.appendChild(lab);
      }
      top.appendChild(b); card.appendChild(top); card.appendChild(payPanel(m)); host.appendChild(card);
    });
    updateTimers();
  }
  function payPanelOld(m) {
    var st = m.state, slip = m.slip;
    var p = mk("div", "pay"), h = mk("h4"); h.appendChild(document.createTextNode("ค่าสมัคร ")); h.appendChild(chip(st)); p.appendChild(h);
    if (st === "unpaid") {
      var t = mk("div", "timer"); t.dataset.slug = m.slug;
      t.appendChild(mk("div", "tm", mmss(m.expiresAt - nowMs()))); t.appendChild(mk("div", "tx", "โอนและแนบสลิปให้ทันเวลา ถ้าหมดเวลา พื้นที่จะหลุดทันทีและต้องกรอกใหม่")); p.appendChild(t);
    }
    if (slip) {
      var row = mk("div", "row"), th = secureImg(slip.imageId, "สลิปของคุณ", "slipthumb");
      th.addEventListener("click", function () { lightbox("สลิปของคุณ", secureBlobUrl(slip.imageId)); });
      row.appendChild(th); row.appendChild(mk("span", "hint", "ส่งเมื่อ " + fmtDate(slip.uploadedAt))); p.appendChild(row);
    }
    if (st === "approved") { p.appendChild(mk("div", "hint", "ทีมงานยืนยันการชำระแล้ว ชื่อของคุณขึ้นในทำเนียบผู้สมัครแล้ว")); return p; }
    if (st === "pending") p.appendChild(mk("div", "hint", "ทีมงานกำลังตรวจสลิป ถ้าส่งผิดไฟล์ ส่งใหม่ได้ด้านล่าง"));
    if (st === "rejected") p.appendChild(mk("div", "notice warn", "สลิปไม่ผ่าน" + (m.note ? ": " + m.note : "") + " กรุณาส่งสลิปใหม่"));
    var amtId = "amt-" + m.slug, fileId = "slip-" + m.slug, autoFee = "";
    p.appendChild(bankBox(function (f) {
      var el = document.getElementById(amtId), v = f != null ? String(f) : "";
      if (el && (el.value === "" || el.value === autoFee)) el.value = v;
      autoFee = v;
    }));
    var f1 = mk("div", "field"), l1 = mk("label", null, "จำนวนเงินที่โอน (บาท)"); l1.htmlFor = amtId;
    var amt = mk("input", "input"); amt.id = amtId; amt.type = "number"; amt.min = "0"; amt.inputMode = "numeric";
    if (autoFee) amt.value = autoFee;
    f1.appendChild(l1); f1.appendChild(amt); p.appendChild(f1);
    var f2 = mk("div", "field"), l2 = mk("label", "drop"); l2.htmlFor = fileId;
    var tx = mk("span", "t", "เลือกรูปสลิป (png, jpg, webp)"), fi = mk("input"); fi.type = "file"; fi.id = fileId; fi.accept = "image/png,image/jpeg,image/webp";
    fi.addEventListener("change", function () { tx.textContent = fi.files[0] ? fi.files[0].name : "เลือกรูปสลิป (png, jpg, webp)"; });
    l2.appendChild(mk("span", "ph", "✦")); l2.appendChild(tx); l2.appendChild(fi);
    var er = mk("div", "err"); f2.appendChild(l2); f2.appendChild(er); p.appendChild(f2);
    var send = mk("button", "btn", st === "unpaid" ? "ส่งสลิป" : "ส่งสลิปใหม่"); send.type = "button"; send.style.alignSelf = "flex-start";
    send.addEventListener("click", function () {
      var f = fi.files[0], e = checkFile(f); if (e) { er.textContent = e; return; }
      er.textContent = ""; sendSlip(m.slug, f, amt.value, send, er);
    });
    p.appendChild(send);
    return p;
  }
  function payPanel(m) {
    var st = m.state === "approved" ? "approved" : "pending", p = mk("div", "pay"), h = mk("h4"); h.appendChild(document.createTextNode("สถานะ ")); h.appendChild(chip(st)); p.appendChild(h);
    p.appendChild(mk("div", "hint", st === "approved" ? "ทีมงานยืนยันแล้ว ชื่อของคุณขึ้นในทำเนียบผู้สมัครแล้ว" : "ส่งใบสมัครแล้ว รอทีมงานตรวจและกดยืนยัน ชื่อจะขึ้นในทำเนียบหลังยืนยัน")); return p;
  }
  async function sendSlip(slug, file, amount, btn, er) {
    btn.disabled = true; btn.textContent = "กำลังส่ง...";
    try {
      var blob = await compress(file, 1600);
      var fd = new FormData(); fd.append("slug", slug); if (amount) fd.append("amount", amount); fd.append("slip", blob, "slip.webp");
      var r = await api("/api/slip", { method: "POST", form: fd });
      if (!r.ok) { btn.disabled = false; btn.textContent = "ส่งสลิป"; er.textContent = r.data.message || "ส่งสลิปไม่สำเร็จ ลองอีกครั้ง"; if (r.status === 410) poll(); return; }
      setStatus(""); S.mineSig = ""; await poll();
    } catch (e) { btn.disabled = false; btn.textContent = "ส่งสลิป"; er.textContent = "ย่อรูปไม่สำเร็จ ลองรูปอื่น"; }
  }
  async function attachPhoto(slug, file, labelEl) {
    var err = checkFile(file); if (err) { setStatus(err, true); return; }
    labelEl.firstChild.nodeValue = "กำลังอัปโหลด...";
    try {
      var blob = await compress(file, 1600), fd = new FormData(); fd.append("slug", slug); fd.append("photo", blob, "photo.webp");
      var r = await api("/api/photo", { method: "POST", form: fd });
      if (!r.ok) { setStatus(r.data.message || "อัปโหลดรูปไม่สำเร็จ", true); renderMine(true); return; }
      await poll();
    } catch (e) { setStatus("ย่อรูปไม่สำเร็จ ลองรูปอื่น", true); renderMine(true); }
  }
  function updateTimers() {
    document.querySelectorAll(".timer").forEach(function (t) {
      var c = mineOf(t.dataset.slug); if (!c) return;
      var left = c.expiresAt - nowMs(), tm = t.querySelector(".tm");
      tm.textContent = left > 0 ? mmss(left) : "หมดเวลา"; t.classList.toggle("late", left <= 0);
    });
  }

  function normUser(v) { v = v.trim(); if (v && v.charAt(0) !== "@") v = "@" + v; return v; }
  function firstName(n) { return n.trim().split(/\s+/)[0].toLowerCase(); }
  function setErr(fieldId, errId, msg) { $(errId).textContent = msg || ""; $(fieldId).classList.toggle("invalid", !!msg); }
  function validate() {
    var ok = true, first = null;
    function bad(fieldId, errId, msg) { setErr(fieldId, errId, msg); ok = false; if (!first) first = $(fieldId); }
    setErr("f-user", "e-user", ""); setErr("f-name", "e-name", ""); setErr("f-photo", "e-photo", ""); $("e-agree").textContent = "";
    if (!$("agree").checked) { $("e-agree").textContent = "กรุณาติ๊กรับทราบกติกาก่อน"; ok = false; first = first || $("agree"); }
    var u = normUser($("username").value);
    if (!/^@[A-Za-z0-9_.]{2,32}$/.test(u)) bad("f-user", "e-user", "กรอกชื่อผู้ใช้ในเกม เช่น @mali (ตัวอักษร ตัวเลข _ และ . เท่านั้น)");
    var name = $("fullname").value.trim().replace(/\s+/g, " ");
    if (name.length < 2) bad("f-name", "e-name", "กรอกชื่อและนามสกุลที่ใช้ประกวด");
    var fe = checkFile(photoFile); if (fe) bad("f-photo", "e-photo", fe);
    var c = S.sel && BY_SLUG[S.sel];
    if (!c) { setStatus("เลือกพื้นที่ก่อน", true); ok = false; }
    else if (dockProblem(c)) { ok = false; }
    if (first && first.scrollIntoView) first.scrollIntoView({ block: "center", behavior: "smooth" });
    return ok ? { username: u, fullName: name, country: c } : null;
  }
  function openConfirm(v) {
    modal(function (m) {
      m.appendChild(mk("h3", null, "ยืนยันเลือก " + v.country.name + "?"));
      summary(m, [["พื้นที่", v.country.name], ["Username", v.username], ["ชื่อที่ใช้ประกวด", v.fullName], ["รูป", photoFile ? photoFile.name : "ไม่ได้แนบ"]]);
      m.appendChild(mk("div", "lock", "เมื่อกดยืนยัน พื้นที่นี้ถูกล็อกให้คุณทันที (ไม่มีค่าสมัคร) แล้วรอทีมงานตรวจและกดยืนยันก่อนชื่อจะขึ้นทำเนียบ แก้ไขภายหลังไม่ได้ กรุณาตรวจให้เรียบร้อย"));
      var row = mk("div", "row"); row.style.justifyContent = "flex-end";
      var cancel = mk("button", "btn ghost", "กลับไปแก้"); cancel.type = "button"; cancel.addEventListener("click", closeModal);
      var go = mk("button", "btn", "ยืนยัน ลงทะเบียน"); go.type = "button"; go.addEventListener("click", function () { runClaim(m, v, go, cancel); });
      row.appendChild(cancel); row.appendChild(go); m.appendChild(row);
    });
  }
  async function runClaim(m, v, go, cancel) {
    if (S.busy) return;
    S.busy = true; go.disabled = true; cancel.disabled = true; go.textContent = "กำลังจอง...";
    try {
      var fd = new FormData(); fd.append("slug", v.country.slug); fd.append("username", v.username); fd.append("fullName", v.fullName);
      if (photoFile) { go.textContent = "กำลังย่อรูป..."; fd.append("photo", await compress(photoFile, 1600), "photo.webp"); go.textContent = "กำลังจอง..."; }
      var r = await api("/api/claim", { method: "POST", form: fd });
      if (!r.ok) {
        S.sel = null; await poll(); renderDock();
        showResult(m, r.data.error === "taken" ? "พื้นที่นี้ถูกจองไปแล้ว" : "จองไม่สำเร็จ", r.data.error === "taken" ? "มีคนกดยืนยันก่อนคุณเสี้ยววินาที เลือกพื้นที่อื่นที่ยังว่างได้เลย" : (r.data.message || "ลองกดยืนยันอีกครั้ง"), false);
        return;
      }
      S.sel = null; photoFile = null; $("photo").value = ""; $("fullname").value = ""; updatePhotoUi(); setStatus("");
      S.mineSig = ""; await poll(); renderDock();
      showResult(m, "ส่งใบสมัคร " + v.country.name + " แล้ว", "รอทีมงานตรวจและกดยืนยัน ชื่อจะขึ้นในทำเนียบหลังยืนยัน ถ้ายังไม่ได้แนบรูปโปรไฟล์ อัปโหลดได้ในใบสมัครของคุณ", true);
      setTimeout(function () { var s = $("mineSec"); if (s.scrollIntoView) s.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
    } catch (e) {
      showResult(m, "จองไม่สำเร็จ", "ย่อรูปหรือส่งข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งหรือเปลี่ยนรูป", false);
    } finally { S.busy = false; }
  }
  function updatePhotoUi() {
    var prev = $("photoPrev"), ph = $("photoPh");
    if (photoFile) { prev.src = URL.createObjectURL(photoFile); prev.hidden = false; ph.hidden = true; $("photoName").textContent = photoFile.name; }
    else { prev.hidden = true; ph.hidden = false; $("photoName").textContent = "เลือกรูปภาพ (png, jpg, webp)"; }
  }
  /* ---------- guide (หลักเกณฑ์ภาพและพรอมต์) ---------- */
  function defaultGuide() {
    return {
      rows: [
        { label: "เครื่องแต่งกาย", text: "ชุดเรียบหรู (plain elegant dress) ไม่มีลวดลาย ไม่ปักเพชร และไม่มีรายละเอียดซับซ้อน" },
        { label: "ทรงผม", text: "จัดทรงให้เรียบร้อย ผมไม่บังใบหน้า" },
        { label: "พื้นหลัง", text: "สีดำเรียบ ไม่มีลวดลายหรือสิ่งรบกวนสายตา" },
        { label: "องค์ประกอบ", text: "ถ้าทรงผมหรือเครื่องประดับสูง ต้องเห็นครบทั้งหมดในกรอบภาพ" },
        { label: "การปรับแต่ง", text: "ปรับความคมชัดได้ด้วยแอปแต่งภาพ เช่น Wink หรือ Meitu แต่ห้ามเปลี่ยนโครงสร้างตัวละคร" }
      ],
      prompts: POSES.map(function (pose, i) {
        return { title: "Prompt AI ท่าที่ " + (i + 1) + " (ChatGPT / Gemini)", text: PROMPT_LINES.map(function (l) { return l === "@POSE@" ? pose : l; }).join("\n\n") };
      })
    };
  }
  function getGuide() {
    var g = S.content.guide;
    if (g && (g.rows || g.prompts)) return { rows: g.rows || [], prompts: g.prompts || [] };
    return defaultGuide();
  }
  function renderGuide() {
    var g = getGuide(), sig = JSON.stringify(g);
    if (sig === S.guideSig) return; S.guideSig = sig;
    var host = $("guideBody"); host.textContent = "";
    if (g.rows.length) {
      var dl = mk("dl");
      g.rows.forEach(function (r) { dl.appendChild(mk("dt", null, r.label)); dl.appendChild(mk("dd", null, r.text)); });
      host.appendChild(dl);
    }
    g.prompts.forEach(function (p) {
      var box = mk("div", "prompt"), head = mk("div", "prompt-head");
      head.appendChild(mk("span", null, p.title));
      var cp = mk("button", "btn ghost sm", "คัดลอก"); cp.type = "button"; var pre = mk("pre", null, p.text);
      cp.addEventListener("click", function () {
        var done = function () { cp.textContent = "คัดลอกแล้ว"; setTimeout(function () { cp.textContent = "คัดลอก"; }, 1500); };
        var fb = function () { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = "เลือกข้อความแล้ว"; };
        try { navigator.clipboard.writeText(p.text).then(done, fb); } catch (e) { fb(); }
      });
      head.appendChild(cp); box.appendChild(head); box.appendChild(pre); host.appendChild(box);
    });
  }
  function saveGuide(mut) {
    return edit(function (n) {
      var g = n.guide && (n.guide.rows || n.guide.prompts) ? n.guide : (n.guide = defaultGuide());
      g.rows = g.rows || []; g.prompts = g.prompts || []; mut(g);
    });
  }
  function paymentsEditor(host) {
    function savePay(mut) { return edit(function (n) { if (!n.payments || !n.payments.length) n.payments = defaultPayments(); mut(n.payments); }); }
    var wrap = mk("div"); wrap.style.marginTop = "18px";
    wrap.appendChild(mk("div", "sub-h", "ช่องทางชำระเงิน (หน้าสมัคร)"));
    wrap.appendChild(mk("div", "hint", "เพิ่มได้สูงสุด 6 ช่องทาง เช่น ธนาคารอื่น ทรูมันนี่ พร้อมเพย์ แนบรูป QR ได้ แก้ข้อความแล้วคลิกออกจากช่อง ระบบบันทึกให้อัตโนมัติ"));
    var list = mk("div"); list.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:10px";
    var chs = getPayments();
    chs.forEach(function (ch, i) {
      var c = mk("div", "gcard");
      function fld(ph, val, key) {
        var inp = mk("input", "input"); inp.placeholder = ph; inp.value = val || ""; inp.setAttribute("aria-label", ph);
        inp.addEventListener("change", function () { savePay(function (x) { x[i][key] = inp.value.trim(); }); }); c.appendChild(inp);
      }
      fld("ชื่อช่องทาง เช่น ธนาคารกรุงเทพ / TrueMoney", ch.name, "name");
      fld("เลขบัญชี / เบอร์ / พร้อมเพย์", ch.no, "no");
      fld("ชื่อบัญชี", ch.holder, "holder");
      var fi = mk("input", "input"); fi.type = "number"; fi.min = "0"; fi.inputMode = "numeric"; fi.placeholder = "ค่าสมัครของช่องทางนี้ (บาท) ว่าง = ใช้ค่าสมัครปกติ"; fi.value = ch.fee != null ? ch.fee : ""; fi.setAttribute("aria-label", "ค่าสมัครของช่องทางนี้");
      fi.addEventListener("change", function () { savePay(function (x) { x[i].fee = fi.value === "" ? null : Number(fi.value); }); }); c.appendChild(fi);
      fld("คำอธิบายสั้น ๆ บนกล่อง เช่น จ่ายผ่านแอปได้ทันที (ไม่บังคับ)", ch.note, "note");
      if (ch.logo) { var lm = mk("div", "im"); lm.style.maxWidth = "64px"; lm.appendChild(picEl(ch.logo, "โลโก้")); c.appendChild(lm); }
      if (ch.qr) { var im = mk("div", "im"); im.style.maxWidth = "160px"; im.appendChild(picEl(ch.qr, "QR")); c.appendChild(im); }
      var row = mk("div", "row");
      row.appendChild(uploadBtn(ch.logo ? "เปลี่ยนโลโก้" : "เพิ่มโลโก้", false, 256, function (ids) { var old = ch.logo; return savePay(function (x) { x[i].logo = ids[0]; }).then(function () { removeAsset(old); }); }));
      if (ch.logo) row.appendChild(moveBtn("ลบโลโก้", function () { var old = ch.logo; savePay(function (x) { x[i].logo = ""; }).then(function () { removeAsset(old); }); }));
      row.appendChild(uploadBtn(ch.qr ? "เปลี่ยน QR" : "เพิ่มรูป QR", false, 900, function (ids) { var old = ch.qr; return savePay(function (x) { x[i].qr = ids[0]; }).then(function () { removeAsset(old); }); }));
      if (ch.qr) row.appendChild(moveBtn("ลบ QR", function () { var old = ch.qr; savePay(function (x) { x[i].qr = ""; }).then(function () { removeAsset(old); }); }));
      row.appendChild(moveBtn("↑", function () { savePay(function (x) { if (i > 0) { var t = x[i - 1]; x[i - 1] = x[i]; x[i] = t; } }); }, i === 0));
      row.appendChild(moveBtn("ลบช่องทาง", function () { var oq = ch.qr, ol = ch.logo; savePay(function (x) { x.splice(i, 1); }).then(function () { removeAsset(oq); removeAsset(ol); }); }, chs.length <= 1));
      c.appendChild(row); list.appendChild(c);
    });
    wrap.appendChild(list);
    var add = mk("div", "row"); add.style.marginTop = "10px";
    add.appendChild(moveBtn("+ เพิ่มช่องทาง", function () { savePay(function (x) { if (x.length < 6) x.push({ name: "ช่องทางใหม่", no: "", holder: "", note: "", qr: "", logo: "" }); }); }, chs.length >= 6));
    wrap.appendChild(add);
    host.appendChild(wrap);
  }
  function getInfo() { var i = S.content.info || {}; return { format: i.format || [], schedule: i.schedule || [] }; }
  function saveInfo(fn) { return edit(function (x) { x.info = x.info || { format: [], schedule: [] }; x.info.format = x.info.format || []; x.info.schedule = x.info.schedule || []; fn(x.info); }); }
  function infoEditor(host) {
    var g = getInfo(), wrap = mk("div");
    wrap.appendChild(mk("div", "sub-h", "รูปแบบการแข่งขัน (หน้าแรก)"));
    wrap.appendChild(mk("div", "hint", "แสดงเป็นการ์ดใต้ภาพสไลด์ แก้ข้อความแล้วคลิกออกจากช่อง ระบบบันทึกให้อัตโนมัติ ถ้าไม่มีรายการ หัวข้อนี้จะไม่แสดง"));
    var list = mk("div"); list.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:10px";
    g.format.forEach(function (r, i) {
      var c = mk("div", "gcard");
      var l = mk("input", "input"); l.value = r.label; l.placeholder = "หัวข้อ เช่น รอบคัดเลือก"; l.setAttribute("aria-label", "หัวข้อ");
      var t = mk("textarea", "input"); t.value = r.text; t.placeholder = "รายละเอียด"; t.setAttribute("aria-label", "รายละเอียด");
      l.addEventListener("change", function () { saveInfo(function (x) { x.format[i].label = l.value.trim(); }); });
      t.addEventListener("change", function () { saveInfo(function (x) { x.format[i].text = t.value.trim(); }); });
      c.appendChild(l); c.appendChild(t);
      var row = mk("div", "row");
      row.appendChild(moveBtn("↑", function () { saveInfo(function (x) { if (i > 0) { var a = x.format[i - 1]; x.format[i - 1] = x.format[i]; x.format[i] = a; } }); }, i === 0));
      row.appendChild(moveBtn("ลบ", function () { saveInfo(function (x) { x.format.splice(i, 1); }); }));
      c.appendChild(row); list.appendChild(c);
    });
    wrap.appendChild(list);
    var a1 = mk("div", "row"); a1.style.marginTop = "10px"; a1.appendChild(moveBtn("+ เพิ่มรูปแบบการแข่งขัน", function () { saveInfo(function (x) { x.format.push({ label: "หัวข้อใหม่", text: "" }); }); })); wrap.appendChild(a1);
    wrap.appendChild(mk("div", "sub-h", "กำหนดการ (หน้าแรก)")).style.marginTop = "18px";
    wrap.appendChild(mk("div", "hint", "แสดงเป็นไทม์ไลน์ เช่น วันที่/ช่วงเวลา + กิจกรรม"));
    var sl = mk("div"); sl.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:10px";
    g.schedule.forEach(function (r, i) {
      var c = mk("div", "gcard");
      var w = mk("input", "input"); w.value = r.when; w.placeholder = "วัน/เวลา เช่น 5 ธ.ค. 20:00"; w.setAttribute("aria-label", "วันและเวลา");
      var l = mk("input", "input"); l.value = r.title; l.placeholder = "กิจกรรม เช่น ปิดรับสมัคร"; l.setAttribute("aria-label", "กิจกรรม");
      var t = mk("textarea", "input"); t.value = r.text; t.placeholder = "รายละเอียดเพิ่มเติม (ไม่บังคับ)"; t.setAttribute("aria-label", "รายละเอียด");
      w.addEventListener("change", function () { saveInfo(function (x) { x.schedule[i].when = w.value.trim(); }); });
      l.addEventListener("change", function () { saveInfo(function (x) { x.schedule[i].title = l.value.trim(); }); });
      t.addEventListener("change", function () { saveInfo(function (x) { x.schedule[i].text = t.value.trim(); }); });
      c.appendChild(w); c.appendChild(l); c.appendChild(t);
      var row = mk("div", "row");
      row.appendChild(moveBtn("↑", function () { saveInfo(function (x) { if (i > 0) { var a = x.schedule[i - 1]; x.schedule[i - 1] = x.schedule[i]; x.schedule[i] = a; } }); }, i === 0));
      row.appendChild(moveBtn("ลบ", function () { saveInfo(function (x) { x.schedule.splice(i, 1); }); }));
      c.appendChild(row); sl.appendChild(c);
    });
    wrap.appendChild(sl);
    var a2 = mk("div", "row"); a2.style.marginTop = "10px"; a2.appendChild(moveBtn("+ เพิ่มกำหนดการ", function () { saveInfo(function (x) { x.schedule.push({ when: "", title: "กิจกรรมใหม่", text: "" }); }); })); wrap.appendChild(a2);
    host.appendChild(wrap);
  }
  function guideEditor(host) {
    var g = getGuide(), wrap = mk("div");
    wrap.appendChild(mk("div", "sub-h", "หลักเกณฑ์ภาพและพรอมต์ AI (หน้าสมัคร)"));
    wrap.appendChild(mk("div", "hint", "แก้ข้อความแล้วคลิกออกจากช่อง ระบบบันทึกให้อัตโนมัติ"));
    var list = mk("div"); list.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:10px";
    g.rows.forEach(function (r, i) {
      var c = mk("div", "gcard");
      var l = mk("input", "input"); l.value = r.label; l.placeholder = "หัวข้อ เช่น ทรงผม"; l.setAttribute("aria-label", "หัวข้อ");
      var t = mk("textarea", "input"); t.value = r.text; t.placeholder = "รายละเอียด"; t.setAttribute("aria-label", "รายละเอียด");
      l.addEventListener("change", function () { saveGuide(function (x) { x.rows[i].label = l.value.trim(); }); });
      t.addEventListener("change", function () { saveGuide(function (x) { x.rows[i].text = t.value.trim(); }); });
      c.appendChild(l); c.appendChild(t);
      var row = mk("div", "row");
      row.appendChild(moveBtn("↑", function () { saveGuide(function (x) { if (i > 0) { var a = x.rows[i - 1]; x.rows[i - 1] = x.rows[i]; x.rows[i] = a; } }); }, i === 0));
      row.appendChild(moveBtn("ลบ", function () { saveGuide(function (x) { x.rows.splice(i, 1); }); }));
      c.appendChild(row); list.appendChild(c);
    });
    wrap.appendChild(list);
    var addRow = mk("div", "row"); addRow.style.marginTop = "10px";
    addRow.appendChild(moveBtn("+ เพิ่มหัวข้อ", function () { saveGuide(function (x) { x.rows.push({ label: "หัวข้อใหม่", text: "" }); }); }));
    wrap.appendChild(addRow);
    var plist = mk("div"); plist.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:16px";
    g.prompts.forEach(function (p, i) {
      var c = mk("div", "gcard pr");
      var l = mk("input", "input"); l.value = p.title; l.placeholder = "ชื่อพรอมต์"; l.setAttribute("aria-label", "ชื่อพรอมต์");
      var t = mk("textarea", "input"); t.value = p.text; t.placeholder = "ข้อความพรอมต์"; t.setAttribute("aria-label", "ข้อความพรอมต์");
      l.addEventListener("change", function () { saveGuide(function (x) { x.prompts[i].title = l.value.trim(); }); });
      t.addEventListener("change", function () { saveGuide(function (x) { x.prompts[i].text = t.value; }); });
      c.appendChild(l); c.appendChild(t);
      var row = mk("div", "row");
      row.appendChild(moveBtn("ลบ", function () { saveGuide(function (x) { x.prompts.splice(i, 1); }); }));
      c.appendChild(row); plist.appendChild(c);
    });
    wrap.appendChild(plist);
    var addP = mk("div", "row"); addP.style.marginTop = "10px";
    addP.appendChild(moveBtn("+ เพิ่มพรอมต์", function () { saveGuide(function (x) { x.prompts.push({ title: "พรอมต์ใหม่", text: "" }); }); }));
    addP.appendChild(moveBtn("คืนค่าเริ่มต้นทั้งหมด", function () { edit(function (n) { delete n.guide; }); }));
    wrap.appendChild(addP);
    host.appendChild(wrap);
  }

  function renderRegister() {
    var sc = schedule(); $("closedNote").hidden = sc.open; $("closedNote").textContent = sc.text;
    renderGuide(); renderRegisterBoard(); renderDock(); renderMine(false);
  }

  /* ---------- ADMIN ---------- */
  async function gateSubmit() {
    var err = $("gateErr"); err.textContent = ""; $("gateBtn").disabled = true;
    var r = await api("/api/admin/login", { method: "POST", json: { password: $("gateCode").value } });
    $("gateBtn").disabled = false;
    if (!r.ok) { err.textContent = r.data.message || "เข้าสู่ระบบไม่สำเร็จ"; return; }
    $("gateCode").value = ""; await poll();
  }
  async function logout() { await api("/api/admin/logout", { method: "POST" }); S.admin = false; S.adminList = []; $("adminLink").hidden = true; render(); }
  function renderAdmin() {
    $("adminGate").hidden = S.admin; $("adminBody").hidden = !S.admin; $("logoutBtn").hidden = !S.admin;
    if (!S.admin) return;
    renderRegionsEd();
    var all = S.adminList, cnt = { pending: 0, unpaid: 0, approved: 0, rejected: 0 };
    all.forEach(function (c) { cnt[c.state]++; });
    var st = $("aStats"); st.textContent = "";
    [["ผู้สมัครทั้งหมด", all.length], ["รอยืนยัน", cnt.pending + cnt.unpaid + cnt.rejected], ["ยืนยันแล้ว", cnt.approved]].forEach(function (x) {
      var s = mk("div", "stat"); s.appendChild(mk("b", null, String(x[1]))); s.appendChild(mk("span", null, x[0])); st.appendChild(s);
    });
    makeTabs($("aTabs"), [{ key: "all", label: "ทั้งหมด", sub: all.length }, { key: "pending", label: "รอยืนยัน", sub: cnt.pending + cnt.unpaid + cnt.rejected }, { key: "approved", label: "ยืนยันแล้ว", sub: cnt.approved }], S.aTab, function (k) { S.aTab = k; renderAdmin(); });
    var q = S.aQ.trim().toLowerCase();
    var list = all.filter(function (c) {
      if (S.aTab === "pending" && c.state === "approved") return false;
      if (S.aTab === "approved" && c.state !== "approved") return false;
      return !q || (c.country + " " + c.fullName + " " + c.username).toLowerCase().indexOf(q) !== -1;
    });
    var host = $("aList"); host.textContent = ""; list.forEach(function (c) { host.appendChild(adminRow(c)); });
    $("aEmpty").hidden = list.length > 0;
    renderEditor();
    if (!S.settingsFilled && S.loaded) {
      S.settingsFilled = true;
      $("setOpen").checked = S.settings.open !== false;
      $("setOpensAt").value = toLocalInput(S.settings.opensAt); $("setClosesAt").value = toLocalInput(S.settings.closesAt); $("setNote").value = S.settings.note || ""; $("setEvent").value = S.settings.eventName || ""; $("setFont").value = S.settings.font || "Nunito Sans Expanded"; $("setStar").checked = S.settings.star !== false; $("setPresText").value = S.settings.presText || ""; $("setPresUrl").value = S.settings.presUrl || ""; var th = S.settings.theme || {}; $("thBg").value = th.bg || THEME_DEF.bg; $("thAccent").value = th.accent || THEME_DEF.accent; $("thGold").value = th.gold || THEME_DEF.gold;
    }
  }
  function adminRow(c) {
    var st = c.state, slip = c.slip;
    var r = mk("div", "arow"), th = mk("div", "thumbs");
    var pb = mk("button"); pb.type = "button"; pb.setAttribute("aria-label", "ดูรูปโปรไฟล์"); pb.appendChild(picEl(c.photoId, "รูป " + c.fullName));
    if (c.photoId) pb.addEventListener("click", function () { lightbox(c.country + " · " + c.fullName, secureBlobUrl(c.photoId), function () { savePhoto(c); }); }); else pb.style.cursor = "default";
    th.appendChild(pb);
    var sb = null;
    th.appendChild(pb); r.appendChild(th);
    var info = mk("div", "info");
    info.appendChild(mk("div", "c", c.country));
    info.appendChild(mk("div", "s", c.fullName + " · " + c.username));
    info.appendChild(mk("div", "s", "จองเมื่อ " + fmtDate(c.claimedAt)));
    if (false) info.appendChild(mk("div", "s", "สลิปส่งเมื่อ " + fmtDate(slip.uploadedAt) + (slip.amount ? " · แจ้งโอน " + baht(slip.amount) : "")));
    if (st === "rejected" && c.note) info.appendChild(mk("div", "s", "เหตุผล: " + c.note));
    var cw = mk("div"); cw.style.marginTop = "4px"; cw.appendChild(chip(st === "approved" ? "approved" : "pending")); info.appendChild(cw); r.appendChild(info);
    var acts = mk("div", "acts");
    function act(label, cls, fn) { var b = mk("button", "btn sm " + cls, label); b.type = "button"; b.addEventListener("click", fn); acts.appendChild(b); }
    if (st !== "approved") act("ยืนยัน ขึ้นทำเนียบ", "ok", function () { review(c, "approved", ""); });
    if (c.photoId) act("บันทึกรูป", "ghost", function () { savePhoto(c); });
    act("ปล่อยพื้นที่", "warn", function () { openRelease(c); });
    r.appendChild(acts); return r;
  }
  async function adminCall(path, json) {
    var r = await api(path, { method: "POST", json: json });
    if (r.status === 401) { S.admin = false; render(); setStatus("หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่", true); }
    else if (!r.ok) setStatus(r.data.message || "ไม่สำเร็จ", true);
    return r;
  }
  async function review(c, status, note) { var r = await adminCall("/api/admin/review", { slug: c.slug, status: status, note: note }); if (r.ok) await poll(); }
  function openReject(c) {
    modal(function (m) {
      m.appendChild(mk("h3", null, "สลิปไม่ผ่าน: " + c.country));
      var f = mk("div", "field"), l = mk("label", null, "เหตุผล (ผู้สมัครจะเห็น)"); l.htmlFor = "rejNote";
      var t = mk("textarea", "input"); t.id = "rejNote"; t.placeholder = "เช่น ยอดโอนไม่ครบ หรือสลิปไม่ชัด"; f.appendChild(l); f.appendChild(t); m.appendChild(f);
      var row = mk("div", "row"); row.style.justifyContent = "flex-end";
      var cancel = mk("button", "btn ghost", "ยกเลิก"); cancel.type = "button"; cancel.addEventListener("click", closeModal);
      var go = mk("button", "btn", "ยืนยันไม่ผ่าน"); go.type = "button";
      go.addEventListener("click", async function () { go.disabled = true; await review(c, "rejected", t.value.trim()); closeModal(); });
      row.appendChild(cancel); row.appendChild(go); m.appendChild(row);
    });
  }
  function openRelease(c) {
    modal(function (m) {
      m.appendChild(mk("h3", null, "ปล่อย " + c.country + " คืน?"));
      summary(m, [["ผู้จอง", c.username || ""], ["ชื่อที่ใช้ประกวด", c.fullName || ""]]);
      m.appendChild(mk("div", "lock", "พื้นที่จะกลับมาว่างให้ทุกคนเลือกได้ รูปและสลิปของผู้สมัครรายนี้จะถูกลบ ถ้าต้องการเก็บรูป ให้กด \"บันทึกรูป\" ก่อน"));
      var row = mk("div", "row"); row.style.justifyContent = "flex-end";
      var cancel = mk("button", "btn ghost", "ยกเลิก"); cancel.type = "button"; cancel.addEventListener("click", closeModal);
      var go = mk("button", "btn", "ปล่อยพื้นที่"); go.type = "button";
      go.addEventListener("click", async function () { go.disabled = true; var r = await adminCall("/api/admin/release", { slug: c.slug }); closeModal(); if (r.ok) await poll(); });
      row.appendChild(cancel); row.appendChild(go); m.appendChild(row);
    });
  }

  /* ---- content editor ---- */
  function edit(fn) {
    S.queue = S.queue.then(async function () {
      var next = JSON.parse(JSON.stringify(S.content || {})); fn(next);
      var r = await adminCall("/api/admin/content", next);
      if (r.ok) { S.content = r.data.content; render(); }
    });
    return S.queue;
  }
  async function removeAsset(id) { if (id) await api("/api/admin/image-delete", { method: "POST", json: { id: id } }); }
  async function uploadSite(files, maxDim) {
    var ids = [];
    for (var i = 0; i < files.length; i++) {
      var e = checkFile(files[i]); if (e) { setStatus(files[i].name + ": " + e, true); continue; }
      try {
        var blob = await compress(files[i], maxDim), fd = new FormData(); fd.append("file", blob, "img.webp");
        var r = await api("/api/admin/image", { method: "POST", form: fd });
        if (r.ok) ids.push(r.data.id); else setStatus(r.data.message || "อัปโหลดไม่สำเร็จ", true);
      } catch (x) { setStatus("ย่อรูปไม่สำเร็จ: " + files[i].name, true); }
    }
    return ids;
  }
  function uploadBtn(label, multiple, maxDim, onIds) {
    var lab = mk("label", "btn ghost sm", label); lab.style.cursor = "pointer";
    var inp = mk("input"); inp.type = "file"; inp.accept = "image/png,image/jpeg,image/webp"; inp.multiple = !!multiple; inp.style.display = "none";
    inp.addEventListener("change", async function () {
      if (!inp.files.length) return; var t = lab.firstChild.nodeValue; lab.firstChild.nodeValue = "กำลังอัปโหลด...";
      var ids = await uploadSite(Array.prototype.slice.call(inp.files), maxDim); lab.firstChild.nodeValue = t; inp.value = "";
      if (ids.length) await onIds(ids);
    });
    lab.appendChild(inp); return lab;
  }
  function moveBtn(label, onClick, disabled) { var b = mk("button", "btn ghost sm", label); b.type = "button"; b.disabled = !!disabled; b.addEventListener("click", onClick); return b; }
  function renderEditor() {
    var sig = JSON.stringify(S.content); if (sig === S.edSig) return; S.edSig = sig;
    var host = $("contentEd"); host.textContent = "";
    var hero = S.content.hero || [];

    var h1 = mk("div"); h1.appendChild(mk("div", "sub-h", "รูปหน้าแรก (สไลด์)")); h1.appendChild(mk("div", "hint", "ภาพแนวนอนหรือโปสเตอร์ใหญ่ เช่น ผู้ชนะปีที่แล้ว ปุ่ม \"สมัคร\" จะอยู่กลางด้านล่างของภาพ"));
    var g1 = mk("div", "edit-grid"); g1.style.marginTop = "10px";
    hero.forEach(function (it, i) {
      var c = mk("div", "ecard"), im = mk("div", "im"); im.appendChild(picEl(it.asset, "สไลด์ " + (i + 1))); c.appendChild(im);
      var r = mk("div", "row");
      r.appendChild(moveBtn("←", function () { edit(function (n) { var a = n.hero; if (i > 0) { var t = a[i - 1]; a[i - 1] = a[i]; a[i] = t; } }); }, i === 0));
      r.appendChild(moveBtn("ลบ", function () { edit(function (n) { n.hero.splice(i, 1); }).then(function () { removeAsset(it.asset); }); }));
      c.appendChild(r); g1.appendChild(c);
    });
    h1.appendChild(g1);
    var u1 = mk("div", "row"); u1.style.marginTop = "10px";
    u1.appendChild(uploadBtn("+ เพิ่มรูปหน้าแรก", true, 2400, function (ids) { return edit(function (n) { n.hero = (n.hero || []).concat(ids.map(function (id) { return { asset: id }; })); }); }));
    h1.appendChild(u1); host.appendChild(h1);

    infoEditor(host);
    guideEditor(host);
  }

  /* ---- saving, export, settings ---- */
  function safeName(s) { return String(s).replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "photo"; }
  function extOf(t) { return t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg"; }
  async function photoBlob(id) { var res = await fetch("/img/" + id, { credentials: "same-origin" }); if (!res.ok) throw new Error("http"); return res.blob(); }
  function photoFilename(c, blob) { return safeName(c.country) + "_" + safeName((c.username || "").replace(/^@/, "")) + "." + extOf(blob.type); }
  async function savePhoto(c) {
    try { var b = await photoBlob(c.photoId); saveBlob(photoFilename(c, b), b); } catch (e) { setStatus("บันทึกรูปไม่สำเร็จ", true); }
  }
  async function zipPhotos(onlyPaid, btn) {
    if (!window.JSZip) { setStatus("โหลดตัวสร้าง ZIP ไม่สำเร็จ ลองโหลดหน้าใหม่", true); return; }
    var list = S.adminList.filter(function (c) { return c.photoId && (!onlyPaid || c.state === "approved"); });
    if (!list.length) { setStatus("ยังไม่มีรูปในหมวดนี้", true); return; }
    var label = btn.textContent; btn.disabled = true;
    try {
      var zip = new window.JSZip(), used = {}, fail = 0;
      for (var i = 0; i < list.length; i++) {
        btn.textContent = "กำลังรวมรูป " + (i + 1) + "/" + list.length;
        try { var b = await photoBlob(list[i].photoId), n = photoFilename(list[i], b); if (used[n]) n = n.replace(/(\.[a-z]+)$/, "_" + list[i].slug + "$1"); used[n] = 1; zip.file(n, b); } catch (e) { fail++; }
      }
      saveBlob(onlyPaid ? "miss-moohong-photos-paid.zip" : "miss-moohong-photos.zip", await zip.generateAsync({ type: "blob" }));
      if (fail) setStatus("รวมรูปไม่ได้ " + fail + " รูป ที่เหลืออยู่ในไฟล์ ZIP แล้ว", true); else setStatus("");
    } catch (e) { setStatus("สร้าง ZIP ไม่สำเร็จ", true); }
    btn.disabled = false; btn.textContent = label;
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var rows = [["country", "continent", "username", "name_surname", "claimed_at", "payment_status", "slip_amount", "slip_at", "review_note"]];
    S.adminList.forEach(function (c) { var s = c.slip; rows.push([c.country, c.username, c.fullName, new Date(c.claimedAt).toISOString(), STATE_TH[c.state], s && s.amount != null ? s.amount : "", s ? new Date(s.uploadedAt).toISOString() : "", c.note]); });
    var data = "﻿" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n");
    saveBlob("miss-moohong-registrations.csv", new Blob([data], { type: "text/csv;charset=utf-8" }));
  }
  async function saveSettings() {
    var btn = $("setSave"), fee = "", o = fromLocalInput($("setOpensAt").value), c = fromLocalInput($("setClosesAt").value);
    $("setMsg").textContent = "";
    if (o && c && c <= o) { $("setMsg").textContent = "เวลาปิดต้องหลังเวลาเปิด"; return; }
    btn.disabled = true;
    var r = await adminCall("/api/admin/settings", { fee: fee === "" ? null : Number(fee), open: $("setOpen").checked, opensAt: o, closesAt: c, note: $("setNote").value.trim(), eventName: $("setEvent").value.trim(), font: $("setFont").value, star: $("setStar").checked, presText: $("setPresText").value.trim(), presUrl: $("setPresUrl").value.trim(), theme: { bg: $("thBg").value, accent: $("thAccent").value, gold: $("thGold").value } });
    $("setMsg").textContent = r.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ"; btn.disabled = false;
    if (r.ok) await poll();
  }

  /* ---------- ชื่อเวที (แก้ได้ทุกปี) ---------- */
  /* ---------- สีเว็บ (แก้ได้ที่แอดมิน) ---------- */
  var THEME_DEF = { bg: "#090d1e", accent: "#8ea4ff", gold: "#ecd9a0" };
  function hx(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mixc(a, b, t) { var x = hx(a), y = hx(b); return "#" + [0, 1, 2].map(function (i) { return ("0" + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join(""); }
  function lum(h) { var c = hx(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function applyTheme() {
    var t = S.settings.theme || {}, bg = t.bg || THEME_DEF.bg, ac = t.accent || THEME_DEF.accent, go = t.gold || THEME_DEF.gold;
    var sig = bg + ac + go; if (sig === S.themeSig) return; S.themeSig = sig;
    var light = lum(bg) > 0.55, fg = light ? "#000000" : "#ffffff", r = document.documentElement.style;
    r.setProperty("--bg", bg); r.setProperty("--panel", mixc(bg, fg, 0.06)); r.setProperty("--panel-2", mixc(bg, fg, 0.12)); r.setProperty("--line", mixc(bg, fg, 0.22));
    r.setProperty("--ink", light ? "#14172b" : "#eef1fb"); r.setProperty("--muted", mixc(bg, light ? "#000000" : "#ffffff", 0.6));
    r.setProperty("--accent", ac); r.setProperty("--accent-ink", lum(ac) > 0.55 ? "#0a0f2c" : "#ffffff"); r.setProperty("--gold", go);
    r.colorScheme = light ? "light" : "dark";
  }
  var STAR_D = (function () {
    var pts = [], L = [50, 7, 21, 7];
    for (var i = 0; i < 16; i++) { var r = i % 2 === 0 ? (i % 4 === 0 ? 50 : 21) : 6, a = (i * 22.5 - 90) * Math.PI / 180; pts.push((50 + r * Math.cos(a)).toFixed(1) + "," + (50 + r * Math.sin(a)).toFixed(1)); }
    return "M" + pts.join("L") + "Z";
  })();
  function starEl() {
    var ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg"); s.setAttribute("viewBox", "0 0 100 100"); s.setAttribute("class", "starsvg"); s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path"); p.setAttribute("d", STAR_D); s.appendChild(p); return s;
  }
  function fillBrand(el, name, star) {
    el.textContent = ""; var parts = name.split(" "), first = parts.shift(), rest = parts.join(" ");
    el.appendChild(document.createTextNode(first));
    if (rest) { if (star) el.appendChild(starEl()); else el.appendChild(document.createTextNode(" ")); el.appendChild(document.createTextNode(rest)); }
  }
  function fillPresented(el) {
    el.textContent = ""; var t = String(S.settings.presText || "").trim() || "Miss Moohong", u = S.settings.presUrl;
    el.appendChild(document.createTextNode("Presented by "));
    var x;
    if (u && /^https?:\/\//i.test(u)) { x = mk("a", null, t); x.href = u; x.target = "_blank"; x.rel = "noopener noreferrer"; } else x = mk("u", null, t);
    el.appendChild(x);
  }
  function applyFont() {
    var f = S.settings.font || "Nunito Sans Expanded"; if (f === S.fontSig) return; S.fontSig = f;
    var wide = f === "Nunito Sans Expanded", name = wide ? "Nunito Sans" : f;
    var fam = '"' + name + '", "Prompt", system-ui, sans-serif';
    ["brandName", "heroName"].forEach(function (id) { $(id).style.fontFamily = fam; $(id).style.fontStretch = wide ? "125%" : "normal"; $(id).style.fontWeight = wide ? "300" : ""; $(id).style.letterSpacing = wide ? "-0.102em" : ""; });
    if (!document.getElementById("fontLink")) { var l = document.createElement("link"); l.id = "fontLink"; l.rel = "stylesheet"; document.head.appendChild(l); }
    var l2 = document.getElementById("fontLink"); if (l2) l2.href = "https://fonts.googleapis.com/css2?family=" + (wide ? "Nunito+Sans:wdth,wght@75..125,200..1000" : encodeURIComponent(name).replace(/%20/g, "+") + ":wght@400;700") + "&display=swap";
  }
  function applyBrand() {
    var name = String(S.settings.eventName || "").trim() || "Miss India";
    var sig = name + "|" + (S.settings.star !== false) + "|" + (S.settings.presText || "") + "|" + (S.settings.presUrl || ""); if (sig === S.brandSig) return; S.brandSig = sig;
    var st = S.settings.star !== false; fillBrand($("brandName"), name, st); fillBrand($("heroName"), name, st); fillPresented($("presNav")); fillPresented($("presHero"));
    document.title = name; $("hero").setAttribute("aria-label", name);
    $("rosterEyebrow").textContent = "ทำเนียบ · " + name; $("regTitle").textContent = "Register Now for " + name;
    $("adminTitle").textContent = "แอดมิน " + name; $("foot").textContent = "ติดตามข่าวสารจากทีมงาน " + name;
  }

  /* ---------- รายชื่อพื้นที่ (หน้าแอดมิน) ---------- */
  function renderRegionsEd() {
    var ta = $("regText"); if (document.activeElement === ta) return;
    var sig = JSON.stringify(S.regions); if (sig === S.regSig) return; S.regSig = sig;
    ta.value = S.regions.map(function (r) { return r.name; }).join("\n"); $("regCount").textContent = S.regions.length + " พื้นที่";
  }
  async function saveRegions() {
    var names = {}; $("regText").value.split("\n").forEach(function (l) { l = l.trim().replace(/\s+/g, " ").toLowerCase(); if (l) names[l] = 1; });
    var lost = S.adminList.filter(function (c) { return !names[String(c.country).toLowerCase()]; });
    if (lost.length && !window.confirm("มีผู้สมัคร " + lost.length + " ราย อยู่ในพื้นที่ที่กำลังจะถูกลบหรือเปลี่ยนชื่อ (" + lost.slice(0, 3).map(function (c) { return c.country; }).join(", ") + (lost.length > 3 ? " ..." : "") + ") ใบสมัครเดิมยังอยู่ แต่พื้นที่นั้นจะไม่แสดงในหน้าสมัคร ทำต่อไหม")) return;
    $("regMsg").textContent = "";
    var r = await adminCall("/api/admin/regions", { text: $("regText").value });
    if (!r.ok) { $("regMsg").textContent = (r.data && r.data.message) || "ไม่สำเร็จ"; return; }
    $("regMsg").textContent = "บันทึกแล้ว"; S.regSig = ""; await poll();
  }

  /* ---------- router ---------- */
  function route() {
    var h = (location.hash || "#home").slice(1); S.view = VIEWS.indexOf(h) !== -1 ? h : "home";
    document.querySelectorAll("[data-view]").forEach(function (el) { el.hidden = el.getAttribute("data-view") !== S.view; });
    document.querySelectorAll("[data-link]").forEach(function (a) { if (a.getAttribute("data-link") === S.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    render(); window.scrollTo(0, 0);
    if (S.loaded) poll();
  }
  function render() {
    applyBrand(); applyTheme(); applyFont();
    if (S.view === "home") renderHome(); else if (S.view === "roster") renderRoster(); else if (S.view === "register") renderRegister(); else if (S.view === "admin") renderAdmin();
    renderDock();
  }
  function tick() {
    updateTimers();
    if (S.view === "home") $("heroSt").textContent = schedule().text;
    if (S.view === "register") { var sc = schedule(); $("closedNote").hidden = sc.open; $("closedNote").textContent = sc.text; renderDock(); }
  }

  $("q").addEventListener("input", function (e) { S.q = e.target.value; renderRegisterBoard(); });
  $("rQ").addEventListener("input", function (e) { S.rQ = e.target.value; renderRoster(); });
  $("aQ").addEventListener("input", function (e) { S.aQ = e.target.value; renderAdmin(); });
  $("photo").addEventListener("change", function (e) { photoFile = e.target.files[0] || null; updatePhotoUi(); setErr("f-photo", "e-photo", ""); });
  $("username").addEventListener("blur", function (e) { e.target.value = normUser(e.target.value); });
  $("goBtn").addEventListener("click", function () { setStatus(""); var v = validate(); if (v) openConfirm(v); });
  $("csvBtn").addEventListener("click", exportCsv);
  $("zipAll").addEventListener("click", function (e) { zipPhotos(false, e.currentTarget); });
  $("zipPaid").addEventListener("click", function (e) { zipPhotos(true, e.currentTarget); });
  $("setSave").addEventListener("click", saveSettings);
  $("regSave").addEventListener("click", saveRegions);
  $("thReset").addEventListener("click", function () { $("thBg").value = THEME_DEF.bg; $("thAccent").value = THEME_DEF.accent; $("thGold").value = THEME_DEF.gold; });
  ["thBg", "thAccent", "thGold"].forEach(function (id) { $(id).addEventListener("input", function () { S.settings.theme = { bg: $("thBg").value, accent: $("thAccent").value, gold: $("thGold").value }; applyTheme(); }); });
  $("gateBtn").addEventListener("click", gateSubmit);
  $("gateCode").addEventListener("keydown", function (e) { if (e.key === "Enter") gateSubmit(); });
  $("logoutBtn").addEventListener("click", logout);
  window.addEventListener("hashchange", route);

  renderRules($("rulesReg")); route();
  setInterval(tick, 1000);
  poll();
})();
