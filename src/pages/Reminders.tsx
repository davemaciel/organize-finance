import { NotificationManager } from '../components/NotificationManager';
import { Bell } from 'lucide-react';

export function Reminders() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Lembretes 🔔</h2>
                <p className="text-muted-foreground">Gerencie suas notificações e alertas.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Configuração de Notificações</h3>
                        <p className="text-sm text-muted-foreground">
                            Ative as notificações para receber alertas antes do vencimento das suas contas.
                        </p>
                    </div>
                </div>

                <NotificationManager />
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4">Como funciona?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>Você receberá notificações 3 dias antes do vencimento.</li>
                    <li>Você receberá notificações 1 dia antes do vencimento.</li>
                    <li>Você receberá notificações no dia do vencimento.</li>
                    <li>As notificações funcionam tanto no celular quanto no computador (se permitido).</li>
                </ul>
            </div>
        </div>
    );
}
