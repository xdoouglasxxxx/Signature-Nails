// Service worker do Signature: PWA standalone + notificações push
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})

self.addEventListener("push", (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title || "Signature ✦", {
      body: data.body || "Você tem uma novidade na sua agenda.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/painel/agenda" },
    }),
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const url = e.notification.data?.url || "/painel/agenda"
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes("/painel") && "focus" in w) { w.navigate(url); return w.focus() }
      }
      return self.clients.openWindow(url)
    }),
  )
})
