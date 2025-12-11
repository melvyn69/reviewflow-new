
import React, { useState, useEffect } from 'react';
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
import { User } from './types';
import { ToastProvider, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from './components/ui';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isFeatureActive } from './lib/features';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

interface ProtectedRouteProps {
  children?: React.ReactNode;
  user: User | null;
  loading: boolean;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, user, loading, allowedRoles }: ProtectedRouteProps) => {
  if (loading) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 rounded-full border-t-transparent"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
        try {
            const u = await api.auth.getUser();
            if (mounted) {
                setUser(u);
                setLoading(false);
            }
        } catch (e) {
            console.error("Init failed", e);
            if (mounted) setLoading(false);
        }
    };

    init();

    const { data: authListener } = supabase?.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const u = await api.auth.getUser();
            if (mounted) setUser(u);
            
            // Si on vient de se connecter, on redirige vers le dashboard si on est sur une page publique
            if (event === 'SIGNED_IN' && window.location.hash.includes('login')) {
                navigate('/dashboard');
            }
        } 
        else if (event === 'SIGNED_OUT') {
            if (mounted) setUser(null);
            navigate('/');
        }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage initialMode="login" onLoginSuccess={() => {}} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage initialMode="register" onLoginSuccess={() => {}} />} />
        <Route path="/book-demo" element={<BookDemoPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/feedback/:locationId" element={<ReviewFunnel />} />
        <Route path="/widget/:locationId" element={<WidgetPage />} />
        <Route path="/v/:locationId" element={<PublicProfilePage />} />
        <Route path="/onboarding" element={<ProtectedRoute user={user} loading={loading}><OnboardingPage /></ProtectedRoute>} />

        <Route path="/*" element={
            <ProtectedRoute user={user} loading={loading}>
                <AppLayout>
                    <Routes>
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="inbox" element={<InboxPage />} />
                        <Route path="marketing" element={isFeatureActive('MARKETING_MODULE', user) ? <MarketingPage /> : <Navigate to="/dashboard" replace />} />
                        <Route path="progress" element={<ProgressPage />} />
                        <Route path="social" element={<SocialPage />} /> 
                        <Route path="social/models/create" element={<SocialModelCreatePage />} />
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
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="billing" element={<BillingPage />} />
                        <Route path="team" element={<TeamPage />} />
                        <Route path="admin" element={<ProtectedRoute user={user} loading={false} allowedRoles={['super_admin']}><SuperAdminPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </AppLayout>
            </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

const App = () => {
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
};

export default App;
