
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, User, BrandSettings } from '../types';
import { Card, CardContent, Button, Input, Select, Toggle, useToast, Badge, CardHeader, CardTitle, useNavigate, useLocation } from '../components/ui';
import { 
    Building2, 
    Plus, 
    X, 
    Sparkles, 
    User as UserIcon, 
    Mail, 
    Bell, 
    Instagram, 
    Facebook, 
    Linkedin, 
    Trash2, 
    CheckCircle2, 
    Loader2, 
    LinkIcon, 
    UploadCloud, 
    MessageSquare,
    Smartphone,
    Globe,
    Zap,
    PenLine,
    Shield,
    Info,
    Store,
    HelpCircle,
    Play,
    Terminal
} from 'lucide-react';

// --- ICONS FOR BRANDS ---
const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-5 h-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.95-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
);

const IntegrationCard = ({ icon: Icon, title, description, connected, onConnect, comingSoon = false, type = "source", helpLink }: any) => (
    <div className={`p-5 rounded-xl border transition-all duration-300 ${connected ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                    {typeof Icon === 'function' ? <Icon /> : Icon}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                    <p className="text-xs text-slate-500">{type}</p>
                </div>
            </div>
            {connected ? (
                <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Connecté</Badge>
            ) : comingSoon ? (
                <Badge variant="neutral" className="opacity-70">Bientôt</Badge>
            ) : (
                <button onClick={onConnect} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
                    Connecter
                </button>
            )}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{description}</p>
        {helpLink && (
            <a href={helpLink} target="_blank" className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 font-medium">
                <HelpCircle className="h-3 w-3" /> En savoir plus
            </a>
        )}
    </div>
);

// Location Modal 
const LocationModal = ({ location, onClose, onSave }: { location?: Location | null, onClose: () => void, onSave: (data: any) => Promise<void> }) => {
    const [formData, setFormData] = useState({
        name: location?.name || '',
        address: location?.address || '',
        city: location?.city || '',
        country: location?.country || 'France',
        phone: location?.phone || '',
        website: location?.website || '',
        google_review_url: location?.google_review_url || '',
        facebook_review_url: location?.facebook_review_url || '',
        tripadvisor_review_url: location?.tripadvisor_review_url || '',
        description: location?.description || '',
        public_profile_enabled: location?.public_profile_enabled || false,
        booking_url: location?.booking_url || '',
        cover_image: location?.cover_image || ''
    });
    const [tab, setTab] = useState<'info' | 'profile'>('info');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.city) return toast.error("Nom et ville requis");
        setSaving(true);
        await onSave(formData);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">{location ? 'Modifier' : 'Ajouter'}</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setTab('info')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Infos</button>
                    <button onClick={() => setTab('profile')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Profil Public (SEO)</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="loc-form" onSubmit={handleSubmit} className="space-y-4">
                        {tab === 'info' && (
                            <>
                                <div><label className="text-sm font-medium">Nom</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                <div><label className="text-sm font-medium">Ville</label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required /></div>
                                <div><label className="text-sm font-medium">Adresse</label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                            </>
                        )}
                        {tab === 'profile' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <Globe className="h-4 w-4" /> Page Vitrine SEO
                                    </h4>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Ceci n'est PAS l'identité IA. C'est une page publique indexée par Google pour afficher vos meilleurs avis et rassurer vos clients.
                                    </p>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div><h4 className="font-bold text-sm">Activer la page publique</h4><p className="text-xs text-slate-500">Accessible aux visiteurs.</p></div>
                                    <Toggle checked={formData.public_profile_enabled} onChange={v => setFormData({...formData, public_profile_enabled: v})} />
                                </div>
                                {formData.public_profile_enabled && (
                                    <>
                                        <div><label className="text-sm font-medium">Lien Réservation</label><Input value={formData.booking_url} onChange={e => setFormData({...formData, booking_url: e.target.value})} /></div>
                                        <div><label className="text-sm font-medium">Image (URL)</label><Input value={formData.cover_image} onChange={e => setFormData({...formData, cover_image: e.target.value})} /></div>
                                        <div className="bg-indigo-50 p-3 rounded text-xs text-indigo-800"><a href={`/#/v/${location?.id}`} target="_blank" className="underline">Voir le profil public</a></div>
                                    </>
                                )}
                            </div>
                        )}
                    </form>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button form="loc-form" type="submit" isLoading={saving}>Enregistrer</Button></div>
            </Card>
        </div>
    );
};

