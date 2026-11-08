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
    { id: 'estrella', nombre: 'Estrella', ancho: 1 },
    { id: 'etiqueta', nombre: 'Etiqueta', ancho: 1.15 },
    { id: 'oferta', nombre: 'Oferta', ancho: 1 },
    { id: 'circulo', nombre: 'Círculo', ancho: 1 },
    { id: 'cartel', nombre: 'Cartel', ancho: 1.15 },
    { id: 'burbuja', nombre: 'Globo', ancho: 1.2 },
    { id: 'neon', nombre: 'Neón', ancho: 1.25 },
    { id: 'banda', nombre: 'Banda', ancho: 0 }
  ];
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
    { id: 'desenfocado', nombre: 'Foto' },
    { id: 'estudio', nombre: 'Estudio' },
    { id: 'marca', nombre: 'Tu color' },
    { id: 'atardecer', nombre: 'Atardecer' },
    { id: 'oceano', nombre: 'Océano' },
    { id: 'violeta', nombre: 'Violeta' },
    { id: 'noche', nombre: 'Noche' },
    { id: 'lunares', nombre: 'Lunares' },
    { id: 'rayas', nombre: 'Rayas' },
    { id: 'madera', nombre: 'Madera' },
    { id: 'kraft', nombre: 'Kraft' },
    { id: 'confeti', nombre: 'Confeti' }
  ];

  const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

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
    if (arriba) { ctx.font = fuente(800, arriba, CUERPO); y += arriba; ctx.fillText(d.arriba, 0, y); y += arriba * 0.25; }
    ctx.font = fuente(800, px, DISPLAY); y += px * 0.78; ctx.fillText(d.precio, 0, y);
    if (abajo) { ctx.font = fuente(700, abajo, CUERPO); y += abajo * 1.55; ctx.fillText(d.abajo, 0, y); }
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left';
  }

  function sombra(ctx, r) { ctx.shadowColor = 'rgba(0,0,0,.33)'; ctx.shadowBlur = r * 0.12; ctx.shadowOffsetY = r * 0.035; }
  function sinSombra(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  /* ---------- los estilos ---------- */
  const dibujantes = {
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
  function dibujarFondo(ctx, W, H, id, img, color) {
    const r = azar(42);
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
      const s = Math.min(W * 0.8 / rw, H * 0.66 / rh);
      const pw = rw * s, ph = rh * s;
      const px = (W - pw) / 2, py = (H - ph) / 2 + H * 0.02;
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

    const precio = pesos(datos.precio);
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
      const altoBanda = myAba + pxP * 1.05 + ls.length * pxN * 1.12 + (codigo ? 50 * u : 0) + 70 * u;
      const g = ctx.createLinearGradient(0, H - altoBanda - 80 * u, 0, H);
      g.addColorStop(0, 'rgba(10,10,20,0)'); g.addColorStop(0.3, 'rgba(10,10,20,.75)'); g.addColorStop(1, 'rgba(10,10,20,.92)');
      ctx.fillStyle = g; ctx.fillRect(0, H - altoBanda - 80 * u, W, altoBanda + 80 * u);
      let y = H - myAba;
      if (codigo) { ctx.font = fuente(700, 36 * u, CUERPO); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(codigo, mx, y); y -= 50 * u; }
      ctx.font = fuente(800, pxP, DISPLAY); ctx.fillStyle = '#FFD23F'; ctx.fillText(precio, mx - 4 * u, y);
      y -= pxP * 0.95;
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
      const altoCaja = ls.length * px * 1.1 + px * 0.95;
      const anchoCaja = Math.max.apply(null, ls.map((l) => ctx.measureText(l).width)) + px * 1.2;
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
    ctx.save(); ctx.scale(180 / 1080, 320 / 1920);
    dibujarFondo(ctx, 1080, 1920, id, img, color || '#1C5BB8');
    ctx.restore();
    if (recorte) {
      const rw = recorte.naturalWidth || recorte.width, rh = recorte.naturalHeight || recorte.height;
      const s = Math.min(150 / rw, 200 / rh);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      ctx.drawImage(recorte, (180 - rw * s) / 2, 50 + (200 - rh * s) / 2, rw * s, rh * s); ctx.restore();
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

  return { ESTILOS: ESTILOS, POSICIONES: POSICIONES, LETRAS: LETRAS, FONDOS: FONDOS, componer: componer, tamanoSalida: tamanoSalida, miniatura: miniatura, miniaturaFondo: miniaturaFondo, aBlob: aBlob, prepararFuentes: prepararFuentes, pesos: pesos };
})();
