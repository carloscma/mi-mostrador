/*
  Términos y condiciones, política de privacidad y botones de arrepentimiento y baja.
  Los datos del responsable (nombre, correo, lugar, CUIT, WhatsApp) los carga el administrador
  desde su panel y se leen de internet: así se pueden cambiar sin tocar este archivo.
  Versión de los textos: cambiarla cuando se modifiquen (queda registrada al crear cada cuenta).
*/
window.LEGAL = (function () {
  'use strict';
  const VERSION = '2026-11-12';
  const FECHA = '12 de noviembre de 2026';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const falta = (t) => '<mark class="falta-dato">' + esc(t) + ' (a completar)</mark>';

  function contacto(d) {
    const partes = [];
    if (d.correo) partes.push('por correo a <a href="mailto:' + esc(d.correo) + '">' + esc(d.correo) + '</a>');
    if (d.whatsapp) partes.push('por WhatsApp al <a href="https://wa.me/' + esc(d.whatsapp) + '" target="_blank" rel="noopener">+' + esc(d.whatsapp) + '</a>');
    return partes.length ? partes.join(' o ') : falta('correo o WhatsApp de contacto');
  }
  function responsable(d) {
    return (d.responsable ? '<b>' + esc(d.responsable) + '</b>' : falta('nombre del responsable')) +
      (d.cuit ? ', CUIT ' + esc(d.cuit) : '') + (d.lugar ? ', con domicilio en ' + esc(d.lugar) : '');
  }

  function terminos(d) {
    return '<h1>Términos y condiciones de uso</h1><p class="legal-fecha">Última actualización: ' + FECHA + '</p>' +
      '<p>Estos términos explican las reglas para usar Mostrador. Al crear tu cuenta, confirmás que los leíste y que los aceptás. Si no estás de acuerdo, no uses el servicio.</p>' +

      '<h2>1. Qué es Mostrador</h2>' +
      '<p>Mostrador es una aplicación web para que comercios y vendedores preparen fotos de sus productos con precio, las compartan en redes y tengan un catálogo con link para recibir pedidos por WhatsApp. El servicio lo presta ' + responsable(d) + ' (en adelante, "Mostrador").</p>' +

      '<h2>2. Tu cuenta</h2>' +
      '<ul><li>Para usar Mostrador con cuenta tenés que ser mayor de 18 años y dar un correo real.</li>' +
      '<li>Sos responsable de cuidar tu contraseña y de todo lo que se haga con tu cuenta.</li>' +
      '<li>Si sos dueño de un negocio, sos responsable también de lo que hagan los vendedores que invites. Podés cambiarles los permisos o darlos de baja cuando quieras.</li></ul>' +

      '<h2>3. Prueba gratis y planes</h2>' +
      '<ul><li>Las cuentas nuevas empiezan con una prueba gratis de 7 días, con un máximo de 50 productos.</li>' +
      '<li>Para seguir usando Mostrador después de la prueba hay que contratar un plan. El precio, lo que incluye y la forma de pago te los informamos antes de que pagues. El pago se hace directamente con Mostrador, fuera de la aplicación.</li>' +
      '<li>Los planes no se renuevan solos: cada período se paga por separado.</li>' +
      '<li>Si la prueba o el plan vencen, la cuenta queda pausada: no se borra nada, pero el catálogo deja de mostrarse y no se guardan cambios en internet hasta que se renueve. Si una cuenta queda vencida por más de 6 meses, podemos borrar sus datos, avisándote antes por correo con al menos 30 días de anticipación.</li></ul>' +

      '<h2>4. Lo que vos publicás</h2>' +
      '<ul><li>Las fotos, nombres, precios y demás contenido que cargás son tuyos y sos responsable de ellos: tienen que ser verdaderos, legales y tenés que tener derecho a usarlos.</li>' +
      '<li>No se pueden publicar productos prohibidos o robados, contenido engañoso, ofensivo o que viole derechos de otras personas (por ejemplo, fotos de terceros sin su permiso o marcas que no estás autorizado a usar).</li>' +
      '<li>Nos das permiso para guardar y mostrar ese contenido solo para prestarte el servicio (por ejemplo, en tu catálogo). No lo usamos para otra cosa.</li>' +
      '<li>Podemos pausar una cuenta o quitar contenido que no cumpla estos términos, avisándote el motivo.</li></ul>' +

      '<h2>5. El catálogo y los pedidos</h2>' +
      '<ul><li>Tu catálogo es público: lo puede ver cualquier persona que tenga el link.</li>' +
      '<li>Los pedidos y consultas se envían directamente por WhatsApp entre tu cliente y vos. Mostrador no participa en la venta, no cobra comisiones, no recibe los pagos y no es responsable por los productos, precios, entregas ni garantías: todo eso queda entre el vendedor y su cliente.</li></ul>' +

      '<h2>6. Funcionamiento del servicio</h2>' +
      '<ul><li>Hacemos lo posible para que Mostrador funcione siempre y sin errores, pero puede haber interrupciones por mantenimiento, fallas de internet o de los proveedores que usamos.</li>' +
      '<li>La app guarda tus datos en internet, pero te recomendamos usar de vez en cuando la opción "Guardar copia" de Ajustes.</li>' +
      '<li>Mostrador no responde por ganancias perdidas ni por daños indirectos derivados del uso o de la imposibilidad de usar el servicio, en la medida en que la ley lo permita. Nada de esto limita los derechos que te da la Ley de Defensa del Consumidor.</li></ul>' +

      '<h2>7. Arrepentimiento y baja</h2>' +
      '<ul><li><b>Arrepentimiento:</b> si contrataste un plan a distancia, tenés 10 días corridos desde la contratación para arrepentirte sin dar explicaciones, y te devolvemos lo que pagaste.</li>' +
      '<li><b>Baja:</b> podés dar de baja el servicio cuando quieras.</li>' +
      '<li>Para las dos cosas usá el <a href="#baja">Botón de arrepentimiento / Botón de baja</a>, que no pide cuenta ni otros trámites. Te damos un código del pedido en el momento y lo gestionamos dentro de las 24 horas.</li></ul>' +

      '<h2>8. Cambios en estos términos</h2>' +
      '<p>Si cambiamos estos términos, lo vamos a avisar en la aplicación antes de que rijan. Si seguís usando Mostrador después del cambio, se entiende que los aceptás; si no estás de acuerdo, podés darte de baja.</p>' +

      '<h2>9. Ley aplicable</h2>' +
      '<p>Estos términos se rigen por las leyes de la República Argentina. Si sos consumidor, podés hacer tus reclamos ante la autoridad de defensa del consumidor y los tribunales de tu domicilio.</p>' +

      '<h2>10. Contacto</h2>' +
      '<p>Para cualquier consulta escribinos ' + contacto(d) + '.</p>' +
      '<p class="legal-links"><a href="#privacidad">Política de privacidad</a> · <a href="#baja">Botón de arrepentimiento / baja</a></p>';
  }

  function privacidad(d) {
    return '<h1>Política de privacidad</h1><p class="legal-fecha">Última actualización: ' + FECHA + '</p>' +
      '<p>En esta página te contamos qué datos personales guarda Mostrador, para qué y cuáles son tus derechos, según la Ley 25.326 de Protección de los Datos Personales.</p>' +

      '<h2>1. Quién es el responsable</h2>' +
      '<p>El responsable de los datos es ' + responsable(d) + '. Podés contactarnos ' + contacto(d) + '.</p>' +

      '<h2>2. Qué datos guardamos</h2>' +
      '<ul><li><b>De tu cuenta:</b> tu correo electrónico y tu contraseña (la contraseña se guarda cifrada: nadie puede leerla, ni siquiera nosotros).</li>' +
      '<li><b>De tu negocio:</b> nombre, WhatsApp para pedidos, logo, color y demás ajustes.</li>' +
      '<li><b>De tus productos:</b> las fotos, nombres, precios y datos que cargues.</li>' +
      '<li><b>De tu equipo:</b> si invitás vendedores, su correo, el nombre y el WhatsApp que ellos carguen, y los permisos que les des.</li>' +
      '<li><b>Datos técnicos:</b> nuestros proveedores registran datos de conexión (como la dirección IP y la fecha) para que el servicio funcione y sea seguro.</li></ul>' +
      '<p>El correo y la contraseña son necesarios para tener cuenta; sin ellos no se puede crear. Los demás datos los cargás si querés.</p>' +

      '<h2>3. Los clientes que miran tu catálogo</h2>' +
      '<p>Mostrador no les pide registrarse ni guarda datos de quienes miran un catálogo. Cuando alguien arma un pedido, el pedido se prepara en su propio celular y se envía directamente por WhatsApp al negocio: Mostrador no lo recibe ni lo guarda.</p>' +

      '<h2>4. Para qué usamos los datos</h2>' +
      '<ul><li>Para prestarte el servicio: guardar tus productos, mostrarlos en tu catálogo y sincronizarlos entre celulares.</li>' +
      '<li>Para administrar tu cuenta y tu plan, avisarte vencimientos y responder tus consultas.</li></ul>' +
      '<p>No vendemos ni alquilamos tus datos, y no los usamos para publicidad.</p>' +

      '<h2>5. Qué se ve en público</h2>' +
      '<p>En tu catálogo cualquier persona con el link puede ver el nombre de tu negocio, tu logo, tu WhatsApp y los productos con sus fotos y precios. Si los pedidos llegan a cada vendedor, también se ve el nombre de ese vendedor en el pedido.</p>' +

      '<h2>6. Dónde se guardan</h2>' +
      '<p>Usamos proveedores de servicios en internet: <b>Supabase</b> (base de datos y fotos, con servidores en Estados Unidos), <b>Cloudflare</b> (publicación de la aplicación) y <b>Google Fonts</b> (tipografías). Estos proveedores tratan los datos solo para prestarnos su servicio. Al crear tu cuenta, prestás tu consentimiento para que tus datos se guarden en esos servidores, fuera de la Argentina.</p>' +
      '<p>Además, la aplicación guarda una copia de tus datos en tu propio celular (en el almacenamiento del navegador) para poder funcionar sin internet. No usamos cookies de publicidad ni de seguimiento.</p>' +

      '<h2>7. Cuánto tiempo los guardamos</h2>' +
      '<p>Mientras tu cuenta exista. Si pedís la baja o el borrado de tus datos, los eliminamos dentro de los 30 días, salvo que alguna ley nos obligue a conservar algo.</p>' +

      '<h2>8. Seguridad</h2>' +
      '<p>Las conexiones van cifradas (HTTPS), las contraseñas se guardan cifradas y la base de datos tiene reglas para que cada negocio vea solo lo suyo. Ningún sistema es infalible, pero tomamos las medidas razonables para proteger tus datos.</p>' +

      '<h2>9. Tus derechos</h2>' +
      '<p>Podés pedir <b>acceder</b> a tus datos, <b>corregirlos</b>, <b>actualizarlos</b> o <b>borrarlos</b>. Hacelo desde el <a href="#baja">formulario de pedidos</a> (opción "Mis datos") o escribiéndonos ' + contacto(d) + '. Respondemos los pedidos de acceso dentro de los 10 días corridos, y los de corrección o borrado dentro de los 5 días hábiles.</p>' +
      '<p class="legal-leyenda">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.</p>' +
      '<p class="legal-leyenda">LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>' +

      '<h2>10. Menores de edad</h2>' +
      '<p>Mostrador no está pensado para menores de 18 años, y no guardamos a sabiendas datos de menores.</p>' +

      '<h2>11. Cambios</h2>' +
      '<p>Si cambiamos esta política, lo vamos a avisar en la aplicación.</p>' +
      '<p class="legal-links"><a href="#terminos">Términos y condiciones</a> · <a href="#baja">Botón de arrepentimiento / baja</a></p>';
  }

  return { VERSION: VERSION, terminos: terminos, privacidad: privacidad, esc: esc };
})();
