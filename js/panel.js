/* ==========================================================================
   Mikaela 3K — panel de administración
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var api = M3K.api;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bs = function (n) { return (Math.round((+n) * 100) / 100) + ' Bs'; };
  var toastEl = $('#toast'), toastT;
  function toast(m) {
    toastEl.textContent = m; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }
  function fecha(v) {
    if (!v) return '';
    var d = new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }
  function nombreDe(x) {
    return (x.perfiles && x.perfiles.nombre) || x.nombreUsuario || x.correo || (x.usuario_id || x.usuario || '').toString().slice(0, 8);
  }
  function whatsDe(x) { return (x.perfiles && x.perfiles.whatsapp) || x.whatsapp || ''; }
  function waLink(tel, texto) {
    var n = String(tel || '').replace(/\D/g, '');
    if (!n) return null;
    if (n.length <= 8) n = '591' + n;
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
  }

  /* ------------------------------- acceso -------------------------------- */
  function pintarAcceso() {
    var admin = api.esAdmin();
    $('#pBloqueo').hidden = admin;
    $('#pPanel').hidden = !admin;
    $('#pSalir').hidden = !api.sesion;
    $('#pModo').textContent = api.modo === 'prueba' ? 'Modo prueba' : '';
    $('#pBorrar').hidden = api.modo !== 'prueba';
    if (!admin && api.sesion) {
      $('#pBloqueoTexto').textContent = 'Esta cuenta (' + (api.sesion.correo || '') + ') no es de administradora. Entra con la cuenta de Mikaela.';
    }
    if (admin) cargarTodo();
  }
  $('#pForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#pError');
    err.hidden = true;
    api.entrar($('#pCorreo').value.trim(), $('#pClave').value).then(pintarAcceso).catch(function (e2) {
      err.textContent = e2.message; err.hidden = false;
    });
  });
  $('#pSalir').addEventListener('click', function () { api.salir().then(function () { location.reload(); }); });
  $('#pBorrar').addEventListener('click', function () {
    if (!confirm('Esto borra los usuarios, saldos y cuentas de PRUEBA de este navegador. ¿Seguimos?')) return;
    try { localStorage.removeItem('m3k-prueba'); localStorage.removeItem('m3k-combo'); } catch (e) {}
    location.reload();
  });

  /* ------------------------------- pestañas ------------------------------ */
  $('#pTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    var t = b.getAttribute('data-tab');
    $$('#pTabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
    $$('.ptab').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== t; });
  });

  /* ------------------------------- resumen ------------------------------- */
  function cargarResumen() {
    api.admin.resumen().then(function (r) {
      if (!r) return;
      var c = [
        ['Recargas por revisar', r.recargas_pendientes, 'recargas'],
        ['Pedidos en camino', r.pedidos_en_espera, 'pedidos'],
        ['Cuentas en stock', r.stock_libre, 'stock'],
        ['Vendido hoy', bs(r.vendido_hoy || 0), null],
        ['Clientes', r.clientes, 'gente'],
        ['Solicitudes', r.solicitudes_pendientes, 'solicitudes']
      ];
      $('#pResumen').innerHTML = c.map(function (x) {
        return '<article class="pcard"' + (x[2] ? ' data-ir="' + x[2] + '"' : '') + '><p>' + x[0] + '</p><b>' + x[1] + '</b></article>';
      }).join('');
      $('#nRecargas').textContent = r.recargas_pendientes ? r.recargas_pendientes : '';
      $('#nPedidos').textContent = r.pedidos_en_espera ? r.pedidos_en_espera : '';
      $('#nSolicitudes').textContent = r.solicitudes_pendientes ? r.solicitudes_pendientes : '';
    }).catch(function () {});
  }
  $('#pResumen').addEventListener('click', function (e) {
    var c = e.target.closest('[data-ir]');
    if (c) $('#pTabs button[data-tab="' + c.getAttribute('data-ir') + '"]').click();
  });

  /* ------------------------------- recargas ------------------------------ */
  function cargarRecargas() {
    api.admin.recargas().then(function (lista) {
      if (!lista.length) { $('#listaRecargas').innerHTML = '<p class="vacio">Todavía no hay recargas.</p>'; return; }
      $('#listaRecargas').innerHTML = lista.map(function (r) {
        var pend = r.estado === 'pendiente';
        var wa = waLink(whatsDe(r), 'Hola, tu recarga de ' + bs(r.monto) + ' en Mikaela 3K ya está cargada. ¡A disfrutar!');
        return '<article class="fila' + (pend ? ' fila--activa' : '') + '">' +
          '<div class="fila__info">' +
            '<b>' + bs(r.monto) + '</b>' +
            '<span>' + esc(nombreDe(r)) + ' · ' + fecha(r.creado_en || r.fecha) + '</span>' +
            (r.nota ? '<small>' + esc(r.nota) + '</small>' : '') +
          '</div>' +
          '<div class="fila__estado">' + estado(r.estado) + '</div>' +
          (pend ? '<div class="fila__btns">' +
            '<button class="btn btn--primary btn--sm" data-ok="' + r.id + '"><svg><use href="#i-check"/></svg> Aprobar</button>' +
            '<button class="btn btn--ghost btn--sm" data-no="' + r.id + '">Rechazar</button>' +
          '</div>' : (wa ? '<div class="fila__btns"><a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' + wa + '"><svg><use href="#i-wa"/></svg> Avisar</a></div>' : '')) +
        '</article>';
      }).join('');
    }).catch(function (e) { $('#listaRecargas').innerHTML = '<p class="vacio">' + esc(e.message) + '</p>'; });
  }
  function estado(e) {
    var m = { pendiente: ['chip--mute', 'Pendiente'], aprobada: ['', 'Aprobada'], rechazada: ['chip--no', 'Rechazada'], entregado: ['', 'Entregado'], en_espera: ['chip--mute', 'En camino'], cancelado: ['chip--no', 'Cancelado'] };
    var x = m[e] || ['chip--mute', e];
    return '<span class="chip ' + x[0] + '">' + x[1] + '</span>';
  }
  $('#listaRecargas').addEventListener('click', function (e) {
    var ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
    if (!ok && !no) return;
    var id = +(ok || no).getAttribute(ok ? 'data-ok' : 'data-no');
    var nota = no ? (prompt('¿Por qué la rechazas? (opcional)') || '') : '';
    (ok || no).disabled = true;
    api.admin.revisarRecarga(id, !!ok, nota).then(function () {
      toast(ok ? 'Saldo cargado' : 'Recarga rechazada');
      cargarRecargas(); cargarResumen(); cargarPedidos();
    }).catch(function (e2) { toast(e2.message); (ok || no).disabled = false; });
  });

  /* ------------------------------- pedidos ------------------------------- */
  function cargarPedidos() {
    api.admin.pedidos().then(function (lista) {
      if (!lista.length) { $('#listaPedidos').innerHTML = '<p class="vacio">Todavía no hay pedidos.</p>'; return; }
      $('#listaPedidos').innerHTML = lista.map(function (p) {
        var nombre = p.plataforma_nombre || p.nombre || '';
        return '<article class="fila' + (p.estado === 'en_espera' ? ' fila--activa' : '') + '">' +
          '<div class="fila__info"><b>' + esc(nombre) + ' · ' + (p.meses === 3 ? '3 meses' : '1 mes') + '</b>' +
          '<span>' + esc(nombreDe(p)) + ' · ' + bs(p.precio) + ' · ' + fecha(p.creado_en || p.fecha) + '</span>' +
          (p.contenido ? '<small class="mono">' + esc(p.contenido) + '</small>' : '') + '</div>' +
          '<div class="fila__estado">' + estado(p.estado) + '</div>' +
        '</article>';
      }).join('');
    }).catch(function () {});
  }

  /* -------------------------------- stock -------------------------------- */
  function llenarSelectPlataformas() {
    $('#stPlat').innerHTML = M3K.plataformas.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('');
  }
  function cargarStock() {
    api.admin.stock().then(function (map) {
      var filas = M3K.plataformas.map(function (p) {
        var n1 = map[p.id + '_1'] || 0, n3 = map[p.id + '_3'] || 0;
        if (!n1 && !n3) return '';
        return '<div class="stockfila"><span>' + esc(p.nombre) + '</span><b>' + n1 + '</b><small>1 mes</small><b>' + n3 + '</b><small>3 meses</small></div>';
      }).filter(Boolean).join('');
      $('#listaStock').innerHTML = filas || '<p class="vacio">Sin cuentas cargadas todavía.</p>';
    }).catch(function () {});
  }
  $('#formStock').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#stError');
    err.hidden = true;
    var texto = $('#stTexto').value;
    if (!texto.trim()) { err.textContent = 'Pega al menos una cuenta'; err.hidden = false; return; }
    api.admin.cargarStock($('#stPlat').value, +$('#stMeses').value, texto).then(function (r) {
      $('#stTexto').value = '';
      toast(r.cargadas + ' cuenta(s) cargadas' + (r.entregadas ? ' · ' + r.entregadas + ' entregadas al instante' : ''));
      cargarStock(); cargarResumen(); cargarPedidos();
    }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
  });

  /* ------------------------- precios de revendedor ----------------------- */
  function cargarPrecios() {
    api.admin.preciosRev().then(function (map) {
      $('#listaPrecios').innerHTML = M3K.plataformas.map(function (p) {
        var r = map[p.id] || {};
        return '<div class="preciofila" data-plat="' + p.id + '">' +
          '<span class="preciofila__n"><i style="background:' + p.color + '"></i>' + esc(p.nombre) + '</span>' +
          '<span class="preciofila__pub">Público: ' + p.p1 + ' Bs' + (p.p3 ? ' · ' + p.p3 + ' Bs' : '') + '</span>' +
          '<label>1 mes <input type="number" min="0" step="1" data-p1 value="' + (r.p1 != null ? r.p1 : '') + '" placeholder="—"></label>' +
          '<label>3 meses <input type="number" min="0" step="1" data-p3 value="' + (r.p3 != null ? r.p3 : '') + '" placeholder="—"></label>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-guardar>Guardar</button>' +
        '</div>';
      }).join('');
    }).catch(function (e) { $('#listaPrecios').innerHTML = '<p class="vacio">' + esc(e.message) + '</p>'; });
  }
  $('#listaPrecios').addEventListener('click', function (e) {
    var b = e.target.closest('[data-guardar]');
    if (!b) return;
    var fila = b.closest('[data-plat]');
    var p1 = $('[data-p1]', fila).value.trim(), p3 = $('[data-p3]', fila).value.trim();
    b.disabled = true;
    api.admin.guardarPrecioRev(fila.getAttribute('data-plat'), p1 === '' ? null : +p1, p3 === '' ? null : +p3)
      .then(function () { toast('Precio guardado'); })
      .catch(function (e2) { toast(e2.message); })
      .then(function () { b.disabled = false; });
  });

  /* -------------------------------- gente -------------------------------- */
  function cargarGente() {
    api.admin.usuarios().then(function (lista) {
      $('#listaGente').innerHTML = lista.map(function (u) {
        var id = u.id;
        return '<article class="fila" data-uid="' + id + '">' +
          '<div class="fila__info"><b>' + esc(u.nombre || u.correo || 'Sin nombre') + '</b>' +
          '<span>' + esc(u.correo || '') + (u.whatsapp ? ' · ' + esc(u.whatsapp) : '') + ' · Saldo: ' + bs(u.saldo) + '</span></div>' +
          '<div class="fila__estado"><select data-rol>' +
            ['cliente', 'revendedor', 'admin'].map(function (r) { return '<option value="' + r + '"' + (u.rol === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="fila__btns"><button class="btn btn--ghost btn--sm" type="button" data-saldo>Ajustar saldo</button></div>' +
        '</article>';
      }).join('');
    }).catch(function (e) { $('#listaGente').innerHTML = '<p class="vacio">' + esc(e.message) + '</p>'; });
  }
  $('#listaGente').addEventListener('change', function (e) {
    var s = e.target.closest('[data-rol]');
    if (!s) return;
    var uid = s.closest('[data-uid]').getAttribute('data-uid');
    api.admin.cambiarRol(uid, s.value).then(function () { toast('Rol actualizado'); }).catch(function (e2) { toast(e2.message); });
  });
  $('#listaGente').addEventListener('click', function (e) {
    var b = e.target.closest('[data-saldo]');
    if (!b) return;
    var uid = b.closest('[data-uid]').getAttribute('data-uid');
    var v = prompt('¿Cuánto saldo le sumo? (usa un número negativo para restar)');
    if (v === null || v.trim() === '') return;
    api.admin.ajustarSaldo(uid, +v, 'Ajuste desde el panel').then(function () {
      toast('Saldo ajustado'); cargarGente(); cargarPedidos();
    }).catch(function (e2) { toast(e2.message); });
  });

  /* ----------------------------- solicitudes ----------------------------- */
  function cargarSolicitudes() {
    api.admin.solicitudes().then(function (lista) {
      if (!lista.length) { $('#listaSolicitudes').innerHTML = '<p class="vacio">Sin solicitudes por ahora.</p>'; return; }
      $('#listaSolicitudes').innerHTML = lista.map(function (s) {
        var wa = waLink(s.whatsapp, 'Hola ' + (s.nombre || '') + ', te habilitamos los precios de revendedor en Mikaela 3K. Entra a tu cuenta y los vas a ver.');
        return '<article class="fila' + (s.estado === 'pendiente' ? ' fila--activa' : '') + '">' +
          '<div class="fila__info"><b>' + esc(s.nombre) + '</b><span>' + esc(s.ciudad) + ' · ' + esc(s.whatsapp) + ' · ' + esc(s.volumen) + ' · ' + fecha(s.creado_en || s.fecha) + '</span></div>' +
          '<div class="fila__estado">' + estado(s.estado) + '</div>' +
          (s.estado === 'pendiente' ? '<div class="fila__btns">' +
            '<button class="btn btn--primary btn--sm" data-sok="' + s.id + '"><svg><use href="#i-check"/></svg> Aprobar</button>' +
            '<button class="btn btn--ghost btn--sm" data-sno="' + s.id + '">Rechazar</button></div>'
            : (wa ? '<div class="fila__btns"><a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' + wa + '"><svg><use href="#i-wa"/></svg> Escribir</a></div>' : '')) +
        '</article>';
      }).join('');
    }).catch(function () {});
  }
  $('#listaSolicitudes').addEventListener('click', function (e) {
    var ok = e.target.closest('[data-sok]'), no = e.target.closest('[data-sno]');
    if (!ok && !no) return;
    var id = +(ok || no).getAttribute(ok ? 'data-sok' : 'data-sno');
    api.admin.revisarSolicitud(id, !!ok).then(function () {
      toast(ok ? 'Revendedor habilitado' : 'Solicitud rechazada');
      cargarSolicitudes(); cargarResumen(); cargarGente();
    }).catch(function (e2) { toast(e2.message); });
  });

  /* -------------------------------- carga -------------------------------- */
  function cargarTodo() {
    llenarSelectPlataformas();
    cargarResumen(); cargarRecargas(); cargarPedidos(); cargarStock(); cargarPrecios(); cargarGente(); cargarSolicitudes();
  }
  api.alCambiar(pintarAcceso);
  api.listo.then(pintarAcceso);
  setInterval(function () { if (api.esAdmin()) { cargarResumen(); cargarRecargas(); } }, 30000);
})();
