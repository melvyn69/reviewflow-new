
import React, { useState } from 'react';
import { useNavigate } from '../components/ui';
import { api } from '../lib/api';
import { Button, Input, Select, useToast, Card } from '../components/ui';
import { Building2, Globe, Sparkles, Check, ArrowRight, Zap, RefreshCw, LogOut } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { ENABLE_DEMO_MODE } from '../lib/flags';

const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-5 h-5 mr-2">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.95-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
);

export const OnboardingPage = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();

    // Data State
    const [companyName, setCompanyName] = useState('');
    const [industry, setIndustry] = useState('restaurant');
    const [googleConnected, setGoogleConnected] = useState(false);
    const [tone, setTone] = useState('professionnel');
    const [style, setStyle] = useState('formal');

    const handleNext = async () => {
        setLoading(true);
        try {
            // Save current step data
            if (step === 1) {
                // Check if user already has an org
                const currentOrg = await api.organization.get();
                if (currentOrg) {
                    await api.organization.update({ name: companyName, industry: industry as any });
                } else {
                    // Create new org if none exists
                    await api.organization.create(companyName, industry);
                }
            } else if (step === 3) {
                await api.organization.update({ 
                    brand: { 
                        tone, 
                        language_style: style as any, 
                        description: '', 
                        use_emojis: true, 
                        signature: companyName 
                    } 
                });
                toast.success("Configuration terminée !");
                navigate('/dashboard');
                return;
            }
            setStep(step + 1);
        } catch (e: any) {
            toast.error("Une erreur est survenue: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectGoogle = async () => {
        setLoading(true);
        try {
            await api.auth.connectGoogleBusiness();
            if (ENABLE_DEMO_MODE) {
                // In demo mode, we simulate success without OAuth redirect.
                setGoogleConnected(true);
                toast.success("Compte Google connecté !");
            }
        } catch (e) {
            toast.error("Erreur de connexion Google");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await api.auth.logout();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative">
            <div className="absolute top-4 right-4">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Déconnexion
                </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-8 flex gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                ))}
            </div>

            <Card className="w-full max-w-md overflow-hidden shadow-xl border-slate-200">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            {step === 1 && <Building2 className="h-6 w-6" />}
                            {step === 2 && <Globe className="h-6 w-6" />}
                            {step === 3 && <Sparkles className="h-6 w-6" />}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('onboarding.welcome')}</h1>
                        <p className="text-slate-500 mt-2 text-sm">{t('onboarding.subtitle')}</p>
                    </div>

                    {/* STEP 1: COMPANY */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'établissement</label>
                                <Input 
                                    placeholder="Ex: Le Petit Bistro" 
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secteur d'activité</label>
                                <Select value={industry} onChange={e => setIndustry(e.target.value)}>
                                    <option value="restaurant">Restauration</option>
                                    <option value="hotel">Hôtellerie</option>
                                    <option value="retail">Commerce</option>
                                    <option value="services">Services</option>
                                    <option value="health">Santé</option>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONNECT */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className={`p-4 border rounded-xl flex items-center justify-between transition-all ${googleConnected ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                                <div className="flex items-center">
                                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 mr-3">
                                        <GoogleIcon />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">Google Business</div>
                                        <div className="text-xs text-slate-500">{googleConnected ? 'Connecté avec succès' : 'Sync avis & réponses'}</div>
                                    </div>
                                </div>
                                {googleConnected ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Button size="sm" variant="outline" onClick={handleConnectGoogle} isLoading={loading}>Connexion</Button>
                                )}
                            </div>
                            
                            <p className="text-xs text-center text-slate-400">
                                En connectant votre compte, vous acceptez l'importation de vos avis publics pour analyse.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: AI BRANDING */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ton des réponses IA</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['professionnel', 'amical', 'enthousiaste', 'empathique'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`p-3 text-sm rounded-lg border transition-all ${tone === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                                        >
                                            <span className="capitalize">{t}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Style de langage</label>
                                <Select value={style} onChange={e => setStyle(e.target.value)}>
                                    <option value="formal">Vouvoiement (Formel)</option>
                                    <option value="casual">Tutoiement (Familier)</option>
                                </Select>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 flex gap-2">
                                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                                <span>L'IA utilisera ces paramètres pour générer des brouillons de réponse automatiquement.</span>
                            </div>
                        </div>
                    )}

                    {/* FOOTER ACTIONS */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="text-sm text-slate-500 hover:text-slate-800">Retour</button>
                        ) : (
                            <div></div>
                        )}
                        <Button onClick={handleNext} isLoading={loading} disabled={step === 1 && !companyName}>
                            {step === 3 ? t('onboarding.finish') : t('onboarding.next')} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
            
            {step < 3 && (
                <button onClick={() => navigate('/dashboard')} className="mt-6 text-xs text-slate-400 hover:text-slate-600 underline">
                    {t('onboarding.skip')}
                </button>
            )}
        </div>
    );
};
