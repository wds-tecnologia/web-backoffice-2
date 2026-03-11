// 📦 Nome do cache com base no timestamp do build
const CACHE_NAME = `pet-store-cache-${Date.now()}`;

// 📥 Instalação do SW
self.addEventListener('install', () => {
  console.log('🛠️ Service Worker: Instalado');
  self.skipWaiting(); // Ativa imediatamente
});

// 🚀 Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('⚙️ Service Worker: Ativado');

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (!name.startsWith('pet-store-cache-')) {
            console.log(`🧹 Deletando cache antigo: ${name}`);
            return caches.delete(name);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

// 🌐 Intercepta apenas requisições same-origin (navegação)
// Requisições cross-origin (API calls) são ignoradas para não interferir com CORS
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Deixa o browser lidar com tudo que não é same-origin
  // (chamadas de API, CDN, etc.) — não chamar respondWith = comportamento padrão
  if (url.origin !== self.location.origin) {
    return;
  }

  // Para same-origin, passa direto pela rede sem cache
  event.respondWith(fetch(event.request));
});

// 📩 Listener de mensagens do Service Worker
self.addEventListener('message', (event) => {
  if (event.data?.type === 'RELOAD_PAGE') {
    console.log('🟢 Atualização detectada. Recarregando...');
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'RELOAD_PAGE' });
      });
    });
  }
});