/* ==========================================================================
   Mikaela 3K — capa de datos
   Una sola API para la web. Por dentro usa Supabase si hay configuración,
   o el "modo prueba" (este navegador) si todavía no la hay.
   ========================================================================== */
(function () {
  'use strict';
  var C = (M3K.config || {});
  var HAY_SUPABASE = !!(C.supabaseUrl && C.supabaseKey);
  var oyentes = [];
  var api = { modo: HAY_SUPABASE ? 'supabase' : 'prueba', sesion: null };

  function avisar() { oyentes.forEach(function (f) { try { f(api.sesion); } catch (e) { console.error(e); } }); }
  api.alCambiar = function (f) { oyentes.push(f); f(api.sesion); };
  api.esAdmin = function () { return !!(api.sesion && api.sesion.rol === 'admin'); };
  api.esRevendedor = function () { return !!(api.sesion && (api.sesion.rol === 'revendedor' || api.sesion.rol === 'admin')); };

  /* =========================== MODO PRUEBA =============================== */
  function Prueba() {
    var KEY = 'm3k-prueba';
    function db() {
      var d;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      if (!d) d = { usuarios: [], pedidos: [], recargas: [], stock: [], movimientos: [], solicitudes: [], preciosRev: {}, sesion: null, sec: 1 };
      return d;
    }
    function guardar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
    function id(d) { return d.sec++; }
    function perfilDe(u) { return u ? { id: u.id, correo: u.correo, nombre: u.nombre, whatsapp: u.whatsapp, rol: u.rol, saldo: u.saldo } : null; }
    function actual(d) { return d.usuarios.find(function (u) { return u.id === d.sesion; }) || null; }
    function ok(v) { return Promise.resolve(v); }
    function error(m) { return Promise.reject(new Error(m)); }

    var P = {
      iniciar: function () {
        var d = db();
        api.sesion = perfilDe(actual(d));
        return ok(api.sesion);
      },
      registrar: function (datos) {
        var d = db();
        var correo = String(datos.correo || '').trim().toLowerCase();
        if (!correo || !datos.clave) return error('Falta el correo o la contraseña');
        if (String(datos.clave).length < 6) return error('La contraseña debe tener al menos 6 caracteres');
        if (d.usuarios.some(function (u) { return u.correo === correo; })) return error('Ese correo ya tiene cuenta');
        var u = {
          id: 'u' + id(d), correo: correo, clave: String(datos.clave), nombre: datos.nombre || '',
          whatsapp: datos.whatsapp || '', rol: d.usuarios.length === 0 ? 'admin' : 'cliente', saldo: 0
        };
        d.usuarios.push(u); d.sesion = u.id; guardar(d);
        api.sesion = perfilDe(u); avisar();
        return ok(api.sesion);
      },
      entrar: function (correo, clave) {
        var d = db();
        var u = d.usuarios.find(function (x) { return x.correo === String(correo).trim().toLowerCase() && x.clave === String(clave); });
        if (!u) return error('Correo o contraseña incorrectos');
        d.sesion = u.id; guardar(d);
        api.sesion = perfilDe(u); avisar();
        return ok(api.sesion);
      },
      salir: function () { var d = db(); d.sesion = null; guardar(d); api.sesion = null; avisar(); return ok(true); },
      recuperar: function () { return error('En modo prueba no se envían correos. Usa la contraseña que pusiste.'); },
      actualizarPerfil: function (nombre, whatsapp) {
        var d = db(), u = actual(d);
        if (!u) return error('Necesitas iniciar sesión');
        u.nombre = nombre; u.whatsapp = whatsapp; guardar(d);
        api.sesion = perfilDe(u); avisar(); return ok(api.sesion);
      },
      precios: function () {
        var d = db();
        return ok(M3K.plataformas.map(function (p) {
          var r = api.esRevendedor() ? d.preciosRev[p.id] : null;
          return { id: p.id, p1: p.p1, p3: p.p3, p1rev: r ? r.p1 : null, p3rev: r ? r.p3 : null };
        }));
      },
      disponibles: function () {
        var d = db(), map = {};
        d.stock.filter(function (s) { return s.estado === 'libre'; }).forEach(function (s) {
          var k = s.plataforma + '_' + s.meses; map[k] = (map[k] || 0) + 1;
        });
        return ok(map);
      },
      comprar: function (plataforma, meses) {
        var d = db(), u = actual(d);
        if (!u) return error('Necesitas iniciar sesión para comprar');
        var p = M3K.buscar(plataforma);
        var rev = (u.rol === 'revendedor' || u.rol === 'admin') && d.preciosRev[plataforma];
        var precio = rev ? (meses === 3 ? rev.p3 : rev.p1) : M3K.precio(p, meses);
        if (!precio) return error('Ese plan no está disponible');
        if (u.saldo < precio) return error('Te falta saldo: cuesta ' + precio + ' Bs y tienes ' + u.saldo + ' Bs');
        u.saldo -= precio;
        var pedido = { id: id(d), usuario: u.id, plataforma: plataforma, nombre: p.nombre, meses: meses, precio: precio, estado: 'en_espera', contenido: null, fecha: new Date().toISOString() };
        d.pedidos.push(pedido);
        d.movimientos.push({ id: id(d), usuario: u.id, tipo: 'compra', monto: -precio, detalle: p.nombre + ' · ' + meses + ' mes(es)', fecha: pedido.fecha });
        var s = d.stock.find(function (x) { return x.plataforma === plataforma && x.meses === meses && x.estado === 'libre'; });
        if (s) { s.estado = 'entregada'; s.pedido = pedido.id; pedido.estado = 'entregado'; pedido.contenido = s.contenido; }
        guardar(d); api.sesion = perfilDe(u); avisar();
        return ok({ pedido: pedido, saldo: u.saldo, entregado: pedido.estado === 'entregado' });
      },
      pedirRecarga: function (monto, archivo, nota) {
        var d = db(), u = actual(d);
        if (!u) return error('Necesitas iniciar sesión');
        if (!(monto > 0)) return error('El monto debe ser mayor a 0');
        var r = { id: id(d), usuario: u.id, monto: +monto, comprobante: archivo ? archivo.name : '', estado: 'pendiente', nota: nota || '', fecha: new Date().toISOString() };
        d.recargas.push(r); guardar(d);
        return ok(r);
      },
      misRecargas: function () { var d = db(); return ok(d.recargas.filter(function (r) { return r.usuario === d.sesion; }).reverse()); },
      misPedidos: function () { var d = db(); return ok(d.pedidos.filter(function (p) { return p.usuario === d.sesion; }).reverse()); },
      misMovimientos: function () { var d = db(); return ok(d.movimientos.filter(function (m) { return m.usuario === d.sesion; }).reverse()); },
      postular: function (datos) {
        var d = db();
        d.solicitudes.push({ id: id(d), usuario: d.sesion, nombre: datos.nombre, ciudad: datos.ciudad, whatsapp: datos.whatsapp, volumen: datos.volumen, mensaje: datos.mensaje || '', estado: 'pendiente', fecha: new Date().toISOString() });
        guardar(d); return ok(true);
      },
      admin: {
        resumen: function () {
          var d = db();
          return ok({
            recargas_pendientes: d.recargas.filter(function (r) { return r.estado === 'pendiente'; }).length,
            pedidos_en_espera: d.pedidos.filter(function (p) { return p.estado === 'en_espera'; }).length,
            solicitudes_pendientes: d.solicitudes.filter(function (s) { return s.estado === 'pendiente'; }).length,
            stock_libre: d.stock.filter(function (s) { return s.estado === 'libre'; }).length,
            clientes: d.usuarios.length,
            vendido_hoy: d.pedidos.filter(function (p) { return p.fecha.slice(0, 10) === new Date().toISOString().slice(0, 10); }).reduce(function (a, p) { return a + p.precio; }, 0)
          });
        },
        recargas: function () {
          var d = db();
          return ok(d.recargas.slice().reverse().map(function (r) {
            var u = d.usuarios.find(function (x) { return x.id === r.usuario; }) || {};
            return Object.assign({}, r, { correo: u.correo, nombreUsuario: u.nombre });
          }));
        },
        revisarRecarga: function (idr, aprobar, nota) {
          var d = db(), r = d.recargas.find(function (x) { return x.id === idr; });
          if (!r || r.estado !== 'pendiente') return error('Esa recarga ya fue revisada');
          r.estado = aprobar ? 'aprobada' : 'rechazada'; r.nota = nota || '';
          if (aprobar) {
            var u = d.usuarios.find(function (x) { return x.id === r.usuario; });
            u.saldo += r.monto;
            d.movimientos.push({ id: id(d), usuario: u.id, tipo: 'recarga', monto: r.monto, detalle: 'Recarga aprobada', fecha: new Date().toISOString() });
          }
          guardar(d);
          entregarPendientes();
          if (api.sesion) { var yo = actual(db()); if (yo) { api.sesion = perfilDe(yo); avisar(); } }
          return ok(true);
        },
        pedidos: function () {
          var d = db();
          return ok(d.pedidos.slice().reverse().map(function (p) {
            var u = d.usuarios.find(function (x) { return x.id === p.usuario; }) || {};
            return Object.assign({}, p, { correo: u.correo });
          }));
        },
        stock: function () {
          var d = db(), map = {};
          d.stock.filter(function (s) { return s.estado === 'libre'; }).forEach(function (s) { var k = s.plataforma + '_' + s.meses; map[k] = (map[k] || 0) + 1; });
          return ok(map);
        },
        cargarStock: function (plataforma, meses, texto) {
          var d = db(), n = 0;
          String(texto || '').split('\n').forEach(function (l) {
            if (l.trim()) { d.stock.push({ id: id(d), plataforma: plataforma, meses: meses, contenido: l.trim(), estado: 'libre' }); n++; }
          });
          guardar(d);
          var e = entregarPendientes();
          return ok({ cargadas: n, entregadas: e });
        },
        usuarios: function () { var d = db(); return ok(d.usuarios.map(perfilDe)); },
        cambiarRol: function (uid, rol) {
          var d = db(), u = d.usuarios.find(function (x) { return x.id === uid; });
          if (u) { u.rol = rol; guardar(d); }
          return ok(true);
        },
        ajustarSaldo: function (uid, monto, detalle) {
          var d = db(), u = d.usuarios.find(function (x) { return x.id === uid; });
          if (!u) return error('No encuentro ese usuario');
          u.saldo = Math.max(0, u.saldo + (+monto));
          d.movimientos.push({ id: id(d), usuario: uid, tipo: 'ajuste', monto: +monto, detalle: detalle || 'Ajuste manual', fecha: new Date().toISOString() });
          guardar(d); entregarPendientes();
          return ok(true);
        },
        solicitudes: function () { var d = db(); return ok(d.solicitudes.slice().reverse()); },
        revisarSolicitud: function (ids, aprobar) {
          var d = db(), s = d.solicitudes.find(function (x) { return x.id === ids; });
          if (s) { s.estado = aprobar ? 'aprobada' : 'rechazada'; if (aprobar && s.usuario) { var u = d.usuarios.find(function (x) { return x.id === s.usuario; }); if (u) u.rol = 'revendedor'; } guardar(d); }
          return ok(true);
        },
        preciosRev: function () { var d = db(); return ok(d.preciosRev); },
        guardarPrecioRev: function (plataforma, p1, p3) {
          var d = db();
          if (p1 === null && p3 === null) delete d.preciosRev[plataforma];
          else d.preciosRev[plataforma] = { p1: p1, p3: p3 };
          guardar(d); return ok(true);
        }
      }
    };
    function entregarPendientes() {
      var d = db(), n = 0;
      d.pedidos.filter(function (p) { return p.estado === 'en_espera'; }).forEach(function (p) {
        var s = d.stock.find(function (x) { return x.plataforma === p.plataforma && x.meses === p.meses && x.estado === 'libre'; });
        if (s) { s.estado = 'entregada'; s.pedido = p.id; p.estado = 'entregado'; p.contenido = s.contenido; n++; }
      });
      guardar(d);
      return n;
    }
    return P;
  }

  /* ============================ SUPABASE ================================= */
  function Supa() {
    var sb = null;
    function cargar() {
      if (sb) return Promise.resolve(sb);
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
        s.onload = function () {
          sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
          res(sb);
        };
        s.onerror = function () { rej(new Error('No se pudo conectar con la base de datos')); };
        document.head.appendChild(s);
      });
    }
    function tirar(r) { if (r.error) throw new Error(traducir(r.error.message)); return r.data; }
    function traducir(m) {
      var t = {
        'Invalid login credentials': 'Correo o contraseña incorrectos',
        'User already registered': 'Ese correo ya tiene cuenta',
        'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres',
        'Email not confirmed': 'Primero confirma tu correo con el enlace que te enviamos'
      };
      return t[m] || m;
    }
    async function refrescarPerfil() {
      var u = (await sb.auth.getUser()).data.user;
      if (!u) { api.sesion = null; avisar(); return null; }
      var p = tirar(await sb.rpc('mi_perfil'));
      api.sesion = p ? { id: p.id, correo: u.email, nombre: p.nombre, whatsapp: p.whatsapp, rol: p.rol, saldo: +p.saldo } : null;
      avisar();
      return api.sesion;
    }
    var S = {
      iniciar: async function () {
        await cargar();
        sb.auth.onAuthStateChange(function () { refrescarPerfil(); });
        return refrescarPerfil();
      },
      registrar: async function (datos) {
        await cargar();
        tirar(await sb.auth.signUp({
          email: datos.correo, password: datos.clave,
          options: { data: { nombre: datos.nombre || '', whatsapp: datos.whatsapp || '' } }
        }));
        var s = (await sb.auth.getSession()).data.session;
        if (!s) throw new Error('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar.');
        return refrescarPerfil();
      },
      entrar: async function (correo, clave) {
        await cargar();
        tirar(await sb.auth.signInWithPassword({ email: correo, password: clave }));
        return refrescarPerfil();
      },
      salir: async function () { await cargar(); await sb.auth.signOut(); api.sesion = null; avisar(); return true; },
      recuperar: async function (correo) {
        await cargar();
        tirar(await sb.auth.resetPasswordForEmail(correo, { redirectTo: location.origin + location.pathname }));
        return true;
      },
      actualizarPerfil: async function (nombre, whatsapp) {
        tirar(await sb.rpc('actualizar_perfil', { p_nombre: nombre, p_whatsapp: whatsapp }));
        return refrescarPerfil();
      },
      precios: async function () {
        var cat = tirar(await sb.from('plataformas').select('id,p1,p3,activo').eq('activo', true));
        var rev = [];
        if (api.esRevendedor()) { var r = await sb.from('precios_rev').select('plataforma_id,p1,p3'); rev = r.data || []; }
        return cat.map(function (c) {
          var x = rev.find(function (v) { return v.plataforma_id === c.id; });
          return { id: c.id, p1: +c.p1, p3: c.p3 === null ? null : +c.p3, p1rev: x ? +x.p1 : null, p3rev: x && x.p3 !== null ? +x.p3 : null };
        });
      },
      disponibles: async function () {
        var d = tirar(await sb.rpc('disponibles')) || [];
        var map = {};
        d.forEach(function (x) { map[x.plataforma_id + '_' + x.meses] = +x.cantidad; });
        return map;
      },
      comprar: async function (plataforma, meses) {
        var r = tirar(await sb.rpc('comprar', { p_plataforma: plataforma, p_meses: meses }));
        await refrescarPerfil();
        return { pedido: r.pedido, saldo: +r.saldo, entregado: !!r.entregado };
      },
      pedirRecarga: async function (monto, archivo, nota) {
        var ruta = null;
        if (archivo) {
          var u = api.sesion.id + '/' + Date.now() + '-' + archivo.name.replace(/[^a-zA-Z0-9._-]/g, '');
          tirar(await sb.storage.from('comprobantes').upload(u, archivo));
          ruta = u;
        }
        return tirar(await sb.rpc('pedir_recarga', { p_monto: monto, p_comprobante: ruta, p_nota: nota || '' }));
      },
      misRecargas: async function () { return tirar(await sb.from('recargas').select('*').order('id', { ascending: false })); },
      misPedidos: async function () { return tirar(await sb.from('pedidos').select('*').order('id', { ascending: false })); },
      misMovimientos: async function () { return tirar(await sb.from('movimientos').select('*').order('id', { ascending: false }).limit(50)); },
      postular: async function (datos) {
        return tirar(await sb.from('solicitudes_rev').insert({
          usuario_id: api.sesion ? api.sesion.id : null, nombre: datos.nombre, ciudad: datos.ciudad,
          whatsapp: datos.whatsapp, volumen: datos.volumen, mensaje: datos.mensaje || ''
        }));
      },
      admin: {
        resumen: async function () { return tirar(await sb.rpc('resumen_panel')); },
        recargas: async function () { return tirar(await sb.from('recargas').select('*, perfiles(nombre, whatsapp)').order('id', { ascending: false })); },
        revisarRecarga: async function (id, aprobar, nota) { return tirar(await sb.rpc('revisar_recarga', { p_id: id, p_aprobar: aprobar, p_nota: nota || '' })); },
        pedidos: async function () { return tirar(await sb.from('pedidos').select('*, perfiles(nombre, whatsapp)').order('id', { ascending: false }).limit(200)); },
        stock: async function () {
          var d = tirar(await sb.rpc('disponibles')) || [];
          var map = {}; d.forEach(function (x) { map[x.plataforma_id + '_' + x.meses] = +x.cantidad; });
          return map;
        },
        cargarStock: async function (plataforma, meses, texto) { return tirar(await sb.rpc('cargar_stock', { p_plataforma: plataforma, p_meses: meses, p_lineas: texto })); },
        usuarios: async function () { return tirar(await sb.from('perfiles').select('*').order('creado_en', { ascending: false })); },
        cambiarRol: async function (uid, rol) { return tirar(await sb.rpc('cambiar_rol', { p_usuario: uid, p_rol: rol })); },
        ajustarSaldo: async function (uid, monto, detalle) { return tirar(await sb.rpc('ajustar_saldo', { p_usuario: uid, p_monto: monto, p_detalle: detalle || '' })); },
        solicitudes: async function () { return tirar(await sb.from('solicitudes_rev').select('*').order('id', { ascending: false })); },
        revisarSolicitud: async function (id, aprobar) {
          var s = tirar(await sb.from('solicitudes_rev').update({ estado: aprobar ? 'aprobada' : 'rechazada' }).eq('id', id).select().single());
          if (aprobar && s.usuario_id) await sb.rpc('cambiar_rol', { p_usuario: s.usuario_id, p_rol: 'revendedor' });
          return true;
        },
        preciosRev: async function () {
          var d = tirar(await sb.from('precios_rev').select('*'));
          var map = {}; d.forEach(function (x) { map[x.plataforma_id] = { p1: +x.p1, p3: x.p3 === null ? null : +x.p3 }; });
          return map;
        },
        guardarPrecioRev: async function (plataforma, p1, p3) {
          if (p1 === null && p3 === null) return tirar(await sb.from('precios_rev').delete().eq('plataforma_id', plataforma));
          return tirar(await sb.from('precios_rev').upsert({ plataforma_id: plataforma, p1: p1, p3: p3 }));
        }
      }
    };
    return S;
  }

  var motor = HAY_SUPABASE ? Supa() : Prueba();
  ['registrar', 'entrar', 'salir', 'recuperar', 'actualizarPerfil', 'precios', 'disponibles', 'comprar',
    'pedirRecarga', 'misRecargas', 'misPedidos', 'misMovimientos', 'postular'].forEach(function (k) {
    api[k] = function () { return Promise.resolve(motor[k].apply(motor, arguments)); };
  });
  api.admin = {};
  Object.keys(motor.admin).forEach(function (k) {
    api.admin[k] = function () { return Promise.resolve(motor.admin[k].apply(motor.admin, arguments)); };
  });
  api.listo = Promise.resolve(motor.iniciar()).catch(function (e) { console.error(e); return null; });

  M3K.api = api;
})();
