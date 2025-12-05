
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, BrandSettings, User, IndustryType, NotificationSettings, ApiKey, WebhookConfig } from '../types';
import { Card, CardContent, Button, Input, Select, Toggle, useToast, Badge, CardHeader, CardTitle, useNavigate, useLocation, ProLock } from '../components/ui';
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
    AlertCircle, 
    RefreshCw, 
    CheckSquare, 
    Play, 
    Star, 
    ShieldCheck, 
    Activity, 
    ExternalLink, 
    Check, 
    Briefcase, 
    Globe, 
    Phone, 
    MapPin, 
    PenLine, 
    UserPlus, 
    Lock, 
    Send, 
    Search, 
    UploadCloud, 
    FileText, 
    Link as LinkIcon, 
    Code, 
    Key, 
    Webhook, 
    Copy, 
    Zap, 
    Image as ImageIcon, 
    CreditCard, 
    AlertTriangle,
    ArrowRight,
    Server
} from 'lucide-react';

// --- ICONS FOR BRANDS ---
const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.95-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
);
const TripAdvisorIcon = () => <div className="font-serif font-bold text-green-600 text-lg tracking-tighter">TA</div>;

// ... [Keep IntegrationCard, LocationModal, GoogleMappingModal, InviteModal as is] ...
const IntegrationCard = ({ icon: Icon, title, description, connected, onConnect, comingSoon = false, type = "source" }: any) => (
    <div className={`p-5 rounded-xl border transition-all duration-300 ${connected ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                    <Icon />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                    <p className="text-xs text-slate-500">{type === 'source' ? 'Source d\'avis' : 'Canal Social'}</p>
                </div>
            </div>
            {connected ? (
                <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Actif</Badge>
            ) : comingSoon ? (
                <Badge variant="neutral" className="opacity-70">Bientôt</Badge>
            ) : (
                <button onClick={onConnect} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors">Connecter</button>
            )}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{description}</p>
    </div>
);

const LocationModal = ({ location, onClose, onSave, onUpload }: { location?: Location | null, onClose: () => void, onSave: (data: any) => Promise<void>, onUpload?: (file: File, id: string) => Promise<void> }) => {
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
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [tab, setTab] = useState<'info' | 'profile'>('info');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
        onClose();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && location && onUpload) {
            setUploading(true);
            await onUpload(e.target.files[0], location.id);
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">{location ? 'Modifier l\'établissement' : 'Ajouter un établissement'}</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setTab('info')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>Informations</button>
                    <button onClick={() => setTab('profile')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>Profil Public (SEO)</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="loc-form" onSubmit={handleSubmit} className="space-y-4">
                        {tab === 'info' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'établissement</label>
                                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Restaurant Le Gourmet" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                                        <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Paris" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
                                        <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse complète</label>
                                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="12 Rue de la Paix, 75000" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                                        <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+33 1 23 45 67 89" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Web</label>
                                        <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://monsite.com" />
                                    </div>
                                </div>
                                
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Liens de Collecte (Review Funnel)</h4>
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <label className="block text-xs font-bold text-indigo-900 mb-1">Google Avis (Prioritaire)</label>
                                        <Input value={formData.google_review_url} onChange={e => setFormData({...formData, google_review_url: e.target.value})} placeholder="https://g.page/r/..." className="bg-white text-xs" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Facebook</label>
                                            <Input value={formData.facebook_review_url} onChange={e => setFormData({...formData, facebook_review_url: e.target.value})} placeholder="https://facebook.com/..." className="text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">TripAdvisor</label>
                                            <Input value={formData.tripadvisor_review_url} onChange={e => setFormData({...formData, tripadvisor_review_url: e.target.value})} placeholder="https://tripadvisor.com/..." className="text-xs" />
                                        </div>
                                    </div>
                                </div>

                                {location && (
                                    <div className="border-t border-slate-200 pt-4 mt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <UploadCloud className="h-4 w-4" /> Import Manuel (Historique)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="file" 
                                                accept=".csv"
                                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                            {uploading && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Format CSV : Date, Auteur, Note (1-5), Commentaire</p>
                                    </div>
                                )}
                            </>
                        )}

                        {tab === 'profile' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">Activer le profil public</h4>
                                        <p className="text-xs text-slate-500">Page SEO référencée sur Google avec tous vos avis.</p>
                                    </div>
                                    <Toggle checked={formData.public_profile_enabled} onChange={(v) => setFormData({...formData, public_profile_enabled: v})} />
                                </div>

                                {formData.public_profile_enabled && (
                                    <>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Lien de réservation / Commande</label>
                                                <Input 
                                                    value={formData.booking_url} 
                                                    onChange={e => setFormData({...formData, booking_url: e.target.value})} 
                                                    placeholder="https://thefork.com/..." 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Image de couverture (URL)</label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        value={formData.cover_image} 
                                                        onChange={e => setFormData({...formData, cover_image: e.target.value})} 
                                                        placeholder="https://..." 
                                                    />
                                                    <div className="h-10 w-10 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0">
                                                        {formData.cover_image ? <img src={formData.cover_image} className="w-full h-full object-cover" /> : <ImageIcon className="h-5 w-5 m-auto mt-2 text-slate-300"/>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800">
                                            <div className="flex items-center gap-2 font-bold mb-2">
                                                <ExternalLink className="h-4 w-4" /> Lien Public
                                            </div>
                                            <a href={`/#/v/${location?.id}`} target="_blank" className="underline break-all block">
                                                {window.location.origin}/#/v/{location?.id}
                                            </a>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </form>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <Button variant="ghost" onClick={onClose}>Annuler</Button>
                    <Button form="loc-form" type="submit" isLoading={saving}>Enregistrer</Button>
                </div>
            </Card>
        </div>
    );
};

