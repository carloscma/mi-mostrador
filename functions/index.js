// Cloudflare Pages Function: vista previa de los links del catálogo.
// Cuando WhatsApp, Facebook, LinkedIn, etc. leen un link como https://mi-mostrador.pages.dev/?c=alias
// les devolvemos la página con el nombre del negocio y una foto de sus productos.
// A las personas les llega la página de siempre, sin tocar nada.

const SUPABASE = 'https://ytogtvfafvgwbylpguev.supabase.co';
const CLAVE = 'sb_publishable_IfkGVmdzOE2Q3AOfgTOoew_rpzNULYM'; // clave pública (la misma que usa la app)
const ROBOTS = /facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|linkedinbot|twitterbot|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|applebot|googlebot|bingbot|embedly|iframely|vkshare|viber|snapchat|instagram|mastodon/i;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function datosCatalogo(alias, vendedor, supabase, pedir) {
  const url = new URL((supabase || SUPABASE) + '/rest/v1/rpc/catalogo_publico');
  url.searchParams.set('p_alias', alias);
  if (vendedor) url.searchParams.set('p_vendedor', vendedor);
  const r = await (pedir || fetch)(url.toString(), {
    headers: { apikey: CLAVE, Authorization: 'Bearer ' + CLAVE, Accept: 'application/json' },
    signal: AbortSignal.timeout(3500),
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d && d.negocio ? d : null;
}

function etiquetas(d, pagina, supabase) {
  const nombre = (d.negocio.nombre || 'Catálogo').trim();
  const prods = d.productos || [];
  const n = prods.length;
  const conFoto = prods.find((p) => p.datos && (p.datos.mini || p.datos.foto));
  const foto = conFoto ? (supabase || SUPABASE) + '/storage/v1/object/public/fotos/' + (conFoto.datos.mini || conFoto.datos.foto) : null;
  const titulo = nombre + ' · Catálogo';
  const desc = n
    ? n + (n === 1 ? ' producto' : ' productos') + ' con foto y precio. Elegí lo que te guste y hacé tu pedido por WhatsApp.'
    : 'Mirá el catálogo y hacé tu pedido por WhatsApp.';
  return [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + esc(nombre) + '">',
    '<meta property="og:locale" content="es_AR">',
    '<meta property="og:title" content="' + esc(titulo) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(pagina) + '">',
    foto
      ? '<meta property="og:image" content="' + esc(foto) + '">\n  <meta property="og:image:alt" content="' + esc(nombre) + '">\n  <meta name="twitter:card" content="summary">'
      : '<meta property="og:image" content="https://mi-mostrador.pages.dev/og.jpg">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:card" content="summary_large_image">'
  ].join('\n  ') + '\n  <title>' + esc(titulo) + '</title>\n  <meta name="description" content="' + esc(desc) + '">';
}

export async function onRequestGet(ctx) {
  const res = await ctx.next();
  try {
    const url = new URL(ctx.request.url);
    const alias = url.searchParams.get('c');
    const ua = ctx.request.headers.get('user-agent') || '';
    if (!alias || !(ROBOTS.test(ua) || url.searchParams.has('vista-previa'))) return res;
    const tipo = res.headers.get('content-type') || '';
    if (!res.ok || !tipo.includes('text/html')) return res;
    const d = await datosCatalogo(alias, url.searchParams.get('v'), ctx.env && ctx.env.SUPABASE_URL);
    if (!d) return res;
    let html = await res.text();
    html = html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, '<!--og-->\n  ' + etiquetas(d, url.toString(), ctx.env && ctx.env.SUPABASE_URL) + '\n  <!--/og-->')
      .replace(/<title>Mostrador<\/title>/, '')
      .replace(/<meta name="description" content="Sacá la foto[^"]*">/, '');
    const h = new Headers(res.headers);
    h.delete('content-length');
    h.set('cache-control', 'public, max-age=300');
    return new Response(html, { status: 200, headers: h });
  } catch (e) {
    return res; // ante cualquier problema, la página de siempre
  }
}
