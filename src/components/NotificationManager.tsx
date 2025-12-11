import React, { useEffect, useState } from 'react'
import { requestNotificationPermission, subscribeToPushNotifications } from '../lib/push'
import { supabase } from '../lib/supabase'
import { Modal, ConfirmModal } from './Modal'

export function NotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [loading, setLoading] = useState(false)
    const [subscribed, setSubscribed] = useState(false)
    const [showConfirmTest, setShowConfirmTest] = useState(false)
    const [modalMessage, setModalMessage] = useState<{ title: string, body: string } | null>(null)

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission)
            checkSubscription()
        }
    }, [])

    async function checkSubscription() {
        if (!('serviceWorker' in navigator)) return
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
            setSubscribed(true)
        }
    }

    async function handleSubscribe() {
        setLoading(true)
        try {
            if (permission !== 'granted') {
                const newPermission = await requestNotificationPermission()
                setPermission(newPermission)
                if (newPermission !== 'granted') {
                    setLoading(false)
                    return
                }
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setModalMessage({ title: 'Atenção', body: 'Você precisa estar logado para ativar notificações.' })
                setLoading(false)
                return
            }

            await subscribeToPushNotifications(user.id)
            setSubscribed(true)
            setModalMessage({ title: 'Sucesso', body: 'Notificações ativadas com sucesso!' })
        } catch (error) {
            console.error(error)
            setModalMessage({ title: 'Erro', body: 'Erro ao ativar notificações. Verifique suas configurações de permissão.' })
        } finally {
            setLoading(false)
        }
    }

    async function executeTestNotification() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            const { error } = await supabase.functions.invoke('send-test-notification', {
                body: { user_id: user.id }
            })
            if (error) throw error
            setModalMessage({ title: 'Enviado', body: 'Notificação enviada! Verifique seu celular/PC em alguns segundos.' })
        } catch (err: any) {
            console.error(err)
            setModalMessage({ title: 'Erro no Envio', body: `Erro ao enviar teste: ${err.message || JSON.stringify(err)}` })
        }
    }

    if (permission === 'denied') {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
                Notificações estão bloqueadas no navegador. Para receber lembretes, altere as permissões do site.
            </div>
        )
    }

    return (
        <>
            <ConfirmModal
                isOpen={showConfirmTest}
                onClose={() => setShowConfirmTest(false)}
                onConfirm={executeTestNotification}
                title="Testar Notificação"
                description="Vou enviar uma notificação de teste para este dispositivo agora. Pode ser?"
                confirmText="Enviar"
            />

            <Modal
                isOpen={!!modalMessage}
                onClose={() => setModalMessage(null)}
                title={modalMessage?.title || ''}
            >
                <p>{modalMessage?.body}</p>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => setModalMessage(null)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                    >
                        OK
                    </button>
                </div>
            </Modal>

            {subscribed ? (
                <div className="flex flex-col gap-2">
                    <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
                        <span>✓</span> Notificações ativadas para este dispositivo.
                    </div>
                    <button
                        onClick={() => setShowConfirmTest(true)}
                        className="text-xs text-muted-foreground underline hover:text-primary self-start"
                    >
                        Testar Notificação Agora
                    </button>
                    <div className="text-[10px] text-muted-foreground mt-1">
                        Se não receber, verifique se o "Não Perturbe" está ativo ou se o navegador bloqueou.
                    </div>
                </div>
            ) : (
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
            )}
        </>
    )
}
