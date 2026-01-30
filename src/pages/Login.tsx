import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wallet } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Determine redirect URL based on environment
                emailRedirectTo: window.location.origin,
            }
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Lien magique envoyé ! Vérifiez votre boîte mail.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-indigo-100 rounded-full dark:bg-indigo-900/50">
                            <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Connexion</CardTitle>
                    <p className="text-slate-500 dark:text-slate-400">
                        Entrez votre email pour recevoir un lien de connexion magique.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                required
                            />
                        </div>
                        <Button className="w-full" disabled={loading}>
                            {loading ? 'Envoi...' : 'Envoyer le lien magique'}
                        </Button>
                        {message && (
                            <p className={`text-sm text-center ${message.includes('envoyé') ? 'text-green-600' : 'text-red-600'}`}>
                                {message}
                            </p>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
