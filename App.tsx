
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, ToastProvider, useToast } from './components/ui';
import { AppLayout } from './components/Layout';
import { InboxPage } from './pages/Inbox';
import { AnalyticsPage } from './pages/Analytics';
import { DashboardPage } from './pages/Dashboard';
import { AutomationPage } from './pages/Automation';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { BillingPage } from './pages/Billing';
import { PlaygroundPage } from './pages/Playground';
import { CollectPage } from './pages/Collect';
import { AuthPage } from './pages/Auth';
import { LandingPage } from './pages/Landing';
import { LegalPage, PrivacyPage, ContactPage } from './pages/Legal';
import { ReviewFunnel } from './pages/ReviewFunnel';
import { WidgetPage } from './pages/Widget';
import { HelpPage } from './pages/Help';
import { CustomersPage } from './pages/Customers';
import { SuperAdminPage } from './pages/SuperAdmin';
import { CompetitorsPage } from './pages/Competitors';
import { BookDemoPage } from './pages/BookDemo';
import { OnboardingPage } from './pages/Onboarding';
import { TeamPage } from './pages/Team';
import { OffersPage } from './pages/Offers';
import { SocialPage } from './pages/Social';
import { PublicProfilePage } from './pages/PublicProfile';
import { AuthCallbackPage } from './pages/AuthCallback';
import { api } from './lib/api';
import { Organization, User } from './types';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ENABLE_EXTRAS } from './lib/flags';
import { supabase } from './lib/supabase';

if (typeof window !== 'undefined' && !(window as any).__FETCH_HOOKED__) {
  (window as any).__FETCH_HOOKED__ = true;
  const _fetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      console.info('[fetch] ->', args[0]);
      const res = await _fetch(...args);
      console.info('[fetch] <-', args[0], res.status);
      return res;
    } catch (e) {
      console.error('[fetch] !!', args[0], e);
      throw e;
    }
  };
}

// ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

interface ProtectedRouteProps {
  children?: React.ReactNode;
  user: User | null;
  authStatus: 'booting' | 'authenticated' | 'unauthenticated';
  allowedRoles?: string[];
}

const DEFAULT_PRIVATE_ROUTE = ENABLE_EXTRAS ? '/dashboard' : '/inbox';

