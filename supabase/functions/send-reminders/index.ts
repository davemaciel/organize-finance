import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseWithServiceKey = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Calculate target dates
        const today = new Date()

        const date1Day = new Date(today)
        date1Day.setDate(today.getDate() + 1)
        const date1Str = date1Day.toISOString().split('T')[0]

        const date3Days = new Date(today)
        date3Days.setDate(today.getDate() + 3)
        const date3Str = date3Days.toISOString().split('T')[0]

        const date7Days = new Date(today)
        date7Days.setDate(today.getDate() + 7)
        const date7Str = date7Days.toISOString().split('T')[0]

        // 2. Fetch bills matching these dates
        const { data: faturas, error: faturasError } = await supabaseWithServiceKey
            .from('faturas')
            .select('id, description, value, due_date, user_id')
            .in('due_date', [date1Str, date3Str, date7Str])

        if (faturasError) throw faturasError

        if (!faturas || faturas.length === 0) {
            return new Response(JSON.stringify({ message: 'No bills due in 1, 3 or 7 days' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const vapidSubject = 'mailto:admin@example.com'
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BDT2eGBz_mdBbTPuLhUHHfWKD-E0XffvsgO7d2kI7W634RjM9N0jXUq62P-t9gJ-zR1w36p5T-S78g3Z-p5zXhE'
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'B_JOnJb-MfNaTDBPYRb7bljeAcwwtSKUGynGBi-1o3E'

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys not set')
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

        const results = []

        // 3. Loop through bills and notify
        for (const fatura of faturas) {
            // Determine message based on days remaining
            let title = 'Lembrete de Fatura'
            let body = `Sua fatura de R$ ${fatura.value} vence em breve.`

            if (fatura.due_date === date1Str) {
                title = '⚠️ É amanhã!'
                body = `A fatura "${fatura.description}" vence AMANHÃ! Pague agora para evitar juros.`
            } else if (fatura.due_date === date3Str) {
                title = '📅 Faltam 3 dias'
                body = `Falta pouco para o vencimento de "${fatura.description}". Adiantar o pagamento ajuda a organizar suas finanças!`
            } else if (fatura.due_date === date7Str) {
                title = '🗓️ Vence em 1 semana'
                body = `Sua fatura "${fatura.description}" vence em 7 dias. Que tal já se planejar para ficar tranquilo?`
            }

            const { data: subs, error: subsError } = await supabaseWithServiceKey
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', fatura.user_id)

            if (subsError) continue

            const payload = JSON.stringify({ title, body, url: '/faturas' })

            for (const sub of subs) {
                try {
                    const pushSubscription = { endpoint: sub.endpoint, keys: sub.keys }
                    await webpush.sendNotification(pushSubscription, payload)
                    results.push({ success: true, user: fatura.user_id })
                } catch (err) {
                    console.error('Failed to send push', err)
                    if (err.statusCode === 410) {
                        await supabaseWithServiceKey.from('push_subscriptions').delete().eq('id', sub.id)
                    }
                    results.push({ success: false, error: err.message })
                }
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
