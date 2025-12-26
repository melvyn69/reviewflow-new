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
  const [canRetry, setCanRetry] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (inFlightRef.current) return;
    const run = async () => {
      inFlightRef.current = true;
      setCanRetry(false);
      setMessage('Finalisation de la connexion...');
      console.info('[auth/callback] start', {
        href: window.location.href,
        pathname: window.location.pathname
      });
      if (window.location.pathname !== '/auth/callback') {
        console.warn('[auth/callback] guard: wrong path', { pathname: window.location.pathname });
        navigate('/dashboard', { replace: true });
        return;
      }
      if (!supabase) {
        setMessage("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      console.info('[auth/callback] code present', { hasCode: !!code });

      const sessionBefore = await supabase.auth.getSession();
      console.info('[auth/callback] getSession before', { hasSession: !!sessionBefore.data.session });

      if (!sessionBefore.data.session && code) {
        console.info('[auth/callback] exchangeCodeForSession start');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.info('[auth/callback] exchangeCodeForSession result', {
          hasSession: !!data?.session
        });
        logError('[auth/callback] exchangeCodeForSession error', error);
      }

      let sessionAfter = await supabase.auth.getSession();
      for (let attempt = 1; attempt <= 5 && !sessionAfter.data.session; attempt += 1) {
        console.info('[auth/callback] wait session retry', { attempt });
        await new Promise((resolve) => setTimeout(resolve, 200));
        sessionAfter = await supabase.auth.getSession();
      }
      console.info('[auth/callback] getSession after', { hasSession: !!sessionAfter.data.session });

      if (!sessionAfter.data.session) {
        setMessage('Aucune session détectée après OAuth. Réessayez.');
        setCanRetry(true);
        return;
      }

      window.history.replaceState({}, document.title, '/auth/callback');
      window.location.replace('/inbox');
    };

    run().catch((e) => {
      logError('[auth/callback] error', e);
      setMessage('Erreur de connexion OAuth. Vérifiez la configuration Supabase.');
      setCanRetry(true);
    }).finally(() => {
      inFlightRef.current = false;
    });
  }, [navigate, retryKey]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div>
        <p className="text-slate-600">{message}</p>
        {canRetry && (
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white"
            onClick={() => setRetryKey((prev) => prev + 1)}
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};
