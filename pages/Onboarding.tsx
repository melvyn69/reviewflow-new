
import React, { useState } from 'react';
import { useNavigate } from '../components/ui';
import { api } from '../lib/api';
import { Button, Input, Select, useToast, Card } from '../components/ui';
import { Building2, Globe, Sparkles, Check, ArrowRight, Zap, RefreshCw, LogOut, Link as LinkIcon, Search, HelpCircle, Star, Smartphone, Layout } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { BUSINESS_SECTORS } from '../lib/constants';

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-2 align-middle">
        <HelpCircle className="h-4 w-4 text-slate-400 hover:text-indigo-500 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

const STEPS = [
    { id: 1, title: 'Entreprise', icon: Building2 },
    { id: 2, title: 'Google', icon: Globe },
    { id: 3, title: 'Marque', icon: Sparkles },
    { id: 4, title: 'Funnel', icon: Star },
    { id: 5, title: 'Widget', icon: Layout },
    { id: 6, title: 'Auto', icon: Zap },
    { id: 7, title: 'Mobile', icon: Smartphone }
];

export const OnboardingPage = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();

    // Data State
    const [companyName, setCompanyName] = useState('');
    const [industry, setIndustry] = useState('restaurant');
    const [googleUrl, setGoogleUrl] = useState('');
    const [googleConnected, setGoogleConnected] = useState(false);
    const [tone, setTone] = useState('professionnel');
    const [style, setStyle] = useState('formal');

    const [funnelActive, setFunnelActive] = useState(false);
    const [widgetActive, setWidgetActive] = useState(false);
    const [autoActive, setAutoActive] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearching(true);
        try {
            const results = await api.company.search(searchQuery);
            setSearchResults(results);
            if (results.length === 0) toast.info("Aucun résultat trouvé.");
        } catch (e) {
            toast.error("Erreur recherche.");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectCompany = (c: any) => {
        setCompanyName(c.legal_name || '');
        setSearchResults([]);
        setSearchQuery('');
        toast.success("Informations pré-remplies !");
    };

    const handleNext = async () => {
        setLoading(true);
        try {
            // Step 1: Create Organization
            if (step === 1) {
                if (!companyName) {
                    toast.error("Veuillez renseigner le nom de l'établissement.");
                    setLoading(false);
                    return;
                }
                let currentOrg = await api.organization.get();
                if (currentOrg) {
                    await api.organization.update({ name: companyName, industry: industry as any });
                } else {
                    currentOrg = await api.organization.create(companyName, industry);
                }
                if (currentOrg) {
                    await api.locations.create({
                        name: companyName,
                        google_review_url: googleUrl,
                        city: "Siège", 
                        country: "France"
                    });
                }
            } 
            // Step 3: Brand Voice
            else if (step === 3) {
                await api.organization.update({ 
                    brand: { 
                        enabled: true,
                        tone, 
                        language_style: style as any, 
                        description: '', 
                        use_emojis: true, 
                        signature: companyName,
                        knowledge_base: ''
                    } 
                });
            }
            // Step 7: Finish
            else if (step === 7) {
                navigate('/dashboard');
                return;
            }
            
            // Artificial delay for checklist feeling
            await new Promise(r => setTimeout(r, 500));
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
            setGoogleConnected(true);
            toast.success("Compte Google connecté !");
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

            {/* Stepper */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
                    {STEPS.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${s.id <= step ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                                {s.id < step ? <Check className="h-4 w-4" /> : s.id}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-wider ${s.id === step ? 'text-indigo-600' : 'text-slate-400'}`}>{s.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="w-full max-w-lg overflow-hidden shadow-xl border-slate-200">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border border-indigo-100">
                            {React.createElement(STEPS[step - 1].icon, { className: "h-7 w-7" })}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {step === 1 && "Commençons par les bases"}
                            {step === 2 && "Centralisez vos avis"}
                            {step === 3 && "Donnez une voix à votre IA"}
                            {step === 4 && "Interceptez les avis négatifs"}
                            {step === 5 && "Affichez votre succès"}
                            {step === 6 && "Automatisez la fidélisation"}
                            {step === 7 && "Restez connecté"}
                        </h1>
                        <p className="text-slate-500 mt-2 text-sm">Étape {step} sur 7</p>
                    </div>

                    {/* STEP 1: COMPANY */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                <label className="block text-xs font-bold text-indigo-900 mb-2 flex items-center gap-1">
                                    <Search className="h-3 w-3" /> Trouver mon entreprise (France)
                                </label>
                                <div className="flex gap-2">
                                    <Input placeholder="Nom ou SIRET..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="bg-white h-9 text-sm" />
                                    <Button size="sm" onClick={handleSearch} isLoading={searching}>Chercher</Button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-white rounded border border-indigo-100 max-h-40 overflow-y-auto shadow-sm">
                                        {searchResults.map((r, i) => (
                                            <div key={i} className="p-3 border-b border-slate-50 last:border-0 hover:bg-indigo-50 cursor-pointer text-xs" onClick={() => handleSelectCompany(r)}>
                                                <div className="font-bold text-slate-800">{r.legal_name}</div>
                                                <div className="text-slate-500">{r.address} - {r.city}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'établissement <span className="text-red-500">*</span></label>
                                <Input placeholder="Ex: Le Petit Bistro" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secteur d'activité</label>
                                <Select value={industry} onChange={e => setIndustry(e.target.value)}>
                                    {BUSINESS_SECTORS.map(sec => <option key={sec.value} value={sec.value}>{sec.label}</option>)}
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: GOOGLE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 text-center">
                            <p className="text-sm text-slate-600">Connectez votre fiche pour que l'IA puisse lire et répondre à vos avis.</p>
                            <Button size="lg" variant="outline" onClick={handleConnectGoogle} isLoading={loading} className={`w-full h-16 text-lg ${googleConnected ? 'border-green-500 bg-green-50 text-green-700' : ''}`}>
                                {googleConnected ? <><Check className="mr-2" /> Compte Connecté</> : 'Connecter Google Business'}
                            </Button>
                            <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                                <InfoTooltip text="Cette connexion permet de synchroniser les avis toutes les heures." /> 
                                Pourquoi ? Cela active 80% des fonctionnalités.
                            </div>
                        </div>
                    )}

                    {/* STEP 3: BRANDING */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ton des réponses IA</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['professionnel', 'amical', 'enthousiaste', 'empathique'].map(t => (
                                        <button key={t} onClick={() => setTone(t)} className={`p-3 text-sm rounded-lg border transition-all ${tone === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
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
                        </div>
                    )}

                    {/* STEP 4: FUNNEL */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 text-center">
                            <p className="text-sm text-slate-600 mb-4">Le "Funnel" intercepte les avis négatifs (1-3 étoiles) via un formulaire privé, et redirige les positifs vers Google.</p>
                            <div 
                                onClick={() => setFunnelActive(!funnelActive)}
                                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${funnelActive ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-900">Activer le filtre anti-avis négatifs</span>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${funnelActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${funnelActive ? 'translate-x-6' : ''}`}></div>
                                    </div>
                                </div>
                                <p className="text-xs text-left text-slate-500">Augmente votre note moyenne de +0.5★ en 30 jours.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: WIDGET */}
                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 text-center">
                            <p className="text-sm text-slate-600 mb-4">Affichez vos meilleurs avis sur votre site web pour rassurer vos visiteurs.</p>
                            <Button 
                                variant={widgetActive ? 'primary' : 'outline'} 
                                onClick={() => setWidgetActive(true)}
                                className="w-full h-14"
                            >
                                {widgetActive ? "Widget Configuré" : "Installer le widget (Envoyer code par email)"}
                            </Button>
                        </div>
                    )}

                    {/* STEP 6: AUTOMATION */}
                    {step === 6 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 text-center">
                            <p className="text-sm text-slate-600 mb-4">Ne perdez plus de temps à répondre aux avis "5 étoiles sans commentaire".</p>
                            <div 
                                onClick={() => setAutoActive(!autoActive)}
                                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${autoActive ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-900">Activer le Pilote Automatique</span>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${autoActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${autoActive ? 'translate-x-6' : ''}`}></div>
                                    </div>
                                </div>
                                <p className="text-xs text-left text-slate-500">Répond automatiquement aux avis 5★ (avec votre ton).</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 7: MOBILE APP */}
                    {step === 7 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 text-center">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                                <h3 className="font-bold text-lg mb-2">Restez notifié en temps réel</h3>
                                <p className="text-sm text-slate-300 mb-4">Installez la PWA sur votre mobile pour répondre aux avis d'où vous voulez.</p>
                                <div className="flex justify-center gap-4 text-xs opacity-70">
                                    <span>iOS: Partager {'>'} Sur l'écran d'accueil</span>
                                    <span>Android: Menu {'>'} Installer l'app</span>
                                </div>
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
                            {step === 7 ? t('onboarding.finish') : t('onboarding.next')} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
            
            {step < 7 && (
                <button onClick={() => navigate('/dashboard')} className="mt-6 text-xs text-slate-400 hover:text-slate-600 underline">
                    {t('onboarding.skip')}
                </button>
            )}
        </div>
    );
};
