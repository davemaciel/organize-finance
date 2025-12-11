import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Plus, Activity, Calendar } from 'lucide-react';

type RecurringPayment = Database['public']['Tables']['recurring_payments']['Row'];

export function Pulse() {
    const [payments, setPayments] = useState<RecurringPayment[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newPayment, setNewPayment] = useState({
        name: '',
        amount: 0,
        day_of_month: 1,
        category: ''
    });

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('recurring_payments')
            .select('*')
            .eq('user_id', user.id)
            .order('day_of_month', { ascending: true });

        if (data) setPayments(data);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('recurring_payments').insert({
            user_id: user.id,
            name: newPayment.name,
            amount: newPayment.amount,
            day_of_month: newPayment.day_of_month,
            category: newPayment.category
        });

        if (!error) {
            setShowAdd(false);
            fetchPayments();
        }
    };

    const totalMonthly = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Pulse</h2>
                    <p className="text-muted-foreground">Manage your recurring monthly commitments.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={18} /> Add Payment
                </button>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Monthly Fixed Costs</p>
                    <h3 className="text-3xl font-bold">${totalMonthly.toLocaleString()}</h3>
                </div>
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Activity size={32} />
                </div>
            </div>

            {showAdd && (
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-5 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newPayment.name}
                                onChange={e => setNewPayment({ ...newPayment, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input
                                type="number" step="0.01"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newPayment.amount}
                                onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Day of Month</label>
                            <input
                                type="number" min="1" max="31"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newPayment.day_of_month}
                                onChange={e => setNewPayment({ ...newPayment, day_of_month: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                            Save
                        </button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center font-bold text-lg">
                                {payment.day_of_month}
                            </div>
                            <div>
                                <h4 className="font-semibold">{payment.name}</h4>
                                <p className="text-sm text-muted-foreground">{payment.category || 'General'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">${payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Calendar size={12} /> Monthly
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
