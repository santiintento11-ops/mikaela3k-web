/* ==========================================================================
   Mika — asistente de Mikaela 3K
   Entiende preguntas en lenguaje natural y responde SOLO con los datos del
   catálogo (datos.js). Lo que no sabe, lo deriva a WhatsApp: nunca inventa.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var P = M3K.plataformas;
  var N = M3K.negocio;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var panel = $('#mika'), log = $('#mikaLog'), form = $('#mikaForm'), input = $('#mikaInput'), chipsEl = $('#mikaChips'), fab = $('#mikaFab');
  var state = { open: false, started: false, lastIds: [], lastMeses: 1, busy: false };

  /* ---------------- Lenguaje ---------------- */
  var SLANG = { q: 'que', k: 'que', xq: 'porque', pq: 'porque', porq: 'porque', tmb: 'tambien', tb: 'tambien', dnd: 'donde', cn: 'con', x: 'por', xfa: 'porfa', pls: 'porfa', bls: 'bs', bs: 'bs' };
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9+\s]/g, ' ').replace(/\s+/g, ' ').trim()
      .split(' ').map(function (w) { return SLANG[w] || w; }).join(' ');
  }
  function hasWord(n, list) { var s = ' ' + n + ' '; return list.some(function (w) { return s.indexOf(' ' + w + ' ') >= 0; }); }
  function hasStem(n, list) { var s = ' ' + n; return list.some(function (w) { return s.indexOf(' ' + w) >= 0; }); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var m = [], i, j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;
    for (i = 1; i <= b.length; i++) for (j = 1; j <= a.length; j++)
      m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[b.length][a.length];
  }

  function detectPlatforms(n) {
    var s = ' ' + n + ' ', found = [];
    P.forEach(function (p) {
      var at = -1;
      p.alias.forEach(function (a) { var k = s.indexOf(' ' + a + ' '); if (k >= 0 && (at < 0 || k < at)) at = k; });
      if (at < 0) {
        n.split(' ').forEach(function (tok, ti) {
          if (tok.length < 5) return;
          p.alias.forEach(function (a) {
            if (a.indexOf(' ') >= 0 || a.length < 6) return;
            var tol = a.length >= 9 ? 2 : 1;
            if (lev(tok, a) <= tol && at < 0) at = s.indexOf(' ' + tok + ' ');
          });
        });
      }
      if (at >= 0) found.push({ id: p.id, at: at });
    });
    return found.sort(function (a, b) { return a.at - b.at; }).map(function (f) { return f.id; });
  }
  function detectMeses(n) {
    if (/\b(3|tres) ?mes/.test(n) || hasStem(n, ['trimestr'])) return 3;
    if (/\b(1|un|uno) ?mes\b/.test(n) || hasStem(n, ['mensual'])) return 1;
    return 0;
  }
  function detectBudget(n, ids) {
    var m = n.match(/\b(\d{2,4})\b/);
    if (!m) return 0;
    var v = +m[1];
    if (v < 5 || v > 3000) return 0;
    var cue = hasWord(n, ['tengo', 'con', 'hasta', 'maximo', 'presupuesto', 'gastar', 'solo', 'nomas']) || hasStem(n, ['alcanz', 'presupuest']);
    var money = hasWord(n, ['bs', 'bolivianos', 'pesos']);
    if (cue || (money && !ids.length)) return v;
    return 0;
  }

  var GENRES = [
    { k: ['anime', 'animes', 'otaku', 'manga', 'one piece', 'naruto', 'dragon ball', 'goku', 'demon slayer', 'jujutsu'], ids: ['crunchyroll'], label: 'anime' },
    { k: ['dorama', 'doramas', 'kdrama', 'k drama', 'kdramas', 'coreana', 'coreanas', 'coreano', 'coreanos', 'dramas cortos', 'drama corto', 'series cortas', 'novelas cortas', 'tiktok', 'tik tok', 'chinas', 'chinos', 'cdrama', 'c drama', 'asiaticas', 'asiaticos'], ids: ['iqiyi'], label: 'doramas y dramas cortos' },
    { k: ['novela', 'novelas', 'telenovela', 'telenovelas', 'mexicanas', 'en espanol', 'latinas'], ids: ['vix'], label: 'novelas' },
    { k: ['marvel', 'pixar', 'star wars', 'princesas', 'avengers', 'mandalorian', 'dibujos', 'infantil', 'infantiles', 'ninos', 'nino', 'ninas', 'hijos', 'peques'], ids: ['disney', 'netflix'], label: 'Marvel, Pixar y los peques' },
    { k: ['musica', 'canciones', 'cancion', 'escuchar', 'podcast', 'podcasts', 'playlist', 'playlists', 'reggaeton', 'cumbia'], ids: ['spotify', 'youtube'], label: 'música' },
    { k: ['anuncios', 'sin anuncios', 'segundo plano', 'publicidad'], ids: ['youtube'], label: 'YouTube sin anuncios' },
    { k: ['canales', 'canal', 'tv en vivo', 'en vivo', 'cable', 'television', 'tele', 'futbol', 'partidos', 'deportes', 'noticias'], ids: ['flujo', 'zonamovie', 'oleada'], label: 'canales de TV', tv: true },
    { k: ['editar', 'edicion', 'editor', 'edito', 'tiktoker', 'creador', 'creadora', 'reels', 'montaje', 'crear contenido'], ids: ['capcut'], label: 'crear contenido' },
    { k: ['estudiar', 'estudio', 'tareas', 'tarea', 'universidad', 'colegio', 'trabajo', 'trabajar', 'inteligencia artificial', 'ia', 'escribir', 'programar', 'resumen', 'resumenes', 'ensayos'], ids: ['chatgpt', 'gemini'], label: 'estudiar y trabajar con IA' },
    { k: ['series', 'serie', 'peliculas', 'pelicula', 'pelis', 'peli', 'estrenos', 'cine', 'terror', 'accion', 'comedia', 'romance', 'documentales'], ids: ['netflix', 'hbo', 'prime', 'paramount', 'disney'], label: 'series y películas' }
  ];
  function detectGenres(n) { return GENRES.filter(function (g) { return hasWord(n, g.k); }); }

  var OTRAS = ['star+', 'star plus', 'apple tv', 'apple music', 'deezer', 'canva', 'directv', 'dgo', 'pluto', 'mubi', 'tidal', 'amazon music', 'office', 'microsoft', 'duolingo', 'adobe', 'photoshop', 'copilot', 'midjourney', 'claude', 'perplexity', 'tigo play', 'tigo sports', 'fubo', 'espn', 'dazn'];

  /* ---------------- Cálculos ---------------- */
  var byId = M3K.buscar;
  var price = M3K.precio;
  function names(ids) {
    var n = ids.map(function (id) { return byId(id).nombre; });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0];
  }
  function bestCombo(B, m, must, pool) {
    must = must.filter(function (id) { return m === 1 || byId(id).p3; });
    var base = must.reduce(function (s, id) { return s + price(byId(id), m); }, 0);
    if (base > B) return null;
    var cand = (pool || P.filter(function (p) { return ['series', 'anime', 'musica', 'tv'].indexOf(p.cat) >= 0; }).map(function (p) { return p.id; }))
      .filter(function (id) { return must.indexOf(id) < 0 && (m === 1 || byId(id).p3); });
    var mustTv = must.some(function (id) { return byId(id).cat === 'tv'; });
    var best = { ids: [], cost: 0, rank: 0 };
    var L = cand.length;
    for (var mask = 0; mask < (1 << L); mask++) {
      var cost = 0, cnt = 0, tv = mustTv ? 1 : 0, rank = 0, ok = true, pick = [];
      for (var b = 0; b < L; b++) {
        if (!(mask & (1 << b))) continue;
        var p = byId(cand[b]);
        cost += price(p, m);
        if (p.cat === 'tv' && ++tv > 1) { ok = false; break; }
        if (cost + base > B) { ok = false; break; }
        cnt++; rank += P.length - P.indexOf(p); pick.push(cand[b]);
      }
      if (!ok) continue;
      if (cnt > best.ids.length || (cnt === best.ids.length && (rank > best.rank || (rank === best.rank && cost > best.cost)))) best = { ids: pick, cost: cost, rank: rank };
    }
    var ids = must.concat(best.ids);
    return { ids: ids, total: base + best.cost, rest: B - base - best.cost };
  }

  /* ---------------- Respuestas ---------------- */
  var CHIPS_BASE = ['Ver precios', 'Tengo 60 Bs, ¿qué me alcanza?', 'Me gusta el anime', '¿Netflix o Disney+?', '¿Cómo pago?', 'Quiero revender'];
  var wa = function (text, label, ghost) { return { wa: text, label: label || 'Escribir a Mikaela', ghost: !!ghost }; };

  function priceLine(p) {
    return '1 mes <b>' + p.p1 + ' Bs</b>' + (p.p3 ? ' · 3 meses <b>' + p.p3 + ' Bs</b>' : ' · solo mensual');
  }
  function extraLine(p, meses) {
    var bits = [];
    if (meses === 3 && !p.p3) bits.push(p.nombre + ' solo tiene plan mensual: ' + p.p1 + ' Bs.');
    if (p.p3 && p.regalo) bits.push('Por 3 meses pagas ' + p.p3 + ' Bs y te regalamos 1 mes más.');
    else if (p.p3 && M3K.ahorro(p) > 0) bits.push('Por 3 meses pagas ' + p.p3 + ' Bs en vez de ' + p.p1 * 3 + ': ahorras <b>' + M3K.ahorro(p) + ' Bs</b>.');
    else if (p.p3) bits.push('Por 3 meses son ' + p.p3 + ' Bs.');
    if (p.id === 'youtube') bits.push('Activación instantánea y te damos el correo incluido.');
    if (p.id === 'spotify') bits.push('Es renovable con tu propio correo.');
    return bits.join(' ');
  }

  function respond(raw) {
    var n = norm(raw);
    var ids = detectPlatforms(n);
    var meses = detectMeses(n);
    var budget = detectBudget(n, ids);
    var genres = detectGenres(n);
    var words = n.split(' ').filter(Boolean);
    var priceWords = hasWord(n, ['cuanto', 'precio', 'precios', 'cuesta', 'sale', 'vale', 'costo', 'cobran', 'tarifa', 'y en', 'y por', 'y el', 'y la']);

    /* combo */
    if (hasWord(n, ['mi combo', 'ver combo', 'ver mi combo', 'carrito', 'mi pedido', 'mi carrito'])) return comboReply();

    /* agregar */
    if (hasWord(n, ['agrega', 'agregalo', 'agregala', 'agregalos', 'agregame', 'anade', 'anadelo', 'anadela', 'sumalo', 'sumala', 'ponlo', 'ponla', 'ponme', 'lo quiero', 'la quiero', 'los quiero', 'lo compro', 'la compro', 'me lo llevo', 'quiero comprar', 'al combo', 'a mi combo'])) {
      var target = ids.length ? ids : state.lastIds;
      if (!target.length) return { parts: [{ p: '¿Qué plataforma te agrego? Escríbeme, por ejemplo, <b>«agrega Netflix por 3 meses»</b>.' }], chips: ['Agrega Netflix', 'Agrega Crunchyroll por 3 meses', 'Ver precios'] };
      var m = meses || state.lastMeses || 1;
      target.forEach(function (id) { M3K.cart.add(id, m); });
      state.lastIds = target;
      var t = M3K.cart.totals();
      return {
        parts: [{ p: 'Listo, sumé <b>' + esc(names(target)) + '</b> a tu combo' + (m === 3 ? ' por 3 meses' : ' por 1 mes') + '. Tu combo va en <b>' + t.total + ' Bs</b>.' }, { actions: [{ cart: true, label: 'Ver mi combo' }, { scroll: '#comprar', label: '¿Cómo pago?', ghost: true }] }],
        chips: ['¿Cómo pago?', '¿Qué más me recomiendas?', 'Ver mi combo']
      };
    }

    /* saludo */
    if (words.length <= 4 && !ids.length && hasWord(n, ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'hey', 'que tal', 'holi', 'ola', 'alo'])) {
      return { parts: [{ p: '¡Hola! Soy Mika. Te ayudo a elegir tu plataforma, te digo los precios y cómo pagar. ¿Qué te gustaría ver?' }], chips: CHIPS_BASE };
    }
    if (hasWord(n, ['gracias', 'muchas gracias', 'genial', 'perfecto', 'excelente', 'buenisimo', 'ok gracias', 'listo gracias', 'dale'])) {
      return { parts: [{ p: '¡Con gusto! Si necesitas algo más, aquí estoy.' }], chips: ['Ver mi combo', '¿Cómo pago?', 'Ver precios'] };
    }
    if (hasWord(n, ['quien eres', 'que eres', 'eres un bot', 'eres bot', 'eres ia', 'eres robot', 'eres real', 'eres humano', 'eres una persona'])) {
      return { parts: [{ p: 'Soy Mika, la asistente virtual de Mikaela 3K. Respondo al instante con los precios y datos oficiales de la tienda. Para algo que no sepa, te paso con Mikaela por WhatsApp.' }], chips: CHIPS_BASE };
    }

    /* revendedor */
    if (hasStem(n, ['revend', 'reventa', 'mayoris', 'distribuid']) || hasWord(n, ['por mayor', 'al por mayor', 'vender', 'revender', 'negocio', 'emprender', 'emprendimiento'])) {
      if (hasWord(n, ['que plataformas', 'cuales', 'que puedo', 'que cuentas', 'que servicios'])) {
        return {
          parts: [
            { p: 'Puedes vender las <b>' + P.length + ' plataformas</b> del catálogo:' },
            { p: M3K.categorias.filter(function (c) { return c.id !== 'todo'; }).map(function (c) { return '<b>' + esc(c.nombre) + '</b>: ' + esc(names(P.filter(function (p) { return p.cat === c.id; }).map(function (p) { return p.id; }))); }).join('<br>') },
            { p: 'Los precios por mayor te los pasa Mikaela por WhatsApp.' },
            { actions: [{ scroll: '#revendedores', label: 'Armar mi pedido por mayor' }, wa('Hola Mikaela 3K, quiero ser revendedor(a). ¿Me pasas tus precios por mayor?', 'Pedir precios', true)] }
          ],
          chips: ['¿Cómo pago?', 'Ver precios al público']
        };
      }
      return {
        parts: [
          { p: '¡Buenísimo! Así funciona para revendedores:' },
          { p: '1. Llenas el formulario de la <b>Zona revendedor</b>.<br>2. Mikaela te pasa los <b>precios por mayor</b> por WhatsApp.<br>3. Publicas nuestros flyers en tus estados.<br>4. Nos pides las cuentas de tus clientes.' },
          { actions: [{ scroll: '#revendedores', label: 'Ir a Zona revendedor' }, wa('Hola Mikaela 3K, quiero ser revendedor(a). ¿Me pasas tus precios por mayor?', 'Pedir precios por mayor')] }
        ],
        chips: ['¿Qué plataformas puedo vender?', '¿Cómo pago?']
      };
    }

    /* pago */
    if (hasStem(n, ['pago', 'pagar', 'pagas', 'pague', 'pagan', 'pagamos', 'qr', 'transfer', 'deposit', 'altoke', 'comprobante', 'banco', 'tarjeta', 'binance', 'efectivo', 'tigo money', 'yape']) || hasWord(n, ['paga', 'cuenta bancaria', 'numero de cuenta', 'a que cuenta'])) {
      var other = hasStem(n, ['tarjeta', 'binance', 'efectivo', 'tigo money', 'yape', 'paypal', 'cripto', 'usdt']);
      return {
        parts: [
          other ? { p: 'Por ahora el pago es con <b>QR de Altoke</b> en bolivianos. Si necesitas otra forma de pago, consúltalo con Mikaela por WhatsApp.' } : { p: 'Pagas con <b>QR de Altoke</b>, en bolivianos, desde la app de tu banco:' },
          { qr: true },
          { p: 'En la referencia coloca <b>Varios</b> y luego envía tu comprobante por WhatsApp junto con el nombre que quieres para tu perfil.' },
          { actions: [wa('Hola Mikaela 3K, te envío mi comprobante de pago. Nombre para mi perfil: ', 'Enviar comprobante'), { download: N.pago.qr, label: 'Guardar QR', ghost: true }] }
        ],
        chips: ['¿Cuánto tarda la activación?', 'Ver mi combo', 'Ver precios']
      };
    }

    /* persona / contacto */
    if (hasWord(n, ['humano', 'persona', 'asesor', 'asesora', 'hablar con', 'whatsapp', 'wasap', 'wsp', 'tu numero', 'su numero', 'numero de whatsapp', 'telefono', 'celular de', 'llamar', 'contacto', 'contactar'])) {
      return { parts: [{ p: 'Claro. Escríbele a Mikaela por WhatsApp al <b>' + N.whatsappVisible + '</b> y te atiende directo.' }, { actions: [wa('Hola Mikaela 3K, vengo de la página web. ' + raw, 'Abrir WhatsApp')] }], chips: ['Ver precios', '¿Cómo pago?'] };
    }

    /* cómo comprar / entrega */
    var delivery = hasWord(n, ['cuanto tarda', 'cuanto demora', 'demora', 'tarda', 'cuando me llega', 'como me llega', 'como recibo', 'entrega', 'activacion', 'activan', 'activar']);
    if (delivery || (!ids.length && hasWord(n, ['como compro', 'como funciona', 'como pido', 'como hago', 'como adquiero', 'pedir', 'hacer un pedido', 'como comprar']))) {
      return {
        parts: [
          { p: 'Es rapidito:' },
          { p: '1. Arma tu combo en la página.<br>2. Paga con el QR (referencia: <b>Varios</b>).<br>3. Manda tu comprobante y el nombre para tu perfil por WhatsApp.<br>4. Mikaela te pasa tus datos de acceso por el mismo chat.' },
          { p: 'YouTube Premium es de <b>activación instantánea</b>.' },
          { actions: [{ scroll: '#catalogo', label: 'Armar mi combo' }, { scroll: '#comprar', label: 'Ver el QR', ghost: true }] }
        ],
        chips: ['¿Cómo pago?', '¿Qué me recomiendas?', 'Ver precios']
      };
    }

    /* dispositivos / perfiles */
    if (hasWord(n, ['smart tv', 'smarttv', 'televisor', 'tv box', 'tvbox', 'chromecast', 'fire stick', 'firestick', 'roku', 'celular', 'celu', 'tablet', 'laptop', 'compu', 'computadora', 'pc', 'dispositivo', 'dispositivos', 'pantalla', 'pantallas', 'perfil', 'perfiles', 'compartir', 'cuantas personas', 'iphone', 'android'])) {
      var screens = hasWord(n, ['pantalla', 'pantallas', 'perfiles', 'compartir', 'cuantas personas']);
      return {
        parts: [
          { p: 'Puedes disfrutarlo en tu <b>TV, celular, tablet y más</b>.' + (screens ? ' Te armamos un perfil con el nombre que elijas; cuántas pantallas incluye cada plataforma te lo confirma Mikaela por WhatsApp.' : ' Si tienes dudas con tu equipo, pregunta antes de pagar y te decimos si es compatible.') },
          { actions: [wa('Hola Mikaela 3K, una consulta: ' + raw, 'Preguntar a Mikaela')] }
        ],
        chips: ['Ver precios', '¿Cómo pago?']
      };
    }

    /* problemas / confianza */
    if (hasWord(n, ['no funciona', 'no me funciona', 'se cayo', 'no entra', 'no puedo entrar', 'problema', 'error', 'falla', 'fallo', 'reclamo', 'se desconecto', 'me sacaron'])) {
      return { parts: [{ p: 'Lamento eso. El soporte es <b>personalizado</b>: escríbele a Mikaela con el nombre de tu plataforma y de tu perfil, y te ayuda directo por el chat.' }, { actions: [wa('Hola Mikaela 3K, tengo un problema con mi cuenta de ', 'Pedir ayuda')] }], chips: [] };
    }
    if (hasWord(n, ['garantia', 'garantizado', 'seguro', 'segura', 'confiable', 'confianza', 'estafa', 'es real', 'es seguro', 'soporte'])) {
      return { parts: [{ p: 'Todo es <b>100% garantizado</b> y el soporte es personalizado por WhatsApp. Pagas con QR y recibes tu cuenta por el mismo chat donde nos escribes.' }, { actions: [{ scroll: '#comprar', label: 'Ver cómo comprar' }] }], chips: ['¿Cómo pago?', 'Ver precios'] };
    }

    /* presupuesto */
    if (budget) {
      var m2 = meses || 1;
      var mustIds = ids.slice();
      var pool = null, gLabel = '';
      if (!mustIds.length && genres.length) {
        var g = genres[0];
        gLabel = g.label;
        var fit = g.ids.map(byId).filter(function (p) { return m2 === 1 || p.p3; }).sort(function (a, b) { return price(a, m2) - price(b, m2); });
        if (fit.length && price(fit[0], m2) <= budget) mustIds = [fit[0].id];
        if (g.ids.some(function (id) { return byId(id).cat === 'ia'; })) pool = P.map(function (p) { return p.id; });
      }
      var combo = bestCombo(budget, m2, mustIds, pool);
      var cheapest = P.filter(function (p) { return m2 === 1 || p.p3; }).sort(function (a, b) { return price(a, m2) - price(b, m2); })[0];
      if (!combo || !combo.ids.length) {
        if (mustIds.length && !combo) {
          var need = mustIds.reduce(function (s, id) { return s + price(byId(id), m2); }, 0);
          return { parts: [{ p: 'Con ' + budget + ' Bs no alcanza para ' + esc(names(mustIds)) + (m2 === 3 ? ' por 3 meses' : '') + ': necesitas <b>' + need + ' Bs</b>.' }, { cards: mustIds, meses: m2 }], chips: ['Lo más barato', '¿Y por 3 meses?'] };
        }
        return { parts: [{ p: 'Con ' + budget + ' Bs todavía no alcanza para un plan. Lo más económico es <b>' + cheapest.nombre + '</b> a ' + price(cheapest, m2) + ' Bs' + (m2 === 3 ? ' por 3 meses' : ' al mes') + '.' }, { cards: [cheapest.id], meses: m2 }], chips: ['Lo más barato', 'Ver precios'] };
      }
      state.lastIds = combo.ids; state.lastMeses = m2;
      var intro = 'Con <b>' + budget + ' Bs</b>' + (m2 === 3 ? ' en planes de 3 meses' : ' al mes') + (gLabel ? ' y pensando en ' + esc(gLabel) : '') + ' te alcanza para:';
      return {
        parts: [
          { p: intro },
          { cards: combo.ids, meses: m2 },
          { p: 'Total: <b>' + combo.total + ' Bs</b>' + (combo.rest > 0 ? ' · te sobran ' + combo.rest + ' Bs' : ' · justo tu presupuesto') + '.' },
          { actions: [{ add: combo.ids, meses: m2, label: 'Agregar todo al combo' }] }
        ],
        chips: m2 === 1 ? ['Tengo ' + (budget * 2) + ' Bs para 3 meses', '¿Cómo pago?', 'Me gusta el anime'] : ['¿Cómo pago?', 'Ver mi combo']
      };
    }

    /* plataformas que no están */
    var otra = OTRAS.find(function (o) { return hasWord(n, [o]); });
    if (otra && !ids.length) {
      return { parts: [{ p: '<b>' + esc(otra.replace(/\b\w/g, function (c) { return c.toUpperCase(); })) + '</b> no aparece en nuestro catálogo por ahora. Pregúntale a Mikaela por WhatsApp si lo puede conseguir.' }, { actions: [wa('Hola Mikaela 3K, ¿tienen ' + otra + '?', 'Preguntar por WhatsApp')] }], chips: ['Ver precios', '¿Qué me recomiendas?'] };
    }

    /* seguimiento: "¿y por 3 meses?" */
    var followUp = words.length <= 5 && (meses || hasWord(n, ['cuanto', 'y en', 'y por', 'cuesta', 'sale', 'vale', 'y ese', 'y esa'])) && !hasWord(n, ['precios', 'lista', 'conviene', 'ahorro', 'todo', 'catalogo']);
    if (!ids.length && state.lastIds.length && followUp && !genres.length) ids = state.lastIds.slice();

    /* una o varias plataformas */
    if (ids.length) {
      state.lastIds = ids; if (meses) state.lastMeses = meses;
      var mm = meses || 1;
      if (ids.length >= 2 && (hasWord(n, ['vs', 'versus', 'o', 'contra', 'diferencia', 'comparar', 'compara', 'comparame', 'mejor', 'cual', 'conviene', 'barato', 'barata']))) {
        var cheap1 = ids.slice().sort(function (a, b) { return byId(a).p1 - byId(b).p1; })[0];
        return {
          parts: [
            { p: 'Te lo pongo lado a lado:' },
            { table: ids },
            { p: 'La más económica al mes es <b>' + byId(cheap1).nombre + '</b>. ' + ids.map(function (id) { var p = byId(id); return '<b>' + p.nombre + '</b>: ' + esc(p.desc.replace(/\.$/, '')) + '.'; }).join(' ') },
            { cards: ids, meses: mm, compact: true }
          ],
          chips: ['Agrega ' + byId(ids[0]).nombre, 'Agrega ' + byId(ids[1]).nombre, '¿Cómo pago?']
        };
      }
      if (ids.length >= 2) {
        var t1 = ids.reduce(function (s, id) { return s + byId(id).p1; }, 0);
        var with3 = ids.filter(function (id) { return byId(id).p3; });
        var t3 = ids.reduce(function (s, id) { var p = byId(id); return s + (p.p3 || p.p1); }, 0);
        var sv = with3.reduce(function (s, id) { return s + M3K.ahorro(byId(id)); }, 0);
        var only1 = ids.filter(function (id) { return !byId(id).p3; });
        return {
          parts: [
            { p: esc(names(ids)) + ' juntas: <b>' + t1 + ' Bs al mes</b>.' + (with3.length ? ' En planes de 3 meses: <b>' + t3 + ' Bs</b>' + (sv > 0 ? ' (ahorras ' + sv + ' Bs)' : '') + (only1.length ? ', contando ' + esc(names(only1)) + ' por 1 mes' : '') + '.' : '') },
            { cards: ids, meses: mm },
            { actions: [{ add: ids, meses: mm, label: 'Agregar las ' + ids.length + ' al combo' }] }
          ],
          chips: ['¿Cómo pago?', 'Ver mi combo', '¿Qué más me recomiendas?']
        };
      }
      var p1 = byId(ids[0]);
      var lead = mm === 3 && p1.p3
        ? '<b>' + p1.nombre + '</b> por 3 meses te sale <b>' + p1.p3 + ' Bs</b>' + (p1.regalo ? ' y te regalamos 1 mes más.' : (M3K.ahorro(p1) > 0 ? ' (ahorras ' + M3K.ahorro(p1) + ' Bs frente a pagar mes a mes).' : '.'))
        : '<b>' + p1.nombre + '</b>: ' + esc(p1.desc) + ' ' + extraLine(p1, mm);
      return {
        parts: [{ p: lead }, { cards: [p1.id], meses: mm }],
        chips: [p1.p3 && mm !== 3 ? 'Agrégalo por 3 meses' : 'Agrégalo al combo', '¿Cómo pago?', '¿Qué más me recomiendas?']
      };
    }

    /* gustos */
    if (genres.length) {
      var gg = genres[0];
      state.lastIds = gg.ids.slice(0, 3);
      var list = gg.ids.map(byId);
      var cheapG = list.slice().sort(function (a, b) { return a.p1 - b.p1; })[0];
      var txt = list.length === 1
        ? 'Para ' + esc(gg.label) + ', lo tuyo es <b>' + list[0].nombre + '</b>: ' + esc(list[0].desc) + ' ' + extraLine(list[0], 1)
        : 'Para ' + esc(gg.label) + ' te recomiendo ' + esc(names(gg.ids)) + '. La más económica es <b>' + cheapG.nombre + '</b> a ' + cheapG.p1 + ' Bs al mes.';
      if (gg.tv && hasWord(n, ['futbol', 'partidos', 'deportes', 'noticias'])) txt += ' Qué canales trae cada una (por ejemplo deportes) te lo confirma Mikaela por WhatsApp.';
      var parts = [{ p: txt }, { cards: gg.ids, meses: 1 }];
      if (gg.tv) parts.push({ actions: [{ mood: 'canales', label: 'Ver en el catálogo' }, wa('Hola Mikaela 3K, ¿qué canales incluye Flujo TV, Zona Movie TV y Oleada TV?', 'Preguntar canales')] });
      return { parts: parts, chips: ['Tengo 60 Bs, ¿qué me alcanza?', '¿Cómo pago?', 'Ver precios'] };
    }

    /* recomendación sin datos */
    if (hasStem(n, ['recomien', 'recomend', 'sugier', 'suger', 'aconsej']) || hasWord(n, ['que me conviene', 'cual me conviene', 'que es mejor', 'cual es mejor', 'no se cual', 'ayudame a elegir', 'elegir', 'que mas', 'que otra'])) {
      return {
        parts: [{ p: '¡Te ayudo! ¿Qué te gusta ver o hacer? Elige una opción o dime tu presupuesto, por ejemplo <b>«tengo 50 Bs»</b>.' }],
        chips: ['Anime', 'Doramas', 'Novelas', 'Series y películas', 'Música', 'Canales de TV', 'Estudiar con IA', 'Editar videos']
      };
    }

    /* lo más barato / ofertas */
    if (hasStem(n, ['barat', 'economic', 'oferta', 'promo', 'descuent', 'rebaja']) || hasWord(n, ['menos', 'lo minimo'])) {
      var cheap = P.slice().sort(function (a, b) { return a.p1 - b.p1 || P.indexOf(a) - P.indexOf(b); }).slice(0, 4);
      var promo = hasStem(n, ['oferta', 'promo', 'descuent', 'rebaja']);
      return {
        parts: [
          promo
            ? { p: 'Nuestras ofertas: los <b>planes de 3 meses</b> salen más baratos (hasta ' + Math.max.apply(null, P.map(M3K.ahorro)) + ' Bs de ahorro) y en <b>TV por cable</b> el plan de 3 meses trae <b>1 mes de regalo</b>. Lo más económico al mes:' }
            : { p: 'Lo más económico al mes:' },
          { cards: cheap.map(function (p) { return p.id; }), meses: 1 },
          promo ? { actions: [{ scroll: '#cartelera', label: 'Ver promos' }] } : { p: 'Y si pagas 3 meses, ahorras todavía más.' }
        ],
        chips: ['¿Qué conviene en 3 meses?', 'Tengo 50 Bs', '¿Cómo pago?']
      };
    }

    /* ahorro 3 meses */
    if (hasWord(n, ['ahorro', 'ahorrar', 'ahorra', 'conviene', 'trimestral', '3 meses', 'tres meses', 'regalo', 'mes gratis', 'gratis'])) {
      var top = P.filter(function (p) { return M3K.ahorro(p) > 0; }).sort(function (a, b) { return M3K.ahorro(b) - M3K.ahorro(a); }).slice(0, 5);
      return {
        parts: [
          { p: 'Con el plan de 3 meses casi siempre pagas menos. Donde más ahorras:' },
          { p: top.map(function (p) { return '• <b>' + p.nombre + '</b>: ' + p.p3 + ' Bs en vez de ' + p.p1 * 3 + ' (ahorras ' + M3K.ahorro(p) + ')'; }).join('<br>') },
          { p: 'Y en TV por cable (Flujo TV, Zona Movie TV y Oleada TV) el plan de 3 meses trae <b>1 mes de regalo</b>.' }
        ],
        chips: ['Tengo 150 Bs para 3 meses', 'Ver precios', '¿Cómo pago?']
      };
    }

    /* catálogo completo */
    if (priceWords || hasWord(n, ['lista', 'catalogo', 'que venden', 'que tienen', 'que ofrecen', 'que plataformas', 'plataformas', 'planes', 'servicios', 'todo'])) {
      var cats = M3K.categorias.filter(function (c) { return c.id !== 'todo'; });
      return {
        parts: [
          { p: 'Estos son los precios por 1 mes:' },
          { p: cats.map(function (c) { return '<b>' + esc(c.nombre) + '</b><br>' + P.filter(function (p) { return p.cat === c.id; }).map(function (p) { return esc(p.nombre) + ' ' + p.p1; }).join(' · '); }).join('<br>') },
          { p: 'Todo en bolivianos. Pregúntame por cualquiera y te doy el precio de 3 meses.' },
          { actions: [{ scroll: '#catalogo', label: 'Ver catálogo' }] }
        ],
        chips: ['¿Qué me recomiendas?', '¿Qué conviene en 3 meses?', '¿Cómo pago?']
      };
    }

    /* horarios, ubicación, factura... */
    if (hasWord(n, ['horario', 'horarios', 'hora', 'atienden', 'abren', 'ubicacion', 'donde estan', 'direccion', 'tienda fisica', 'local', 'factura', 'envio', 'delivery'])) {
      return { parts: [{ p: 'Ese dato no lo tengo aquí. Te lo confirma Mikaela por WhatsApp. Todo se hace por el chat: pagas con QR y recibes tu cuenta ahí mismo.' }, { actions: [wa('Hola Mikaela 3K, una consulta: ' + raw, 'Preguntar por WhatsApp')] }], chips: ['Ver precios', '¿Cómo pago?'] };
    }

    /* no entendí */
    return {
      parts: [
        { p: 'Mmm, eso no lo tengo claro. Puedo ayudarte con <b>precios</b>, <b>pagos</b>, <b>recomendaciones</b> o la <b>zona revendedor</b>. Si prefieres, pregúntale directo a Mikaela:' },
        { actions: [wa('Hola Mikaela 3K, una consulta: ' + raw, 'Preguntar por WhatsApp')] }
      ],
      chips: CHIPS_BASE
    };
  }

  function comboReply() {
    var items = M3K.cart.items();
    if (!items.length) return { parts: [{ p: 'Tu combo todavía está vacío. ¿Te ayudo a elegir?' }], chips: ['¿Qué me recomiendas?', 'Tengo 60 Bs, ¿qué me alcanza?', 'Ver precios'] };
    var t = M3K.cart.totals();
    return {
      parts: [
        { p: 'Tu combo tiene <b>' + items.length + '</b> ' + (items.length > 1 ? 'plataformas' : 'plataforma') + ': ' + esc(names(items.map(function (i) { return i.id; }))) + '. Total: <b>' + t.total + ' Bs</b>' + (t.save ? ' (ahorras ' + t.save + ' Bs)' : '') + '.' },
        { actions: [{ cart: true, label: 'Abrir mi combo y pedir' }] }
      ],
      chips: ['¿Cómo pago?', '¿Qué más me recomiendas?']
    };
  }

  /* ---------------- Render ---------------- */
  function scrollLog() { log.scrollTop = log.scrollHeight; }
  function addMsg(who, node) {
    var d = document.createElement('div');
    d.className = 'msg msg--' + who;
    if (typeof node === 'string') { var p = document.createElement('p'); p.textContent = node; d.appendChild(p); }
    else d.appendChild(node);
    log.appendChild(d);
    scrollLog();
    return d;
  }
  function icon(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function cardsHTML(ids, meses) {
    return '<div class="mcards">' + ids.map(function (id) {
      var p = byId(id), on = M3K.cart.has(id), m = meses === 3 && p.p3 ? 3 : 1;
      return '<div class="mcard" style="--brand:' + p.color + '"><span class="mcard__n"><i></i>' + esc(p.nombre) + '</span>' +
        '<span class="mcard__p">' + priceLine(p) + '</span>' +
        '<button type="button" data-madd="' + p.id + '" data-mm="' + m + '" class="' + (on ? 'is-on' : '') + '" aria-label="' + (on ? 'En tu combo: ' : 'Agregar ') + esc(p.nombre) + '">' + icon(on ? 'check' : 'plus') + '</button></div>';
    }).join('') + '</div>';
  }
  function tableHTML(ids) {
    var ps = ids.map(byId);
    var min1 = Math.min.apply(null, ps.map(function (p) { return p.p1; }));
    var with3 = ps.filter(function (p) { return p.p3; });
    var min3 = with3.length ? Math.min.apply(null, with3.map(function (p) { return p.p3; })) : -1;
    return '<table class="mtable"><thead><tr><th>Plataforma</th><th>1 mes</th><th>3 meses</th><th>Ahorro</th></tr></thead><tbody>' +
      ps.map(function (p) {
        return '<tr><td>' + esc(p.nombre) + '</td><td class="' + (p.p1 === min1 ? 'best' : '') + '">' + p.p1 + ' Bs</td><td class="' + (p.p3 === min3 ? 'best' : '') + '">' + (p.p3 ? p.p3 + ' Bs' : '—') + '</td><td>' + (p.regalo ? '+1 mes' : (M3K.ahorro(p) ? M3K.ahorro(p) + ' Bs' : '—')) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function actionsHTML(list) {
    return '<div class="mactions">' + list.map(function (a) {
      var cls = 'mact' + (a.ghost ? ' mact--ghost' : '');
      if (a.wa !== undefined) return '<a class="' + cls + '" href="' + esc(M3K.waLink(a.wa)) + '" target="_blank" rel="noopener">' + icon('wa') + esc(a.label) + '</a>';
      if (a.download) return '<a class="' + cls + '" href="' + esc(a.download) + '" download="QR-Mikaela-3K.png">' + icon('down') + esc(a.label) + '</a>';
      if (a.scroll) return '<button type="button" class="' + cls + '" data-mscroll="' + esc(a.scroll) + '">' + esc(a.label) + '</button>';
      if (a.cart) return '<button type="button" class="' + cls + '" data-mcart>' + esc(a.label) + '</button>';
      if (a.mood) return '<button type="button" class="' + cls + '" data-mmood="' + esc(a.mood) + '">' + esc(a.label) + '</button>';
      if (a.add) return '<button type="button" class="' + cls + '" data-maddall="' + a.add.join(',') + '" data-mm="' + (a.meses || 1) + '">' + icon('plus') + esc(a.label) + '</button>';
      return '';
    }).join('') + '</div>';
  }
  function qrHTML() {
    return '<div class="mqr"><img src="img/qr-altoke.webp" alt="QR de pago Altoke" width="84" height="85"><div>Cuenta <b>' + N.pago.cuenta + '</b><br>Referencia: <b>' + N.pago.referencia + '</b><br>Válido hasta ' + N.pago.validoHasta + '</div></div>';
  }
  function renderReply(r) {
    var box = document.createElement('div');
    var wide = r.parts.some(function (x) { return x.cards || x.table || x.qr; });
    r.parts.forEach(function (x) {
      var html = '';
      if (x.p) html = '<p>' + x.p + '</p>';
      else if (x.cards) html = cardsHTML(x.cards, x.meses);
      else if (x.table) html = tableHTML(x.table);
      else if (x.actions) html = actionsHTML(x.actions);
      else if (x.qr) html = qrHTML();
      box.insertAdjacentHTML('beforeend', html);
    });
    var d = addMsg('bot', box);
    if (wide) d.classList.add('msg--wide');
    setChips(r.chips && r.chips.length ? r.chips : CHIPS_BASE);
  }
  function setChips(list) {
    chipsEl.innerHTML = list.map(function (c, k) { return '<button type="button" style="animation-delay:' + (k * 0.04) + 's">' + esc(c) + '</button>'; }).join('');
  }
  function typing() {
    var d = document.createElement('div');
    d.className = 'msg msg--bot typing';
    d.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(d); scrollLog();
    return d;
  }
  function ask(text) {
    text = String(text || '').trim();
    if (!text || state.busy) return;
    state.busy = true;
    addMsg('me', text);
    input.value = '';
    var r;
    try { r = respond(text); } catch (e) { r = { parts: [{ p: 'Uy, me trabé un segundo. Pregúntame de nuevo o escríbele a Mikaela.' }, { actions: [wa('Hola Mikaela 3K, una consulta: ' + text, 'Preguntar por WhatsApp')] }] }; }
    var len = r.parts.reduce(function (s, x) { return s + (x.p ? x.p.length : 60); }, 0);
    var t = typing();
    setTimeout(function () { t.remove(); renderReply(r); state.busy = false; }, reduced ? 50 : Math.min(1300, 420 + len * 3));
  }

  /* ---------------- Eventos ---------------- */
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  chipsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); });
  log.addEventListener('click', function (e) {
    var a = e.target.closest('[data-madd]');
    if (a) {
      var id = a.getAttribute('data-madd');
      if (M3K.cart.has(id)) M3K.cart.remove(id); else M3K.cart.add(id, +a.getAttribute('data-mm'), a);
      return;
    }
    var all = e.target.closest('[data-maddall]');
    if (all) {
      all.getAttribute('data-maddall').split(',').forEach(function (id) { M3K.cart.add(id, +all.getAttribute('data-mm')); });
      all.innerHTML = icon('check') + 'Agregado';
      all.disabled = true;
      return;
    }
    var s = e.target.closest('[data-mscroll]');
    if (s) { M3K.ui.scrollTo(s.getAttribute('data-mscroll')); return; }
    if (e.target.closest('[data-mcart]')) { close(); M3K.ui.openCart(); return; }
    var md = e.target.closest('[data-mmood]');
    if (md) { if (window.innerWidth <= 760) close(); M3K.ui.setMood(md.getAttribute('data-mmood'), true); }
  });

  function syncButtons() {
    Array.prototype.forEach.call(log.querySelectorAll('[data-madd]'), function (b) {
      var on = M3K.cart.has(b.getAttribute('data-madd'));
      b.classList.toggle('is-on', on);
      b.innerHTML = icon(on ? 'check' : 'plus');
    });
  }

  function open() {
    if (state.open) return;
    state.open = true;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('is-hidden');
    if (window.innerWidth <= 760) document.body.classList.add('is-locked');
    if (!state.started) {
      state.started = true;
      var t = typing();
      setTimeout(function () {
        t.remove();
        renderReply({ parts: [{ p: '¡Hola! Soy <b>Mika</b>, la asistente de Mikaela 3K. Te digo precios, te ayudo a elegir según lo que te gusta o tu presupuesto, y te explico cómo pagar.' }, { p: '¿Qué te gustaría ver?' }], chips: CHIPS_BASE });
      }, reduced ? 50 : 650);
    }
    setTimeout(function () { if (window.innerWidth > 760) input.focus(); }, 350);
  }
  function close() {
    if (!state.open) return;
    state.open = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-hidden');
    document.body.classList.remove('is-locked');
  }
  fab.addEventListener('click', open);
  $('#mikaClose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { close(); fab.focus(); } });

  /* Invitación suave, una sola vez */
  setTimeout(function () {
    if (state.open || state.started || window.innerWidth <= 760) return;
    $('#mikaFabLabel').textContent = '¿Te ayudo a elegir?';
    fab.classList.add('is-wide');
    setTimeout(function () { fab.classList.remove('is-wide'); setTimeout(function () { $('#mikaFabLabel').textContent = 'Pregúntale a Mika'; }, 600); }, 5000);
  }, 15000);

  M3K.mika = { open: open, close: close, isOpen: function () { return state.open; }, syncButtons: syncButtons, ask: ask, _respond: respond };
})();
