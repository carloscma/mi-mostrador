/*
  Guarda los productos (con su foto) en el celular, usando IndexedDB.
  Si el navegador no lo permite, los guarda en memoria mientras la página
  esté abierta. En la versión con cuentas, esto pasa a la base de datos.
*/
window.ALMACEN = (function () {
  'use strict';

  const NOMBRE = 'mostrador';
  const TABLA = 'productos';
  let memoria = null; // respaldo si no hay IndexedDB
  let abierta = null;

  function abrir() {
    if (!abierta) {
      abierta = new Promise((ok, mal) => {
        try {
          const pedido = indexedDB.open(NOMBRE, 1);
          pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA, { keyPath: 'id' });
          pedido.onsuccess = () => ok(pedido.result);
          pedido.onerror = () => mal(pedido.error);
        } catch (e) { mal(e); }
      }).catch(() => { memoria = memoria || new Map(); return null; });
    }
    return abierta;
  }

  function operar(modo, accion) {
    return abrir().then((db) => {
      if (!db) return accion(null);
      return new Promise((ok, mal) => {
        const tx = db.transaction(TABLA, modo);
        const pedido = accion(tx.objectStore(TABLA));
        tx.oncomplete = () => ok(pedido && pedido.result);
        tx.onerror = () => mal(tx.error);
        tx.onabort = () => mal(tx.error);
      });
    });
  }

  return {
    todos() {
      return operar('readonly', (t) => (t ? t.getAll() : null)).then((r) => {
        const lista = memoria && !r ? Array.from(memoria.values()) : (r || []);
        return lista.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
      });
    },
    guardar(p) {
      return operar('readwrite', (t) => { if (t) return t.put(p); memoria.set(p.id, p); return null; }).then(() => p);
    },
    borrar(id) {
      return operar('readwrite', (t) => { if (t) return t.delete(id); memoria.delete(id); return null; });
    },
    get soloMemoria() { return !!memoria; }
  };
})();
