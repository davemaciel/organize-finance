import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

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

        // 1. Get bills due tomorrow (or today, logic depends on preference)
        // For this example, let's find bills due 'tomorrow'
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateString = tomorrow.toISOString().split('T')[0] // YYYY-MM-DD

        const { data: faturas, error: faturasError } = await supabaseWithServiceKey
            .from('faturas')
            .select('id, description, value, due_date, user_id')
            .eq('due_date', dateString)
        // .eq('paid', false) // Use this if you have a 'paid' column

        if (faturasError) throw faturasError

        if (!faturas || faturas.length === 0) {
            return new Response(JSON.stringify({ message: 'No bills due tomorrow' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Configure Web Push
        // Ensure you set these secrets in your Supabase Dashboard
        const vapidSubject = 'mailto:admin@example.com'
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys not set in Edge Function secrets')
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

        const results = []

        // 3. Loop through bills and notify users
        for (const fatura of faturas) {
            // Get subscriptions for this user
            const { data: subs, error: subsError } = await supabaseWithServiceKey
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', fatura.user_id)

            if (subsError) {
                console.error('Error fetching subs for user', fatura.user_id, subsError)
                continue
            }

            const payload = JSON.stringify({
                title: 'Fatura Vencendo!',
                body: `A fatura "${fatura.description}" de R$ ${fatura.value} vence amanhã!`,
                url: `/faturas` // Deep link if supported
            })

            for (const sub of subs) {
                try {
                    // Construct the subscription object expected by web-push
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    }

                    await webpush.sendNotification(pushSubscription, payload)
                    results.push({ success: true, user: fatura.user_id })
                } catch (err) {
                    console.error('Failed to send push', err)
                    if (err.statusCode === 410) {
                        // Subscription expired, remove it
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
