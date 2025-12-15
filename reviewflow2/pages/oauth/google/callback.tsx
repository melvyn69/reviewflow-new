import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

function extractCodeFromLocation(): string | null {
  try {
    const url = new URL(window.location.href);
    let code = url.searchParams.get('code');
    if (code) return code;

    const hash = window.location.hash || '';
    // hash could be like #/oauth/google/callback?code=...
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const query = hash.slice(qIndex + 1);
      const params = new URLSearchParams(query);
      code = params.get('code');
      if (code) return code;
    }

    // fallback: try to find code pattern
    const m = window.location.href.match(/[?&]code=([^&#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch (e) {
    // ignore
  }
  return null;
}

export default function GoogleOAuthCallback() {
  const [status, setStatus] = useState('Connexion Google en cours…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    console.log('[OAUTH CALLBACK] mounted', window.location.href);

    (async () => {
      const code = extractCodeFromLocation();
      console.log('[OAUTH CALLBACK] code', code);

      if (!code) {
        setStatus('Aucun code trouvé');
        setErr('NO_CODE_FOUND');
        return;
      }

      setStatus('Envoi du code au serveur...');

      try {
        const invokePromise = supabase.functions.invoke('social_oauth', {
          body: { action: 'callback', platform: 'google', code },
        });

        const timeoutMs = 10000;
        const timeoutPromise = new Promise((_, rej) =>
          setTimeout(() => rej(new Error('TIMEOUT')), timeoutMs)
        );

        const res: any = await Promise.race([invokePromise, timeoutPromise]);

        // supabase returns { data, error }
        const data = res?.data ?? res;
        const error = res?.error ?? null;

        if (error) throw new Error(error.message || JSON.stringify(error));
        if (!data?.success) throw new Error(data?.error || 'UNKNOWN_ERROR');

        console.log('[OAUTH CALLBACK] success, redirecting');
        window.location.replace('/settings?connected=google');
      } catch (e: any) {
        console.error('[OAUTH CALLBACK] error', e);
        const msg = e?.message || String(e);
        if (msg === 'TIMEOUT') {
          setStatus('La requête a expiré');
          setErr('TIMEOUT');
        } else {
          setStatus('Erreur pendant la connexion Google');
          setErr(msg);
        }
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>{status}</h2>
      {err && (
        <>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{err}</pre>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.replace('/settings')}>Retour paramètres</button>
          </div>
        </>
      )}
    </div>
  );
}
