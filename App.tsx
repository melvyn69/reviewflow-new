import React, { useEffect, useState } from 'react';

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
import { SocialModelCreatePage } from './pages/SocialModelCreate';
import { PublicProfilePage } from './pages/PublicProfile';
import { DevelopersPage } from './pages/Developers';
import { MarketingPage } from './pages/Marketing';
import { ProgressPage } from './pages/Progress';

import { api } from './lib/api';
import { supabase } from './lib/supabase';
import { isFeatureActive } from './lib/features';
import { I18nProvider } from './lib/i18n';

import { ErrorBoundary } from './components/ErrorBoundary';
import {
  ToastProvider,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from './components/ui';

import type { User } from './types';

// ---------------------------
// Utils
// ---------------------------
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

const ProtectedRoute = ({ children, user, allowedRoles }: ProtectedRouteProps) => {
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ---------------------------
// App Routes
// ---------------------------
function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkUser = async () => {
    try {
      const userData = await api.auth.getUser();
      setUser(userData);
    } catch (err) {
      console.error('User check failed', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1) Vérification initiale
    checkUser();

    // 2) Timeout sécurité pour éviter un loader infini
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // 3) Listener Supabase (✅ safe)
    let unsubscribe: (() => void) | null = null;

    try {
      if (supabase?.auth?.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            if (event === 'SIGNED_IN' && session) {
              // Optionnel: si tu relies Google via session.provider_token
              const providerToken = (session as any).provider_token;
              if (providerToken) {
                await api.organization.saveGoogleTokens();
              }

              await checkUser();

              const hash = window.location.hash || '';
              if (hash === '#/' || hash.includes('login') || hash.includes('register')) {
                navigate('/dashboard');
              }
            }

            if (event === 'SIGNED_OUT') {
              setUser(null);
              navigate('/');
            }
          } catch (err) {
            console.error('Auth listener error', err);
          }
        });

        unsubscribe = () => {
          try {
            data?.subscription?.unsubscribe?.();
          } catch (err) {
            console.warn('Unsubscribe failed', err);
          }
        };
      } else {
        console.warn('Supabase auth not initialized: onAuthStateChange missing');
      }
    } catch (err) {
      console.error('Failed to init Supabase listener', err);
    }

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="absolute mt-16 text-slate-400 text-sm animate-pulse">Chargement sécurisé...</p>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : (
              <AuthPage initialMode="login" onLoginSuccess={checkUser} />
            )
          }
        />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage initialMode="register" onLoginSuccess={checkUser} />} />
        <Route path="/book-demo" element={<BookDemoPage />} />

        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/feedback/:locationId" element={<ReviewFunnel />} />
        <Route path="/widget/:locationId" element={<WidgetPage />} />
        <Route path="/v/:locationId" element={<PublicProfilePage />} />

        {/* Onboarding (sans layout) */}
        <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" replace />} />

        {/* App (avec layout) */}
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <AppLayout>
                <Routes>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="inbox" element={<InboxPage />} />

                  <Route
                    path="marketing"
                    element={
                      isFeatureActive('MARKETING_MODULE', user)
                        ? <MarketingPage />
                        : <Navigate to="/dashboard" replace />
                    }
                  />

                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="social" element={<SocialPage />} />
                  <Route path="social/models/create" element={<SocialModelCreatePage />} />
                  <Route path="social-booster" element={<Navigate to="/social" replace />} />
                  <Route path="booster" element={<Navigate to="/social" replace />} />

                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="competitors" element={<CompetitorsPage />} />
                  <Route path="automation" element={<AutomationPage />} />
                  <Route path="collect" element={<CollectPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="offers" element={<OffersPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="developers" element={<DevelopersPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="playground" element={<PlaygroundPage />} />

                  {/* Sensitive */}
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="billing"
                    element={
                      <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}>
                        <BillingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="team"
                    element={
                      <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}>
                        <TeamPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute user={user} allowedRoles={['super_admin']}>
                        <SuperAdminPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

// ---------------------------
// App Root
// ---------------------------
export default function App() {
  return (
    <HashRouter>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </HashRouter>
  );
}
