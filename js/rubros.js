/*
  Rubros: la app adivina el rubro de cada producto por su nombre.
  Busca palabras clave (o el comienzo de la palabra, así "zapat" sirve para
  zapato, zapatilla y zapatillas). El vendedor siempre lo puede corregir.

  Para sumar palabras: agregalas en la lista del rubro que corresponda,
  en minúscula y sin tildes.
*/
window.RUBROS = (function () {
  'use strict';

  // El orden importa cuando hay empate: los rubros de arriba ganan.
  const LISTA = [
    { id: 'vehiculos', nombre: 'Vehículos', palabras: ['auto', 'camioneta', 'pickup', 'moto', 'motocicleta', 'cuatriciclo', 'utilitario', 'sedan', 'hatchback', 'suv', '4x4', 'furgon', 'camion', 'ford', 'chevrolet', 'fiat', 'volkswagen', 'vw', 'renault', 'peugeot', 'toyota', 'citroen', 'honda', 'nissan', 'jeep', 'hilux', 'ranger', 'amarok', 'corsa', 'gol', 'cronos', 'onix', 'kangoo'] },
    { id: 'juguetes', nombre: 'Juguetes', palabras: ['juguete', 'muneca', 'muneco', 'peluche', 'lego', 'rompecabeza', 'puzzle', 'didactic', 'autito', 'pelota infantil', 'slime', 'yoyo', 'trompo', 'masa para moldear', 'cocinita', 'pistola de agua', 'figura de accion', 'de juguete', 'auto de juguete', 'para chicos', 'infantil'] },
    { id: 'mates', nombre: 'Mates y termos', palabras: ['mate', 'matero', 'termo', 'bombilla', 'yerbera', 'azucarera', 'calabaza', 'set matero', 'canasta matera'] },
    { id: 'marroquineria', nombre: 'Marroquinería', palabras: ['bolso', 'cartera', 'mochila', 'billetera', 'rinonera', 'morral', 'valija', 'neceser', 'portadocumento', 'monedero', 'tote', 'bandolera', 'maletin', 'portanotebook'] },
    { id: 'calzado', nombre: 'Calzado', palabras: ['zapat', 'bota', 'botin', 'sandalia', 'ojota', 'pantufla', 'mocasin', 'borcego', 'alpargata', 'chancla', 'crocs', 'sneaker', 'stiletto', 'chinela'] },
    { id: 'bijouterie', nombre: 'Bijouterie y relojes', palabras: ['aro', 'aros', 'anillo', 'pulsera', 'collar', 'cadena', 'dije', 'tobillera', 'reloj', 'bijou', 'argolla', 'gargantilla', 'piercing', 'broche'] },
    { id: 'accesorios', nombre: 'Accesorios', palabras: ['sombrero', 'gorra', 'gorro', 'bufanda', 'cinturon', 'lente', 'anteojo', 'gafa', 'paraguas', 'guante', 'panuelo', 'vincha', 'pinza para pelo', 'hebilla', 'scrunchie', 'pashmina', 'cuello polar', 'tirador'] },
    { id: 'indumentaria', nombre: 'Indumentaria', palabras: ['remera', 'camisa', 'camiseta', 'pantalon', 'jean', 'jogger', 'buzo', 'campera', 'sweater', 'sueter', 'cardigan', 'vestido', 'pollera', 'short', 'calza', 'musculosa', 'top', 'blusa', 'chaleco', 'saco', 'traje', 'pijama', 'malla', 'bikini', 'ropa interior', 'corpino', 'bombacha', 'boxer', 'media', 'medias', 'conjunto', 'enterito', 'mono', 'tapado', 'parka', 'piloto', 'polar', 'chomba', 'bermuda', 'babucha', 'kimono', 'body'] },
    { id: 'bebes', nombre: 'Bebés', palabras: ['bebe', 'panal', 'mamadera', 'chupete', 'babero', 'cochecito', 'cuna', 'mordillo', 'sonajero', 'ajuar', 'portabebe', 'pelele', 'escarpin'] },
    { id: 'mascotas', nombre: 'Mascotas', palabras: ['perro', 'gato', 'mascota', 'correa', 'pretal', 'comedero', 'bebedero', 'rascador', 'cucha', 'arenero', 'piedritas', 'alimento balanceado', 'hueso de juguete', 'para perro', 'para perros', 'para gato', 'para gatos', 'para mascota', 'para mascotas'] },
    { id: 'belleza', nombre: 'Belleza y cuidado', palabras: ['perfume', 'colonia', 'crema', 'maquillaje', 'labial', 'rimel', 'mascara de pestanas', 'base', 'esmalte', 'shampoo', 'champu', 'acondicionador', 'serum', 'jabon', 'desodorante', 'protector solar', 'body splash', 'paleta de sombras', 'delineador', 'brocha', 'secador', 'planchita', 'rizador', 'depiladora', 'afeitadora', 'tintura', 'skincare'] },
    { id: 'iluminacion', nombre: 'Iluminación', palabras: ['lampara', 'velador', 'foco', 'led', 'linterna', 'farol', 'aplique', 'plafon', 'colgante', 'tira led', 'luz', 'luces', 'reflector', 'guirnalda', 'luminaria', 'spot'] },
    { id: 'tecnologia', nombre: 'Tecnología', palabras: ['celular', 'telefono', 'auricular', 'parlante', 'cargador', 'cable', 'funda', 'protector de pantalla', 'smartwatch', 'tablet', 'notebook', 'computadora', 'mouse', 'teclado', 'joystick', 'consola', 'camara', 'pendrive', 'memoria', 'disco', 'power bank', 'bateria', 'router', 'smart tv', 'televisor', 'tv', 'proyector', 'microfono', 'aro de luz', 'tripode', 'drone', 'monitor'] },
    { id: 'electro', nombre: 'Electrodomésticos', palabras: ['licuadora', 'pava electrica', 'tostadora', 'microondas', 'heladera', 'lavarropas', 'ventilador', 'aire acondicionado', 'estufa', 'caloventor', 'plancha', 'aspiradora', 'batidora', 'procesadora', 'freidora', 'air fryer', 'cafetera', 'sandwichera', 'horno electrico', 'anafe', 'jarra electrica', 'exprimidor', 'minipimer'] },
    { id: 'bazar', nombre: 'Bazar y cocina', palabras: ['taza', 'vaso', 'copa', 'plato', 'olla', 'sarten', 'cacerola', 'cubierto', 'cuchillo', 'tenedor', 'cuchara', 'jarra', 'botella', 'vianda', 'tupper', 'taper', 'contenedor', 'frasco', 'bandeja', 'fuente', 'tabla', 'colador', 'rallador', 'mantel', 'repasador', 'individual', 'posavaso', 'especiero', 'budinera', 'tartera', 'molde', 'pava', 'jarro', 'bowl', 'ensaladera', 'escurridor', 'portacubiertos', 'hielera', 'conservadora'] },
    { id: 'hogar', nombre: 'Hogar y deco', palabras: ['cuadro', 'almohadon', 'almohada', 'alfombra', 'cortina', 'vela', 'florero', 'maceta', 'espejo', 'reloj de pared', 'perchero', 'organizador', 'canasto', 'cesto', 'sabana', 'acolchado', 'frazada', 'manta', 'toalla', 'toallon', 'difusor', 'aromatizador', 'portarretrato', 'adorno', 'deco', 'cubrecama', 'edredon', 'felpudo', 'planta artificial', 'mueble', 'silla', 'mesa', 'banqueta', 'estante', 'repisa', 'zapatero', 'placard', 'sillon', 'puff', 'escritorio', 'rack', 'biblioteca'] },
    { id: 'libreria', nombre: 'Librería', palabras: ['cuaderno', 'lapicera', 'lapiz', 'birome', 'marcador', 'resaltador', 'agenda', 'carpeta', 'cartuchera', 'goma de borrar', 'regla', 'tijera', 'pegamento', 'plasticola', 'repuesto', 'block', 'libreta', 'sacapuntas', 'fibra', 'crayon', 'acuarela', 'planner'] },
    { id: 'deportes', nombre: 'Deportes y fitness', palabras: ['pelota', 'botinero', 'mancuerna', 'pesa', 'colchoneta', 'yoga', 'banda elastica', 'soga', 'bicicleta', 'casco', 'rodillera', 'canillera', 'raqueta', 'paleta de padel', 'pileta', 'inflable', 'carpa', 'bolsa de dormir', 'camping', 'reposera', 'kayak', 'skate', 'roller', 'patineta', 'monopatin'] },
    { id: 'herramientas', nombre: 'Herramientas', palabras: ['taladro', 'destornillador', 'martillo', 'llave', 'pinza', 'amoladora', 'sierra', 'caja de herramientas', 'nivel', 'cinta metrica', 'atornillador', 'soldador', 'compresor', 'hidrolavadora', 'escalera', 'manguera', 'cortacesped', 'bordeadora', 'pintura', 'rodillo', 'pincel', 'tornillo', 'clavo', 'tarugo', 'candado', 'cerradura'] },
    { id: 'alimentos', nombre: 'Alimentos y bebidas', palabras: ['alfajor', 'galletita', 'chocolate', 'caramelo', 'golosina', 'yerba', 'cafe', 'te', 'mermelada', 'dulce de leche', 'miel', 'torta', 'budin', 'pan', 'pizza', 'empanada', 'vino', 'cerveza', 'gaseosa', 'jugo', 'agua', 'aceite', 'fiambre', 'queso', 'frutos secos', 'granola', 'cookie', 'brownie', 'medialuna'] }
  ];
  const OTROS = { id: 'otros', nombre: 'Otros' };

  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/ñ/g, 'n').replace(/\s+/g, ' ').trim();
  }

  // Devuelve el id del rubro más probable para un nombre de producto
  function detectar(nombre) {
    const texto = ' ' + normalizar(nombre) + ' ';
    const palabras = texto.trim().split(' ').filter(Boolean);
    if (!palabras.length) return OTROS.id;
    let mejor = null, mejorPuntos = 0;
    LISTA.forEach((r, orden) => {
      let puntos = 0;
      r.palabras.forEach((clave) => {
        if (clave.indexOf(' ') >= 0) {
          if (texto.indexOf(' ' + clave + ' ') >= 0) puntos += 3;     // frase exacta: vale más
        } else {
          palabras.forEach((p, i) => {
            const pesoPos = i === 0 ? 2 : 1;                            // la primera palabra suele ser el producto
            if (p === clave || p === clave + 's' || p === clave + 'es') puntos += 2 * pesoPos;
            else if (clave.length >= 4 && p.indexOf(clave) === 0) puntos += 1.2 * pesoPos;
          });
        }
      });
      puntos -= orden * 0.001;                                          // desempate por orden
      if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = r; }
    });
    return mejor && mejorPuntos > 0.5 ? mejor.id : OTROS.id;
  }

  function nombreDe(id) {
    const r = LISTA.find((x) => x.id === id);
    return r ? r.nombre : OTROS.nombre;
  }

  const TODOS = LISTA.map((r) => ({ id: r.id, nombre: r.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).concat([OTROS]);

  return { detectar: detectar, nombreDe: nombreDe, TODOS: TODOS, normalizar: normalizar };
})();
