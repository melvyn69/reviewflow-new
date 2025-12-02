import React, { useState, useEffect } from 'react';
import { HashRouter, Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
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
import { HelpPage } from './pages/Help';
import { CustomersPage } from './pages/Customers';
import { SuperAdminPage } from './pages/SuperAdmin';
import { api } from './lib/api';
import { User } from './types';
import { ToastProvider } from './components/ui';

// ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Wrapper to handle auth check on initial load
function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      <Switch>
        {/* Public Routes */}
        <Route exact path="/">
            {user ? <Redirect to="/dashboard" /> : <LandingPage />}
        </Route>
        <Route path="/login">
            {user ? <Redirect to="/dashboard" /> : <AuthPage initialMode="login" onLoginSuccess={checkUser} />}
        </Route>
        <Route path="/register">
            {user ? <Redirect to="/dashboard" /> : <AuthPage initialMode="register" onLoginSuccess={checkUser} />}
        </Route>
        
        <Route path="/legal" component={LegalPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/feedback/:locationId" component={ReviewFunnel} />
        
        {/* Protected Routes */}
        <Route path="/">
            {user ? (
                <AppLayout>
                    <Switch>
                        <Route path="/dashboard" component={DashboardPage} />
                        <Route path="/inbox" component={InboxPage} />
                        <Route path="/analytics" component={AnalyticsPage} />
                        <Route path="/automation" component={AutomationPage} />
                        <Route path="/collect" component={CollectPage} />
                        <Route path="/customers" component={CustomersPage} />
                        <Route path="/reports" component={ReportsPage} />
                        <Route path="/settings" component={SettingsPage} />
                        <Route path="/billing" component={BillingPage} />
                        <Route path="/help" component={HelpPage} />
                        <Route path="/playground" component={PlaygroundPage} />
                        <Route path="/admin" component={SuperAdminPage} />
                        {/* Fallback for protected routes */}
                        <Redirect to="/dashboard" />
                    </Switch>
                </AppLayout>
            ) : (
                <Redirect to="/" />
            )}
        </Route>
      </Switch>
    </>
  );
}

const App = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </HashRouter>
  );
};

export default App;