
import React, { InputHTMLAttributes, SelectHTMLAttributes, useContext, useState, useEffect, useMemo } from 'react';
import { LucideIcon, X, CheckCircle, AlertTriangle, Info, AlertCircle, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
export { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, Link, useSearchParams };

// --- TOAST SYSTEM ---
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    success: (msg: string, duration?: number) => context.addToast('success', msg, duration),
    error: (msg: string, duration?: number) => context.addToast('error', msg, duration),
    warning: (msg: string, duration?: number) => context.addToast('warning', msg, duration),
    info: (msg: string, duration?: number) => context.addToast('info', msg, duration),
  };
};

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-right-full transition-all duration-300
              ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-200 text-red-800' : ''}
              ${toast.type === 'warning' ? 'bg-white border-amber-200 text-amber-800' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-200 text-blue-800' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// --- SKELETON (Zero Latency UI) ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded ${className}`} />
);

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', icon: Icon, isLoading, className = '', ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-lg active:scale-[0.98]";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md border border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm",
    outline: "border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-transparent",
  };

  const sizes = {
    xs: "h-7 px-2.5 text-xs",
    sm: "h-9 px-3 text-xs uppercase tracking-wide font-semibold",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={isLoading}
      {...props}
    >
      {isLoading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
      {!isLoading && Icon && <Icon className={`mr-2 ${size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'}`} />}
      {children}
    </button>
  );
};

// --- CARD ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-6 py-4 border-b border-slate-50 ${className}`} {...props}>{children}</div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => (
  <h3 className={`text-base font-bold text-slate-900 ${className}`} {...props}>{children}</h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`p-6 ${className}`} {...props}>{children}</div>
);

// --- BADGE ---
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral' | 'pro';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '', onClick }) => {
  const variants = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    pro: "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-sm",
  };
  return (
    <span 
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      {variant === 'pro' && <Sparkles className="h-3 w-3 mr-1 fill-white" />}
      {children}
    </span>
  );
};

// --- PRO BADGE (Simple indicator) ---
export const ProBadge = ({ className }: { className?: string }) => (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm ${className}`}>
        PRO
    </span>
);

// --- PRO LOCK (Upsell Component) ---
export const ProLock: React.FC<{ 
    title: string, 
    description: string, 
    onUpgrade?: () => void,
    children?: React.ReactNode
}> = ({ title, description, onUpgrade, children }) => {
    const navigate = useNavigate();
    return (
        <div className="relative group rounded-xl overflow-hidden border border-indigo-100 bg-slate-50/50">
            {/* Blurred Content */}
            <div className="filter blur-[4px] select-none opacity-40 pointer-events-none p-4" aria-hidden="true">
                {children || (
                    <div className="space-y-4">
                        <div className="h-32 bg-slate-200 rounded-lg animate-pulse"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
                            <div className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/60 backdrop-blur-[2px]">
                <div className="bg-white p-4 rounded-full shadow-xl mb-4 ring-4 ring-indigo-50 transform group-hover:scale-110 transition-transform duration-300">
                    <Lock className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 max-w-sm mb-6 text-sm leading-relaxed">
                    {description}
                </p>
                <Button 
                    size="lg" 
                    className="shadow-xl shadow-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-none animate-pulse hover:animate-none" 
                    onClick={onUpgrade || (() => navigate('/billing'))}
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Débloquer avec le plan Growth
                    <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                </Button>
                <p className="mt-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Essai gratuit disponible</p>
            </div>
        </div>
    );
};

// --- INPUTS ---
export const Input: React.FC<InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 border transition-all ${className}`} {...props} />
);

export const Select: React.FC<SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select className={`block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 border bg-white ${className}`} {...props}>
    {children}
  </select>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    className={`${checked ? 'bg-indigo-600' : 'bg-slate-200'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
  >
    <span
      aria-hidden="true"
      className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);
