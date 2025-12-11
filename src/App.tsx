import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Faturas } from './pages/Faturas';
import { AuthPage } from './pages/Auth';
import { Reminders } from './pages/Reminders';
import { Calendar } from './pages/Calendar';
import { Loader2 } from 'lucide-react';

function App() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Force dark mode
        document.documentElement.classList.add('dark');

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {!session ? (
                    <>
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="*" element={<Navigate to="/auth" replace />} />
                    </>
                ) : (
                    <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/faturas" element={<Faturas />} />
                        <Route path="/lembretes" element={<Reminders />} />
                        <Route path="/calendario" element={<Calendar />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                )}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
