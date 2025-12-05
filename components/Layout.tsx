
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from './ui';
import { 
  LayoutDashboard, 
  Inbox, 
  BarChart3, 
  Workflow, 
  FileText, 
  Settings, 
  LogOut, 
  CreditCard, 
  Search, 
  Bell, 
  Menu, 
  X, 
  QrCode, 
  HelpCircle, 
  Download, 
  Users, 
  ShieldAlert, 
  Home, 
  PlusCircle, 
  Target, 
  Gift,
  Share2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import { AppNotification, User, Organization } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
import { Badge } from './ui';

// ... (SidebarItem and BottomNav components remain the same)
const SidebarItem = ({ to, icon: Icon, label, exact = false, onClick }: { to: string; icon: any; label: string, exact?: boolean, onClick?: () => void }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
};

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-50 flex justify-around items-center px-2 py-2 pb-safe">
            <button 
                onClick={() => navigate('/dashboard')}
                className={`flex flex-col items-center justify-center w-full p-2 ${isActive('/dashboard') ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <LayoutDashboard className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">{t('sidebar.dashboard')}</span>
            </button>
            <button 
                onClick={() => navigate('/inbox')}
                className={`flex flex-col items-center justify-center w-full p-2 ${isActive('/inbox') ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <Inbox className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">{t('sidebar.inbox')}</span>
            </button>
            <button 
                onClick={() => navigate('/collect')}
                className={`flex flex-col items-center justify-center w-full p-2 ${isActive('/collect') ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <QrCode className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">{t('sidebar.collect')}</span>
            </button>
            <button 
                onClick={() => navigate('/settings')}
                className={`flex flex-col items-center justify-center w-full p-2 ${isActive('/settings') ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <Settings className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">{t('sidebar.settings')}</span>
            </button>
        </div>
    );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  org?: Organization | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, org }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const plan = org?.subscription_plan || 'free';

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-lg text-slate-900">Reviewflow</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* PLAN BADGE */}
        {org && (
            <div className="px-6 pt-4">
                <div className={`flex items-center justify-between p-2 rounded-lg border text-xs font-bold uppercase tracking-wide ${plan === 'pro' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : plan === 'starter' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <span>Plan {plan}</span>
                    {plan !== 'pro' && (
                        <Link to="/billing" onClick={onClose} className="text-[10px] underline hover:text-indigo-600">Upgrade</Link>
                    )}
                </div>
            </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('sidebar.platform')}</div>
          <SidebarItem to="/dashboard" icon={LayoutDashboard} label={t('sidebar.dashboard')} exact onClick={onClose} />
          <SidebarItem to="/inbox" icon={Inbox} label={t('sidebar.inbox')} onClick={onClose} />
          <SidebarItem to="/social" icon={Share2} label={t('sidebar.social')} onClick={onClose} />
          <SidebarItem to="/analytics" icon={BarChart3} label={t('sidebar.analytics')} onClick={onClose} />
          <SidebarItem to="/competitors" icon={Target} label={t('sidebar.competitors')} onClick={onClose} />
          <SidebarItem to="/team" icon={Users} label={t('sidebar.team')} onClick={onClose} />
          <SidebarItem to="/collect" icon={QrCode} label={t('sidebar.collect')} onClick={onClose} />
          <SidebarItem to="/customers" icon={Users} label="CRM Clients" onClick={onClose} />
          <SidebarItem to="/offers" icon={Gift} label={t('sidebar.offers')} onClick={onClose} />
          <SidebarItem to="/reports" icon={FileText} label={t('sidebar.reports')} onClick={onClose} />
          <SidebarItem to="/automation" icon={Workflow} label={t('sidebar.automation')} onClick={onClose} />

          <div className="px-3 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('sidebar.org')}</div>
          <SidebarItem to="/billing" icon={CreditCard} label={t('sidebar.billing')} onClick={onClose} />
          <SidebarItem to="/settings" icon={Settings} label={t('sidebar.settings')} onClick={onClose} />
          <SidebarItem to="/help" icon={HelpCircle} label={t('sidebar.help')} onClick={onClose} />
          
          {user?.role === 'super_admin' && (
            <>
                <div className="px-3 mt-8 mb-2 text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> {t('sidebar.admin')}
                </div>
                <SidebarItem to="/admin" icon={ShieldAlert} label={t('sidebar.super_admin')} onClick={onClose} />
            </>
          )}
        
          {showInstall && (
            <div className="mt-6 mx-3">
              <button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-left">
                  <Download className="h-4 w-4" />
                  <div>
                    {t('sidebar.install')}
                    <div className="font-normal opacity-80 text-[10px]">{t('sidebar.install_sub')}</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </nav>

        {!isSupabaseConfigured() && (
            <div className="bg-amber-50 border-t border-amber-100 p-2 text-center">
                <div className="text-[10px] font-bold text-amber-700 flex items-center justify-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    MODE DÉMO (Pas de DB)
                </div>
            </div>
        )}

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => api.auth.logout().then(() => window.location.reload())}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>
    </>
  );
};

const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [user, setUser] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.auth.getUser().then(setUser);
    loadNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      const search = async () => {
          if (searchTerm.length > 2) {
              const res = await api.global.search(searchTerm);
              setSearchResults(res);
          } else {
              setSearchResults([]);
          }
      };
      const timeout = setTimeout(search, 300);
      return () => clearTimeout(timeout);
  }, [searchTerm]);

  const loadNotifications = async () => {
      const list = await api.notifications.list();
      setNotifications(list);
  };

  const handleMarkAllRead = async () => {
      await api.notifications.markAllRead();
      setNotifications(notifications.map(n => ({...n, read: true})));
  };

  const handleResultClick = (link: string) => {
      navigate(link);
      setSearchTerm('');
      setSearchResults([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="h-6 w-6" />
        </button>
        
        {/* GLOBAL SEARCH */}
        <div className="relative w-full max-w-sm hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher (Client, Avis, Page)..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {searchResults.map((res, i) => (
                      <div 
                        key={i}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => handleResultClick(res.link)}
                      >
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{res.type}</span>
                              <ChevronRight className="h-3 w-3 text-slate-300" />
                          </div>
                          <div className="font-medium text-slate-900">{res.title}</div>
                          <div className="text-xs text-slate-500 truncate">{res.subtitle}</div>
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
            <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative"
                onClick={() => setShowNotifications(!showNotifications)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </button>

            {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Aucune notification.
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                                    onClick={() => {
                                        if (notif.link) {
                                            navigate(notif.link);
                                            setShowNotifications(false);
                                        }
                                    }}
                                >
                                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${notif.type === 'error' ? 'bg-red-500' : notif.type === 'success' ? 'bg-green-500' : notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                    <div>
                                        <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{notif.title}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                                            {new Date(notif.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500 capitalize">
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : user.role === 'editor' ? 'Éditeur' : 'Lecteur'}
              </div>
            </div>
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export const AppLayout = ({ children }: { children?: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
      api.auth.getUser().then(u => {
          setUser(u || undefined);
          if (u) {
              api.organization.get().then(setOrg);
          }
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={user}
        org={org}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
