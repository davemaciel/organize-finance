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

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const getTargetDate = (daysToAdd) => {
            const d = new Date(now);
            d.setDate(now.getDate() + daysToAdd);
            return d.toISOString().split('T')[0];
        };

        const targetDates = [
            { days: 0, str: todayStr, title: '⚠️ É HOJE!', bodyPrefix: 'Vence hoje: ' },
            { days: 1, str: getTargetDate(1), title: '🕒 É amanhã', bodyPrefix: 'Vence amanhã: ' },
            { days: 3, str: getTargetDate(3), title: '📅 Faltam 3 dias', bodyPrefix: 'Em 3 dias: ' },
            { days: 7, str: getTargetDate(7), title: '🗓️ Próxima semana', bodyPrefix: 'Em 1 semana: ' },
        ];

        const targetDateStrings = targetDates.map(t => t.str);

        // 1. Fetch Invoices
        const { data: invoices, error: invoicesError } = await supabaseWithServiceKey
            .from('invoices')
            .select(`
                id, amount, due_date, status, user_id,
                credit_cards (name)
            `)
            .in('due_date', targetDateStrings)
            .in('status', ['open', 'overdue']); // Only remind for open or overdue

        if (invoicesError) throw invoicesError;

        // 2. Fetch Debts
        // Debts are trickier because of recurring logic. For now, let's handle single debts with specific due dates.
        const { data: debts, error: debtsError } = await supabaseWithServiceKey
            .from('debts')
            .select('*')
            .gt('remaining_amount', 0); // Only active debts

        if (debtsError) throw debtsError;

        const paymentsToNotify = [];

        // Process Invoices
        if (invoices) {
            invoices.forEach(inv => {
                const target = targetDates.find(t => t.str === inv.due_date);
                if (target) {
                    paymentsToNotify.push({
                        user_id: inv.user_id,
                        title: target.title,
                        body: `${target.bodyPrefix}Fatura do cartão ${inv.credit_cards?.name || 'Desconhecido'} - R$ ${inv.amount.toFixed(2)}`,
                        url: '/faturas'
                    });
                }
            });
        }

        // Process Debts (Simple check for specific dates for single debts, or recurring day match)
        if (debts) {
            debts.forEach(debt => {
                let matchDateIdx = -1;
                let paymentAmount = 0;

                if (debt.debt_type === 'single' && debt.specific_due_date) {
                    matchDateIdx = targetDates.findIndex(t => t.str === debt.specific_due_date);
                    paymentAmount = debt.total_amount;
                } else if (debt.due_day) {
                    // Recurring: check if target date day matches due_day
                    // This is simplified. Ideally we check month overflow etc.
                    // But for "upcoming in X days" we check if the target date's day matches.
                    matchDateIdx = targetDates.findIndex(t => {
                        const tDate = new Date(t.str + 'T12:00:00'); // Safe parsing
                        return tDate.getDate() === debt.due_day;
                    });
                    paymentAmount = debt.minimum_payment || 0;
                }

                if (matchDateIdx !== -1) {
                    const target = targetDates[matchDateIdx];
                    paymentsToNotify.push({
                        user_id: debt.user_id,
                        title: target.title,
                        body: `${target.bodyPrefix}Pagamento de ${debt.name} - R$ ${paymentAmount.toFixed(2)}`,
                        url: '/dashboard' // or where debts are managed
                    });
                }
            });
        }

        if (paymentsToNotify.length === 0) {
            return new Response(JSON.stringify({ message: 'No payments due in target range' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const vapidSubject = 'mailto:admin@example.com'
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BDT2eGBz_mdBbTPuLhUHHfWKD-E0XffvsgO7d2kI7W634RjM9N0jXUq62P-t9gJ-zR1w36p5T-S78g3Z-p5zXhE'
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'B_JOnJb-MfNaTDBPYRb7bljeAcwwtSKUGynGBi-1o3E' // WARNING: This should be env var only

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

        const results = []

        for (const payment of paymentsToNotify) {
            const { data: subs, error: subsError } = await supabaseWithServiceKey
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', payment.user_id)

            if (subsError || !subs) continue;

            const payload = JSON.stringify({
                title: payment.title,
                body: payment.body,
                url: payment.url
            })

            for (const sub of subs) {
                try {
                    const pushSubscription = { endpoint: sub.endpoint, keys: sub.keys }
                    await webpush.sendNotification(pushSubscription, payload)
                    results.push({ success: true, user: payment.user_id })
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
