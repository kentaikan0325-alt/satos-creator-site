/* =========================================================
   Sato's creator — 共通の動き（全ページで読み込む）
   どの機能も「対象の要素があれば動く」だけ。無くても壊れない。
   ========================================================= */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  try { sessionStorage.setItem('sc_seen', '1'); } catch (e) {}

  /* ---------- 出現（画面に入ったら .in を付ける） ---------- */
  var seen = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-in],[data-fade],.steps').forEach(function (el) { seen.observe(el); });

  /* ---------- メニュー（スマホ） ---------- */
  var menuBtn = $('.menu-btn');
  if (menuBtn) {
    $$('.bar ul li').forEach(function (li, i) { var a = $('a', li); if (a) a.style.setProperty('--i', i); });
    var setMenu = function (open) {
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.firstChild.nodeValue = open ? '閉じる' : 'メニュー';
    };
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    $$('.bar ul a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- ページ切り替えの幕 ---------- */
  var curtain = $('.curtain');
  if (curtain && !reduce) {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // ページ内リンク
      e.preventDefault();
      curtain.classList.add('leave');
      setTimeout(function () { location.href = url.href; }, 480);
    });
    // 「戻る」で復元されたときに幕が残らないように
    addEventListener('pageshow', function (e) { if (e.persisted) curtain.classList.remove('leave'); });
  }

  /* ---------- ナビ：下に進むと隠れ、戻ると出る ---------- */
  var bar = $('.bar'), lastY = scrollY;

  /* ---------- スクロール連動（1フレームに1回だけ計算） ---------- */
  var hero = $('[data-hero]');
  var hs = $('.hscroll'), hsTrack = hs && $('.hs-track', hs), hsBar = hs && $('.hs-progress i', hs);
  var hsOn = false, hsDist = 0;
  var scrub = $$('[data-scrub]').map(function (el) {
    // 文字ごとに <span> に分け、読み進めた分だけ濃くする
    var text = el.textContent; el.setAttribute('aria-label', text); el.textContent = '';
    var chars = Array.prototype.map.call(text, function (ch) {
      var s = doc.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true');
      if (!reduce) s.style.opacity = '.16';
      el.appendChild(s); return s;
    });
    return { el: el, chars: chars, done: -1 };
  });

  function layoutH() {
    if (!hs) return;
    hsOn = !reduce && fine && innerWidth > 900;
    hs.classList.toggle('pinned', hsOn);
    if (hsOn) {
      hsDist = Math.max(0, hsTrack.scrollWidth - innerWidth);
      hs.style.height = (innerHeight + hsDist) + 'px';
    } else {
      hs.style.height = ''; hsTrack.style.transform = '';
    }
  }

  function frame() {
    ticking = false;
    var y = scrollY, vh = innerHeight;

    if (bar && !root.classList.contains('menu-open')) {
      if (y > lastY + 6 && y > 240) bar.classList.add('hide');
      else if (y < lastY - 6 || y < 240) bar.classList.remove('hide');
      lastY = y;
    }
    if (hero && !reduce) {
      var p = Math.min(1, Math.max(0, y / (hero.offsetHeight || 1)));
      hero.style.setProperty('--p', p.toFixed(4));
    }
    if (hsOn) {
      var r = hs.getBoundingClientRect();
      var q = hsDist ? Math.min(1, Math.max(0, -r.top / hsDist)) : 0;
      hsTrack.style.transform = 'translate3d(' + (-q * hsDist).toFixed(1) + 'px,0,0)';
      if (hsBar) hsBar.style.transform = 'scaleX(' + q.toFixed(4) + ')';
    }
    if (!reduce) scrub.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var q = (vh * 0.85 - r.top) / (r.height + vh * 0.45);
      var n = Math.round(Math.min(1, Math.max(0, q)) * s.chars.length);
      if (n === s.done) return;
      for (var i = Math.min(n, s.done < 0 ? 0 : s.done); i < s.chars.length; i++) s.chars[i].style.opacity = i < n ? '1' : '.16';
      s.done = n;
    });
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 見本の額：枠の幅に合わせて中身を縮小 ---------- */
  var frames = $$('.shot .frame');
  function fitFrames() {
    frames.forEach(function (f) {
      var vw = parseFloat(getComputedStyle(f).getPropertyValue('--vw')) || 1280;
      f.style.setProperty('--s', (f.clientWidth / vw).toFixed(4));
    });
  }
  function relayout() { fitFrames(); layoutH(); onScroll(); }
  relayout();
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(relayout);

  /* ---------- 数字のカウントアップ ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseInt(el.getAttribute('data-count'), 10);
    if (reduce || !to) return;
    var fmt = function (n) { return n.toLocaleString('en-US'); };
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(Math.round(to * e / 100) * 100);
        if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
      })(t0);
    }, { threshold: 0.4 });
    io.observe(el);
  });

  /* ---------- 日本時間の時計 ---------- */
  var clocks = $$('[data-clock]');
  if (clocks.length) {
    var tick = function () {
      var t;
      try { t = new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return; }
      clocks.forEach(function (c) { c.textContent = '日本時間 ' + t; });
    };
    tick(); setInterval(tick, 20000);
  }

  /* ---------- メールアドレスをコピー ---------- */
  $$('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var done = function () { b.textContent = 'コピーしました'; setTimeout(function () { b.textContent = label; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () { b.textContent = 'コピーできませんでした'; });
      } else { b.textContent = b.getAttribute('data-copy'); }
    });
  });

  /* ---------- マウスのときだけ：カーソルと、ボタンの吸い付き ---------- */
  if (fine && !reduce) {
    var cur = $('.cursor');
    if (cur) {
      var label = $('span', cur), cx = -100, cy = -100, tx = -100, ty = -100, moving = false;
      var loop = function () {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.2) requestAnimationFrame(loop); else moving = false;
      };
      addEventListener('mousemove', function (e) {
        if (cx === -100) { cx = e.clientX; cy = e.clientY; cur.style.opacity = '1'; }
        tx = e.clientX; ty = e.clientY;
        if (!moving) { moving = true; requestAnimationFrame(loop); }
        var t = e.target.closest && e.target.closest('[data-cursor]');
        cur.classList.toggle('on', !!t);
        if (t) label.textContent = t.getAttribute('data-cursor');
      }, { passive: true });
      doc.addEventListener('mouseleave', function () { cur.style.opacity = '0'; });
      doc.addEventListener('mouseenter', function () { cur.style.opacity = '1'; });
    }
    $$('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }
})();
