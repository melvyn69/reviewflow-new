
import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { useNavigate } from '../components/ui';

interface AuthPageProps {
  onLoginSuccess: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // FORCE LOGIN : Clears local storage first
  const handleForceLogin = async () => {
      setIsLoading(true);
      try {
          // IMPORTANT: Clear previous session state
          localStorage.clear();
          
          await api.auth.login('melvynbenichou@gmail.com', 'FORCE');
          
          onLoginSuccess();
          // Force hard reload to reset React state completely
          window.location.href = '/#/dashboard';
          window.location.reload();
      } catch (e: any) {
          setError("Erreur: " + e.message);
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await api.auth.login(email, password);
      } else {
        await api.auth.register("Nouveau", email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-6 px-4">
      
      {/* Visual Indicator that code changed */}
      <div className="fixed top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-50">
          V2.0 - DEBUG MODE ACTIF
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-8 pb-0 text-center">
           <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl text-white font-extrabold text-2xl">R</div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion</h2>
        </div>

        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
                <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-50" />
            </div>
            <div>
                <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
                <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-50" />
            </div>

            <Button type="submit" className="w-full shadow-lg" size="lg" isLoading={isLoading}>
              Se connecter
            </Button>
          </form>

          {/* EMERGENCY SECTION */}
          <div className="mt-8 pt-6 border-t border-red-100 bg-red-50/50 -mx-8 px-8 pb-4">
              <p className="text-xs font-bold text-red-800 uppercase tracking-widest mb-3 text-center">Zone de dépannage</p>
              
              <button 
                  onClick={handleForceLogin}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-transform active:scale-95"
              >
                  <ShieldAlert className="h-5 w-5" />
                  FORCER LA CONNEXION (Melvyn)
              </button>
              
              <div className="text-center mt-3">
                  <span className="text-[10px] text-red-400">
                      *Ceci effacera le cache et forcera le mode Super Admin
                  </span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
