/*
  Motor de imágenes: toma la foto, el nombre y el precio, y arma la imagen
  con el sticker elegido.

  Formatos:
    estado -> 1080x1920 (estado de WhatsApp, historias, TikTok)
    feed   -> 1080x1350 (publicación de Instagram y Facebook, Marketplace)

  El precio y los datos quedan dentro de la zona segura: lejos del borde de
  arriba (nombre y barra del estado) y del de abajo (barra de respuesta).
*/
window.STICKERS = (function () {
  'use strict';

  const TINTA = '#15161D';
  const DISPLAY = '"Bricolage Grotesque", "Arial Black", Impact, system-ui, sans-serif';
  const CUERPO = 'Figtree, "Segoe UI", Arial, system-ui, sans-serif';

  // Lista de estilos que ve el vendedor. "ancho" = cuánto ocupa a lo ancho, en radios.
  const ESTILOS = [
    // Precio: formas sin palabras
    { id: 'estrella', nombre: 'Estrella', ancho: 1, grupo: 'precio' },
    { id: 'etiqueta', nombre: 'Etiqueta', ancho: 1.15, grupo: 'precio' },
    { id: 'circulo', nombre: 'Círculo', ancho: 1, grupo: 'precio' },
    { id: 'cartel', nombre: 'Cartel', ancho: 1.15, grupo: 'precio' },
    { id: 'burbuja', nombre: 'Globo', ancho: 1.2, grupo: 'precio' },
    { id: 'neon', nombre: 'Neón', ancho: 1.25, grupo: 'precio' },
    { id: 'colgante', nombre: 'Colgante', ancho: 1.05, grupo: 'precio' },
    { id: 'ticket', nombre: 'Ticket', ancho: 1.2, grupo: 'precio' },
    { id: 'sello', nombre: 'Sello', ancho: 1, grupo: 'precio' },
    { id: 'corazon', nombre: 'Corazón', ancho: 1.05, grupo: 'precio' },
    { id: 'flecha', nombre: 'Flecha', ancho: 1.25, grupo: 'precio' },
    { id: 'pizarra', nombre: 'Pizarra', ancho: 1.2, grupo: 'precio' },
    { id: 'banda', nombre: 'Banda', ancho: 0, grupo: 'precio' },
    // Promociones: llevan una palabra (2x1 y Liquidación separados para no confundirlos)
    { id: 'oferta', nombre: 'Oferta', ancho: 1, grupo: 'promo' },
    { id: 'nuevo', nombre: 'Nuevo', ancho: 1, grupo: 'promo' },
    { id: 'dosxuno', nombre: '2x1', ancho: 1.05, grupo: 'promo' },
    { id: 'especial', nombre: 'Precio especial', ancho: 1.15, grupo: 'promo' },
    { id: 'liquidacion', nombre: 'Liquidación', ancho: 1.2, grupo: 'promo' },
    { id: 'mayor', nombre: 'Por mayor', ancho: 1.15, grupo: 'promo' },
    { id: 'combo', nombre: 'Combo', ancho: 1.05, grupo: 'promo' },
    { id: 'deldia', nombre: 'Oferta del día', ancho: 1.1, grupo: 'promo' },
    { id: 'ultimas', nombre: 'Últimas unidades', ancho: 1.2, grupo: 'promo' },
    // De temporada
    { id: 'navidad', nombre: 'Navidad', ancho: 1.05, grupo: 'temporada' },
    { id: 'madre', nombre: 'Día de la Madre', ancho: 1.05, grupo: 'temporada' },
    { id: 'padre', nombre: 'Día del Padre', ancho: 1.1, grupo: 'temporada' },
    { id: 'nino', nombre: 'Día del Niño', ancho: 1.05, grupo: 'temporada' }
  ];
  const GRUPOS = [['precio', 'Precio'], ['promo', 'Promociones'], ['temporada', 'De temporada']];
  const POSICIONES = ['abajo-der', 'abajo-izq', 'arriba-der', 'arriba-izq'];

  // Tipos de letra para el nombre del producto (se cargan de Google Fonts)
  const LETRAS = [
    { id: 'moderna', nombre: 'Moderna', familia: '"Bricolage Grotesque"', peso: 800, escala: 1 },
    { id: 'impacto', nombre: 'Impacto', familia: '"Bebas Neue"', peso: 400, escala: 1.3, mayus: true },
    { id: 'manuscrita', nombre: 'Manuscrita', familia: 'Pacifico', peso: 400, escala: 0.92 },
    { id: 'elegante', nombre: 'Elegante', familia: '"Playfair Display"', peso: 800, escala: 1 },
    { id: 'redonda', nombre: 'Redonda', familia: 'Fredoka', peso: 600, escala: 1.05 },
    { id: 'marcador', nombre: 'Marcador', familia: '"Permanent Marker"', peso: 400, escala: 0.95 }
  ];

  // Fondos alrededor de la foto
  const FONDOS = [
    { id: 'desenfocado', nombre: 'Foto', grupo: 'basicos' },
    { id: 'estudio', nombre: 'Estudio', grupo: 'basicos' },
    { id: 'marca', nombre: 'Tu color', grupo: 'basicos' },
    { id: 'atardecer', nombre: 'Atardecer', grupo: 'basicos' },
    { id: 'oceano', nombre: 'Océano', grupo: 'basicos' },
    { id: 'violeta', nombre: 'Violeta', grupo: 'basicos' },
    { id: 'noche', nombre: 'Noche', grupo: 'basicos' },
    { id: 'lunares', nombre: 'Lunares', grupo: 'basicos' },
    { id: 'rayas', nombre: 'Rayas', grupo: 'basicos' },
    { id: 'madera', nombre: 'Madera', grupo: 'basicos' },
    { id: 'kraft', nombre: 'Kraft', grupo: 'basicos' },
    { id: 'confeti', nombre: 'Confeti', grupo: 'basicos' },
    { id: 'tienda', nombre: 'Tienda', grupo: 'basicos', sup: 0.7, escena: true },
    { id: 'podio', nombre: 'Podio', grupo: 'basicos', sup: 0.7, escena: true },
    { id: 'cocina-marmol', nombre: 'Mármol', grupo: 'cocina', sup: 0.7, escena: true },
    { id: 'cocina-madera', nombre: 'Madera', grupo: 'cocina', sup: 0.7, escena: true },
    { id: 'cocina-moderna', nombre: 'Moderna', grupo: 'cocina', sup: 0.7, escena: true },
    { id: 'desayuno', nombre: 'Desayuno', grupo: 'cocina', sup: 0.68, escena: true },
    { id: 'living', nombre: 'Living', grupo: 'ambientes', sup: 0.7, escena: true },
    { id: 'dormitorio', nombre: 'Dormitorio', grupo: 'ambientes', sup: 0.66, escena: true },
    { id: 'bano', nombre: 'Baño', grupo: 'ambientes', sup: 0.7, escena: true },
    { id: 'oficina', nombre: 'Oficina', grupo: 'ambientes', sup: 0.7, escena: true },
    { id: 'jardin', nombre: 'Jardín', grupo: 'ambientes', sup: 0.7, escena: true },
    { id: 'nav-luces', nombre: 'Luces', grupo: 'navidad', sup: 0.72, escena: true },
    { id: 'nav-rojo', nombre: 'Rojo y dorado', grupo: 'navidad', escena: true },
    { id: 'nav-nieve', nombre: 'Nieve', grupo: 'navidad', sup: 0.7, escena: true },
    { id: 'nav-verde', nombre: 'Verde', grupo: 'navidad', escena: true },
    { id: 'nav-mesa', nombre: 'Mesa', grupo: 'navidad', sup: 0.7, escena: true },
    { id: 'anio-nuevo', nombre: 'Año Nuevo', grupo: 'fechas', escena: true },
    { id: 'dia-madre', nombre: 'Día de la Madre', grupo: 'fechas', escena: true },
    { id: 'dia-padre', nombre: 'Día del Padre', grupo: 'fechas', sup: 0.72, escena: true },
    { id: 'dia-nino', nombre: 'Día del Niño', grupo: 'fechas', escena: true }
  ];
  const GRUPOS_FONDO = [['basicos', 'Básicos'], ['cocina', 'Cocina'], ['ambientes', 'Ambientes'], ['navidad', 'Navidad'], ['fechas', 'Fechas especiales']];
  const fondoInfo = (id) => FONDOS.find((f) => f.id === id) || {};

  const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  const precioTexto = (n, moneda) => (moneda === 'USD' ? 'US$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR') : pesos(n));

  /* ---------- utilidades de dibujo ---------- */
  function fuente(peso, px, familia) { return peso + ' ' + Math.round(px) + 'px ' + familia; }

  // Achica el texto hasta que entre en el ancho
  function ajustar(ctx, texto, peso, familia, ancho, px) {
    ctx.font = fuente(peso, px, familia);
    while (ctx.measureText(texto).width > ancho && px > 14) { px -= 2; ctx.font = fuente(peso, px, familia); }
    return px;
  }

  function cubrir(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }

  function lineas(ctx, texto, ancho, max) {
    const palabras = String(texto || '').trim().split(/\s+/).filter(Boolean);
    const res = [];
    let linea = '';
    palabras.forEach((p) => {
      const prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && linea) { res.push(linea); linea = p; } else linea = prueba;
    });
    if (linea) res.push(linea);
    if (res.length > max) {
      const r = res.slice(0, max);
      let u = r[max - 1];
      while (ctx.measureText(u + '…').width > ancho && u.length > 1) u = u.slice(0, -1);
      r[max - 1] = u.trim() + '…';
      return r;
    }
    return res;
  }

  // Precio (y textos chicos arriba/abajo) centrados en (0,0)
  function textosCentrados(ctx, d, anchoMax, pxPrecio, color, opciones) {
    opciones = opciones || {};
    const px = ajustar(ctx, d.precio, 800, DISPLAY, anchoMax, pxPrecio);
    const chico = Math.round(pxPrecio * 0.36);
    const arriba = d.arriba ? chico : 0;
    const abajo = d.abajo ? Math.round(chico * 0.9) : 0;
    const alto = (arriba ? arriba * 1.25 : 0) + px * 0.78 + (abajo ? abajo * 1.55 : 0);
    let y = -alto / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    if (opciones.brillo) { ctx.shadowColor = opciones.brillo; ctx.shadowBlur = 24; }
    if (arriba) {
      ctx.font = fuente(800, arriba, CUERPO);
      const w = ctx.measureText(d.arriba).width;
      const pxA = w > anchoMax ? Math.floor(arriba * anchoMax / w) : arriba;
      ctx.font = fuente(800, pxA, CUERPO); y += arriba; ctx.fillText(d.arriba, 0, y); y += arriba * 0.25;
    }
    ctx.font = fuente(800, px, DISPLAY); y += px * 0.78; ctx.fillText(d.precio, 0, y);
    if (abajo) { ctx.font = fuente(700, abajo, CUERPO); y += abajo * 1.55; ctx.fillText(d.abajo, 0, y); }
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left';
  }

  function sombra(ctx, r) { ctx.shadowColor = 'rgba(0,0,0,.33)'; ctx.shadowBlur = r * 0.12; ctx.shadowOffsetY = r * 0.035; }
  function sinSombra(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  /* ---------- los estilos ---------- */
  // forma de corazón centrada
  function caminoCorazon(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.25, r * 0.15, -r * 1.05, -r * 0.95, 0, -r * 0.45);
    ctx.bezierCurveTo(r * 1.05, -r * 0.95, r * 1.25, r * 0.15, 0, r * 0.95);
    ctx.closePath();
  }
  function estrellaChica(ctx, x, y, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i / 10) * Math.PI * 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  const dibujantes = {
    colgante(ctx, r, d) {
      ctx.rotate(0.1);
      ctx.strokeStyle = '#6B4F2A'; ctx.lineWidth = r * 0.04;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.quadraticCurveTo(r * 0.25, -r * 1.05, r * 0.05, -r * 1.25); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#D9B98A'; ctx.fill(); sinSombra(ctx);
      ctx.setLineDash([r * 0.06, r * 0.05]); ctx.lineWidth = r * 0.025; ctx.strokeStyle = 'rgba(80,55,20,.55)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(0, -r * 0.62, r * 0.08, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.save(); ctx.translate(0, r * 0.08); textosCentrados(ctx, d, r * 1.3, r * 0.42, '#3A2A12'); ctx.restore();
    },
    ticket(ctx, r, d) {
      ctx.rotate(-0.06);
      const w = r * 2.3, h = r * 1.15, m = r * 0.17;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
      ctx.arc(w / 2, 0, m, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2);
      ctx.arc(-w / 2, 0, m, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      sombra(ctx, r); ctx.fillStyle = '#FF5A36'; ctx.fill(); sinSombra(ctx);
      ctx.setLineDash([r * 0.07, r * 0.06]); ctx.lineWidth = r * 0.025; ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.roundRect(-w / 2 + r * 0.26, -h / 2 + r * 0.12, w - r * 0.52, h - r * 0.24, r * 0.06); ctx.stroke(); ctx.setLineDash([]);
      textosCentrados(ctx, d, w * 0.66, r * 0.48, '#FFFFFF');
    },
    sello(ctx, r, d) {
      ctx.rotate(-0.18);
      ctx.beginPath();
      for (let i = 0; i < 40; i++) { const rr = i % 2 ? r * 0.92 : r, a = (i / 40) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); sombra(ctx, r); ctx.fillStyle = '#1F8A5B'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
      textosCentrados(ctx, d, r * 1.15, r * 0.4, '#FFFFFF');
    },
    corazon(ctx, r, d) {
      ctx.rotate(-0.08);
      caminoCorazon(ctx, r); sombra(ctx, r); ctx.fillStyle = '#E8335A'; ctx.fill(); sinSombra(ctx);
      ctx.save(); ctx.translate(0, r * 0.08); textosCentrados(ctx, d, r * 1.25, r * 0.4, '#FFFFFF'); ctx.restore();
    },
    flecha(ctx, r, d) {
      ctx.rotate(-0.05);
      const w = r * 2.5, h = r * 1.0, p = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + p, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + p, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath();
      sombra(ctx, r); ctx.fillStyle = '#7B2FF7'; ctx.fill(); sinSombra(ctx);
      ctx.save(); ctx.translate(p * 0.3, 0); textosCentrados(ctx, d, w * 0.7, r * 0.46, '#FFFFFF'); ctx.restore();
    },
    pizarra(ctx, r, d) {
      ctx.rotate(0.04);
      const w = r * 2.3, h = r * 1.35;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.08);
      sombra(ctx, r); ctx.fillStyle = '#8B5A2B'; ctx.fill(); sinSombra(ctx);
      ctx.beginPath(); ctx.rect(-w / 2 + r * 0.1, -h / 2 + r * 0.1, w - r * 0.2, h - r * 0.2); ctx.fillStyle = '#2E3B32'; ctx.fill();
      const px = ajustar(ctx, d.precio, 400, '"Permanent Marker", "Comic Sans MS", cursive', w * 0.78, r * 0.5);
      ctx.textAlign = 'center'; ctx.fillStyle = '#F4F1E8';
      ctx.font = fuente(400, px, '"Permanent Marker", "Comic Sans MS", cursive'); ctx.fillText(d.precio, 0, px * 0.36);
      if (d.abajo) { ctx.font = fuente(700, r * 0.15, CUERPO); ctx.fillText(d.abajo, 0, h / 2 - r * 0.2); }
      ctx.textAlign = 'left';
    },
    especial(ctx, r, d) {
      const w = r * 2.3, h = r * 1.3;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.3);
      sombra(ctx, r); ctx.fillStyle = '#0B3D91'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = '#E8C46A';
      ctx.beginPath(); ctx.roundRect(-w / 2 + r * 0.08, -h / 2 + r * 0.08, w - r * 0.16, h - r * 0.16, r * 0.24); ctx.stroke();
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'PRECIO ESPECIAL' }), w * 0.8, r * 0.44, '#FFFFFF');
    },
    mayor(ctx, r, d) {
      ctx.rotate(-0.04);
      const w = r * 2.3, h = r * 1.3;
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
      sombra(ctx, r); ctx.fillStyle = '#FFFFFF'; ctx.fill(); sinSombra(ctx);
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h * 0.32); ctx.fillStyle = '#0E7490'; ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
      const pxT = ajustar(ctx, 'POR MAYOR', 800, CUERPO, w * 0.85, r * 0.2);
      ctx.font = fuente(800, pxT, CUERPO); ctx.fillText('POR MAYOR', 0, -h / 2 + h * 0.16 + pxT * 0.36);
      ctx.textAlign = 'left';
      ctx.save(); ctx.translate(0, h * 0.16); textosCentrados(ctx, Object.assign({}, d, { arriba: '' }), w * 0.82, r * 0.42, '#0E2A33'); ctx.restore();
    },
    combo(ctx, r, d) {
      ctx.rotate(0.07);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#12B5A6'; ctx.fill(); sinSombra(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#FFE14D'; ctx.stroke();
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'COMBO' }), r * 1.3, r * 0.42, '#FFFFFF');
    },
    deldia(ctx, r, d) {
      ctx.rotate(-0.1);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * 0.8 : r, a = (i / 16) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); sombra(ctx, r); ctx.fillStyle = '#111827'; ctx.fill(); sinSombra(ctx);
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'OFERTA DEL DÍA' }), r * 1.3, r * 0.4, '#FFD23F');
    },
    navidad(ctx, r, d) {
      ctx.rotate(-0.06);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#C8102E'; ctx.fill(); sinSombra(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#1E7B3A'; ctx.stroke();
      // ramita de acebo
      ctx.fillStyle = '#1E7B3A';
      [[-0.18, -0.9, -0.5], [0.18, -0.9, 0.5]].forEach((h) => { ctx.save(); ctx.translate(r * h[0], r * h[1]); ctx.rotate(h[2]); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
      ctx.beginPath(); ctx.arc(0, -r * 0.88, r * 0.08, 0, Math.PI * 2); ctx.fillStyle = '#FFD23F'; ctx.fill();
      ctx.save(); ctx.translate(0, r * 0.06); textosCentrados(ctx, Object.assign({}, d, { arriba: 'NAVIDAD' }), r * 1.3, r * 0.42, '#FFFFFF'); ctx.restore();
    },
    madre(ctx, r, d) {
      caminoCorazon(ctx, r); sombra(ctx, r); ctx.fillStyle = '#F7A8C4'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      ctx.save(); ctx.translate(0, r * 0.06); textosCentrados(ctx, Object.assign({}, d, { arriba: 'DÍA DE LA MADRE' }), r * 1.15, r * 0.36, '#7A1240'); ctx.restore();
    },
    padre(ctx, r, d) {
      ctx.rotate(0.05);
      const w = r * 2.2, h = r * 1.3;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.12);
      sombra(ctx, r); ctx.fillStyle = '#1E3A5F'; ctx.fill(); sinSombra(ctx);
      // corbata chiquita
      ctx.fillStyle = '#F2B134';
      ctx.beginPath(); ctx.moveTo(-r * 0.08, -h / 2); ctx.lineTo(r * 0.08, -h / 2); ctx.lineTo(r * 0.05, -h / 2 + r * 0.1); ctx.lineTo(r * 0.11, -h / 2 + r * 0.32); ctx.lineTo(0, -h / 2 + r * 0.42); ctx.lineTo(-r * 0.11, -h / 2 + r * 0.32); ctx.lineTo(-r * 0.05, -h / 2 + r * 0.1); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(0, r * 0.12); textosCentrados(ctx, Object.assign({}, d, { arriba: 'DÍA DEL PADRE' }), w * 0.82, r * 0.4, '#FFFFFF'); ctx.restore();
    },
    nino(ctx, r, d) {
      ctx.rotate(-0.08);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#FFC93C'; ctx.fill(); sinSombra(ctx);
      const colores = ['#E8335A', '#1C5BB8', '#12B5A6', '#7B2FF7'];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; estrellaChica(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.07, colores[i % 4]); }
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'DÍA DEL NIÑO' }), r * 1.25, r * 0.4, '#3B1A6B');
    },
    liquidacion(ctx, r, d) {
      ctx.rotate(-0.12);
      const w = r * 2.3, h = r * 1.35;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.16);
      sombra(ctx, r); ctx.fillStyle = '#D61F69'; ctx.fill(); sinSombra(ctx);
      ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.16); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let x = -w; x < w; x += r * 0.34) { ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x + r * 0.17, -h / 2); ctx.lineTo(x + r * 0.17 + h, h / 2); ctx.lineTo(x + h, h / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'LIQUIDACIÓN' }), w * 0.86, r * 0.46, '#FFFFFF');
    },
    dosxuno(ctx, r, d) {
      ctx.rotate(-0.08);
      ctx.beginPath();
      for (let i = 0; i < 24; i++) { const rr = i % 2 ? r * 0.84 : r, a = (i / 24) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); sombra(ctx, r); ctx.fillStyle = '#FF7A00'; ctx.fill(); sinSombra(ctx);
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
      ctx.font = fuente(800, Math.round(r * 0.5), DISPLAY); ctx.fillText('2x1', 0, -r * 0.18);
      ctx.textAlign = 'left';
      ctx.save(); ctx.translate(0, r * 0.3);
      textosCentrados(ctx, d, r * 1.3, r * 0.34, '#FFFFFF');
      ctx.restore();
    },
    nuevo(ctx, r, d) {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#0E9F6E'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.stroke();
      textosCentrados(ctx, Object.assign({}, d, { arriba: '★ NUEVO ★' }), r * 1.35, r * 0.44, '#FFFFFF');
    },
    ultimas(ctx, r, d) {
      ctx.rotate(0.05);
      const w = r * 2.3, h = r * 1.3;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.12);
      sombra(ctx, r); ctx.fillStyle = '#17181F'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.035; ctx.strokeStyle = '#FFD23F';
      ctx.beginPath(); ctx.roundRect(-w / 2 + r * 0.08, -h / 2 + r * 0.08, w - r * 0.16, h - r * 0.16, r * 0.08); ctx.stroke();
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'ÚLTIMAS UNIDADES' }), w * 0.82, r * 0.44, '#FFD23F');
    },
    estrella(ctx, r, d) {
      ctx.rotate(-0.14);
      ctx.beginPath();
      for (let i = 0; i < 32; i++) { const rr = i % 2 ? r * 0.9 : r, a = (i / 32) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); sombra(ctx, r); ctx.fillStyle = '#FFD23F'; ctx.fill(); sinSombra(ctx);
      textosCentrados(ctx, d, r * 1.5, r * 0.44, TINTA);
    },
    etiqueta(ctx, r, d) {
      ctx.rotate(-0.12);
      const w = r * 2.2, h = r * 1.1, x = -w / 2 + r * 0.12, y = -h / 2, punta = r * 0.42;
      // hilo
      ctx.strokeStyle = '#5B4A33'; ctx.lineWidth = r * 0.025;
      ctx.beginPath(); ctx.moveTo(x + punta * 0.75, 0); ctx.bezierCurveTo(x - r * 0.2, -r * 0.2, x - r * 0.3, -r * 0.9, x + r * 0.2, -r * 1.05); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + punta, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + punta, y + h); ctx.lineTo(x, 0); ctx.closePath();
      sombra(ctx, r); ctx.fillStyle = '#F4E3C3'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.03; ctx.strokeStyle = '#B48A4A'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x + punta * 0.75, 0, r * 0.07, 0, Math.PI * 2); ctx.fillStyle = '#5B4A33'; ctx.fill();
      ctx.save(); ctx.translate(x + punta + (w - punta) / 2, 0);
      textosCentrados(ctx, d, (w - punta) * 0.86, r * 0.48, '#2A1F12');
      ctx.restore();
    },
    oferta(ctx, r, d, o) {
      ctx.rotate(-0.1);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#E2232E'; ctx.fill(); sinSombra(ctx);
      ctx.setLineDash([r * 0.06, r * 0.05]); ctx.lineWidth = r * 0.025; ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      textosCentrados(ctx, Object.assign({}, d, { arriba: o.texto || 'OFERTA' }), r * 1.35, r * 0.44, '#FFFFFF');
    },
    circulo(ctx, r, d, o) {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      sombra(ctx, r); ctx.fillStyle = '#FFFFFF'; ctx.fill(); sinSombra(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.fillStyle = o.color || '#1C5BB8'; ctx.fill();
      textosCentrados(ctx, d, r * 1.35, r * 0.44, '#FFFFFF');
    },
    cartel(ctx, r, d) {
      ctx.rotate(0.06);
      const w = r * 2.2, h = r * 1.25;
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
      sombra(ctx, r); ctx.fillStyle = '#FFE600'; ctx.fill(); sinSombra(ctx);
      ctx.lineWidth = r * 0.045; ctx.strokeStyle = TINTA; ctx.strokeRect(-w / 2 + r * 0.07, -h / 2 + r * 0.07, w - r * 0.14, h - r * 0.14);
      // cinta adhesiva
      [[-w / 2 + r * 0.05, -0.5], [w / 2 - r * 0.05, 0.5]].forEach((c) => {
        ctx.save(); ctx.translate(c[0], -h / 2); ctx.rotate(c[1]);
        ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillRect(-r * 0.26, -r * 0.08, r * 0.52, r * 0.16); ctx.restore();
      });
      textosCentrados(ctx, Object.assign({}, d, { arriba: 'HOY' }), w * 0.82, r * 0.5, TINTA);
    },
    burbuja(ctx, r, d, o) {
      const w = r * 2.3, h = r * 1.2, x = -w / 2, y = -h / 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r * 0.3);
      ctx.moveTo(x + w * 0.22, y + h - 2); ctx.lineTo(x + w * 0.08, y + h + r * 0.38); ctx.lineTo(x + w * 0.42, y + h - 2);
      sombra(ctx, r); ctx.fillStyle = '#FFFFFF'; ctx.fill(); sinSombra(ctx);
      textosCentrados(ctx, Object.assign({}, d, { arriba: '¡Solo!' }), w * 0.84, r * 0.5, o.color || '#1C5BB8');
    },
    neon(ctx, r, d) {
      const w = r * 2.4, h = r * 1.0;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = '#1B0B2E'; ctx.fill();
      ctx.shadowColor = '#FF3EA5'; ctx.shadowBlur = r * 0.18;
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = '#FF5BB5'; ctx.stroke(); ctx.stroke();
      sinSombra(ctx);
      textosCentrados(ctx, d, w * 0.8, r * 0.52, '#FFFFFF', { brillo: '#FF3EA5' });
    }
  };

  /* ---------- fondos ---------- */
  // Números "al azar" pero siempre iguales, para que la imagen no cambie cada vez
  function azar(semilla) { let x = semilla || 7; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  function degrade(ctx, W, H, a, b, angulo) {
    const g = angulo === 'radial' ? ctx.createRadialGradient(W / 2, H * 0.42, W * 0.1, W / 2, H * 0.5, H * 0.75) : ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function mezclar(hex, otro, t) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(otro.slice(1), 16);
    const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
  }
  /* ---------- escenas: lo de atrás desenfocado y una superficie nítida adelante ---------- */
  function rect(ctx, x, y, w, h, c, rad) { ctx.fillStyle = c; ctx.beginPath(); if (rad) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h); ctx.fill(); }
  function brillo(ctx, x, y, rad, c) { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  function bokeh(ctx, W, H, r, n, colores, y0, y1, rmin, rmax, alfa) {
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = y0 * H + r() * (y1 - y0) * H, rad = (rmin + r() * (rmax - rmin)) * W;
      ctx.globalAlpha = alfa * (0.5 + r() * 0.5); ctx.fillStyle = colores[Math.floor(r() * colores.length)];
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function vertical(ctx, x0, y0, x1, y1, paradas) { const g = ctx.createLinearGradient(x0, y0, x1, y1); paradas.forEach((p) => g.addColorStop(p[0], p[1])); return g; }
  function azulejos(ctx, W, H, y0, y1, aw, ah, base, junta) {
    rect(ctx, 0, y0, W, y1 - y0, base);
    ctx.strokeStyle = junta; ctx.lineWidth = Math.max(1, W * 0.003);
    for (let y = y0, fila = 0; y < y1; y += ah, fila++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (fila % 2) * aw / 2; x < W; x += aw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y + ah, y1)); ctx.stroke(); }
    }
  }
  function ventana(ctx, x, y, w, h, marco) {
    ctx.fillStyle = vertical(ctx, 0, y, 0, y + h, [[0, '#FFFFFF'], [1, '#EAF4FF']]); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = marco; ctx.lineWidth = w * 0.06; ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.lineWidth = w * 0.035; ctx.stroke();
  }
  function planta(ctx, x, y, s, c) {
    rect(ctx, x - s * 0.35, y - s * 0.5, s * 0.7, s * 0.55, '#C9B79C', s * 0.06);
    ctx.fillStyle = c;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; ctx.save(); ctx.translate(x, y - s * 0.5); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.13, s * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function frascos(ctx, x, y, W, r) {
    const cs = ['#E9D8B8', '#C8D6C1', '#E3C1A0', '#F2E6CF', '#B9C9D6'];
    let xx = x;
    for (let i = 0; i < 5; i++) { const w = W * (0.06 + r() * 0.04), h = W * (0.09 + r() * 0.08); rect(ctx, xx, y - h, w, h, cs[i], w * 0.2); rect(ctx, xx + w * 0.15, y - h - w * 0.15, w * 0.7, w * 0.18, '#8C7B66', w * 0.05); xx += w + W * 0.02; }
  }
  function marmol(ctx, x, y, w, h, base, veta, r) {
    rect(ctx, x, y, w, h, base);
    ctx.strokeStyle = veta; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = w * (0.002 + r() * 0.004); ctx.globalAlpha = 0.25 + r() * 0.35;
      ctx.beginPath(); let px = x + r() * w, py = y; ctx.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.3) * w * 0.22; py += h / 6; ctx.quadraticCurveTo(px + (r() - 0.5) * w * 0.1, py - h / 12, px, py); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function vetasMadera(ctx, x, y, w, h, base, oscura, r, horizontal) {
    rect(ctx, x, y, w, h, base);
    const n = horizontal ? 5 : 6;
    for (let i = 0; i < n; i++) {
      if (horizontal) { const yy = y + (h / n) * i; ctx.fillStyle = 'rgba(0,0,0,' + (0.03 + r() * 0.07) + ')'; ctx.fillRect(x, yy, w, h / n); ctx.fillStyle = 'rgba(40,20,5,.35)'; ctx.fillRect(x, yy, w, Math.max(1, h * 0.006)); }
      for (let v = 0; v < 6; v++) {
        ctx.strokeStyle = oscura; ctx.globalAlpha = 0.15 + r() * 0.2; ctx.lineWidth = Math.max(1, w * (0.001 + r() * 0.002));
        ctx.beginPath();
        const base0 = horizontal ? y + (h / n) * i + r() * (h / n) : x + r() * w, amp = (horizontal ? h : w) * 0.006, fase = r() * 6;
        for (let t = 0; t <= 1.001; t += 0.05) { const a = horizontal ? x + t * w : base0 + Math.sin(t * 9 + fase) * amp, b = horizontal ? base0 + Math.sin(t * 7 + fase) * amp : y + t * h; ctx.lineTo(a, b); }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function borde(ctx, W, y, alto, c) { rect(ctx, 0, y, W, alto, c); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, y, W, Math.max(1, alto * 0.12)); }
  function sombraPared(ctx, W, H, y) { ctx.fillStyle = vertical(ctx, 0, y - H * 0.05, 0, y, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.18)']]); ctx.fillRect(0, y - H * 0.05, W, H * 0.05); }
  function podio(ctx, W, H, y, ancho, cTapa, cCuerpo) {
    const rx = W * ancho / 2, ry = rx * 0.22;
    ctx.fillStyle = vertical(ctx, W / 2 - rx, 0, W / 2 + rx, 0, [[0, cCuerpo[0]], [0.5, cCuerpo[1]], [1, cCuerpo[0]]]);
    ctx.fillRect(W / 2 - rx, y, rx * 2, H - y);
    ctx.fillStyle = cTapa; ctx.beginPath(); ctx.ellipse(W / 2, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = Math.max(1, W * 0.003); ctx.stroke();
  }
  function bolas(ctx, W, y, r) {
    const cs = ['#C8102E', '#E8B923', '#1E7B3A', '#FFFFFF'];
    ctx.strokeStyle = '#1E5B2E'; ctx.lineWidth = W * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); for (let x = -W * 0.05; x <= W * 1.05; x += W * 0.05) ctx.lineTo(x, y + Math.sin(x / W * 9) * W * 0.012); ctx.stroke();
    for (let i = 0; i < 14; i++) { const x = (i + 0.5) / 14 * W + (r() - 0.5) * W * 0.03, yy = y + Math.sin(x / W * 9) * W * 0.012 + W * 0.02; ctx.fillStyle = cs[i % cs.length]; ctx.beginPath(); ctx.arc(x, yy, W * (0.016 + r() * 0.01), 0, Math.PI * 2); ctx.fill(); }
  }
  function globos(ctx, W, H, r) {
    const cs = ['#FF5C8A', '#FFC93C', '#3EC1D3', '#7C5CFF', '#2ECC71', '#FF8A3D'];
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = H * (0.08 + r() * 0.45), rx = W * (0.07 + r() * 0.04);
      ctx.strokeStyle = 'rgba(80,80,90,.35)'; ctx.lineWidth = Math.max(1, W * 0.002); ctx.beginPath(); ctx.moveTo(x, y + rx * 1.2); ctx.quadraticCurveTo(x + rx * 0.4, y + rx * 2.4, x - rx * 0.2, y + rx * 3.6); ctx.stroke();
      ctx.fillStyle = cs[i % cs.length]; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - rx * 0.45, rx * 0.2, rx * 0.32, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function flores(ctx, W, H, r) {
    const cs = ['#F48FB1', '#F8BBD0', '#CE93D8', '#FFFFFF', '#F06292'];
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = r() * H * 0.9, rad = W * (0.03 + r() * 0.05), c = cs[i % cs.length];
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rad * 0.6, y + Math.sin(a) * rad * 0.6, rad * 0.55, rad * 0.35, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#FFD54F'; ctx.beginPath(); ctx.arc(x, y, rad * 0.25, 0, Math.PI * 2); ctx.fill();
    }
  }
  function estrellas(ctx, W, H, r, n, c) {
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, rad = W * (0.01 + r() * 0.025);
      ctx.fillStyle = c; ctx.globalAlpha = 0.5 + r() * 0.5; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? rad * 0.42 : rad, a = -Math.PI / 2 + k / 10 * Math.PI * 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Cada escena: atras (se desenfoca) y frente (nítido). Medidas relativas a W y H.
  const ESCENAS = {
    tienda: {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#2E7D5B');
        for (let x = 0; x < W; x += W / 8) rect(c, x, 0, W / 16, H * 0.14, '#FFFFFF');
        rect(c, 0, H * 0.14, W, H * 0.02, '#1E5C42');
        bokeh(c, W, H, r, 14, ['#FFE9A8', '#FFFFFF'], 0.2, 0.6, 0.02, 0.06, 0.25);
        rect(c, W * 0.06, H * 0.3, W * 0.22, H * 0.3, '#24664A', W * 0.02); rect(c, W * 0.72, H * 0.3, W * 0.22, H * 0.3, '#24664A', W * 0.02);
      },
      frente(c, W, H) { rect(c, 0, H * 0.78, W, H * 0.22, '#E9E4DA'); podio(c, W, H, H * 0.7, 0.62, '#FFFFFF', ['#E6E2DA', '#FFFFFF']); }
    },
    podio: {
      atras(c, W, H, r) { c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#F7EDE6'], [1, '#E8D5C8']]); c.fillRect(0, 0, W, H); brillo(c, W * 0.5, H * 0.35, W * 0.7, 'rgba(255,255,255,.8)'); },
      frente(c, W, H) { rect(c, 0, H * 0.8, W, H * 0.2, '#E2CDBE'); podio(c, W, H, H * 0.7, 0.66, '#F4E3D7', ['#D9C0AF', '#F2E2D6']); }
    },
    'cocina-marmol': {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#F3EFE8');
        azulejos(c, W, H, H * 0.28, H * 0.7, W * 0.16, W * 0.08, '#FBFAF7', 'rgba(170,165,155,.6)');
        rect(c, W * 0.05, H * 0.25, W * 0.9, H * 0.025, '#D9CDBB'); frascos(c, W * 0.1, H * 0.25, W, r);
        brillo(c, W * 0.85, H * 0.15, W * 0.6, 'rgba(255,250,235,.9)');
        rect(c, W * 0.68, H * 0.5, W * 0.05, H * 0.2, '#B8A38A', W * 0.01);
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.7); marmol(c, 0, H * 0.7, W, H * 0.3, '#F7F6F3', '#9C9A95', r); borde(c, W, H * 0.94, H * 0.06, '#E5E2DC'); }
    },
    'cocina-madera': {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#F1E3CC');
        ventana(c, W * 0.2, H * 0.12, W * 0.6, H * 0.36, '#FFFFFF');
        brillo(c, W * 0.5, H * 0.3, W * 0.8, 'rgba(255,245,215,.85)');
        planta(c, W * 0.15, H * 0.66, W * 0.18, '#5E8C4A'); frascos(c, W * 0.6, H * 0.7, W, r);
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.7); vetasMadera(c, 0, H * 0.7, W, H * 0.3, '#B98552', 'rgba(70,35,12,1)', r, true); borde(c, W, H * 0.7, H * 0.012, '#D9A877'); }
    },
    'cocina-moderna': {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#3A3D42');
        for (let x = W * 0.04; x < W; x += W * 0.32) { rect(c, x, H * 0.05, W * 0.28, H * 0.3, '#2A2C30', W * 0.01); rect(c, x + W * 0.12, H * 0.2, W * 0.04, H * 0.008, '#8A8D92'); }
        for (let i = 0; i < 3; i++) { const x = W * (0.2 + i * 0.3); c.strokeStyle = '#111'; c.lineWidth = W * 0.004; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.4); c.stroke(); brillo(c, x, H * 0.43, W * 0.18, 'rgba(255,200,120,.75)'); rect(c, x - W * 0.04, H * 0.39, W * 0.08, H * 0.03, '#1A1A1A', W * 0.04); }
        azulejos(c, W, H, H * 0.45, H * 0.7, W * 0.1, W * 0.1, '#4A4E55', 'rgba(20,20,25,.5)');
      },
      frente(c, W, H, r) {
        sombraPared(c, W, H, H * 0.7);
        rect(c, 0, H * 0.7, W, H * 0.3, '#24262A');
        for (let i = 0; i < 900; i++) { c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.2)'; c.fillRect(r() * W, H * 0.7 + r() * H * 0.3, W * 0.003, W * 0.003); }
        c.fillStyle = vertical(c, 0, H * 0.7, 0, H * 0.78, [[0, 'rgba(255,220,160,.18)'], [1, 'rgba(255,220,160,0)']]); c.fillRect(0, H * 0.7, W, H * 0.08);
        borde(c, W, H * 0.7, H * 0.01, '#55585E');
      }
    },
    desayuno: {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#EAF0F3');
        ventana(c, W * 0.12, H * 0.08, W * 0.76, H * 0.42, '#F8F8F8');
        rect(c, 0, H * 0.05, W * 0.14, H * 0.55, '#F4D9C6'); rect(c, W * 0.86, H * 0.05, W * 0.14, H * 0.55, '#F4D9C6');
        brillo(c, W * 0.55, H * 0.28, W * 0.9, 'rgba(255,248,225,.9)');
      },
      frente(c, W, H) {
        const y = H * 0.68;
        rect(c, 0, y, W, H - y, '#FFFFFF');
        c.fillStyle = 'rgba(214,72,72,.28)';
        const paso = W * 0.09;
        for (let x = 0; x < W; x += paso * 2) c.fillRect(x, y, paso, H - y);
        for (let yy = y; yy < H; yy += paso * 2) c.fillRect(0, yy, W, paso);
        c.fillStyle = vertical(c, 0, y, 0, y + H * 0.06, [[0, 'rgba(0,0,0,.12)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, y, W, H * 0.06);
      }
    },
    living: {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#C9D3C3');
        rect(c, W * 0.25, H * 0.12, W * 0.32, H * 0.2, '#E8E1D3', W * 0.01); rect(c, W * 0.27, H * 0.135, W * 0.28, H * 0.17, '#B88B6A');
        rect(c, -W * 0.05, H * 0.42, W * 1.1, H * 0.22, '#8E9AA6', W * 0.06); rect(c, W * 0.02, H * 0.36, W * 0.3, H * 0.14, '#A5B0BB', W * 0.05); rect(c, W * 0.68, H * 0.36, W * 0.3, H * 0.14, '#A5B0BB', W * 0.05);
        planta(c, W * 0.9, H * 0.5, W * 0.22, '#4E7A3E');
        brillo(c, W * 0.12, H * 0.3, W * 0.4, 'rgba(255,236,190,.7)');
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.7); vetasMadera(c, 0, H * 0.7, W, H * 0.3, '#D8B98E', 'rgba(90,55,20,1)', r, true); }
    },
    dormitorio: {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#EFE6DD');
        rect(c, W * 0.05, H * 0.18, W * 0.9, H * 0.3, '#C9B49C', W * 0.04);
        rect(c, W * 0.1, H * 0.36, W * 0.36, H * 0.14, '#FFFFFF', W * 0.05); rect(c, W * 0.54, H * 0.36, W * 0.36, H * 0.14, '#FFFFFF', W * 0.05);
        brillo(c, W * 0.92, H * 0.25, W * 0.35, 'rgba(255,214,150,.8)');
      },
      frente(c, W, H, r) {
        const y = H * 0.66;
        c.fillStyle = vertical(c, 0, y, 0, H, [[0, '#FBF9F6'], [1, '#E9E3DA']]); c.fillRect(0, y, W, H - y);
        c.strokeStyle = 'rgba(160,150,135,.25)'; c.lineWidth = W * 0.006;
        for (let i = 0; i < 6; i++) { c.beginPath(); const yy = y + (H - y) * (0.15 + r() * 0.8); c.moveTo(0, yy); c.bezierCurveTo(W * 0.3, yy - H * 0.02, W * 0.6, yy + H * 0.03, W, yy - H * 0.01); c.stroke(); }
      }
    },
    bano: {
      atras(c, W, H, r) {
        azulejos(c, W, H, 0, H * 0.7, W * 0.12, W * 0.12, '#F4F7F8', 'rgba(160,175,180,.6)');
        rect(c, W * 0.2, H * 0.1, W * 0.6, H * 0.4, '#D7E6EC', W * 0.3); brillo(c, W * 0.42, H * 0.25, W * 0.3, 'rgba(255,255,255,.8)');
        planta(c, W * 0.88, H * 0.7, W * 0.16, '#5E9A6A');
        rect(c, W * 0.05, H * 0.6, W * 0.12, H * 0.1, '#BFD8E2', W * 0.015);
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.7); marmol(c, 0, H * 0.7, W, H * 0.3, '#FFFFFF', '#B5BDC2', r); borde(c, W, H * 0.7, H * 0.01, '#E6ECEF'); }
    },
    oficina: {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#DCE3E8');
        for (let k = 0; k < 2; k++) { const y = H * (0.15 + k * 0.18); rect(c, W * 0.55, y, W * 0.4, H * 0.012, '#8C6B4F'); let x = W * 0.57; for (let i = 0; i < 7; i++) { const w = W * (0.025 + r() * 0.02), h = H * (0.06 + r() * 0.05); rect(c, x, y - h, w, h, ['#C0392B', '#2C3E50', '#D4A017', '#16A085', '#7F8C8D'][i % 5]); x += w + W * 0.006; } }
        rect(c, W * 0.08, H * 0.32, W * 0.4, H * 0.24, '#1F2328', W * 0.015); rect(c, W * 0.1, H * 0.335, W * 0.36, H * 0.2, '#4A90C2');
        rect(c, W * 0.26, H * 0.56, W * 0.04, H * 0.1, '#1F2328');
        planta(c, W * 0.85, H * 0.7, W * 0.16, '#3F7A4A');
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.7); vetasMadera(c, 0, H * 0.7, W, H * 0.3, '#6E4B33', 'rgba(20,10,5,1)', r, true); borde(c, W, H * 0.7, H * 0.01, '#8A6447'); }
    },
    jardin: {
      atras(c, W, H, r) {
        c.fillStyle = vertical(c, 0, 0, 0, H * 0.7, [[0, '#9ED3F5'], [1, '#E4F4FB']]); c.fillRect(0, 0, W, H * 0.7);
        bokeh(c, W, H, r, 30, ['#4F8F3A', '#6FAF4A', '#3C7A2E', '#88C057'], 0.05, 0.62, 0.06, 0.16, 0.9);
        brillo(c, W * 0.8, H * 0.1, W * 0.5, 'rgba(255,250,220,.8)');
      },
      frente(c, W, H, r) {
        c.fillStyle = vertical(c, 0, H * 0.7, 0, H, [[0, '#6FAE45'], [1, '#3F7F2A']]); c.fillRect(0, H * 0.7, W, H * 0.3);
        c.strokeStyle = 'rgba(30,70,20,.5)'; c.lineWidth = Math.max(1, W * 0.003);
        for (let i = 0; i < 500; i++) { const x = r() * W, y = H * 0.7 + r() * H * 0.3, h = H * (0.008 + r() * 0.015); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * W * 0.01, y - h); c.stroke(); }
      }
    },
    'nav-luces': {
      atras(c, W, H, r) { rect(c, 0, 0, W, H, '#2A1810'); bokeh(c, W, H, r, 45, ['#FFC861', '#FFE3A3', '#FF9E4A', '#FFFFFF'], 0, 0.75, 0.02, 0.07, 0.8); },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.72); vetasMadera(c, 0, H * 0.72, W, H * 0.28, '#5A3A22', 'rgba(15,8,2,1)', r, true); c.fillStyle = 'rgba(255,190,90,.12)'; c.fillRect(0, H * 0.72, W, H * 0.05); }
    },
    'nav-rojo': {
      atras(c, W, H, r) {
        c.fillStyle = vertical(c, 0, 0, W * 0.4, H, [[0, '#B3122E'], [1, '#5E0716']]); c.fillRect(0, 0, W, H);
        bokeh(c, W, H, r, 35, ['#F5C542', '#FFE08A', '#FFFFFF'], 0, 1, 0.01, 0.05, 0.6);
        brillo(c, W * 0.5, H * 0.45, W * 0.7, 'rgba(255,215,120,.25)');
      },
      frente() {}
    },
    'nav-nieve': {
      atras(c, W, H, r) {
        c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#2D4A7A'], [1, '#9DB8D9']]); c.fillRect(0, 0, W, H);
        c.fillStyle = '#1F3B2E'; for (let i = 0; i < 5; i++) { const x = W * (0.05 + i * 0.23), h = H * (0.18 + r() * 0.08), b = H * 0.68; c.beginPath(); c.moveTo(x, b - h); c.lineTo(x - W * 0.09, b); c.lineTo(x + W * 0.09, b); c.closePath(); c.fill(); }
        bokeh(c, W, H, r, 60, ['#FFFFFF'], 0, 0.9, 0.004, 0.012, 0.9);
      },
      frente(c, W, H, r) {
        c.fillStyle = '#F4F8FC'; c.beginPath(); c.moveTo(0, H * 0.78); c.quadraticCurveTo(W * 0.5, H * 0.72, W, H * 0.8); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
        podio(c, W, H, H * 0.7, 0.6, '#FFFFFF', ['#DCE6F0', '#FFFFFF']);
        bokeh(c, W, H, r, 25, ['#FFFFFF'], 0, 0.65, 0.003, 0.007, 0.9);
      }
    },
    'nav-verde': {
      atras(c, W, H, r) { c.fillStyle = vertical(c, 0, 0, W * 0.3, H, [[0, '#1E6B3A'], [1, '#0B3A1E']]); c.fillRect(0, 0, W, H); estrellas(c, W, H, r, 40, '#E8C15A'); brillo(c, W * 0.5, H * 0.45, W * 0.7, 'rgba(255,230,150,.18)'); },
      frente() {}
    },
    'nav-mesa': {
      atras(c, W, H, r) {
        rect(c, 0, 0, W, H, '#3B2418');
        bokeh(c, W, H, r, 30, ['#FFC861', '#FF6B6B', '#7ED957', '#FFFFFF'], 0, 0.6, 0.02, 0.05, 0.7);
        c.fillStyle = '#1E5B2E'; c.beginPath(); c.moveTo(W * 0.82, H * 0.08); c.lineTo(W * 0.62, H * 0.6); c.lineTo(W * 1.02, H * 0.6); c.closePath(); c.fill();
      },
      frente(c, W, H, r) { vetasMadera(c, 0, H * 0.7, W, H * 0.3, '#8A5A35', 'rgba(40,20,5,1)', r, true); bolas(c, W, H * 0.69, r); }
    },
    'anio-nuevo': {
      atras(c, W, H, r) {
        c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#0B1430'], [1, '#1E2A55']]); c.fillRect(0, 0, W, H);
        bokeh(c, W, H, r, 40, ['#E8C15A', '#FFE7A0', '#FFFFFF'], 0, 1, 0.006, 0.04, 0.7);
        estrellas(c, W, H, r, 18, '#FFE7A0');
      },
      frente() {}
    },
    'dia-madre': {
      atras(c, W, H, r) { c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#FDE4EC'], [1, '#F8BBD0']]); c.fillRect(0, 0, W, H); flores(c, W, H, r); brillo(c, W * 0.5, H * 0.45, W * 0.6, 'rgba(255,255,255,.6)'); },
      frente() {}
    },
    'dia-padre': {
      atras(c, W, H, r) {
        c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#1E3A5F'], [1, '#0F1F35']]); c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = W * 0.02;
        for (let x = -H; x < W + H; x += W * 0.12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); }
        brillo(c, W * 0.5, H * 0.35, W * 0.6, 'rgba(255,210,140,.25)');
      },
      frente(c, W, H, r) { sombraPared(c, W, H, H * 0.72); vetasMadera(c, 0, H * 0.72, W, H * 0.28, '#4A3022', 'rgba(10,5,2,1)', r, true); }
    },
    'dia-nino': {
      atras(c, W, H, r) { c.fillStyle = vertical(c, 0, 0, 0, H, [[0, '#BFE9FF'], [1, '#FFF6D6']]); c.fillRect(0, 0, W, H); globos(c, W, H, r); },
      frente(c, W, H, r) { const cs = ['#FF5C8A', '#FFC93C', '#3EC1D3', '#7C5CFF']; for (let i = 0; i < 60; i++) { c.fillStyle = cs[i % 4]; c.save(); c.translate(r() * W, H * (0.75 + r() * 0.25)); c.rotate(r() * 3); c.fillRect(-W * 0.01, -W * 0.004, W * 0.02, W * 0.008); c.restore(); } }
    }
  };

  const cacheEscenas = new Map();
  function dibujarEscena(ctx, W, H, id) {
    const clave = id + '|' + W + 'x' + H;
    let lista = cacheEscenas.get(clave);
    if (!lista) {
      const e = ESCENAS[id];
      const atras = document.createElement('canvas'); atras.width = W; atras.height = H;
      e.atras(atras.getContext('2d'), W, H, azar(7));
      lista = document.createElement('canvas'); lista.width = W; lista.height = H;
      const c = lista.getContext('2d');
      const blur = Math.max(1, Math.round(W * 0.012));
      c.filter = 'blur(' + blur + 'px)'; c.drawImage(atras, -blur * 2, -blur * 2, W + blur * 4, H + blur * 4); c.filter = 'none';
      e.frente(c, W, H, azar(11));
      if (cacheEscenas.size > 6) cacheEscenas.delete(cacheEscenas.keys().next().value);
      cacheEscenas.set(clave, lista);
    }
    ctx.drawImage(lista, 0, 0, W, H);
  }

  function dibujarFondo(ctx, W, H, id, img, color) {
    const r = azar(42);
    if (ESCENAS[id]) { dibujarEscena(ctx, W, H, id); return; }
    switch (id) {
      case 'estudio': degrade(ctx, W, H, '#FFFFFF', '#DCD7CF', 'radial'); break;
      case 'marca': degrade(ctx, W, H, mezclar(color, '#FFFFFF', 0.25), mezclar(color, '#000000', 0.35)); break;
      case 'atardecer': degrade(ctx, W, H, '#FF9A5A', '#E0306E'); break;
      case 'oceano': degrade(ctx, W, H, '#43C6DB', '#1D4E9E'); break;
      case 'violeta': degrade(ctx, W, H, '#B06AF7', '#3B1A9C'); break;
      case 'noche': degrade(ctx, W, H, '#2C3E57', '#0B0F1A'); break;
      case 'lunares': {
        ctx.fillStyle = '#FCE4EC'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#F48FB1';
        const paso = 90;
        for (let y = 0; y < H + paso; y += paso) for (let x = (y / paso) % 2 ? paso / 2 : 0; x < W + paso; x += paso) { ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'rayas': {
        ctx.fillStyle = '#FFF4D6'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#FFC93C';
        for (let x = -H * 1.5; x < H * 1.5; x += 120) ctx.fillRect(x, -H * 1.5, 50, H * 3);
        ctx.restore();
        break;
      }
      case 'madera': {
        degrade(ctx, W, H, '#B9824F', '#8A5A33');
        const tabla = 216;
        for (let x = 0; x < W; x += tabla) {
          ctx.fillStyle = 'rgba(0,0,0,' + (0.04 + r() * 0.08) + ')'; ctx.fillRect(x, 0, tabla, H);
          ctx.strokeStyle = 'rgba(60,30,10,.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
          for (let v = 0; v < 9; v++) {
            const x0 = x + 14 + r() * (tabla - 28), amp = 4 + r() * 10, fase = r() * 6;
            ctx.strokeStyle = 'rgba(70,35,12,' + (0.12 + r() * 0.2) + ')'; ctx.lineWidth = 1.5 + r() * 2.5;
            ctx.beginPath();
            for (let y = 0; y <= H; y += 24) ctx.lineTo(x0 + Math.sin(y / (90 + v * 13) + fase) * amp, y);
            ctx.stroke();
          }
        }
        break;
      }
      case 'kraft': {
        ctx.fillStyle = '#C9A57A'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = r() > 0.5 ? 'rgba(90,60,30,.18)' : 'rgba(255,240,215,.22)';
          ctx.fillRect(r() * W, r() * H, 1.5 + r() * 3, 1.5 + r() * 3);
        }
        break;
      }
      case 'confeti': {
        ctx.fillStyle = '#FFFDF7'; ctx.fillRect(0, 0, W, H);
        const cs = ['#FF5C8A', '#FFC93C', '#3EC1D3', '#7C5CFF', '#2ECC71', '#FF8A3D'];
        for (let i = 0; i < 260; i++) {
          ctx.save(); ctx.translate(r() * W, r() * H); ctx.rotate(r() * Math.PI);
          ctx.fillStyle = cs[Math.floor(r() * cs.length)];
          if (r() > 0.5) ctx.fillRect(-12, -5, 24, 10); else { ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        break;
      }
      default: {
        ctx.fillStyle = '#2A2A33'; ctx.fillRect(0, 0, W, H);
        if (img) { ctx.save(); ctx.filter = 'blur(44px) brightness(.8) saturate(1.1)'; cubrir(ctx, img, -90, -90, W + 180, H + 180); ctx.restore(); }
      }
    }
  }

  function letra(id) { return LETRAS.find((l) => l.id === id) || LETRAS[0]; }

  // Logo y/o nombre del negocio: primero se mide, después se dibuja centrado en (cx, cy)
  function medirMarca(ctx, op, alto) {
    const conLogo = op.logo && (op.logo.naturalWidth || op.logo.width);
    const conNombre = op.mostrarNegocio && op.negocio;
    if (!conLogo && !conNombre) return null;
    if (!conLogo) {
      const px = alto * 0.42;
      ctx.font = fuente(700, px, CUERPO);
      return { w: ctx.measureText(op.negocio).width + px * 1.4, h: px * 1.95, px: px, logo: false };
    }
    const lw = op.logo.naturalWidth || op.logo.width, lh = op.logo.naturalHeight || op.logo.height;
    const wl = Math.min(alto * 3.2, alto * 0.78 * lw / lh);
    const pad = alto * 0.11, px = alto * 0.3;
    let w = wl + pad * 2;
    if (conNombre) { ctx.font = fuente(800, px, CUERPO); w += ctx.measureText(op.negocio).width + pad * 1.3; }
    return { w: w, h: alto, px: px, logo: true, wl: wl, hl: wl * lh / lw, pad: pad, nombre: conNombre };
  }
  function dibujarMarca(ctx, op, m, cx, cy, u) {
    const x = cx - m.w / 2, y = cy - m.h / 2;
    if (!m.logo) {
      ctx.fillStyle = op.color || '#1C5BB8'; ctx.beginPath(); ctx.roundRect(x, y, m.w, m.h, m.h / 2); ctx.fill();
      ctx.font = fuente(700, m.px, CUERPO);
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(op.negocio, x + m.px * 0.7, y + m.h / 2 + 1); ctx.textBaseline = 'alphabetic';
      return;
    }
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18 * u; ctx.shadowOffsetY = 4 * u;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x, y, m.w, m.h, m.h * 0.22); ctx.fill(); ctx.restore();
    ctx.drawImage(op.logo, x + m.pad, y + (m.h - m.hl) / 2, m.wl, m.hl);
    if (m.nombre) { ctx.font = fuente(800, m.px, CUERPO); ctx.fillStyle = TINTA; ctx.textBaseline = 'middle'; ctx.fillText(op.negocio, x + m.pad * 2.3 + m.wl, y + m.h / 2 + 1); ctx.textBaseline = 'alphabetic'; }
  }

  /* ---------- composición completa ---------- */
  /*
    La imagen sale del MISMO tamaño (proporción) que la foto original;
    el lado más corto mide 1080 px.

    datos = { foto (Image), recorte (Image), recorteCaja ({x,y,w,h} en 0..1), nombre, precio, codigo }
    op = {
      estilo, posicion, negocio, mostrarNegocio, color, fondo, letra, logo (Image),
      modoFondo: 'original' | 'retrato' | 'diseno',
      capas: { precio: {x, y, escala}, nombre: {...}, marca: {...} }   (x, y = centro en 0..1)
      escalaVista: 1 (0.5 para la vista previa, más liviana)
    }
    Devuelve un canvas con canvas.cajas = { precio, nombre, marca } -> {cx, cy, w, h}
    (para saber qué elemento tocó el dedo) y canvas.capas con las posiciones usadas.
  */
  function tamanoSalida(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    let W, H;
    if (iw >= ih) { H = 1080; W = Math.round(1080 * iw / ih); }
    else { W = 1080; H = Math.round(1080 * ih / iw); }
    const s = Math.min(1, 2160 / W, 2700 / H);
    return { W: Math.round(W * s), H: Math.round(H * s) };
  }

  // La foto con su fondo (lo más pesado) se guarda para no rehacerla mientras se arrastra
  let baseGuardada = { clave: '', canvas: null };
  function capaBase(datos, op, W, H, u) {
    const modo = op.modoFondo || (op.recortado ? 'diseno' : 'original');
    const recorte = datos.recorte;
    const fotoId = (datos.foto.src || '').length + ':' + (datos.foto.src || '').slice(-32);
    const clave = [fotoId, W, H, modo, modo === 'diseno' ? op.fondo + op.color : '', recorte ? (recorte.src || '').length : 0].join('|');
    if (baseGuardada.clave === clave) return baseGuardada.canvas;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = datos.foto;
    if (modo === 'diseno' && recorte) {
      dibujarFondo(ctx, W, H, op.fondo, img, op.color || '#1C5BB8');
      const rw = recorte.naturalWidth || recorte.width, rh = recorte.naturalHeight || recorte.height;
      const sup = fondoInfo(op.fondo).sup;
      let s, py;
      if (sup) {
        // se apoya sobre la mesada / el podio
        const piso0 = H * (sup + 0.05);
        s = Math.min(W * 0.56 / rw, (piso0 - H * 0.18) / rh, H * 0.48 / rh);
        py = piso0 - rh * s;
      } else {
        s = Math.min(W * 0.8 / rw, H * 0.66 / rh);
        py = (H - rh * s) / 2 + H * 0.02;
      }
      const pw = rw * s, ph = rh * s;
      const px = (W - pw) / 2;
      const piso = py + ph;
      const g = ctx.createRadialGradient(W / 2, piso, 10 * u, W / 2, piso, pw * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(W / 2, piso); ctx.scale(1, 0.13); ctx.translate(-W / 2, -piso);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, piso, pw * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 36 * u; ctx.shadowOffsetY = 18 * u;
      ctx.drawImage(recorte, px, py, pw, ph); ctx.restore();
    } else if (modo === 'retrato' && recorte && datos.recorteCaja) {
      // Modo retrato: la misma foto desenfocada atrás y el producto nítido en su lugar
      const k = datos.recorteCaja;
      ctx.save(); ctx.filter = 'blur(' + Math.round(Math.min(W, H) * 0.022) + 'px) saturate(1.05)';
      ctx.drawImage(img, -W * 0.03, -H * 0.03, W * 1.06, H * 1.06); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(recorte, k.x * W, k.y * H, k.w * W, k.h * H);
    } else {
      ctx.drawImage(img, 0, 0, W, H);
    }
    baseGuardada = { clave: clave, canvas: c };
    return c;
  }

  function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function componer(datos, op) {
    const img = datos.foto;
    const t = tamanoSalida(img);
    const ev = op.escalaVista || 1;
    const W = Math.round(t.W * ev), H = Math.round(t.H * ev);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const color = op.color || '#1C5BB8';
    const estilo = op.estilo || 'estrella';
    const pos = POSICIONES.indexOf(op.posicion) >= 0 ? op.posicion : 'abajo-der';
    const izquierda = pos.indexOf('izq') > 0;
    const abajo = pos.indexOf('abajo') === 0;
    const fuenteNombre = letra(op.letra);
    const u = Math.min(W, H) / 1080;
    const alargada = H / W > 1.45;
    const mx = Math.round(W * 0.05);
    const myArr = Math.round(alargada ? H * 0.1 : H * 0.05);
    const myAba = Math.round(alargada ? H * 0.11 : H * 0.05);
    const capas = op.capas || {};
    const escala = (k) => limitar(Number(capas[k] && capas[k].escala) || 1, 0.4, 2.6);
    const cajas = {};
    const usadas = {};

    // 1) Foto (original, retrato o recortada sobre un diseño)
    ctx.drawImage(capaBase(datos, op, W, H, u), 0, 0);

    const precio = precioTexto(datos.precio, datos.moneda);
    const detalle = String(datos.detalle || '');
    const codigo = datos.codigo ? 'Cód. ' + datos.codigo : '';
    const nombre = fuenteNombre.mayus ? String(datos.nombre || '').toUpperCase() : String(datos.nombre || '');
    const familiaN = fuenteNombre.familia + ', ' + DISPLAY;

    // Ubica un elemento: usa la posición guardada o la de fábrica, y lo mantiene dentro de la imagen
    function ubicar(clave, w, h, cxFabrica, cyFabrica) {
      const cp = capas[clave];
      let cx = cp && isFinite(cp.x) ? cp.x * W : cxFabrica;
      let cy = cp && isFinite(cp.y) ? cp.y * H : cyFabrica;
      cx = limitar(cx, Math.min(w / 2, W / 2), Math.max(W - w / 2, W / 2));
      cy = limitar(cy, Math.min(h / 2, H / 2), Math.max(H - h / 2, H / 2));
      cajas[clave] = { cx: cx, cy: cy, w: w, h: h };
      usadas[clave] = { x: cx / W, y: cy / H, escala: escala(clave) };
      return { cx: cx, cy: cy };
    }

    // 2) Logo y/o nombre del negocio
    const marca = medirMarca(ctx, op, (op.logo ? 130 : 84) * u * escala('marca'));
    let pMarca = null;
    if (marca) pMarca = ubicar('marca', marca.w, marca.h, mx + marca.w / 2, myArr + marca.h / 2);

    // 3) Estilo "banda": franja abajo con nombre y precio (se agrandan con los tamaños, no se mueven)
    if (estilo === 'banda') {
      const pxN = Math.round(56 * u * fuenteNombre.escala * escala('nombre'));
      ctx.font = fuente(fuenteNombre.peso, pxN, familiaN);
      const ls = nombre ? lineas(ctx, nombre, W - mx * 2, 2) : [];
      const pxP = ajustar(ctx, precio, 800, DISPLAY, W - mx * 2, 150 * u * escala('precio'));
      const pxD = Math.round(pxN * 0.62);
      const altoBanda = myAba + pxP * 1.05 + ls.length * pxN * 1.12 + (detalle ? pxD * 1.3 : 0) + (codigo ? 50 * u : 0) + 70 * u;
      const g = ctx.createLinearGradient(0, H - altoBanda - 80 * u, 0, H);
      g.addColorStop(0, 'rgba(10,10,20,0)'); g.addColorStop(0.3, 'rgba(10,10,20,.75)'); g.addColorStop(1, 'rgba(10,10,20,.92)');
      ctx.fillStyle = g; ctx.fillRect(0, H - altoBanda - 80 * u, W, altoBanda + 80 * u);
      let y = H - myAba;
      if (codigo) { ctx.font = fuente(700, 36 * u, CUERPO); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(codigo, mx, y); y -= 50 * u; }
      ctx.font = fuente(800, pxP, DISPLAY); ctx.fillStyle = '#FFD23F'; ctx.fillText(precio, mx - 4 * u, y);
      y -= pxP * 0.95;
      if (detalle) { ctx.font = fuente(700, pxD, CUERPO); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(detalle, mx, y); y -= pxD * 1.3; }
      ctx.fillStyle = '#fff'; ctx.font = fuente(fuenteNombre.peso, pxN, familiaN);
      for (let i = ls.length - 1; i >= 0; i--) { ctx.fillText(ls[i], mx, y); y -= pxN * 1.12; }
      if (marca) dibujarMarca(ctx, op, marca, pMarca.cx, pMarca.cy, u);
      c.cajas = cajas; c.capas = usadas;
      return c;
    }

    // 4) Medidas del sticker de precio
    const info = ESTILOS.find((e) => e.id === estilo) || ESTILOS[0];
    const r = Math.round(215 * u * escala('precio'));
    const medio = info.ancho * r;
    const cxP = izquierda ? mx + medio * 0.95 : W - mx - medio * 0.95;
    const cyP = abajo ? H - myAba - r * 0.95 : myArr + (marca ? marca.h : 0) + r * 1.05;

    // 5) Nombre del producto en etiqueta blanca
    if (nombre) {
      const px = Math.round(52 * u * fuenteNombre.escala * escala('nombre'));
      ctx.font = fuente(fuenteNombre.peso, px, familiaN);
      const grande = escala('nombre') > 1.15;
      const anchoMax = W * (grande ? 0.9 : 0.82);
      const anchoTexto = Math.min(anchoMax, Math.max(W * 0.42, abajo && !capas.nombre ? W - mx * 2 - medio * 2 - 20 * u : anchoMax)) - px * 1.2;
      const ls = lineas(ctx, nombre, Math.max(px * 3, anchoTexto), grande ? 3 : 2);
      const pxD = Math.round(px * 0.66);
      let anchoTextos = Math.max.apply(null, ls.map((l) => ctx.measureText(l).width));
      if (detalle) { ctx.font = fuente(700, pxD, CUERPO); anchoTextos = Math.max(anchoTextos, ctx.measureText(detalle).width); ctx.font = fuente(fuenteNombre.peso, px, familiaN); }
      const altoCaja = ls.length * px * 1.1 + px * 0.95 + (detalle ? pxD * 1.25 : 0);
      const anchoCaja = anchoTextos + px * 1.2;
      const xFab = abajo && izquierda ? W - mx - anchoCaja / 2 : mx + anchoCaja / 2;
      // si el nombre es tan ancho que choca con el sticker, va arriba del precio
      const choca = abajo && anchoCaja > W - mx * 2 - medio * 2;
      const yFab = choca ? cyP - r * 1.15 - altoCaja / 2 : H - myAba - altoCaja / 2;
      const p = ubicar('nombre', anchoCaja, altoCaja, choca ? W / 2 : xFab, yFab);
      const x = p.cx - anchoCaja / 2, y = p.cy - altoCaja / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18 * u; ctx.shadowOffsetY = 4 * u;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x, y, anchoCaja, altoCaja, 24 * u * escala('nombre')); ctx.fill(); ctx.restore();
      ctx.font = fuente(fuenteNombre.peso, px, familiaN);
      ctx.fillStyle = TINTA;
      ls.forEach((l, i) => ctx.fillText(l, x + px * 0.6, y + px * 0.42 + px * (i + 1) * 1.04));
      if (detalle) { ctx.font = fuente(700, pxD, CUERPO); ctx.fillStyle = 'rgba(23,23,29,.68)'; ctx.fillText(detalle, x + px * 0.6, y + px * 0.42 + px * ls.length * 1.04 + pxD * 1.25); }
    }

    if (marca) dibujarMarca(ctx, op, marca, pMarca.cx, pMarca.cy, u);

    // 6) Sticker de precio (arriba de todo)
    const pP = ubicar('precio', medio * 2.1, r * 2.1, cxP, cyP);
    ctx.save(); ctx.translate(pP.cx, pP.cy);
    dibujantes[estilo](ctx, r, { precio: precio, abajo: codigo }, { color: color });
    ctx.restore();

    c.cajas = cajas; c.capas = usadas;
    return c;
  }

  // Miniatura de un estilo para el selector
  function miniatura(estilo, precio, color) {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 240;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 240, 240);
    g.addColorStop(0, '#D9D4CB'); g.addColorStop(1, '#B9B2A6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 240, 240);
    if (estilo === 'banda') {
      ctx.fillStyle = 'rgba(10,10,20,.85)'; ctx.fillRect(0, 140, 240, 100);
      ctx.fillStyle = '#fff'; ctx.font = fuente(800, 22, DISPLAY); ctx.fillText('Producto', 16, 172);
      const px = ajustar(ctx, pesos(precio), 800, DISPLAY, 208, 46);
      ctx.fillStyle = '#FFD23F'; ctx.font = fuente(800, px, DISPLAY); ctx.fillText(pesos(precio), 14, 220);
      return c;
    }
    const info = ESTILOS.find((e) => e.id === estilo) || ESTILOS[0];
    const r = 100 / Math.max(1, info.ancho * 1.08);
    ctx.save(); ctx.translate(120, 124);
    dibujantes[estilo](ctx, r, { precio: pesos(precio), abajo: '' }, { color: color });
    ctx.restore();
    return c;
  }

  function miniaturaFondo(id, color, img, recorte) {
    const c = document.createElement('canvas');
    c.width = 180; c.height = 320;
    const ctx = c.getContext('2d');
    if (ESCENAS[id]) dibujarFondo(ctx, 180, 320, id, img, color || '#1C5BB8');
    else { ctx.save(); ctx.scale(180 / 1080, 320 / 1920); dibujarFondo(ctx, 1080, 1920, id, img, color || '#1C5BB8'); ctx.restore(); }
    const sup = fondoInfo(id).sup;
    if (recorte) {
      const rw = recorte.naturalWidth || recorte.width, rh = recorte.naturalHeight || recorte.height;
      const s = Math.min(130 / rw, (sup ? 320 * (sup + 0.05) - 40 : 200) / rh, 190 / rh);
      const y = sup ? 320 * (sup + 0.05) - rh * s : 50 + (200 - rh * s) / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      ctx.drawImage(recorte, (180 - rw * s) / 2, y, rw * s, rh * s); ctx.restore();
      return c;
    }
    if (sup) {
      // muestra: una "taza" sobre la superficie
      const y = 320 * (sup + 0.05);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(90, y, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(62, y - 66, 56, 66, 8); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(120, y - 36, 14, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      return c;
    }
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(22, 70, 136, 150, 12); ctx.fill();
    if (img) { ctx.save(); ctx.beginPath(); ctx.roundRect(28, 76, 124, 138, 9); ctx.clip(); cubrir(ctx, img, 28, 76, 124, 138); ctx.restore(); }
    return c;
  }

  function aBlob(canvas) {
    return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/jpeg', 0.92));
  }

  let fuentesListas = null;
  function prepararFuentes() {
    if (!fuentesListas) {
      const cargas = [document.fonts.load('800 90px "Bricolage Grotesque"'), document.fonts.load('800 40px Figtree'), document.fonts.load('700 40px Figtree')]
        .concat(LETRAS.map((l) => document.fonts.load(l.peso + ' 60px ' + l.familia)));
      // Si alguna letra tarda (señal débil), no frena la app más de 4 segundos
      fuentesListas = Promise.race([Promise.all(cargas.map((p) => p.catch(() => null))), new Promise((ok) => setTimeout(ok, 4000))]);
    }
    return fuentesListas;
  }

  return { ESTILOS: ESTILOS, POSICIONES: POSICIONES, LETRAS: LETRAS, FONDOS: FONDOS, componer: componer, tamanoSalida: tamanoSalida, miniatura: miniatura, miniaturaFondo: miniaturaFondo, aBlob: aBlob, prepararFuentes: prepararFuentes, pesos: pesos, GRUPOS: GRUPOS, GRUPOS_FONDO: GRUPOS_FONDO, precioTexto: precioTexto };
})();
