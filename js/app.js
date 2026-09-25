/* ==========================================================================
   Mikaela 3K Streaming — interfaz
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var P = M3K.plataformas;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var chNum = function (p) { return pad(P.indexOf(p) + 1); };

  M3K.ui = {};

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }
  M3K.ui.toast = toast;

  /* ---------- Enlaces de WhatsApp ---------- */
  $$('[data-wa]').forEach(function (a) { a.href = M3K.waLink(a.getAttribute('data-wa')); });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Intro ---------- */
  (function intro() {
    var loader = $('#loader');
    var seen = false;
    try { seen = sessionStorage.getItem('m3k-intro') === '1'; sessionStorage.setItem('m3k-intro', '1'); } catch (e) { /* nada */ }
    function done() {
      loader.classList.add('is-out');
      document.body.classList.remove('is-loading');
      setTimeout(function () { document.body.classList.add('is-ready'); M3K.ui.tvStart && M3K.ui.tvStart(); }, seen || reduced ? 0 : 280);
    }
    if (seen || reduced) { loader.style.transition = 'none'; done(); return; }
    var chEl = $('#loaderCh'), n = 1, t0 = performance.now();
    var tick = setInterval(function () { n = Math.min(P.length, n + 1); chEl.textContent = 'CH ' + pad(n); if (n >= P.length) clearInterval(tick); }, 70);
    var loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    (function wait() {
      var el = performance.now() - t0;
      if ((loaded && el > 1350) || el > 3200) { clearInterval(tick); chEl.textContent = 'CH ' + pad(P.length); setTimeout(done, 120); }
      else requestAnimationFrame(wait);
    })();
  })();

  /* ---------- Navegación ---------- */
  var nav = $('#nav');
  function onScrollNav() { nav.classList.toggle('is-scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', !open);
    document.body.classList.toggle('is-locked', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* Sección activa en el menú */
  var links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['inicio', 'catalogo', 'cartelera', 'comprar', 'revendedores', 'zona', 'preguntas'].forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* ---------- Hero: cliente / revendedor ---------- */
  var minP1 = Math.min.apply(null, P.map(function (p) { return p.p1; }));
  var maxSave = Math.max.apply(null, P.map(M3K.ahorro));
  var MODES = {
    cliente: {
      kicker: 'Streaming en bolivianos · Activación por WhatsApp',
      title: ['Cambia de', '<em>canal,</em>', 'no de tienda.'],
      lead: 'Netflix, Disney+, anime, doramas, música, TV por cable y apps de IA en un solo lugar. Pagas con QR en bolivianos y recibes tu cuenta por WhatsApp.',
      cta: 'Ver catálogo', href: '#catalogo',
      wa: 'Hola Mikaela 3K, quiero información.',
      stats: [[P.length, 'Plataformas'], [minP1 + '<small>Bs/mes</small>', 'Desde'], [maxSave + '<small>Bs</small>', 'Ahorro en 3 meses']]
    },
    revendedor: {
      kicker: 'Zona revendedor · Precios por mayor',
      title: ['Tu negocio', 'ya tiene', '<em>catálogo.</em>'],
      lead: P.length + ' plataformas listas para ofrecer a tus clientes, flyers para tus estados y precios por mayor que te pasamos directo por WhatsApp.',
      cta: 'Quiero revender', href: '#revendedores',
      wa: 'Hola Mikaela 3K, quiero ser revendedor(a). ¿Me pasas tus precios por mayor?',
      stats: [[P.length, 'Plataformas para vender'], [M3K.promos.length, 'Flyers listos'], ['QR', 'Pago en bolivianos']]
    }
  };
  var sw = $('.switch'), heroTitle = $('#heroTitle'), heroLead = $('#heroLead');
  function paintStats(mode) {
    $('#heroStats').innerHTML = MODES[mode].stats.map(function (s) { return '<div><dt>' + s[1] + '</dt><dd>' + s[0] + '</dd></div>'; }).join('');
  }
  paintStats('cliente');
  function setMode(mode, instant) {
    var m = MODES[mode];
    sw.setAttribute('data-mode', mode);
    $$('button', sw).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-mode') === mode); });
    var swap = function () {
      heroTitle.innerHTML = m.title.map(function (t) { return '<span class="line"><span>' + t + '</span></span>'; }).join('');
      heroLead.textContent = m.lead;
      $('#heroKicker').textContent = m.kicker;
      $('#heroCtaTxt').textContent = m.cta;
      $('#heroCta').setAttribute('href', m.href);
      $('#heroCta2').href = M3K.waLink(m.wa);
      paintStats(mode);
    };
    if (instant || reduced) { swap(); return; }
    heroTitle.classList.add('is-leaving');
    heroLead.classList.add('is-fading');
    setTimeout(function () {
      heroTitle.classList.remove('is-leaving');
      heroTitle.classList.add('is-entering');
      swap();
      void heroTitle.offsetWidth;
      heroTitle.classList.remove('is-entering');
      heroLead.classList.remove('is-fading');
    }, 430);
  }
  $$('button', sw).forEach(function (b) {
    b.addEventListener('click', function () { if (sw.getAttribute('data-mode') !== b.getAttribute('data-mode')) setMode(b.getAttribute('data-mode')); });
  });
  sw.setAttribute('data-mode', 'cliente');

  /* ---------- Carrito (combo) ---------- */
  var cart = store.get('m3k-combo', []).filter(function (it) { return M3K.buscar(it.id); });
  var periodo = 1;

  function inCart(id) { return cart.some(function (it) { return it.id === id; }); }
  function cartTotals() {
    var total = 0, save = 0, gifts = 0;
    cart.forEach(function (it) {
      var p = M3K.buscar(it.id);
      total += M3K.precio(p, it.meses);
      if (it.meses === 3) { save += M3K.ahorro(p); if (p.regalo) gifts++; }
    });
    return { total: total, save: save, gifts: gifts };
  }
  function saveCart() { store.set('m3k-combo', cart); renderCart(); syncButtons(); }

  function addToCart(id, meses, fromEl) {
    var p = M3K.buscar(id);
    if (!p) return false;
    meses = meses === 3 && p.p3 ? 3 : 1;
    var ex = cart.find(function (it) { return it.id === id; });
    if (ex) { ex.meses = meses; } else { cart.push({ id: id, meses: meses }); }
    saveCart();
    bumpBadge();
    if (fromEl) fly(fromEl);
    toast(p.nombre + (ex ? ' actualizado en tu combo' : ' agregado a tu combo'));
    return true;
  }
  function removeFromCart(id) { cart = cart.filter(function (it) { return it.id !== id; }); saveCart(); }
  function toggleCart(id, fromEl) { if (inCart(id)) { removeFromCart(id); toast(M3K.buscar(id).nombre + ' quitado del combo'); } else addToCart(id, periodo, fromEl); }

  M3K.cart = {
    add: addToCart, remove: removeFromCart, has: inCart,
    items: function () { return cart.slice(); },
    totals: cartTotals, open: function () { openCart(); }
  };

  function bumpBadge() {
    var b = $('#cartCount');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }

  function fly(fromEl) {
    if (reduced) return;
    var target = $('#comboBar').classList.contains('is-on') ? $('#comboBarN') : $('#cartCount');
    var a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    var dot = document.createElement('i');
    dot.className = 'fly';
    document.body.appendChild(dot);
    var mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 120;
    var anim = dot.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1 },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.3)', opacity: 1, offset: .45 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.4)', opacity: .6 }
    ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' });
    dot.style.left = '0'; dot.style.top = '0';
    anim.onfinish = function () { dot.remove(); };
  }

  var cartEl = $('#cart'), scrim = $('#scrim');
  function openCart() {
    closeMikaIfMobile();
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-on'); cartEl.classList.add('is-open'); });
    cartEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    setTimeout(function () { $('#closeCart').focus(); }, 300);
  }
  function closeCart() {
    scrim.classList.remove('is-on');
    cartEl.classList.remove('is-open');
    cartEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    setTimeout(function () { scrim.hidden = true; }, 400);
  }
  M3K.ui.openCart = openCart;
  $('#openCart').addEventListener('click', openCart);
  $('#comboBar').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  function closeMikaIfMobile() { if (window.innerWidth <= 760 && M3K.mika) M3K.mika.close(); }

  function cartMessage() {
    var t = cartTotals();
    var name = $('#profileName').value.trim();
    var tieneComprobante = comprobanteInput && comprobanteInput.files[0];
    var lines = ['Hola Mikaela 3K, quiero hacer este pedido:', ''];
    cart.forEach(function (it) {
      var p = M3K.buscar(it.id);
      lines.push('• ' + p.nombre + ' — ' + (it.meses === 3 ? '3 meses' : '1 mes') + ' — ' + M3K.precio(p, it.meses) + ' Bs' + (it.meses === 3 && p.regalo ? ' (+1 mes de regalo)' : ''));
    });
    lines.push('', 'Total: ' + t.total + ' Bs');
    lines.push('Nombre para mi perfil: ' + (name || '(te lo paso)'));
    lines.push('', tieneComprobante ? 'Ya pagué con el QR. Te comparto mi comprobante de pago.' : 'Ya pagué con el QR y en un momento te envío mi comprobante.');
    return lines.join('\n');
  }

  function renderCart() {
    var t = cartTotals();
    var n = cart.length;
    var badge = $('#cartCount');
    badge.textContent = n;
    badge.classList.toggle('has', n > 0);
    var body = $('#cartBody');
    if (!n) {
      body.innerHTML = '<div class="cart__empty"><span class="tvmini" aria-hidden="true"></span><b>Sin señal todavía</b><p>Tu combo está vacío. Suma plataformas desde el catálogo o el televisor.</p><a class="btn btn--ghost btn--sm" href="#catalogo" data-close-cart>Ver catálogo</a></div>';
      $('#cartFoot').hidden = true;
    } else {
      body.innerHTML = cart.map(function (it) {
        var p = M3K.buscar(it.id);
        return '<div class="citem" style="--brand:' + p.color + '">' +
          '<div class="citem__name"><i></i>' + esc(p.nombre) + '</div>' +
          '<div class="citem__price">' + M3K.precio(p, it.meses) + '<small>Bs</small></div>' +
          '<div class="citem__opts">' +
            '<button type="button" data-per="1" data-id="' + p.id + '" aria-pressed="' + (it.meses === 1) + '">1 mes</button>' +
            '<button type="button" data-per="3" data-id="' + p.id + '" aria-pressed="' + (it.meses === 3) + '"' + (p.p3 ? '' : ' disabled title="Solo plan mensual"') + '>3 meses</button>' +
          '</div>' +
          '<button type="button" class="citem__rm" data-rm="' + p.id + '">Quitar</button>' +
          (it.meses === 3 && p.regalo ? '<div class="citem__gift"><span class="chip chip--gift">+1 mes de regalo</span></div>' : '') +
          (it.meses === 3 && M3K.ahorro(p) > 0 && !p.regalo ? '<div class="citem__gift"><span class="chip">Ahorras ' + M3K.ahorro(p) + ' Bs</span></div>' : '') +
        '</div>';
      }).join('');
      $('#cartFoot').hidden = false;
      $('#cartTotal').textContent = t.total + ' Bs';
      $('#cartQrMonto').textContent = t.total + ' Bs';
      var saveEl = $('#cartSave');
      var parts = [];
      if (t.save > 0) parts.push('Ahorras ' + t.save + ' Bs con planes de 3 meses');
      if (t.gifts > 0) parts.push('+' + t.gifts + (t.gifts > 1 ? ' meses' : ' mes') + ' de regalo');
      saveEl.hidden = !parts.length;
      saveEl.textContent = parts.join(' · ');
    }
    var bar = $('#comboBar');
    if (n) {
      bar.hidden = false;
      $('#comboBarN').textContent = n;
      $('#comboBarTotal').textContent = t.total + ' Bs';
      $('#comboBarNames').textContent = cart.map(function (it) { return M3K.buscar(it.id).nombre; }).join(' · ');
      requestAnimationFrame(function () { bar.classList.add('is-on'); });
    } else {
      bar.classList.remove('is-on');
      setTimeout(function () { if (!cart.length) bar.hidden = true; }, 500);
    }
    document.body.classList.toggle('has-combo', n > 0 && window.innerWidth <= 760);
  }
  $('#cartBody').addEventListener('click', function (e) {
    var per = e.target.closest('[data-per]');
    if (per && !per.disabled) {
      var it = cart.find(function (x) { return x.id === per.getAttribute('data-id'); });
      if (it) { it.meses = +per.getAttribute('data-per'); saveCart(); }
    }
    var rm = e.target.closest('[data-rm]');
    if (rm) removeFromCart(rm.getAttribute('data-rm'));
    if (e.target.closest('[data-close-cart]')) closeCart();
  });
  var comprobanteInput = $('#cartComprobante');
  comprobanteInput.addEventListener('change', function () {
    var f = this.files[0], txt = $('#cartUploadedTxt');
    if (f) { txt.hidden = false; txt.innerHTML = '<svg><use href="#i-check"/></svg> ' + esc(f.name); }
    else { txt.hidden = true; txt.textContent = ''; }
  });

  $('#cartSend').addEventListener('click', function () {
    var btn = this, label = $('span', btn), original = label.textContent;
    var texto = cartMessage(), file = comprobanteInput.files[0];

    function abrirWhatsApp() { window.open(M3K.waLink(texto), '_blank', 'noopener'); }

    /* Cuando el navegador no puede pasarle la foto directo a WhatsApp (pasa
       siempre en computadora: es una regla de seguridad de todos los
       navegadores, ninguna web la puede saltar), la descargamos sola justo
       antes de abrir el chat para que solo haya que arrastrarla ahí. */
    function descargarComprobante() {
      if (!file) return;
      var url = URL.createObjectURL(file);
      var ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
      var a = document.createElement('a');
      a.href = url; a.download = 'Comprobante-Mikaela3K' + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Descargamos tu comprobante: arrástralo al chat que se acaba de abrir.');
    }

    var puedeCompartirArchivo = false;
    if (file && window.navigator && navigator.share && navigator.canShare) {
      try { puedeCompartirArchivo = navigator.canShare({ files: [file] }); } catch (e) { puedeCompartirArchivo = false; }
    }

    if (puedeCompartirArchivo) {
      btn.disabled = true; label.textContent = 'Abriendo…';
      navigator.share({ text: texto, files: [file] }).then(function () {
        toast('¡Listo! Revisa que tu comprobante haya llegado a Mikaela.');
      }).catch(function (err) {
        if (!err || err.name !== 'AbortError') { descargarComprobante(); abrirWhatsApp(); }
      }).then(function () { btn.disabled = false; label.textContent = original; });
      return;
    }

    descargarComprobante();
    abrirWhatsApp();
  });
  window.addEventListener('resize', function () { document.body.classList.toggle('has-combo', cart.length > 0 && window.innerWidth <= 760); });

  /* ---------- Televisor ---------- */
  (function tv() {
    var i = 0, timer = null, visible = true, hover = false, pausedUntil = 0;
    var DUR = 4200;
    var screen = $('#tvScreen'), wrap = $('#tvChannel'), canvas = $('#tvStatic'), ctx = canvas.getContext('2d');
    var prog = $('#tvProgress'), addBtn = $('#tvAdd');
    prog.style.setProperty('--dur', DUR + 'ms');
    $('.tv__dial small').textContent = '/ ' + P.length;

    function channelHTML(p) {
      var alt = p.p3 ? (p.regalo ? '3 meses: ' + p.p3 + ' Bs + 1 de regalo' : '3 meses: ' + p.p3 + ' Bs') : (p.nota || 'Plan mensual');
      return '<div class="ch' + (p.nombre.length > 10 ? ' is-long' : '') + '" style="--brand:' + p.color + '">' +
        '<p class="ch__cat">' + esc(M3K.nombreCat(p.cat)) + '</p>' +
        '<h3 class="ch__name">' + esc(p.nombre) + '</h3>' +
        '<p class="ch__desc">' + esc(p.desc) + '</p>' +
        '<div class="ch__row"><span class="ch__price"><b>' + p.p1 + '</b> Bs / mes</span><span class="ch__alt">' + esc(alt) + '</span></div>' +
      '</div>';
    }
    function noise() {
      var w = canvas.width, h = canvas.height, img = ctx.createImageData(w, h), d = img.data;
      for (var k = 0; k < d.length; k += 4) {
        var v = Math.random() * 255 | 0;
        d[k] = v * .75; d[k + 1] = v; d[k + 2] = v * .95; d[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function paint(p, glitch) {
      wrap.innerHTML = channelHTML(p);
      if (glitch) wrap.firstChild.classList.add('is-glitch');
      $('#tvOsd').textContent = 'CH ' + chNum(p);
      $('#tvNum').textContent = chNum(p);
      syncTvAdd();
    }
      M3K.ui.tvRefrescar = function () { paint(P[i]); };
  function syncTvAdd() {
      var on = inCart(P[i].id);
      addBtn.classList.toggle('is-added', on);
      addBtn.querySelector('span').textContent = on ? 'En tu combo' : 'Agregar a mi combo';
      addBtn.setAttribute('aria-label', (on ? 'Quitar ' : 'Agregar ') + P[i].nombre + (on ? ' del combo' : ' a mi combo'));
    }
    M3K.ui.syncTvAdd = syncTvAdd;
    function restartProgress() {
      prog.classList.remove('is-run'); void prog.offsetWidth;
      if (!reduced) prog.classList.add('is-run');
    }
    function go(to) {
      i = (to + P.length) % P.length;
      if (reduced) { paint(P[i]); schedule(); return; }
      canvas.classList.add('is-on');
      var start = performance.now(), swapped = false;
      (function frame(now) {
        noise();
        if (!swapped && now - start > 110) { swapped = true; paint(P[i], true); }
        if (now - start < 260) requestAnimationFrame(frame);
        else canvas.classList.remove('is-on');
      })(start);
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      restartProgress();
      timer = setTimeout(function () {
        if (!visible || hover || document.hidden || Date.now() < pausedUntil) { schedule(); return; }
        go(i + 1);
      }, DUR);
    }
    function userGo(to) { pausedUntil = Date.now() + 9000; go(to); }
    M3K.ui.tvTune = function (id) { var k = P.findIndex(function (p) { return p.id === id; }); if (k >= 0) userGo(k); };

    $('#tvPrev').addEventListener('click', function () { userGo(i - 1); });
    $('#tvNext').addEventListener('click', function () { userGo(i + 1); });
    addBtn.addEventListener('click', function () { toggleCart(P[i].id, addBtn); });
    screen.addEventListener('mouseenter', function () { hover = true; });
    screen.addEventListener('mouseleave', function () { hover = false; });
    screen.addEventListener('click', function () { focusTile(P[i].id); });
    screen.style.cursor = 'pointer';
    screen.title = 'Ver en el catálogo';

    var sx = null;
    screen.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    screen.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) userGo(i + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('keydown', function (e) {
      if (!visible || /input|textarea/i.test((document.activeElement || {}).tagName || '')) return;
      if (cartEl.classList.contains('is-open') || !$('#lightbox').hidden || (M3K.mika && M3K.mika.isOpen())) return;
      if (e.key === 'ArrowRight') userGo(i + 1);
      if (e.key === 'ArrowLeft') userGo(i - 1);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .25 }).observe(screen);
    }
    paint(P[0]);
    M3K.ui.tvStart = function () { M3K.ui.tvStart = null; schedule(); };
  })();

  /* ---------- Gustos ---------- */
  var mood = null;
  $('#moods').innerHTML = M3K.gustos.map(function (g) { return '<button type="button" class="mood" data-mood="' + g.id + '">' + esc(g.nombre) + '</button>'; }).join('');
  $('#moods').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mood]');
    if (!b) return;
    var id = b.getAttribute('data-mood');
    setMood(mood === id ? null : id, true);
  });
  function setMood(id, scroll) {
    mood = id;
    $$('.mood').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-mood') === id); });
    var g = M3K.gustos.find(function (x) { return x.id === id; });
    $('#moodNote').hidden = !g;
    if (g) {
      $('#moodName').textContent = g.nombre.toLowerCase();
      cat = 'todo';
      paintTabs();
      if (M3K.ui.tvTune) M3K.ui.tvTune(g.ids[0]);
    }
    applyFilter();
    if (scroll && g) scrollToGrid();
  }
  function scrollToGrid() {
    var g = document.getElementById('grid');
    var y = g.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - document.getElementById('catBar').offsetHeight - 14;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }
  M3K.ui.setMood = setMood;
  $('#moodClear').addEventListener('click', function () { setMood(null); });

  /* ---------- Marquesina ---------- */
  (function marquee() {
    var names = P.map(function (p) { return p.nombre; });
    var star = '<svg><use href="#i-spark"/></svg>';
    var html = function (list) { return list.map(function (n) { return '<span>' + esc(n) + star + '</span>'; }).join(''); };
    var t1 = $('#mq1'), t2 = $('#mq2');
    var half = names.slice(0, 8), rest = names.slice(8);
    t1.innerHTML = html(names) + html(names);
    t2.innerHTML = html(rest.concat(half)) + html(rest.concat(half));
    if (reduced) return;
    var x1 = 0, x2 = 0, boost = 0, lastY = window.scrollY, on = true;
    window.addEventListener('scroll', function () { var y = window.scrollY; boost = Math.min(18, boost + Math.abs(y - lastY) * .06); lastY = y; }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { on = e[0].isIntersecting; }).observe($('.marquee'));
    (function loop() {
      if (on) {
        var w1 = t1.scrollWidth / 2, w2 = t2.scrollWidth / 2, sp = .55 + boost;
        x1 -= sp; x2 += sp;
        if (-x1 >= w1) x1 += w1;
        if (x2 >= 0) x2 -= w2;
        t1.style.transform = 'translate3d(' + x1 + 'px,0,0)';
        t2.style.transform = 'translate3d(' + x2 + 'px,0,0)';
        boost *= .92;
      }
      requestAnimationFrame(loop);
    })();
    x2 = -t2.scrollWidth / 2;
  })();

  /* ---------- Catálogo ---------- */
  var cat = 'todo';
  var grid = $('#grid');

  function paintTabs() {
    $('#tabs').innerHTML = M3K.categorias.map(function (c) {
      var n = c.id === 'todo' ? P.length : P.filter(function (p) { return p.cat === c.id; }).length;
      return '<button type="button" class="tab" role="tab" data-cat="' + c.id + '" aria-selected="' + (c.id === cat) + '">' + esc(c.nombre) + '<b>' + n + '</b></button>';
    }).join('');
  }
  paintTabs();
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.getAttribute('data-cat');
    if (mood) { mood = null; $$('.mood').forEach(function (m) { m.classList.remove('is-on'); }); $('#moodNote').hidden = true; }
    paintTabs();
    applyFilter();
    var top = $('#catBar').getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * .5) scrollToGrid();
  });

  function unitHTML(p) {
    var three = periodo === 3 && p.p3;
    return 'Bs<b>/ ' + (three ? '3 meses' : 'mes') + '</b>';
  }
  function chipsHTML(p) {
    var libre = (M3K.stock || {})[p.id + '_' + (periodo === 3 && p.p3 ? 3 : 1)] || 0;
    var stock = libre > 0 ? '<span class="chip chip--stock"><svg><use href="#i-check"/></svg>Al instante</span>' : '';
    if (periodo === 3) {
      if (!p.p3) return '<span class="chip chip--mute">Solo plan mensual</span>';
      var c = '';
      if (p.regalo) c += '<span class="chip chip--gift">+1 mes de regalo</span>';
      if (M3K.ahorro(p) > 0) c += '<span class="chip">Ahorras ' + M3K.ahorro(p) + ' Bs</span>';
      return stock + c;
    }
    if (p.nota) return stock + '<span class="chip">' + esc(p.nota) + '</span>';
    if (p.p3) return stock + '<span class="chip chip--mute">3 meses: ' + p.p3 + ' Bs' + (p.regalo ? ' + 1 gratis' : '') + '</span>';
    return '';
  }
  grid.innerHTML = P.map(function (p) {
    return '<article class="tile" id="tile-' + p.id + '" data-id="' + p.id + '" data-cat="' + p.cat + '" style="--brand:' + p.color + '">' +
      '<div class="tile__top"><span><i></i>CH ' + chNum(p) + '</span><span>' + esc(M3K.nombreCat(p.cat)) + '</span></div>' +
      '<h3 class="tile__name">' + esc(p.nombre) + '</h3>' +
      '<p class="tile__desc">' + esc(p.desc) + '</p>' +
      '<div class="chips">' + chipsHTML(p) + '</div>' +
      '<div class="tile__foot">' +
        '<div class="price"><span class="price__n" data-n="' + p.p1 + '">' + p.p1 + '</span><span class="price__u">' + unitHTML(p) + '</span></div>' +
        '<button type="button" class="add" data-add="' + p.id + '" aria-label="Agregar ' + esc(p.nombre) + ' a mi combo"><svg><use href="#i-plus"/></svg></button>' +
      '</div>' +
    '</article>';
  }).join('');

  function applyFilter() {
    var g = mood && M3K.gustos.find(function (x) { return x.id === mood; });
    var k = 0;
    $$('.tile', grid).forEach(function (t) {
      var show = g ? g.ids.indexOf(t.getAttribute('data-id')) >= 0 : (cat === 'todo' || t.getAttribute('data-cat') === cat);
      t.classList.toggle('is-hidden', !show);
      if (show && !reduced) {
        t.style.setProperty('--d', (k++ * 0.045) + 's');
        t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
      }
    });
  }

  function rollNumber(el, to) {
    var from = +el.getAttribute('data-n');
    el.setAttribute('data-n', to);
    if (reduced || from === to) { el.textContent = to; return; }
    var t0 = performance.now(), D = 650;
    (function f(now) {
      var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  var periodEl = $('.period');
  $$('button', periodEl).forEach(function (b) {
    b.addEventListener('click', function () {
      periodo = +b.getAttribute('data-meses');
      periodEl.setAttribute('data-meses', periodo);
      $$('button', periodEl).forEach(function (x) { x.setAttribute('aria-checked', x === b); });
      P.forEach(function (p) {
        var t = document.getElementById('tile-' + p.id);
        rollNumber($('.price__n', t), M3K.precio(p, periodo));
        $('.price__u', t).innerHTML = unitHTML(p);
        $('.chips', t).innerHTML = chipsHTML(p);
      });
    });
  });

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (b) toggleCart(b.getAttribute('data-add'), b);
  });
  if (finePointer) {
    grid.addEventListener('pointermove', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  function syncButtons() {
    $$('.add', grid).forEach(function (b) {
      var id = b.getAttribute('data-add'), on = inCart(id), p = M3K.buscar(id);
      b.classList.toggle('is-on', on);
      b.innerHTML = '<svg><use href="#i-' + (on ? 'check' : 'plus') + '"/></svg>';
      b.setAttribute('aria-label', (on ? 'Quitar ' : 'Agregar ') + p.nombre + (on ? ' del combo' : ' a mi combo'));
      b.closest('.tile').classList.toggle('is-in-cart', on);
    });
    if (M3K.ui.syncTvAdd) M3K.ui.syncTvAdd();
    if (M3K.mika && M3K.mika.syncButtons) M3K.mika.syncButtons();
  }

  function focusTile(id) {
    if (mood) setMood(null);
    var p = M3K.buscar(id);
    if (cat !== 'todo' && p.cat !== cat) { cat = 'todo'; paintTabs(); applyFilter(); }
    var t = document.getElementById('tile-' + id);
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    t.animate([{ boxShadow: '0 0 0 0 rgba(93,193,185,.0)' }, { boxShadow: '0 0 0 6px rgba(93,193,185,.45)' }, { boxShadow: '0 0 0 0 rgba(93,193,185,0)' }], { duration: 1400, delay: 400, easing: 'ease-out' });
  }
  M3K.ui.focusTile = focusTile;

  /* ---------- Tutoriales ---------- */
  (function tutoriales() {
    var grid = $('#tutosGrid');
    if (!grid) return;
    grid.innerHTML = M3K.tutoriales.map(function (t) {
      var vid = 'tutoVideo-' + t.id;
      return '<article class="tuto">' +
        '<div class="tuto__frame">' +
          '<video class="tuto__video" id="' + vid + '" poster="' + t.poster + '" controls playsinline preload="metadata" muted>' +
            '<source src="' + t.video + '" type="video/mp4">' +
          '</video>' +
          '<button type="button" class="tuto__play" data-play="' + vid + '" aria-label="Reproducir"><svg><use href="#i-play"/></svg></button>' +
          '<button type="button" class="tuto__ampliar" data-ampliar="' + vid + '" aria-label="Ver en grande"><svg><use href="#i-expand"/></svg></button>' +
        '</div>' +
        '<p class="tuto__cap">' + esc(t.titulo) + '</p>' +
      '</article>';
    }).join('');

    /* "Ver en grande": el mismo <video> se muda a un recuadro grande sobre
       la página (sin pedirle permiso de pantalla completa al navegador,
       que algunos celulares y navegadores restringen). Sigue sonando y
       reproduciendo tal cual estaba. */
    var videoLb = $('#videoLb'), videoLbStage = $('#videoLbStage');
    var lbOrigenPadre = null, lbOrigenSiguiente = null;
    function agrandar(v) {
      lbOrigenPadre = v.parentNode; lbOrigenSiguiente = v.nextSibling;
      videoLbStage.appendChild(v);
      videoLb.hidden = false;
      requestAnimationFrame(function () { videoLb.classList.add('is-on'); });
      document.body.classList.add('is-locked');
      v.muted = false;
      v.play().catch(function () {});
    }
    function cerrarAgrandado() {
      var v = videoLbStage.firstElementChild;
      if (v && lbOrigenPadre) lbOrigenPadre.insertBefore(v, lbOrigenSiguiente);
      videoLb.classList.remove('is-on');
      document.body.classList.remove('is-locked');
      setTimeout(function () { videoLb.hidden = true; }, 350);
    }
    $('#videoLbClose').addEventListener('click', cerrarAgrandado);
    videoLb.addEventListener('click', function (e) { if (e.target === videoLb) cerrarAgrandado(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !videoLb.hidden) cerrarAgrandado(); });

    grid.addEventListener('click', function (e) {
      var amp = e.target.closest('[data-ampliar]');
      if (amp) { agrandar(document.getElementById(amp.getAttribute('data-ampliar'))); return; }
      var play = e.target.closest('[data-play]');
      if (play) {
        var v2 = document.getElementById(play.getAttribute('data-play'));
        v2.muted = false;
        v2.play().catch(function () {});
        play.closest('.tuto__frame').classList.add('is-playing');
      }
    });

    Array.prototype.forEach.call($$('.tuto__video'), function (v) {
      v.addEventListener('play', function () { var f = v.closest('.tuto__frame'); if (f) f.classList.add('is-playing'); });
      v.addEventListener('pause', function () { var f = v.closest('.tuto__frame'); if (f) f.classList.remove('is-playing'); });
    });
  })();

  /* ---------- Cartelera + visor ---------- */
  var rail = $('#rail');
  function srcset(pr) {
    var portrait = pr.h > pr.w;
    return pr.img + '-sm.webp ' + (portrait ? 520 : 720) + 'w, ' + pr.img + '.webp ' + pr.w + 'w';
  }
  rail.innerHTML = M3K.promos.map(function (pr, k) {
    var portrait = pr.h > pr.w;
    return '<figure class="poster" tabindex="0" role="button" data-lb="' + k + '" aria-label="Ver promo: ' + esc(pr.titulo) + '" style="aspect-ratio:' + pr.w + '/' + pr.h + '">' +
      '<img src="' + pr.img + '-sm.webp" srcset="' + srcset(pr) + '" sizes="' + (portrait ? '(max-width: 760px) 170px, 290px' : '(max-width: 760px) 460px, 800px') + '" alt="Promoción de Mikaela 3K: ' + esc(pr.titulo) + '" width="' + pr.w + '" height="' + pr.h + '" loading="lazy" draggable="false">' +
      '<figcaption>' + esc(pr.titulo) + '<span>Ver</span></figcaption>' +
    '</figure>';
  }).join('');

  (function drag() {
    var down = false, moved = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-drag'); }
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; setTimeout(function () { rail.classList.remove('is-drag'); }, 0); });
    rail.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; return; }
      var f = e.target.closest('[data-lb]');
      if (f) openLb(+f.getAttribute('data-lb'));
    });
    rail.addEventListener('keydown', function (e) {
      var f = e.target.closest('[data-lb]');
      if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLb(+f.getAttribute('data-lb')); }
    });
  })();

  var lb = $('#lightbox'), lbI = 0, lastFocus = null;
  function paintLb() {
    var pr = M3K.promos[lbI];
    $('#lbImg').src = pr.img + '.webp';
    $('#lbImg').alt = 'Promoción: ' + pr.titulo;
    $('#lbCap').textContent = pr.titulo + ' · ' + (lbI + 1) + '/' + M3K.promos.length;
    $('#lbDown').href = pr.img + '.jpg';
    $('#lbDown').setAttribute('download', 'Mikaela3K-' + pr.id + '.jpg');
  }
  function openLb(k) {
    lastFocus = document.activeElement;
    lbI = k; paintLb();
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add('is-on'); });
    document.body.classList.add('is-locked');
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.classList.remove('is-on');
    document.body.classList.remove('is-locked');
    setTimeout(function () { lb.hidden = true; }, 300);
    if (lastFocus) lastFocus.focus();
  }
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { lbI = (lbI - 1 + M3K.promos.length) % M3K.promos.length; paintLb(); });
  $('#lbNext').addEventListener('click', function () { lbI = (lbI + 1) % M3K.promos.length; paintLb(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!lb.hidden) closeLb();
      else if (cartEl.classList.contains('is-open')) closeCart();
      else if (menu.classList.contains('is-open')) setMenu(false);
    }
    if (!lb.hidden && e.key === 'ArrowRight') $('#lbNext').click();
    if (!lb.hidden && e.key === 'ArrowLeft') $('#lbPrev').click();
  });

  /* ---------- Copiar ---------- */
  function copy(text) {
    var ok = function () { toast('Copiado: ' + text); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(ok, fallback); }
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast(text); }
      ta.remove();
    }
  }
  $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy')); }); });

  /* ---------- Kit de flyers ---------- */
  $('#kit').innerHTML = M3K.promos.map(function (pr) {
    return '<div class="kitem" data-reveal>' +
      '<img src="' + pr.img + '-sm.webp" alt="Flyer: ' + esc(pr.titulo) + '" loading="lazy" width="' + (pr.h > pr.w ? 520 : 720) + '" height="' + Math.round((pr.h > pr.w ? 520 : 720) * pr.h / pr.w) + '">' +
      '<span>' + esc(pr.titulo) + '</span>' +
      '<a href="' + pr.img + '.jpg" download="Mikaela3K-' + pr.id + '.jpg"><svg><use href="#i-down"/></svg> Descargar</a>' +
    '</div>';
  }).join('');

  /* ---------- Preguntas ---------- */
  var best3 = P.filter(function (p) { return p.p3; }).sort(function (a, b) { return M3K.ahorro(b) - M3K.ahorro(a); })[1];
  var FAQ = [
    ['¿Cómo recibo mi cuenta?', 'De dos formas. Con saldo: recargas, compras en la web y los datos de acceso aparecen al instante en tu cuenta (si justo no hay stock, queda en camino y soporte te lo resuelve). O por WhatsApp: armas tu combo, pagas con el QR y envías tu comprobante con el nombre para tu perfil.'],
    ['¿Cómo pago?', 'Con el QR de Altoke, en bolivianos, desde la app de tu banco. En la opción de referencia coloca «Varios» y luego mándanos tu comprobante por WhatsApp.'],
    ['¿En qué dispositivos lo puedo ver?', 'En tu TV, celular, tablet y más. Si tienes dudas con tu equipo, pregúntanos antes de pagar y te decimos si es compatible.'],
    ['¿Conviene el plan de 3 meses?', 'Casi siempre sale más barato. Por ejemplo, ' + best3.nombre + ' te cuesta ' + best3.p3 + ' Bs por 3 meses en vez de ' + (best3.p1 * 3) + ' Bs pagando mes a mes. Y en TV por cable (Flujo TV, Zona Movie TV y Oleada TV) el plan de 3 meses trae 1 mes de regalo.'],
    ['¿Qué incluye YouTube Premium?', 'Videos sin anuncios y reproducción en segundo plano. Te damos la cuenta con el correo incluido y la activación es instantánea.'],
    ['¿Spotify Premium es con mi correo?', 'Sí. Spotify Premium es renovable con tu propio correo, así no pierdes tus listas.'],
    ['¿Y si tengo un problema con mi cuenta?', 'Escríbenos por WhatsApp: el soporte es personalizado y te ayudamos directo por el chat.'],
    ['¿Puedo revender?', 'Sí. Postula en la sección «Hazte revendedor»: cuando Mikaela aprueba tu cuenta, ves tus precios de revendedor y compras con tu saldo al instante.'],
    ['¿Qué es el saldo?', 'Es plata que dejas cargada en tu cuenta de la web. Recargas una vez con el QR y después compras en un toque, sin esperar a que nadie te responda. Si algo falla, escribes a soporte y se resuelve.']
  ];
  $('#faq').innerHTML = FAQ.map(function (f, k) {
    return '<div class="acc__item" data-reveal><button type="button" class="acc__q" aria-expanded="false" aria-controls="faq-' + k + '" id="faqq-' + k + '">' + esc(f[0]) + '<i aria-hidden="true"></i></button>' +
      '<div class="acc__a" id="faq-' + k + '" role="region" aria-labelledby="faqq-' + k + '"><div><p>' + esc(f[1]) + '</p></div></div></div>';
  }).join('');
  $('#faq').addEventListener('click', function (e) {
    var q = e.target.closest('.acc__q');
    if (!q) return;
    var open = q.getAttribute('aria-expanded') === 'true';
    $$('.acc__q', $('#faq')).forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
    q.setAttribute('aria-expanded', !open);
  });

  /* ---------- Aparición al hacer scroll ---------- */
  var groups = ['#steps > li', '.rsteps > li', '#kit > .kitem', '#faq > .acc__item'];
  groups.forEach(function (sel) { $$(sel).forEach(function (el, k) { el.style.setProperty('--d', (k * 0.07) + 's'); }); });
  if ('IntersectionObserver' in window && !reduced) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach(function (el) { ro.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Botones magnéticos ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .32) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* Abrir a Mika desde cualquier enlace */
  $$('[data-open-mika]').forEach(function (b) { b.addEventListener('click', function () { if (M3K.mika) M3K.mika.open(); }); });

  M3K.ui.scrollTo = function (sel) {
    var el = $(sel);
    if (!el) return;
    if (window.innerWidth <= 760 && M3K.mika) M3K.mika.close();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  M3K.ui.repintarPrecios = function () {
    P.forEach(function (p) {
      var t = document.getElementById('tile-' + p.id);
      if (!t) return;
      rollNumber($('.price__n', t), M3K.precio(p, periodo));
      $('.price__u', t).innerHTML = unitHTML(p);
      $('.chips', t).innerHTML = chipsHTML(p);
    });
    renderCart();
    if (M3K.ui.tvRefrescar) M3K.ui.tvRefrescar();
  };
  M3K.cart.vaciar = function (ids) {
    cart = ids ? cart.filter(function (it) { return ids.indexOf(it.id) < 0; }) : [];
    saveCart();
  };
  M3K.cart.nombrePerfil = function () { return $('#profileName').value.trim(); };

  renderCart();
  syncButtons();
})();
