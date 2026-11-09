/*
  Mostrador: sacás la foto, ponés nombre y precio, elegís un sticker
  y lo compartís en tus redes. Cada foto queda en tu catálogo.

  Pantallas (se eligen con el # de la dirección):
    #inicio    -> botón de cámara y tus publicaciones
    #editor    -> nombre, precio y sticker de la foto
    #catalogo  -> lo que ven tus clientes (arman el pedido por WhatsApp)
    #ajustes   -> datos de tu negocio
*/
(function () {
  'use strict';

  const S = window.STICKERS;
  const ALMACEN = window.ALMACEN;
  const RUBROS = window.RUBROS;
  const FOTOS = window.MOSTRADOR_FOTOS || {};
  const app = document.getElementById('app');
  const capa = document.getElementById('capa');
  const COLORES = ['#1C5BB8', '#A3195B', '#12715F', '#C2410C', '#5B3FA6', '#15161D'];

  const REDES = [
    { id: 'estado', nombre: 'Estado de WhatsApp', app: 'WhatsApp', ayuda: 'En el menú elegí WhatsApp y después "Mi estado".' },
    { id: 'ig-historia', nombre: 'Historia de Instagram', app: 'Instagram', ayuda: 'Elegí Instagram y después "Historia".' },
    { id: 'ig-post', nombre: 'Publicación de Instagram', app: 'Instagram', ayuda: 'Elegí Instagram y después "Feed" (si te pide recortar, ajustá el encuadre). El texto ya está copiado: pegalo en la descripción.' },
    { id: 'facebook', nombre: 'Facebook', app: 'Facebook', ayuda: 'Elegí Facebook. El texto ya está copiado: pegalo al publicar.' },
    { id: 'marketplace', nombre: 'Marketplace', app: 'la galería', ayuda: 'Guardá la imagen y abrí Marketplace → Vender. Título, precio y descripción ya están copiados.' },
    { id: 'tiktok', nombre: 'TikTok', app: 'TikTok', ayuda: 'Elegí TikTok. El texto ya está copiado: pegalo en la descripción.' }
  ];

  /* ---------------- Utilidades ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesos = S.pesos;
  const precioDe = (p) => S.precioTexto(p.precio, p.moneda);
  const MAX_FOTOS = 20;
  const COMBUSTIBLES = ['Nafta', 'Diésel', 'GNC', 'Nafta y GNC', 'Híbrido', 'Eléctrico'];
  const CAJAS = ['Manual', 'Automática'];

  function detectarRubro(nombre) { return window.RUBROS.detectar(nombre, ajustes.tipoNegocio); }
  function esVehiculo(p) { return (p.rubroManual && p.rubro ? p.rubro : detectarRubro(p.nombre)) === 'vehiculos'; }
  const fotoSrc = (f) => (typeof f === 'string' ? f : f && f.src);
  // "2019 · 85.000 km · Diésel · Manual"
  function detalleAuto(p, corto) {
    const a = p.auto || {};
    if (!esVehiculo(p)) return '';
    const km = a.km !== undefined && a.km !== '' && a.km !== null ? Number(a.km).toLocaleString('es-AR') + ' km' : '';
    return [a.anio, km].concat(corto ? [] : [a.combustible, a.caja]).filter(Boolean).join(' · ');
  }
  function extrasAuto(p) {
    const a = p.auto || {};
    if (!esVehiculo(p)) return [];
    return [a.financiacion ? 'Financiación' : '', a.permuta ? 'Acepta permuta' : ''].filter(Boolean);
  }
  function cantidadFotos(p) { return 1 + ((p.fotos && p.fotos.length) || 0); }
  // Total del pedido separado por moneda: "$ 25.000 + US$ 1.200"
  function totalTexto(lineas) {
    const t = {};
    lineas.forEach((l) => { const m = l.p.moneda === 'USD' ? 'USD' : 'ARS'; t[m] = (t[m] || 0) + l.p.precio * l.n; });
    const partes = ['ARS', 'USD'].filter((m) => t[m] !== undefined).map((m) => S.precioTexto(t[m], m));
    return partes.length ? partes.join(' + ') : pesos(0);
  }
  function lineasPedido() {
    const ps = estado.productos;
    return Object.keys(estado.pedido).map((id) => ({ p: ps.find((x) => x.id === id), n: estado.pedido[id] })).filter((l) => l.p);
  }
  const ICONO_FOTOS = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>';
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const local = {
    leer(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  let temporizador = null;
  function avisar(texto, boton) {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.classList.toggle('con-boton', !!boton);
    if (boton) {
      const b = document.createElement('button');
      b.dataset.accion = boton.accion; b.textContent = boton.texto;
      el.appendChild(b);
    }
    el.classList.add('ver');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => el.classList.remove('ver'), boton ? 5000 : 2800);
  }
  function ocultarAviso() { const el = document.getElementById('aviso'); el.classList.remove('ver'); }

  function copiar(texto) {
    try { if (navigator.clipboard) return navigator.clipboard.writeText(texto).then(() => true, () => false); } catch (e) { /* sin portapapeles */ }
    return Promise.resolve(false);
  }

  function cargarImagen(src) {
    return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  }

  // Achica la foto de la cámara (suelen ser enormes) para que la app vaya rápido
  async function prepararFoto(archivo) {
    const url = URL.createObjectURL(archivo);
    try {
      const img = await cargarImagen(url);
      const max = 2048;
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.88);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /* ---------------- Estado ---------------- */
  const AJUSTES_BASE = { negocio: 'Mi negocio', whatsapp: '', color: '#1C5BB8', mostrarNegocio: true, mostrarCodigo: false, redes: ['estado', 'ig-historia'], estilo: 'estrella', fondo: 'desenfocado', letra: 'moderna' };
  const ajustes = Object.assign({}, AJUSTES_BASE, local.leer('mostrador:ajustes') || {});
  function guardarAjustes() { local.escribir('mostrador:ajustes', ajustes); }

  // Logo del negocio: se guarda aparte porque es una imagen
  let logo = null;
  function cargarLogo() {
    const src = local.leer('mostrador:logo');
    if (!src) { logo = null; return Promise.resolve(); }
    return cargarImagen(src).then((i) => { logo = i; }, () => { logo = null; });
  }
  async function guardarLogo(archivo) {
    const url = URL.createObjectURL(archivo);
    try {
      const img = await cargarImagen(url);
      const s = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const datos = c.toDataURL('image/png');
      if (!local.escribir('mostrador:logo', datos)) { avisar('No se pudo guardar el logo en este navegador.'); return; }
      await cargarLogo();
      avisar('Logo guardado. Ya aparece en tus imágenes.');
    } catch (e) {
      avisar('No pudimos abrir esa imagen. Probá con otra.');
    } finally { URL.revokeObjectURL(url); }
  }

  const estado = {
    productos: [],
    editor: null,     // la publicación que se está armando
    pedido: {},       // catálogo: id -> cantidad
    filtro: { q: '', rubro: 'todos' },  // buscador y rubro elegido (inicio y catálogo)
    capa: null
  };

  function aplicarColor() { document.documentElement.style.setProperty('--marca', ajustes.color); }

  function siguienteCodigo() {
    const n = estado.productos.reduce((m, p) => Math.max(m, parseInt(p.codigo, 10) || 0), 0) + 1;
    return String(n).padStart(2, '0');
  }

  async function cargarProductos() {
    estado.productos = await ALMACEN.todos();
    // La primera vez, un producto de ejemplo para que no esté vacío
    if (!estado.productos.length && !local.leer('mostrador:ejemplo') && FOTOS.taza) {
      await ALMACEN.guardar({ id: 'ejemplo-taza', foto: FOTOS.taza, nombre: 'Taza de cerámica con cuchara', precio: 10000, estilo: 'estrella', posicion: 'abajo-der', codigo: '01', fecha: Date.now() });
      local.escribir('mostrador:ejemplo', true);
      estado.productos = await ALMACEN.todos();
    }
  }

  /* ---------------- Navegación ---------------- */
  function vistaActual() {
    const h = location.hash.replace(/^#/, '');
    return ['editor', 'catalogo', 'ajustes'].indexOf(h) >= 0 ? h : 'inicio';
  }

  function navegar() {
    cerrarCapa();
    if (!ajustes.tipoNegocio && vistaActual() === 'inicio') setTimeout(() => { if (!estado.capa && !ajustes.tipoNegocio) abrirCapa({ tipo: 'negocio' }); }, 300);
    let v = vistaActual();
    if (v === 'editor' && !estado.editor) { location.replace('#inicio'); v = 'inicio'; }
    document.body.dataset.vista = v;
    if (v === 'editor') { app.innerHTML = vistaEditor(); prepararEditor(); }
    else if (v === 'catalogo') app.innerHTML = vistaCatalogo();
    else if (v === 'ajustes') app.innerHTML = vistaAjustes();
    else app.innerHTML = vistaInicio();
    window.scrollTo(0, 0);
  }

  const ICONO_TACHO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';

  /* ================= Rubros y buscador ================= */
  function rubroDe(p) { return p.rubroManual && p.rubro ? p.rubro : detectarRubro(p.nombre); }

  function filtrar(lista) {
    const f = estado.filtro;
    const palabras = RUBROS.normalizar(f.q).split(' ').filter(Boolean);
    return lista.filter((p) => {
      const r = rubroDe(p);
      if (f.rubro !== 'todos' && r !== f.rubro) return false;
      if (!palabras.length) return true;
      const texto = RUBROS.normalizar([p.nombre, RUBROS.nombreDe(r), p.codigo, p.precio, precioDe(p), detalleAuto(p)].concat(extrasAuto(p)).join(' '));
      return palabras.every((w) => texto.indexOf(w) >= 0);
    });
  }

  // Buscador + botones de rubro (solo los rubros que tienen productos)
  function barraBusqueda(lugar) {
    const f = estado.filtro;
    const cuenta = {};
    estado.productos.forEach((p) => { const r = rubroDe(p); cuenta[r] = (cuenta[r] || 0) + 1; });
    const rubros = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a] || RUBROS.nombreDe(a).localeCompare(RUBROS.nombreDe(b), 'es'));
    if (f.rubro !== 'todos' && !cuenta[f.rubro]) f.rubro = 'todos';
    return '<div class="busqueda ' + lugar + '">' +
      '<label class="buscador"><span class="sr">Buscar productos</span>' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>' +
      '<input type="search" id="buscar-' + lugar + '" data-buscar="' + lugar + '" placeholder="Buscar por nombre, rubro o precio" value="' + esc(f.q) + '" autocomplete="off" enterkeyhint="search"></label>' +
      (rubros.length > 1 ? '<div class="chips" role="group" aria-label="Rubros">' +
        '<button class="chip" data-accion="rubro-filtro" data-rubro="todos" aria-pressed="' + (f.rubro === 'todos') + '">Todos <b>' + estado.productos.length + '</b></button>' +
        rubros.map((r) => '<button class="chip" data-accion="rubro-filtro" data-rubro="' + r + '" aria-pressed="' + (f.rubro === r) + '">' + esc(RUBROS.nombreDe(r)) + ' <b>' + cuenta[r] + '</b></button>').join('') + '</div>' : '') +
      '</div>';
  }

  function sinResultados() {
    return '<p class="vacio">No hay productos que coincidan' + (estado.filtro.q ? ' con "' + esc(estado.filtro.q) + '"' : '') + '. <button class="btn-texto" data-accion="limpiar-filtro">Ver todos</button></p>';
  }

  function refrescarListas() {
    const g = document.getElementById('grilla-inicio');
    if (g) g.innerHTML = grillaInicio();
    const c = document.getElementById('grilla-catalogo');
    if (c) c.innerHTML = grillaCatalogo();
    app.querySelectorAll('[data-accion="rubro-filtro"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rubro === estado.filtro.rubro)));
  }

  function grillaInicio() {
    const ps = filtrar(estado.productos);
    if (!ps.length) return sinResultados();
    return '<div class="grilla">' + ps.map((p) =>
      '<div class="item">' +
      '<button class="miniatura" data-accion="abrir" data-id="' + esc(p.id) + '" aria-label="' + esc('Editar ' + p.nombre + ', ' + precioDe(p) + (cantidadFotos(p) > 1 ? ', ' + cantidadFotos(p) + ' fotos' : '')) + '">' +
      '<img src="' + p.foto + '" alt="" loading="lazy"><span class="precio-chip">' + esc(precioDe(p)) + '</span>' +
      (cantidadFotos(p) > 1 ? '<span class="fotos-chip">' + ICONO_FOTOS + cantidadFotos(p) + '</span>' : '') +
      '<span class="mini-nombre">' + esc(p.nombre) + '<small>' + esc(RUBROS.nombreDe(rubroDe(p))) + '</small></span></button>' +
      '<button class="borrar-mini" data-accion="pedir-borrar" data-id="' + esc(p.id) + '" aria-label="' + esc('Eliminar ' + p.nombre) + '">' + ICONO_TACHO + '</button>' +
      '</div>').join('') + '</div>';
  }

  /* ================= Inicio ================= */
  function vistaInicio() {
    const ps = estado.productos;
    const grilla = ps.length
      ? (ps.length > 1 ? barraBusqueda('inicio') : '') + '<div id="grilla-inicio">' + grillaInicio() + '</div>'
      : '<p class="vacio">Todavía no sacaste fotos. Tocá "Sacar foto" para empezar.</p>';

    return '<header class="barra-top"><div class="marca-app"><i>M</i>Mostrador</div>' +
      '<a class="btn-icono" href="#ajustes" aria-label="Ajustes del negocio">Ajustes</a></header>' +
      '<main class="pagina">' +
      '<section class="camara">' +
      '<p class="negocio-nombre">' + esc(ajustes.negocio) + '</p>' +
      '<h1>Sacá la foto, poné el precio y compartila</h1>' +
      '<label class="btn-camara" for="foto-camara"><span class="icono-camara" aria-hidden="true"></span>Sacar foto</label>' +
      '<input class="oculto" id="foto-camara" type="file" accept="image/*" capture="environment" data-accion="foto">' +
      '<label class="btn btn-claro" for="foto-galeria">Elegir de la galería</label>' +
      '<input class="oculto" id="foto-galeria" type="file" accept="image/*" data-accion="foto">' +
      '</section>' +
      '<section class="seccion">' +
      '<div class="fila"><h2>Tus productos</h2><a class="btn-texto" href="#catalogo">Ver mi catálogo →</a></div>' +
      '<p class="detalle">Tocá un producto para cambiarlo y volver a compartirlo. Con el tacho lo eliminás.</p>' +
      grilla + '</section>' +
      (ALMACEN.soloMemoria ? '<p class="nota">Este navegador no deja guardar: tus fotos se borran al cerrar la página.</p>' : '') +
      '</main>';
  }

  async function nuevaFoto(archivo) {
    avisar('Preparando la foto…');
    try {
      const foto = await prepararFoto(archivo);
      abrirEditor({ id: null, foto: foto, nombre: '', precio: '', estilo: ajustes.estilo || 'estrella', fondo: ajustes.fondo, letra: ajustes.letra, posicion: 'abajo-der', codigo: siguienteCodigo() });
    } catch (e) {
      avisar('No pudimos abrir esa foto. Probá con otra.');
    }
  }

  async function abrirEditor(p) {
    estado.editor = Object.assign({ fondo: 'desenfocado', letra: 'moderna', capas: {} }, p);
    estado.editor.fotos = (p.fotos || []).slice();
    estado.editor.auto = Object.assign({}, p.auto || {});
    estado.editor.moneda = 'ARS';  // dólares: más adelante
    estado.editor.fotos = (p.fotos || []).map((f) => (typeof f === 'string' ? { src: f, diseno: true } : Object.assign({}, f)));
    estado.editor.vista = 0;       // 0 = foto principal; 1, 2… = las otras
    estado.editor.imgsExtra = {};
    estado.editor.herramienta = (p.nombre && Number(p.precio) > 0) ? null : 'datos';
    estado.editor.firma = firmaEditor(estado.editor);
    estado.editor.capas = JSON.parse(JSON.stringify(p.capas || {}));
    if (!estado.editor.modoFondo) estado.editor.modoFondo = p.recortado ? 'diseno' : 'original';
    estado.editor.img = await cargarImagen(p.foto);
    estado.editor.imgRecorte = p.recorte ? await cargarImagen(p.recorte) : null;
    if (location.hash === '#editor') navegar(); else location.hash = 'editor';
  }

  /* ================= Editor ================= */
  const HERRAMIENTAS = [
    ['fotos', 'Fotos', '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="m3 16 4-4 4 4"/>'],
    ['datos', 'Texto', '<path d="M5 7V4h14v3M12 4v16M9 20h6"/>'],
    ['sticker', 'Sticker', '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.6"/>'],
    ['fondo', 'Fondo', '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'],
    ['letra', 'Letra', '<path d="M2.5 19 8 5l5.5 14M4.6 14h6.8"/><circle cx="18" cy="16" r="3"/><path d="M21 12.5V19"/>'],
    ['mas', 'Más', '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>']
  ];
  const TITULO_PANEL = { fotos: 'Fotos del producto', datos: 'Nombre, precio y rubro', sticker: 'Sticker del precio', fondo: 'Fondo de la foto', letra: 'Letra del nombre', mas: 'Nombre del negocio y más' };

  // Para saber si quedaron cambios sin guardar
  function firmaEditor(e) {
    return JSON.stringify([e.nombre || '', Number(e.precio) || 0, e.rubroManual ? e.rubro : '', e.estilo, e.fondo, e.letra, e.modoFondo, e.capas || {},
      e.moneda || 'ARS', e.auto || {}, (e.foto || '').length, (e.fotos || []).map((f) => fotoSrc(f).length + fotoSrc(f).slice(-16) + (f.diseno === false ? '-' : '+'))]);
  }

  function vistaEditor() {
    const e = estado.editor;
    const h = e.herramienta;
    return '<div class="editor2' + (h ? ' con-panel' : '') + '">' +
      '<header class="ed-top"><a class="ed-volver" href="#inicio" data-accion="salir-editor" aria-label="Volver al inicio"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>' +
      '<b>' + (e.id ? 'Editar publicación' : 'Nueva publicación') + '</b>' +
      '<button class="btn ed-guardar" data-accion="guardar">Guardar</button>' +
      '<button class="btn btn-marca ed-compartir" data-accion="compartir">Compartir</button></header>' +
      '<div class="ed-escena" id="ed-escena">' +
      '<div class="ed-foto"><div class="vista-previa" style="' + proporcion(e) + '"><canvas id="lienzo" aria-label="Vista previa. Tocá el precio o el nombre para cambiarlos; arrastralos para moverlos."></canvas>' +
      '<span class="trabajando-aviso" aria-live="polite">Recortando el producto…<small>La primera vez puede tardar unos segundos</small></span>' +
      '<div id="ed-navfotos">' + navFotos() + '</div>' +
      '<span class="ed-ayuda" id="ed-ayuda">Tocá el precio o el nombre para cambiarlos. Arrastralos para moverlos.</span></div></div>' +
      '<nav class="ed-herramientas" aria-label="Herramientas">' + HERRAMIENTAS.map((t) =>
        '<button data-accion="herramienta" data-h="' + t[0] + '" aria-pressed="' + (h === t[0]) + '">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + t[2] + '</svg><span>' + t[1] + '</span>' +
        (t[0] === 'fotos' ? '<b class="cuenta-fotos" id="cuenta-fotos">' + (1 + e.fotos.length) + '</b>' : '') + '</button>').join('') +
        '<button class="ed-reacomodar" data-accion="reacomodar" aria-label="Reacomodar: volver precio, nombre y logo a su lugar y tamaño">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg><span>Reacomodar</span></button>' +
        '</nav>' +
      '</div>' +
      '<section class="ed-panel" id="ed-panel" aria-label="' + esc(h ? TITULO_PANEL[h] : '') + '"' + (h ? '' : ' hidden') + '>' +
      '<div class="ed-panel-cab"><b id="ed-panel-titulo">' + esc(h ? TITULO_PANEL[h] : '') + '</b><button class="btn btn-chico" data-accion="cerrar-panel">Listo</button></div>' +
      '<div id="panel-opciones">' + (h ? panelOpciones() : '') + '</div></section>' +
      '</div>';
  }

  // Flechas, puntitos y "con precio / sin precio" cuando hay varias fotos
  function navFotos() {
    const e = estado.editor;
    const n = 1 + e.fotos.length;
    if (n < 2) return '';
    const v = e.vista;
    const extra = v > 0 ? e.fotos[v - 1] : null;
    return (v > 0 ? '<button class="ed-flecha izq" data-accion="foto-anterior" aria-label="Foto anterior">‹</button>' : '') +
      (v < n - 1 ? '<button class="ed-flecha der" data-accion="foto-siguiente" aria-label="Foto siguiente">›</button>' : '') +
      '<div class="ed-puntos" aria-live="polite"><span class="sr">Foto ' + (v + 1) + ' de ' + n + '</span>' + Array.from({ length: n }, (x, i) => '<i' + (i === v ? ' class="activo"' : '') + '></i>').join('') + '</div>' +
      (extra ? '<button class="ed-chip-diseno" data-accion="foto-diseno-vista" aria-pressed="' + (extra.diseno !== false) + '">' + (extra.diseno !== false ? '✓ Con precio y nombre' : 'Sin precio · tocá para ponerlo') + '</button>'
        : '<span class="ed-chip-principal">Principal</span>');
  }

  function imgActual() {
    const e = estado.editor;
    if (!e.vista) return e.img;
    const f = e.fotos[e.vista - 1];
    return (f && e.imgsExtra[fotoSrc(f)]) || e.img;
  }

  async function cambiarVista(v) {
    const e = estado.editor;
    const n = 1 + e.fotos.length;
    v = Math.max(0, Math.min(n - 1, v));
    if (v === e.vista && v !== 0) { refrescarNavFotos(); return; }
    e.vista = v;
    if (v > 0) {
      const src = fotoSrc(e.fotos[v - 1]);
      if (!e.imgsExtra[src]) { try { e.imgsExtra[src] = await cargarImagen(src); } catch (err) { /* nada */ } }
    }
    refrescarNavFotos();
    ajustarVista();
    dibujarVista();
    if (e.herramienta === 'fotos' || e.herramienta === 'fondo') refrescarPanel();
  }

  function refrescarNavFotos() {
    const n = document.getElementById('ed-navfotos');
    if (n) n.innerHTML = navFotos();
    const c = document.getElementById('cuenta-fotos'); if (c) c.textContent = 1 + estado.editor.fotos.length;
  }

  // Abre (o cierra) el panel de una herramienta sin rehacer la foto
  function abrirHerramienta(h, enfocar) {
    const e = estado.editor;
    e.herramienta = h || null;
    const ed = app.querySelector('.editor2');
    if (!ed) return;
    ed.classList.toggle('con-panel', !!h);
    app.querySelectorAll('[data-accion="herramienta"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.h === h)));
    const panel = document.getElementById('ed-panel');
    panel.hidden = !h;
    panel.setAttribute('aria-label', h ? TITULO_PANEL[h] : '');
    document.getElementById('ed-panel-titulo').textContent = h ? TITULO_PANEL[h] : '';
    document.getElementById('panel-opciones').innerHTML = h ? panelOpciones() : '';
    if (h) dibujarMiniaturas();
    ajustarVista();
    if (enfocar) {
      const c = document.getElementById(enfocar);
      if (c) { c.focus(); if (c.select) c.select(); }
    }
  }

  // La foto entra entera en el espacio que queda (achica cuando se abre el panel o el teclado)
  function ajustarVista() {
    const caja = app.querySelector('.ed-foto');
    const vista = app.querySelector('.editor2 .vista-previa');
    const e = estado.editor;
    if (!caja || !vista || !e) return;
    const t = S.tamanoSalida(imgActual());
    const r = t.W / t.H;
    const W = caja.clientWidth, H = caja.clientHeight;
    if (!W || !H) return;
    let w = W, hh = W / r;
    if (hh > H) { hh = H; w = H * r; }
    vista.style.width = Math.floor(w) + 'px';
    vista.style.height = Math.floor(hh) + 'px';
  }

  function campoDatos() {
    const e = estado.editor;
    return '<div class="campos">' +
      '<div class="campo"><label for="nombre">Nombre del producto</label><input id="nombre" data-campo="nombre" value="' + esc(e.nombre) + '" placeholder="Ej: Vasos de vidrio x 6" autocomplete="off" enterkeyhint="next"></div>' +
      '<div class="campo"><label for="precio">Precio</label><div class="con-signo"><span>$</span><input id="precio" data-campo="precio" inputmode="numeric" value="' + esc(e.precio ? Number(e.precio).toLocaleString('es-AR') : '') + '" placeholder="5.000" autocomplete="off" enterkeyhint="done"></div></div>' +
      '<div class="campo campo-rubro"><label for="rubro">Rubro <span class="detalle" id="rubro-ayuda">' + (e.rubroManual ? '(elegido por vos)' : '(lo detecta la app)') + '</span></label>' +
      '<select id="rubro" data-campo="rubro">' + RUBROS.TODOS.map((r) => '<option value="' + r.id + '"' + (r.id === rubroEditor() ? ' selected' : '') + '>' + esc(r.nombre) + '</option>').join('') + '</select></div>' +
      '</div>' + camposAuto();
  }

  function camposAuto() {
    const a = estado.editor.auto || {};
    const sel = (k, ops, titulo) => '<div class="campo"><label for="auto-' + k + '">' + titulo + '</label><select id="auto-' + k + '" data-auto="' + k + '"><option value="">—</option>' +
      ops.map((o) => '<option' + (a[k] === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
    return '<fieldset class="campos-auto" id="campos-auto"' + (rubroEditor() === 'vehiculos' ? '' : ' hidden') + '><legend>Datos del vehículo</legend><div class="campos">' +
      '<div class="campo"><label for="auto-anio">Año</label><input id="auto-anio" data-auto="anio" inputmode="numeric" maxlength="4" placeholder="2019" value="' + esc(a.anio || '') + '" autocomplete="off"></div>' +
      '<div class="campo"><label for="auto-km">Kilómetros</label><input id="auto-km" data-auto="km" inputmode="numeric" placeholder="85.000" value="' + esc(a.km !== undefined && a.km !== '' ? Number(a.km).toLocaleString('es-AR') : '') + '" autocomplete="off"></div>' +
      sel('combustible', COMBUSTIBLES, 'Combustible') + sel('caja', CAJAS, 'Caja') + '</div>' +
      '<label class="interruptor"><input type="checkbox" data-auto="financiacion"' + (a.financiacion ? ' checked' : '') + '><span>Financiación</span></label>' +
      '<label class="interruptor"><input type="checkbox" data-auto="permuta"' + (a.permuta ? ' checked' : '') + '><span>Acepta permuta</span></label>' +
      '</fieldset>';
  }

  function panelFotos() {
    const e = estado.editor;
    const total = 1 + e.fotos.length;
    return '<p class="detalle">Deslizá la foto con el dedo para pasar de una a otra. La <b>principal</b> es la que se ve primero en tu catálogo. Elegí en cuáles va el precio.</p>' +
      '<div class="tira-fotos">' +
      '<figure class="foto-item principal' + (e.vista === 0 ? ' viendo' : '') + '"><button class="foto-ver" data-accion="foto-ver" data-v="0" aria-label="Ver la foto principal"><img src="' + e.foto + '" alt=""></button><figcaption>Principal</figcaption></figure>' +
      e.fotos.map((f, i) => '<figure class="foto-item' + (e.vista === i + 1 ? ' viendo' : '') + '"><button class="foto-ver" data-accion="foto-ver" data-v="' + (i + 1) + '" aria-label="' + esc('Ver foto ' + (i + 2)) + '"><img src="' + fotoSrc(f) + '" alt=""></button>' +
        '<label class="foto-diseno"><input type="checkbox" data-accion="foto-diseno" data-i="' + i + '"' + (f.diseno !== false ? ' checked' : '') + '>Con precio</label>' +
        '<button class="foto-btn" data-accion="foto-principal" data-i="' + i + '">Hacer principal</button>' +
        '<button class="foto-quitar" data-accion="foto-quitar" data-i="' + i + '" aria-label="' + esc('Quitar foto ' + (i + 2)) + '">×</button></figure>').join('') +
      (total < MAX_FOTOS ? '<div class="foto-agregar">' +
        '<label class="btn btn-chico btn-marca" for="mas-fotos-galeria">+ Agregar fotos</label><input class="oculto" id="mas-fotos-galeria" type="file" accept="image/*" multiple data-accion="mas-fotos">' +
        '<label class="btn btn-chico" for="mas-fotos-camara">Sacar foto</label><input class="oculto" id="mas-fotos-camara" type="file" accept="image/*" capture="environment" data-accion="mas-fotos">' +
        '</div>' : '') +
      '</div><p class="detalle">' + total + ' de ' + MAX_FOTOS + ' fotos.</p>';
  }

  async function agregarFotos(archivos) {
    const e = estado.editor;
    const lugar = MAX_FOTOS - 1 - e.fotos.length;
    const lista = Array.from(archivos).slice(0, Math.max(0, lugar));
    if (!lista.length) { avisar('Llegaste al máximo de ' + MAX_FOTOS + ' fotos'); return; }
    avisar(lista.length > 1 ? 'Agregando ' + lista.length + ' fotos…' : 'Agregando la foto…');
    for (const f of lista) { try { e.fotos.push({ src: await prepararFoto(f), diseno: true }); } catch (err) { /* se saltea la que no abre */ } }
    if (archivos.length > lista.length) avisar('Se agregaron ' + lista.length + '. El máximo es ' + MAX_FOTOS + ' fotos.');
    else avisar(lista.length > 1 ? lista.length + ' fotos agregadas' : 'Foto agregada');
    refrescarFotos();
  }

  function refrescarFotos() {
    const e = estado.editor;
    if (e.vista > e.fotos.length) e.vista = e.fotos.length;
    refrescarNavFotos();
    if (e.herramienta === 'fotos') refrescarPanel();
    ajustarVista();
    dibujarVista();
  }

  async function hacerPrincipal(i) {
    const e = estado.editor;
    const nueva = fotoSrc(e.fotos[i]);
    e.fotos[i] = { src: e.foto, diseno: true };
    e.foto = nueva;
    e.img = await cargarImagen(nueva);
    e.vista = 0;
    // el recorte era de la otra foto
    const teniaFondo = e.modoFondo !== 'original';
    e.recorte = null; e.imgRecorte = null; e.recorteCaja = null; e.modoFondo = 'original';
    refrescarFotos();
    avisar(teniaFondo ? 'Nueva foto principal. Volvé a elegir el fondo en "Fondo".' : 'Nueva foto principal');
  }

  function panelMas() {
    const e = estado.editor;
    return '<div class="ed-mas">' +
      '<label class="interruptor"><input type="checkbox" data-ajuste="mostrarNegocio"' + (ajustes.mostrarNegocio ? ' checked' : '') + '><span>Poner el nombre del negocio' + (logo ? ' y el logo' : '') + '</span></label>' +
      '<div id="tam-marca-caja"' + (ajustes.mostrarNegocio ? '' : ' hidden') + '>' + deslizador('marca', logo ? 'Tamaño del negocio y logo' : 'Tamaño del negocio') + '</div>' +
      '<a class="btn-texto" href="#ajustes">Cambiar nombre del negocio, logo o color →</a>' +
      (e.id ? '<button class="btn btn-peligro btn-ancho" data-accion="pedir-borrar" data-id="' + esc(e.id) + '">' + ICONO_TACHO + ' Eliminar este producto</button>' : '') +
      '</div>';
  }

  function rubroEditor() {
    const e = estado.editor;
    return e.rubroManual && e.rubro ? e.rubro : detectarRubro(e.nombre);
  }

  function proporcion(e) {
    const t = S.tamanoSalida(e.img);
    return 'aspect-ratio:' + t.W + ' / ' + t.H + ';--r:' + (t.W / t.H).toFixed(4);
  }

  function deslizador(clave, titulo) {
    const e = estado.editor;
    const v = Math.round(((e.capas[clave] && e.capas[clave].escala) || 1) * 100);
    return '<div class="tamano"><label for="tam-' + clave + '">' + titulo + '</label>' +
      '<input type="range" id="tam-' + clave + '" min="50" max="220" step="5" value="' + v + '" data-tamano="' + clave + '">' +
      '<output id="tam-' + clave + '-v">' + v + '%</output></div>';
  }

  function panelOpciones() {
    const e = estado.editor;
    if (e.herramienta === 'datos') return campoDatos();
    if (e.herramienta === 'fotos') return panelFotos();
    if (e.herramienta === 'mas') return panelMas();
    if (e.herramienta === 'fondo') {
      const modos = [['original', 'Foto original'], ['retrato', 'Desenfocar fondo'], ['diseno', 'Quitar fondo']];
      const ayuda = {
        original: 'La foto tal cual la sacaste.',
        retrato: 'El producto queda nítido y lo de atrás se pone borroso, como el modo retrato.',
        diseno: 'El producto va recortado sobre el diseño que elijas abajo.'
      }[e.modoFondo];
      return (e.vista > 0 ? '<p class="nota-fondo">El fondo se cambia solo en la foto principal. <button class="btn-texto" data-accion="foto-ver" data-v="0">Ir a la principal</button></p>' : '') +
        '<div class="modos-fondo" role="group" aria-label="Fondo de la foto">' + modos.map((m) =>
        '<button data-accion="modo-fondo" data-modo="' + m[0] + '" aria-pressed="' + (e.modoFondo === m[0]) + '">' + m[1] + '</button>').join('') + '</div>' +
        '<p class="detalle">' + ayuda + '</p>' +
        '<div class="estilos fondos' + (e.modoFondo === 'diseno' ? '' : ' apagados') + '" role="group" aria-label="Diseños de fondo">' + S.FONDOS.map((f) =>
        '<button class="estilo" data-accion="fondo" data-fondo="' + f.id + '" aria-pressed="' + (e.modoFondo === 'diseno' && e.fondo === f.id) + '">' +
        '<canvas width="180" height="320" data-mini-fondo="' + f.id + '" aria-hidden="true"></canvas><span>' + esc(f.nombre) + '</span></button>').join('') + '</div>';
    }
    if (e.herramienta === 'letra') {
      return deslizador('nombre', 'Tamaño del nombre') +
        '<div class="letras" role="group" aria-label="Tipos de letra">' + S.LETRAS.map((l) =>
        '<button class="letra" data-accion="letra" data-letra="' + l.id + '" aria-pressed="' + (e.letra === l.id) + '" style="font-family:' + esc(l.familia) + ', sans-serif;font-weight:' + l.peso + '">' +
        '<b' + (l.mayus ? ' style="text-transform:uppercase"' : '') + '>' + esc(e.nombre || 'Mi producto') + '</b><span>' + esc(l.nombre) + '</span></button>').join('') + '</div>';
    }
    return deslizador('precio', 'Tamaño del precio') +
      '<div class="estilos" role="group" aria-label="Estilos de sticker">' + S.ESTILOS.map((st) =>
        '<button class="estilo" data-accion="estilo" data-estilo="' + st.id + '" aria-pressed="' + (e.estilo === st.id) + '">' +
        '<canvas width="240" height="240" data-mini="' + st.id + '" aria-hidden="true"></canvas><span>' + esc(st.nombre) + '</span></button>').join('') + '</div>';
  }

  // Recorta el producto (si hace falta) y pasa al modo pedido: 'diseno' o 'retrato'
  async function prepararRecorte(modo) {
    const e = estado.editor;
    const listo = e.recorte && e.imgRecorte && (modo !== 'retrato' || e.recorteCaja);
    if (!listo) {
      if (!window.RECORTE || !RECORTE.disponible()) { avisar('Este celular no permite recortar automáticamente.'); return false; }
      const caja = app.querySelector('.vista-previa');
      if (caja) caja.classList.add('trabajando');
      app.querySelectorAll('[data-accion="modo-fondo"]').forEach((b) => { b.disabled = true; });
      await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 30)));
      try {
        const r = await RECORTE.recortar(e.img);
        e.recorte = r.imagen.toDataURL('image/png');
        e.recorteCaja = r.caja;
        e.imgRecorte = await cargarImagen(e.recorte);
      } catch (err) {
        const msj = String(err && err.message);
        avisar(msj === 'sin-objeto' ? 'No encontramos el producto. Probá con una foto donde se vea entero y centrado.'
          : msj.indexOf('sin-') === 0 ? 'Este celular no permite recortar automáticamente.'
            : 'No se pudo recortar. Revisá tu conexión y probá de nuevo.');
        return false;
      } finally {
        if (caja) caja.classList.remove('trabajando');
      }
    }
    e.modoFondo = modo;
    if (modo === 'diseno' && e.fondo === 'desenfocado' && !e._eligioFondo) e.fondo = 'estudio';
    return true;
  }

  async function cambiarModoFondo(modo, fondo) {
    const e = estado.editor;
    if (fondo) { e.fondo = fondo; e._eligioFondo = true; }
    if (e.vista) await cambiarVista(0);
    if (modo === 'original') e.modoFondo = 'original';
    else await prepararRecorte(modo);
    refrescarPanel();
    dibujarVista();
  }

  function refrescarPanel() {
    const panel = document.getElementById('panel-opciones');
    if (panel) { panel.innerHTML = panelOpciones(); dibujarMiniaturas(); }
  }

  /* ---- Tocar la vista previa: arrastrar para mover, dos dedos para agrandar ---- */
  const dedos = new Map();
  let arrastre = null;
  let toqueVacio = null;
  let cuadroPendiente = false;
  function dibujarEnElProximoCuadro() {
    if (cuadroPendiente) return;
    cuadroPendiente = true;
    requestAnimationFrame(() => { cuadroPendiente = false; dibujarVista(); });
  }
  function puntoEnLienzo(ev, lienzo) {
    const r = lienzo.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * lienzo.width / r.width, y: (ev.clientY - r.top) * lienzo.height / r.height };
  }
  function elementoEn(p) {
    const e = estado.editor;
    const orden = ['precio', 'marca', 'nombre'];  // el de arriba primero
    const margen = 14;
    for (const k of orden) {
      const c = e.cajas && e.cajas[k];
      if (c && Math.abs(p.x - c.cx) <= c.w / 2 + margen && Math.abs(p.y - c.cy) <= c.h / 2 + margen) return k;
    }
    return null;
  }
  function distancia() {
    const v = Array.from(dedos.values());
    return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
  }
  function conectarGestos() {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    lienzo.addEventListener('pointerdown', (ev) => {
      const e = estado.editor;
      const p = puntoEnLienzo(ev, lienzo);
      if (!arrastre) {
        const k = elementoEn(p);
        if (!k) { toqueVacio = { id: ev.pointerId, x: ev.clientX, y: ev.clientY }; try { lienzo.setPointerCapture(ev.pointerId); } catch (err) { /* nada */ } return; }
        const antes = e.capas[k] ? Object.assign({}, e.capas[k]) : null;
        const usada = (e.capasUsadas && e.capasUsadas[k]) || { x: 0.5, y: 0.5, escala: 1 };
        e.capas[k] = Object.assign({}, usada, e.capas[k] && e.capas[k].escala ? { escala: e.capas[k].escala } : {});
        arrastre = { clave: k, inicio: p, x0: e.capas[k].x, y0: e.capas[k].y, escala0: e.capas[k].escala || 1, dist0: 0, cx: ev.clientX, cy: ev.clientY, movio: false, antes: antes };
        lienzo.classList.add('arrastrando');
      }
      dedos.set(ev.pointerId, p);
      try { lienzo.setPointerCapture(ev.pointerId); } catch (err) { /* nada */ }
      if (dedos.size === 2) { arrastre.dist0 = distancia(); arrastre.escala0 = estado.editor.capas[arrastre.clave].escala || 1; }
      ev.preventDefault();
    });
    lienzo.addEventListener('pointermove', (ev) => {
      if (!arrastre || !dedos.has(ev.pointerId)) return;
      const e = estado.editor;
      const p = puntoEnLienzo(ev, lienzo);
      dedos.set(ev.pointerId, p);
      const capa = e.capas[arrastre.clave];
      if (!arrastre.movio && (dedos.size >= 2 || Math.hypot(ev.clientX - arrastre.cx, ev.clientY - arrastre.cy) > 8)) arrastre.movio = true;
      if (!arrastre.movio) return;
      if (dedos.size >= 2 && arrastre.dist0 > 0) {
        capa.escala = Math.max(0.5, Math.min(2.2, arrastre.escala0 * distancia() / arrastre.dist0));
        sincronizarDeslizador(arrastre.clave);
      } else if (dedos.size === 1) {
        capa.x = arrastre.x0 + (p.x - arrastre.inicio.x) / lienzo.width;
        capa.y = arrastre.y0 + (p.y - arrastre.inicio.y) / lienzo.height;
      }
      dibujarEnElProximoCuadro();
      ev.preventDefault();
    });
    const soltar = (ev) => {
      if (toqueVacio && toqueVacio.id === ev.pointerId) {
        // tocar la foto donde no hay nada: cierra el panel para ver la foto grande
        const dx = ev.clientX - toqueVacio.x, dy = ev.clientY - toqueVacio.y;
        if (ev.type === 'pointerup' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && estado.editor.fotos.length) {
          cambiarVista(estado.editor.vista + (dx < 0 ? 1 : -1));
        } else if (ev.type === 'pointerup' && Math.hypot(dx, dy) < 10 && estado.editor.herramienta) {
          if (document.activeElement) document.activeElement.blur();
          abrirHerramienta(null);
        }
        toqueVacio = null;
      }
      dedos.delete(ev.pointerId);
      if (dedos.size === 0 && arrastre && !arrastre.movio) {
        // fue un toque: abrir lo que corresponde
        const k = arrastre.clave;
        const ed = estado.editor;
        if (arrastre.antes) ed.capas[k] = arrastre.antes; else delete ed.capas[k];
        arrastre = null;
        lienzo.classList.remove('arrastrando');
        if (ev.type === 'pointerup') {
          if (k === 'precio') abrirHerramienta('datos', 'precio');
          else if (k === 'nombre') abrirHerramienta('datos', 'nombre');
          else abrirHerramienta('mas');
        }
        return;
      }
      if (dedos.size === 0 && arrastre) {
        // guardar la posición que quedó dentro de la imagen
        const e = estado.editor;
        if (e.capasUsadas && e.capasUsadas[arrastre.clave]) e.capas[arrastre.clave] = Object.assign({}, e.capasUsadas[arrastre.clave], { escala: e.capas[arrastre.clave].escala });
        arrastre = null;
        lienzo.classList.remove('arrastrando');
      } else if (dedos.size === 1 && arrastre) {
        // quedó un dedo: sigue moviendo desde donde está
        const p = Array.from(dedos.values())[0];
        const capa = estado.editor.capas[arrastre.clave];
        arrastre.inicio = p; arrastre.x0 = capa.x; arrastre.y0 = capa.y; arrastre.dist0 = 0;
      }
    };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
  }
  function sincronizarDeslizador(clave) {
    const e = estado.editor;
    const input = document.getElementById('tam-' + clave);
    const v = Math.round(((e.capas[clave] && e.capas[clave].escala) || 1) * 100);
    if (input) input.value = v;
    const out = document.getElementById('tam-' + clave + '-v');
    if (out) out.textContent = v + '%';
  }

  let temporizadorVista = null;
  let observador = null;
  function prepararEditor() {
    conectarGestos();
    ajustarVista();
    if (observador) observador.disconnect();
    if (window.ResizeObserver) { observador = new ResizeObserver(() => ajustarVista()); observador.observe(app.querySelector('.ed-foto')); }
    const ayuda = document.getElementById('ed-ayuda');
    const vistas = Number(local.leer('mostrador:ayuda-editor') || 0);
    if (ayuda) {
      if (vistas >= 4) ayuda.remove();
      else { local.escribir('mostrador:ayuda-editor', String(vistas + 1)); setTimeout(() => ayuda.classList.add('oculta'), 6000); }
    }
    if (estado.editor.herramienta === 'datos' && !estado.editor.nombre) setTimeout(() => { const c = document.getElementById('nombre'); if (c) c.focus(); }, 350);
    if (window.RECORTE && RECORTE.disponible()) setTimeout(() => RECORTE.preparar().catch(() => null), 600);
    S.prepararFuentes().then(() => { dibujarVista(); dibujarMiniaturas(); });
    dibujarVista();
    dibujarMiniaturas();
  }

  function datosEditor() {
    const e = estado.editor;
    return { foto: e.img, recorte: e.imgRecorte, recorteCaja: e.recorteCaja, nombre: e.nombre || 'Nombre del producto', precio: Number(e.precio) || 0, codigo: ajustes.mostrarCodigo ? e.codigo : '',
      moneda: e.moneda, detalle: detalleAuto({ nombre: e.nombre, rubro: e.rubro, rubroManual: e.rubroManual, auto: e.auto }, true) };
  }
  function opcionesEditor() {
    const e = estado.editor;
    return { estilo: e.estilo, posicion: e.posicion, negocio: ajustes.negocio, mostrarNegocio: ajustes.mostrarNegocio, color: ajustes.color, fondo: e.fondo, letra: e.letra, logo: logo, modoFondo: e.imgRecorte ? e.modoFondo : 'original', capas: e.capas };
  }

  function dibujarVista() {
    const e = estado.editor;
    const lienzo = document.getElementById('lienzo');
    if (!e || !lienzo) return;
    const imagen = imagenVista(e.vista, 0.5);
    if (lienzo.width !== imagen.width || lienzo.height !== imagen.height) { lienzo.width = imagen.width; lienzo.height = imagen.height; }
    lienzo.getContext('2d').drawImage(imagen, 0, 0);
    e.cajas = imagen.cajas;
    e.capasUsadas = imagen.capas;
  }

  // Arma la imagen de una foto del producto: 0 = principal; las otras sin fondo especial
  function imagenVista(v, escala) {
    const e = estado.editor;
    const extra = v > 0 ? e.fotos[v - 1] : null;
    const op = Object.assign(opcionesEditor(), escala ? { escalaVista: escala } : {});
    if (!extra) return S.componer(datosEditor(), op);
    const img = e.imgsExtra[fotoSrc(extra)];
    if (!img) return S.componer(datosEditor(), op);
    const d = Object.assign(datosEditor(), { foto: img, recorte: null, recorteCaja: null });
    op.modoFondo = 'original';
    if (extra.diseno !== false) return S.componer(d, op);
    // sin precio: la foto sola, en el mismo tamaño de salida
    const t = S.tamanoSalida(img);
    const k = escala || 1;
    const c = document.createElement('canvas');
    c.width = Math.round(t.W * k); c.height = Math.round(t.H * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.cajas = {}; c.capas = e.capasUsadas || {};
    return c;
  }

  function dibujarMiniaturas() {
    const precio = Number(estado.editor && estado.editor.precio) || 5000;
    app.querySelectorAll('canvas[data-mini]').forEach((c) => {
      const m = S.miniatura(c.dataset.mini, precio, ajustes.color);
      c.getContext('2d').clearRect(0, 0, 240, 240);
      c.getContext('2d').drawImage(m, 0, 0);
    });
    const e = estado.editor;
    app.querySelectorAll('canvas[data-mini-fondo]').forEach((c) => {
      c.getContext('2d').drawImage(S.miniaturaFondo(c.dataset.miniFondo, ajustes.color, e && e.img, e && e.imgRecorte ? e.imgRecorte : null), 0, 0);
    });
  }

  function redibujarPronto(conMiniaturas) {
    clearTimeout(temporizadorVista);
    temporizadorVista = setTimeout(() => { dibujarVista(); if (conMiniaturas) dibujarMiniaturas(); }, 120);
  }

  async function guardarEditor() {
    const e = estado.editor;
    const p = {
      id: e.id || 'p' + Date.now().toString(36),
      foto: e.foto, nombre: e.nombre.trim(), precio: Number(e.precio) || 0,
      estilo: e.estilo, posicion: e.posicion, fondo: e.fondo, letra: e.letra, codigo: e.codigo, fecha: e.fecha || Date.now(),
      recorte: e.recorte || null, recorteCaja: e.recorteCaja || null,
      modoFondo: e.modoFondo || 'original', recortado: e.modoFondo === 'diseno',
      capas: e.capas || {},
      rubro: rubroEditor(), rubroManual: !!e.rubroManual,
      fotos: (e.fotos || []).map((f) => ({ src: fotoSrc(f), diseno: f.diseno !== false })), moneda: e.moneda === 'USD' ? 'USD' : 'ARS',
      auto: rubroEditor() === 'vehiculos' ? Object.assign({}, e.auto || {}) : (e.auto || {})
    };
    await ALMACEN.guardar(p);
    e.id = p.id; e.fecha = p.fecha; e.firma = firmaEditor(e);
    ajustes.estilo = e.estilo; ajustes.fondo = e.fondo; ajustes.letra = e.letra; guardarAjustes();
    estado.productos = await ALMACEN.todos();
    return p;
  }

  /* ================= Compartir red por red ================= */
  function textoRed(p, red) {
    const precio = precioDe(p);
    const cod = ajustes.mostrarCodigo && p.codigo ? ' (cód. ' + p.codigo + ')' : '';
    const det = detalleAuto(p);
    const extra = extrasAuto(p).join(' · ');
    const lineaAuto = det || extra ? '\n' + [det, extra].filter(Boolean).join(' · ') : '';
    const wa = ajustes.whatsapp ? 'wa.me/' + ajustes.whatsapp : 'WhatsApp';
    const tags = ['#' + normalizar(ajustes.negocio).toLowerCase().replace(/[^a-z0-9]/g, ''), '#ventas', '#ofertas', '#' + (normalizar(p.nombre).toLowerCase().split(/\s+/)[0] || 'productos').replace(/[^a-z0-9]/g, '')].join(' ');
    if (red === 'estado') return p.nombre + ' ' + precio + cod + (det ? ' · ' + det : '') + (extra ? ' · ' + extra : '') + '. Pedí respondiendo este estado.';
    if (red === 'marketplace') return 'Título: ' + p.nombre + (det ? ' ' + det : '') + '\nPrecio: ' + precio + '\nDescripción: ' + p.nombre + ' a ' + precio + cod + '.' + (det ? ' ' + det + '.' : '') + (extra ? ' ' + extra + '.' : '') + ' ' + ajustes.negocio + '. Consultas y pedidos por mensaje.';
    if (red === 'facebook') return p.nombre + lineaAuto + '\n' + precio + cod + '\n\nPedidos por ' + wa + '\n' + ajustes.negocio;
    if (red === 'tiktok') return p.nombre + (det ? ' ' + det : '') + ' a ' + precio + cod + '. Pedidos por ' + wa + ' ' + tags;
    return p.nombre + lineaAuto + '\n' + precio + cod + '\n\nPedidos por ' + wa + '\n' + ajustes.negocio + '\n\n' + tags;
  }

  function faltanDatos() {
    const e = estado.editor;
    e.nombre = (e.nombre || '').trim();
    if (!e.nombre) { avisar('Escribí el nombre del producto'); abrirHerramienta('datos', 'nombre'); return true; }
    if (!(Number(e.precio) > 0)) { avisar('Escribí el precio'); abrirHerramienta('datos', 'precio'); return true; }
    return false;
  }

  async function guardarSolo() {
    if (faltanDatos()) return false;
    const nuevo = !estado.editor.id;
    try { await guardarEditor(); } catch (err) { avisar('No se pudo guardar. Probá de nuevo.'); return false; }
    avisar(nuevo ? 'Guardado en tus productos y en tu catálogo' : 'Cambios guardados');
    return true;
  }

  async function abrirCompartir() {
    const e = estado.editor;
    if (faltanDatos()) return;
    let p;
    try { p = await guardarEditor(); } catch (err) { avisar('No se pudo guardar. Probá de nuevo.'); return; }
    // La imagen se arma antes, así "Compartir" abre al instante
    const imagen = S.aBlob(S.componer(datosEditor(), opcionesEditor()));
    const extras = armarExtras();
    abrirCapa({ tipo: 'redes', producto: p, imagen: imagen, extras: extras, elegidas: ajustes.redes.slice(), paso: -1, todas: true });
  }

  // Imágenes de las otras fotos (con el precio puesto si así se eligió)
  async function armarExtras() {
    const e = estado.editor;
    const blobs = [];
    for (let i = 0; i < e.fotos.length; i++) {
      const f = e.fotos[i], src = fotoSrc(f);
      if (f.diseno === false) { blobs.push(await (await fetch(src)).blob()); continue; }
      if (!e.imgsExtra[src]) e.imgsExtra[src] = await cargarImagen(src);
      blobs.push(await S.aBlob(imagenVista(i + 1)));
    }
    return blobs;
  }

  function abrirCapa(datos) {
    estado.capa = datos;
    capa.hidden = false;
    document.body.classList.add('con-capa');
    renderCapa(true);
  }
  function cerrarCapa() {
    estado.capa = null;
    capa.hidden = true;
    capa.innerHTML = '';
    document.body.classList.remove('con-capa');
  }

  function renderCapa(entrar) {
    const c = estado.capa;
    if (!c) return;
    let titulo, cuerpo, pie;
    if (c.tipo === 'pedido') { const h = hojaPedido(); titulo = h[0]; cuerpo = h[1]; pie = h[2]; }
    else if (c.tipo === 'detalle') { const h = hojaDetalle(); titulo = h[0]; cuerpo = h[1]; pie = h[2]; }
    else if (c.tipo === 'borrar') {
      titulo = '¿Eliminar este producto?';
      cuerpo = '<div class="confirmar-borrar"><img src="' + c.producto.foto + '" alt=""><div><b>' + esc(c.producto.nombre || 'Sin nombre') + '</b><span>' + esc(precioDe(c.producto)) + '</span></div></div>' +
        '<p class="detalle">Se borra de "Tus productos" y de tu catálogo. No se puede deshacer.</p>';
      pie = '<button class="btn btn-peligro-lleno btn-ancho" data-accion="confirmar-borrar">Sí, eliminar</button>' +
        '<button class="btn btn-claro btn-ancho" data-accion="cerrar">Cancelar</button>';
    }
    else if (c.tipo === 'negocio') {
      titulo = '¿Qué vas a vender?';
      const op = [['productos', 'Productos', 'Ropa, bazar, juguetes, accesorios, tecnología…'], ['vehiculos', 'Autos y motos', 'Concesionaria o agencia de vehículos'], ['ambos', 'Las dos cosas', 'Productos y también autos o motos']];
      cuerpo = '<p class="detalle">Así la app ordena mejor tus productos por rubro. Lo podés cambiar cuando quieras en Ajustes.</p>' +
        '<div class="tipos-negocio">' + op.map((o) => '<button class="tipo-negocio" data-accion="elegir-negocio" data-tipo="' + o[0] + '"' + (ajustes.tipoNegocio === o[0] ? ' aria-pressed="true"' : '') + '><b>' + o[1] + '</b><span>' + o[2] + '</span></button>').join('') + '</div>';
      pie = '';
    }
    else if (c.tipo === 'salir') {
      titulo = '¿Guardar los cambios?';
      cuerpo = '<p class="detalle">' + (estado.editor && estado.editor.id ? 'Hiciste cambios en este producto que todavía no guardaste.' : 'Este producto todavía no está guardado en tus productos ni en tu catálogo.') + '</p>';
      pie = '<button class="btn btn-marca btn-ancho" data-accion="guardar-y-salir">Guardar</button>' +
        '<button class="btn btn-claro btn-ancho" data-accion="salir-sin-guardar">Salir sin guardar</button>' +
        '<button class="btn-texto" data-accion="cerrar">Seguir editando</button>';
    }
    else if (c.paso < 0) {
      titulo = '¿Dónde lo querés subir?';
      const otras = (c.producto.fotos || []).length;
      cuerpo = '<div class="redes">' + REDES.map((r) =>
        '<label class="red"><input type="checkbox" data-accion="red" value="' + r.id + '"' + (c.elegidas.indexOf(r.id) >= 0 ? ' checked' : '') + '><span>' + esc(r.nombre) + '</span></label>').join('') + '</div>' +
        (otras ? '<label class="interruptor todas-fotos"><input type="checkbox" data-accion="todas-fotos"' + (c.todas ? ' checked' : '') + '><span>Compartir también ' + (otras === 1 ? 'la otra foto' : 'las otras ' + otras + ' fotos') + '</span></label>' : '') +
        '<p class="nota">La app te va a llevar red por red con la imagen y el texto listos.</p>';
      const n = c.elegidas.length;
      pie = '<button class="btn btn-marca btn-ancho" data-accion="empezar"' + (n ? '' : ' disabled') + '>' + (n ? 'Empezar (' + n + (n === 1 ? ' red)' : ' redes)') : 'Elegí al menos una red') + '</button>';
    } else if (c.paso < c.cola.length) {
      const r = REDES.find((x) => x.id === c.cola[c.paso]);
      titulo = (c.paso + 1) + ' de ' + c.cola.length + ' · ' + r.nombre;
      const otras = c.todas ? (c.producto.fotos || []).length : 0;
      cuerpo = '<div class="paso-red"><div class="img-red-caja"><img id="img-red" alt="Imagen para ' + esc(r.nombre) + '">' + (otras ? '<span class="fotos-chip">+' + otras + ' fotos</span>' : '') + '</div>' +
        '<p>' + esc(r.ayuda) + '</p>' +
        (window.claude && !puedeCompartirPrueba() ? '<p class="nota aviso-claude">Dentro de Claude la imagen se descarga. Con la app en tu propio link se abre el menú Compartir del celular.</p>' : '') +
        '<pre class="texto-red">' + esc(textoRed(c.producto, r.id)) + '</pre></div>';
      pie = '<button class="btn btn-marca btn-ancho" data-accion="compartir-red">Compartir en ' + esc(r.app) + '</button>' +
        '<button class="btn-texto" data-accion="saltar">' + (c.paso + 1 < c.cola.length ? 'Saltar esta red' : 'Terminar') + '</button>';
    } else {
      titulo = '¡Listo!';
      cuerpo = '<div class="final"><p><b>' + esc(c.producto.nombre) + '</b> ya está en tu catálogo.</p>' +
        '<p class="detalle">¿Te equivocaste o cambió el precio? Tocá "Editar esta publicación", o abrila después desde "Tus productos".</p></div>';
      pie = '<button class="btn btn-claro btn-ancho" data-accion="volver-editar">Editar esta publicación</button>' +
        '<label class="btn btn-marca btn-ancho" for="foto-otra">Sacar otra foto</label>' +
        '<input class="oculto" id="foto-otra" type="file" accept="image/*" capture="environment" data-accion="foto">' +
        '<a class="btn btn-claro btn-ancho" href="#inicio">Ir al inicio</a>';
    }
    capa.innerHTML = '<div class="fondo-capa" data-accion="cerrar"></div>' +
      '<section class="hoja' + (entrar ? ' entra' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '">' +
      '<div class="hoja-cab"><h2>' + esc(titulo) + '</h2><button class="cerrar" data-accion="cerrar" aria-label="Cerrar">×</button></div>' +
      '<div class="hoja-cuerpo">' + cuerpo + '</div><div class="hoja-pie">' + pie + '</div></section>';

    if (c.tipo === 'detalle') {
      const g = document.getElementById('galeria');
      const n = document.getElementById('galeria-n');
      if (g && n) g.addEventListener('scroll', () => { n.textContent = (Math.round(g.scrollLeft / g.clientWidth) + 1) + ' / ' + g.children.length; }, { passive: true });
    }
    if (c.tipo === 'redes' && c.paso >= 0 && c.paso < c.cola.length) {
      c.imagen.then((b) => {
        const img = document.getElementById('img-red');
        if (img) img.src = URL.createObjectURL(b);
      });
    }
  }

  function puedeCompartirPrueba() {
    try { return puedeCompartir(new File([new Blob(['x'], { type: 'image/jpeg' })], 'x.jpg', { type: 'image/jpeg' })); } catch (e) { return false; }
  }

  function puedeCompartirVarios(archivos) {
    try { return !!(navigator.canShare && navigator.canShare({ files: archivos })); } catch (e) { return false; }
  }
  function puedeCompartir(archivo) {
    try { return !!(navigator.canShare && navigator.canShare({ files: [archivo] })); } catch (e) { return false; }
  }

  let permisoDescargas = null;
  function descargasClaude() {
    if (!(window.claude && typeof window.claude.use === 'function')) return Promise.resolve(null);
    if (!permisoDescargas) permisoDescargas = Promise.resolve(window.claude.use('downloads')).catch(() => null);
    return permisoDescargas;
  }

  async function compartirRedActual() {
    const c = estado.capa;
    const r = REDES.find((x) => x.id === c.cola[c.paso]);
    const texto = textoRed(c.producto, r.id);
    copiar(texto); // queda copiado para pegar en la red
    const blob = await c.imagen;
    const nombre = (normalizar(c.producto.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'producto') + '.jpg';
    const archivo = new File([blob], nombre, { type: 'image/jpeg' });
    const archivos = [archivo];
    if (c.todas && c.extras) {
      const bs = await c.extras;
      bs.forEach((b, i) => archivos.push(new File([b], nombre.replace(/\.jpg$/, '-' + (i + 2) + '.jpg'), { type: 'image/jpeg' })));
    }

    if (puedeCompartirVarios(archivos)) {
      try {
        await navigator.share({ files: archivos, text: texto });
        avanzar();
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // cerró el menú sin elegir
      }
    }
    const dl = await descargasClaude();
    if (dl) {
      try { for (const f of archivos) await dl.save({ filename: f.name, data: f }); avisar((archivos.length > 1 ? archivos.length + ' imágenes descargadas' : 'Imagen descargada') + '. El texto quedó copiado.'); avanzar(); }
      catch (e) { if (!e || e.code !== 'declined') avisar('No se pudo descargar la imagen.'); }
      return;
    }
    archivos.forEach((f) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
    });
    avisar((archivos.length > 1 ? archivos.length + ' imágenes descargadas' : 'Imagen descargada') + '. El texto quedó copiado.');
    avanzar();
  }

  function avanzar() {
    const c = estado.capa;
    if (!c) return;
    c.paso++;
    renderCapa(false);
  }

  /* ================= Catálogo ================= */
  function vistaCatalogo() {
    const ps = estado.productos;
    const total = Object.keys(estado.pedido).reduce((a, id) => { const p = ps.find((x) => x.id === id); return a + (p ? p.precio * estado.pedido[id] : 0); }, 0);
    const cant = Object.values(estado.pedido).reduce((a, b) => a + b, 0);
    return '<header class="cab-catalogo"><a class="btn-texto claro" href="#inicio">← Inicio</a>' +
      '<div class="fila-cab"><div class="avatar">' + esc(ajustes.negocio.split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase()) + '</div>' +
      '<div><h1>' + esc(ajustes.negocio) + '</h1><p>' + ps.length + ' productos · pedidos por WhatsApp</p></div></div>' +
      '<p class="aviso-vista">Vista previa: así lo van a ver tus clientes. El link para compartir el catálogo llega con la versión con cuentas.</p></header>' +
      '<main class="pagina">' + (ps.length > 1 ? barraBusqueda('catalogo') : '') +
      '<div id="grilla-catalogo">' + grillaCatalogo() + '</div></main>' +
      '<div id="barra-pedido">' + barraPedido(cant, total) + '</div>';
  }

  function barraPedido() {
    const ls = lineasPedido();
    const cant = ls.reduce((a, l) => a + l.n, 0);
    return cant ? '<div class="barra-abajo"><button class="btn btn-marca btn-ancho fila" data-accion="ver-pedido"><span>Ver pedido · ' + cant + '</span><span>' + esc(totalTexto(ls)) + '</span></button></div>' : '';
  }

  function botonCantidad(p) {
    const n = estado.pedido[p.id] || 0;
    return n ? '<div class="paso-cant"><button data-accion="menos" data-id="' + esc(p.id) + '" aria-label="Restar">−</button><span>' + n + '</span><button data-accion="mas" data-id="' + esc(p.id) + '" aria-label="Sumar">+</button></div>'
      : '<button class="btn btn-chico" data-accion="mas" data-id="' + esc(p.id) + '">Agregar</button>';
  }

  function grillaCatalogo() {
    const ps = filtrar(estado.productos);
    if (!ps.length) return estado.productos.length ? sinResultados() : '<p class="vacio">Todavía no hay productos.</p>';
    return '<div class="grilla catalogo">' + ps.map((p) => {
      const det = detalleAuto(p, true);
      const nf = cantidadFotos(p);
      return '<article class="prod"><div class="prod-foto"><button class="ver-detalle" data-accion="ver-detalle" data-id="' + esc(p.id) + '" aria-label="' + esc('Ver ' + p.nombre + (nf > 1 ? ', ' + nf + ' fotos' : '')) + '"><img src="' + p.foto + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
        (nf > 1 ? '<span class="fotos-chip">' + ICONO_FOTOS + nf + '</span>' : '') + '</button>' +
        '<button class="borrar-mini" data-accion="pedir-borrar" data-id="' + esc(p.id) + '" aria-label="' + esc('Eliminar ' + p.nombre) + '">' + ICONO_TACHO + '</button></div>' +
        '<div class="prod-info"><span class="prod-rubro">' + esc(RUBROS.nombreDe(rubroDe(p))) + '</span><span class="prod-nombre">' + esc(p.nombre) + '</span>' +
        (det ? '<span class="prod-detalle">' + esc(det) + '</span>' : '') +
        '<span class="prod-precio">' + esc(precioDe(p)) + '</span>' +
        '<span id="cant-' + esc(p.id) + '">' + botonCantidad(p) + '</span></div></article>';
    }).join('') + '</div>';
  }

  function refrescarCatalogo() {
    const g = document.getElementById('grilla-catalogo'); if (g) g.innerHTML = grillaCatalogo();
    const b = document.getElementById('barra-pedido'); if (b) b.innerHTML = barraPedido();
    if (estado.capa && estado.capa.tipo === 'detalle') { const c = document.getElementById('cant-detalle'); if (c) c.innerHTML = botonCantidad(estado.capa.producto); }
  }

  // Ficha del producto con todas sus fotos (lo que ve el cliente al tocar un producto)
  function hojaDetalle() {
    const p = estado.capa.producto;
    const fotos = [p.foto].concat((p.fotos || []).map(fotoSrc));
    const a = p.auto || {};
    const datos = esVehiculo(p) ? [['Año', a.anio], ['Kilómetros', a.km !== undefined && a.km !== '' ? Number(a.km).toLocaleString('es-AR') + ' km' : ''], ['Combustible', a.combustible], ['Caja', a.caja]].filter((d) => d[1]) : [];
    const extras = extrasAuto(p);
    return [p.nombre,
      '<div class="galeria" id="galeria" tabindex="0" aria-label="Fotos de ' + esc(p.nombre) + '">' + fotos.map((f, i) => '<img src="' + f + '" alt="' + esc(p.nombre + ', foto ' + (i + 1) + ' de ' + fotos.length) + '"' + (i ? ' loading="lazy"' : '') + '>').join('') + '</div>' +
      (fotos.length > 1 ? '<div class="galeria-pie"><span id="galeria-n">1 / ' + fotos.length + '</span><span class="detalle">Deslizá para ver más fotos</span></div>' : '') +
      '<div class="ficha"><span class="ficha-precio">' + esc(precioDe(p)) + '</span>' +
      (datos.length ? '<dl class="ficha-datos">' + datos.map((d) => '<div><dt>' + d[0] + '</dt><dd>' + esc(d[1]) + '</dd></div>').join('') + '</dl>' : '') +
      (extras.length ? '<div class="ficha-extras">' + extras.map((x) => '<span>✓ ' + esc(x) + '</span>').join('') + '</div>' : '') + '</div>',
      '<div id="cant-detalle" class="cant-detalle">' + botonCantidad(p) + '</div>'];
  }

  function hojaPedido() {
    const lineas = lineasPedido();
    const total = totalTexto(lineas);
    const c = estado.capa;
    const texto = '*Pedido para ' + ajustes.negocio + '*\n\n' + lineas.map((l) => '• ' + l.n + ' x ' + l.p.nombre + ' (' + precioDe(l.p) + ') = ' + S.precioTexto(l.p.precio * l.n, l.p.moneda)).join('\n') +
      '\n\n*Total: ' + total + '*' + (c.nombre ? '\nA nombre de: ' + c.nombre : '');
    const link = 'https://wa.me/' + (ajustes.whatsapp || '') + '?text=' + encodeURIComponent(texto);
    return ['Tu pedido',
      '<div class="lineas">' + lineas.map((l) => '<div class="linea"><span>' + l.n + ' × ' + esc(l.p.nombre) + '</span><b>' + esc(S.precioTexto(l.p.precio * l.n, l.p.moneda)) + '</b></div>').join('') +
      '<div class="linea total"><span>Total</span><b>' + esc(total) + '</b></div></div>' +
      '<div class="campo"><label for="pedido-nombre">Tu nombre</label><input id="pedido-nombre" data-accion="pedido-nombre" value="' + esc(c.nombre || '') + '" autocomplete="name"></div>',
      '<a class="btn btn-wa btn-ancho" id="enviar-pedido" href="' + esc(link) + '" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>' +
      (ajustes.whatsapp ? '' : '<p class="nota">El negocio todavía no cargó su WhatsApp en Ajustes: vas a poder elegir a quién mandarlo.</p>')];
  }

  /* ================= Ajustes ================= */
  function vistaAjustes() {
    return '<header class="barra-top"><a class="btn-texto" href="#inicio">← Volver</a><b>Ajustes</b><span></span></header>' +
      '<main class="pagina ajustes">' +
      '<div class="campo"><label for="a-tipo">¿Qué vendés?</label><select id="a-tipo" data-ajuste="tipoNegocio">' +
      [['productos', 'Productos'], ['vehiculos', 'Autos y motos'], ['ambos', 'Las dos cosas']].map((o) => '<option value="' + o[0] + '"' + ((ajustes.tipoNegocio || 'productos') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select><span class="nota">Con "Productos", un auto o una moto se toma como juguete.</span></div>' +
      '<div class="campo"><label for="a-negocio">Nombre de tu negocio</label><input id="a-negocio" data-ajuste="negocio" value="' + esc(ajustes.negocio) + '"></div>' +
      '<div class="campo"><label for="a-wa">Tu WhatsApp para recibir pedidos</label><input id="a-wa" data-ajuste="whatsapp" inputmode="tel" value="' + esc(ajustes.whatsapp) + '" placeholder="Ej: 5491123456789"><span class="nota">Con 549 y el código de área, sin 0 ni 15.</span></div>' +
      '<section class="caja"><h2>Logo de tu negocio</h2>' +
      (logo ? '<div class="logo-vista"><img src="' + esc(local.leer('mostrador:logo')) + '" alt="Tu logo"></div>' : '<p class="detalle">Subí una foto o imagen de tu logo. Aparece en todas tus imágenes, al lado del nombre del negocio.</p>') +
      '<div class="fila-botones"><label class="btn btn-chico btn-marca" for="a-logo">' + (logo ? 'Cambiar logo' : 'Subir logo') + '</label>' +
      (logo ? '<button class="btn btn-chico" data-accion="quitar-logo">Quitar</button>' : '') + '</div>' +
      '<input class="oculto" id="a-logo" type="file" accept="image/*" data-accion="logo"></section>' +
      '<div class="campo"><span class="rotulo">Color de tu marca</span><div class="colores">' +
      COLORES.map((c) => '<button data-accion="color" data-color="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '" aria-pressed="' + (ajustes.color === c) + '"></button>').join('') + '</div></div>' +
      '<label class="interruptor"><input type="checkbox" data-ajuste="mostrarNegocio"' + (ajustes.mostrarNegocio ? ' checked' : '') + '><span>Poner el nombre del negocio en las imágenes</span></label>' +
      '<label class="interruptor"><input type="checkbox" data-ajuste="mostrarCodigo"' + (ajustes.mostrarCodigo ? ' checked' : '') + '><span>Poner un código a cada producto (para pedir "3 de la 07")</span></label>' +
      '<section class="caja"><h2>Tener la app en tu celular</h2><p>Abrí este link en Chrome (Android) o Safari (iPhone), tocá el menú y elegí <b>"Agregar a la pantalla de inicio"</b>. Queda con su ícono, como cualquier app.</p></section>' +
      '</main>';
  }

  /* ================= Eventos ================= */
  const acciones = {
    abrir: (el) => { const p = estado.productos.find((x) => x.id === el.dataset.id); if (p) abrirEditor(p); },
    estilo: (el) => {
      estado.editor.estilo = el.dataset.estilo;
      app.querySelectorAll('[data-accion="estilo"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.estilo === estado.editor.estilo)));
      dibujarVista();
    },

    'pedir-borrar': (el) => {
      const p = estado.productos.find((x) => x.id === el.dataset.id);
      if (p) abrirCapa({ tipo: 'borrar', producto: p });
    },
    'confirmar-borrar': async () => {
      const p = estado.capa && estado.capa.producto;
      if (!p) return;
      await ALMACEN.borrar(p.id);
      estado.productos = await ALMACEN.todos();
      cerrarCapa();
      delete estado.pedido[p.id];
      if (estado.editor && estado.editor.id === p.id) estado.editor = null;
      const v = vistaActual();
      if (v === 'inicio' || v === 'catalogo') navegar(); else location.hash = 'inicio';
      avisar('Producto eliminado');
    },
    compartir: () => abrirCompartir(),
    'modo-fondo': (el) => cambiarModoFondo(el.dataset.modo),
    reacomodar: () => {
      const e = estado.editor;
      e.capasAntes = JSON.parse(JSON.stringify(e.capas || {}));
      e.capas = {};
      ['precio', 'nombre', 'marca'].forEach(sincronizarDeslizador);
      dibujarVista();
      avisar('Volvió todo a su lugar', Object.keys(e.capasAntes).length ? { texto: 'Deshacer', accion: 'deshacer-reacomodar' } : null);
    },
    'deshacer-reacomodar': () => {
      const e = estado.editor;
      if (!e || !e.capasAntes) return;
      e.capas = e.capasAntes; e.capasAntes = null;
      ['precio', 'nombre', 'marca'].forEach(sincronizarDeslizador);
      dibujarVista();
      ocultarAviso();
    },
    guardar: () => { guardarSolo(); },
    'foto-principal': (el) => hacerPrincipal(Number(el.dataset.i)),
    'foto-ver': (el) => cambiarVista(Number(el.dataset.v)),
    'foto-anterior': () => cambiarVista(estado.editor.vista - 1),
    'foto-siguiente': () => cambiarVista(estado.editor.vista + 1),
    'foto-diseno-vista': () => {
      const e = estado.editor; const f = e.vista > 0 && e.fotos[e.vista - 1];
      if (!f) return;
      f.diseno = f.diseno === false;
      refrescarNavFotos(); dibujarVista();
      if (e.herramienta === 'fotos') refrescarPanel();
    },
    'elegir-negocio': (el) => {
      ajustes.tipoNegocio = el.dataset.tipo; guardarAjustes();
      cerrarCapa();
      avisar({ productos: 'Listo: vas a vender productos', vehiculos: 'Listo: vas a vender autos y motos', ambos: 'Listo: productos, autos y motos' }[el.dataset.tipo]);
      navegar();
    },
    'foto-quitar': (el) => {
      const e = estado.editor;
      const quitada = e.fotos.splice(Number(el.dataset.i), 1)[0];
      e.fotoQuitada = { foto: quitada, i: Number(el.dataset.i) };
      refrescarFotos();
      avisar('Foto quitada', { texto: 'Deshacer', accion: 'deshacer-quitar-foto' });
    },
    'deshacer-quitar-foto': () => {
      const e = estado.editor;
      if (!e || !e.fotoQuitada) return;
      e.fotos.splice(e.fotoQuitada.i, 0, e.fotoQuitada.foto); e.fotoQuitada = null;
      refrescarFotos(); ocultarAviso();
    },
    'salir-editor': (el, ev) => {
      const e = estado.editor;
      if (e && e.firma !== firmaEditor(e)) { ev.preventDefault(); abrirCapa({ tipo: 'salir' }); }
    },
    'guardar-y-salir': async () => { cerrarCapa(); if (await guardarSolo()) location.hash = 'inicio'; },
    'salir-sin-guardar': () => { cerrarCapa(); location.hash = 'inicio'; },
    herramienta: (el) => abrirHerramienta(estado.editor.herramienta === el.dataset.h ? null : el.dataset.h),
    'cerrar-panel': () => { if (document.activeElement) document.activeElement.blur(); abrirHerramienta(null); },
    fondo: (el) => {
      // los diseños van detrás del producto recortado: si hace falta, se recorta solo
      cambiarModoFondo('diseno', el.dataset.fondo);
    },
    letra: (el) => {
      estado.editor.letra = el.dataset.letra;
      app.querySelectorAll('[data-accion="letra"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.letra === estado.editor.letra)));
      dibujarVista();
    },
    'volver-editar': () => { const p = estado.capa && estado.capa.producto; cerrarCapa(); if (p) abrirEditor(estado.productos.find((x) => x.id === p.id) || p); },
    'quitar-logo': () => { try { localStorage.removeItem('mostrador:logo'); } catch (e) { /* nada */ } logo = null; app.innerHTML = vistaAjustes(); avisar('Logo quitado'); },
    cerrar: () => cerrarCapa(),
    empezar: () => {
      const c = estado.capa;
      c.cola = REDES.map((r) => r.id).filter((id) => c.elegidas.indexOf(id) >= 0);
      ajustes.redes = c.cola.slice(); guardarAjustes();
      c.paso = 0; renderCapa(false);
    },
    'compartir-red': () => compartirRedActual(),
    saltar: () => avanzar(),
    mas: (el) => { estado.pedido[el.dataset.id] = (estado.pedido[el.dataset.id] || 0) + 1; refrescarCatalogo(); },
    menos: (el) => { const n = (estado.pedido[el.dataset.id] || 0) - 1; if (n > 0) estado.pedido[el.dataset.id] = n; else delete estado.pedido[el.dataset.id]; refrescarCatalogo(); },
    'ver-detalle': (el) => { const p = estado.productos.find((x) => x.id === el.dataset.id); if (p) abrirCapa({ tipo: 'detalle', producto: p }); },
    'rubro-filtro': (el) => { estado.filtro.rubro = el.dataset.rubro; refrescarListas(); },
    'limpiar-filtro': () => {
      estado.filtro = { q: '', rubro: 'todos' };
      app.querySelectorAll('[data-buscar]').forEach((i) => { i.value = ''; });
      refrescarListas();
    },
    'ver-pedido': () => abrirCapa({ tipo: 'pedido', nombre: '' }),
    color: (el) => {
      ajustes.color = el.dataset.color; guardarAjustes(); aplicarColor();
      app.querySelectorAll('[data-accion="color"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === ajustes.color)));
    }
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-accion]');
    if (!el || el.tagName === 'INPUT' || el.disabled) return;
    const a = acciones[el.dataset.accion];
    if (a) a(el, ev);
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.buscar) { estado.filtro.q = el.value; refrescarListas(); return; }
    if (el.dataset.auto && estado.editor && el.tagName === 'INPUT' && el.type !== 'checkbox') {
      const a = estado.editor.auto;
      if (el.dataset.auto === 'km') {
        const n = el.value.replace(/\D/g, '').slice(0, 7);
        a.km = n ? Number(n) : '';
        el.value = n ? Number(n).toLocaleString('es-AR') : '';
      } else {
        el.value = el.value.replace(/\D/g, '').slice(0, 4);
        a.anio = el.value;
      }
      redibujarPronto(false);
      return;
    }
    if (el.dataset.tamano && estado.editor) {
      const k = el.dataset.tamano, e = estado.editor;
      e.capas[k] = Object.assign({}, (e.capasUsadas && e.capasUsadas[k]) || {}, e.capas[k] || {}, { escala: Number(el.value) / 100 });
      if (!e.capas[k].x && e.capas[k].x !== 0) delete e.capas[k].x;
      const out = document.getElementById('tam-' + k + '-v'); if (out) out.textContent = el.value + '%';
      dibujarEnElProximoCuadro();
      return;
    }
    const e = estado.editor;
    if (el.dataset.campo === 'nombre' && e) {
      e.nombre = el.value; redibujarPronto(false);
      if (!e.rubroManual) { const sel = document.getElementById('rubro'); if (sel) sel.value = rubroEditor(); }
      const ca = document.getElementById('campos-auto'); if (ca) ca.hidden = rubroEditor() !== 'vehiculos';
      app.querySelectorAll('.letra b').forEach((b) => { b.textContent = e.nombre || 'Mi producto'; });
    }
    if (el.dataset.campo === 'precio' && e) {
      const n = parseInt(el.value.replace(/\D/g, ''), 10) || 0;
      e.precio = n;
      const lindo = n ? n.toLocaleString('es-AR') : '';
      if (el.value !== lindo) el.value = lindo;
      redibujarPronto(true);
    }
    if (el.dataset.accion === 'pedido-nombre' && estado.capa) {
      estado.capa.nombre = el.value;
      const h = hojaPedido();
      const enlace = document.getElementById('enviar-pedido');
      if (enlace) enlace.outerHTML = h[2].split('</a>')[0] + '</a>';
    }
    if (el.dataset.ajuste === 'negocio' || el.dataset.ajuste === 'whatsapp') {
      ajustes[el.dataset.ajuste] = el.dataset.ajuste === 'whatsapp' ? el.value.replace(/\D/g, '') : el.value;
      guardarAjustes();
    }
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.campo === 'rubro' && estado.editor) {
      estado.editor.rubro = el.value; estado.editor.rubroManual = true;
      const a = document.getElementById('rubro-ayuda'); if (a) a.textContent = '(elegido por vos)';
      const ca = document.getElementById('campos-auto'); if (ca) ca.hidden = el.value !== 'vehiculos';
      dibujarVista();
      return;
    }
    if (el.dataset.campo === 'moneda' && estado.editor) { estado.editor.moneda = el.value; dibujarVista(); return; }
    if (el.dataset.auto && estado.editor && (el.tagName === 'SELECT' || el.type === 'checkbox')) {
      estado.editor.auto[el.dataset.auto] = el.type === 'checkbox' ? el.checked : el.value;
      dibujarVista();
      return;
    }
    if (el.dataset.accion === 'foto-diseno' && estado.editor) {
      const f = estado.editor.fotos[Number(el.dataset.i)];
      if (f) { f.diseno = el.checked; refrescarNavFotos(); dibujarVista(); }
      return;
    }
    if (el.dataset.ajuste === 'tipoNegocio') { ajustes.tipoNegocio = el.value; guardarAjustes(); avisar('Guardado'); return; }
    if (el.dataset.accion === 'mas-fotos' && el.files && el.files.length && estado.editor) { const fs = Array.from(el.files); el.value = ''; agregarFotos(fs); return; }
    if (el.dataset.accion === 'foto' && el.files && el.files[0]) { nuevaFoto(el.files[0]); el.value = ''; return; }
    if (el.dataset.accion === 'logo' && el.files && el.files[0]) { guardarLogo(el.files[0]).then(() => { if (vistaActual() === 'ajustes') app.innerHTML = vistaAjustes(); }); el.value = ''; return; }
    if (el.dataset.accion === 'todas-fotos' && estado.capa) { estado.capa.todas = el.checked; return; }
    if (el.dataset.accion === 'red' && estado.capa) {
      const c = estado.capa;
      c.elegidas = c.elegidas.filter((id) => id !== el.value);
      if (el.checked) c.elegidas.push(el.value);
      const b = capa.querySelector('[data-accion="empezar"]');
      const n = c.elegidas.length;
      b.disabled = !n;
      b.textContent = n ? 'Empezar (' + n + (n === 1 ? ' red)' : ' redes)') : 'Elegí al menos una red';
      return;
    }
    if (el.dataset.ajuste === 'mostrarNegocio' || el.dataset.ajuste === 'mostrarCodigo') { ajustes[el.dataset.ajuste] = el.checked; guardarAjustes(); if (vistaActual() === 'editor') { dibujarVista(); const t = document.getElementById('tam-marca-caja'); if (t) t.hidden = !ajustes.mostrarNegocio; } }
    if (el.dataset.ajuste === 'negocio' && !el.value.trim()) { ajustes.negocio = AJUSTES_BASE.negocio; el.value = ajustes.negocio; guardarAjustes(); }
  });

  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.capa) cerrarCapa(); });
  window.addEventListener('hashchange', navegar);

  // App instalable (solo en la versión publicada en internet)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* en la demo no se puede */ });
  }

  // En Netlify gratis aparece su cartel abajo: dejamos lugar para que no tape botones
  if (/\.netlify\.app$/.test(location.hostname)) document.body.classList.add('con-insignia');
  aplicarColor();
  Promise.all([cargarLogo(), cargarProductos()]).then(navegar, navegar);
})();
