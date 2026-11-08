/*
  Recorte automático del producto (quitar el fondo de la foto).

  Usa el modelo U²-Net "p" (licencia Apache 2.0), que detecta el objeto
  principal de la foto. Corre en la placa gráfica del celular con WebGL2,
  sin servidor y sin mandar la foto a ningún lado.

  Archivo: modelo/recorte.json (las operaciones y los pesos en float16/base64).
  Uso:  const mascara = await RECORTE.recortar(imagen)  -> canvas con transparencia
*/
window.RECORTE = (function () {
  'use strict';

  let motor = null;      // se crea la primera vez
  let preparando = null;

  /* ---------------- WebGL2 ---------------- */
  const VERT = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  // Cada tensor (canales x alto x ancho) se guarda en una textura RGBA:
  // 4 canales por píxel, y los grupos de 4 canales apilados hacia abajo.
  // Cada tensor (canales x alto x ancho) se guarda en una textura RGBA:
  // 4 canales por píxel; los grupos de 4 canales se ordenan en una grilla
  // de "tx" columnas para no pasarse del tamaño máximo de textura.
  const COMUN = `#version 300 es
precision highp float; precision highp int;
out vec4 color;
ivec2 pos(int g, int x, int y, int W, int H, int tx){ return ivec2((g % tx) * W + x, (g / tx) * H + y); }
`;
  const DESCODIFICAR = `
  ivec2 c = ivec2(gl_FragCoord.xy);
  int tX = c.x / outW, tY = c.y / outH;
  int g = tY * outTx + tX, x = c.x - tX * outW, y = c.y - tY * outH;
  if (g >= outG) { color = vec4(0.); return; }
`;
  const FRAG = {
    conv: COMUN + `
uniform sampler2D uIn, uW, uB; uniform int inH, inW, inG, inTx, outH, outW, outTx, outG, k, pad, dil, relu, wAncho;
void main(){` + DESCODIFICAR + `
  vec4 s = texelFetch(uB, ivec2(g, 0), 0);
  for (int gi = 0; gi < inG; gi++) {
    for (int ky = 0; ky < k; ky++) {
      int iy = y - pad + ky * dil;
      if (iy < 0 || iy >= inH) continue;
      for (int kx = 0; kx < k; kx++) {
        int ix = x - pad + kx * dil;
        if (ix < 0 || ix >= inW) continue;
        vec4 v = texelFetch(uIn, pos(gi, ix, iy, inW, inH, inTx), 0);
        int idx = (((g * inG + gi) * k + ky) * k + kx) * 4;
        int fy = idx / wAncho, fx = idx - fy * wAncho;
        s.x += dot(texelFetch(uW, ivec2(fx, fy), 0), v);
        s.y += dot(texelFetch(uW, ivec2(fx + 1, fy), 0), v);
        s.z += dot(texelFetch(uW, ivec2(fx + 2, fy), 0), v);
        s.w += dot(texelFetch(uW, ivec2(fx + 3, fy), 0), v);
      }
    }
  }
  color = relu == 1 ? max(s, 0.) : s;
}`,
    maxpool: COMUN + `
uniform sampler2D uIn; uniform int inH, inW, inTx, outH, outW, outTx, outG;
void main(){` + DESCODIFICAR + `
  vec4 m = vec4(-1e30);
  for (int dy = 0; dy < 2; dy++) for (int dx = 0; dx < 2; dx++) {
    int iy = y * 2 + dy, ix = x * 2 + dx;
    if (iy < inH && ix < inW) m = max(m, texelFetch(uIn, pos(g, ix, iy, inW, inH, inTx), 0));
  }
  color = m;
}`,
    resize: COMUN + `
uniform sampler2D uIn; uniform int inH, inW, inTx, outH, outW, outTx, outG;
float fuente(int d, int ent, int sal){ if (sal == 1) return 0.; return clamp((float(d) + .5) * float(ent) / float(sal) - .5, 0., float(ent - 1)); }
void main(){` + DESCODIFICAR + `
  float sy = fuente(y, inH, outH), sx = fuente(x, inW, outW);
  int y0 = int(floor(sy)), x0 = int(floor(sx));
  int y1 = min(y0 + 1, inH - 1), x1 = min(x0 + 1, inW - 1);
  float fy = sy - float(y0), fx = sx - float(x0);
  vec4 a = mix(texelFetch(uIn, pos(g, x0, y0, inW, inH, inTx), 0), texelFetch(uIn, pos(g, x1, y0, inW, inH, inTx), 0), fx);
  vec4 d = mix(texelFetch(uIn, pos(g, x0, y1, inW, inH, inTx), 0), texelFetch(uIn, pos(g, x1, y1, inW, inH, inTx), 0), fx);
  color = mix(a, d, fy);
}`,
    add: COMUN + `
uniform sampler2D uA, uB2;
void main(){ ivec2 c = ivec2(gl_FragCoord.xy); color = texelFetch(uA, c, 0) + texelFetch(uB2, c, 0); }`,
    concat: COMUN + `
uniform sampler2D uA, uB2; uniform int outH, outW, outTx, outG, cA, cB, aTx, bTx;
float canal(int ch, int x, int y){
  if (ch < cA) { vec4 v = texelFetch(uA, pos(ch / 4, x, y, outW, outH, aTx), 0); return v[ch % 4]; }
  ch -= cA;
  if (ch < cB) { vec4 v = texelFetch(uB2, pos(ch / 4, x, y, outW, outH, bTx), 0); return v[ch % 4]; }
  return 0.;
}
void main(){` + DESCODIFICAR + `
  color = vec4(canal(g * 4, x, y), canal(g * 4 + 1, x, y), canal(g * 4 + 2, x, y), canal(g * 4 + 3, x, y));
}`,
    sigmoid: COMUN + `
uniform sampler2D uIn;
void main(){ float v = texelFetch(uIn, ivec2(gl_FragCoord.xy), 0).x; float s = 1. / (1. + exp(-v)); color = vec4(s, s, s, 1.); }`
  };

  function compilar(gl, fuente) {
    const sh = (tipo, src) => {
      const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fuente));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  // Convierte float16 (Uint16) a float32
  function f16a32(h) {
    const out = new Float32Array(h.length);
    for (let i = 0; i < h.length; i++) {
      const x = h[i], s = x & 0x8000 ? -1 : 1, e = (x >> 10) & 0x1f, m = x & 0x3ff;
      out[i] = e === 0 ? s * Math.pow(2, -14) * (m / 1024) : e === 31 ? (m ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + m / 1024);
    }
    return out;
  }

  async function crearMotor(base) {
    const lienzo = document.createElement('canvas');
    const gl = lienzo.getContext('webgl2', { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('sin-webgl2');
    const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    if (!ext) throw new Error('sin-float');

    const plan = await fetch(base + 'recorte.json').then((r) => { if (!r.ok) throw new Error('modelo'); return r.json(); });
    // los pesos vienen en float16, codificados en base64 dentro del mismo archivo
    const bin = atob(plan.pesosB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    delete plan.pesosB64;
    const pesos = f16a32(new Uint16Array(bytes.buffer));

    const progs = {};
    Object.keys(FRAG).forEach((k) => { progs[k] = compilar(gl, FRAG[k]); });

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    function textura(ancho, alto, formato, datos) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (formato === '8') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ancho, alto, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      else if (formato === '32') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ancho, alto, 0, gl.RGBA, gl.FLOAT, datos || null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, ancho, alto, 0, gl.RGBA, gl.HALF_FLOAT, null);
      return t;
    }

    // Pesos de cada convolución en texturas de 4 canales: por cada
    // (grupo salida, grupo entrada, ky, kx) van 4 texeles (uno por canal de salida).
    const ANCHO_W = 2048;
    const convs = plan.plan.filter((p) => p.op === 'conv').map((p) => {
      const [o, ci, k] = p.wForma;
      const go = Math.ceil(o / 4), gi = Math.ceil(ci / 4);
      const n = go * gi * k * k * 4;
      const alto = Math.ceil(n / ANCHO_W);
      const w = new Float32Array(ANCHO_W * alto * 4);
      const [off] = plan.pesos[p.w];
      for (let oc = 0; oc < o; oc++) for (let ic = 0; ic < ci; ic++) for (let ky = 0; ky < k; ky++) for (let kx = 0; kx < k; kx++) {
        const idx = ((((oc >> 2) * gi + (ic >> 2)) * k + ky) * k + kx) * 4 + (oc & 3);
        w[idx * 4 + (ic & 3)] = pesos[off + ((oc * ci + ic) * k + ky) * k + kx];
      }
      const b = new Float32Array(go * 4);
      if (p.b) { const [ob] = plan.pesos[p.b]; for (let oc = 0; oc < o; oc++) b[oc] = pesos[ob + oc]; }
      p.texW = textura(ANCHO_W, alto, '32', w);
      p.texB = textura(go, 1, '32', b);
      return p;
    });
    if (!convs.length) throw new Error('modelo');

    const fb = gl.createFramebuffer();
    const grupos = (c) => Math.ceil(c / 4);
    const columnas = (c) => Math.ceil(Math.sqrt(grupos(c)));
    const filas = (c) => Math.ceil(grupos(c) / columnas(c));

    // Espera a que la placa gráfica termine lo pedido, sin trabar la pantalla
    function esperarGPU() {
      const f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      return new Promise((ok) => {
        const mirar = () => {
          const r = gl.clientWaitSync(f, 0, 0);
          if (r === gl.TIMEOUT_EXPIRED) setTimeout(mirar, 4);
          else { gl.deleteSync(f); ok(); }
        };
        mirar();
      });
    }

    async function ejecutar(entradaRGBA) {
      const T = plan.tensores;
      const vivos = {};
      const usos = {};
      plan.plan.forEach((p) => p.ent.forEach((e) => { usos[e] = (usos[e] || 0) + 1; }));
      const ent = T[plan.entrada];
      vivos[plan.entrada] = textura(ent.w, ent.h, '32', entradaRGBA);

      function salida(nombre, formato) {
        const t = T[nombre];
        const tex = textura(t.w * columnas(t.c), t.h * filas(t.c), formato);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.viewport(0, 0, t.w * columnas(t.c), t.h * filas(t.c));
        vivos[nombre] = tex;
        return t;
      }
      function usar(prog) { gl.useProgram(prog.p); return prog.u; }
      function tex(unidad, uniforme, t) { gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(uniforme, unidad); }
      function datosSalida(u, t) {
        gl.uniform1i(u.outH, t.h); gl.uniform1i(u.outW, t.w); gl.uniform1i(u.outTx, columnas(t.c)); gl.uniform1i(u.outG, grupos(t.c));
      }
      function soltar(nombre) {
        usos[nombre]--;
        if (usos[nombre] <= 0 && vivos[nombre]) { gl.deleteTexture(vivos[nombre]); delete vivos[nombre]; }
      }

      let hechos = 0;
      for (const p of plan.plan) {
        if (++hechos % 6 === 0) await esperarGPU();
        const a = T[p.ent[0]];
        let u;
        if (p.op === 'conv') {
          const s = salida(p.sal, '16');
          u = usar(progs.conv);
          tex(0, u.uIn, vivos[p.ent[0]]); tex(1, u.uW, p.texW); tex(2, u.uB, p.texB);
          gl.uniform1i(u.inH, a.h); gl.uniform1i(u.inW, a.w); gl.uniform1i(u.inG, grupos(a.c)); gl.uniform1i(u.inTx, columnas(a.c));
          datosSalida(u, s);
          gl.uniform1i(u.k, p.k); gl.uniform1i(u.pad, p.pad); gl.uniform1i(u.dil, p.dil);
          gl.uniform1i(u.relu, p.relu ? 1 : 0); gl.uniform1i(u.wAncho, ANCHO_W);
        } else if (p.op === 'maxpool' || p.op === 'resize') {
          const s = salida(p.sal, '16');
          u = usar(progs[p.op]);
          tex(0, u.uIn, vivos[p.ent[0]]);
          gl.uniform1i(u.inH, a.h); gl.uniform1i(u.inW, a.w); gl.uniform1i(u.inTx, columnas(a.c));
          datosSalida(u, s);
        } else if (p.op === 'add') {
          salida(p.sal, '16');
          u = usar(progs.add);
          tex(0, u.uA, vivos[p.ent[0]]); tex(1, u.uB2, vivos[p.ent[1]]);
        } else if (p.op === 'concat') {
          let actual = p.ent[0], cAct = a.c;
          for (let i = 1; i < p.ent.length; i++) {
            const b = T[p.ent[i]];
            const ultimo = i === p.ent.length - 1;
            const nombre = ultimo ? p.sal : p.sal + '~' + i;
            if (!ultimo) { T[nombre] = { c: cAct + b.c, h: a.h, w: a.w }; usos[nombre] = 1; }
            const s = salida(nombre, '16');
            u = usar(progs.concat);
            tex(0, u.uA, vivos[actual]); tex(1, u.uB2, vivos[p.ent[i]]);
            datosSalida(u, s);
            gl.uniform1i(u.cA, cAct); gl.uniform1i(u.cB, b.c); gl.uniform1i(u.aTx, columnas(cAct)); gl.uniform1i(u.bTx, columnas(b.c));
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (i > 1) soltar(actual);
            actual = nombre; cAct += b.c;
          }
          p.ent.forEach(soltar);
          continue;
        } else if (p.op === 'sigmoid') {
          salida(p.sal, '8');
          u = usar(progs.sigmoid);
          tex(0, u.uIn, vivos[p.ent[0]]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        p.ent.forEach(soltar);
      }
      await esperarGPU();

      const fin = T[plan.salida];
      const px = new Uint8Array(fin.w * fin.h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vivos[plan.salida], 0);
      gl.readPixels(0, 0, fin.w, fin.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      Object.keys(vivos).forEach((k) => gl.deleteTexture(vivos[k]));
      return { datos: px, ancho: fin.w, alto: fin.h };
    }

    return { ejecutar: ejecutar, tam: plan.tam };
  }

  function preparar(base) {
    if (!preparando) {
      preparando = crearMotor(base || 'modelo/').then((m) => { motor = m; return m; })
        .catch((e) => { preparando = null; throw e; });
    }
    return preparando;
  }

  /* ---------------- Recortar una foto ---------------- */
  // Entrada del modelo: 320x320, normalizada como en el entrenamiento
  function entradaModelo(img, tam) {
    const c = document.createElement('canvas');
    c.width = tam; c.height = tam;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, tam, tam);
    const d = ctx.getImageData(0, 0, tam, tam).data;
    const out = new Float32Array(tam * tam * 4);
    const media = [0.485, 0.456, 0.406];
    for (let i = 0; i < tam * tam; i++) {
      for (let k = 0; k < 3; k++) out[i * 4 + k] = (d[i * 4 + k] / 255 - media[k]) / 0.226;
    }
    return out;
  }

  // Suaviza la máscara siguiendo los bordes de la foto (filtro guiado)
  function cajas(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let s = 0; const f = y * w;
      for (let x = -r; x <= r; x++) s += src[f + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[f + x] = s;
        s += src[f + Math.min(w - 1, x + r + 1)] - src[f + Math.max(0, x - r)];
      }
    }
    const n = (2 * r + 1) * (2 * r + 1);
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = s / n;
        s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }
  function filtroGuiado(I, p, w, h, r, eps) {
    const mI = cajas(I, w, h, r), mp = cajas(p, w, h, r);
    const Ip = new Float32Array(w * h), II = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
    const mIp = cajas(Ip, w, h, r), mII = cajas(II, w, h, r);
    const a = new Float32Array(w * h), b = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const cov = mIp[i] - mI[i] * mp[i], vari = mII[i] - mI[i] * mI[i];
      a[i] = cov / (vari + eps); b[i] = mp[i] - a[i] * mI[i];
    }
    const ma = cajas(a, w, h, r), mb = cajas(b, w, h, r);
    const q = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }

  /*
    Devuelve { imagen: canvas con el producto recortado (fondo transparente,
    ajustado al contorno del producto), cobertura: qué parte de la foto ocupa }
  */
  async function recortar(img) {
    const m = await preparar();
    const t0 = performance.now();
    const r = await m.ejecutar(entradaModelo(img, m.tam));

    // máscara 320x320 -> tamaño de trabajo (hasta 1024 px)
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(1, 1024 / Math.max(iw, ih));
    const W = Math.round(iw * s), H = Math.round(ih * s);
    const cm = document.createElement('canvas'); cm.width = r.ancho; cm.height = r.alto;
    const id = cm.getContext('2d', { willReadFrequently: true }).createImageData(r.ancho, r.alto);
    // la fila 0 de la textura es la fila de arriba de la foto (así se cargó)
    id.data.set(r.datos);
    cm.getContext('2d').putImageData(id, 0, 0);

    const grande = document.createElement('canvas'); grande.width = W; grande.height = H;
    const g = grande.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(cm, 0, 0, W, H);
    const mascara = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H);
    g.drawImage(img, 0, 0, W, H);
    const foto = g.getImageData(0, 0, W, H);

    const p = new Float32Array(W * H), I = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      p[i] = mascara[i * 4] / 255;
      I[i] = (foto.data[i * 4] * 0.299 + foto.data[i * 4 + 1] * 0.587 + foto.data[i * 4 + 2] * 0.114) / 255;
    }
    const q = filtroGuiado(I, p, W, H, Math.max(2, Math.round(W / 160)), 1e-3);

    // alfa final: bordes suaves y fondo bien limpio
    let x0 = W, y0 = H, x1 = 0, y1 = 0, suma = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let a = (q[i] - 0.12) / 0.66;
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      a = a * a * (3 - 2 * a);
      foto.data[i * 4 + 3] = Math.round(a * 255);
      if (a > 0.25) { suma++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const cobertura = suma / (W * H);
    if (cobertura < 0.01) throw new Error('sin-objeto');
    g.putImageData(foto, 0, 0);

    // recortar al contorno del producto, con un pequeño margen
    const mg = Math.round(Math.max(W, H) * 0.02);
    x0 = Math.max(0, x0 - mg); y0 = Math.max(0, y0 - mg); x1 = Math.min(W - 1, x1 + mg); y1 = Math.min(H - 1, y1 + mg);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(grande, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    // caja = dónde está el recorte dentro de la foto (en proporción), para el modo retrato
    return { imagen: out, cobertura: cobertura, caja: { x: x0 / W, y: y0 / H, w: out.width / W, h: out.height / H }, ms: Math.round(performance.now() - t0) };
  }

  function disponible() {
    try { const c = document.createElement('canvas').getContext('webgl2'); return !!(c && (c.getExtension('EXT_color_buffer_float') || c.getExtension('EXT_color_buffer_half_float'))); } catch (e) { return false; }
  }

  async function cruda(img) { const m = await preparar(); return await m.ejecutar(entradaModelo(img, m.tam)); }

  return { preparar: preparar, recortar: recortar, cruda: cruda, disponible: disponible, get listo() { return !!motor; } };
})();
