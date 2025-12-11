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
        const { user_id } = await req.json()

        const supabaseWithServiceKey = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const vapidSubject = 'mailto:admin@example.com'
        // Reuse keys from env or fallback to hardcoded if env missing in development context
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BDT2eGBz_mdBbTPuLhUHHfWKD-E0XffvsgO7d2kI7W634RjM9N0jXUq62P-t9gJ-zR1w36p5T-S78g3Z-p5zXhE'
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'B_JOnJb-MfNaTDBPYRb7bljeAcwwtSKUGynGBi-1o3E'

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

        // Fetch user subscriptions
        const { data: subs, error: subsError } = await supabaseWithServiceKey
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user_id)

        if (subsError || !subs || subs.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const payload = JSON.stringify({
            title: 'Teste de Notificação 🔔',
            body: 'Se você está lendo isso, o sistema de alertas está funcionando perfeitamente!',
            url: '/'
        })

        const results = []

        for (const sub of subs) {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }
                await webpush.sendNotification(pushSubscription, payload)
                results.push({ success: true, id: sub.id })
            } catch (err) {
                console.error('Failed', err)
                if (err.statusCode === 410) {
                    await supabaseWithServiceKey.from('push_subscriptions').delete().eq('id', sub.id)
                }
                results.push({ success: false, error: err.message })
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
