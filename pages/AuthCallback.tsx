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

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
  });
  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const isTimeoutError = (error: any) => {
  return String(error?.message || '').toLowerCase().includes('timeout');
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

      let sessionBefore;
      try {
        sessionBefore = await withTimeout(supabase.auth.getSession(), 8000, 'auth.getSession before');
      } catch (e) {
        logError('[auth/callback] getSession before error', e);
        if (isTimeoutError(e)) {
          setMessage('Délai dépassé lors de la récupération de session. Réessayez.');
          setCanRetry(true);
          return;
        }
        throw e;
      }
      console.info('[auth/callback] getSession before', { hasSession: !!sessionBefore.data.session });

      if (!sessionBefore.data.session && code) {
        console.info('[auth/callback] exchangeCodeForSession start');
        let exchangeResult;
        try {
          exchangeResult = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            12000,
            'auth.exchangeCodeForSession'
          );
        } catch (e) {
          logError('[auth/callback] exchangeCodeForSession error', e);
          if (isTimeoutError(e)) {
            setMessage('Délai dépassé lors de l’échange OAuth. Réessayez.');
            setCanRetry(true);
            return;
          }
          throw e;
        }
        const { data, error } = exchangeResult as any;
        console.info('[auth/callback] exchangeCodeForSession result', {
          hasSession: !!data?.session
        });
        logError('[auth/callback] exchangeCodeForSession error', error);
      }

      let sessionAfter;
      try {
        sessionAfter = await withTimeout(supabase.auth.getSession(), 8000, 'auth.getSession after');
      } catch (e) {
        logError('[auth/callback] getSession after error', e);
        if (isTimeoutError(e)) {
          setMessage('Délai dépassé lors de la récupération de session. Réessayez.');
          setCanRetry(true);
          return;
        }
        throw e;
      }
      for (let attempt = 1; attempt <= 5 && !sessionAfter.data.session; attempt += 1) {
        console.info('[auth/callback] wait session retry', { attempt });
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
          sessionAfter = await withTimeout(supabase.auth.getSession(), 8000, 'auth.getSession after');
        } catch (e) {
          logError('[auth/callback] getSession after error', e);
          if (isTimeoutError(e)) {
            setMessage('Délai dépassé lors de la récupération de session. Réessayez.');
            setCanRetry(true);
            return;
          }
          throw e;
        }
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
