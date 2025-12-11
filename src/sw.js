import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
    let data = {}
    if (event.data) {
        try {
            data = event.data.json()
        } catch (e) {
            data = { title: 'Nova Mensagem', body: event.data.text() }
        }
    }

    const title = data.title || 'Organizador Financeiro'
    const options = {
        body: data.body || 'Você tem uma nova notificação.',
        icon: '/pwa-192x192.png', // Fallback icon path
        badge: '/pwa-192x192.png',
        data: data.url || '/',
        vibrate: [100, 50, 100],
        actions: [
            {
                action: 'open',
                title: 'Abrir App',
            },
        ],
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) return client.focus()
            }
            // Otherwise open a new window
            if (clients.openWindow) return clients.openWindow(event.notification.data)
        })
    )
})
