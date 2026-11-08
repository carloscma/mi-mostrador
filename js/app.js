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
  const FOTOS = window.MOSTRADOR_FOTOS || {};
  const app = document.getElementById('app');
  const capa = document.getElementById('capa');
  const COLORES = ['#1C5BB8', '#A3195B', '#12715F', '#C2410C', '#5B3FA6', '#15161D'];

  const REDES = [
    { id: 'estado', nombre: 'Estado de WhatsApp', formato: 'estado', app: 'WhatsApp', ayuda: 'En el menú elegí WhatsApp y después "Mi estado".' },
    { id: 'ig-historia', nombre: 'Historia de Instagram', formato: 'estado', app: 'Instagram', ayuda: 'Elegí Instagram y después "Historia".' },
    { id: 'ig-post', nombre: 'Publicación de Instagram', formato: 'feed', app: 'Instagram', ayuda: 'Elegí Instagram y después "Feed". El texto ya está copiado: pegalo en la descripción.' },
    { id: 'facebook', nombre: 'Facebook', formato: 'feed', app: 'Facebook', ayuda: 'Elegí Facebook. El texto ya está copiado: pegalo al publicar.' },
    { id: 'marketplace', nombre: 'Marketplace', formato: 'feed', app: 'la galería', ayuda: 'Guardá la imagen y abrí Marketplace → Vender. Título, precio y descripción ya están copiados.' },
    { id: 'tiktok', nombre: 'TikTok', formato: 'estado', app: 'TikTok', ayuda: 'Elegí TikTok. El texto ya está copiado: pegalo en la descripción.' }
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
      const max = 1440;
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.86);
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

  /* ================= Inicio ================= */
  function vistaInicio() {
    const ps = estado.productos;
    const grilla = ps.length
      ? '<div class="grilla">' + ps.map((p) =>
        '<button class="miniatura" data-accion="abrir" data-id="' + esc(p.id) + '" aria-label="' + esc(p.nombre + ', ' + pesos(p.precio)) + '">' +
        '<img src="' + p.foto + '" alt="" loading="lazy"><span class="precio-chip">' + esc(pesos(p.precio)) + '</span>' +
        '<span class="mini-nombre">' + esc(p.nombre) + '</span></button>').join('') + '</div>'
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
      '<p class="detalle">Tocá uno para cambiarle el precio o el sticker y volver a compartirlo.</p>' +
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
    estado.editor = Object.assign({ formatoVista: 'estado', pestana: 'sticker', fondo: 'desenfocado', letra: 'moderna' }, p);
    estado.editor.img = await cargarImagen(p.foto);
    estado.editor.imgRecorte = p.recorte ? await cargarImagen(p.recorte) : null;
    if (location.hash === '#editor') navegar(); else location.hash = 'editor';
  }

  /* ================= Editor ================= */
  function vistaEditor() {
    const e = estado.editor;
    const pestanas = [['sticker', 'Sticker'], ['fondo', 'Fondo'], ['letra', 'Letra']];

    return '<header class="barra-top"><a class="btn-texto" href="#inicio">← Volver</a><b>' + (e.id ? 'Editar publicación' : 'Nueva publicación') + '</b>' +
      (e.id ? '<button class="btn-texto peligro" data-accion="borrar">' + (e.confirmarBorrar ? '¿Seguro?' : 'Borrar') + '</button>' : '<span></span>') + '</header>' +
      '<main class="pagina editor">' +
      '<div class="vista-previa ' + e.formatoVista + '"><canvas id="lienzo" aria-label="Vista previa de la imagen"></canvas><span class="trabajando-aviso" aria-live="polite">Recortando el producto…<small>La primera vez puede tardar unos segundos</small></span></div>' +
      '<div class="segmentos" role="group" aria-label="Ver como">' +
      '<button data-accion="formato-vista" data-formato="estado" aria-pressed="' + (e.formatoVista === 'estado') + '">Estado / historia</button>' +
      '<button data-accion="formato-vista" data-formato="feed" aria-pressed="' + (e.formatoVista === 'feed') + '">Publicación</button></div>' +
      '<div class="campos">' +
      '<div class="campo"><label for="nombre">Nombre del producto</label><input id="nombre" data-campo="nombre" value="' + esc(e.nombre) + '" placeholder="Ej: Vasos de vidrio x 6" autocomplete="off" enterkeyhint="next"></div>' +
      '<div class="campo"><label for="precio">Precio</label><div class="con-signo"><span>$</span><input id="precio" data-campo="precio" inputmode="numeric" value="' + esc(e.precio ? Number(e.precio).toLocaleString('es-AR') : '') + '" placeholder="5.000" autocomplete="off" enterkeyhint="done"></div></div>' +
      '</div>' +
      '<div class="pestanas" role="tablist">' + pestanas.map((t) =>
        '<button role="tab" data-accion="pestana" data-pestana="' + t[0] + '" aria-selected="' + (e.pestana === t[0]) + '">' + t[1] + '</button>').join('') + '</div>' +
      '<div id="panel-opciones">' + panelOpciones() + '</div>' +
      '</main>' +
      '<div class="barra-abajo"><button class="btn btn-marca btn-ancho" data-accion="compartir">Compartir</button></div>';
  }

  function panelOpciones() {
    const e = estado.editor;
    if (e.pestana === 'fondo') {
      const boton = e.recortado
        ? '<div class="recorte-caja activo"><div><b>Fondo de la foto quitado</b><span class="detalle">El producto va recortado sobre el diseño.</span></div><button class="btn btn-chico" data-accion="sin-recorte">Volver a la foto</button></div>'
        : '<div class="recorte-caja"><div><b>Quitar el fondo de la foto</b><span class="detalle">Recorta el producto y lo pone sobre el diseño que elijas.</span></div><button class="btn btn-chico btn-marca" data-accion="recortar">Quitar fondo</button></div>';
      return boton + '<div class="estilos fondos" role="group" aria-label="Fondos">' + S.FONDOS.map((f) =>
        '<button class="estilo" data-accion="fondo" data-fondo="' + f.id + '" aria-pressed="' + (e.fondo === f.id) + '">' +
        '<canvas width="180" height="320" data-mini-fondo="' + f.id + '" aria-hidden="true"></canvas><span>' + esc(f.nombre) + '</span></button>').join('') + '</div>';
    }
    if (e.pestana === 'letra') {
      return '<div class="letras" role="group" aria-label="Tipos de letra">' + S.LETRAS.map((l) =>
        '<button class="letra" data-accion="letra" data-letra="' + l.id + '" aria-pressed="' + (e.letra === l.id) + '" style="font-family:' + esc(l.familia) + ', sans-serif;font-weight:' + l.peso + '">' +
        '<b' + (l.mayus ? ' style="text-transform:uppercase"' : '') + '>' + esc(e.nombre || 'Mi producto') + '</b><span>' + esc(l.nombre) + '</span></button>').join('') + '</div>';
    }
    return '<div class="fila"><span class="detalle">Elegí el sticker del precio</span><button class="btn btn-chico" data-accion="mover">Mover sticker ↻</button></div>' +
      '<div class="estilos" role="group" aria-label="Estilos de sticker">' + S.ESTILOS.map((st) =>
        '<button class="estilo" data-accion="estilo" data-estilo="' + st.id + '" aria-pressed="' + (e.estilo === st.id) + '">' +
        '<canvas width="240" height="240" data-mini="' + st.id + '" aria-hidden="true"></canvas><span>' + esc(st.nombre) + '</span></button>').join('') + '</div>';
  }

  async function recortarProducto() {
    const e = estado.editor;
    if (e.recorte && e.imgRecorte) { e.recortado = true; if (e.fondo === 'desenfocado') e.fondo = 'estudio'; refrescarPanel(); dibujarVista(); return; }
    if (!window.RECORTE || !RECORTE.disponible()) { avisar('Este celular no permite recortar automáticamente.'); return; }
    const caja = app.querySelector('.vista-previa');
    if (caja) caja.classList.add('trabajando');
    const boton = app.querySelector('[data-accion="recortar"]');
    if (boton) { boton.disabled = true; boton.textContent = 'Recortando…'; }
    // dejar que se vea el aviso antes de ponerse a trabajar
    await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 30)));
    try {
      const r = await RECORTE.recortar(e.img);
      e.recorte = r.imagen.toDataURL('image/png');
      e.imgRecorte = await cargarImagen(e.recorte);
      e.recortado = true;
      if (e.fondo === 'desenfocado') e.fondo = 'estudio';
      avisar('¡Listo! Ahora elegí el fondo que más te guste.');
    } catch (err) {
      const msj = String(err && err.message);
      avisar(msj === 'sin-objeto' ? 'No encontramos el producto. Probá con una foto donde se vea entero y centrado.'
        : msj.indexOf('sin-') === 0 ? 'Este celular no permite recortar automáticamente.'
          : 'No se pudo recortar. Revisá tu conexión y probá de nuevo.');
    } finally {
      if (caja) caja.classList.remove('trabajando');
    }
    refrescarPanel();
    dibujarVista();
  }

  function refrescarPanel() {
    const panel = document.getElementById('panel-opciones');
    if (panel) { panel.innerHTML = panelOpciones(); dibujarMiniaturas(); }
  }

  let temporizadorVista = null;
  function prepararEditor() {
    if (window.RECORTE && RECORTE.disponible()) setTimeout(() => RECORTE.preparar().catch(() => null), 600);
    S.prepararFuentes().then(() => { dibujarVista(); dibujarMiniaturas(); });
    dibujarVista();
    dibujarMiniaturas();
  }

  function datosEditor() {
    const e = estado.editor;
    return { foto: e.img, recorte: e.imgRecorte, nombre: e.nombre || 'Nombre del producto', precio: Number(e.precio) || 0, codigo: ajustes.mostrarCodigo ? e.codigo : '' };
  }
  function opcionesEditor(formato) {
    const e = estado.editor;
    return { estilo: e.estilo, posicion: e.posicion, formato: formato, negocio: ajustes.negocio, mostrarNegocio: ajustes.mostrarNegocio, color: ajustes.color, fondo: e.fondo, letra: e.letra, logo: logo, recortado: !!(e.recortado && e.imgRecorte) };
  }

  function dibujarVista() {
    const e = estado.editor;
    const lienzo = document.getElementById('lienzo');
    if (!e || !lienzo) return;
    const imagen = S.componer(datosEditor(), opcionesEditor(e.formatoVista));
    lienzo.width = imagen.width / 2;
    lienzo.height = imagen.height / 2;
    lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
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
      c.getContext('2d').drawImage(S.miniaturaFondo(c.dataset.miniFondo, ajustes.color, e && e.img, e && e.recortado ? e.imgRecorte : null), 0, 0);
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
      recorte: e.recorte || null, recortado: !!e.recortado
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
    if (!e.nombre) { avisar('Escribí el nombre del producto'); const c = document.getElementById('nombre'); if (c) c.focus(); return; }
    if (!(Number(e.precio) > 0)) { avisar('Escribí el precio'); const c = document.getElementById('precio'); if (c) c.focus(); return; }
    let p;
    try { p = await guardarEditor(); } catch (err) { avisar('No se pudo guardar. Probá de nuevo.'); return; }
    // Se arman las dos imágenes antes, así "Compartir" abre al instante
    const imagenes = {};
    ['estado', 'feed'].forEach((f) => { imagenes[f] = S.aBlob(S.componer(datosEditor(), opcionesEditor(f))); });
    abrirCapa({ tipo: 'redes', producto: p, imagenes: imagenes, elegidas: ajustes.redes.slice(), paso: -1 });
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
      cuerpo = '<div class="paso-red"><img id="img-red" alt="Imagen para ' + esc(r.nombre) + '" class="' + r.formato + '">' +
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
      const r = REDES.find((x) => x.id === c.cola[c.paso]);
      c.imagenes[r.formato].then((b) => {
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
    const blob = await c.imagenes[r.formato];
    const nombre = (normalizar(c.producto.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'producto') + '-' + r.formato + '.jpg';
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
      '<main class="pagina"><div class="grilla catalogo">' + ps.map((p) => {
        const n = estado.pedido[p.id] || 0;
        return '<article class="prod"><img src="' + p.foto + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
          '<div class="prod-info"><span class="prod-nombre">' + esc(p.nombre) + '</span><span class="prod-precio">' + esc(pesos(p.precio)) + '</span>' +
          (n ? '<div class="paso-cant"><button data-accion="menos" data-id="' + esc(p.id) + '" aria-label="Restar">−</button><span>' + n + '</span><button data-accion="mas" data-id="' + esc(p.id) + '" aria-label="Sumar">+</button></div>'
            : '<button class="btn btn-chico" data-accion="mas" data-id="' + esc(p.id) + '">Agregar</button>') +
          '</div></article>';
      }).join('') + '</div></main>' +
      (cant ? '<div class="barra-abajo"><button class="btn btn-marca btn-ancho fila" data-accion="ver-pedido"><span>Ver pedido · ' + cant + '</span><span>' + esc(pesos(total)) + '</span></button></div>' : '');
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
    mover: () => {
      const e = estado.editor;
      if (e.estilo === 'banda') { avisar('La banda va siempre abajo. Elegí otro sticker para moverlo.'); return; }
      const i = S.POSICIONES.indexOf(e.posicion);
      e.posicion = S.POSICIONES[(i + 1) % S.POSICIONES.length];
      dibujarVista();
    },
    'formato-vista': (el) => {
      estado.editor.formatoVista = el.dataset.formato;
      app.querySelectorAll('[data-accion="formato-vista"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.formato === estado.editor.formatoVista)));
      const caja = app.querySelector('.vista-previa'); caja.classList.remove('estado', 'feed'); caja.classList.add(estado.editor.formatoVista);
      dibujarVista();
    },
    borrar: async () => {
      const e = estado.editor;
      if (!e.confirmarBorrar) { e.confirmarBorrar = true; app.querySelector('[data-accion="borrar"]').textContent = '¿Seguro?'; return; }
      await ALMACEN.borrar(e.id);
      estado.productos = await ALMACEN.todos();
      estado.editor = null;
      location.hash = 'inicio';
      avisar('Producto borrado');
    },
    compartir: () => abrirCompartir(),
    recortar: () => recortarProducto(),
    'sin-recorte': () => { estado.editor.recortado = false; refrescarPanel(); dibujarVista(); },
    pestana: (el) => {
      estado.editor.pestana = el.dataset.pestana;
      app.querySelectorAll('[data-accion="pestana"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pestana === estado.editor.pestana)));
      document.getElementById('panel-opciones').innerHTML = panelOpciones();
      dibujarMiniaturas();
    },
    fondo: (el) => {
      estado.editor.fondo = el.dataset.fondo;
      app.querySelectorAll('[data-accion="fondo"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fondo === estado.editor.fondo)));
      dibujarVista();
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
    mas: (el) => { estado.pedido[el.dataset.id] = (estado.pedido[el.dataset.id] || 0) + 1; app.innerHTML = vistaCatalogo(); },
    menos: (el) => { const n = (estado.pedido[el.dataset.id] || 0) - 1; if (n > 0) estado.pedido[el.dataset.id] = n; else delete estado.pedido[el.dataset.id]; app.innerHTML = vistaCatalogo(); },
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
    const e = estado.editor;
    if (el.dataset.campo === 'nombre' && e) {
      e.nombre = el.value; redibujarPronto(false);
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
    if (el.dataset.ajuste === 'mostrarNegocio' || el.dataset.ajuste === 'mostrarCodigo') { ajustes[el.dataset.ajuste] = el.checked; guardarAjustes(); }
    if (el.dataset.ajuste === 'negocio' && !el.value.trim()) { ajustes.negocio = AJUSTES_BASE.negocio; el.value = ajustes.negocio; guardarAjustes(); }
  });

  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.capa) cerrarCapa(); });
  window.addEventListener('hashchange', navegar);

  // App instalable (solo en la versión publicada en internet)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* en la demo no se puede */ });
  }

  aplicarColor();
  Promise.all([cargarLogo(), cargarProductos()]).then(navegar, navegar);
})();
