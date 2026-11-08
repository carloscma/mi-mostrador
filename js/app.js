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
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const local = {
    leer(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  let temporizador = null;
  function avisar(texto) {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.classList.add('ver');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => el.classList.remove('ver'), 2800);
  }

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
  function rubroDe(p) { return p.rubroManual && p.rubro ? p.rubro : RUBROS.detectar(p.nombre); }

  function filtrar(lista) {
    const f = estado.filtro;
    const palabras = RUBROS.normalizar(f.q).split(' ').filter(Boolean);
    return lista.filter((p) => {
      const r = rubroDe(p);
      if (f.rubro !== 'todos' && r !== f.rubro) return false;
      if (!palabras.length) return true;
      const texto = RUBROS.normalizar([p.nombre, RUBROS.nombreDe(r), p.codigo, p.precio, pesos(p.precio)].join(' '));
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
      '<button class="miniatura" data-accion="abrir" data-id="' + esc(p.id) + '" aria-label="' + esc('Editar ' + p.nombre + ', ' + pesos(p.precio)) + '">' +
      '<img src="' + p.foto + '" alt="" loading="lazy"><span class="precio-chip">' + esc(pesos(p.precio)) + '</span>' +
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
    estado.editor.herramienta = (p.nombre && Number(p.precio) > 0) ? null : 'datos';
    estado.editor.capas = JSON.parse(JSON.stringify(p.capas || {}));
    if (!estado.editor.modoFondo) estado.editor.modoFondo = p.recortado ? 'diseno' : 'original';
    estado.editor.img = await cargarImagen(p.foto);
    estado.editor.imgRecorte = p.recorte ? await cargarImagen(p.recorte) : null;
    if (location.hash === '#editor') navegar(); else location.hash = 'editor';
  }

  /* ================= Editor ================= */
  const HERRAMIENTAS = [
    ['datos', 'Texto', '<path d="M5 7V4h14v3M12 4v16M9 20h6"/>'],
    ['sticker', 'Sticker', '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.6"/>'],
    ['fondo', 'Fondo', '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'],
    ['letra', 'Letra', '<path d="M2.5 19 8 5l5.5 14M4.6 14h6.8"/><circle cx="18" cy="16" r="3"/><path d="M21 12.5V19"/>'],
    ['mas', 'Más', '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>']
  ];
  const TITULO_PANEL = { datos: 'Nombre, precio y rubro', sticker: 'Sticker del precio', fondo: 'Fondo de la foto', letra: 'Letra del nombre', mas: 'Más opciones' };

  function vistaEditor() {
    const e = estado.editor;
    const h = e.herramienta;
    return '<div class="editor2' + (h ? ' con-panel' : '') + '">' +
      '<header class="ed-top"><a class="ed-volver" href="#inicio" aria-label="Volver al inicio"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>' +
      '<b>' + (e.id ? 'Editar publicación' : 'Nueva publicación') + '</b>' +
      '<button class="btn btn-marca ed-compartir" data-accion="compartir">Compartir</button></header>' +
      '<div class="ed-escena" id="ed-escena">' +
      '<div class="ed-foto"><div class="vista-previa" style="' + proporcion(e) + '"><canvas id="lienzo" aria-label="Vista previa. Tocá el precio o el nombre para cambiarlos; arrastralos para moverlos."></canvas>' +
      '<span class="trabajando-aviso" aria-live="polite">Recortando el producto…<small>La primera vez puede tardar unos segundos</small></span>' +
      '<span class="ed-ayuda" id="ed-ayuda">Tocá el precio o el nombre para cambiarlos. Arrastralos para moverlos.</span></div></div>' +
      '<nav class="ed-herramientas" aria-label="Herramientas">' + HERRAMIENTAS.map((t) =>
        '<button data-accion="herramienta" data-h="' + t[0] + '" aria-pressed="' + (h === t[0]) + '">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + t[2] + '</svg><span>' + t[1] + '</span></button>').join('') + '</nav>' +
      '</div>' +
      '<section class="ed-panel" id="ed-panel" aria-label="' + esc(h ? TITULO_PANEL[h] : '') + '"' + (h ? '' : ' hidden') + '>' +
      '<div class="ed-panel-cab"><b id="ed-panel-titulo">' + esc(h ? TITULO_PANEL[h] : '') + '</b><button class="btn btn-chico" data-accion="cerrar-panel">Listo</button></div>' +
      '<div id="panel-opciones">' + (h ? panelOpciones() : '') + '</div></section>' +
      '</div>';
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
    const t = S.tamanoSalida(e.img);
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
      '</div>';
  }

  function panelMas() {
    const e = estado.editor;
    return '<div class="ed-mas">' +
      '<button class="btn btn-ancho" data-accion="reacomodar">Volver a acomodar precio, nombre y logo</button>' +
      '<label class="interruptor"><input type="checkbox" data-ajuste="mostrarNegocio"' + (ajustes.mostrarNegocio ? ' checked' : '') + '><span>Poner el nombre del negocio' + (logo ? ' y el logo' : '') + '</span></label>' +
      '<a class="btn-texto" href="#ajustes">Cambiar nombre del negocio, logo o color →</a>' +
      (e.id ? '<button class="btn btn-peligro btn-ancho" data-accion="pedir-borrar" data-id="' + esc(e.id) + '">' + ICONO_TACHO + ' Eliminar este producto</button>' : '') +
      '</div>';
  }

  function rubroEditor() {
    const e = estado.editor;
    return e.rubroManual && e.rubro ? e.rubro : RUBROS.detectar(e.nombre);
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
    if (e.herramienta === 'mas') return panelMas();
    if (e.herramienta === 'fondo') {
      const modos = [['original', 'Foto original'], ['retrato', 'Desenfocar fondo'], ['diseno', 'Quitar fondo']];
      const ayuda = {
        original: 'La foto tal cual la sacaste.',
        retrato: 'El producto queda nítido y lo de atrás se pone borroso, como el modo retrato.',
        diseno: 'El producto va recortado sobre el diseño que elijas abajo.'
      }[e.modoFondo];
      return '<div class="modos-fondo" role="group" aria-label="Fondo de la foto">' + modos.map((m) =>
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
        if (!k) { toqueVacio = { id: ev.pointerId, x: ev.clientX, y: ev.clientY }; return; }
        const usada = (e.capasUsadas && e.capasUsadas[k]) || { x: 0.5, y: 0.5, escala: 1 };
        e.capas[k] = Object.assign({}, usada, e.capas[k] && e.capas[k].escala ? { escala: e.capas[k].escala } : {});
        arrastre = { clave: k, inicio: p, x0: e.capas[k].x, y0: e.capas[k].y, escala0: e.capas[k].escala || 1, dist0: 0, cx: ev.clientX, cy: ev.clientY, movio: false };
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
        if (ev.type === 'pointerup' && Math.hypot(ev.clientX - toqueVacio.x, ev.clientY - toqueVacio.y) < 10 && estado.editor.herramienta) {
          if (document.activeElement) document.activeElement.blur();
          abrirHerramienta(null);
        }
        toqueVacio = null;
      }
      dedos.delete(ev.pointerId);
      if (dedos.size === 0 && arrastre && !arrastre.movio) {
        // fue un toque: abrir lo que corresponde
        const k = arrastre.clave;
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
    return { foto: e.img, recorte: e.imgRecorte, recorteCaja: e.recorteCaja, nombre: e.nombre || 'Nombre del producto', precio: Number(e.precio) || 0, codigo: ajustes.mostrarCodigo ? e.codigo : '' };
  }
  function opcionesEditor() {
    const e = estado.editor;
    return { estilo: e.estilo, posicion: e.posicion, negocio: ajustes.negocio, mostrarNegocio: ajustes.mostrarNegocio, color: ajustes.color, fondo: e.fondo, letra: e.letra, logo: logo, modoFondo: e.imgRecorte ? e.modoFondo : 'original', capas: e.capas };
  }

  function dibujarVista() {
    const e = estado.editor;
    const lienzo = document.getElementById('lienzo');
    if (!e || !lienzo) return;
    const imagen = S.componer(datosEditor(), Object.assign(opcionesEditor(), { escalaVista: 0.5 }));
    if (lienzo.width !== imagen.width || lienzo.height !== imagen.height) { lienzo.width = imagen.width; lienzo.height = imagen.height; }
    lienzo.getContext('2d').drawImage(imagen, 0, 0);
    e.cajas = imagen.cajas;
    e.capasUsadas = imagen.capas;
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
      rubro: rubroEditor(), rubroManual: !!e.rubroManual
    };
    await ALMACEN.guardar(p);
    e.id = p.id; e.fecha = p.fecha;
    ajustes.estilo = e.estilo; ajustes.fondo = e.fondo; ajustes.letra = e.letra; guardarAjustes();
    estado.productos = await ALMACEN.todos();
    return p;
  }

  /* ================= Compartir red por red ================= */
  function textoRed(p, red) {
    const precio = pesos(p.precio);
    const cod = ajustes.mostrarCodigo && p.codigo ? ' (cód. ' + p.codigo + ')' : '';
    const wa = ajustes.whatsapp ? 'wa.me/' + ajustes.whatsapp : 'WhatsApp';
    const tags = ['#' + normalizar(ajustes.negocio).toLowerCase().replace(/[^a-z0-9]/g, ''), '#ventas', '#ofertas', '#' + (normalizar(p.nombre).toLowerCase().split(/\s+/)[0] || 'productos').replace(/[^a-z0-9]/g, '')].join(' ');
    if (red === 'estado') return p.nombre + ' ' + precio + cod + '. Pedí respondiendo este estado.';
    if (red === 'marketplace') return 'Título: ' + p.nombre + '\nPrecio: ' + precio + '\nDescripción: ' + p.nombre + ' a ' + precio + cod + '. ' + ajustes.negocio + '. Consultas y pedidos por mensaje.';
    if (red === 'facebook') return p.nombre + '\n' + precio + cod + '\n\nPedidos por ' + wa + '\n' + ajustes.negocio;
    if (red === 'tiktok') return p.nombre + ' a ' + precio + cod + '. Pedidos por ' + wa + ' ' + tags;
    return p.nombre + '\n' + precio + cod + '\n\nPedidos por ' + wa + '\n' + ajustes.negocio + '\n\n' + tags;
  }

  async function abrirCompartir() {
    const e = estado.editor;
    e.nombre = (e.nombre || '').trim();
    if (!e.nombre) { avisar('Escribí el nombre del producto'); abrirHerramienta('datos', 'nombre'); return; }
    if (!(Number(e.precio) > 0)) { avisar('Escribí el precio'); abrirHerramienta('datos', 'precio'); return; }
    let p;
    try { p = await guardarEditor(); } catch (err) { avisar('No se pudo guardar. Probá de nuevo.'); return; }
    // La imagen se arma antes, así "Compartir" abre al instante
    const imagen = S.aBlob(S.componer(datosEditor(), opcionesEditor()));
    abrirCapa({ tipo: 'redes', producto: p, imagen: imagen, elegidas: ajustes.redes.slice(), paso: -1 });
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
    else if (c.tipo === 'borrar') {
      titulo = '¿Eliminar este producto?';
      cuerpo = '<div class="confirmar-borrar"><img src="' + c.producto.foto + '" alt=""><div><b>' + esc(c.producto.nombre || 'Sin nombre') + '</b><span>' + esc(pesos(c.producto.precio)) + '</span></div></div>' +
        '<p class="detalle">Se borra de "Tus productos" y de tu catálogo. No se puede deshacer.</p>';
      pie = '<button class="btn btn-peligro-lleno btn-ancho" data-accion="confirmar-borrar">Sí, eliminar</button>' +
        '<button class="btn btn-claro btn-ancho" data-accion="cerrar">Cancelar</button>';
    }
    else if (c.paso < 0) {
      titulo = '¿Dónde lo querés subir?';
      cuerpo = '<div class="redes">' + REDES.map((r) =>
        '<label class="red"><input type="checkbox" data-accion="red" value="' + r.id + '"' + (c.elegidas.indexOf(r.id) >= 0 ? ' checked' : '') + '><span>' + esc(r.nombre) + '</span></label>').join('') + '</div>' +
        '<p class="nota">La app te va a llevar red por red con la imagen y el texto listos.</p>';
      const n = c.elegidas.length;
      pie = '<button class="btn btn-marca btn-ancho" data-accion="empezar"' + (n ? '' : ' disabled') + '>' + (n ? 'Empezar (' + n + (n === 1 ? ' red)' : ' redes)') : 'Elegí al menos una red') + '</button>';
    } else if (c.paso < c.cola.length) {
      const r = REDES.find((x) => x.id === c.cola[c.paso]);
      titulo = (c.paso + 1) + ' de ' + c.cola.length + ' · ' + r.nombre;
      cuerpo = '<div class="paso-red"><img id="img-red" alt="Imagen para ' + esc(r.nombre) + '">' +
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

    if (puedeCompartir(archivo)) {
      try {
        await navigator.share({ files: [archivo], text: texto });
        avanzar();
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // cerró el menú sin elegir
      }
    }
    const dl = await descargasClaude();
    if (dl) {
      try { await dl.save({ filename: nombre, data: archivo }); avisar('Imagen descargada. El texto quedó copiado.'); avanzar(); }
      catch (e) { if (!e || e.code !== 'declined') avisar('No se pudo descargar la imagen.'); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(archivo); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    avisar('Imagen descargada. El texto quedó copiado.');
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

  function barraPedido(cant, total) {
    return cant ? '<div class="barra-abajo"><button class="btn btn-marca btn-ancho fila" data-accion="ver-pedido"><span>Ver pedido · ' + cant + '</span><span>' + esc(pesos(total)) + '</span></button></div>' : '';
  }

  function grillaCatalogo() {
    const ps = filtrar(estado.productos);
    if (!ps.length) return estado.productos.length ? sinResultados() : '<p class="vacio">Todavía no hay productos.</p>';
    return '<div class="grilla catalogo">' + ps.map((p) => {
      const n = estado.pedido[p.id] || 0;
      return '<article class="prod"><div class="prod-foto"><img src="' + p.foto + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
        '<button class="borrar-mini" data-accion="pedir-borrar" data-id="' + esc(p.id) + '" aria-label="' + esc('Eliminar ' + p.nombre) + '">' + ICONO_TACHO + '</button></div>' +
        '<div class="prod-info"><span class="prod-rubro">' + esc(RUBROS.nombreDe(rubroDe(p))) + '</span><span class="prod-nombre">' + esc(p.nombre) + '</span><span class="prod-precio">' + esc(pesos(p.precio)) + '</span>' +
        (n ? '<div class="paso-cant"><button data-accion="menos" data-id="' + esc(p.id) + '" aria-label="Restar">−</button><span>' + n + '</span><button data-accion="mas" data-id="' + esc(p.id) + '" aria-label="Sumar">+</button></div>'
          : '<button class="btn btn-chico" data-accion="mas" data-id="' + esc(p.id) + '">Agregar</button>') +
        '</div></article>';
    }).join('') + '</div>';
  }

  function refrescarCatalogo() {
    const ps = estado.productos;
    const total = Object.keys(estado.pedido).reduce((a, id) => { const p = ps.find((x) => x.id === id); return a + (p ? p.precio * estado.pedido[id] : 0); }, 0);
    const cant = Object.values(estado.pedido).reduce((a, b) => a + b, 0);
    const g = document.getElementById('grilla-catalogo'); if (g) g.innerHTML = grillaCatalogo();
    const b = document.getElementById('barra-pedido'); if (b) b.innerHTML = barraPedido(cant, total);
  }

  function hojaPedido() {
    const ps = estado.productos;
    const lineas = Object.keys(estado.pedido).map((id) => ({ p: ps.find((x) => x.id === id), n: estado.pedido[id] })).filter((l) => l.p);
    const total = lineas.reduce((a, l) => a + l.p.precio * l.n, 0);
    const c = estado.capa;
    const texto = '*Pedido para ' + ajustes.negocio + '*\n\n' + lineas.map((l) => '• ' + l.n + ' x ' + l.p.nombre + ' (' + pesos(l.p.precio) + ') = ' + pesos(l.p.precio * l.n)).join('\n') +
      '\n\n*Total: ' + pesos(total) + '*' + (c.nombre ? '\nA nombre de: ' + c.nombre : '');
    const link = 'https://wa.me/' + (ajustes.whatsapp || '') + '?text=' + encodeURIComponent(texto);
    return ['Tu pedido',
      '<div class="lineas">' + lineas.map((l) => '<div class="linea"><span>' + l.n + ' × ' + esc(l.p.nombre) + '</span><b>' + esc(pesos(l.p.precio * l.n)) + '</b></div>').join('') +
      '<div class="linea total"><span>Total</span><b>' + esc(pesos(total)) + '</b></div></div>' +
      '<div class="campo"><label for="pedido-nombre">Tu nombre</label><input id="pedido-nombre" data-accion="pedido-nombre" value="' + esc(c.nombre || '') + '" autocomplete="name"></div>',
      '<a class="btn btn-wa btn-ancho" id="enviar-pedido" href="' + esc(link) + '" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>' +
      (ajustes.whatsapp ? '' : '<p class="nota">El negocio todavía no cargó su WhatsApp en Ajustes: vas a poder elegir a quién mandarlo.</p>')];
  }

  /* ================= Ajustes ================= */
  function vistaAjustes() {
    return '<header class="barra-top"><a class="btn-texto" href="#inicio">← Volver</a><b>Ajustes</b><span></span></header>' +
      '<main class="pagina ajustes">' +
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
      estado.editor.capas = {};
      ['precio', 'nombre'].forEach(sincronizarDeslizador);
      dibujarVista();
      avisar('Listo, volvió todo a su lugar');
    },
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
      return;
    }
    if (el.dataset.accion === 'foto' && el.files && el.files[0]) { nuevaFoto(el.files[0]); el.value = ''; return; }
    if (el.dataset.accion === 'logo' && el.files && el.files[0]) { guardarLogo(el.files[0]).then(() => { if (vistaActual() === 'ajustes') app.innerHTML = vistaAjustes(); }); el.value = ''; return; }
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
    if (el.dataset.ajuste === 'mostrarNegocio' || el.dataset.ajuste === 'mostrarCodigo') { ajustes[el.dataset.ajuste] = el.checked; guardarAjustes(); if (vistaActual() === 'editor') dibujarVista(); }
    if (el.dataset.ajuste === 'negocio' && !el.value.trim()) { ajustes.negocio = AJUSTES_BASE.negocio; el.value = ajustes.negocio; guardarAjustes(); }
  });

  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.capa) cerrarCapa(); });
  window.addEventListener('hashchange', navegar);

  // App instalable (solo en la versión publicada en internet)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* en la demo no se puede */ });
  }

  if (/\.netlify\.app$/.test(location.hostname)) document.body.classList.add('con-insignia');
  aplicarColor();
  Promise.all([cargarLogo(), cargarProductos()]).then(navegar, navegar);
})();
