import React, { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const OAuthCallback = () => {
  console.log('CALLBACK_PAGE_MOUNTED', window.location.href);

  useEffect(() => {
    (async () => {
      const href = window.location.href;

      // 1) normal: ?code=...
      let code = new URL(href).searchParams.get('code');

      // 2) hashrouter: #/oauth/google/callback?code=...
      if (!code) {
        const hash = window.location.hash || '';
        const qs = hash.includes('?') ? hash.split('?')[1] : '';
        code = new URLSearchParams(qs).get('code');
      }

      if (!code) {
        alert('NO_CODE_FOUND');
        return;
      }

      const redirectUri = `${window.location.origin}/oauth/google/callback`;

      const { error } = await supabase.functions.invoke('social_oauth', {
        body: { action: 'callback', platform: 'google', code, redirectUri },
      });

      console.log('oauth error =', error);
      alert(error ? JSON.stringify(error, null, 2) : 'OK');

      if (error) throw error;
      window.location.href = '/settings';
    })();
  }, []);

  return <div>Callback Google en cours…</div>;
};

export default OAuthCallback;
