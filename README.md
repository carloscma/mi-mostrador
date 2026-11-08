# Mostrador

App para vendedores: **sacás la foto, ponés nombre y precio, elegís un sticker y la compartís en tus redes.** Cada foto queda guardada y arma sola tu catálogo, donde tus clientes hacen el pedido por WhatsApp.

## Qué hace
1. **Sacar foto** (o elegir de la galería).
2. Escribís **nombre** y **precio** (ej: "Vasos de vidrio x 6" · $5.000).
3. Decorás la imagen con tres pestañas:
   - **Sticker:** 8 estilos para el precio (Estrella, Etiqueta, Oferta, Círculo, Cartel, Globo, Neón, Banda). "Mover sticker" lo cambia de esquina.
   - **Quitar fondo:** en la pestaña Fondo, el botón "Quitar fondo" recorta el producto automáticamente y lo pone sobre el diseño elegido, con sombra. Corre en el celular (placa gráfica), sin internet y sin mandar la foto a ningún lado. "Volver a la foto" lo deshace.
   - **Fondo:** 12 diseños alrededor de la foto (Foto desenfocada, Estudio, Tu color, Atardecer, Océano, Violeta, Noche, Lunares, Rayas, Madera, Kraft, Confeti).
   - **Letra:** 6 tipos de letra para el nombre (Moderna, Impacto, Manuscrita, Elegante, Redonda, Marcador).
   - En **Ajustes** subís el **logo** de tu negocio y aparece en todas las imágenes.
4. Tocás **Compartir**, elegís las redes (estado de WhatsApp, historia o publicación de Instagram, Facebook, Marketplace, TikTok) y la app te lleva **red por red**: cada una con la imagen en el tamaño justo y el texto ya copiado.
5. El producto queda en **Tus productos** y en tu **catálogo**. Si te equivocaste o cambia el precio: "Editar esta publicación" al terminar, o tocás el producto en "Tus productos".

## Ponerla en internet (para usarla desde el celular)
La cámara y el botón Compartir solo funcionan en páginas con https. Google Drive no sirve porque ya no muestra páginas web. Lo más simple es Netlify (gratis):

1. Creá una cuenta gratis en https://www.netlify.com (podés entrar con tu cuenta de Google).
2. Entrá a https://app.netlify.com/drop
3. Arrastrá la carpeta **`dist`** (está dentro de esta carpeta) al recuadro.
4. Te da un link tipo `https://algo.netlify.app`. Abrilo en el celular.
5. Para tenerla como app: en Chrome (Android) o Safari (iPhone) tocá el menú → **"Agregar a la pantalla de inicio"**.

Para actualizarla: en Netlify, entrá a tu sitio → **Deploys** → arrastrá la carpeta `dist` nueva.

## Editar el código en VS Code
- Abrí esta carpeta en VS Code y abrí `index.html` con **Live Server** para verla en la compu.
- Después de cambiar algo, corré `node build.js` para armar de nuevo la carpeta `dist`.

```
index.html            Página principal
css/app.css           Diseño
js/stickers.js        Los 8 stickers y cómo se arma la imagen  <- para agregar estilos
js/app.js             Pantallas: inicio, editor, compartir, catálogo, ajustes
js/almacen.js         Guarda los productos en el celular
js/recorte.js         Quitar fondo: motor propio con WebGL2
modelo/recorte.json   Modelo de recorte U²-Net-p (Apache 2.0), pesos en float16
js/fotos-demo.js      Foto de ejemplo (la taza)
manifest.webmanifest  Nombre e ícono de la app instalada
sw.js                 Permite instalarla y abrirla con poca señal
build.js              Arma la carpeta dist/
```

## Sobre el recorte
- Modelo: U²-Net "p" (Qin et al., licencia Apache 2.0), apto para uso comercial. Pesa 3 MB y se descarga una sola vez.
- Funciona mejor con el producto entero, centrado y con algo de contraste con el fondo. Con fondos muy cargados puede dejar partes de más o de menos.
- Necesita un celular con WebGL2 (la gran mayoría de los Android y iPhone de los últimos años). Si no lo tiene, la app avisa.

## Limitaciones de esta versión
- Los productos se guardan **en el celular** donde los cargás. Si cambiás de celular o borrás los datos del navegador, se pierden. El catálogo que ven tus clientes por el link todavía no muestra tus productos: eso necesita la versión con cuentas (base de datos).
- Compartir abre el menú del celular: la red la elegís vos en ese menú (las apps no pueden elegirla solas).
- Marketplace no recibe imágenes compartidas: la app te deja la imagen guardada y el texto copiado para pegar.
