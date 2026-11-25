/* Derya 🌸 — regl takip uygulaması
 * Tüm veriler sadece telefonda saklanır (Android köprüsü → SharedPreferences,
 * tarayıcıda test ederken localStorage). İnternet bağlantısı kullanılmaz. */
(function () {
  'use strict';

  // ================= Yardımcılar =================
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NATIVE = typeof window.Android !== 'undefined';
  var DAY = 86400000;
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var AY_K = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var GUN_K = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
  var HAFTA = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mkDn(y, m, d) { return Math.round(Date.UTC(y, m, d) / DAY); }
  function todayDn() { var n = new Date(); return mkDn(n.getFullYear(), n.getMonth(), n.getDate()); }
  function parts(n) { var d = new Date(n * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() }; }
  function keyOf(n) { var p = parts(n); return p.y + '-' + pad(p.m + 1) + '-' + pad(p.d); }
  function dnOf(k) { var a = k.split('-'); return mkDn(+a[0], +a[1] - 1, +a[2]); }
  function fmtShort(n) { var p = parts(n); return p.d + ' ' + AY_K[p.m]; }
  function fmtLong(n) { var p = parts(n); return p.d + ' ' + AYLAR[p.m]; }
  function fmtFull(n) { var p = parts(n); return p.d + ' ' + AYLAR[p.m] + ' ' + GUNLER[p.wd]; }
  function fmtRange(a, b) {
    var pa = parts(a), pb = parts(b);
    if (a === b) return pa.d + ' ' + AY_K[pa.m];
    return pa.m === pb.m ? pa.d + '–' + pb.d + ' ' + AY_K[pa.m] : pa.d + ' ' + AY_K[pa.m] + ' – ' + pb.d + ' ' + AY_K[pb.m];
  }
  function rel(n) { return n === 0 ? 'bugün' : n === 1 ? 'yarın' : n === -1 ? 'dün' : n > 0 ? n + ' gün sonra' : (-n) + ' gün önce'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function haptic() { try { if (NATIVE) Android.haptic(); else if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

  // ================= Sabitler =================
  var THEMES = {
    pembe:   { name: 'Pembe Rüya', emoji: '💗', parts: ['💗', '💕', '🌸', '✨'], bar: '#fff0f5', light: true, sw: ['#ffc2d6', '#ff4f8b'] },
    lavanta: { name: 'Lavanta',    emoji: '🦋', parts: ['🦋', '💜', '✨', '🌷'], bar: '#f6f0ff', light: true, sw: ['#dccbff', '#8b5cf6'] },
    seftali: { name: 'Şeftali',    emoji: '🍑', parts: ['🌸', '🍑', '🌼', '✨'], bar: '#fff5ee', light: true, sw: ['#ffd0b8', '#ff7a59'] },
    nane:    { name: 'Nane',       emoji: '🍃', parts: ['🍃', '🌿', '🌼', '✨'], bar: '#effcf7', light: true, sw: ['#b6f5d8', '#10b981'] },
    gece:    { name: 'Gece',       emoji: '🌙', parts: ['⭐', '✨', '🌙', '💫'], bar: '#16122b', light: false, sw: ['#3b2470', '#ff6fa5'] }
  };
  var FLOWS = [
    { id: 'leke', e: '🩹', l: 'Lekelenme' }, { id: 'hafif', e: '💧', l: 'Hafif' },
    { id: 'orta', e: '💧💧', l: 'Orta' }, { id: 'yogun', e: '💧💧💧', l: 'Yoğun' }
  ];
  var MOODS = [
    { id: 'mutlu', e: '😊', l: 'Mutlu' }, { id: 'asik', e: '🥰', l: 'Aşık' }, { id: 'sakin', e: '😌', l: 'Sakin' },
    { id: 'enerjik', e: '⚡', l: 'Enerjik' }, { id: 'huzunlu', e: '😢', l: 'Hüzünlü' }, { id: 'sinirli', e: '😤', l: 'Sinirli' },
    { id: 'kaygili', e: '😰', l: 'Kaygılı' }, { id: 'yorgun', e: '😴', l: 'Yorgun' }
  ];
  var QUICK_MOODS = ['mutlu', 'asik', 'sakin', 'huzunlu', 'sinirli', 'yorgun'];
  var SYMPTOMS = [
    { id: 'kramp', e: '🌀', l: 'Kramp' }, { id: 'basagrisi', e: '🤕', l: 'Baş ağrısı' }, { id: 'siskinlik', e: '🎈', l: 'Şişkinlik' },
    { id: 'sivilce', e: '🔴', l: 'Sivilce' }, { id: 'gogus', e: '💢', l: 'Hassas göğüs' }, { id: 'sirt', e: '🦴', l: 'Sırt ağrısı' },
    { id: 'bulanti', e: '🤢', l: 'Bulantı' }, { id: 'tatli', e: '🍫', l: 'Tatlı krizi' }, { id: 'uykusuz', e: '🌙', l: 'Uykusuzluk' },
    { id: 'halsiz', e: '🥱', l: 'Halsizlik' }
  ];
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  var PHASES = {
    regl:       { name: 'Regl dönemi', e: '💧' },
    folikuler:  { name: 'Foliküler evre', e: '🌱' },
    dogurgan:   { name: 'Doğurgan dönem', e: '🌷' },
    yumurtlama: { name: 'Yumurtlama günü', e: '✨' },
    luteal:     { name: 'Luteal evre', e: '🌙' },
    pms:        { name: 'PMS dönemi', e: '🍫' },
    gecikme:    { name: 'Gecikme', e: '⏳' },
    yok:        { name: 'Başlayalım', e: '🌸' }
  };
  var TIPS = {
    regl: ['Sıcak su torbası karın krampları için birebir 🔥', 'Bol su iç; papatya ya da ıhlamur çayı da iyi gelir 🍵',
      'Bitter çikolata hem moral hem magnezyum demek 🍫', 'Bugün kendine nazik ol, dinlenmek de bir başarı 🛋️',
      'Hafif yürüyüş ve esneme krampları azaltabilir 🧘‍♀️', 'Demir için ıspanak, mercimek ve kırmızı et iyi seçenekler 🥬'],
    folikuler: ['Enerjin yükseliyor! Yeni şeylere başlamak için harika bir zaman ✨', 'Spor için ideal dönem, vücudun hazır 💪',
      'Cildin parlıyor olabilir, tadını çıkar 🌟', 'Sosyal planlar yap, ışıl ışılsın 💃'],
    dogurgan: ['Doğurganlığın en yüksek olduğu günlerdesin 🌷', 'Enerjin ve özgüvenin zirvede olabilir 💖',
      'Bol su içmeyi unutma, cildin teşekkür edecek 💧'],
    yumurtlama: ['Bugün tahmini yumurtlama günün ✨', 'Hafif bir yan ağrısı hissedebilirsin, bu normal 💗',
      'Enerjinin zirvesindesin, harika bir gün geçir 🌞'],
    luteal: ['Kompleks karbonhidratlar ve muz iyi gelir 🍌', 'Uykuna özen göster, erken yatmak iyi gelecek 😴',
      'Yoga ve hafif egzersizler ruh halini dengeler 🧘‍♀️', 'Tatlı krizine karşı kuru meyve ve fındık yanında olsun 🥜'],
    pms: ['Regl yaklaşıyor; çantana ped koymayı unutma 👜', 'Tuzu ve kafeini azaltmak şişkinliğe iyi gelir 🧂',
      'Duygusal hissedebilirsin, bu çok normal. Kendine sarıl 🤗', 'Sıcak bir duş ve sevdiğin bir dizi iyi gelir ✨'],
    gecikme: ['Stres, uyku ve beslenme döngüyü etkileyebilir 🌙', 'Gecikme birkaç günü geçerse bir doktora danışmak iyi olur 🩺',
      'Başladığında "Regl başladı"ya dokunmayı unutma 💧'],
    yok: ['Regl başladığında ana sayfadaki butona dokun, gerisini ben hallederim 💗',
      'Takvimden geçmiş regl günlerini de işaretleyebilirsin 📅']
  };

  // ================= Veri =================
  function defaults() {
    return {
      v: 1, name: 'Derya', note: 'Bugün de çok güzelsin. Seni çok seviyorum 💗', theme: 'pembe',
      cycleLen: 28, periodLen: 5, onboarded: false, ongoing: null, endedOn: null, days: {},
      notif: { on: true, before: 2, time: '10:00', fertile: false }
    };
  }
  function normalize(d) {
    var base = defaults();
    if (!d || typeof d !== 'object') return base;
    var out = {};
    for (var k in base) out[k] = (d[k] !== undefined ? d[k] : base[k]);
    out.notif = Object.assign(base.notif, d.notif || {});
    out.days = (d.days && typeof d.days === 'object') ? d.days : {};
    if (!THEMES[out.theme]) out.theme = 'pembe';
    out.cycleLen = clamp(+out.cycleLen || 28, 18, 60);
    out.periodLen = clamp(+out.periodLen || 5, 1, 12);
    return out;
  }
  function loadData() {
    try {
      var s = NATIVE ? Android.load() : localStorage.getItem('derya-data');
      if (s) return normalize(JSON.parse(s));
    } catch (e) {}
    return defaults();
  }
  var S = loadData();
  var LOGO = ($('#splash .logo') || { outerHTML: '' }).outerHTML.replace('class="logo"', '');
  var remTimer = null;
  function save() {
    var s = JSON.stringify(S);
    try { if (NATIVE) Android.save(s); else localStorage.setItem('derya-data', s); } catch (e) {}
    clearTimeout(remTimer);
    remTimer = setTimeout(syncReminders, 500);
  }

  function rec(k) { return S.days[k] || (S.days[k] = {}); }
  function tidy(k) {
    var r = S.days[k]; if (!r) return;
    if (!r.p) { delete r.p; delete r.flow; }
    if (r.moods && !r.moods.length) delete r.moods;
    if (r.sym && !r.sym.length) delete r.sym;
    if (!r.note) delete r.note;
    if (!Object.keys(r).length) delete S.days[k];
  }
  function isP(n) { var r = S.days[keyOf(n)]; return !!(r && r.p); }
  function setP(n, on) { var k = keyOf(n); if (on) rec(k).p = 1; else if (S.days[k]) delete S.days[k].p; tidy(k); }
  function hasLog(r) { return !!(r && ((r.moods && r.moods.length) || (r.sym && r.sym.length) || r.note || r.flow)); }

  // "Regl başladı" dendiyse, bitti denene kadar günleri kendiliğinden işaretle (en fazla 10 gün).
  function tickOngoing() {
    var o = S.ongoing; if (!o) return false;
    var t = todayDn(), start = dnOf(o.start);
    var filled = o.filled ? dnOf(o.filled) : start - 1;
    var cap = start + 9, upto = Math.min(t, cap), changed = false;
    for (var n = Math.max(filled + 1, start); n <= upto; n++) { setP(n, true); changed = true; }
    if (upto > filled) o.filled = keyOf(upto);
    if (t > cap) { S.ongoing = null; changed = true; }
    return changed;
  }

  // ================= Hesaplama =================
  function compute() {
    var t = todayDn();
    var pdays = Object.keys(S.days).filter(function (k) { return S.days[k].p; })
      .map(dnOf).filter(function (n) { return n <= t; }).sort(function (a, b) { return a - b; });
    var periods = [];
    pdays.forEach(function (n) {
      var l = periods[periods.length - 1];
      if (l && n - l.e <= 2) l.e = n; else periods.push({ s: n, e: n });
    });
    periods.forEach(function (p) { p.len = p.e - p.s + 1; });
    var cur = periods.length ? periods[periods.length - 1] : null;
    var todayMarked = isP(t);
    var inPeriod = !!S.ongoing || todayMarked;

    var cycles = [];
    for (var i = 0; i < periods.length - 1; i++) cycles.push({ s: periods[i].s, len: periods[i + 1].s - periods[i].s, plen: periods[i].len });
    var valid = cycles.filter(function (c) { return c.len >= 18 && c.len <= 60; }).slice(-6);
    var avgCycle = valid.length ? Math.round(valid.reduce(function (a, c) { return a + c.len; }, 0) / valid.length) : S.cycleLen;
    var done = periods.filter(function (p) { return !(p === cur && inPeriod) && p.len >= 2 && p.len <= 12; }).slice(-6);
    var avgPeriod = done.length ? Math.round(done.reduce(function (a, p) { return a + p.len; }, 0) / done.length) : S.periodLen;
    var sd = valid.length >= 2 ? Math.sqrt(valid.reduce(function (a, c) { return a + Math.pow(c.len - avgCycle, 2); }, 0) / valid.length) : null;

    var R = { t: t, periods: periods, cycles: cycles, valid: valid, cur: cur, inPeriod: inPeriod, todayMarked: todayMarked,
      L: avgCycle, P: avgPeriod, sd: sd, has: !!cur, pred: {}, fert: {}, ovu: {}, predStarts: [] };
    if (!cur) { R.phase = 'yok'; return R; }

    var L = avgCycle, P = avgPeriod;
    R.ovuOf = function (s) { return Math.max(s + L - 14, s + P + 1); };
    R.lastStart = cur.s;
    R.nextStart = cur.s + L;
    R.cycleDay = t - cur.s + 1;
    R.late = (!inPeriod && t > R.nextStart) ? t - R.nextStart : 0;
    if (inPeriod) R.periodDay = t - cur.s + 1;

    var base = R.late ? t : R.nextStart;
    for (var k = 0; k < 13; k++) {
      var s = base + k * L; R.predStarts.push(s);
      for (var j = 0; j < P; j++) if (!isP(s + j) && s + j >= t) R.pred[s + j] = 1;
    }
    R.cycleStarts = R.late ? R.predStarts.slice() : [cur.s].concat(R.predStarts);
    R.cycleStarts.forEach(function (cs) {
      var o = R.ovuOf(cs); R.ovu[o] = 1;
      for (var n = o - 5; n <= o + 1; n++) if (!isP(n)) R.fert[n] = 1;
    });
    R.curOvu = R.late ? null : R.ovuOf(cur.s);
    R.nextOvu = null;
    for (var q = 0; q < R.cycleStarts.length; q++) { var ov = R.ovuOf(R.cycleStarts[q]); if (ov + 1 >= t) { R.nextOvu = ov; break; } }

    if (inPeriod) R.phase = 'regl';
    else if (R.late) R.phase = 'gecikme';
    else if (t === R.curOvu) R.phase = 'yumurtlama';
    else if (t >= R.curOvu - 5 && t <= R.curOvu + 1) R.phase = 'dogurgan';
    else if (t < R.curOvu - 5) R.phase = 'folikuler';
    else if (R.nextStart - t <= 5) R.phase = 'pms';
    else R.phase = 'luteal';
    return R;
  }

  function dayClass(n, R) {
    var c = [];
    if (isP(n)) c.push('period');
    else if (R.pred[n]) c.push('pred');
    else if (R.ovu[n] && !isP(n)) c.push('ovu');
    else if (R.fert[n]) c.push('fertile');
    if (n === R.t) c.push('today');
    if (n > R.t) c.push('future');
    if (hasLog(S.days[keyOf(n)])) c.push('log');
    return c.join(' ');
  }

  function dayInfo(n, R) {
    if (isP(n)) {
      var g = null; R.periods.forEach(function (p) { if (n >= p.s && n <= p.e) g = p; });
      return '💧 Regl günü' + (g ? ' · ' + (n - g.s + 1) + '. gün' : '');
    }
    if (!R.has) return n === R.t ? '🌸 Bugün' : '';
    if (R.pred[n]) return '🔮 Tahmini regl';
    if (R.ovu[n]) return '✨ Tahmini yumurtlama günü';
    if (R.fert[n]) return '🌷 Doğurgan dönem (tahmini)';
    if (n >= R.lastStart) {
      var d = n - R.lastStart + 1;
      if (!R.late && d <= R.L) return '🔄 Döngünün ' + d + '. günü';
    }
    return '';
  }

  // ================= Arka plan parçacıkları =================
  var particleTimer = null;
  function spawnParticle() {
    if (document.hidden || REDUCE) return;
    var box = $('#particles'); if (!box || box.childElementCount > 11) return;
    var th = THEMES[S.theme] || THEMES.pembe;
    var el = document.createElement('div');
    el.className = 'particle';
    var size = rand(14, 30);
    el.style.left = rand(2, 94) + 'vw';
    el.style.fontSize = size + 'px';
    el.style.setProperty('--d', rand(13, 22).toFixed(1) + 's');
    el.style.setProperty('--sw', rand(2.2, 4).toFixed(1) + 's');
    el.style.setProperty('--x', rand(10, 34).toFixed(0) + 'px');
    el.style.setProperty('--r', rand(-90, 90).toFixed(0) + 'deg');
    el.style.setProperty('--o', (S.theme === 'gece' ? rand(.45, .85) : rand(.3, .6)).toFixed(2));
    el.innerHTML = '<span>' + pick(th.parts) + '</span>';
    el.addEventListener('animationend', function (e) { if (e.target === el) el.remove(); });
    box.appendChild(el);
  }
  function startParticles() {
    if (REDUCE) return;
    for (var i = 0; i < 4; i++) setTimeout(spawnParticle, i * 500);
    clearInterval(particleTimer);
    particleTimer = setInterval(spawnParticle, 1700);
  }

  // ================= Efektler =================
  function burst(x, y, emojis, count) {
    if (REDUCE) return;
    var fx = $('#fx'); count = count || 22;
    for (var i = 0; i < count; i++) {
      (function () {
        var el = document.createElement('span');
        el.className = 'fx-p'; el.textContent = pick(emojis);
        el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.fontSize = rand(16, 30) + 'px';
        fx.appendChild(el);
        var a = rand(0, Math.PI * 2), d = rand(70, 170);
        var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 70;
        var anim = el.animate([
          { transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1.1) rotate(' + rand(-50, 50) + 'deg)', opacity: 1, offset: .55 },
          { transform: 'translate(calc(-50% + ' + dx * 1.15 + 'px), calc(-50% + ' + (dy + 110) + 'px)) scale(.7) rotate(' + rand(-90, 90) + 'deg)', opacity: 0 }
        ], { duration: rand(1100, 1700), easing: 'cubic-bezier(.2,.8,.3,1)' });
        anim.onfinish = function () { el.remove(); };
      })();
    }
  }
  function rain(emojis, count) {
    if (REDUCE) return;
    var fx = $('#fx'); count = count || 36;
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var el = document.createElement('span');
          el.className = 'fx-p'; el.textContent = pick(emojis);
          el.style.left = rand(0, 96) + 'vw'; el.style.top = '-40px'; el.style.fontSize = rand(18, 36) + 'px';
          fx.appendChild(el);
          var anim = el.animate([
            { transform: 'translateY(0) rotate(0)', opacity: 1 },
            { transform: 'translateY(' + (innerHeight + 80) + 'px) rotate(' + rand(-200, 200) + 'deg)', opacity: .8 }
          ], { duration: rand(2200, 3800), easing: 'cubic-bezier(.4,.1,.6,1)' });
          anim.onfinish = function () { el.remove(); };
        }, i * 70);
      })(i);
    }
  }
  function burstFrom(el, emojis, count) {
    var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    burst(r.left + r.width / 2, r.top + r.height / 2, emojis, count);
  }
  function countUp(root) {
    $$('[data-count]', root).forEach(function (el) {
      var to = +el.getAttribute('data-count'); if (REDUCE || !isFinite(to) || to <= 0) { el.textContent = el.getAttribute('data-count'); return; }
      var t0 = performance.now(), dur = 1000;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2300);
  }

  // ================= Tema =================
  function setBars() {
    var th = THEMES[S.theme] || THEMES.pembe;
    try { if (NATIVE) Android.setBars(th.bar, th.light); } catch (e) {}
  }
  function applyTheme(id, ev) {
    if (!THEMES[id]) return;
    var swap = function () {
      document.body.className = document.body.className.replace(/theme-\S+/g, '').trim() + ' theme-' + id;
      S.theme = id; save(); setBars();
      rerender(false);
    };
    if (document.startViewTransition && !REDUCE) {
      var x = ev && ev.clientX != null ? ev.clientX : innerWidth / 2;
      var y = ev && ev.clientY != null ? ev.clientY : innerHeight / 3;
      var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(swap);
      vt.ready.then(function () {
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
    } else swap();
    burst(ev && ev.clientX != null ? ev.clientX : innerWidth / 2, ev && ev.clientY != null ? ev.clientY : innerHeight / 3, THEMES[id].parts, 16);
  }
  function themesHtml() {
    return '<div class="themes">' + Object.keys(THEMES).map(function (id) {
      var th = THEMES[id];
      return '<button class="theme-opt ' + (S.theme === id ? 'on' : '') + '" data-act="theme" data-id="' + id + '">' +
        '<span class="swatch" style="background:linear-gradient(135deg,' + th.sw[0] + ',' + th.sw[1] + ')">' + th.emoji + '</span>' + th.name + '</button>';
    }).join('') + '</div>';
  }

  // ================= Sekmeler =================
  var TABS = ['home', 'cal', 'stats', 'settings'];
  var current = 'home';
  function showTab(name, anim) {
    if (TABS.indexOf(name) < 0) return;
    var changed = current !== name;
    current = name;
    $$('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
    var tb = $('.tab[data-tab="' + name + '"]');
    if (tb && changed) { tb.classList.remove('bounce'); void tb.offsetWidth; tb.classList.add('bounce'); }
    $('#tabbar .ind').style.transform = 'translateX(' + (TABS.indexOf(name) * 100) + '%)';
    $$('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-' + name); });
    $('#app').scrollTop = 0;
    render(name, anim !== false);
  }
  function render(name, anim) {
    var page = $('#page-' + name);
    page.classList.toggle('no-anim', !anim);
    if (name === 'home') renderHome(page);
    else if (name === 'cal') renderCal(page);
    else if (name === 'stats') renderStats(page);
    else if (name === 'settings') renderSettings(page);
    if (anim) countUp(page); else $$('[data-count]', page).forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }
  function rerender(anim) { render(current, !!anim); }

  // ================= Ana sayfa =================
  var tipShift = 0;
  function ringSvg(R) {
    var C = 2 * Math.PI * 120, arcs = '', ticks = '', knob = '', ovuDot = '', level = 0.3;
    function arc(f0, f1, cls) {
      f0 = clamp(f0, 0, 1); f1 = clamp(f1, 0, 1);
      var len = Math.max(0.5, (f1 - f0) * C - 0.5);
      return '<circle class="arc ' + cls + '" cx="150" cy="150" r="120" style="--c:' + C.toFixed(1) + ';stroke-dasharray:' + len.toFixed(1) + ' ' + C.toFixed(1) + ';stroke-dashoffset:' + (-f0 * C).toFixed(1) + '"/>';
    }
    function pt(f, r) { var a = f * Math.PI * 2; return { x: 150 + Math.sin(a) * r, y: 150 - Math.cos(a) * r }; }
    if (R.has) {
      var L = R.L;
      for (var i = 0; i < L; i++) { var p = pt((i + 0.5) / L, 120); ticks += '<circle class="tick" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="1.7"/>'; }
      if (R.late) {
        arcs += arc(0, 1, 'late');
        level = 1;
      } else {
        var pl = R.inPeriod ? Math.max(R.periodDay, R.P) : R.cur.len;
        var fs = (R.curOvu - 5 - R.lastStart) / L, fe = (R.curOvu + 2 - R.lastStart) / L;
        arcs += arc(fs + 0.004, fe - 0.004, 'fertile') + arc(0.004, pl / L - 0.004, 'period');
        var op = pt((R.curOvu - R.lastStart + 0.5) / L, 120);
        ovuDot = '<circle class="ovu-dot" cx="' + op.x.toFixed(1) + '" cy="' + op.y.toFixed(1) + '" r="6"/>';
        level = clamp(R.cycleDay / L, 0.06, 1);
      }
      var deg = (clamp((R.cycleDay - 0.5) / L, 0, 1) * 360).toFixed(1);
      knob = '<g class="knob" style="--a:' + deg + 'deg;transform:rotate(' + deg + 'deg)"><circle class="halo" cx="150" cy="30" r="13"/><circle class="k" cx="150" cy="30" r="13"/></g>';
    }
    var y = (248 - level * 196).toFixed(1);
    var w = '';
    for (var x = 0; x < 600; x += 100) w += 'q25,-9 50,0 t50,0 ';
    var wave = 'M0,0 ' + w + 'L600,220 L0,220 Z';
    return '<svg viewBox="0 0 300 300" aria-hidden="true"><defs>' +
      '<clipPath id="rg-clip"><circle cx="150" cy="150" r="98"/></clipPath>' +
      '<linearGradient id="rg-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--primary2);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--primary);stop-opacity:.22"/></linearGradient>' +
      '</defs>' +
      '<circle class="inner" cx="150" cy="150" r="100"/>' +
      '<g clip-path="url(#rg-clip)"><g class="water" id="water" style="transform:translateY(248px)" data-y="' + y + '">' +
      '<g transform="translate(-30,-5)"><path class="wave w2" d="' + wave + '" fill="var(--primary2)" fill-opacity=".2"/></g>' +
      '<path class="wave" d="' + wave + '" fill="url(#rg-w)"/></g></g>' +
      '<circle class="track" cx="150" cy="150" r="120"/>' +
      '<g transform="rotate(-90 150 150)">' + arcs + '</g>' + ticks + ovuDot + knob + '</svg>';
  }
  function ringCenter(R) {
    var lbl, big, sub, word = false;
    if (!R.has) { lbl = 'Hoş geldin'; big = '🌸'; sub = 'Regl başlayınca dokun'; word = true; }
    else if (R.inPeriod) { lbl = 'Regl'; big = '<span data-count="' + R.periodDay + '">' + R.periodDay + '</span>.'; sub = 'gün 💧'; }
    else if (R.late) { lbl = 'Regl'; big = '<span data-count="' + R.late + '">' + R.late + '</span>'; sub = 'gün gecikti'; }
    else {
      var left = R.nextStart - R.t;
      if (left <= 0) { lbl = 'Regl'; big = 'Bugün'; sub = 'başlayabilir 🌸'; word = true; }
      else { lbl = 'Regline'; big = '<span data-count="' + left + '">' + left + '</span>'; sub = 'gün kaldı'; }
    }
    return '<div class="ring-center"><div class="lbl">' + lbl + '</div><div class="big ' + (word ? 'word' : '') + '">' + big + '</div><div class="sub">' + sub + '</div></div>';
  }
  function actionBtn(R) {
    var tk = keyOf(R.t);
    if (S.ongoing) return '<button class="btn btn-primary pulse" data-act="end">✨ Regl bitti</button>';
    if (R.todayMarked && S.endedOn === tk) return '<button class="btn btn-ghost" data-act="tab" data-tab="cal">📅 Takvimde düzenle</button><div class="ring-note">Bugün son gün olarak kaydedildi, geçmiş olsun 🌸</div>';
    if (R.todayMarked) return '<button class="btn btn-primary pulse" data-act="end">✨ Regl bitti</button>';
    return '<button class="btn btn-primary pulse" data-act="start">💧 Regl başladı</button>';
  }
  function weekStrip(R) {
    var h = '<div class="week anim" style="--i:1">';
    for (var n = R.t - 3; n <= R.t + 3; n++) {
      var p = parts(n);
      h += '<button class="wd ' + dayClass(n, R) + '" data-act="day" data-n="' + n + '"><small>' + (n === R.t ? 'Bugün' : GUN_K[p.wd]) + '</small><span class="n">' + p.d + '</span></button>';
    }
    return h + '</div>';
  }
  function infoCards(R) {
    if (!R.has) return '';
    var c1, c2, c3, c4;
    if (R.inPeriod) {
      var endN = R.cur.s + Math.max(R.P, R.periodDay) - 1;
      c1 = info('🌸', 'Tahmini bitiş', fmtShort(endN), endN >= R.t ? rel(endN - R.t) : 'her an');
    } else if (R.late) c1 = info('⏳', 'Sonraki regl', 'Gecikti', R.late + ' gün');
    else c1 = info('💧', 'Sonraki regl', fmtShort(R.nextStart), rel(R.nextStart - R.t));
    c2 = R.nextOvu != null ? info('🌷', 'Doğurgan dönem', fmtRange(R.nextOvu - 5, R.nextOvu + 1), 'Yumurtlama ' + fmtShort(R.nextOvu)) : info('🌷', 'Doğurgan dönem', '—', '');
    c3 = info('🔄', 'Döngü günü', R.cycleDay + '. gün', R.L + ' günlük döngü');
    c4 = info('📏', 'Ortalama regl', R.P + ' gün', R.valid.length ? R.valid.length + ' döngüden' : 'başlangıç değeri');
    return '<div class="grid2">' + [c1, c2, c3, c4].map(function (c, i) { return c.replace('class="info"', 'class="info anim" style="--i:' + (3 + i * 0.5) + '"'); }).join('') + '</div>';
  }
  function info(ic, t, v, s) { return '<div class="info"><div class="ic">' + ic + '</div><div class="t">' + t + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>'; }
  function moodCard(R) {
    var r = S.days[keyOf(R.t)] || {};
    var moods = r.moods || [];
    var tags = [];
    if (r.flow) { var f = byId(FLOWS, r.flow); if (f) tags.push(f.e + ' ' + f.l); }
    (r.sym || []).forEach(function (id) { var s = byId(SYMPTOMS, id); if (s) tags.push(s.e + ' ' + s.l); });
    return '<section class="card anim" style="--i:6"><div class="card-title">Bugün nasıl hissediyorsun? <small>' + (moods.length ? moods.length + ' seçili' : '') + '</small></div>' +
      '<div class="moods">' + QUICK_MOODS.map(function (id) {
        var m = byId(MOODS, id);
        return '<button class="mood ' + (moods.indexOf(id) >= 0 ? 'on' : '') + '" data-act="qmood" data-id="' + id + '"><span class="e">' + m.e + '</span>' + m.l + '</button>';
      }).join('') + '</div>' +
      (tags.length || r.note ? '<div class="today-tags">' + tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + (r.note ? '<span class="tag">📝 ' + esc(r.note.slice(0, 40)) + (r.note.length > 40 ? '…' : '') + '</span>' : '') + '</div>' : '') +
      '<button class="link-btn" data-act="day" data-n="' + R.t + '">+ Belirti, akış ve not ekle</button></section>';
  }
  function tipCard(R) {
    var list = TIPS[R.phase] || TIPS.yok;
    var tip = list[(R.t + tipShift) % list.length];
    return '<section class="card anim" style="--i:7" data-act="tip"><div class="tip"><div class="ti">' + PHASES[R.phase].e + '</div>' +
      '<div class="tip-body"><div class="tt">Günün önerisi · dokun, değişsin</div><div class="tx">' + tip + '</div></div></div></section>';
  }
  function loveCard() {
    if (!S.note || !S.note.trim()) return '';
    return '<div class="love anim" style="--i:8" data-act="love"><div class="love-inner">' +
      '<div class="love-face love-front"><span class="env">💌</span><div><b>Sana bir not var!</b><small>Açmak için dokun</small></div></div>' +
      '<div class="love-face love-back">' + esc(S.note) + '</div></div></div>';
  }
  function renderHome(page) {
    var R = compute(), p = parts(R.t), ph = PHASES[R.phase];
    var pill = R.has ? ph.e + ' ' + ph.name + (R.inPeriod ? ' · ' + R.periodDay + '. gün' : (!R.late ? ' · ' + R.cycleDay + '. gün' : '')) : ph.e + ' Henüz kayıt yok';
    page.innerHTML =
      '<header class="hello anim" style="--i:0"><div><h1><span data-act="name">Merhaba ' + esc(S.name) + '</span> <span class="wave-hand">👋</span></h1>' +
      '<div class="date">' + p.d + ' ' + AYLAR[p.m] + ', ' + GUNLER[p.wd] + '</div></div>' +
      '<button class="icon-btn" data-act="themes" aria-label="Tema">🎨</button></header>' +
      weekStrip(R) +
      '<section class="card ring-card anim" style="--i:2"><div class="ring-wrap">' + ringSvg(R) + ringCenter(R) + '</div>' +
      '<div class="phase-pill"><span class="dot"></span>' + pill + '</div><br>' + actionBtn(R) + '</section>' +
      infoCards(R) + moodCard(R) + tipCard(R) + loveCard() +
      '<p class="disclaimer anim" style="--i:9">Tahminler ortalamalara dayanır; doğum kontrolü yöntemi olarak kullanılmamalıdır. 🔒 Veriler sadece bu telefonda.</p>';
    var water = $('#water', page);
    if (water) {
      var y = water.getAttribute('data-y');
      if (page.classList.contains('no-anim')) water.style.transition = 'none';
      requestAnimationFrame(function () { requestAnimationFrame(function () { water.style.transform = 'translateY(' + y + 'px)'; }); });
    }
  }

  // ================= Takvim =================
  var calView = (function () { var p = parts(todayDn()); return { y: p.y, m: p.m }; })();
  var editMode = false;
  function monthCells(v, R, opts) {
    opts = opts || {};
    var first = mkDn(v.y, v.m, 1), wdFirst = (parts(first).wd + 6) % 7, start = first - wdFirst;
    var dim = new Date(Date.UTC(v.y, v.m + 1, 0)).getUTCDate();
    var total = Math.ceil((wdFirst + dim) / 7) * 7, h = '';
    for (var i = 0; i < total; i++) {
      var n = start + i, p = parts(n), out = p.m !== v.m;
      var cls = 'cell ' + (out ? 'out ' : '');
      if (opts.picker) {
        cls += (n > opts.max ? 'dis ' : '') + (n === opts.sel ? 'sel ' : '') + (isP(n) ? 'period ' : '') + (n === R.t ? 'today' : '');
      } else cls += dayClass(n, R);
      h += '<button class="' + cls + '" style="--k:' + i + '" data-act="' + (opts.act || 'cell') + '" data-n="' + n + '"><span class="n">' + p.d + '</span></button>';
    }
    return h;
  }
  function monthEvents(v, R) {
    var first = mkDn(v.y, v.m, 1), last = mkDn(v.y, v.m + 1, 0), ev = [];
    R.periods.forEach(function (p) { if (p.e >= first && p.s <= last) ev.push({ n: p.s, i: '💧', t: 'Regl', s: fmtRange(p.s, p.e) + ' · ' + p.len + ' gün' }); });
    if (R.has) {
      R.predStarts.forEach(function (s) {
        var e = s + R.P - 1;
        if (e >= first && s <= last && s >= R.t) ev.push({ n: s, i: '🔮', t: 'Tahmini regl', s: fmtRange(s, e) });
      });
      R.cycleStarts.forEach(function (cs) {
        var o = R.ovuOf(cs);
        if (o + 1 >= first && o - 5 <= last && o + 1 >= R.t - 40) ev.push({ n: o - 5, i: '🌷', t: 'Doğurgan dönem', s: fmtRange(o - 5, o + 1) + ' · yumurtlama ' + fmtShort(o) });
      });
    }
    ev.sort(function (a, b) { return a.n - b.n; });
    return ev;
  }
  function renderCal(page, slide) {
    var R = compute(), v = calView, tp = parts(R.t);
    var isCur = v.y === tp.y && v.m === tp.m;
    var ev = monthEvents(v, R);
    page.innerHTML =
      '<div class="page-title anim" style="--i:0">Takvim <button class="btn btn-sm ' + (editMode ? 'btn-primary' : 'btn-ghost') + '" data-act="edit">' + (editMode ? '✓ Bitti' : '✏️ Regl günlerini düzenle') + '</button></div>' +
      (editMode ? '<div class="edit-banner">💧 Regl olan günlere dokunarak işaretle ya da kaldır.</div>' : '') +
      '<section class="card anim ' + (editMode ? 'edit-mode' : '') + '" style="--i:1" id="calCard">' +
      '<div class="cal-nav"><button class="nav-btn" data-act="month" data-d="-1">‹</button>' +
      '<h2 data-act="month" data-d="0">' + AYLAR[v.m] + '<small>' + v.y + '</small></h2>' +
      '<button class="nav-btn" data-act="month" data-d="1">›</button></div>' +
      '<div class="wk">' + HAFTA.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="grid ' + (slide ? 'slide-' + slide : '') + '" id="calGrid">' + monthCells(v, R) + '</div>' +
      '<div class="legend"><span><i class="l-p"></i>Regl</span><span><i class="l-pr"></i>Tahmini regl</span><span><i class="l-f"></i>Doğurgan</span><span><i class="l-o"></i>Yumurtlama</span><span><i class="l-l"></i>Not var</span></div>' +
      '</section>' +
      (isCur ? '' : '<div style="text-align:center;margin:-4px 0 12px" class="anim"><button class="btn btn-sm btn-ghost" data-act="month" data-d="0">↩ Bugüne dön</button></div>') +
      '<section class="card anim" style="--i:2"><div class="card-title">' + AYLAR[v.m] + ' özeti</div>' +
      (ev.length ? ev.map(function (e) { return '<div class="ev"><span class="ei">' + e.i + '</span><div>' + e.t + '<small>' + e.s + '</small></div></div>'; }).join('')
        : '<div class="empty" style="padding:14px"><span class="ee">🗓️</span>Bu ay için kayıt ya da tahmin yok</div>') +
      '</section>';
    bindSwipe($('#calGrid', page), function (d) { moveMonth(d); });
  }
  function moveMonth(d) {
    if (d === 0) { var p = parts(todayDn()); calView = { y: p.y, m: p.m }; }
    else { var m = calView.m + d; calView = { y: calView.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; }
    var page = $('#page-cal'); page.classList.add('no-anim');
    renderCal(page, d > 0 ? 'l' : d < 0 ? 'r' : '');
    var g = $('#calGrid', page); $$('.cell', g).forEach(function (c) { c.style.animation = 'none'; });
  }
  function bindSwipe(el, cb) {
    if (!el) return;
    var x0 = null, y0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) cb(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  // ================= Gün sayfası =================
  var sheetOnClose = null;
  function openSheet(html, onClose) {
    var sh = $('#sheet');
    sh.innerHTML = '<div class="handle"></div>' + html;
    sh.scrollTop = 0;
    sheetOnClose = onClose || null;
    requestAnimationFrame(function () { sh.classList.add('show'); $('#backdrop').classList.add('show'); });
  }
  function closeSheet() {
    var sh = $('#sheet');
    if (!sh.classList.contains('show')) return false;
    sh.classList.remove('show'); $('#backdrop').classList.remove('show');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var cb = sheetOnClose; sheetOnClose = null;
    if (cb) cb();
    return true;
  }
  (function sheetDrag() {
    var sh = $('#sheet'), y0 = null, dy = 0;
    sh.addEventListener('touchstart', function (e) {
      if (sh.scrollTop > 0 || /INPUT|TEXTAREA/.test(e.target.tagName)) { y0 = null; return; }
      y0 = e.touches[0].clientY; dy = 0;
    }, { passive: true });
    sh.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sh.classList.add('drag'); sh.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    sh.addEventListener('touchend', function () {
      if (y0 == null) return;
      sh.classList.remove('drag'); sh.style.transform = '';
      if (dy > 110) closeSheet();
      y0 = null;
    });
  })();

  var dayN = null;
  function openDay(n) {
    dayN = n;
    var R = compute(), future = n > R.t, r = S.days[keyOf(n)] || {}, info = dayInfo(n, R);
    var html = '<div class="sheet-title">' + fmtFull(n) + (n === R.t ? ' · Bugün' : '') + '</div>' +
      '<div class="sheet-sub">' + (info || (n < R.t ? 'Geçmiş bir gün' : '')) + '</div>';
    if (future) {
      html += '<div class="empty"><span class="ee">🔮</span>Bu gün henüz gelmedi.<br>Burada sadece tahminleri görüyorsun.</div>' +
        '<button class="btn btn-primary btn-block" data-act="close">Tamam</button>';
    } else {
      html += '<div class="row" style="margin-top:10px"><div class="rl">💧 Regl günü<small>Bu gün regl vardı</small></div><button class="switch ' + (r.p ? 'on' : '') + '" data-act="dayP"></button></div>' +
        '<div id="flowBox" ' + (r.p ? '' : 'hidden') + '><div class="sec-title">Akış</div><div class="chips">' +
        FLOWS.map(function (f) { return '<button class="chip flow ' + (r.flow === f.id ? 'on' : '') + '" data-act="flow" data-id="' + f.id + '">' + f.e + ' ' + f.l + '</button>'; }).join('') + '</div></div>' +
        '<div class="sec-title">Ruh hali</div><div class="chips">' +
        MOODS.map(function (m) { return '<button class="chip ' + ((r.moods || []).indexOf(m.id) >= 0 ? 'on' : '') + '" data-act="mood" data-id="' + m.id + '">' + m.e + ' ' + m.l + '</button>'; }).join('') + '</div>' +
        '<div class="sec-title">Belirtiler</div><div class="chips">' +
        SYMPTOMS.map(function (s) { return '<button class="chip ' + ((r.sym || []).indexOf(s.id) >= 0 ? 'on' : '') + '" data-act="sym" data-id="' + s.id + '">' + s.e + ' ' + s.l + '</button>'; }).join('') + '</div>' +
        '<div class="sec-title">Not</div><textarea class="input" id="dayNote" maxlength="500" placeholder="Bugün nasıldı? ✍️">' + esc(r.note || '') + '</textarea>' +
        '<button class="btn btn-primary btn-block" style="margin-top:16px" data-act="close">Kaydet 💗</button>';
    }
    openSheet(html, function () {
      var ta = $('#dayNote');
      if (ta && dayN != null) { var k = keyOf(dayN); var v = ta.value.trim(); if (v) rec(k).note = v; else if (S.days[k]) delete S.days[k].note; tidy(k); save(); }
      dayN = null;
      rerender(false);
    });
  }
  function toggleList(k, field, id) {
    var r = rec(k), a = r[field] || (r[field] = []), i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    tidy(k); save();
    return i < 0;
  }

  // ================= Başladı / bitti =================
  function pickerHtml(v, sel, max, act, still) {
    var R = compute(), tp = parts(max);
    var atMax = v.y > tp.y || (v.y === tp.y && v.m >= tp.m);
    return '<div class="dp' + (still ? ' still' : '') + '"><div class="dp-head"><button class="nav-btn" data-act="' + act + 'Nav" data-d="-1">‹</button><b>' + AYLAR[v.m] + ' ' + v.y + '</b>' +
      '<button class="nav-btn" data-act="' + act + 'Nav" data-d="1" ' + (atMax ? 'disabled' : '') + '>›</button></div>' +
      '<div class="wk">' + HAFTA.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="grid">' + monthCells(v, R, { picker: true, sel: sel, max: max, act: act + 'Pick' }) + '</div></div>';
  }
  var startPick = null;
  function openStart() {
    var t = todayDn();
    openSheet('<div class="sheet-title">Regl ne zaman başladı? 💧</div><div class="sheet-sub">Geçmiş olsun, kendine iyi bak 💗</div>' +
      '<div class="choice-list">' +
      '<button class="choice" style="--i:0" data-act="startAt" data-n="' + t + '"><span class="ci">🌸</span><div>Bugün<small>' + fmtFull(t) + '</small></div></button>' +
      '<button class="choice" style="--i:1" data-act="startAt" data-n="' + (t - 1) + '"><span class="ci">🌙</span><div>Dün<small>' + fmtFull(t - 1) + '</small></div></button>' +
      '<button class="choice" style="--i:2" data-act="startAt" data-n="' + (t - 2) + '"><span class="ci">☁️</span><div>2 gün önce<small>' + fmtFull(t - 2) + '</small></div></button>' +
      '<button class="choice" style="--i:3" data-act="startOther"><span class="ci">📅</span><div>Başka bir gün<small>Takvimden seç</small></div></button>' +
      '</div><div id="startPicker"></div>');
  }
  function renderStartPicker(still) {
    var t = todayDn();
    $('#startPicker').innerHTML = '<div class="sec-title">İlk günü seç</div>' + pickerHtml(startPick.v, startPick.sel, t, 'sp', still) +
      '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="startAt" data-n="' + (startPick.sel != null ? startPick.sel : '') + '" ' + (startPick.sel == null ? 'disabled' : '') + '>Kaydet 💧</button>';
  }
  function startPeriod(n, el) {
    var t = todayDn();
    if (!(n <= t)) return;
    var P = compute().P;
    if (t - n < P + 2) {
      for (var d = n; d <= t; d++) setP(d, true);
      S.ongoing = { start: keyOf(n), filled: keyOf(t) };
    } else {
      for (var e = n; e < n + P && e <= t; e++) setP(e, true);
      S.ongoing = null;
    }
    S.endedOn = null;
    save(); closeSheet();
    showTab('home', true);
    setTimeout(function () { burstFrom($('.ring-wrap'), ['💧', '💗', '🌸', '✨'], 26); }, 350);
    toast('Kaydedildi. Kendine iyi bak 💗');
  }
  function openEnd() {
    var R = compute(), t = R.t, s = R.cur ? R.cur.s : t;
    var opts = [[t, '🌈', 'Bugün', 'Bugün son gündü'], [t - 1, '🌙', 'Dün', 'Dün son gündü'], [t - 2, '☁️', '2 gün önce', '']];
    openSheet('<div class="sheet-title">Regl ne zaman bitti? ✨</div><div class="sheet-sub">Son regl gününü seç</div><div class="choice-list">' +
      opts.filter(function (o) { return o[0] >= s; }).map(function (o, i) {
        return '<button class="choice" style="--i:' + i + '" data-act="endAt" data-n="' + o[0] + '"><span class="ci">' + o[1] + '</span><div>' + o[2] + '<small>' + fmtFull(o[0]) + '</small></div></button>';
      }).join('') + '</div>');
  }
  function endPeriod(E) {
    var R = compute(), t = R.t;
    if (R.cur) for (var d = E + 1; d <= t; d++) if (d >= R.cur.s) setP(d, false);
    S.ongoing = null;
    S.endedOn = keyOf(t);
    save(); closeSheet();
    showTab('home', true);
    setTimeout(function () { burstFrom($('.ring-wrap'), ['✨', '🌈', '💖', '🎉', '🌸'], 30); }, 350);
    toast('Geçmiş olsun, yeni döngün hayırlı olsun 🌸');
  }

  // ================= Analiz =================
  function renderStats(page) {
    var R = compute();
    var cyc = R.cycles.slice(-6), maxLen = Math.max.apply(null, cyc.map(function (c) { return c.len; }).concat([R.L, 1]));
    var reg = R.sd == null ? ['Veri az', 'en az 3 regl gerekli'] : R.sd <= 2 ? ['Çok düzenli', '🌟'] : R.sd <= 4 ? ['Düzenli', '👍'] : R.sd <= 7 ? ['Biraz düzensiz', '🌀'] : ['Düzensiz', '🤔'];
    var symCount = {}, moodCount = {};
    Object.keys(S.days).forEach(function (k) {
      var r = S.days[k];
      (r.sym || []).forEach(function (s) { symCount[s] = (symCount[s] || 0) + 1; });
      (r.moods || []).forEach(function (m) { moodCount[m] = (moodCount[m] || 0) + 1; });
    });
    var syms = Object.keys(symCount).sort(function (a, b) { return symCount[b] - symCount[a]; }).slice(0, 6);
    var moods = Object.keys(moodCount).sort(function (a, b) { return moodCount[b] - moodCount[a]; }).slice(0, 8);
    var symMax = syms.length ? symCount[syms[0]] : 1;

    var h = '<div class="page-title anim" style="--i:0">Analiz</div>' +
      '<div class="tiles">' +
      tile('<span data-count="' + R.L + '">' + R.L + '</span> <small>gün</small>', 'Ortalama döngü', 1) +
      tile('<span data-count="' + R.P + '">' + R.P + '</span> <small>gün</small>', 'Ortalama regl süresi', 1.5) +
      tile('<span data-count="' + R.periods.length + '">' + R.periods.length + '</span> <small>kayıt</small>', 'Kayıtlı regl', 2) +
      tile(reg[0] + ' <small>' + reg[1] + '</small>', 'Döngü düzeni', 2.5, true) +
      '</div>';
    h += '<section class="card anim" style="--i:3"><div class="card-title">Son döngüler <small>💧 regl · 🌸 döngü</small></div>';
    if (cyc.length) {
      h += cyc.slice().reverse().map(function (c, i) {
        var w = (c.len / maxLen * 100).toFixed(1), pw = (Math.min(c.plen, c.len) / c.len * 100).toFixed(1);
        return '<div class="bar-row"><span class="bl">' + fmtShort(c.s) + '</span><div class="bar"><div class="bar-fill" style="width:' + w + '%;--i:' + i + '"><span class="bp" style="width:' + pw + '%"></span><span class="br"></span></div></div><span class="bv">' + c.len + 'g</span></div>';
      }).join('');
    } else h += '<div class="empty"><span class="ee">📈</span>İki regl kaydedildikten sonra döngülerin burada belirecek</div>';
    h += '</section>';

    h += '<section class="card anim" style="--i:4"><div class="card-title">En sık belirtiler</div>';
    if (syms.length) h += syms.map(function (id, i) {
      var s = byId(SYMPTOMS, id) || { e: '•', l: id };
      return '<div class="bar-row" style="grid-template-columns:118px 1fr 28px"><span>' + s.e + ' ' + s.l + '</span><div class="bar"><div class="bar-fill solid" style="width:' + (symCount[id] / symMax * 100).toFixed(1) + '%;--i:' + i + '"></div></div><span class="bv">' + symCount[id] + '</span></div>';
    }).join('');
    else h += '<div class="empty"><span class="ee">🩺</span>Günlere belirti ekledikçe burada görünecek</div>';
    h += '</section>';

    h += '<section class="card anim" style="--i:5"><div class="card-title">Ruh hali</div>';
    if (moods.length) h += '<div class="mood-stats">' + moods.map(function (id) {
      var m = byId(MOODS, id) || { e: '•', l: id };
      return '<div class="ms"><span class="e">' + m.e + '</span>' + moodCount[id] + '<small>' + m.l + '</small></div>';
    }).join('') + '</div>';
    else h += '<div class="empty"><span class="ee">😊</span>Ana sayfadan ruh halini seçebilirsin</div>';
    h += '</section>';

    h += '<section class="card anim" style="--i:6"><div class="card-title">Geçmiş</div>';
    if (R.periods.length) {
      var list = R.periods.slice().reverse().slice(0, 15);
      h += list.map(function (p) {
        var idx = R.periods.indexOf(p), nx = R.periods[idx + 1];
        return '<div class="hist"><span class="hd">💧</span><div class="hm">' + fmtRange(p.s, p.e) + ' ' + parts(p.e).y +
          '<small>' + (nx ? 'Döngü: ' + (nx.s - p.s) + ' gün' : (R.inPeriod && p === R.cur ? 'Devam ediyor' : 'Şu anki döngü · ' + (R.t - p.s + 1) + '. gün')) + '</small></div>' +
          '<span class="hl">' + p.len + ' gün</span></div>';
      }).join('');
    } else h += '<div class="empty"><span class="ee">🌸</span>Henüz regl kaydı yok</div>';
    h += '</section>';
    page.innerHTML = h;
  }
  function tile(v, l, i, plain) {
    return '<div class="tile anim" style="--i:' + i + '"><div class="tv"' + (plain ? ' style="font-size:21px;padding-top:6px"' : '') + '>' + v + '</div><div class="tl">' + l + '</div></div>';
  }

  // ================= Ayarlar =================
  function renderSettings(page) {
    var n = S.notif;
    page.innerHTML =
      '<div class="page-title anim" style="--i:0">Ayarlar</div>' +
      '<section class="card anim" style="--i:1"><div class="card-title">👤 Profil</div>' +
      '<label class="field-label" for="fName">İsim</label><input class="input" id="fName" data-field="name" maxlength="30" value="' + esc(S.name) + '">' +
      '<label class="field-label" for="fNote">💌 Sevgi notu <span style="font-weight:700">(ana sayfada zarf olarak görünür, boş bırakırsan gizlenir)</span></label>' +
      '<textarea class="input" id="fNote" data-field="note" maxlength="400">' + esc(S.note) + '</textarea></section>' +

      '<section class="card anim" style="--i:2"><div class="card-title">🎨 Tema</div>' + themesHtml() + '</section>' +

      '<section class="card anim" style="--i:3"><div class="card-title">🔄 Döngü</div>' +
      '<div class="row"><div class="rl">Döngü uzunluğu<small>İki regl başlangıcı arası</small></div>' + stepper('cycleLen', S.cycleLen) + '</div>' +
      '<div class="row"><div class="rl">Regl süresi<small>Kaç gün sürüyor</small></div>' + stepper('periodLen', S.periodLen) + '</div>' +
      '<p class="muted" style="font-size:12.5px;font-weight:700;margin-top:6px">Kayıtlar arttıkça uygulama kendi ortalamasını hesaplar; bu değerler sadece başlangıç içindir.</p></section>' +

      '<section class="card anim" style="--i:4"><div class="card-title">🔔 Hatırlatmalar</div>' +
      '<div class="row"><div class="rl">Bildirimler<small>Regl yaklaşınca haber ver</small></div><button class="switch ' + (n.on ? 'on' : '') + '" data-act="notifOn"></button></div>' +
      '<div id="notifMore" ' + (n.on ? '' : 'hidden') + '>' +
      '<div class="row"><div class="rl">Kaç gün önce?</div><div class="seg">' + [1, 2, 3].map(function (d) { return '<button class="' + (n.before === d ? 'on' : '') + '" data-act="before" data-d="' + d + '">' + d + ' gün</button>'; }).join('') + '</div></div>' +
      '<div class="row"><div class="rl">Saat</div><input type="time" class="input" data-field="time" value="' + esc(n.time) + '"></div>' +
      '<div class="row"><div class="rl">Doğurgan dönem<small>Başlangıcında hatırlat</small></div><button class="switch ' + (n.fertile ? 'on' : '') + '" data-act="notifFertile"></button></div>' +
      '<div class="row"><button class="btn btn-sm btn-ghost" data-act="testNotif">🔔 Deneme bildirimi gönder</button></div>' +
      '</div></section>' +

      '<section class="card anim" style="--i:5"><div class="card-title">💾 Yedek</div>' +
      '<p class="muted" style="font-size:12.5px;font-weight:700;margin-top:6px">Telefon değiştirirken ya da uygulamayı silmeden önce yedeği kendine gönder (WhatsApp, Drive, not…).</p>' +
      '<div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="export">📤 Yedeği paylaş</button><button class="btn btn-sm btn-ghost" data-act="import">📥 Geri yükle</button></div>' +
      '<div class="btn-row" style="grid-template-columns:1fr"><button class="btn btn-sm btn-ghost" style="color:#ef4444" data-act="reset">🗑️ Tüm verileri sil</button></div></section>' +

      '<section class="card anim" style="--i:6"><div class="about">🔒 Veriler sadece bu telefonda saklanır, uygulamanın internet izni yoktur.<br><br>' +
      'Tahminler ortalamalara dayanır ve tıbbi tavsiye değildir; doğum kontrolü yöntemi olarak kullanılmamalıdır.<br><br>' +
      '<b>Sürüm 1.0</b> · Sevgiyle yapıldı <span class="heart-beat">💗</span></div></section>';
  }
  function stepper(field, v) {
    return '<div class="stepper"><button data-act="step" data-f="' + field + '" data-d="-1">−</button><div class="val">' + v + '<small> gün</small></div><button data-act="step" data-f="' + field + '" data-d="1">+</button></div>';
  }

  // ================= Bildirimler =================
  function syncReminders() {
    if (!NATIVE) return;
    var list = [];
    try {
      if (S.notif.on) {
        var R = compute();
        if (R.has) {
          var tm = String(S.notif.time || '10:00').split(':'), hh = +tm[0] || 10, mm = +tm[1] || 0;
          var at = function (n, h, m) { var p = parts(n); return new Date(p.y, p.m, p.d, h == null ? hh : h, m == null ? mm : m).getTime(); };
          var b = S.notif.before;
          R.predStarts.slice(0, 3).forEach(function (s) {
            if (b > 0) list.push({ t: at(s - b), title: 'Regl yaklaşıyor 🌸', body: S.name + ', reglin ' + (b === 1 ? 'yarın' : b + ' gün sonra') + ' başlayabilir. Çantana ped koymayı unutma 💕' });
            list.push({ t: at(s), title: 'Bugün regl başlayabilir 💗', body: 'Başlarsa uygulamada "Regl başladı"ya dokunmayı unutma ✨' });
          });
          if (S.notif.fertile) R.cycleStarts.slice(0, 3).forEach(function (cs) {
            var o = R.ovuOf(cs);
            list.push({ t: at(o - 5), title: 'Doğurgan dönem başlıyor 🌷', body: 'Önümüzdeki birkaç gün doğurganlığın en yüksek olduğu dönem (tahmini).' });
          });
          if (S.ongoing) list.push({ t: at(dnOf(S.ongoing.start) + Math.max(R.P, 3), 20, 0), title: 'Regl bitti mi? 🌸', body: 'Bittiyse uygulamada "Regl bitti"ye dokunabilirsin. Geçmiş olsun 💗' });
        }
      }
      var now = Date.now();
      list = list.filter(function (x) { return x.t > now + 60000; }).sort(function (a, b) { return a.t - b.t; });
    } catch (e) { list = []; }
    try { Android.setReminders(JSON.stringify(list)); } catch (e) {}
  }
  window.onNotifyPermission = function (ok) {
    if (!ok) toast('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin 🔔');
    else toast('Hatırlatmalar açık 🔔');
  };

  // ================= Modal =================
  var modalResolve = null;
  function confirmBox(icon, title, text, okText, danger) {
    var m = $('#modal');
    $('.modal-box', m).innerHTML = '<span class="mi">' + icon + '</span><h3>' + title + '</h3><p>' + text + '</p>' +
      '<div class="modal-btns"><button class="btn btn-sm btn-ghost" data-act="modalNo">Vazgeç</button><button class="btn btn-sm ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="modalYes">' + okText + '</button></div>';
    m.classList.add('show');
    return new Promise(function (res) { modalResolve = res; });
  }
  function closeModal(v) {
    var m = $('#modal'); if (!m.classList.contains('show')) return false;
    m.classList.remove('show');
    var r = modalResolve; modalResolve = null; if (r) r(v);
    return true;
  }

  // ================= Yedek =================
  function exportText() { return JSON.stringify({ app: 'derya-regl-takvimi', v: 1, tarih: new Date().toISOString(), data: S }); }
  function openImport() {
    openSheet('<div class="sheet-title">Yedekten geri yükle 📥</div><div class="sheet-sub">Daha önce paylaştığın yedek metnini aşağıya yapıştır.</div>' +
      '<textarea class="input" id="importText" style="margin-top:14px;min-height:140px;font-size:12px" placeholder="{&quot;app&quot;:&quot;derya-regl-takvimi&quot;, …}"></textarea>' +
      '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="doImport">Geri yükle</button>');
  }
  function doImport() {
    var txt = ($('#importText') || {}).value || '', obj;
    try { obj = JSON.parse(txt.trim()); } catch (e) { toast('Bu metin bir yedek gibi görünmüyor 🤔'); return; }
    var d = obj && obj.data ? obj.data : obj;
    if (!d || typeof d.days !== 'object') { toast('Bu metin bir yedek gibi görünmüyor 🤔'); return; }
    confirmBox('📥', 'Yedek yüklensin mi?', 'Şu anki veriler yedektekilerle değiştirilecek.', 'Yükle').then(function (ok) {
      if (!ok) return;
      S = normalize(d); S.onboarded = true; save();
      document.body.className = 'theme-' + S.theme; setBars();
      closeSheet(); showTab('home', true);
      rain(['💗', '✨', '🌸'], 24); toast('Yedek yüklendi 💗');
    });
  }

  // ================= Tanışma =================
  var ob = null;
  function startOnboarding() {
    var p = parts(todayDn());
    ob = { step: 0, dir: 1, name: S.name || 'Derya', sel: null, v: { y: p.y, m: p.m }, cycle: S.cycleLen, period: S.periodLen };
    $('#onboard').hidden = false; $('#onboard').classList.remove('leave');
    renderOnboard();
  }
  function renderOnboard() {
    var o = $('#onboard'), t = todayDn(), h = '<div class="dots">' + [0, 1, 2].map(function (i) { return '<i class="' + (i === ob.step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    h += '<div class="step ' + (ob.dir < 0 ? 'back' : ob.dir === 0 ? 'still' : '') + '">';
    if (ob.step === 0) {
      h += '<div class="hero">' + LOGO + '</div>' +
        '<h2>Hoş geldin! 🌸</h2><p class="lead">Sana özel, sevgiyle hazırlanmış regl takvimin. Önce birkaç küçük soru 💕</p>' +
        '<label class="field-label" for="obName">Adın</label><input class="input" id="obName" maxlength="30" value="' + esc(ob.name) + '">' +
        '<div class="grow"></div><div class="actions"><button class="btn btn-primary btn-block" data-act="obNext">Devam et →</button></div>';
    } else if (ob.step === 1) {
      h += '<h2>Son reglin ne zaman başladı? 📅</h2><p class="lead">Takvimden ilk gününe dokun.</p>' +
        '<div class="card" style="padding:14px">' + pickerHtml(ob.v, ob.sel, t, 'ob', ob.dir === 0 && ob.picked) + '</div>' +
        '<div class="picked">' + (ob.sel != null ? '💧 ' + fmtFull(ob.sel) + ' (' + rel(ob.sel - t) + ')' : '') + '</div>' +
        '<div class="grow"></div><div class="actions"><button class="btn btn-primary btn-block" data-act="obNext" ' + (ob.sel == null ? 'disabled' : '') + '>Devam et →</button>' +
        '<button class="btn btn-ghost btn-block" data-act="obSkip">Hatırlamıyorum, atla</button></div>';
    } else {
      h += '<h2>Döngün kaç gün sürüyor? 🔄</h2><p class="lead">İki regl başlangıcı arasındaki gün sayısı. Bilmiyorsan 28 kalsın, zamanla ben öğrenirim.</p>' +
        '<div class="card"><div class="row"><div class="rl">Döngü uzunluğu</div>' + stepper('obCycle', ob.cycle) + '</div>' +
        '<div class="row"><div class="rl">Regl süresi</div>' + stepper('obPeriod', ob.period) + '</div></div>' +
        '<div class="grow"></div><div class="actions"><button class="btn btn-primary btn-block pulse" data-act="obDone">Başlayalım 💗</button>' +
        '<button class="btn btn-ghost btn-block" data-act="obBack">← Geri</button></div>';
    }
    o.innerHTML = h + '</div>';
  }
  function finishOnboarding(btn) {
    S.name = (ob.name || '').trim() || 'Derya';
    S.cycleLen = ob.cycle; S.periodLen = ob.period;
    S.onboarded = true;
    if (ob.sel != null) {
      var t = todayDn();
      if (t - ob.sel < ob.period) {
        for (var d = ob.sel; d <= t; d++) setP(d, true);
        S.ongoing = { start: keyOf(ob.sel), filled: keyOf(t) };
      } else for (var e = ob.sel; e < ob.sel + ob.period && e <= t; e++) setP(e, true);
    }
    save();
    burstFrom(btn, ['💗', '🌸', '✨', '💕'], 30);
    var o = $('#onboard'); o.classList.add('leave');
    setTimeout(function () { o.hidden = true; o.innerHTML = ''; }, 520);
    showTab('home', true);
    setTimeout(function () { rain(THEMES[S.theme].parts, 26); }, 300);
    if (NATIVE && S.notif.on) setTimeout(function () { try { if (!Android.canNotify()) Android.askNotify(); } catch (e) {} }, 1800);
  }

  // ================= Olaylar =================
  var nameTaps = 0, nameTimer;
  var ACT = {
    tab: function (el) { closeSheet(); showTab(el.getAttribute('data-tab')); },
    start: function () { startPick = null; openStart(); },
    startOther: function () { var p = parts(todayDn()); startPick = { v: { y: p.y, m: p.m }, sel: null }; renderStartPicker(); var sp = $('#startPicker'); if (sp && sp.scrollIntoView) sp.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    spNav: function (el) { var m = startPick.v.m + (+el.getAttribute('data-d')); startPick.v = { y: startPick.v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; renderStartPicker(); },
    spPick: function (el) { startPick.sel = +el.getAttribute('data-n'); renderStartPicker(true); },
    startAt: function (el) { var n = el.getAttribute('data-n'); if (n !== '') startPeriod(+n, el); },
    end: function () { openEnd(); },
    endAt: function (el) { endPeriod(+el.getAttribute('data-n')); },
    day: function (el) { openDay(+el.getAttribute('data-n')); },
    cell: function (el) {
      var n = +el.getAttribute('data-n');
      if (!editMode) { openDay(n); return; }
      if (n > todayDn()) { toast('Gelecek günler işaretlenemez 🔮'); return; }
      setP(n, !isP(n));
      if (S.ongoing && !isP(n) && n >= dnOf(S.ongoing.start) && n === todayDn()) S.ongoing = null;
      save();
      var page = $('#page-cal'); page.classList.add('no-anim'); renderCal(page);
      var c = $('.cell[data-n="' + n + '"]', page);
      if (c) { c.classList.add('pop'); if (isP(n)) burstFrom(c, ['💧', '💗'], 8); }
    },
    edit: function () { editMode = !editMode; var page = $('#page-cal'); page.classList.add('no-anim'); renderCal(page); if (!editMode) toast('Kaydedildi 💗'); },
    month: function (el) { moveMonth(+el.getAttribute('data-d')); },
    close: function () { closeSheet(); },
    dayP: function (el) {
      var k = keyOf(dayN), on = !isP(dayN);
      setP(dayN, on); el.classList.toggle('on', on);
      if (!on && S.ongoing && dayN === todayDn()) S.ongoing = null;
      save();
      $('#flowBox').hidden = !on;
      if (on) burstFrom(el, ['💧', '💗'], 10);
      void k;
    },
    flow: function (el) {
      var k = keyOf(dayN), r = rec(k), id = el.getAttribute('data-id');
      r.flow = r.flow === id ? undefined : id; if (!r.flow) delete r.flow;
      tidy(k); save();
      $$('.chip.flow').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-id') === r.flow); });
      popEl(el);
    },
    mood: function (el) { el.classList.toggle('on', toggleList(keyOf(dayN), 'moods', el.getAttribute('data-id'))); popEl(el); },
    sym: function (el) { el.classList.toggle('on', toggleList(keyOf(dayN), 'sym', el.getAttribute('data-id'))); popEl(el); },
    qmood: function (el) {
      var on = toggleList(keyOf(todayDn()), 'moods', el.getAttribute('data-id'));
      el.classList.toggle('on', on); popEl(el);
      if (on) burstFrom($('.e', el), [byId(MOODS, el.getAttribute('data-id')).e], 7);
      var cnt = ((S.days[keyOf(todayDn())] || {}).moods || []).length;
      var sm = el.closest('.card').querySelector('.card-title small'); if (sm) sm.textContent = cnt ? cnt + ' seçili' : '';
    },
    tip: function (el) { tipShift++; var R = compute(), list = TIPS[R.phase] || TIPS.yok; var b = $('.tip-body', el); $('.tx', b).textContent = list[(R.t + tipShift) % list.length]; b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); },
    love: function (el) { var open = !el.classList.contains('open'); el.classList.toggle('open', open); if (open) setTimeout(function () { burstFrom(el, ['💗', '💕', '💖', '🥰'], 24); }, 250); },
    name: function (el) {
      nameTaps++; clearTimeout(nameTimer); nameTimer = setTimeout(function () { nameTaps = 0; }, 1500);
      if (nameTaps >= 5) { nameTaps = 0; rain(['💗', '💕', '💖', '🥰', '🌸'], 50); toast('Seni çok seven biri var 💕'); }
      else burstFrom(el, ['💗'], 3);
    },
    themes: function () {
      openSheet('<div class="sheet-title">Tema seç 🎨</div><div class="sheet-sub">Ruh haline göre değiştir</div>' + themesHtml() + '<div style="height:10px"></div>');
    },
    theme: function (el, ev) {
      var id = el.getAttribute('data-id'); if (id === S.theme) return;
      $$('.theme-opt').forEach(function (b) { b.classList.toggle('on', b === el); });
      applyTheme(id, ev);
    },
    step: function (el) {
      var f = el.getAttribute('data-f'), d = +el.getAttribute('data-d');
      var lim = { cycleLen: [18, 60], periodLen: [1, 12], obCycle: [18, 60], obPeriod: [1, 12] }[f];
      var map = { obCycle: 'cycle', obPeriod: 'period' };
      var target = map[f] ? ob : S, key = map[f] || f;
      target[key] = clamp(target[key] + d, lim[0], lim[1]);
      var val = el.parentNode.querySelector('.val'); val.innerHTML = target[key] + '<small> gün</small>';
      val.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      if (!map[f]) save();
    },
    notifOn: function (el) {
      S.notif.on = !S.notif.on; save(); el.classList.toggle('on', S.notif.on);
      var more = $('#notifMore'); if (more) more.hidden = !S.notif.on;
      if (S.notif.on && NATIVE) { try { if (!Android.canNotify()) Android.askNotify(); } catch (e) {} }
    },
    notifFertile: function (el) { S.notif.fertile = !S.notif.fertile; save(); el.classList.toggle('on', S.notif.fertile); },
    before: function (el) { S.notif.before = +el.getAttribute('data-d'); save(); $$('[data-act="before"]').forEach(function (b) { b.classList.toggle('on', b === el); }); },
    testNotif: function () {
      if (!NATIVE) { toast('Bildirimler telefonda çalışır 📱'); return; }
      try {
        if (!Android.canNotify()) { Android.askNotify(); return; }
        Android.testNotification('Merhaba ' + S.name + ' 🌸', 'Hatırlatmalar böyle görünecek 💗');
        toast('Deneme bildirimi gönderildi 🔔');
      } catch (e) {}
    },
    export: function () {
      var txt = exportText();
      if (NATIVE) { try { Android.share(txt); } catch (e) {} }
      else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('Yedek panoya kopyalandı 📋'); });
    },
    import: function () { openImport(); },
    doImport: function () { doImport(); },
    reset: function () {
      confirmBox('🗑️', 'Tüm veriler silinsin mi?', 'Bütün regl kayıtları, notlar ve ayarlar silinecek. Bu işlem geri alınamaz.', 'Evet, sil', true).then(function (ok) {
        if (!ok) return;
        S = defaults(); save(); document.body.className = 'theme-pembe'; setBars();
        showTab('home', false); startOnboarding();
      });
    },
    modalYes: function () { closeModal(true); },
    modalNo: function () { closeModal(false); },
    obNext: function () {
      if (ob.step === 0) { ob.name = $('#obName').value; }
      ob.step++; ob.dir = 1; renderOnboard();
    },
    obSkip: function () { ob.sel = null; ob.step = 2; ob.dir = 1; renderOnboard(); },
    obBack: function () { ob.step--; ob.dir = -1; renderOnboard(); },
    obNav: function (el) { var m = ob.v.m + (+el.getAttribute('data-d')); ob.v = { y: ob.v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; ob.dir = 0; ob.picked = false; renderOnboard(); },
    obPick: function (el) { ob.sel = +el.getAttribute('data-n'); ob.dir = 0; ob.picked = true; renderOnboard(); var c = $('#onboard .cell[data-n="' + ob.sel + '"]'); if (c) burstFrom(c, ['💧', '💗'], 8); },
    obDone: function (el) { finishOnboarding(el); }
  };
  function popEl(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

  document.addEventListener('click', function (e) {
    var tabBtn = e.target.closest('.tab');
    if (tabBtn) { haptic(); closeSheet(); showTab(tabBtn.getAttribute('data-tab')); return; }
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = ACT[el.getAttribute('data-act')];
    if (fn) { haptic(); fn(el, e); }
  });
  $('#backdrop').addEventListener('click', closeSheet);
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(false); });

  var fieldTimer;
  document.addEventListener('input', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-field'); if (!f) return;
    if (f === 'time') S.notif.time = e.target.value || '10:00';
    else S[f] = e.target.value;
    clearTimeout(fieldTimer); fieldTimer = setTimeout(save, 300);
  });
  document.addEventListener('change', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-field');
    if (f === 'name' && !S.name.trim()) { S.name = 'Derya'; e.target.value = S.name; }
    if (f) save();
  });

  // Android geri tuşu: önce açık pencereleri kapat, sonra ana sayfaya dön.
  window.appBack = function () {
    if (closeModal(false)) return true;
    if (closeSheet()) return true;
    if (!$('#onboard').hidden && ob && ob.step > 0) { ob.step--; ob.dir = -1; renderOnboard(); return true; }
    if (current !== 'home') { showTab('home'); return true; }
    return false;
  };
  var lastDay = todayDn();
  window.appResume = function () {
    var t = todayDn();
    if (t !== lastDay) {
      lastDay = t; tickOngoing(); save();
      var p = parts(t); calView = { y: p.y, m: p.m };
      if (!$('#sheet').classList.contains('show')) rerender(false);
    }
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) window.appResume(); });

  // ================= Açılış =================
  function boot() {
    document.body.className = 'theme-' + S.theme;
    setBars();
    if (tickOngoing()) save(); else syncReminders();
    $('#splashText').textContent = S.onboarded ? 'Merhaba ' + S.name + ' 💕' : 'Hoş geldin 🌸';
    startParticles();
    var splash = $('#splash');
    var done = false;
    function go() {
      if (done) return; done = true;
      splash.classList.add('hide');
      setTimeout(function () { splash.remove(); }, 800);
      if (!S.onboarded) startOnboarding();
      showTab('home', true);
    }
    splash.addEventListener('click', go);
    setTimeout(go, REDUCE ? 300 : 1700);
  }
  boot();
})();
