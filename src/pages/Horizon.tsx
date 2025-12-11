import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Plus, CreditCard as CardIcon } from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfMonth, endOfMonth, getDate } from 'date-fns';

type CreditCard = Database['public']['Tables']['credit_cards']['Row'];

export function Horizon() {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [showAddCard, setShowAddCard] = useState(false);
    const [newCard, setNewCard] = useState({ name: '', closing_day: 1, due_day: 10, limit_amount: 0 });

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('user_id', user.id);

        if (data) setCards(data);
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('credit_cards').insert({
            user_id: user.id,
            name: newCard.name,
            closing_day: newCard.closing_day,
            due_day: newCard.due_day,
            limit_amount: newCard.limit_amount
        });

        if (!error) {
            setShowAddCard(false);
            fetchCards();
        }
    };

    // Helper to determine the status of a day relative to the card's cycle
    const getDayStatus = (day: number, card: CreditCard) => {
        const today = new Date();
        const currentDay = today.getDate();

        // Simple logic for visualization:
        // Green: Best day to buy (after closing, before due)
        // Red: Close to due date
        // Yellow: Approaching closing date

        if (day === card.closing_day) return 'bg-yellow-500/50';
        if (day === card.due_day) return 'bg-red-500/50';

        // If closing day is before due day (standard)
        if (card.closing_day < card.due_day) {
            if (day > card.closing_day && day < card.due_day) return 'bg-green-500/30'; // Best time
        } else {
            // Wrap around month
            if (day > card.closing_day || day < card.due_day) return 'bg-green-500/30';
        }

        return 'bg-secondary';
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Horizon</h2>
                    <p className="text-muted-foreground">Visualize your credit card cycles and optimize cash flow.</p>
                </div>
                <button
                    onClick={() => setShowAddCard(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={18} /> Add Card
                </button>
            </div>

            {showAddCard && (
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAddCard} className="grid gap-4 md:grid-cols-4 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-1">Card Name</label>
                            <input
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newCard.name}
                                onChange={e => setNewCard({ ...newCard, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Closing Day</label>
                            <input
                                type="number" min="1" max="31"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newCard.closing_day}
                                onChange={e => setNewCard({ ...newCard, closing_day: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Due Day</label>
                            <input
                                type="number" min="1" max="31"
                                className="w-full px-3 py-2 rounded-lg bg-secondary border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                                value={newCard.due_day}
                                onChange={e => setNewCard({ ...newCard, due_day: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                            Save Card
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-6">
                {cards.map(card => (
                    <div key={card.id} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <CardIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">{card.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Closes on {card.closing_day} • Due on {card.due_day}
                                </p>
                            </div>
                        </div>

                        {/* Visual Timeline */}
                        <div className="relative">
                            <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                <span>1st</span>
                                <span>15th</span>
                                <span>30th</span>
                            </div>
                            <div className="h-8 flex rounded-full overflow-hidden border border-border">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                                    <div
                                        key={day}
                                        className={`flex-1 border-r border-background/10 last:border-0 ${getDayStatus(day, card)}`}
                                        title={`Day ${day}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-2 flex gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                                    <span>Best Buy</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                    <span>Closing</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <span>Due Date</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
