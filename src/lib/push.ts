import { supabase } from './supabase'

const VAPID_public_key = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export async function requestNotificationPermission() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada or dispensada.')
    }
    return permission
}

export async function subscribeToPushNotifications(userId: string) {
    if (!VAPID_public_key) {
        throw new Error('VITE_VAPID_PUBLIC_KEY não está definida.')
    }

    const registration = await navigator.serviceWorker.ready
    if (!registration) {
        throw new Error('Service Worker não está pronto.')
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_public_key)
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
        })
    }

    // Send subscription to backend
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
            {
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.toJSON().keys,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
        )

    if (error) {
        console.error('Erro ao salvar subscrição no Supabase:', error)
        throw error
    }

    return subscription
}