// --- AI IDENTITY FORM ---
const AiIdentityForm = ({ brand, onSave }: { brand: BrandSettings, onSave: (b: BrandSettings) => void }) => {
    // Defines defaults to prevent undefined crashes if brand object is partial
    const defaultBrand: BrandSettings = {
        enabled: false,
        tone: 'professionnel',
        description: '',
        knowledge_base: '',
        use_emojis: true,
        language_style: 'formal',
        signature: '',
        forbidden_words: [],
        response_examples: '',
        primary_color: '',
        secondary_color: '',
        logo_url: ''
    };

    // Robust merge: incoming brand + defaults
    const safeBrand = { ...defaultBrand, ...brand };

    const [settings, setSettings] = useState<BrandSettings>(safeBrand);
    const [isSaving, setIsSaving] = useState(false);
    const [newForbiddenWord, setNewForbiddenWord] = useState('');
    
    // Testing State
    const [testInput, setTestInput] = useState("C'était super, merci pour tout !");
    const [testOutput, setTestOutput] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    
    const toast = useToast();

    const handleChange = (field: keyof BrandSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(settings);
        setIsSaving(false);
        toast.success("Identité IA sauvegardée et active !");
    };

    const handleTestVoice = async () => {
        setIsTesting(true);
        setTestOutput("");
        try {
            // We call the API with the CURRENT settings in the form state, 
            // so user can test BEFORE saving.
            const response = await api.ai.previewBrandVoice('Avis Client', testInput, settings);
            setTestOutput(response);
        } catch (e: any) {
            toast.error("Erreur de test : " + e.message);
        } finally {
            setIsTesting(false);
        }
    };

    const addForbiddenWord = () => {
        if (newForbiddenWord.trim()) {
            setSettings(prev => ({
                ...prev,
                forbidden_words: [...(prev.forbidden_words || []), newForbiddenWord.trim()]
            }));
            setNewForbiddenWord('');
        }
    };

    const removeForbiddenWord = (word: string) => {
        setSettings(prev => ({
            ...prev,
            forbidden_words: prev.forbidden_words?.filter(w => w !== word)
        }));
    };

    return (
        <div className="space-y-6">
            
            {/* Master Toggle */}
            <Card className={`border-l-4 transition-colors ${settings.enabled ? 'border-l-green-500 bg-green-50/20' : 'border-l-slate-300'}`}>
                <div className="p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className={`h-5 w-5 ${settings.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                            Activer l'Identité IA
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Si activé, l'IA utilisera votre ton et vos règles ci-dessous pour toutes les générations. <br/>
                            Si désactivé, elle utilisera un ton générique professionnel.
                        </p>
                    </div>
                    <Toggle checked={settings.enabled} onChange={(v) => handleChange('enabled', v)} />
                </div>
            </Card>

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${!settings.enabled ? 'opacity-60 pointer-events-none filter blur-[1px]' : ''}`}>
                
                {/* LEFT COLUMN: SETTINGS */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PenLine className="h-5 w-5 text-indigo-600" /> Paramètres de Voix
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ton des réponses</label>
                                <Select value={settings.tone} onChange={e => handleChange('tone', e.target.value)}>
                                    <option value="professionnel">Professionnel & Formel</option>
                                    <option value="amical">Amical & Chaleureux</option>
                                    <option value="enthousiaste">Enthousiaste & Dynamique</option>
                                    <option value="empathique">Empathique & Rassurant</option>
                                    <option value="luxe">Luxe & Premium</option>
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Niveau de langue</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-3 border rounded-xl cursor-pointer text-center transition-all ${settings.language_style === 'formal' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200'}`}>
                                        <input type="radio" className="hidden" name="style" checked={settings.language_style === 'formal'} onChange={() => handleChange('language_style', 'formal')} />
                                        <div className="font-bold text-sm">Vouvoiement</div>
                                        <div className="text-xs opacity-70">"Nous vous remercions..."</div>
                                    </label>
                                    <label className={`flex-1 p-3 border rounded-xl cursor-pointer text-center transition-all ${settings.language_style === 'casual' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200'}`}>
                                        <input type="radio" className="hidden" name="style" checked={settings.language_style === 'casual'} onChange={() => handleChange('language_style', 'casual')} />
                                        <div className="font-bold text-sm">Tutoiement</div>
                                        <div className="text-xs opacity-70">"Merci pour ton avis..."</div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Contexte Établissement</label>
                                <p className="text-xs text-slate-500 mb-2">Aidez l'IA à comprendre qui vous êtes (Menu, Ambiance, Services...).</p>
                                <textarea 
                                    className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Restaurant italien familial, spécialité pizzas au feu de bois..."
                                    value={settings.knowledge_base}
                                    onChange={e => handleChange('knowledge_base', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                                <label className="text-sm font-medium text-slate-700">Utiliser des émojis ?</label>
                                <Toggle checked={settings.use_emojis} onChange={v => handleChange('use_emojis', v)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-red-600" /> Mots Interdits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-3">
                                <Input 
                                    placeholder="Mot à éviter (ex: pas de problème)" 
                                    value={newForbiddenWord}
                                    onChange={e => setNewForbiddenWord(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addForbiddenWord()}
                                />
                                <Button size="sm" variant="secondary" onClick={addForbiddenWord}>Ajouter</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {settings.forbidden_words?.map(word => (
                                    <Badge key={word} variant="neutral" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                        {word}
                                        <button onClick={() => removeForbiddenWord(word)} className="hover:text-red-900"><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: TEST ZONE */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white h-full flex flex-col border-slate-800 shadow-xl relative overflow-hidden">
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <CardHeader className="border-b border-slate-800 relative z-10">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Terminal className="h-5 w-5 text-green-400" /> Laboratoire de Test
                            </CardTitle>
                            <p className="text-xs text-slate-400 mt-1">Testez votre configuration en temps réel avant de sauvegarder.</p>
                        </CardHeader>
                        
                        <CardContent className="flex-1 flex flex-col space-y-6 p-6 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">1. Situation (Avis reçu ou message)</label>
                                <textarea 
                                    className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    placeholder="Ex: C'était bon mais le service était un peu long..."
                                    value={testInput}
                                    onChange={e => setTestInput(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-center">
                                <Button 
                                    onClick={handleTestVoice} 
                                    isLoading={isTesting}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-none w-full shadow-lg shadow-indigo-900/50"
                                >
                                    <Play className="h-4 w-4 mr-2" /> Générer une réponse test
                                </Button>
                            </div>

                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">2. Réponse de l'IA (Simulation)</label>
                                <div className="w-full h-48 p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono leading-relaxed overflow-y-auto relative">
                                    {testOutput ? (
                                        <span className="animate-in fade-in text-green-300">{testOutput}</span>
                                    ) : (
                                        <span className="text-slate-600 italic">// Le résultat apparaîtra ici...</span>
                                    )}
                                    {isTesting && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-[1px]">
                                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-10 flex justify-end gap-3 md:pl-64">
                <Button onClick={handleSave} isLoading={isSaving} size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                    Enregistrer les modifications
                </Button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export const SettingsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState('integrations'); // Default to integrations
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Modals state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);

  useEffect(() => {
    // Check URL for tab
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
        setActiveTab(tabParam);
    }
    loadData();
  }, [location.search]);

  const loadData = async () => {
      setLoading(true);
      try {
        const [userData, orgData] = await Promise.all([
            api.auth.getUser(),
            api.organization.get(),
        ]);
        setUser(userData);
        setOrg(orgData);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateOrg = async (updates: Partial<Organization>) => {
      if (!org) return;
      await api.organization.update(updates);
      setOrg({ ...org, ...updates });
  };

  const handleUpdateBrand = async (brand: BrandSettings) => {
      await handleUpdateOrg({ brand });
  };

  const handleImportGoogle = async () => {
      try {
          const count = await api.locations.importFromGoogle();
          toast.success(`${count} établissements importés !`);
          loadData();
      } catch (e: any) {
          toast.error("Erreur import: " + e.message);
      }
  };

  const handleDeleteLocation = async (id: string) => {
      if(confirm("Supprimer ?")) {
          await api.locations.delete(id);
          loadData();
      }
  };

  const handleSaveLocation = async (data: any) => {
      if (editingLocation) await api.locations.update(editingLocation.id, data);
      else await api.locations.create(data);
      loadData();
  };

  const handleConnectSocial = async (platform: string) => {
      try {
          await api.social.connectAccount(platform);
          toast.success(`Connexion ${platform} initiée`);
          loadData();
      } catch(e) {
          toast.error("Erreur connexion");
      }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500">Configurez votre compte, vos intégrations et votre IA.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
            {[
                { id: 'integrations', label: 'Intégrations', icon: LinkIcon },
                { id: 'ai-identity', label: 'Identité IA', icon: Sparkles },
                { id: 'locations', label: 'Établissements', icon: Store },
                { id: 'profile', label: 'Mon Profil', icon: UserIcon },
                { id: 'organization', label: 'Entreprise', icon: Building2 },
                { id: 'notifications', label: 'Notifications', icon: Bell },
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id);
                        navigate(`/settings?tab=${tab.id}`);
                    }}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="p-6 md:p-8 bg-slate-50/30 min-h-[60vh]">
            
            {/* --- TAB: INTEGRATIONS --- */}
            {activeTab === 'integrations' && (
                <div className="space-y-8">
                    {/* Section 1: Reviews & Google */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <GoogleIcon /> Avis & Google
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IntegrationCard 
                                icon={GoogleIcon}
                                title="Google Business Profile"
                                description="Connectez votre compte pour centraliser tous vos avis au même endroit, booster votre SEO local et permettre à l'IA d'y répondre automatiquement."
                                connected={org?.integrations?.google}
                                onConnect={() => api.auth.connectGoogleBusiness()}
                                type="Source Principale"
                                helpLink="#"
                            />
                            <IntegrationCard 
                                icon={Globe}
                                title="Page Publique SEO"
                                description="Activez une vitrine web optimisée (sans code) qui affiche vos meilleurs avis et rassure vos futurs clients lorsqu'ils vous recherchent."
                                connected={true}
                                onConnect={() => {}}
                                type="Vitrine Digitale"
                                helpLink="#"
                            />
                        </div>
                        {org?.integrations?.google && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                <div className="text-sm text-blue-800">
                                    <strong>Synchronisation active.</strong> Vos avis sont mis à jour automatiquement toutes les heures.
                                </div>
                                <Button size="sm" variant="outline" onClick={handleImportGoogle} icon={UploadCloud}>
                                    Forcer la synchro
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Social Networks */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-indigo-600" /> Réseaux Sociaux
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <IntegrationCard 
                                icon={<Facebook className="h-5 w-5 text-blue-600" />}
                                title="Facebook Page"
                                description="Publiez vos avis 5 étoiles directement sur votre page pour animer votre communauté."
                                connected={org?.integrations?.facebook_posting}
                                onConnect={() => handleConnectSocial('facebook')}
                                type="Social"
                            />
                            <IntegrationCard 
                                icon={<Instagram className="h-5 w-5 text-pink-600" />}
                                title="Instagram Business"
                                description="Créez des visuels stylés à partir de vos avis et postez-les en Story ou Feed."
                                connected={org?.integrations?.instagram_posting}
                                onConnect={() => handleConnectSocial('instagram')}
                                type="Social"
                            />
                            <IntegrationCard 
                                icon={<Linkedin className="h-5 w-5 text-blue-700" />}
                                title="LinkedIn Page"
                                description="Idéal pour le B2B : partagez vos succès clients avec votre réseau professionnel."
                                connected={org?.integrations?.linkedin_posting}
                                onConnect={() => handleConnectSocial('linkedin')}
                                type="Social"
                            />
                        </div>
                    </div>

                    {/* Section 3: Communication */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-slate-600" /> Communication & API
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IntegrationCard 
                                icon={<Smartphone className="h-5 w-5 text-indigo-600" />}
                                title="Twilio (SMS)"
                                description="Envoyez des campagnes SMS automatiques pour demander des avis après un achat."
                                connected={!!org?.twilio_settings?.account_sid}
                                onConnect={() => toast.info("Contactez le support pour configurer Twilio.")}
                                type="Messaging"
                            />
                            <IntegrationCard 
                                icon={<Mail className="h-5 w-5 text-slate-600" />}
                                title="Email Custom (Resend)"
                                description="Envoyez les demandes d'avis depuis votre propre nom de domaine pour plus de crédibilité."
                                connected={false}
                                onConnect={() => {}}
                                comingSoon
                                type="Emailing"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: AI IDENTITY --- */}
            {activeTab === 'ai-identity' && (
                // Safe check: if brand is null or undefined, pass a default or handle inside the component
                // Added a defensive check to ensure org exists before rendering if needed
                org && <AiIdentityForm brand={org.brand || {} as any} onSave={handleUpdateBrand} />
            )}

            {/* --- TAB: LOCATIONS --- */}
            {activeTab === 'locations' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Vos Établissements</h3>
                    </div>

                    {/* Info Box for Import/Map */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-bold mb-1">Connexion Google Business</p>
                            <p className="mb-2">Pour synchroniser vos avis, vous devez lier vos fiches Google.</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs">
                                <li><strong>Importer :</strong> Récupère automatiquement vos fiches Google et les crée dans Reviewflow.</li>
                                <li><strong>Mapper :</strong> Relie des établissements existants à leur fiche Google pour la synchro.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button 
                            variant="primary" 
                            onClick={handleImportGoogle} 
                            icon={UploadCloud}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            Importer depuis Google
                        </Button>
                        <Button variant="outline" onClick={() => setShowMappingModal(true)} icon={LinkIcon}>Mapper Google</Button>
                        <Button icon={Plus} onClick={() => { setEditingLocation(null); setShowLocationModal(true); }} className="ml-auto">Ajouter manuellement</Button>
                    </div>

                    {org?.locations?.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                            Aucun établissement. Cliquez sur "Importer depuis Google" pour démarrer.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {org?.locations?.map(loc => (
                                <Card key={loc.id}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{loc.name}</h4>
                                            <p className="text-sm text-slate-500">{loc.address}, {loc.city}</p>
                                            <div className="flex gap-2 mt-2">
                                                {loc.external_reference && (
                                                    <span className="text-[10px] text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                        <GoogleIcon /> Synchronisé
                                                    </span>
                                                )}
                                                {loc.public_profile_enabled && (
                                                    <span className="text-[10px] text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                        <Globe className="h-3 w-3" /> Page Publique Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="xs" variant="ghost" onClick={() => { setEditingLocation(loc); setShowLocationModal(true); }}>Modifier</Button>
                                            <button onClick={() => handleDeleteLocation(loc.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: PROFILE (Simplified) --- */}
            {activeTab === 'profile' && user && (
                <div className="max-w-xl">
                    <Card>
                        <CardHeader><CardTitle>Mon Profil</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                                <Input value={user.name} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <Input value={user.email} readOnly className="bg-slate-50" />
                            </div>
                            <div className="pt-4">
                                <Button variant="outline" onClick={() => api.auth.logout().then(() => window.location.reload())} className="text-red-600 hover:bg-red-50 hover:border-red-200">
                                    Se déconnecter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* --- TAB: ORGANIZATION (Simplified) --- */}
            {activeTab === 'organization' && org && (
                <div className="max-w-xl">
                    <Card>
                        <CardHeader><CardTitle>Entreprise</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'organisation</label>
                                <Input value={org.name} onChange={e => handleUpdateOrg({ name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secteur</label>
                                <Input value={org.industry || ''} readOnly className="bg-slate-50" />
                            </div>
                            <Button onClick={() => toast.success("Sauvegardé")} className="mt-4">Enregistrer</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
      </div>

      {showLocationModal && <LocationModal location={editingLocation} onClose={() => setShowLocationModal(false)} onSave={handleSaveLocation} />}
      {showMappingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                  <CardContent className="p-6 text-center">
                      <p>Fonctionnalité de mapping manuel à venir.</p>
                      <Button onClick={() => setShowMappingModal(false)} className="mt-4">Fermer</Button>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};
