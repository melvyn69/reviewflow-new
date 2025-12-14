
import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Input, useToast } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from '../components/ui';

interface AuthPageProps {
  onLoginSuccess: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (mode === 'login') {
        await api.auth.login(email, password);
        toast.success("Bon retour parmi nous !");
      } else {
        if (!name) throw new Error("Le nom est requis pour l'inscription.");
        await api.auth.register(name, email, password);
        toast.success("Compte créé avec succès !");
      }
      
      onLoginSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (msg.includes('Invalid login credentials')) msg = "Email ou mot de passe incorrect.";
      if (msg.includes('User already registered')) msg = "Un compte existe déjà avec cet email.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      try {
          await api.auth.connectGoogleBusiness();
      } catch (err: any) {
          setError("Impossible de lancer la connexion Google.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-6 px-4">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 to-purple-700 skew-y-3 origin-top-left transform -translate-y-24 z-0"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-slate-100 flex flex-col">
        
        <div className="p-8 pb-6 text-center bg-white">
           <div className="h-14 w-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
             <ShieldCheck className="h-7 w-7 text-white" />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reviewflow</h2>
           <p className="text-slate-500 text-sm mt-2">
             {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte gratuitement'}
           </p>
        </div>

        <div className="p-8 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {mode === 'register' && (
                <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                        placeholder="Nom complet" 
                        className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required
                    />
                </div>
            )}

            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    type="email" 
                    placeholder="Email professionnel" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                    required
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    type="password" 
                    placeholder="Mot de passe" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                    required
                />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all mt-6" isLoading={isLoading}>
              {mode === 'login' ? 'Se connecter' : "S'inscrire"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold tracking-wider">Ou continuer avec</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm h-12"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <div className="mt-8 text-center">
              <button 
                type="button" 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} 
                className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                  {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
