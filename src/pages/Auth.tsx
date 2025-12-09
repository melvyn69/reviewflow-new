
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, HelpCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from '../components/ui';

interface AuthPageProps {
  onLoginSuccess: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleDemoLogin = async () => {
      setIsLoading(true);
      try {
          // Utilise l'email God Mode directement
          await api.auth.login('melvynbenichou@gmail.com', 'force_login');
          onLoginSuccess();
          navigate('/dashboard');
      } catch (e: any) {
          setError("Erreur secours: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleResetCache = () => {
      localStorage.clear();
      window.location.reload();
  };

  // ... (rest of the component logic)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isReset) {
          await api.auth.resetPassword(email);
          setSuccessMsg("Email envoyé.");
      } else if (isLogin) {
        await api.auth.login(email, password);
        onLoginSuccess();
      } else {
        await api.auth.register(name, email, password);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-6 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="hidden sm:block absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 to-violet-600 skew-y-3 origin-top-left transform -translate-y-20 z-0 shadow-2xl"></div>
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 pb-0 text-center">
           <div 
             className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 cursor-pointer hover:scale-105 transition-transform"
             onClick={() => navigate('/')}
           >
              <span className="text-white font-extrabold text-2xl tracking-tighter">R</span>
           </div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
               {isReset ? 'Récupération' : isLogin ? 'Connexion' : 'Créer un compte'}
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

            {!isReset && (
                <>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                        <Input 
                            required type="email" placeholder="nom@entreprise.com" 
                            className="bg-slate-50 border-slate-200" 
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
                        <Input 
                            required type="password" placeholder="••••••••" 
                            className="bg-slate-50 border-slate-200"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </>
            )}

            <Button type="submit" className="w-full shadow-lg" size="lg" isLoading={isLoading}>
              {isReset ? 'Envoyer' : isLogin ? 'Se connecter' : 'S\'inscrire'}
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 space-y-3">
              <button 
                  onClick={handleDemoLogin}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-red-200 transition-colors"
              >
                  <ShieldAlert className="h-4 w-4" />
                  Accès Secours (Melvyn)
              </button>
              
              <button 
                  onClick={handleResetCache}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 underline"
              >
                  Réinitialiser le cache (Si bloqué)
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
