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
          if (!name.startsWith(CACHE_NAME)) {
            console.log(`🧹 Deletando cache antigo: ${name}`);
            return caches.delete(name);
          }
        })
      );

      await self.clients.claim();

      // 🔄 Notifica os clients para recarregarem
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({ type: 'RELOAD_PAGE' });
      });
    })()
  );
});

// 🌐 Intercepta requisições e sempre busca da rede
self.addEventListener('fetch', (event) => {
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