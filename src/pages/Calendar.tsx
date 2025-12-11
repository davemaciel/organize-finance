import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Database } from '../lib/database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Debt = Database['public']['Tables']['debts']['Row'];

interface Event {
    id: string;
    title: string;
    date: Date;
    amount: number;
    type: 'invoice' | 'debt';
}

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        // Fetch invoices
        const { data: invoices } = await supabase
            .from('invoices')
            .select('*, credit_cards(name)')
            .gte('due_date', start.toISOString())
            .lte('due_date', end.toISOString());

        // Fetch debts (simplified for now, recurring debts calculation is complex inside query, doing simple fetch)
        const { data: debts } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id);

        const newEvents: Event[] = [];

        if (invoices) {
            invoices.forEach((inv: any) => {
                newEvents.push({
                    id: inv.id,
                    title: inv.credit_cards.name,
                    date: new Date(inv.due_date),
                    amount: inv.amount,
                    type: 'invoice'
                });
            });
        }

        if (debts) {
            debts.forEach((debt: Debt) => {
                let debtDate: Date;
                if (debt.debt_type === 'single' && debt.specific_due_date) {
                    debtDate = new Date(debt.specific_due_date);
                } else {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const day = debt.due_day || 10;
                    debtDate = new Date(year, month, day);
                }

                // Check if debt is active and in this month
                if (debtDate >= start && debtDate <= end && debt.remaining_amount > 0) {
                    newEvents.push({
                        id: debt.id,
                        title: debt.name,
                        date: debtDate,
                        amount: debt.debt_type === 'single' ? debt.total_amount : (debt.minimum_payment || 0),
                        type: 'debt'
                    });
                }
            });
        }

        setEvents(newEvents);
        setLoading(false);
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Calendário 📅</h2>
                    <p className="text-muted-foreground">Visualize seus pagamentos.</p>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                    <button onClick={previousMonth} className="p-2 hover:bg-secondary rounded-md transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-medium min-w-[120px] text-center capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-md transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(weekday => (
                            <div key={weekday} className="bg-secondary/50 p-4 text-center font-semibold text-sm">
                                {weekday}
                            </div>
                        ))}

                        {/* Empty cells for start of month alignment - simplified, assumes start on correct day */}
                        {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-background p-4 min-h-[100px]" />
                        ))}

                        {days.map(day => {
                            const dayEvents = events.filter(e => isSameDay(e.date, day));
                            return (
                                <div
                                    key={day.toString()}
                                    className={`bg-background p-2 min-h-[100px] border-t border-border/5 relative group hover:bg-secondary/20 transition-colors ${isToday(day) ? 'bg-primary/5' : ''}`}
                                >
                                    <div className={`text-sm font-medium mb-2 ${isToday(day) ? 'text-primary' : ''}`}>
                                        {format(day, 'd')}
                                    </div>
                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={`text-[10px] sm:text-xs p-1 rounded border truncate ${event.type === 'invoice'
                                                        ? 'bg-primary/10 border-primary/20 text-primary'
                                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                                                    }`}
                                                title={`${event.title} - R$ ${event.amount.toFixed(2)}`}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
