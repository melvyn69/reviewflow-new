
import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        await api.auth.login(email, password);
      } else {
        await api.auth.register(name, email, password);
      }
      
      onLoginSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-6 px-4">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl z-10 overflow-hidden border border-slate-200">
        
        <div className="p-8 pb-4 text-center">
           <div className="h-12 w-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
             <ShieldCheck className="h-6 w-6 text-white" />
           </div>
           <h2 className="text-2xl font-bold text-slate-900">Reviewflow</h2>
           <p className="text-slate-500 text-sm mt-2">
             {isLogin ? 'Accédez à votre tableau de bord' : 'Créez votre compte'}
           </p>
        </div>

        <div className="p-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Nom complet" 
                        className="pl-10" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required={!isLogin}
                    />
                </div>
            )}

            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    type="email" 
                    placeholder="Email professionnel" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="pl-10" 
                    required
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    type="password" 
                    placeholder="Mot de passe" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pl-10" 
                    required
                />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11" isLoading={isLoading}>
              {isLogin ? 'Se connecter' : 'Créer un compte'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                  {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
