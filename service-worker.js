// Service Worker: solo se encarga de que la app pueda "instalarse" en el celular
// y de guardar una copia mínima para que abra aunque no haya internet en ese instante.
// Estrategia "red primero": siempre intenta cargar la versión más reciente en línea;
// solo usa la copia guardada si de verdad no hay conexión. Así nunca se corre el
// riesgo de mostrar una versión vieja de la app mientras haya internet disponible.

const NOMBRE_CACHE = 'registro-docente-cache-v1';
const ARCHIVOS_BASE = [
  './index.html',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => {
      // Si algún archivo no existe (ej. no subieron logo.png), no rompe la instalación.
      return Promise.all(
        ARCHIVOS_BASE.map((archivo) => cache.add(archivo).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves
          .filter((clave) => clave !== NOMBRE_CACHE)
          .map((clave) => caches.delete(clave))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interviene en peticiones GET normales (no toca las llamadas a Firebase/Google,
  // esas siempre van directo a la red tal como funcionan hoy).
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // deja pasar Firebase, Firestore, CDNs, etc. sin interferir

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(NOMBRE_CACHE).then((cache) => cache.put(event.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});
