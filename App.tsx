
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, ToastProvider } from './components/ui';
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
import { api } from './lib/api';
import { User } from './types';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ENABLE_EXTRAS } from './lib/flags';

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
  const [loading, setLoading] = useState(true);
  const defaultPrivateRoute = DEFAULT_PRIVATE_ROUTE;

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await api.auth.getUser();
      setUser(userData);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to={defaultPrivateRoute} replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={defaultPrivateRoute} replace /> : <AuthPage initialMode="login" onLoginSuccess={checkUser} />} />
        <Route path="/book-demo" element={ENABLE_EXTRAS ? <BookDemoPage /> : <Navigate to="/" replace />} />
        
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
                <AppLayout>
                    <Routes>
                        <Route path="dashboard" element={ENABLE_EXTRAS ? <DashboardPage /> : <Navigate to="/inbox" replace />} />
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
