import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  ShieldAlert
} from 'lucide-react';
import { api } from '../lib/api';
import { AppNotification } from '../types';

const SidebarItem = ({ to, icon: Icon, label, exact = false, onClick }: { to: string; icon: any; label: string, exact?: boolean, onClick?: () => void }) => (
  <NavLink
    to={to}
    end={exact}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`
    }
  >
    <Icon className="h-5 w-5 shrink-0" />
    {label}
  </NavLink>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userEmail }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

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
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-900">Reviewflow</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plateforme</div>
          <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Tableau de bord" exact onClick={onClose} />
          <SidebarItem to="/inbox" icon={Inbox} label="Boîte de réception" onClick={onClose} />
          <SidebarItem to="/analytics" icon={BarChart3} label="Statistiques" onClick={onClose} />
          <SidebarItem to="/customers" icon={Users} label="Base Clients" onClick={onClose} />
          <SidebarItem to="/collect" icon={QrCode} label="Collecte d'avis" onClick={onClose} />
          <SidebarItem to="/reports" icon={FileText} label="Rapports" onClick={onClose} />
          <SidebarItem to="/automation" icon={Workflow} label="Automatisation" onClick={onClose} />

          <div className="px-3 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organisation</div>
          <SidebarItem to="/billing" icon={CreditCard} label="Abonnement" onClick={onClose} />
          <SidebarItem to="/settings" icon={Settings} label="Paramètres" onClick={onClose} />
          <SidebarItem to="/help" icon={HelpCircle} label="Centre d'Aide" onClick={onClose} />
          
          {/* Always show Admin for demo purposes, or filter by email if strict */}
          <div className="px-3 mt-8 mb-2 text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Zone Admin
          </div>
          <SidebarItem to="/admin" icon={ShieldAlert} label="Super Admin" onClick={onClose} />
        
          {showInstall && (
            <div className="mt-6 mx-3">
              <button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-left">
                  <Download className="h-4 w-4" />
                  <div>
                    Installer l'App
                    <div className="font-normal opacity-80 text-[10px]">Sur votre mobile</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => api.auth.logout().then(() => window.location.reload())}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
};

const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [user, setUser] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.auth.getUser().then(setUser);
    loadNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
      const list = await api.notifications.list();
      setNotifications(list);
  };

  const handleMarkAllRead = async () => {
      await api.notifications.markAllRead();
      setNotifications(notifications.map(n => ({...n, read: true})));
  };

  const handleSearch = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          navigate(`/inbox?search=${encodeURIComponent(searchTerm)}`);
      }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="relative w-full max-w-sm hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher (ex: 'Pizza')..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
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
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
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
              <div className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'Administrateur' : user.role}</div>
            </div>
            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="Avatar" className="h-9 w-9 rounded-full border border-slate-200" />
          </div>
        )}
      </div>
    </header>
  );
};

export const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
    api.auth.getUser().then(u => setUserEmail(u?.email || ''));
  }, [location]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} userEmail={userEmail} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};