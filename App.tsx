
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
  allowedRoles?: string[];
}

const DEFAULT_PRIVATE_ROUTE = ENABLE_EXTRAS ? '/dashboard' : '/inbox';

const ProtectedRoute = ({ children, user, allowedRoles }: ProtectedRouteProps) => {
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
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const defaultPrivateRoute = DEFAULT_PRIVATE_ROUTE;
  const navigate = useNavigate();
  const toast = useToast();
  const orgInitAttempted = useRef(false);
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const tokensSavedRef = useRef(false);
  const hasLoggedBuildRef = useRef(false);
  const exchangeAttemptedRef = useRef(false);
  const sessionEstablishedRef = useRef(false);

  const logStep = (label: string, start: number, extra?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - start);
    console.info(`[auth] ${label} (${ms}ms)`, extra || {});
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    const start = performance.now();
    return await Promise.race([
      promise.then((result) => {
        logStep(`${label} ok`, start);
        return result;
      }),
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          logStep(`${label} timeout`, start);
          reject(new Error(`${label} timeout`));
        }, ms)
      )
    ]);
  };

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      bootstrapImmediate();
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
      setAuthError(msg);
      setLoading(false);
      return;
    }
    const authListener =
      supabase?.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          console.log('[oauth] provider_token:', session.provider_token);
          console.log('[oauth] provider_refresh_token:', session.provider_refresh_token);
          if ((session.provider_token || session.provider_refresh_token) && !tokensSavedRef.current) {
            tokensSavedRef.current = true;
            (window as any).__rf_metrics = (window as any).__rf_metrics || {};
            (window as any).__rf_metrics.saveGoogleTokensCalls =
              ((window as any).__rf_metrics.saveGoogleTokensCalls || 0) + 1;
            try {
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
          await checkUser();
          if (
            window.location.pathname === '/' ||
            window.location.pathname.includes('/login') ||
            window.location.pathname.includes('/register')
          ) {
            navigate(defaultPrivateRoute);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrg(null);
          navigate('/');
        }
      }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  const bootstrapImmediate = async () => {
    try {
      const sessionStart = performance.now();
      const sessionRes = await supabase!.auth.getSession();
      logStep('[bootstrap] getSession done', sessionStart, { hasSession: !!sessionRes.data.session });
      setHasSession(!!sessionRes.data.session);
      if (sessionRes.data.session && !sessionEstablishedRef.current) {
        sessionEstablishedRef.current = true;
        setLoading(false);
      }

      const directUserStart = performance.now();
      const directUserRes = await supabase!.auth.getUser();
      logStep('[bootstrap] direct getUser done', directUserStart, { hasUser: !!directUserRes.data.user, userId: directUserRes.data.user?.id });
      if (directUserRes.data.user) {
        setUser({
          id: directUserRes.data.user.id,
          email: directUserRes.data.user.email || '',
          name: directUserRes.data.user.user_metadata?.name || 'Utilisateur',
          avatar: '',
          role: 'viewer',
          organizations: [],
          organization_id: null
        });
        if (
          window.location.pathname === '/' ||
          window.location.pathname.includes('/login') ||
          window.location.pathname.includes('/register')
        ) {
          navigate(defaultPrivateRoute);
        }
      }

      // Background profile/org fetch (non-blocking)
      checkUser();
    } catch (e: any) {
      console.error('[bootstrap] error', e);
      setAuthError(e?.message || "Erreur d’authentification.");
      setLoading(false);
    }
  };

  const checkUser = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      console.info('[auth] checkUser start');
      const userStart = performance.now();
      const userData = await api.auth.getUser();
      logStep('[auth] api.auth.getUser done', userStart, { hasUser: !!userData, userId: userData?.id });
      console.info('[auth] checkUser getUser done', { hasUser: !!userData, userId: userData?.id });
      if (userData?.id !== lastUserIdRef.current) {
        orgInitAttempted.current = false;
        tokensSavedRef.current = false;
        lastUserIdRef.current = userData?.id || null;
      }
      if (userData && !userData.organization_id && !orgInitAttempted.current) {
        orgInitAttempted.current = true;
        try {
          console.info('[auth] ensureDefaultForCurrentUser start');
          await withTimeout(api.organization.ensureDefaultForCurrentUser(), 3000, 'ensureDefaultForCurrentUser');
          console.info('[auth] ensureDefaultForCurrentUser done');
          const refreshedStart = performance.now();
          const refreshedUser = await api.auth.getUser();
          logStep('[auth] api.auth.getUser refreshed done', refreshedStart, { hasUser: !!refreshedUser, orgId: refreshedUser?.organization_id });
          console.info('[auth] checkUser refreshed user', { hasUser: !!refreshedUser, orgId: refreshedUser?.organization_id });
          setUser(refreshedUser);
        } catch (e: any) {
          console.error("Org init failed", e);
          setAuthError(e?.message || "Impossible de créer votre organisation. Vérifiez la configuration Supabase.");
          toast.error("Impossible de créer votre organisation. Vérifiez la configuration Supabase.");
          setUser(userData);
        }
      } else {
        setUser(userData);
      }
    } catch (e: any) {
      console.error('[auth] checkUser error', e);
      setAuthError(e?.message || "Erreur d’authentification.");
      setUser(null);
      setOrg(null);
    } finally {
      console.info('[auth] checkUser done');
      setLoading(false);
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) {
      setOrg(null);
      return;
    }
    console.info('[auth] org fetch start');
    withTimeout(api.organization.get(), 3000, 'organization.get')
      .then((nextOrg) => {
        console.info('[auth] org fetch done', { hasOrg: !!nextOrg, orgId: nextOrg?.id });
        setOrg(nextOrg);
      })
      .catch((e) => {
        console.error('[auth] org fetch error', e);
        setOrg(null);
      });
  }, [user?.id]);

  const showSpinner = loading && !authError;

  return (
    <>
      {authError && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">Erreur d’authentification</h1>
            <p className="text-slate-600">{authError}</p>
          </div>
        </div>
      )}
      {showSpinner && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
      {!authError && !showSpinner && (
        <>
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
                <ProtectedRoute user={user}>
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
                                element={<ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}><SettingsPage /></ProtectedRoute>} 
                            />
                            <Route 
                                path="billing" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}><BillingPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
                            />
                            <Route 
                                path="team" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}><TeamPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
                            />
                        
                            {/* Super Admin Route */}
                            <Route 
                                path="admin" 
                                element={ENABLE_EXTRAS ? <ProtectedRoute user={user} allowedRoles={['super_admin']}><SuperAdminPage /></ProtectedRoute> : <Navigate to="/inbox" replace />} 
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
