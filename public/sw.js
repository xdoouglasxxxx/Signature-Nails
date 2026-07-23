// Service worker mínimo: garante instalação PWA e modo standalone em todas as rotas
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {}) // rede direta (sem cache agressivo por enquanto)
