import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Plus, Mountain as MountainIcon, Trash2 } from 'lucide-react';

type Debt = Database['public']['Tables']['debts']['Row'];

export function Mountain() {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newDebt, setNewDebt] = useState({
        name: '',
        total_amount: 0,
        remaining_amount: 0,
        interest_rate: 0
    });

    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id);

        if (data) setDebts(data);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('debts').insert({
            user_id: user.id,
            name: newDebt.name,
            total_amount: newDebt.total_amount,
            remaining_amount: newDebt.remaining_amount || newDebt.total_amount,
            interest_rate: newDebt.interest_rate
        });

        if (!error) {
            setShowAdd(false);
            fetchDebts();
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (!error) fetchDebts();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mountain</h2>
                    <p className="text-muted-foreground">Track your journey to debt freedom.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={18} /> Add Debt
                </button>
            </div>

            {showAdd && (
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-5 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Debt Name</label>
                            <input
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newDebt.name}
                                onChange={e => setNewDebt({ ...newDebt, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Total Amount</label>
                            <input
                                type="number" step="0.01"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newDebt.total_amount}
                                onChange={e => setNewDebt({ ...newDebt, total_amount: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                            <input
                                type="number" step="0.1"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newDebt.interest_rate}
                                onChange={e => setNewDebt({ ...newDebt, interest_rate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                            Save
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {debts.map(debt => {
                    const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;

                    return (
                        <div key={debt.id} className="p-6 rounded-xl bg-card border border-border shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                                    <MountainIcon size={24} />
                                </div>
                                <button
                                    onClick={() => handleDelete(debt.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold mb-1">{debt.name}</h3>
                            <p className="text-2xl font-bold text-foreground mb-4">
                                ${debt.remaining_amount.toLocaleString()}
                                <span className="text-sm text-muted-foreground font-normal"> / ${debt.total_amount.toLocaleString()}</span>
                            </p>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Visual "Mountain" effect */}
                            <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                                <MountainIcon size={150} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
