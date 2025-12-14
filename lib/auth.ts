import { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from './api';
import { supabase } from './supabase';

export const useAuth = (onSignIn?: () => void, onSignOut?: () => void) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        onSignIn?.();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        onSignOut?.();
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onSignIn, onSignOut]);

  return { user, loading };
};