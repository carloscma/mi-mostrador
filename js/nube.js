/*
  Mostrador en internet (Supabase): cuenta con correo y contraseña,
  y los productos guardados en la nube.

  Cómo funciona:
  - El celular sigue guardando todo en IndexedDB (anda sin internet).
  - Cada cambio queda "pendiente" y se sube cuando hay conexión.
  - Lo que se cambió en otro celular se baja y se guarda acá.
  - Las fotos se suben a la carpeta "fotos/<negocio>/<producto>/".
*/
window.NUBE = (function () {
  'use strict';

  // Datos públicos del proyecto (la seguridad la dan las reglas de la base de datos)
  const URL_BASE = leerLocal('mostrador:nube-url') || 'https://ytogtvfafvgwbylpguev.supabase.co';
  const LLAVE = leerLocal('mostrador:nube-llave') || 'sb_publishable_IfkGVmdzOE2Q3AOfgTOoew_rpzNULYM';

  const K = {
    sesion: 'mostrador:sesion',
    negocio: 'mostrador:negocio',
    negocioLocal: 'mostrador:negocio-local',
    bajada: 'mostrador:ultima-bajada',
    borrados: 'mostrador:borrados',
    ajustesPend: 'mostrador:ajustes-pendientes',
    alias: 'mostrador:alias'
  };

  function leerLocal(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function escribirLocal(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* lleno */ } }

  let sesion = leerLocal(K.sesion);
  const estado = { fase: sesion ? 'al-dia' : 'sin-cuenta', pendientes: 0, mensaje: '', ultima: null };
  const oyentes = [];
  let alCambiarProductos = null;

  function avisarCambio() { oyentes.forEach((f) => { try { f(estado); } catch (e) { /* nada */ } }); }
  function poner(fase, mensaje) { estado.fase = fase; estado.mensaje = mensaje || ''; avisarCambio(); }

  /* ---------------- Pedidos a Supabase ---------------- */
  class ErrorNube extends Error { constructor(msg, codigo, status) { super(msg); this.codigo = codigo; this.status = status; } }

  async function pedir(ruta, opciones) {
    opciones = opciones || {};
    const cab = Object.assign({ apikey: LLAVE }, opciones.cabeceras || {});
    if (opciones.conSesion !== false && sesion) cab.Authorization = 'Bearer ' + sesion.access_token;
    if (opciones.json !== undefined) cab['Content-Type'] = 'application/json';
    let r;
    try {
      r = await fetch(URL_BASE + ruta, { method: opciones.metodo || 'GET', headers: cab, body: opciones.json !== undefined ? JSON.stringify(opciones.json) : opciones.cuerpo });
    } catch (e) { throw new ErrorNube('Sin conexión a internet', 'sin-conexion', 0); }
    const texto = await r.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch (e) { datos = texto; }
    if (!r.ok) {
      const m = (datos && (datos.msg || datos.message || datos.error_description || datos.error)) || ('Error ' + r.status);
      throw new ErrorNube(String(m), (datos && (datos.error_code || datos.code)) || '', r.status);
    }
    return datos;
  }

  // Igual que pedir, pero renueva la sesión si venció
  async function pedirConSesion(ruta, opciones) {
    await sesionVigente();
    try { return await pedir(ruta, opciones); }
    catch (e) {
      if (e.status === 401 || /jwt expired/i.test(e.message)) { await renovar(); return pedir(ruta, opciones); }
      throw e;
    }
  }

  function guardarSesion(s) {
    if (s && s.access_token) {
      sesion = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), user: { id: s.user && s.user.id, email: s.user && s.user.email } };
    } else sesion = null;
    escribirLocal(K.sesion, sesion);
  }

  async function renovar() {
    if (!sesion || !sesion.refresh_token) throw new ErrorNube('La sesión venció', 'sesion', 401);
    try {
      const s = await pedir('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', json: { refresh_token: sesion.refresh_token }, conSesion: false });
      guardarSesion(s);
    } catch (e) {
      if (e.status === 400 || e.status === 401) { guardarSesion(null); poner('sin-cuenta', 'Tu sesión venció. Volvé a entrar.'); }
      throw e;
    }
  }

  async function sesionVigente() {
    if (!sesion) throw new ErrorNube('Sin sesión', 'sesion', 401);
    if ((sesion.expires_at || 0) - 60 < Date.now() / 1000) await renovar();
  }

  function traducir(e) {
    const m = String((e && e.message) || '');
    if (e && e.codigo === 'sin-conexion') return 'No hay conexión a internet. Probá de nuevo.';
    if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no son correctos.';
    if (/already registered|already been registered|user_already_exists/i.test(m + (e.codigo || ''))) return 'Ese correo ya tiene una cuenta. Tocá "Entrar".';
    if (/password should be at least|weak_password/i.test(m + (e.codigo || ''))) return 'La contraseña tiene que tener al menos 6 caracteres.';
    if (/invalid.*email|email.*invalid|validation_failed/i.test(m + (e.codigo || ''))) return 'Revisá el correo: parece que está mal escrito.';
    if (/rate limit|too many/i.test(m)) return 'Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo.';
    if (/email not confirmed/i.test(m)) return 'Falta confirmar el correo.';
    return 'No se pudo completar: ' + m;
  }

  /* ---------------- Cuenta ---------------- */
  async function entrar(email, clave) {
    try {
      const s = await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', json: { email: email.trim(), password: clave }, conSesion: false });
      guardarSesion(s);
    } catch (e) { throw new Error(traducir(e)); }
    await alEntrar();
  }

  async function crearCuenta(email, clave) {
    let r;
    try { r = await pedir('/auth/v1/signup', { metodo: 'POST', json: { email: email.trim(), password: clave }, conSesion: false }); }
    catch (e) { throw new Error(traducir(e)); }
    const s = r && (r.access_token ? r : r.session);
    if (!s || !s.access_token) {
      // Si el correo ya existía, Supabase a veces responde sin sesión
      if (r && r.user && Array.isArray(r.user.identities) && !r.user.identities.length) throw new Error('Ese correo ya tiene una cuenta. Tocá "Entrar".');
      throw new Error('Se creó la cuenta pero falta confirmar el correo. Revisá tu casilla.');
    }
    guardarSesion(s);
    await alEntrar();
  }

  async function recuperar(email) {
    try { await pedir('/auth/v1/recover', { metodo: 'POST', json: { email: email.trim() }, conSesion: false }); }
    catch (e) { throw new Error(traducir(e)); }
  }

  async function nuevaClave(clave) {
    let u;
    try { u = await pedirConSesion('/auth/v1/user', { metodo: 'PUT', json: { password: clave } }); }
    catch (e) { throw new Error(traducir(e)); }
    if (u && u.id) { sesion.user = { id: u.id, email: u.email }; escribirLocal(K.sesion, sesion); }
    await alEntrar();
  }

  // Al entrar: ver de quién son los productos que hay en este celular
  async function alEntrar() {
    poner('sincronizando', 'Conectando tu cuenta…');
    const nid = await asegurarNegocio();
    const delCelular = leerLocal(K.negocioLocal);
    const ps = await window.ALMACEN.todos();
    if (delCelular && delCelular !== nid) {
      // Son de otra cuenta que se usó en este celular: ya están en internet, se sacan de acá
      for (const p of ps) await borrarLocal(p.id);
      escribirLocal(K.bajada, null);
    } else if (!delCelular) {
      // Primera vez: lo que hay en el celular es de esta persona → se sube todo
      for (const p of ps) if (!esEjemplo(p)) { p._pendiente = true; p._cambio = Date.now(); await guardarLocal(p); }
    }
    escribirLocal(K.negocioLocal, nid);
    // Si el negocio ya tiene sus ajustes en internet (nombre, logo, color), mandan esos.
    // Si es una cuenta nueva, se suben los de este celular.
    escribirLocal(K.ajustesPend, null);
    const tenia = await traerAjustes();
    if (!tenia) escribirLocal(K.ajustesPend, true);
    await sincronizar();
  }

  async function salir(borrarDelCelular) {
    try { await pedir('/auth/v1/logout', { metodo: 'POST' }); } catch (e) { /* igual se cierra */ }
    guardarSesion(null);
    if (borrarDelCelular) {
      const ps = await window.ALMACEN.todos();
      for (const p of ps) await borrarLocal(p.id);
      escribirLocal(K.negocioLocal, null);
    }
    escribirLocal(K.negocio, null);
    escribirLocal(K.bajada, null);
    escribirLocal(K.borrados, null);
    escribirLocal(K.alias, null);
    poner('sin-cuenta');
    if (alCambiarProductos) alCambiarProductos();
  }

  /* ---------------- Negocio ---------------- */
  async function asegurarNegocio() {
    let nid = leerLocal(K.negocio);
    if (nid) return nid;
    const aj = leerLocal('mostrador:ajustes') || {};
    nid = await pedirConSesion('/rest/v1/rpc/crear_negocio', { metodo: 'POST', json: { p_nombre: aj.negocio || 'Mi negocio' } });
    escribirLocal(K.negocio, nid);
    return nid;
  }

  // Si el negocio ya tenía ajustes en internet (otro celular), se usan acá
  async function traerAjustes() {
    const nid = leerLocal(K.negocio);
    const filas = await pedirConSesion('/rest/v1/negocios?id=eq.' + nid + '&select=nombre,datos,activo,plan,vence');
    const n = filas && filas[0];
    if (!n) return false;
    estado.negocio = { nombre: n.nombre, activo: n.activo, plan: n.plan, vence: n.vence };
    const d = n.datos || {};
    if (d.ajustes && !leerLocal(K.ajustesPend)) {
      const antes = leerLocal('mostrador:ajustes') || {};
      const despues = Object.assign({}, antes, d.ajustes);
      const logoAntes = leerLocal('mostrador:logo') || null;
      const logoDespues = d.logo !== undefined ? d.logo || null : logoAntes;
      if (estable(antes) !== estable(despues) || logoAntes !== logoDespues) {
        escribirLocal('mostrador:ajustes', despues);
        escribirLocal('mostrador:logo', logoDespues);
        if (window.MOSTRADOR_RECARGAR_AJUSTES) await window.MOSTRADOR_RECARGAR_AJUSTES();
        if (alCambiarProductos) alCambiarProductos();
      }
    }
    return !!d.ajustes;
  }

  async function subirAjustes() {
    if (!leerLocal(K.ajustesPend)) return;
    const nid = leerLocal(K.negocio);
    const aj = leerLocal('mostrador:ajustes') || {};
    let logo = leerLocal('mostrador:logo');
    if (logo && logo.length > 400000) logo = null; // un logo enorme no se sube
    await pedirConSesion('/rest/v1/negocios?id=eq.' + nid, { metodo: 'PATCH', json: { nombre: aj.negocio || 'Mi negocio', datos: { ajustes: aj, logo: logo || null } }, cabeceras: { Prefer: 'return=minimal' } });
    escribirLocal(K.ajustesPend, null);
  }

  /* ---------------- Productos en el celular ---------------- */
  const A = window.ALMACEN;
  const guardarLocal = A.guardar.bind(A);
  const borrarLocal = A.borrar.bind(A);
  function esEjemplo(p) { return /^ejemplo/.test(p.id); }

  // A partir de ahora, cada vez que la app guarda o borra, queda pendiente para subir
  A.guardar = function (p) {
    if (sesion && !esEjemplo(p)) { p._pendiente = true; p._cambio = Date.now(); if (!p._nube && yaSubido[p.id]) p._nube = yaSubido[p.id]; }
    return guardarLocal(p).then((r) => { programar(); return r; });
  };
  A.borrar = function (id) {
    if (sesion && !/^ejemplo/.test(id)) {
      const lista = leerLocal(K.borrados) || [];
      if (lista.indexOf(id) < 0) lista.push(id);
      escribirLocal(K.borrados, lista);
    }
    return borrarLocal(id).then((r) => { programar(); return r; });
  };

  function ajustesCambiaron() { if (sesion) { escribirLocal(K.ajustesPend, true); programar(); } }

  /* ---------------- Fotos ---------------- */
  function huella(src) {
    // identifica una foto por su contenido, sin recorrerla toda
    let h = 0;
    const paso = Math.max(1, Math.floor(src.length / 4000));
    for (let i = 0; i < src.length; i += paso) h = (h * 31 + src.charCodeAt(i)) | 0;
    return src.length.toString(36) + (h >>> 0).toString(36);
  }

  // dataURL → archivo (se sube tal cual, sin achicar: el recorte usa medidas en píxeles)
  function aBlob(src) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(src || '');
    if (!m) throw new Error('foto inválida');
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: m[1] });
  }

  async function subirFoto(nid, pid, src, anterior) {
    if (!src) return null;
    const k = huella(src);
    if (anterior && anterior.k === k && anterior.path) return anterior;
    const blob = aBlob(src);
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = nid + '/' + pid + '/' + k + '.' + ext;
    await pedirConSesion('/storage/v1/object/fotos/' + path, { metodo: 'POST', cuerpo: blob, cabeceras: { 'Content-Type': blob.type, 'x-upsert': 'true', 'cache-control': '31536000' } });
    return { k: k, path: path };
  }

  // Miniatura chica para el catálogo de los clientes (carga rápido y gasta poco)
  function cargarImg(src) {
    return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  }
  async function subirMini(nid, pid, src, anterior) {
    if (!src) return null;
    const k = huella(src) + 'm';
    if (anterior && anterior.k === k && anterior.path) return anterior;
    const img = await cargarImg(src);
    const s = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/jpeg', 0.78));
    const path = nid + '/' + pid + '/' + k + '.jpg';
    await pedirConSesion('/storage/v1/object/fotos/' + path, { metodo: 'POST', cuerpo: blob, cabeceras: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '31536000' } });
    return { k: k, path: path };
  }

  function urlFoto(path) { return URL_BASE + '/storage/v1/object/public/fotos/' + path; }

  async function bajarFoto(path) {
    let r;
    try { r = await fetch(urlFoto(path)); } catch (e) { throw new ErrorNube('Sin conexión', 'sin-conexion', 0); }
    if (!r.ok) throw new ErrorNube('No se pudo bajar una foto', 'foto', r.status);
    const blob = await r.blob();
    return new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
  }

  async function borrarFotos(paths) {
    if (!paths.length) return;
    try { await pedirConSesion('/storage/v1/object/fotos', { metodo: 'DELETE', json: { prefixes: paths } }); } catch (e) { /* quedan, no es grave */ }
  }

  /* ---------------- Sincronizar ---------------- */
  const CAMPOS_FUERA = ['foto', 'fotos', 'recorte'];
  const srcDe = (f) => (typeof f === 'string' ? f : f && f.src);
  function datosDe(p, nube) {
    const d = {};
    Object.keys(p).forEach((k) => { if (CAMPOS_FUERA.indexOf(k) < 0 && k.charAt(0) !== '_') d[k] = p[k]; });
    d.foto = nube.foto.path;
    d.recorte = nube.recorte ? nube.recorte.path : null;
    d.mini = nube.mini ? nube.mini.path : null;
    d.fotos = nube.fotos.map((f, i) => ({ path: f.path, diseno: !(p.fotos[i] && p.fotos[i].diseno === false) }));
    return d;
  }
  function caminos(n) { return n ? [n.foto && n.foto.path, n.recorte && n.recorte.path, n.mini && n.mini.path].concat((n.fotos || []).map((f) => f && f.path)).filter(Boolean) : []; }
  function mismasFotos(n, d) {
    if (!n || !n.foto || n.foto.path !== d.foto) return false;
    if ((n.recorte ? n.recorte.path : null) !== (d.recorte || null)) return false;
    const a = n.fotos || [], b = d.fotos || [];
    return a.length === b.length && b.every((x, i) => a[i] && a[i].path === x.path);
  }

  function estable(v) {
    if (Array.isArray(v)) return '[' + v.map(estable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + estable(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }

  // Lo que ya se subió de cada producto (por si la app guarda una copia vieja sin ese dato)
  const yaSubido = {};

  let corriendo = null;
  let otraVez = false;
  let timer = null;

  function programar(ms) {
    if (!sesion || apagado) return;
    clearTimeout(timer);
    timer = setTimeout(() => sincronizar(), ms === undefined ? 2500 : ms);
  }

  let apagado = false;
  async function sincronizar() {
    if (!sesion || apagado) return;
    if (corriendo) { otraVez = true; return corriendo; }
    corriendo = (async () => {
      let cambiaronLocales = false;
      try {
        const nid = await asegurarNegocio();
        await subirAjustes();
        await traerAjustes();

        // 1. Borrados
        const borrados = leerLocal(K.borrados) || [];
        for (const id of borrados.slice()) {
          await pedirConSesion('/rest/v1/productos?negocio_id=eq.' + nid + '&id=eq.' + encodeURIComponent(id), { metodo: 'PATCH', json: { borrado: true, datos: {} }, cabeceras: { Prefer: 'return=minimal' } });
          const lista = await pedirConSesion('/storage/v1/object/list/fotos', { metodo: 'POST', json: { prefix: nid + '/' + id + '/', limit: 100 } }).catch(() => []);
          await borrarFotos((lista || []).map((o) => nid + '/' + id + '/' + o.name));
          const resto = (leerLocal(K.borrados) || []).filter((x) => x !== id);
          escribirLocal(K.borrados, resto);
        }

        // 2. Subir lo pendiente (los que se subieron antes de la Etapa 13 no tienen miniatura)
        let ps = await A.todos();
        for (const p of ps) {
          if (!esEjemplo(p) && p._nube && p._nube.foto && !p._nube.mini && !p._pendiente) { p._pendiente = true; p._cambio = Date.now(); await guardarLocal(p); }
        }
        let pend = ps.filter((p) => p._pendiente && !esEjemplo(p));
        estado.pendientes = pend.length;
        let hechos = 0;
        for (const p of pend) {
          poner('sincronizando', 'Guardando en internet ' + (hechos + 1) + ' de ' + pend.length + '…');
          const cambio = p._cambio;
          const viejo = p._nube || yaSubido[p.id] || { fotos: [] };
          const fotos = (p.fotos || []).map((f) => (typeof f === 'string' ? { src: f, diseno: true } : f));
          p.fotos = fotos;
          const nube = { foto: await subirFoto(nid, p.id, p.foto, viejo.foto), recorte: await subirFoto(nid, p.id, p.recorte, viejo.recorte), mini: await subirMini(nid, p.id, p.foto, viejo.mini), fotos: [] };
          for (const f of fotos) { const k = huella(srcDe(f)); nube.fotos.push(await subirFoto(nid, p.id, srcDe(f), (viejo.fotos || []).find((x) => x && x.k === k))); }
          await pedirConSesion('/rest/v1/productos?on_conflict=negocio_id,id', { metodo: 'POST', json: [{ id: p.id, negocio_id: nid, datos: datosDe(p, nube), borrado: false }], cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
          yaSubido[p.id] = nube;
          // fotos que ya no se usan
          const usadas = caminos(nube);
          await borrarFotos(caminos(viejo).filter((x) => usadas.indexOf(x) < 0));
          // si mientras subía no lo cambiaron, queda al día
          const actual = (await A.todos()).find((x) => x.id === p.id);
          if (actual) {
            actual._nube = nube;
            if (actual._cambio === cambio) actual._pendiente = false;
            await guardarLocal(actual);
          }
          hechos++;
          estado.pendientes = pend.length - hechos;
        }

        // 3. Bajar lo que cambió en otros celulares
        poner('sincronizando', 'Buscando cambios…');
        const desde = leerLocal(K.bajada);
        const filas = await pedirConSesion('/rest/v1/productos?negocio_id=eq.' + nid + (desde ? '&actualizado=gt.' + encodeURIComponent(desde) : '') + '&select=id,datos,borrado,actualizado&order=actualizado.asc&limit=1000');
        ps = await A.todos();
        let ultima = desde;
        for (const f of filas || []) {
          ultima = f.actualizado;
          const loc = ps.find((x) => x.id === f.id);
          if (f.borrado) { if (loc) { await borrarLocal(f.id); cambiaronLocales = true; } continue; }
          if (loc && loc._pendiente) continue; // lo de este celular es más nuevo: se sube en la próxima
          const d = f.datos || {};
          const nuevo = Object.assign({}, d);
          if (loc && mismasFotos(loc._nube, d)) {
            nuevo.foto = loc.foto;
            nuevo.recorte = loc.recorte || null;
            nuevo.fotos = (d.fotos || []).map((x, i) => ({ src: srcDe(loc.fotos[i]), diseno: x.diseno !== false }));
            nuevo._nube = loc._nube;
            if (estable(datosDe(loc, loc._nube)) === estable(d)) continue; // nada cambió
          } else {
            poner('sincronizando', 'Bajando fotos…');
            const bajar = async (path) => { if (!path) return [null, null]; const src = await bajarFoto(path); return [src, { k: huella(src), path: path }]; };
            const fo = await bajar(d.foto), re = await bajar(d.recorte);
            nuevo.foto = fo[0]; nuevo.recorte = re[0];
            nuevo.fotos = [];
            const nf = [];
            for (const x of d.fotos || []) { const r = await bajar(x.path); nuevo.fotos.push({ src: r[0], diseno: x.diseno !== false }); nf.push(r[1]); }
            nuevo._nube = { foto: fo[1], recorte: re[1], fotos: nf };
          }
          nuevo._nube = Object.assign({}, nuevo._nube, { mini: d.mini ? { k: huella(nuevo.foto) + 'm', path: d.mini } : null });
          yaSubido[f.id] = nuevo._nube;
          nuevo.id = f.id;
          nuevo._pendiente = false;
          await guardarLocal(nuevo);
          cambiaronLocales = true;
        }
        if (ultima) escribirLocal(K.bajada, ultima);

        estado.pendientes = (await A.todos()).filter((p) => p._pendiente && !esEjemplo(p)).length;
        estado.ultima = Date.now();
        poner(estado.pendientes ? 'sincronizando' : 'al-dia', estado.pendientes ? 'Quedan cambios por subir' : '');
        if (estado.pendientes) otraVez = true;
      } catch (e) {
        if (!sesion) { poner('sin-cuenta', estado.mensaje); }
        else if (e.codigo === 'sin-conexion') poner('sin-conexion', 'Sin internet: se guarda cuando vuelva la conexión.');
        else if (e.status === 401 || e.status === 403) poner('error', 'Tu cuenta no tiene permiso. Si te dieron de baja, hablá con Mostrador.');
        else poner('error', 'No se pudo guardar en internet: ' + e.message);
      } finally {
        corriendo = null;
        if (cambiaronLocales && alCambiarProductos) alCambiarProductos();
        if (otraVez) { otraVez = false; programar(estado.fase === 'sincronizando' ? 500 : 15000); }
      }
    })();
    return corriendo;
  }

  // Volver a probar cuando vuelve internet o la app vuelve a primer plano, y cada 2 minutos
  window.addEventListener('online', () => programar(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') programar(800); });
  setInterval(() => { if (sesion && document.visibilityState === 'visible') sincronizar(); }, 120000);

  // Si se volvió del correo de "olvidé mi contraseña", el link trae una sesión temporal
  let recuperando = false;
  (function leerLinkDelCorreo() {
    const h = location.hash || '';
    if (h.indexOf('access_token=') < 0) return;
    const q = new URLSearchParams(h.replace(/^#/, ''));
    if (q.get('access_token')) {
      guardarSesion({ access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: Number(q.get('expires_in')) || 3600, user: {} });
      recuperando = q.get('type') === 'recovery';
      history.replaceState(null, '', location.pathname + '#ajustes');
      estado.fase = 'al-dia';
    }
  })();

  /* ---------------- Catálogo con link ---------------- */
  function linkDe(alias) { return location.origin + location.pathname.replace(/index\.html$/, '') + '?c=' + encodeURIComponent(alias); }

  async function linkCatalogo() {
    let alias = leerLocal(K.alias);
    if (!alias) {
      try { alias = await pedirConSesion('/rest/v1/rpc/catalogo_alias', { metodo: 'POST', json: {} }); }
      catch (e) { throw new Error(e.codigo === 'sin-conexion' ? 'No hay conexión a internet. Probá de nuevo.' : 'No se pudo armar el link: ' + e.message); }
      escribirLocal(K.alias, alias);
    }
    return linkDe(alias);
  }

  // Lo que ve el cliente (no hace falta cuenta)
  async function catalogoPublico(alias) {
    let r;
    try { r = await pedir('/rest/v1/rpc/catalogo_publico', { metodo: 'POST', json: { p_alias: alias }, conSesion: false }); }
    catch (e) { if (e.codigo === 'sin-conexion') throw new Error('sin-conexion'); throw e; }
    if (!r || !r.negocio) return null;
    const productos = (r.productos || []).map((x) => {
      const d = x.datos || {};
      return Object.assign({}, d, {
        id: x.id,
        foto: d.mini ? urlFoto(d.mini) : urlFoto(d.foto),
        fotoGrande: urlFoto(d.foto),
        fotos: (d.fotos || []).map((f) => ({ src: urlFoto(f.path), diseno: f.diseno !== false }))
      });
    });
    return { negocio: r.negocio, productos: productos };
  }

  return {
    get sesion() { return sesion; },
    linkCatalogo: linkCatalogo,
    catalogoPublico: catalogoPublico,
    apagar() { apagado = true; clearTimeout(timer); },
    get email() { return sesion && sesion.user && sesion.user.email; },
    get recuperando() { return recuperando; },
    set recuperando(v) { recuperando = v; },
    estado: estado,
    entrar: entrar,
    crearCuenta: crearCuenta,
    recuperar: recuperar,
    nuevaClave: nuevaClave,
    salir: salir,
    sincronizar: sincronizar,
    ajustesCambiaron: ajustesCambiaron,
    alCambiar(fn) { oyentes.push(fn); },
    set alCambiarProductos(fn) { alCambiarProductos = fn; },
    async pendientes() { return (await A.todos()).filter((p) => p._pendiente && !esEjemplo(p)).length + (leerLocal(K.borrados) || []).length; },
    iniciar() { if (sesion) programar(1500); }
  };
})();