const GoogleMappingModal = ({ locations, onClose, onSave }: { locations: Location[], onClose: () => void, onSave: (mappings: Record<string, string>) => Promise<void> }) => {
    const [googleLocations, setGoogleLocations] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toast = useToast();

    useEffect(() => {
        loadGoogleData();
        const initialMap: Record<string, string> = {};
        locations.forEach(l => {
            if (l.external_reference) initialMap[l.id] = l.external_reference;
        });
        setMappings(initialMap);
    }, []);

    const loadGoogleData = async () => {
        try {
            const list = await api.google.fetchAllGoogleLocations();
            setGoogleLocations(list);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        await onSave(mappings);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-indigo-600" /> Mapping des Établissements
                    </h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {loading && googleLocations.length === 0 ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                            <p className="text-slate-500">Récupération de vos fiches Google...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-red-50 text-red-700 rounded-lg text-center">
                            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="font-bold">Erreur de connexion</p>
                            <p className="text-sm mb-4">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>Reconnecter Google</Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                Associez chaque établissement Reviewflow à sa fiche Google correspondante pour activer la synchronisation automatique des avis.
                            </p>
                            
                            {locations.map(loc => (
                                <div key={loc.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">{loc.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> {loc.city}, {loc.country}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 hidden sm:inline">→</span>
                                        <div className="relative w-full sm:w-80">
                                            <select 
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-8 truncate"
                                                value={mappings[loc.id] || ''}
                                                onChange={(e) => setMappings({...mappings, [loc.id]: e.target.value})}
                                            >
                                                <option value="">Sélectionner une fiche Google...</option>
                                                {googleLocations.map((gLoc, i) => (
                                                    <option key={i} value={gLoc.name}>
                                                        {gLoc.title} ({gLoc.storeCode}) - {gLoc.address}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                <GoogleIcon />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <Button variant="ghost" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading || !!error} isLoading={loading}>Enregistrer et Synchroniser</Button>
                </div>
            </Card>
        </div>
    );
};

const InviteModal = ({ onClose, onInvite }: { onClose: () => void, onInvite: (email: string, role: string) => Promise<void> }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('editor');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onInvite(email, role);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md shadow-xl">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        Inviter un collaborateur
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
                            <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="collegue@entreprise.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                            <Select value={role} onChange={e => setRole(e.target.value)}>
                                <option value="admin">Administrateur (Accès total)</option>
                                <option value="editor">Éditeur (Peut répondre aux avis)</option>
                                <option value="viewer">Lecteur (Vue seule)</option>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
                            <Button type="submit" isLoading={loading} icon={Send}>Envoyer l'invitation</Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export const SettingsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Modals state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form states (Brand)
  const [brandTone, setBrandTone] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandKnowledge, setBrandKnowledge] = useState('');
  const [useEmojis, setUseEmojis] = useState(false);
  const [languageStyle, setLanguageStyle] = useState<'formal' | 'casual'>('formal');
  const [testResponse, setTestResponse] = useState('');
  const [testingVoice, setTestingVoice] = useState(false);

  // Form states (Org)
  const [orgCommercialName, setOrgCommercialName] = useState('');
  const [orgLegalName, setOrgLegalName] = useState('');
  const [orgSiret, setOrgSiret] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('other');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Form states (Profile)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('');

  // Form states (Notifications)
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
      email_alerts: true,
      alert_threshold: 3,
      weekly_digest: true,
      digest_day: 'monday',
      marketing_emails: false
  });

  // API & Webhooks
  const [webhookUrl, setWebhookUrl] = useState('');
  const [keyName, setKeyName] = useState('');

  // Test email state
  const [testingEmail, setTestingEmail] = useState(false);

  // System Health state
  const [systemHealth, setSystemHealth] = useState<{db: boolean, latency: number} | null>(null);

  useEffect(() => {
    // 1. Check URL for tab
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
        setActiveTab(tabParam);
    }

    // 2. Tentative de capture du token au chargement si retour de login
    api.organization.saveGoogleTokens().then((success) => {
        if (success) {
            toast.success("Compte connecté avec succès !");
            loadData(); 
        } else {
            loadData();
        }
    });
  }, [location.search]);

  useEffect(() => {
      if (activeTab === 'system') {
          api.system.checkHealth().then(setSystemHealth);
      }
  }, [activeTab]);

  const loadData = async () => {
      setLoading(true);
      try {
        const [userData, orgData, teamData] = await Promise.all([
            api.auth.getUser(),
            api.organization.get(),
            api.team.list()
        ]);
        
        setUser(userData);
        setOrg(orgData);
        setTeam(teamData);
        
        if (userData) {
            setUserName(userData.name);
            setUserEmail(userData.email);
            setUserRole(userData.role);
        }

        if (orgData) {
            setOrgCommercialName(orgData.name);
            setOrgLegalName(orgData.legal_name || '');
            setOrgSiret(orgData.siret || '');
            setOrgAddress(orgData.address || '');
            setIndustry(orgData.industry || 'other');
            if (orgData.brand) {
                setBrandTone(orgData.brand.tone || '');
                setBrandDesc(orgData.brand.description || '');
                setBrandKnowledge(orgData.brand.knowledge_base || '');
                setUseEmojis(orgData.brand.use_emojis || false);
                setLanguageStyle(orgData.brand.language_style || 'formal');
            }
            if (orgData.notification_settings) {
                setNotifSettings(orgData.notification_settings);
            }
        }
      } catch (e) {
          console.error(e);
          toast.error("Erreur de chargement des paramètres");
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateProfile = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      try {
          await api.auth.updateProfile({ name: userName, email: userEmail, password: userPassword || undefined, role: userRole as User['role'] });
          toast.success("Profil mis à jour !");
          setUserPassword(''); 
          if (user?.role !== userRole) window.location.reload();
      } catch(e: any) {
          toast.error("Erreur mise à jour profil : " + e.message);
      }
  };

  const handleDeleteAccount = async () => {
      if (confirm("ÊTES-VOUS SÛR ? Cette action est irréversible. Tapez OK pour confirmer.")) {
          try {
              await api.auth.deleteAccount();
              window.location.href = '/';
          } catch (e: any) {
              toast.error("Erreur suppression: " + e.message);
          }
      }
  };

  const handleResetPassword = async () => {
      if(!userEmail) return;
      await api.auth.resetPassword(userEmail);
      toast.success("Email de réinitialisation envoyé.");
  };

  const handleSearchCompany = async () => {
      if(!searchQuery) return;
      setSearching(true);
      try {
          const results = await api.company.search(searchQuery);
          setSearchResults(results);
          if(results.length === 0) toast.info("Aucune entreprise trouvée.");
      } catch(e) {
          toast.error("Erreur recherche entreprise");
      } finally {
          setSearching(false);
      }
  };

  const handleSelectCompany = (company: any) => {
      setOrgLegalName(company.legal_name);
      setOrgSiret(company.siret);
      setOrgAddress(company.address);
      if(!orgCommercialName) setOrgCommercialName(company.legal_name); 
      setSearchResults([]);
      setSearchQuery('');
  };

  const handleSaveOrg = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      if (!org) return;
      await api.organization.update({ 
          name: orgCommercialName, 
          legal_name: orgLegalName, 
          siret: orgSiret, 
          address: orgAddress,
          industry: industry as any 
      });
      toast.success("Informations entreprise mises à jour");
  };

  const handleSaveBrand = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
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

  const handleSaveNotifications = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      if (!org) return;
      await api.organization.update({ notification_settings: notifSettings });
      toast.success("Préférences de notification enregistrées");
  };

  const handleTestEmail = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      setTestingEmail(true);
      try {
          await api.notifications.sendTestEmail();
          toast.success("Email de test envoyé ! (Vérifiez Resend)");
      } catch (e: any) {
          toast.error("Erreur: " + e.message);
      } finally {
          setTestingEmail(false);
      }
  };

  const handleSaveLocation = async (data: any) => {
      try {
          if (editingLocation) {
              await api.locations.update(editingLocation.id, data);
              toast.success("Établissement modifié");
          } else {
              await api.locations.create(data);
              toast.success("Établissement ajouté");
          }
          loadData();
      } catch (e: any) {
          toast.error("Erreur: " + e.message);
      }
  };

  const handleImportCsv = async (file: File, locationId: string) => {
      try {
          const count = await api.reviews.uploadCsv(file, locationId);
          toast.success(`${count} avis importés avec succès !`);
          loadData();
      } catch (e: any) {
          toast.error("Erreur d'import : " + e);
      }
  };

  const handleDeleteLocation = async (id: string) => {
      if(confirm("Supprimer cet établissement ? Les avis associés seront conservés mais détachés.")) {
          await api.locations.delete(id);
          toast.success("Supprimé");
          loadData();
      }
  };

  const handleInvite = async (email: string, role: string) => {
      try {
          await api.team.invite(email, role);
          toast.success(`Invitation envoyée à ${email}`);
          loadData();
      } catch (e) {
          toast.error("Erreur lors de l'invitation");
      }
  };

  const handleTestVoice = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
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
          console.error(e);
          // Fallback simulation in UI if API fails
          const simResponse = `[Simulation] Bonjour, merci pour votre retour. Nous sommes navrés pour l'attente. Vos remarques nous aident à nous améliorer. (Mode dégradé activé)`;
          setTestResponse(simResponse);
          toast.warning("IA indisponible, affichage simulation.");
      } finally {
          setTestingVoice(false);
      }
  };

  const handleSaveMappings = async (mappings: Record<string, string>) => {
      try {
          for (const [locId, googleResource] of Object.entries(mappings)) {
              if (googleResource) {
                  await api.locations.update(locId, { external_reference: googleResource });
              }
          }
          toast.success("Configuration sauvegardée !");
          await handleSyncNow();
          loadData();
      } catch (e) {
          toast.error("Erreur de sauvegarde");
      }
  };

  const handleSyncNow = async () => {
      if (!org?.locations) return;
      setSyncing(true);
      let total = 0;
      try {
          for (const loc of org.locations) {
              if (loc.external_reference) {
                  const count = await api.google.syncReviewsForLocation(loc.id, loc.external_reference);
                  total += count;
              }
          }
          toast.success(`Synchronisation terminée : ${total} nouveaux avis !`);
      } catch (e: any) {
          toast.error("Erreur de sync: " + e.message);
      } finally {
          setSyncing(false);
      }
  };

  const handleImportGoogle = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      setImporting(true);
      try {
          const count = await api.locations.importFromGoogle();
          if (count > 0) {
              toast.success(`${count} établissements importés avec succès !`);
              // Force reload to get the new location IDs
              await loadData();
          } else {
              toast.info("Aucun nouvel établissement trouvé ou erreur de token. (Reconnectez Google si nécessaire)");
          }
      } catch (e: any) {
          toast.error("Erreur d'import : " + e.message);
      } finally {
          setImporting(false);
      }
  };

  const handleGenerateKey = async () => {
      if (!keyName) return;
      await api.organization.generateApiKey(keyName);
      setKeyName('');
      loadData();
      toast.success("Clé API générée");
  };

  const handleRevokeKey = async (id: string) => {
      if (confirm("Révoquer cette clé API ? Toutes les requêtes l'utilisant échoueront.")) {
          await api.organization.revokeApiKey(id);
          loadData();
          toast.success("Clé révoquée");
      }
  };

  const handleAddWebhook = async () => {
      if (!webhookUrl) return;
      await api.organization.saveWebhook(webhookUrl, ['review.created']);
      setWebhookUrl('');
      loadData();
      toast.success("Webhook ajouté");
  };

  const handleTestWebhook = async (id: string) => {
      const ok = await api.organization.testWebhook(id);
      if (ok) toast.success("Test Webhook réussi !");
      else toast.error("Échec du test Webhook");
  };

  const handleDeleteWebhook = async (id: string) => {
      await api.organization.deleteWebhook(id);
      loadData();
  };

  const handleSimulateStripe = async (e?: React.MouseEvent) => {
      e?.currentTarget.blur();
      try {
          // Effectively update the org plan via mock API or real endpoint if backend exists
          await api.organization.simulatePlanChange('pro');
          await loadData();
          toast.success("Webhook Stripe simulé : Abonnement activé (PRO) !");
      } catch (e) {
          toast.error("Erreur simulation");
      }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

  // Empty state for new users
  if (!org && !loading) {
      return (
        <div className="max-w-5xl mx-auto space-y-8 p-12 text-center animate-in fade-in">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Bienvenue {user?.name} !</h1>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Pour accéder aux paramètres, vous devez d'abord créer ou rejoindre une organisation.
            </p>
            <Button onClick={() => navigate('/onboarding')} size="lg" icon={ArrowRight}>
                Créer mon organisation
            </Button>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500">Gérez votre profil, votre entreprise et vos outils.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
            {['profile', 'organization', 'locations', 'integrations', 'brand', 'notifications', 'team', 'developer', 'system'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => {
                        setActiveTab(tab);
                        navigate(`/settings?tab=${tab}`);
                    }}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    {tab === 'profile' ? 'Mon Profil' : tab === 'brand' ? 'Identité & IA' : tab === 'locations' ? 'Établissements' : tab === 'team' ? 'Équipe' : tab === 'integrations' ? 'Intégrations' : tab === 'organization' ? 'Entreprise' : tab === 'developer' ? 'Dév & API' : tab === 'system' ? 'Système & Santé' : tab}
                </button>
            ))}
        </div>

        <div className="p-6 md:p-8">
            {activeTab === 'profile' && (
                <div className="max-w-xl space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                            {userName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{userName}</h3>
                            <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom Complet</label>
                            <Input value={userName} onChange={e => setUserName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <Input value={userEmail} onChange={e => setUserEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe (Laisser vide si inchangé)</label>
                            <Input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <Button onClick={(e) => handleUpdateProfile(e)}>Enregistrer le profil</Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-12 pt-8 border-t border-red-100">
                        <h4 className="text-red-700 font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Zone de Danger
                        </h4>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <h5 className="font-bold text-red-900 text-sm mb-1">Supprimer mon compte</h5>
                            <p className="text-red-700 text-xs mb-4">
                                Cette action est irréversible. Toutes vos données personnelles seront effacées. 
                                Si vous êtes le dernier administrateur, l'organisation sera également supprimée.
                            </p>
                            <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                                Supprimer définitivement
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'organization' && (
                <div className="max-w-xl space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                            <Search className="h-4 w-4" /> Recherche Auto (SIRET)
                        </h4>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Nom de l'entreprise..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <Button onClick={handleSearchCompany} isLoading={searching}>Chercher</Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {searchResults.map((res, i) => (
                                    <div key={i} className="p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => handleSelectCompany(res)}>
                                        <div className="font-bold text-sm">{res.legal_name}</div>
                                        <div className="text-xs text-slate-500">{res.address} - {res.siret}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom Commercial</label>
                            <Input value={orgCommercialName} onChange={e => setOrgCommercialName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Raison Sociale</label>
                            <Input value={orgLegalName} onChange={e => setOrgLegalName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">SIRET</label>
                                <Input value={orgSiret} onChange={e => setOrgSiret(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Industrie</label>
                                <Select value={industry} onChange={e => setIndustry(e.target.value as any)}>
                                    <option value="restaurant">Restauration</option>
                                    <option value="hotel">Hôtellerie</option>
                                    <option value="retail">Commerce</option>
                                    <option value="services">Services</option>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Siège</label>
                            <Input value={orgAddress} onChange={e => setOrgAddress(e.target.value)} />
                        </div>
                        <Button onClick={(e) => handleSaveOrg(e)}>Mettre à jour l'entreprise</Button>
                    </div>
                </div>
            )}

            {activeTab === 'locations' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Vos Établissements</h3>
                        <div className="flex gap-2">
                            <Button 
                                variant="primary" 
                                onClick={(e) => handleImportGoogle(e)} 
                                isLoading={importing} 
                                icon={UploadCloud}
                                className="shadow-lg shadow-indigo-200"
                            >
                                Importer depuis Google
                            </Button>
                            <Button variant="outline" onClick={() => setShowMappingModal(true)}>Mapper Google</Button>
                            <Button icon={Plus} onClick={() => { setEditingLocation(null); setShowLocationModal(true); }}>Ajouter</Button>
                        </div>
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
                                            {loc.external_reference && (
                                                <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                                                    <GoogleIcon /> Synchronisé
                                                </div>
                                            )}
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

            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    <h3 className="font-bold text-lg mb-4">Connexions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <IntegrationCard 
                            icon={GoogleIcon} 
                            title="Google Business Profile" 
                            description="Synchronisation des avis et réponses en temps réel."
                            connected={org?.integrations.google}
                            onConnect={api.auth.connectGoogleBusiness}
                        />
                        <IntegrationCard 
                            icon={Facebook} 
                            title="Facebook Pages" 
                            description="Gérez les avis et commentaires de vos pages."
                            connected={org?.integrations.facebook}
                            onConnect={() => toast.info("Intégration Facebook bientôt disponible")}
                            comingSoon
                        />
                        <IntegrationCard 
                            icon={Instagram} 
                            title="Instagram" 
                            description="Publiez vos meilleurs avis en story."
                            connected={org?.integrations.instagram_posting}
                            type="social"
                            comingSoon
                        />
                        <IntegrationCard 
                            icon={TripAdvisorIcon} 
                            title="TripAdvisor" 
                            description="Importation des avis voyageurs."
                            connected={false}
                            comingSoon
                        />
                    </div>
                </div>
            )}

            {activeTab === 'brand' && (
                <div className="max-w-2xl space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <Sparkles className="h-5 w-5" /> Brand Voice IA
                        </h4>
                        <p className="text-sm text-indigo-700 mb-6">
                            Définissez comment l'IA doit parler pour qu'elle ressemble à votre équipe.
                        </p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900 mb-1">Ton</label>
                                    <Select value={brandTone} onChange={e => setBrandTone(e.target.value)}>
                                        <option value="professionnel">Professionnel</option>
                                        <option value="amical">Amical & Chaleureux</option>
                                        <option value="luxe">Luxe & Distingué</option>
                                        <option value="humoristique">Humoristique</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900 mb-1">Style</label>
                                    <Select value={languageStyle} onChange={e => setLanguageStyle(e.target.value as any)}>
                                        <option value="formal">Vouvoiement (Classique)</option>
                                        <option value="casual">Tutoiement (Moderne)</option>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-indigo-900 mb-1">Base de Connaissance (Context)</label>
                                <textarea 
                                    className="w-full p-3 rounded-lg border border-indigo-200 text-sm h-32 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Nous sommes fermés le lundi. Le chef s'appelle Mario. Notre spécialité est la truffe..."
                                    value={brandKnowledge}
                                    onChange={e => setBrandKnowledge(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Toggle checked={useEmojis} onChange={setUseEmojis} />
                                <span className="text-sm font-medium text-indigo-900">Utiliser des émojis 😊</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <Button variant="secondary" size="sm" onClick={(e) => handleTestVoice(e)} isLoading={testingVoice}>Tester la voix</Button>
                                <Button onClick={(e) => handleSaveBrand(e)}>Sauvegarder</Button>
                            </div>

                            {testResponse && (
                                <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100 text-sm text-slate-600 italic relative">
                                    <div className="absolute -top-3 left-4 bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Aperçu</div>
                                    "{testResponse}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="max-w-xl space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                            <div>
                                <div className="font-bold text-slate-900">Alertes Email Instantanées</div>
                                <div className="text-xs text-slate-500">Recevez un email à chaque nouvel avis.</div>
                            </div>
                            <Toggle checked={notifSettings.email_alerts} onChange={v => setNotifSettings({...notifSettings, email_alerts: v})} />
                        </div>

                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                            <div>
                                <div className="font-bold text-slate-900">Digest Hebdomadaire</div>
                                <div className="text-xs text-slate-500">Un résumé de vos performances chaque lundi.</div>
                            </div>
                            <Toggle checked={notifSettings.weekly_digest} onChange={v => setNotifSettings({...notifSettings, weekly_digest: v})} />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Seuil d'alerte critique</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" min="1" max="5" step="1" 
                                    value={notifSettings.alert_threshold}
                                    onChange={e => setNotifSettings({...notifSettings, alert_threshold: parseInt(e.target.value)})}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                />
                                <span className="font-bold text-red-600">{notifSettings.alert_threshold} Étoiles</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Vous serez notifié en priorité si un avis est inférieur ou égal à ce score.</p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={(e) => handleTestEmail(e)} isLoading={testingEmail}>Envoyer un email de test</Button>
                            <Button onClick={(e) => handleSaveNotifications(e)}>Enregistrer</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other tabs remain unchanged */}
            {activeTab === 'team' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Membres de l'équipe</h3>
                        <Button icon={UserPlus} onClick={() => setShowInviteModal(true)}>Inviter</Button>
                    </div>
                    
                    <div className="grid gap-4">
                        {team.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{member.name}</div>
                                        <div className="text-xs text-slate-500">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="neutral" className="capitalize">{member.role === 'super_admin' ? 'Super Admin' : member.role === 'admin' ? 'Administrateur' : member.role === 'editor' ? 'Éditeur' : 'Lecteur'}</Badge>
                                    {member.role !== 'super_admin' && (
                                        <button className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'developer' && (
                <div className="space-y-8">
                    {/* PAYWALL - Enterprise Only */}
                    {(org?.subscription_plan === 'free' || org?.subscription_plan === 'starter') ? (
                        <ProLock 
                            title="Débloquez l'API & Webhooks" 
                            description="Intégrez Reviewflow à votre système existant (CRM, ERP) avec le plan Enterprise."
                        >
                            <div className="filter blur-[3px] pointer-events-none opacity-50 space-y-8">
                                 {/* Fake Content for blur */}
                                <section>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg flex items-center gap-2"><Key className="h-5 w-5 text-indigo-600"/> Clés API</h3>
                                    </div>
                                </section>
                            </div>
                        </ProLock>
                    ) : (
                        <>
                            {/* API Keys */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><Key className="h-5 w-5 text-indigo-600"/> Clés API</h3>
                                    <div className="flex gap-2">
                                        <Input placeholder="Nom de la clé (ex: Zapier)" className="w-48 h-9 text-xs" value={keyName} onChange={e => setKeyName(e.target.value)} />
                                        <Button size="sm" onClick={handleGenerateKey} disabled={!keyName}>Générer</Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {org?.api_keys?.map(apiKey => (
                                        <div key={apiKey.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                                            <div>
                                                <div className="font-bold text-sm text-slate-900">{apiKey.name}</div>
                                                <div className="font-mono text-xs text-slate-500 mt-1">{apiKey.key.substring(0, 12)}...</div>
                                            </div>
                                            <button onClick={() => handleRevokeKey(apiKey.id)} className="text-xs text-red-600 hover:underline">Révoquer</button>
                                        </div>
                                    ))}
                                    {(!org?.api_keys || org.api_keys.length === 0) && <p className="text-sm text-slate-500 italic">Aucune clé active.</p>}
                                </div>
                            </section>

                            {/* Webhooks */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><Webhook className="h-5 w-5 text-indigo-600"/> Webhooks</h3>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                                    <div className="flex gap-2">
                                        <Input placeholder="https://votre-api.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                                        <Button onClick={handleAddWebhook}>Ajouter</Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {org?.webhooks?.map(hook => (
                                        <div key={hook.id} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-2 w-2 rounded-full ${hook.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <div className="text-sm font-mono text-slate-700 truncate max-w-xs">{hook.url}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="xs" variant="outline" onClick={() => handleTestWebhook(hook.id)}>Tester</Button>
                                                <button onClick={() => handleDeleteWebhook(hook.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    {/* Billing Simulator (Dev Only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <section className="pt-8 border-t border-slate-200">
                            <h3 className="font-bold text-sm text-slate-400 uppercase mb-4">Zone de Test (Simulation)</h3>
                            <Button variant="outline" onClick={(e) => handleSimulateStripe(e)} icon={CreditCard}>
                                Simuler Webhook Stripe (Upgrade Pro)
                            </Button>
                        </section>
                    )}
                </div>
            )}

            {/* --- SYSTEM HEALTH TAB --- */}
            {activeTab === 'system' && (
                <div className="max-w-2xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-indigo-600" />
                                État du Système
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${systemHealth?.db ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Server className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Base de Données</h4>
                                        <p className="text-xs text-slate-500">{systemHealth?.db ? 'Connexion établie' : 'Déconnecté'}</p>
                                    </div>
                                </div>
                                <Badge variant={systemHealth?.db ? 'success' : 'error'}>
                                    {systemHealth?.db ? 'En ligne' : 'Hors ligne'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Latence API</div>
                                    <div className="text-2xl font-mono font-bold text-slate-900">{systemHealth?.latency || 0} ms</div>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Mode</div>
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {localStorage.getItem('is_demo_mode') === 'true' ? 'DÉMO' : 'PRODUCTION'}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900">
                                <p className="font-bold mb-1">Information</p>
                                <p>Si la base de données est connectée, vos données sont sécurisées et synchronisées. En cas d'erreur, vérifiez vos variables d'environnement Vercel.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
      </div>

      {/* Modals */}
      {showLocationModal && <LocationModal location={editingLocation} onClose={() => setShowLocationModal(false)} onSave={handleSaveLocation} onUpload={handleImportCsv} />}
      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />}
      {showMappingModal && org?.locations && <GoogleMappingModal locations={org.locations} onClose={() => setShowMappingModal(false)} onSave={handleSaveMappings} />}
    </div>
  );
};
