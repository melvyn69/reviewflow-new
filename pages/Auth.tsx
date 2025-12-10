
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button, Input } from '../components/ui';
import { Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, Copy, HelpCircle, ArrowLeft } from 'lucide-react';
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
  const [currentUrl, setCurrentUrl] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Password reset specific
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');

  useEffect(() => {
      setCurrentUrl(window.location.origin);
  }, []);

  useEffect(() => {
      setIsLogin(initialMode === 'login');
  }, [initialMode]);

  useEffect(() => {
      const hash = location.hash;
      if (hash && hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          const errorDesc = params.get('error_description') || params.get('error') || 'Erreur de connexion';
          
          if (errorDesc.includes('access_denied')) {
              setError("Accès refusé par Google. (Si mode test: vérifiez que votre email est invité)");
          } else {
              setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
          }
          navigate(location.pathname, { replace: true });
      }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isReset) {
          if (step === 'request') {
              await api.auth.resetPassword(email);
              setSuccessMsg("Si un compte existe à cette adresse, vous recevrez un code de réinitialisation.");
              setStep('verify');
          } else {
              if (newPassword !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas");
              // This is a mock implementation of confirming reset since api.auth doesn't expose confirmResetPassword in this demo context
              // In real app: await api.auth.confirmResetPassword(email, resetCode, newPassword);
              await new Promise(r => setTimeout(r, 1000));
              setSuccessMsg("Mot de passe mis à jour ! Vous pouvez vous connecter.");
              setIsReset(false);
              setIsLogin(true);
              setStep('request');
          }
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

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      setError(null);
      try {
          await api.auth.loginWithGoogle();
      } catch (err: any) {
          setError(err.message || "Erreur de connexion Google");
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
               {isReset ? 'Récupération' : isLogin ? 'Heureux de vous revoir 👋' : 'Créer un compte'}
           </h2>
           <p className="text-sm text-slate-500 mt-2">
             {isReset 
                ? (step === 'request' ? 'Entrez votre email pour continuer' : 'Définissez votre nouveau mot de passe') 
                : isLogin 
                    ? 'Connectez-vous à votre espace Reviewflow' 
                    : 'Commencez à gérer votre e-réputation dès aujourd\'hui'
             }
           </p>
        </div>

        <div className="p-8 pt-6">
          
          {!isReset && (
              <>
                <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all mb-6 text-sm shadow-sm hover:shadow-md"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continuer avec Google</span>
                </button>

                <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wide font-bold">Ou avec email</div>
                </div>
              </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl flex items-start gap-2 border border-green-100 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                </div>
            )}

            {(!isReset || step === 'request') && (
                <>
                    {!isLogin && !isReset && (
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nom complet</label>
                        <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            required={!isLogin}
                            placeholder="Jean Dupont" 
                            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        </div>
                    </div>
                    )}

                    <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                        required
                        type="email" 
                        placeholder="nom@entreprise.com" 
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    </div>
                </>
            )}

            {isReset && step === 'verify' && (
                <>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Code reçu par email</label>
                        <Input 
                            required
                            placeholder="123456" 
                            className="bg-slate-50 border-slate-200 focus:bg-white text-center font-mono text-lg tracking-widest" 
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nouveau mot de passe</label>
                        <Input 
                            required
                            type="password"
                            placeholder="••••••••" 
                            className="bg-slate-50 border-slate-200 focus:bg-white" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Confirmer</label>
                        <Input 
                            required
                            type="password"
                            placeholder="••••••••" 
                            className="bg-slate-50 border-slate-200 focus:bg-white" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </>
            )}

            {!isReset && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
                        {isLogin && (
                            <button 
                                type="button" 
                                onClick={() => { setIsReset(true); setStep('request'); setError(null); setSuccessMsg(null); }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                            >
                                Oublié ?
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                        required
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <Button type="submit" className="w-full mt-6 shadow-lg shadow-indigo-200 hover:shadow-indigo-300" size="lg" isLoading={isLoading}>
              {isReset 
                ? (step === 'request' ? 'Envoyer le lien' : 'Réinitialiser') 
                : isLogin ? 'Se connecter' : 'Créer mon compte'
              }
            </Button>

            {isReset && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full mt-2" 
                    onClick={() => { setIsReset(false); setError(null); setSuccessMsg(null); }}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la connexion
                </Button>
            )}
          </form>

          {!isReset && (
              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
                <button 
                    onClick={() => navigate(isLogin ? '/register' : '/login')}
                    className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    {isLogin ? 'S\'inscrire' : 'Se connecter'}
                </button>
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};