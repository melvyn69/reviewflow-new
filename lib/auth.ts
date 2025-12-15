import { useEffect, useState, useRef } from 'react';
import { User } from '../types';
import { api } from './api';
import { supabase } from './supabase';

export const useAuth = (onSignIn?: () => void, onSignOut?: () => void) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep latest callbacks in refs to avoid re-subscribing when parent recreates handlers
  const onSignInRef = useRef(onSignIn);
  const onSignOutRef = useRef(onSignOut);

  useEffect(() => {
    onSignInRef.current = onSignIn;
    onSignOutRef.current = onSignOut;
  }, [onSignIn, onSignOut]);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const userData = await api.auth.getUser();
        if (mounted) setUser(userData);
      } catch (err) {
        console.error('Session check failed', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
        const providerToken = (session as any).provider_token;
        if (providerToken) {
          await api.organization.saveGoogleTokens();
        }
        const userData = await api.auth.getUser();
        setUser(userData);
        try { onSignInRef.current?.(); } catch (e) { console.warn('onSignIn handler failed', e); }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        try { onSignOutRef.current?.(); } catch (e) { console.warn('onSignOut handler failed', e); }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};