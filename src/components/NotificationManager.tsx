import React, { useEffect, useState } from 'react'
import { requestNotificationPermission, subscribeToPushNotifications } from '../lib/push'
import { supabase } from '../lib/supabase'

export function NotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [loading, setLoading] = useState(false)
    const [subscribed, setSubscribed] = useState(false)

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission)
            checkSubscription()
        }
    }, [])

    async function checkSubscription() {
        // Check if service worker is ready and has subscription
        // This is a basic check; robust apps would verify with backend too
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
            setSubscribed(true)
        }
    }

    async function handleSubscribe() {
        setLoading(true)
        try {
            // 1. Request Permission
            if (permission !== 'granted') {
                const newPermission = await requestNotificationPermission()
                setPermission(newPermission)
                if (newPermission !== 'granted') {
                    setLoading(false)
                    return
                }
            }

            // 2. Subscribe and Save to Supabase
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert('Você precisa estar logado para ativar notificações.')
                setLoading(false)
                return
            }

            await subscribeToPushNotifications(user.id)
            setSubscribed(true)
            alert('Notificações ativadas com sucesso!')
        } catch (error) {
            console.error(error)
            alert('Erro ao ativar notificações. Verifique o console ou suas configurações.')
        } finally {
            setLoading(false)
        }
    }

    async function handleTestNotification() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (!confirm('Vou mandar uma notificação de teste agora. Pode ser?')) return

        try {
            const { error } = await supabase.functions.invoke('send-test-notification', {
                body: { user_id: user.id }
            })
            if (error) throw error
            alert('Notificação enviada! Verifique seu celular/PC em alguns segundos.')
        } catch (err: any) {
            console.error(err)
            alert(`Erro ao enviar teste: ${err.message || JSON.stringify(err)}`)
        }
    }

    if (permission === 'denied') {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
                Notificações estão bloqueadas no navegador. Para receber lembretes, altere as permissões do site.
            </div>
        )
    }

    if (subscribed) {
        return (
            <div className="flex flex-col gap-2">
                <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
                    <span>✓</span> Notificações ativadas para este dispositivo.
                </div>
                <button
                    onClick={handleTestNotification}
                    className="text-xs text-muted-foreground underline hover:text-primary self-start"
                >
                    Testar Notificação Agora
                </button>
            </div>
        )
    }

    return (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-md text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <p className="font-semibold">Ativar lembretes de fatura?</p>
                <p className="text-xs text-blue-600 mt-1">Receba notificações no seu celular ou computador quando uma conta estiver vencendo.</p>
            </div>
            <button
                onClick={handleSubscribe}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
            >
                {loading ? 'Ativando...' : 'Ativar Notificações'}
            </button>
        </div>
    )
}
