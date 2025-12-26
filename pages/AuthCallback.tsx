import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../components/ui';
import { supabase } from '../lib/supabase';

const logError = (label: string, error: any) => {
  if (!error) return;
  console.error(label, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status
  });
};

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalisation de la connexion...');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    const run = async () => {
      console.info('[auth/callback] start', {
        href: window.location.href,
        pathname: window.location.pathname
      });
      if (!supabase) {
        setMessage("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
        return;
      }
      const url = window.location.href;
      const params = new URL(url).searchParams;
      const code = params.get('code');
      console.info('[auth/callback] code present', { hasCode: !!code });

      const sessionBefore = await supabase.auth.getSession();
      console.info('[auth/callback] getSession before', { hasSession: !!sessionBefore.data.session });

      if (!sessionBefore.data.session && code) {
        console.info('[auth/callback] exchangeCodeForSession start');
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        console.info('[auth/callback] exchangeCodeForSession result', {
          hasSession: !!data?.session
        });
        logError('[auth/callback] exchangeCodeForSession error', error);
      }

      const sessionAfter = await supabase.auth.getSession();
      console.info('[auth/callback] getSession after', { hasSession: !!sessionAfter.data.session });

      if (!sessionAfter.data.session) {
        setMessage('Aucune session détectée après OAuth. Vérifiez la configuration Supabase.');
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/dashboard', { replace: true });
    };

    run().catch((e) => {
      logError('[auth/callback] error', e);
      setMessage('Erreur de connexion OAuth. Vérifiez la configuration Supabase.');
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <p className="text-slate-600">{message}</p>
    </div>
  );
};
