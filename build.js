// Arma la carpeta dist/ lista para subir a internet (Netlify u otro).
// index.html queda con el CSS y el JS adentro; se copian manifest, sw e íconos.
// Uso: node build.js
const fs = require('fs');
const path = require('path');
const raiz = __dirname;
const dist = path.join(raiz, 'dist');
let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, a) => '<style>\n' + fs.readFileSync(path.join(raiz, a), 'utf8') + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, a) => '<script>\n' + fs.readFileSync(path.join(raiz, a), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'iconos'), { recursive: true });
fs.mkdirSync(path.join(dist, 'modelo'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);
['manifest.webmanifest', 'sw.js', 'iconos/icono-192.png', 'iconos/icono-512.png', 'modelo/recorte.json'].forEach((a) => fs.copyFileSync(path.join(raiz, a), path.join(dist, a)));
console.log('Listo: carpeta dist/ (' + Math.round(html.length / 1024) + ' KB)');
