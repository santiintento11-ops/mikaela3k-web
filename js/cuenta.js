/* ==========================================================================
   Mikaela 3K — cuenta, saldo, compras y zona revendedor
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var api = M3K.api;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bs = function (n) { return (Math.round(n * 100) / 100) + ' Bs'; };
  var toast = function (m) { M3K.ui.toast(m); };
  var PUB = {};
  M3K.plataformas.forEach(function (p) { PUB[p.id] = { p1: p.p1, p3: p.p3 }; });

  function fecha(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }
  function chipEstado(e) {
    var m = { pendiente: ['chip--mute', 'Pendiente'], aprobada: ['', 'Aprobada'], rechazada: ['chip--no', 'Rechazada'], entregado: ['', 'Entregada'], en_espera: ['chip--mute', 'En camino'], cancelado: ['chip--no', 'Cancelado'] };
    var x = m[e] || ['chip--mute', e];
    return '<span class="chip ' + x[0] + '">' + x[1] + '</span>';
  }

  /* ----------------------------- scrim propio ---------------------------- */
  var scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.id = 'scrim2';
  scrim.hidden = true;
  document.body.appendChild(scrim);
  scrim.addEventListener('click', cerrarCuenta);

  /* ------------------------------- acceso -------------------------------- */
  var modoAcceso = 'entrar';
  var mAcceso = $('#modalAcceso');

  function abrirAcceso(modo, aviso) {
    modoAcceso = modo || 'entrar';
    pintarAcceso(aviso);
    mAcceso.hidden = false;
    requestAnimationFrame(function () { mAcceso.classList.add('is-on'); });
    document.body.classList.add('is-locked');
    setTimeout(function () { $('#acCorreo').focus(); }, 250);
  }
  function cerrarAcceso() {
    mAcceso.classList.remove('is-on');
    document.body.classList.remove('is-locked');
    setTimeout(function () { mAcceso.hidden = true; }, 300);
  }
  function pintarAcceso(aviso) {
    var reg = modoAcceso === 'registrar';
    $('#accesoTitulo').textContent = reg ? 'Crea tu cuenta' : 'Entra a tu cuenta';
    $('#accesoSub').textContent = aviso || (reg
      ? 'Con tu cuenta recargas saldo y compras al instante, sin esperar respuesta.'
      : 'Tu saldo, tus cuentas compradas y tus pedidos, en un solo lugar.');
    $('#campoNombre').hidden = !reg;
    $('#campoWhats').hidden = !reg;
    $('#acEnviar').textContent = reg ? 'Crear mi cuenta' : 'Entrar';
    $('#acClave').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    $('#acCambiar').textContent = reg ? '¿Ya tienes cuenta? Entra aquí' : '¿No tienes cuenta? Créala aquí';
    $('#acOlvide').hidden = reg;
    $('#acError').hidden = true;
    $('#acPrueba').hidden = api.modo !== 'prueba';
  }
  $('#acCambiar').addEventListener('click', function () { modoAcceso = modoAcceso === 'registrar' ? 'entrar' : 'registrar'; pintarAcceso(); });
  $('#accesoCerrar').addEventListener('click', cerrarAcceso);
  mAcceso.addEventListener('click', function (e) { if (e.target === mAcceso) cerrarAcceso(); });

  $('#formAcceso').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#acEnviar'), err = $('#acError');
    var correo = $('#acCorreo').value.trim(), clave = $('#acClave').value;
    err.hidden = true;
    btn.disabled = true;
    var antes = btn.textContent;
    btn.textContent = 'Un momento…';
    var accion = modoAcceso === 'registrar'
      ? api.registrar({ correo: correo, clave: clave, nombre: $('#acNombre').value.trim(), whatsapp: $('#acWhats').value.trim() })
      : api.entrar(correo, clave);
    accion.then(function () {
      cerrarAcceso();
      toast('¡Hola' + (api.sesion && api.sesion.nombre ? ', ' + api.sesion.nombre.split(' ')[0] : '') + '!');
      abrirCuenta();
    }).catch(function (e2) {
      err.textContent = e2.message || 'No se pudo, inténtalo de nuevo';
      err.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = antes; });
  });

  $('#acOlvide').addEventListener('click', function () {
    var correo = $('#acCorreo').value.trim();
    if (!correo) { $('#acCorreo').focus(); return toast('Escribe tu correo primero'); }
    api.recuperar(correo).then(function () {
      toast('Te enviamos un correo para cambiar tu contraseña');
    }).catch(function (e) { toast(e.message); });
  });

  /* ------------------------------- cuenta -------------------------------- */
  var dCuenta = $('#cuenta');
  function abrirCuenta(tab) {
    if (!api.sesion) return abrirAcceso('entrar');
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-on'); dCuenta.classList.add('is-open'); });
    dCuenta.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (tab) verTab(tab);
    cargarCuenta();
  }
  function cerrarCuenta() {
    scrim.classList.remove('is-on');
    dCuenta.classList.remove('is-open');
    dCuenta.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    setTimeout(function () { scrim.hidden = true; }, 400);
  }
  $('#cuentaCerrar').addEventListener('click', cerrarCuenta);
  $('#navUser').addEventListener('click', function () { api.sesion ? abrirCuenta() : abrirAcceso('entrar'); });
  $('#cuentaSalir').addEventListener('click', function () {
    api.salir().then(function () { cerrarCuenta(); toast('Cerraste sesión'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!mAcceso.hidden) cerrarAcceso();
    else if (!$('#modalRecarga').hidden) cerrarRecarga();
    else if (dCuenta.classList.contains('is-open')) cerrarCuenta();
  });

  function verTab(tab) {
    $$('.cuenta__tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab); });
    $$('.cuenta__body [data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== tab; });
  }
  $$('.cuenta__tabs button').forEach(function (b) {
    b.addEventListener('click', function () { verTab(b.getAttribute('data-tab')); });
  });

  function cargarCuenta() {
    $('#panelCuentas').innerHTML = '<p class="vacio">Cargando…</p>';
    api.misPedidos().then(function (lista) {
      if (!lista.length) {
        $('#panelCuentas').innerHTML = '<p class="vacio">Todavía no compraste nada. Arma tu combo y págalo con tu saldo.</p>';
        return;
      }
      $('#panelCuentas').innerHTML = lista.map(function (p) {
        var nombre = p.plataforma_nombre || p.nombre || '';
        var entregado = p.estado === 'entregado';
        return '<article class="item">' +
          '<header><b>' + esc(nombre) + '</b>' + chipEstado(p.estado) + '</header>' +
          '<p class="item__meta">' + (p.meses === 3 ? '3 meses' : '1 mes') + ' · ' + bs(+p.precio) + ' · ' + fecha(p.creado_en || p.fecha) + '</p>' +
          (entregado
            ? '<pre class="datos">' + esc(p.contenido) + '</pre><button type="button" class="linkish" data-copiar="' + esc(p.contenido) + '">Copiar datos</button>'
            : '<p class="item__espera">Estamos preparando tu cuenta. Apenas esté, aparece aquí. Si la necesitas ya, escribe a soporte.</p>' +
              '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' + M3K.waLink('Hola Mikaela 3K, compré ' + nombre + ' (' + (p.meses === 3 ? '3 meses' : '1 mes') + ') con mi saldo y todavía no me llega. Mi pedido es el #' + p.id + '.') + '"><svg><use href="#i-wa"/></svg> Escribir a soporte</a>') +
        '</article>';
      }).join('');
    }).catch(function (e) { $('#panelCuentas').innerHTML = '<p class="vacio">' + esc(e.message) + '</p>'; });

    api.misRecargas().then(function (lista) {
      $('#panelRecargas').innerHTML = lista.length ? lista.map(function (r) {
        return '<article class="item"><header><b>' + bs(+r.monto) + '</b>' + chipEstado(r.estado) + '</header>' +
          '<p class="item__meta">' + fecha(r.creado_en || r.fecha) + (r.nota ? ' · ' + esc(r.nota) : '') + '</p></article>';
      }).join('') : '<p class="vacio">Sin recargas todavía. Toca «Recargar» y sube tu comprobante.</p>';
    }).catch(function () {});

    api.misMovimientos().then(function (lista) {
      $('#panelMovs').innerHTML = lista.length ? lista.map(function (m) {
        var suma = +m.monto >= 0;
        return '<div class="mov"><span>' + esc(m.detalle || m.tipo) + '<small>' + fecha(m.creado_en || m.fecha) + '</small></span>' +
          '<b class="' + (suma ? 'mas' : 'menos') + '">' + (suma ? '+' : '') + bs(+m.monto) + '</b></div>';
      }).join('') : '<p class="vacio">Aquí verás cada recarga y cada compra.</p>';
    }).catch(function () {});
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copiar]');
    if (!b) return;
    var t = b.getAttribute('data-copiar');
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Datos copiados'); }, function () {});
    else toast(t);
  });

  /* ------------------------------ recarga -------------------------------- */
  var mRecarga = $('#modalRecarga');
  function abrirRecarga() {
    if (!api.sesion) return abrirAcceso('registrar', 'Crea tu cuenta para poder recargar saldo.');
    $('#reError').hidden = true;
    mRecarga.hidden = false;
    requestAnimationFrame(function () { mRecarga.classList.add('is-on'); });
    document.body.classList.add('is-locked');
  }
  function cerrarRecarga() {
    mRecarga.classList.remove('is-on');
    if (!dCuenta.classList.contains('is-open')) document.body.classList.remove('is-locked');
    setTimeout(function () { mRecarga.hidden = true; }, 300);
  }
  $('#recargaCerrar').addEventListener('click', cerrarRecarga);
  mRecarga.addEventListener('click', function (e) { if (e.target === mRecarga) cerrarRecarga(); });
  $('#cuentaRecargar').addEventListener('click', abrirRecarga);
  $('#btnRecargar').addEventListener('click', abrirRecarga);
  $('#montosRapidos').innerHTML = [50, 100, 200, 500].map(function (m) {
    return '<button type="button" data-monto="' + m + '">' + m + ' Bs</button>';
  }).join('');
  $('#montosRapidos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-monto]');
    if (b) $('#reMonto').value = b.getAttribute('data-monto');
  });
  $('#formRecarga').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#reEnviar'), err = $('#reError');
    var monto = +$('#reMonto').value, archivo = $('#reArchivo').files[0] || null;
    if (!(monto > 0)) { err.textContent = 'Escribe cuánto pagaste'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    api.pedirRecarga(monto, archivo, $('#reNota').value.trim()).then(function () {
      cerrarRecarga();
      $('#formRecarga').reset();
      toast('Recarga enviada. Te avisamos al aprobarla.');
      if (dCuenta.classList.contains('is-open')) { cargarCuenta(); verTab('recargas'); }
    }).catch(function (e2) {
      err.textContent = e2.message; err.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = 'Enviar solicitud de recarga'; });
  });

  /* --------------------------- comprar con saldo -------------------------- */
  $('#cartBuy').addEventListener('click', function () {
    var btn = this;
    if (!api.sesion) return abrirAcceso('registrar', 'Crea tu cuenta para comprar con saldo y recibir tus datos al instante.');
    var items = M3K.cart.items();
    if (!items.length) return;
    var total = items.reduce(function (a, it) { return a + M3K.precio(M3K.buscar(it.id), it.meses); }, 0);
    if (api.sesion.saldo < total) {
      var falta = total - api.sesion.saldo;
      $('#cartHint').textContent = 'Te faltan ' + bs(falta) + ' de saldo. Recarga y vuelve: tu combo te espera.';
      $('#cartHint').hidden = false;
      abrirRecarga();
      $('#reMonto').value = Math.ceil(falta / 10) * 10;
      return;
    }
    btn.disabled = true;
    var txt = $('span', btn);
    txt.textContent = 'Comprando…';
    var listos = [], fallos = [];
    items.reduce(function (cadena, it) {
      return cadena.then(function () {
        return api.comprar(it.id, it.meses).then(function (r) { listos.push({ it: it, r: r }); }, function (e) { fallos.push({ it: it, e: e }); });
      });
    }, Promise.resolve()).then(function () {
      M3K.cart.vaciar(listos.map(function (x) { return x.it.id; }));
      btn.disabled = false;
      txt.textContent = 'Comprar con mi saldo';
      if (listos.length) {
        var enEspera = listos.filter(function (x) { return !x.r.entregado; }).length;
        toast(enEspera ? 'Compra lista. ' + enEspera + ' en camino.' : '¡Listo! Tus datos ya están en tu cuenta.');
        abrirCuenta('cuentas');
      }
      if (fallos.length) {
        $('#cartHint').textContent = fallos[0].e.message;
        $('#cartHint').hidden = false;
      }
    });
  });

  /* ---------------------------- postulación ------------------------------ */
  $('#formPostular').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('button[type=submit]', this);
    btn.disabled = true; btn.textContent = 'Enviando…';
    api.postular({
      nombre: $('#pNombre').value.trim(), ciudad: $('#pCiudad').value.trim(),
      whatsapp: $('#pWhats').value.trim(), volumen: $('#pVolumen').value
    }).then(function () {
      $('#postularOk').hidden = false;
      $('#formPostular').reset();
      toast('Solicitud enviada');
      if (!api.sesion) setTimeout(function () { abrirAcceso('registrar', 'Crea tu cuenta con el mismo WhatsApp para que Mikaela te habilite los precios.'); }, 900);
    }).catch(function (e2) { toast(e2.message); })
      .then(function () { btn.disabled = false; btn.textContent = 'Enviar solicitud'; });
  });

  /* -------------------------- zona revendedor ---------------------------- */
  $('#zonaEntrar').addEventListener('click', function () { api.sesion ? abrirCuenta() : abrirAcceso('entrar', 'Entra con tu cuenta de revendedor para ver tus precios.'); });

  function pintarZona() {
    var abierto = api.esRevendedor();
    $('#zonaLock').hidden = abierto;
    $('#zonaOpen').hidden = !abierto;
    if (!abierto) {
      var conSesion = !!api.sesion;
      $('#zonaLockTitulo').textContent = conSesion ? 'Tu cuenta todavía no es de revendedor' : 'Esta sección es privada';
      $('#zonaLockTexto').textContent = conSesion
        ? 'Postula aquí abajo y Mikaela habilita tus precios de mayor en tu misma cuenta. Te avisamos por WhatsApp.'
        : 'Los precios de revendedor solo se ven con una cuenta habilitada. Entra con tu usuario o postula: la aprobación es rápida.';
      $('#zonaEntrar').textContent = conSesion ? 'Ver mi cuenta' : 'Entrar a mi cuenta';
      return;
    }
    $('#zonaNombre').textContent = (api.sesion.nombre || 'revendedor').split(' ')[0];
    $('#zonaSaldo').textContent = bs(api.sesion.saldo);
    var hay = M3K.plataformas.some(function (p) { return p.rev; });
    if (!hay) {
      $('#zonaTabla').innerHTML = '<p class="vacio">Mikaela todavía no cargó tu lista de precios. Escríbele por WhatsApp y la activa en un minuto.</p>';
      return;
    }
    $('#zonaTabla').innerHTML =
      '<table class="tablaRev"><thead><tr><th>Plataforma</th><th>Público</th><th>Tu precio</th><th>Ganas</th></tr></thead><tbody>' +
      M3K.plataformas.filter(function (p) { return p.rev; }).map(function (p) {
        var pub = PUB[p.id];
        return '<tr><td><i style="background:' + p.color + '"></i>' + esc(p.nombre) + '</td>' +
          '<td>' + pub.p1 + ' Bs</td><td class="tuyo">' + p.p1 + ' Bs</td><td class="ganas">+' + (pub.p1 - p.p1) + ' Bs</td></tr>' +
          (p.p3 && pub.p3 ? '<tr class="sub"><td>· 3 meses</td><td>' + pub.p3 + ' Bs</td><td class="tuyo">' + p.p3 + ' Bs</td><td class="ganas">+' + (pub.p3 - p.p3) + ' Bs</td></tr>' : '');
      }).join('') + '</tbody></table>';
  }

  /* --------------------------- precios y stock --------------------------- */
  function sincronizar() {
    return api.precios().then(function (lista) {
      lista.forEach(function (x) {
        var p = M3K.buscar(x.id);
        if (!p) return;
        if (api.esRevendedor() && x.p1rev != null) { p.p1 = x.p1rev; p.p3 = x.p3rev; p.rev = true; }
        else { p.p1 = PUB[p.id].p1; p.p3 = PUB[p.id].p3; p.rev = false; }
      });
      return api.disponibles();
    }).then(function (stock) {
      M3K.stock = stock || {};
      M3K.ui.repintarPrecios();
      pintarZona();
      pintarBannerRev();
    }).catch(function (e) { console.warn('No se pudieron leer precios:', e.message); });
  }

  function pintarBannerRev() {
    var viejo = $('#revBanner');
    if (viejo) viejo.remove();
    if (!api.esRevendedor() || !M3K.plataformas.some(function (p) { return p.rev; })) return;
    var b = document.createElement('div');
    b.id = 'revBanner';
    b.className = 'rev-banner';
    b.innerHTML = '<span><b>Modo revendedor.</b> Estás viendo tus precios de mayor, no los del público.</span><a href="#zona" class="linkish">Ver mi lista</a>';
    var grid = $('#grid');
    grid.parentNode.insertBefore(b, grid);
  }

  /* ------------------------------ la sesión ------------------------------ */
  function pintarSesion() {
    var s = api.sesion;
    $('#navName').textContent = s ? (s.nombre ? s.nombre.split(' ')[0] : 'Mi cuenta') : 'Entrar';
    $('#navSaldo').textContent = s ? bs(s.saldo) : 'Crea tu cuenta';
    $('#navUser').classList.toggle('is-in', !!s);
    $('#navAv').textContent = '';
    if (s) {
      $('#navAv').textContent = (s.nombre || s.correo || '?').trim().charAt(0).toUpperCase();
    } else {
      $('#navAv').innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4.8 20c.6-3.6 3.6-5.6 7.2-5.6s6.6 2 7.2 5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    }

    $('#saldoNum').textContent = s ? Math.round(s.saldo) : 0;
    $('#saldoTexto').textContent = s
      ? (s.saldo > 0 ? 'Listo para comprar: elige tu plataforma y se descuenta de aquí.' : 'Recarga con el QR y compra en un toque, a la hora que sea.')
      : 'Crea tu cuenta para recargar saldo y comprar al instante.';
    $('#saldoBtn1').textContent = s ? 'Recargar saldo' : 'Crear mi cuenta';
    $('#saldoBtn2').textContent = s ? 'Mi cuenta' : 'Entrar';

    $('#cuentaTitulo').textContent = s ? 'Hola, ' + ((s.nombre || 'tú').split(' ')[0]) : 'Hola';
    $('#cuentaRol').textContent = s ? (s.rol === 'admin' ? 'Administradora' : s.rol === 'revendedor' ? 'Revendedor' : 'Mi cuenta') : 'Mi cuenta';
    $('#cuentaSaldo').textContent = s ? bs(s.saldo) : '0 Bs';
    $('#cuentaPanelAdmin').hidden = !(s && s.rol === 'admin');
    $('#postularNota').textContent = s
      ? 'Tu solicitud se une a tu cuenta (' + (s.correo || '') + '), así te habilitamos los precios ahí mismo.'
      : 'Primero crea tu cuenta para poder habilitártela.';
    if (s) {
      if (!$('#pNombre').value) $('#pNombre').value = s.nombre || '';
      if (!$('#pWhats').value) $('#pWhats').value = s.whatsapp || '';
    }
    pintarZona();
  }

  $('#saldoBtn1').addEventListener('click', function () { api.sesion ? abrirRecarga() : abrirAcceso('registrar'); });
  $('#saldoBtn2').addEventListener('click', function () { api.sesion ? abrirCuenta() : abrirAcceso('entrar'); });

  var primeraVez = true;
  api.alCambiar(function () {
    pintarSesion();
    if (!primeraVez || api.sesion) sincronizar();
    primeraVez = false;
    if (dCuenta.classList.contains('is-open')) cargarCuenta();
  });

  api.listo.then(function () {
    pintarSesion();
    sincronizar();
    if (api.modo === 'prueba') console.info('Mikaela 3K: MODO PRUEBA. Pega tus datos de Supabase en js/config.js para pasar a real.');
  });

  M3K.cuenta = { abrir: abrirCuenta, acceso: abrirAcceso, recarga: abrirRecarga, sincronizar: sincronizar };
})();
