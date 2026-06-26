import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MailX } from 'lucide-react';
import { supabase } from '../supabase';

const PublicEmailUnsubscribePage: React.FC = () => {
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const projectId = params.get('projectId') || params.get('storeId') || '';
    const email = params.get('email') || '';
    const emailLogId = params.get('emailLogId') || '';
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            if (!projectId || !email || !emailLogId) {
                setStatus('error');
                setMessage('This unsubscribe link is incomplete.');
                return;
            }

            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'unsubscribe',
                    projectId,
                    email,
                    emailLogId,
                },
            });

            if (!mounted) return;
            if (error || data?.success === false) {
                setStatus('error');
                setMessage(data?.error || error?.message || 'We could not process this unsubscribe request.');
                return;
            }
            setStatus('success');
            setMessage('You have been unsubscribed from marketing emails for this project.');
        };

        run();
        return () => { mounted = false; };
    }, [projectId, email, emailLogId]);

    return (
        <main className="min-h-screen bg-q-bg px-4 py-12 text-q-text">
            <section className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-q-border bg-q-surface p-8 text-center shadow-xl">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-q-accent/10 text-q-accent">
                    {status === 'loading' && <Loader2 className="animate-spin" size={26} />}
                    {status === 'success' && <CheckCircle2 size={26} />}
                    {status === 'error' && <AlertTriangle size={26} />}
                </div>
                <MailX className="mb-3 text-q-text-muted" size={22} />
                <h1 className="text-xl font-bold">
                    {status === 'success' ? 'Unsubscribed' : status === 'error' ? 'Unsubscribe issue' : 'Processing unsubscribe'}
                </h1>
                <p className="mt-3 text-sm leading-6 text-q-text-secondary">
                    {message || 'Please wait while we update your email preferences.'}
                </p>
                <a href="/" className="mt-6 rounded-xl border border-q-border px-4 py-2 text-sm font-semibold text-q-text transition hover:bg-q-bg">
                    Go to Quimera
                </a>
            </section>
        </main>
    );
};

export default PublicEmailUnsubscribePage;