const ProtectedRoute = ({ children, user, authStatus, allowedRoles }: ProtectedRouteProps) => {
  if (authStatus === 'booting' || (authStatus === 'authenticated' && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user is restricted, redirect to dashboard
    return <Navigate to={DEFAULT_PRIVATE_ROUTE} replace />;
  }

  return <>{children}</>;
};

// Wrapper to handle auth check on initial load
function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [authStatus, setAuthStatus] = useState<'booting' | 'authenticated' | 'unauthenticated'>('booting');
  const [isSyncing, setIsSyncing] = useState(false);
  const [orgFetchDegraded, setOrgFetchDegraded] = useState(false);
  const defaultPrivateRoute = DEFAULT_PRIVATE_ROUTE;
  const navigate = useNavigate();
  const toast = useToast();
  const orgInitAttempted = useRef(false);
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const tokensSavedRef = useRef(false);
  const hasLoggedBuildRef = useRef(false);
  const isAuthCallback = () => window.location.pathname === '/auth/callback';
  const sessionEstablishedRef = useRef(false);
  const authStatusRef = useRef<'booting' | 'authenticated' | 'unauthenticated'>('booting');
  const bootstrapAttemptRef = useRef(0);
  const bootstrapRetryScheduledRef = useRef(false);
  const lastRedirectRef = useRef<string | null>(null);
  const location = useLocation();
  const checkUserRetryScheduledRef = useRef(false);
  const orgFetchInFlightRef = useRef(false);
  const orgFetchAttemptRef = useRef(0);
  const orgFetchRetryTimerRef = useRef<number | null>(null);

  const logStep = (label: string, start: number, extra?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - start);
    console.info(`[auth] ${label} (${ms}ms)`, extra || {});
  };

  const buildFallbackUser = (sessionUser: any): User => {
    return {
      id: sessionUser.id,
      email: sessionUser.email || '',
      organization_id: null
    };
  };

  const logSlow = (label: string, ms = 2000) => {
    const timer = window.setTimeout(() => {
      console.warn('[auth] slow request', { label, ms });
    }, ms);
    return () => window.clearTimeout(timer);
  };

  const setAuthStatusSafe = (next: 'booting' | 'authenticated' | 'unauthenticated', reason?: string) => {
    if (authStatusRef.current === next) return;
    if (authStatusRef.current === 'authenticated' && next === 'booting') return;
    const prev = authStatusRef.current;
    authStatusRef.current = next;
    console.info('[auth] status', {
      from: prev,
      to: next,
      at: new Date().toISOString(),
      reason
    });
    setAuthStatus(next);
  };

  const isPublicPath = (path: string) => {
    if (path === '/' || path === '/login' || path === '/register') return true;
    if (path === '/legal' || path === '/privacy' || path === '/contact') return true;
    if (path === '/auth/callback' || path === '/book-demo') return true;
    if (path.startsWith('/feedback/')) return true;
    if (path.startsWith('/widget/')) return true;
    if (path.startsWith('/v/')) return true;
    return false;
  };

  const isGetSessionTimeout = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('supabase.auth.getsession') && message.includes('timeout');
  };

  const isTimeoutError = (error: any) => {
    return String(error?.message || '').toLowerCase().includes('timeout');
  };

  const isInvalidRefreshToken = (error: any) => {
    const message = String(error?.message || '');
    return message.includes('Invalid Refresh Token') || (error?.status === 400 && message.includes('Refresh Token'));
  };

  const handleInvalidRefreshToken = async (error: any, context: string) => {
    if (!isInvalidRefreshToken(error)) return false;
    console.warn('[auth] invalid refresh token', { context });
    try {
      await supabase?.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[auth] signOut local failed', e);
    }
    window.location.replace('/?reauth=1');
    return true;
  };

  const getSessionFallbackUser = async (): Promise<Pick<User, 'id' | 'email' | 'organization_id'> | null> => {
    try {
      const sessionRes = await supabase!.auth.getSession();
      const sessionUser = sessionRes.data.session?.user;
      if (!sessionUser) return null;
      return {
        id: sessionUser.id,
        email: sessionUser.email || '',
        organization_id: null
      };
    } catch (e) {
      console.warn('[auth] fallback getSession failed', e);
      return null;
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    const start = performance.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        logStep(`${label} timeout`, start);
        reject(new Error(`${label} timeout`));
      }, ms);
    });

    try {
      const result = await Promise.race([
        promise.then((value) => {
          logStep(`${label} ok`, start);
          return value;
        }),
        timeoutPromise
      ]);
      return result as T;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      bootstrapImmediate(isAuthCallback());
    }
    if (!hasLoggedBuildRef.current) {
      hasLoggedBuildRef.current = true;
      const commit =
        (import.meta as any).env?.VITE_COMMIT_SHA ||
        (import.meta as any).env?.VERCEL_GIT_COMMIT_SHA ||
        'unknown';
      console.info('[build]', window.location.origin, 'commit:', commit);
    }
    if (!supabase) {
      const msg = "Supabase non configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.";
      console.error('[auth] supabase missing');
      setAuthStatusSafe('unauthenticated', msg);
      return;
    }
    const authListener =
      supabase?.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          setAuthStatusSafe('authenticated', `onAuthStateChange:${event}`);
          if (!user && session.user) {
            setUser(buildFallbackUser(session.user));
          }
          console.info('[oauth] tokens present', {
            hasProviderToken: !!session?.provider_token,
            hasProviderRefreshToken: !!session?.provider_refresh_token
          });
          if ((session.provider_token || session.provider_refresh_token) && !tokensSavedRef.current) {
            tokensSavedRef.current = true;
            (window as any).__rf_metrics = (window as any).__rf_metrics || {};
            (window as any).__rf_metrics.saveGoogleTokensCalls =
              ((window as any).__rf_metrics.saveGoogleTokensCalls || 0) + 1;
            try {
              if (isAuthCallback()) {
                console.info('[rpc] skip save_google_tokens on /auth/callback');
                return;
              }
              console.info('[rpc] save_google_tokens start');
              const { error } = await supabase.rpc('save_google_tokens', {
                access_token: session.provider_token ?? null,
                refresh_token: session.provider_refresh_token ?? null
              });
              if (error) {
                console.error("Failed to save Google tokens", error);
              } else {
                console.info('[rpc] save_google_tokens ok');
              }
            } catch (e) {
              console.error("Failed to save Google tokens", e);
            }
          }
          if (!isAuthCallback()) {
            await checkUser();
            if (
              window.location.pathname === '/' ||
              window.location.pathname.includes('/login') ||
              window.location.pathname.includes('/register')
            ) {
              navigate(defaultPrivateRoute);
            }
          } else {
            window.setTimeout(() => {
              if (!isAuthCallback()) {
                checkUser();
              }
            }, 150);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrg(null);
          setAuthStatusSafe('unauthenticated', 'onAuthStateChange:SIGNED_OUT');
          navigate('/');
        }
      }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus === 'booting') return;
    const path = location.pathname;
    if (authStatus === 'authenticated') {
      if (path === '/' || path === '/login' || path === '/register') {
        if (lastRedirectRef.current !== 'auth_to_private') {
          lastRedirectRef.current = 'auth_to_private';
          navigate(DEFAULT_PRIVATE_ROUTE, { replace: true });
        }
      }
      return;
    }

    if (authStatus === 'unauthenticated' && !isPublicPath(path)) {
      if (lastRedirectRef.current !== 'unauth_to_login') {
        lastRedirectRef.current = 'unauth_to_login';
        navigate('/login', { replace: true });
      }
    }
  }, [authStatus, location.pathname, navigate]);

  const bootstrapImmediate = async (skipCheckUser: boolean) => {
    try {
      bootstrapAttemptRef.current += 1;
      console.info('[auth] bootstrap attempt', { attempt: bootstrapAttemptRef.current });
      if (isAuthCallback()) {
        console.info('[auth] skip bootstrap on /auth/callback');
        return;
      }
      const code = new URLSearchParams(window.location.search).get('code');
      if (code && window.location.pathname !== '/auth/callback') {
        console.warn('[bootstrap] redirecting to /auth/callback', { pathname: window.location.pathname });
        window.location.replace(`/auth/callback${window.location.search}`);
        return;
      }
      const sessionStart = performance.now();
      let sessionRes = await supabase!.auth.getSession();
      logStep('[bootstrap] getSession done', sessionStart, { hasSession: !!sessionRes.data.session });
      const sessionUser = sessionRes.data.session?.user;
      if (sessionUser && !sessionEstablishedRef.current) {
        sessionEstablishedRef.current = true;
      }
      if (sessionUser) {
        setAuthStatusSafe('authenticated', 'session_present');
      }

      if (sessionUser) {
        setUser(buildFallbackUser(sessionUser));
        if (
          window.location.pathname === '/' ||
          window.location.pathname.includes('/login') ||
          window.location.pathname.includes('/register')
        ) {
          navigate(defaultPrivateRoute);
        }
      }

      if (skipCheckUser) {
        if (!sessionUser) {
          setAuthStatusSafe('unauthenticated', 'bootstrap:no_session_skip');
        }
        return;
      }

      if (!sessionUser) {
        setAuthStatusSafe('unauthenticated', 'bootstrap:no_session');
        return;
      }

      // Background profile/org fetch (non-blocking)
      checkUser();
    } catch (e: any) {
      if (await handleInvalidRefreshToken(e, 'bootstrapImmediate')) return;
      console.error('[bootstrap] error', e);
      if (!bootstrapRetryScheduledRef.current) {
        bootstrapRetryScheduledRef.current = true;
        console.warn('[bootstrap] getSession timeout -> retry scheduled');
        window.setTimeout(() => {
          bootstrapRetryScheduledRef.current = false;
          bootstrapImmediate(skipCheckUser);
        }, 500);
        return;
      }
      setAuthStatusSafe('unauthenticated', 'bootstrap:error');
    }
  };

  const checkUser = async () => {
    if (authStatusRef.current !== 'authenticated') return;
    if (isAuthCallback()) {
      console.info('[auth] skip checkUser on /auth/callback');
      return;
    }
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsSyncing(true);
    try {
      console.info('[auth] checkUser start');
      const userStart = performance.now();
      const clearSlow = logSlow('api.auth.getUser');
      let userData: User | null = null;
      try {
        userData = await api.auth.getUser();
      } catch (e: any) {
        clearSlow();
        if (isTimeoutError(e)) {
          console.warn('[auth] api.auth.getUser timeout → fallback session.user');
          const fallbackUser = await getSessionFallbackUser();
          if (fallbackUser) {
            setUser(fallbackUser as User);
          }
          if (!checkUserRetryScheduledRef.current) {
            checkUserRetryScheduledRef.current = true;
            window.setTimeout(() => {
              checkUserRetryScheduledRef.current = false;
              if (authStatusRef.current === 'authenticated' && !isCheckingRef.current) {
                checkUser();
              }
            }, 500);
          }
          return;
        }
        throw e;
      }
      clearSlow();
      logStep('[auth] api.auth.getUser done', userStart, { hasUser: !!userData, userId: userData?.id });
      console.info('[auth] checkUser getUser done', { hasUser: !!userData, userId: userData?.id });
      if (!userData) {
        console.warn('[auth] checkUser: no user profile, keeping fallback user');
        return;
      }
      if (userData?.id !== lastUserIdRef.current) {
        orgInitAttempted.current = false;
        tokensSavedRef.current = false;
        lastUserIdRef.current = userData?.id || null;
      }
      if (userData && !userData.organization_id && !orgInitAttempted.current) {
        orgInitAttempted.current = true;
        try {
          console.info('[auth] ensureDefaultForCurrentUser start');
          await api.organization.ensureDefaultForCurrentUser();
          console.info('[auth] ensureDefaultForCurrentUser done');
          const refreshedStart = performance.now();
          const refreshedUser = await api.auth.getUser();
          logStep('[auth] api.auth.getUser refreshed done', refreshedStart, { hasUser: !!refreshedUser, orgId: refreshedUser?.organization_id });
          console.info('[auth] checkUser refreshed user', { hasUser: !!refreshedUser, orgId: refreshedUser?.organization_id });
          setUser(refreshedUser);
          setAuthStatusSafe('authenticated', 'checkUser:refreshed');
        } catch (e: any) {
          console.error("Org init failed", e);
          toast.error("Impossible de créer votre organisation. Vérifiez la configuration Supabase.");
          setUser(userData);
        }
      } else {
        setUser(userData);
        if (userData) {
          setAuthStatusSafe('authenticated', 'checkUser:userData');
        } else {
          setAuthStatusSafe('unauthenticated', 'checkUser:no_user');
        }
      }
    } catch (e: any) {
      if (isGetSessionTimeout(e)) {
        console.warn('[auth] checkUser getSession timeout', e);
        return;
      }
      if (await handleInvalidRefreshToken(e, 'checkUser')) return;
      console.error('[auth] checkUser error', e);
      // Non-fatal: do not flip to unauthenticated unless explicitly no session
    } finally {
      console.info('[auth] checkUser done');
      setIsSyncing(false);
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) {
      setOrg(null);
      setOrgFetchDegraded(false);
      orgFetchAttemptRef.current = 0;
      if (orgFetchRetryTimerRef.current) {
        window.clearTimeout(orgFetchRetryTimerRef.current);
        orgFetchRetryTimerRef.current = null;
      }
      return;
    }
    if (isAuthCallback()) {
      console.info('[auth] skip org fetch on /auth/callback');
      setOrgFetchDegraded(false);
      return;
    }
    const fetchOrg = async () => {
      if (orgFetchInFlightRef.current) return;
      if (orgFetchRetryTimerRef.current) return;
      orgFetchInFlightRef.current = true;

      orgFetchAttemptRef.current += 1;
      const attempt = orgFetchAttemptRef.current;
      console.info('[auth] org fetch start', { attempt });
      setIsSyncing(true);
      setOrgFetchDegraded(false);

      try {
        const nextOrg = await withTimeout(
          api.organization.get(),
          20000,
          'api.organization.get'
        );
        console.info('[auth] org fetch done', { hasOrg: !!nextOrg, orgId: nextOrg?.id });
        setOrg(nextOrg);
        orgFetchAttemptRef.current = 0;
      } catch (e) {
        console.warn('[auth] org fetch error', e);
        if (attempt >= 3) {
          console.warn('[auth] org fetch: max retries reached -> degraded mode');
          setOrg(null);
          setOrgFetchDegraded(true);
          return;
        }
        const delay = [1000, 3000, 7000][attempt - 1] ?? 7000;
        orgFetchRetryTimerRef.current = window.setTimeout(() => {
          orgFetchRetryTimerRef.current = null;
          fetchOrg();
        }, delay);
      } finally {
        setIsSyncing(false);
        orgFetchInFlightRef.current = false;
      }
    };

    fetchOrg();
    return () => {
      if (orgFetchRetryTimerRef.current) {
        window.clearTimeout(orgFetchRetryTimerRef.current);
        orgFetchRetryTimerRef.current = null;
      }
    };
  }, [user?.id]);

  const showSpinner = authStatus === 'booting';

  return (
    <>
      {showSpinner && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
      {!showSpinner && (
        <>
          {authStatus === 'authenticated' && isSyncing && (
            <div className="bg-amber-50 text-amber-900 text-sm px-4 py-2">
              Session active. Synchronisation en cours...
            </div>
          )}
          {authStatus === 'authenticated' && orgFetchDegraded && (
            <div className="bg-amber-50 text-amber-900 text-sm px-4 py-2">
              Organisation non chargée, réessai en arrière-plan.
            </div>
          )}
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={user ? <Navigate to={defaultPrivateRoute} replace /> : <LandingPage />} />
            <Route path="/login" element={user ? <Navigate to={defaultPrivateRoute} replace /> : <AuthPage initialMode="login" onLoginSuccess={checkUser} />} />
            <Route path="/book-demo" element={ENABLE_EXTRAS ? <BookDemoPage /> : <Navigate to="/" replace />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
        
            {/* Hidden Registration */}
            <Route path="/register" element={user ? <Navigate to={defaultPrivateRoute} replace /> : <AuthPage initialMode="register" onLoginSuccess={checkUser} />} />
        
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/feedback/:locationId" element={ENABLE_EXTRAS ? <ReviewFunnel /> : <Navigate to="/" replace />} />
            <Route path="/widget/:locationId" element={ENABLE_EXTRAS ? <WidgetPage /> : <Navigate to="/" replace />} />
            <Route path="/v/:locationId" element={ENABLE_EXTRAS ? <PublicProfilePage /> : <Navigate to="/" replace />} />
        
            {/* Protected Route: Onboarding (No Layout) */}
            <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" replace />} />

            {/* Protected Routes (App Layout) */}
            <Route path="/*" element={
                <ProtectedRoute user={user} authStatus={authStatus}>
                    <AppLayout user={user} org={org}>
                        <Routes>
                            <Route path="dashboard" element={ENABLE_EXTRAS ? <DashboardPage user={user} /> : <Navigate to="/inbox" replace />} />
                            <Route path="inbox" element={<InboxPage />} />
                            <Route path="social" element={ENABLE_EXTRAS ? <SocialPage /> : <Navigate to="/inbox" replace />} /> 
                            <Route path="analytics" element={ENABLE_EXTRAS ? <AnalyticsPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="competitors" element={ENABLE_EXTRAS ? <CompetitorsPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="automation" element={ENABLE_EXTRAS ? <AutomationPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="collect" element={ENABLE_EXTRAS ? <CollectPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="customers" element={ENABLE_EXTRAS ? <CustomersPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="offers" element={ENABLE_EXTRAS ? <OffersPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="reports" element={ENABLE_EXTRAS ? <ReportsPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="help" element={ENABLE_EXTRAS ? <HelpPage /> : <Navigate to="/inbox" replace />} />
                            <Route path="playground" element={ENABLE_EXTRAS ? <PlaygroundPage /> : <Navigate to="/inbox" replace />} />
                        
                            {/* Sensitive Routes - Admin Only */}
                            <Route 
                                path="settings" 
                                element={<ProtectedRoute user={user} authStatus={authStatus} allowedRoles={['admin', 'super_admin']}><SettingsPage /></ProtectedRoute>} 
                            />
                            <Route 
                                path="billing" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} authStatus={authStatus} allowedRoles={['admin', 'super_admin']}><BillingPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
                            />
                            <Route 
                                path="team" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} authStatus={authStatus} allowedRoles={['admin', 'super_admin']}><TeamPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
                            />
                        
                            {/* Super Admin Route */}
                            <Route 
                                path="admin" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} authStatus={authStatus} allowedRoles={['super_admin']}><SuperAdminPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
                            />
                        
                            {/* Fallback for protected routes */}
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </AppLayout>
                </ProtectedRoute>
            } />
          </Routes>
        </>
      )}
    </>
  );
}

const App = () => {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  );
};

export default App;
