
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, SavedReply, BrandSettings, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Toggle, useToast, Badge } from '../components/ui';
import { Terminal, Building2, Plus, UploadCloud, X, Sparkles, Download, Database, Users, Mail, Bell, Instagram, Facebook, Trash2, CheckCircle2, Loader2, ArrowRight, AlertCircle, RefreshCw, Send, Edit, Link, Play, MessageSquare, User as UserIcon, Lock, AlertTriangle, Square, CheckSquare, Info, ShieldCheck, Check, Activity, ExternalLink, Star } from 'lucide-react';

// --- GOOGLE CONNECT WIZARD COMPONENT ---
const GoogleConnectWizard = ({ onClose, onConnect }: { onClose: () => void, onConnect: () => void }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    // Mock list of locations returned by Google API
    const [locations, setLocations] = useState<{id: string, name: string, address: string}[]>([
        { id: 'loc_g_1', name: 'Le Bistrot Gourmand', address: '12 Rue de la République, Lyon' },
        { id: 'loc_g_2', name: 'Bistrot Express', address: 'Centre Commercial Part-Dieu, Lyon' },
        { id: 'loc_g_3', name: 'Garage Auto Plus', address: 'Zone Industrielle Nord, Paris' }
    ]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const toast = useToast();

    const handleAuth = async () => {
        setLoading(true);
        try {
            // Lancement du vrai flux OAuth Google Business
            await api.auth.connectGoogleBusiness();
        } catch (e: any) {
            console.error(e);
            toast.error("Erreur de connexion Google : " + e.message);
            setLoading(false);
        }
    };

    const toggleLocation = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSync = async () => {
        if(selectedIds.length === 0) return;
        setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // On simule la création des locations dans la DB locale
            for (const id of selectedIds) {
                const gLoc = locations.find(l => l.id === id);
                if (gLoc) {
                    await api.locations.create({
                        name: gLoc.name,
                        address: gLoc.address,
                        city: gLoc.address.split(',')[1]?.trim() || 'Ville inconnue',
                        country: 'France',
                        google_review_url: `https://search.google.com/local/writereview?placeid=${id}`
                    });
                }
            }
            
            setLoading(false);
            setStep(3);
        } catch (e) {
            toast.error("Erreur lors de la synchronisation");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
                <div className="bg-white p-2 flex justify-end">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <CardContent className="p-8 pt-2">
                    {step === 1 && (
                        <div className="text-center space-y-8">
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                                <div className="relative bg-white rounded-full p-4 shadow-lg border border-slate-100 flex items-center justify-center h-full w-full">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-10 w-10" alt="G" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 border-4 border-white shadow-sm">
                                    <RefreshCw className="h-4 w-4" />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Connecter Google Business</h3>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                                    Importez vos établissements, synchronisez vos avis en temps réel et répondez directement depuis Reviewflow.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Synchronisation des avis 24/7</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Réponses publiées instantanément</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Gestion multi-établissements</span>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>
                                    <strong>Important :</strong> Connectez le compte Google qui est "Propriétaire" ou "Administrateur" de vos fiches établissements.
                                </p>
                            </div>

                            <button 
                                onClick={handleAuth}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all py-3.5 px-6 rounded-xl font-roboto font-medium text-base shadow-sm relative overflow-hidden group"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                                ) : (
                                    <>
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-5 w-5" alt="G" />
                                        <span>Continuer avec Google</span>
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-slate-400">En continuant, vous acceptez d'accorder les permissions de gestion.</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900">Établissements détectés</h3>
                                <p className="text-sm text-slate-500 mt-1">Sélectionnez les fiches à importer.</p>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {locations.map(loc => {
                                    const isSelected = selectedIds.includes(loc.id);
                                    return (
                                        <div 
                                            key={loc.id}
                                            onClick={() => toggleLocation(loc.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 group ${isSelected ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-sm' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'}`}
                                        >
                                            <div className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                                                {isSelected && <Check className="h-4 w-4 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-slate-900 truncate">{loc.name}</div>
                                                <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                    <Building2 className="h-3 w-3" />
                                                    {loc.address}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                                <Button size="lg" className="w-full shadow-lg shadow-indigo-200" disabled={selectedIds.length === 0} onClick={handleSync} isLoading={loading}>
                                    Importer {selectedIds.length > 0 ? `${selectedIds.length} fiche(s)` : ''}
                                </Button>
                                <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Retour</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-8 animate-in zoom-in-95">
                            <div className="relative mx-auto w-24 h-24">
                                <svg className="w-full h-full text-green-500" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="283" strokeDashoffset="0" className="animate-[dash_1s_ease-out_forwards]" />
                                    <path d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="animate-[check_0.5s_ease-out_0.5s_forwards] opacity-0" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">C'est tout bon !</h3>
                                <p className="text-slate-600 mt-2 max-w-xs mx-auto">
                                    Vos avis sont en cours d'importation. Vous pouvez commencer à configurer vos réponses automatiques.
                                </p>
                            </div>
                            <Button size="lg" className="w-full" onClick={onConnect}>
                                Accéder à mes avis
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <style>{`
                @keyframes dash { from { stroke-dashoffset: 283; } to { stroke-dashoffset: 0; } }
                @keyframes check { from { opacity: 0; stroke-dasharray: 0, 100; } to { opacity: 1; stroke-dasharray: 100, 0; } }
            `}</style>
        </div>
    );
};

export const SettingsPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('integrations'); // Default to integrations to show Google Button
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Wizard state
  const [showGoogleWizard, setShowGoogleWizard] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Form states
  const [brandTone, setBrandTone] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandKnowledge, setBrandKnowledge] = useState('');
  const [useEmojis, setUseEmojis] = useState(false);
  const [languageStyle, setLanguageStyle] = useState<'formal' | 'casual'>('formal');
  const [testResponse, setTestResponse] = useState('');
  const [testingVoice, setTestingVoice] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      try {
        const [orgData, teamData] = await Promise.all([
            api.organization.get(),
            api.team.list()
        ]);
        setOrg(orgData);
        setTeam(teamData);
        
        if (orgData?.brand) {
            setBrandTone(orgData.brand.tone || 'professionnel et empathique');
            setBrandDesc(orgData.brand.description || '');
            setBrandKnowledge(orgData.brand.knowledge_base || '');
            setUseEmojis(orgData.brand.use_emojis || false);
            setLanguageStyle(orgData.brand.language_style || 'formal');
        }
      } catch (e) {
          console.error(e);
          toast.error("Erreur de chargement des paramètres");
      } finally {
          setLoading(false);
      }
  };

  const handleSaveBrand = async () => {
      if (!org) return;
      const newBrand: BrandSettings = {
          ...org.brand,
          tone: brandTone,
          description: brandDesc,
          knowledge_base: brandKnowledge,
          use_emojis: useEmojis,
          language_style: languageStyle,
          signature: org.brand?.signature || ''
      };
      await api.organization.update({ brand: newBrand });
      toast.success("Identité de marque mise à jour");
  };

  const handleTestVoice = async () => {
      setTestingVoice(true);
      try {
          const mockReview = {
              rating: 3,
              body: "Service un peu lent ce midi, mais le plat était bon. Dommage pour l'attente."
          };
          const text = await api.ai.previewBrandVoice({
              tone: brandTone,
              description: brandDesc,
              knowledge_base: brandKnowledge,
              use_emojis: useEmojis,
              language_style: languageStyle,
              signature: ''
          }, mockReview);
          setTestResponse(text);
      } catch (e) {
          toast.error("Erreur test IA");
      } finally {
          setTestingVoice(false);
      }
  };

  const handleConnectGoogle = () => {
      setShowGoogleWizard(false);
      loadData(); // Reload to update UI
      toast.success("Google Business Profile connecté avec succès !");
  };

  const handleDisconnectGoogle = async () => {
      if(confirm("Voulez-vous vraiment déconnecter votre fiche Google ?")) {
           // Call API to disconnect...
           toast.success("Déconnecté.");
           // Refresh data
           if (org) setOrg({ ...org, integrations: { ...org.integrations, google: false } });
      }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500">Gérez votre organisation et vos intégrations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('integrations')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'integrations' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
                Intégrations
            </button>
            <button 
                onClick={() => setActiveTab('brand')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'brand' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
                Identité & IA
            </button>
            <button 
                onClick={() => setActiveTab('team')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'team' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
                Équipe
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'notifications' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
                Notifications
            </button>
        </div>

        <div className="p-6 md:p-8">
            
            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    {/* Google Business Profile Card - Enhanced */}
                    <Card className={`border-2 transition-all duration-300 ${org?.integrations.google ? 'border-green-100 bg-green-50/30' : 'border-indigo-100 bg-white hover:border-indigo-200 shadow-sm hover:shadow-md'}`}>
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-12 w-12 bg-white rounded-full p-2 shadow-sm border border-slate-100 flex items-center justify-center">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="h-full w-full" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                Google Business Profile
                                                {org?.integrations.google ? (
                                                    <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Connecté</Badge>
                                                ) : (
                                                    <Badge variant="neutral" className="bg-indigo-100 text-indigo-700 border-indigo-200">Recommandé</Badge>
                                                )}
                                            </h3>
                                            <p className="text-slate-500 text-sm">La source n°1 des avis clients pour les commerces locaux.</p>
                                        </div>
                                    </div>

                                    {!org?.integrations.google ? (
                                        <div className="space-y-4">
                                            <p className="text-slate-600 leading-relaxed">
                                                Connectez votre fiche établissement pour centraliser vos avis, répondre automatiquement avec l'IA et améliorer votre référencement local.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Check className="h-4 w-4 text-green-500" /> Import historique illimité
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Check className="h-4 w-4 text-green-500" /> Réponses en temps réel
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Check className="h-4 w-4 text-green-500" /> Synchronisation 24/7
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Check className="h-4 w-4 text-green-500" /> Statistiques vues/clics
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-green-700 bg-green-100/50 p-3 rounded-lg border border-green-200">
                                                <Activity className="h-5 w-5" />
                                                <span className="font-medium">Synchronisation active. Dernière mise à jour : il y a 2 min.</span>
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                Votre fiche est connectée. Les nouveaux avis apparaîtront automatiquement dans la boîte de réception.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-auto flex flex-col items-center gap-3 min-w-[250px]">
                                    {!org?.integrations.google ? (
                                        <>
                                            <button 
                                                onClick={() => setShowGoogleWizard(true)}
                                                className="w-full py-3 px-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 group"
                                            >
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                <span>Se connecter</span>
                                            </button>
                                            <div className="text-center">
                                                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                                    <ShieldCheck className="h-3 w-3" /> Partenaire Certifié
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" icon={Trash2} onClick={handleDisconnectGoogle}>
                                                Déconnecter
                                            </Button>
                                            <Button variant="ghost" size="sm" icon={ExternalLink}>Voir ma fiche</Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                                        <Facebook className="h-5 w-5" />
                                    </div>
                                    <div className="font-medium text-slate-900">Facebook Page</div>
                                </div>
                                <Toggle checked={org?.integrations.facebook || false} onChange={() => {}} />
                            </div>
                            <p className="text-sm text-slate-500">Répondez aux recommandations Facebook.</p>
                        </div>
                        
                        <div className="p-6 rounded-xl border border-slate-200 bg-white opacity-60">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-green-600 text-white rounded-lg flex items-center justify-center">
                                        <div className="font-bold text-xs">TA</div>
                                    </div>
                                    <div className="font-medium text-slate-900">TripAdvisor</div>
                                </div>
                                <Badge variant="neutral">Bientôt</Badge>
                            </div>
                            <p className="text-sm text-slate-500">Importez vos avis de voyage.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'brand' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ton de la marque</label>
                            <Input 
                                value={brandTone} 
                                onChange={(e) => setBrandTone(e.target.value)}
                                placeholder="ex: Professionnel, Chaleureux, Décalé..."
                            />
                            <p className="text-xs text-slate-500 mt-1">Définit la personnalité de l'IA pour toutes les réponses.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Style de langage</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={languageStyle === 'formal'} 
                                        onChange={() => setLanguageStyle('formal')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm">Vouvoiement (Formel)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={languageStyle === 'casual'} 
                                        onChange={() => setLanguageStyle('casual')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm">Tutoiement (Amical)</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Toggle checked={useEmojis} onChange={setUseEmojis} />
                            <div>
                                <div className="text-sm font-medium text-slate-900">Utiliser des Emojis</div>
                                <div className="text-xs text-slate-500">L'IA ajoutera quelques emojis pertinents.</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Base de Connaissances (Contexte)</label>
                            <textarea 
                                className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                placeholder="Indiquez ici des faits clés : 'Fermé le lundi', 'Livraison gratuite dès 50€', 'Fondé en 1990'..."
                                value={brandKnowledge}
                                onChange={(e) => setBrandKnowledge(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-1">Ces infos aideront l'IA à répondre aux questions spécifiques.</p>
                        </div>

                        <Button onClick={handleSaveBrand} icon={CheckSquare}>Enregistrer</Button>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Simulateur de Voix
                        </h3>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                            <div className="flex gap-1 mb-2 text-amber-400">
                                <Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 text-slate-200" /><Star className="h-3 w-3 text-slate-200" />
                            </div>
                            <p className="text-sm text-slate-600 italic">"Service un peu lent ce midi, mais le plat était bon. Dommage pour l'attente."</p>
                        </div>

                        <div className="flex justify-center mb-4">
                             <Button size="sm" variant="secondary" onClick={handleTestVoice} isLoading={testingVoice} icon={Play}>Tester la réponse</Button>
                        </div>

                        {testResponse && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                <div className="text-xs font-bold text-indigo-600 uppercase mb-1">Réponse générée :</div>
                                <p className="text-sm text-indigo-900 leading-relaxed">{testResponse}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900">Membres de l'équipe</h3>
                        <Button size="sm" icon={Plus} onClick={() => setShowInviteModal(true)}>Inviter</Button>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                        {team.map(member => (
                            <div key={member.id} className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{member.name}</div>
                                        <div className="text-xs text-slate-500">{member.email}</div>
                                    </div>
                                </div>
                                <Badge variant={member.role === 'admin' ? 'default' : 'neutral'}>{member.role}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

             {activeTab === 'notifications' && (
                <div className="max-w-2xl space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                        <div className="flex gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 h-fit">
                                <Bell className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Alerte Nouveaux Avis</h4>
                                <p className="text-sm text-slate-500">Recevoir un email à chaque nouvel avis.</p>
                            </div>
                        </div>
                        <Toggle checked={true} onChange={() => {}} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                        <div className="flex gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 h-fit">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Alerte Avis Négatif</h4>
                                <p className="text-sm text-slate-500">Notification immédiate si note ≤ 3 étoiles.</p>
                            </div>
                        </div>
                        <Toggle checked={true} onChange={() => {}} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                        <div className="flex gap-3">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600 h-fit">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Digest Hebdomadaire</h4>
                                <p className="text-sm text-slate-500">Résumé des performances chaque lundi matin.</p>
                            </div>
                        </div>
                        <Toggle checked={true} onChange={() => {}} />
                    </div>
                </div>
            )}

        </div>
      </div>
      
      {showGoogleWizard && <GoogleConnectWizard onClose={() => setShowGoogleWizard(false)} onConnect={handleConnectGoogle} />}
    </div>
  );
};
