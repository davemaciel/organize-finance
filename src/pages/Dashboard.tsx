import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { AlertTriangle, CheckCircle, Clock, CreditCard, DollarSign } from 'lucide-react';
import { differenceInDays, format, addDays, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type CreditCard = Database['public']['Tables']['credit_cards']['Row'];
type Debt = Database['public']['Tables']['debts']['Row'];

interface InvoiceWithCard extends Invoice {
    credit_cards: CreditCard;
}

interface UpcomingPayment {
    id: string;
    name: string;
    amount: number;
    due_date: string;
    type: 'invoice' | 'debt';
    is_single?: boolean;
}

export function Dashboard() {
    const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
    const [urgentCount, setUrgentCount] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        const nextMonth = addDays(today, 30);

        // Fetch invoices
        const { data: invoices } = await supabase
            .from('invoices')
            .select(`
        *,
        credit_cards(*)
      `)
            .gte('due_date', today.toISOString())
            .lte('due_date', nextMonth.toISOString())
            .in('status', ['open', 'overdue'])
            .order('due_date', { ascending: true });

        // Fetch debts (empréstimos)
        const { data: debts } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id)
            .gt('remaining_amount', 0);

        const payments: UpcomingPayment[] = [];

        // Add invoices
        if (invoices) {
            invoices.forEach((inv: any) => {
                payments.push({
                    id: inv.id,
                    name: inv.credit_cards.name,
                    amount: inv.amount,
                    due_date: inv.due_date,
                    type: 'invoice'
                });
            });
        }

        // Add debts
        if (debts) {
            debts.forEach((debt: Debt) => {
                let nextDueDate: Date;

                if (debt.debt_type === 'single' && debt.specific_due_date) {
                    // Parcela única - usa a data específica
                    nextDueDate = new Date(debt.specific_due_date);
                } else {
                    // Recorrente - calcula próximo vencimento baseado no dia do mês
                    const currentMonth = startOfMonth(today);
                    nextDueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), debt.due_day || 10);

                    // Se já passou este mês, vai para o próximo
                    if (nextDueDate < today) {
                        nextDueDate = addMonths(nextDueDate, 1);
                    }
                }

                // Só mostra se estiver dentro dos próximos 30 dias
                if (nextDueDate >= today && nextDueDate <= nextMonth) {
                    payments.push({
                        id: debt.id,
                        name: debt.name,
                        amount: debt.debt_type === 'single' ? debt.total_amount : (debt.minimum_payment || 0),
                        due_date: nextDueDate.toISOString().split('T')[0],
                        type: 'debt',
                        is_single: debt.debt_type === 'single'
                    });
                }
            });
        }

        // Sort by due date
        payments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        setUpcomingPayments(payments);

        // Count urgent payments
        const urgent = payments.filter(p => {
            const daysUntil = differenceInDays(new Date(p.due_date), today);
            return daysUntil <= 3;
        });
        setUrgentCount(urgent.length);
    };

    const getUrgencyColor = (dueDate: string) => {
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return 'text-red-500 bg-red-500/10';
        if (days <= 3) return 'text-orange-500 bg-orange-500/10';
        if (days <= 7) return 'text-yellow-500 bg-yellow-500/10';
        return 'text-green-500 bg-green-500/10';
    };

    const getDaysText = (dueDate: string) => {
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return 'Vencido!';
        if (days === 0) return 'Vence HOJE!';
        if (days === 1) return 'Vence amanhã';
        return `${days} dias`;
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Olá! 👋</h2>
                <p className="text-muted-foreground">Aqui está um resumo das suas contas.</p>
            </div>

            {/* Alertas Urgentes */}
            {urgentCount > 0 && (
                <div className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-4">
                    <AlertTriangle className="text-orange-500 mt-1" size={24} />
                    <div>
                        <h3 className="font-semibold text-orange-500">Atenção!</h3>
                        <p className="text-sm">
                            Você tem <strong>{urgentCount}</strong> pagamento(s) vencendo nos próximos 3 dias.
                        </p>
                    </div>
                </div>
            )}

            {/* Próximos Pagamentos */}
            <div>
                <h3 className="text-xl font-semibold mb-4">Próximos Pagamentos</h3>
                <div className="space-y-3">
                    {upcomingPayments.length === 0 ? (
                        <div className="p-8 rounded-xl bg-card border border-border text-center">
                            <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                            <p className="text-muted-foreground">Nenhum pagamento pendente! 🎉</p>
                        </div>
                    ) : (
                        upcomingPayments.map((payment) => (
                            <div
                                key={payment.id}
                                className="p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className={`p-3 rounded-full ${payment.type === 'invoice' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'}`}>
                                        {payment.type === 'invoice' ? <CreditCard size={24} /> : <DollarSign size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{payment.name}</h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                {payment.type === 'invoice' ? 'Fatura' : payment.is_single ? 'Parcela Única' : 'Empréstimo'}
                                            </span>
                                            Vencimento: {format(new Date(payment.due_date), "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                                    <p className="font-bold text-lg">
                                        R$ {Number(payment.amount).toFixed(2)}
                                    </p>
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(payment.due_date)}`}>
                                        <Clock size={12} />
                                        {getDaysText(payment.due_date)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
