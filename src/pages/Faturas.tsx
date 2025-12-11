import { useEffect, useState } from 'react';
import { NotificationManager } from '../components/NotificationManager';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Plus, CreditCard as CardIcon, DollarSign, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CreditCard = Database['public']['Tables']['credit_cards']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Debt = Database['public']['Tables']['debts']['Row'];

export function Faturas() {
    const [activeTab, setActiveTab] = useState<'cartoes' | 'emprestimos'>('cartoes');
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);

    // Modal states
    const [showAddCard, setShowAddCard] = useState(false);
    const [showAddDebt, setShowAddDebt] = useState(false);
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

    const [newCard, setNewCard] = useState({
        name: '',
        closing_day: 1,
        due_day: 10,
        limit_amount: 1000
    });
    const [newDebt, setNewDebt] = useState({
        name: '',
        total_amount: 0,
        remaining_amount: 0,
        minimum_payment: 0,
        due_day: 10,
        debt_type: 'recurring' as 'recurring' | 'single',
        specific_due_date: ''
    });
    const [showAddInvoice, setShowAddInvoice] = useState<string | null>(null);
    const [newInvoice, setNewInvoice] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: 0
    });

    useEffect(() => {
        fetchCards();
        fetchDebts();
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

    const fetchDebts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id);

        if (data) setDebts(data);
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
            setNewCard({ name: '', closing_day: 1, due_day: 10, limit_amount: 1000 });
            fetchCards();
        }
    };

    const handleEditCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCard) return;

        const { error } = await supabase
            .from('credit_cards')
            .update({
                name: editingCard.name,
                closing_day: editingCard.closing_day,
                due_day: editingCard.due_day,
                limit_amount: editingCard.limit_amount
            })
            .eq('id', editingCard.id);

        if (!error) {
            setEditingCard(null);
            fetchCards();
        }
    };

    const handleDeleteCard = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cartão? Todas as faturas relacionadas também serão excluídas.')) return;

        const { error } = await supabase.from('credit_cards').delete().eq('id', id);
        if (!error) {
            fetchCards();
        }
    };

    const handleAddDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('debts').insert({
            user_id: user.id,
            name: newDebt.name,
            total_amount: newDebt.total_amount,
            remaining_amount: newDebt.remaining_amount || newDebt.total_amount,
            minimum_payment: newDebt.minimum_payment,
            due_day: newDebt.debt_type === 'recurring' ? newDebt.due_day : null,
            debt_type: newDebt.debt_type,
            specific_due_date: newDebt.debt_type === 'single' ? newDebt.specific_due_date : null
        });

        if (!error) {
            setShowAddDebt(false);
            setNewDebt({
                name: '',
                total_amount: 0,
                remaining_amount: 0,
                minimum_payment: 0,
                due_day: 10,
                debt_type: 'recurring',
                specific_due_date: ''
            });
            fetchDebts();
        }
    };

    const handleEditDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDebt) return;

        const { error } = await supabase
            .from('debts')
            .update({
                name: editingDebt.name,
                total_amount: editingDebt.total_amount,
                remaining_amount: editingDebt.remaining_amount,
                minimum_payment: editingDebt.minimum_payment,
                due_day: editingDebt.debt_type === 'recurring' ? editingDebt.due_day : null,
                debt_type: editingDebt.debt_type,
                specific_due_date: editingDebt.debt_type === 'single' ? editingDebt.specific_due_date : null
            })
            .eq('id', editingDebt.id);

        if (!error) {
            setEditingDebt(null);
            fetchDebts();
        }
    };

    const handleDeleteDebt = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este empréstimo?')) return;

        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (!error) {
            fetchDebts();
        }
    };

    const handleAddInvoice = async (e: React.FormEvent, cardId: string) => {
        e.preventDefault();

        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        const dueDate = new Date(newInvoice.year, newInvoice.month - 1, card.due_day);
        const closingDate = new Date(newInvoice.year, newInvoice.month - 1, card.closing_day);

        const { error } = await supabase.from('invoices').insert({
            credit_card_id: cardId,
            month: newInvoice.month,
            year: newInvoice.year,
            amount: newInvoice.amount,
            due_date: dueDate.toISOString().split('T')[0],
            closing_date: closingDate.toISOString().split('T')[0],
            status: 'open'
        });

        if (!error) {
            setShowAddInvoice(null);
            setNewInvoice({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 0 });
            alert('Fatura adicionada!');
        }
    };

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const formatDebtDueInfo = (debt: Debt) => {
        if (debt.debt_type === 'single' && debt.specific_due_date) {
            return `Vencimento: ${format(new Date(debt.specific_due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
        }
        return `Vencimento: dia ${debt.due_day} de cada mês`;
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Minhas Contas</h2>
                    <p className="text-muted-foreground">Gerencie seus cartões e empréstimos.</p>
                </div>

                <NotificationManager />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('cartoes')}
                    className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'cartoes'
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    💳 Cartões de Crédito
                    {activeTab === 'cartoes' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('emprestimos')}
                    className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'emprestimos'
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    💰 Empréstimos
                    {activeTab === 'emprestimos' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Cartões Tab */}
            {activeTab === 'cartoes' && (
                <div className="space-y-6">
                    <button
                        onClick={() => setShowAddCard(true)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Plus size={18} /> Adicionar Cartão
                    </button>

                    {showAddCard && (
                        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                            <h3 className="font-semibold mb-4">Novo Cartão</h3>
                            <form onSubmit={handleAddCard} className="grid gap-4 md:grid-cols-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome do Cartão</label>
                                    <input
                                        className="w-full px-3 py-2 rounded-lg bg-secondary"
                                        value={newCard.name}
                                        onChange={e => setNewCard({ ...newCard, name: e.target.value })}
                                        placeholder="Ex: Nubank"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Dia Fechamento</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full px-3 py-2 rounded-lg bg-secondary"
                                        value={newCard.closing_day}
                                        onChange={e => setNewCard({ ...newCard, closing_day: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Dia Vencimento</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full px-3 py-2 rounded-lg bg-secondary"
                                        value={newCard.due_day}
                                        onChange={e => setNewCard({ ...newCard, due_day: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                                        Salvar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCard(false)}
                                        className="px-4 py-2 rounded-lg bg-secondary"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {cards.map(card => (
                            <div key={card.id} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                                            <CardIcon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">{card.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Vencimento: dia {card.due_day} de cada mês
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingCard(card)}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCard(card.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {showAddInvoice === card.id ? (
                                    <form onSubmit={(e) => handleAddInvoice(e, card.id)} className="space-y-3 mt-4 pt-4 border-t border-border">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Mês</label>
                                                <select
                                                    className="w-full px-2 py-2 rounded-lg bg-secondary text-sm"
                                                    value={newInvoice.month}
                                                    onChange={e => setNewInvoice({ ...newInvoice, month: parseInt(e.target.value) })}
                                                >
                                                    {months.map((m, i) => (
                                                        <option key={i} value={i + 1}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Ano</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-2 rounded-lg bg-secondary text-sm"
                                                    value={newInvoice.year}
                                                    onChange={e => setNewInvoice({ ...newInvoice, year: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Valor (R$)</label>
                                                <input
                                                    type="number" step="0.01"
                                                    className="w-full px-2 py-2 rounded-lg bg-secondary text-sm"
                                                    value={newInvoice.amount}
                                                    onChange={e => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm">
                                                Adicionar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddInvoice(null)}
                                                className="px-3 py-2 rounded-lg bg-secondary text-sm"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setShowAddInvoice(card.id)}
                                        className="w-full mt-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                                    >
                                        + Adicionar Fatura
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {cards.length === 0 && !showAddCard && (
                        <div className="p-12 rounded-xl bg-card border border-dashed border-border text-center">
                            <CardIcon className="mx-auto mb-3 text-muted-foreground" size={48} />
                            <p className="text-muted-foreground mb-4">Nenhum cartão cadastrado.</p>
                            <button
                                onClick={() => setShowAddCard(true)}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg inline-flex items-center gap-2"
                            >
                                <Plus size={18} /> Adicionar Primeiro Cartão
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empréstimos Tab */}
            {activeTab === 'emprestimos' && (
                <div className="space-y-6">
                    <button
                        onClick={() => setShowAddDebt(true)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Plus size={18} /> Adicionar Empréstimo
                    </button>

                    {showAddDebt && (
                        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                            <h3 className="font-semibold mb-4">Novo Empréstimo</h3>
                            <form onSubmit={handleAddDebt} className="space-y-4">
                                {/* Tipo de Empréstimo */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tipo de Pagamento</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="debt_type"
                                                value="recurring"
                                                checked={newDebt.debt_type === 'recurring'}
                                                onChange={() => setNewDebt({ ...newDebt, debt_type: 'recurring' })}
                                                className="w-4 h-4"
                                            />
                                            <span>Mensal (recorrente)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="debt_type"
                                                value="single"
                                                checked={newDebt.debt_type === 'single'}
                                                onChange={() => setNewDebt({ ...newDebt, debt_type: 'single' })}
                                                className="w-4 h-4"
                                            />
                                            <span>Parcela única</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nome</label>
                                        <input
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={newDebt.name}
                                            onChange={e => setNewDebt({ ...newDebt, name: e.target.value })}
                                            placeholder="Ex: Empréstimo Banco X"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {newDebt.debt_type === 'single' ? 'Valor (R$)' : 'Total (R$)'}
                                        </label>
                                        <input
                                            type="number" step="0.01"
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={newDebt.total_amount}
                                            onChange={e => setNewDebt({ ...newDebt, total_amount: parseFloat(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    {newDebt.debt_type === 'recurring' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Parcela Mensal (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full px-3 py-2 rounded-lg bg-secondary"
                                                value={newDebt.minimum_payment}
                                                onChange={e => setNewDebt({ ...newDebt, minimum_payment: parseFloat(e.target.value) })}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                {newDebt.debt_type === 'recurring' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Dia do Vencimento (todo mês)</label>
                                        <input
                                            type="number" min="1" max="31"
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={newDebt.due_day}
                                            onChange={e => setNewDebt({ ...newDebt, due_day: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={newDebt.specific_due_date}
                                            onChange={e => setNewDebt({ ...newDebt, specific_due_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                                        Salvar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddDebt(false);
                                            setNewDebt({
                                                name: '',
                                                total_amount: 0,
                                                remaining_amount: 0,
                                                minimum_payment: 0,
                                                due_day: 10,
                                                debt_type: 'recurring',
                                                specific_due_date: ''
                                            });
                                        }}
                                        className="px-4 py-2 rounded-lg bg-secondary"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {debts.map(debt => {
                            const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;

                            return (
                                <div key={debt.id} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-full bg-orange-500/10 text-orange-500">
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold">{debt.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDebtDueInfo(debt)}
                                                </p>
                                                {debt.debt_type === 'single' && (
                                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                                                        Parcela Única
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingDebt(debt)}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDebt(debt.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                {debt.debt_type === 'single' ? 'Valor' : 'Valor Total'}
                                            </span>
                                            <span className="font-semibold">R$ {debt.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {debt.debt_type === 'recurring' && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Parcela Mensal</span>
                                                    <span className="font-semibold text-orange-500">R$ {debt.minimum_payment?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Saldo Restante</span>
                                                    <span className="font-bold">R$ {debt.remaining_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>Progresso</span>
                                                        <span>{progress.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {debts.length === 0 && !showAddDebt && (
                        <div className="p-12 rounded-xl bg-card border border-dashed border-border text-center">
                            <DollarSign className="mx-auto mb-3 text-muted-foreground" size={48} />
                            <p className="text-muted-foreground mb-4">Nenhum empréstimo cadastrado.</p>
                            <button
                                onClick={() => setShowAddDebt(true)}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg inline-flex items-center gap-2"
                            >
                                <Plus size={18} /> Adicionar Primeiro Empréstimo
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Edição de Cartão */}
            {editingCard && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-card rounded-xl p-6 max-w-md w-full border border-border shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Editar Cartão</h3>
                            <button onClick={() => setEditingCard(null)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditCard} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Cartão</label>
                                <input
                                    className="w-full px-3 py-2 rounded-lg bg-secondary"
                                    value={editingCard.name}
                                    onChange={e => setEditingCard({ ...editingCard, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Dia Fechamento</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full px-3 py-2 rounded-lg bg-secondary"
                                        value={editingCard.closing_day}
                                        onChange={e => setEditingCard({ ...editingCard, closing_day: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Dia Vencimento</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full px-3 py-2 rounded-lg bg-secondary"
                                        value={editingCard.due_day}
                                        onChange={e => setEditingCard({ ...editingCard, due_day: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium">
                                    Salvar Alterações
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCard(null)}
                                    className="px-4 py-3 rounded-lg bg-secondary font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Empréstimo */}
            {editingDebt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-card rounded-xl p-6 max-w-md w-full border border-border shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Editar Empréstimo</h3>
                            <button onClick={() => setEditingDebt(null)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditDebt} className="space-y-4">
                            {/* Tipo */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de Pagamento</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={editingDebt.debt_type === 'recurring'}
                                            onChange={() => setEditingDebt({ ...editingDebt, debt_type: 'recurring' })}
                                            className="w-4 h-4"
                                        />
                                        <span>Mensal</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={editingDebt.debt_type === 'single'}
                                            onChange={() => setEditingDebt({ ...editingDebt, debt_type: 'single' })}
                                            className="w-4 h-4"
                                        />
                                        <span>Parcela Única</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Nome</label>
                                <input
                                    className="w-full px-3 py-2 rounded-lg bg-secondary"
                                    value={editingDebt.name}
                                    onChange={e => setEditingDebt({ ...editingDebt, name: e.target.value })}
                                    required
                                />
                            </div>

                            {editingDebt.debt_type === 'recurring' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full px-3 py-2 rounded-lg bg-secondary"
                                                value={editingDebt.total_amount}
                                                onChange={e => setEditingDebt({ ...editingDebt, total_amount: parseFloat(e.target.value) })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Saldo Restante (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full px-3 py-2 rounded-lg bg-secondary"
                                                value={editingDebt.remaining_amount}
                                                onChange={e => setEditingDebt({ ...editingDebt, remaining_amount: parseFloat(e.target.value) })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Parcela Mensal (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full px-3 py-2 rounded-lg bg-secondary"
                                                value={editingDebt.minimum_payment || 0}
                                                onChange={e => setEditingDebt({ ...editingDebt, minimum_payment: parseFloat(e.target.value) })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Dia Vencimento</label>
                                            <input
                                                type="number" min="1" max="31"
                                                className="w-full px-3 py-2 rounded-lg bg-secondary"
                                                value={editingDebt.due_day || 10}
                                                onChange={e => setEditingDebt({ ...editingDebt, due_day: parseInt(e.target.value) })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                                        <input
                                            type="number" step="0.01"
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={editingDebt.total_amount}
                                            onChange={e => setEditingDebt({ ...editingDebt, total_amount: parseFloat(e.target.value), remaining_amount: parseFloat(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 rounded-lg bg-secondary"
                                            value={editingDebt.specific_due_date || ''}
                                            onChange={e => setEditingDebt({ ...editingDebt, specific_due_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium">
                                    Salvar Alterações
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingDebt(null)}
                                    className="px-4 py-3 rounded-lg bg-secondary font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
