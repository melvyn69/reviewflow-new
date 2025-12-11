import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, ShieldAlert } from 'lucide-react';
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
  const [name, setName] = useState('');

  // FORCE LOGIN : Clears local storage first (Debug tool)
  const handleForceLogin = async () => {
      setIsLoading(true);
      try {
          localStorage.clear();
          await api.auth.login('melvynbenichou@gmail.com', 'FORCE'); // Will trigger God Mode
          onLoginSuccess();
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
    setError(null);
    
    try {
      let user;
      if (isLogin) {
        user = await api.auth.login(email, password);
      } else {
        user = await api.auth.register(name || "Utilisateur", email, password);
      }
      
      if (user) {
          onLoginSuccess();
          // Redirection intelligente : Onboarding pour les nouveaux, Dashboard pour les anciens
          if (!isLogin) {
              navigate('/onboarding');
          } else {
              navigate('/dashboard');
          }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-6 px-4">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 pb-0 text-center">
           <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl text-white font-extrabold text-2xl">R</div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
               {isLogin ? 'Connexion' : 'Créer un compte'}
           </h2>
        </div>

        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
                <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Nom complet</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            required={!isLogin} 
                            placeholder="Jean Dupont"
                            className="pl-9 bg-slate-50" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input required type="email" placeholder="nom@entreprise.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-slate-50" />
                </div>
            </div>
            <div>
                <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 bg-slate-50" />
                </div>
            </div>

            <Button type="submit" className="w-full shadow-lg" size="lg" isLoading={isLoading}>
              {isLogin ? 'Se connecter' : 'S\'inscrire'}
            </Button>
          </form>

          <div className="mt-6 text-center">
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                className="text-sm text-indigo-600 font-bold hover:underline"
              >
                  {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
          </div>

          {/* EMERGENCY SECTION (Only visible on localhost or specific environments if needed, keeping it for debug) */}
          <div className="mt-8 pt-6 border-t border-slate-100 opacity-50 hover:opacity-100 transition-opacity">
              <button 
                  onClick={handleForceLogin}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                  <ShieldAlert className="h-3 w-3" />
                  Mode Super Admin (Debug)
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};