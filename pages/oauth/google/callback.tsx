import React, { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const OAuthCallback = () => {
  useEffect(() => {
    (async () => {
      const code = new URLSearchParams(window.location.search).get('code');
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

  return <div />;
};

export default OAuthCallback;
