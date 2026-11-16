// Cloudflare Pages Function: /logo?c=alias devuelve el logo del negocio como imagen
// (en la base está guardado como texto "data:image/png;base64,..."). Lo usa la vista previa de los links.
const SUPABASE = 'https://ytogtvfafvgwbylpguev.supabase.co';
const CLAVE = 'sb_publishable_IfkGVmdzOE2Q3AOfgTOoew_rpzNULYM'; // clave pública (la misma que usa la app)

async function datosCatalogo(alias, supabase) {
  const url = new URL((supabase || SUPABASE) + '/rest/v1/rpc/catalogo_publico');
  url.searchParams.set('p_alias', alias);
  const r = await fetch(url.toString(), {
    headers: { apikey: CLAVE, Authorization: 'Bearer ' + CLAVE, Accept: 'application/json' },
    signal: AbortSignal.timeout(3500),
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d && d.negocio ? d : null;
}

export async function onRequestGet(ctx) {
  try {
    const url = new URL(ctx.request.url);
    const alias = url.searchParams.get('c');
    if (!alias) return new Response('Falta el negocio', { status: 400 });
    const d = await datosCatalogo(alias, ctx.env && ctx.env.SUPABASE_URL);
    const m = d && typeof d.negocio.logo === 'string' && d.negocio.logo.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!m) return Response.redirect(url.origin + '/og.jpg', 302);
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, { headers: { 'content-type': m[1], 'cache-control': 'public, max-age=3600' } });
  } catch (e) {
    return new Response('No se pudo cargar el logo', { status: 500 });
  }
}
