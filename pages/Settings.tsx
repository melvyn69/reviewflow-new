
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, BrandSettings, User, IndustryType, NotificationSettings } from '../types';
import { Card, CardContent, Button, Input, Select, Toggle, useToast, Badge, CardHeader, CardTitle } from '../components/ui';
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
    Link as LinkIcon
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
const TrustpilotIcon = () => <Star className="h-full w-full text-green-500 fill-current" />;
const YelpIcon = () => <div className="font-bold text-red-600 text-lg">yelp</div>;
const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.58-1.11-.01.08-.01.16-.01.24v9.96c.42 4.67-4.48 7.6-8.32 5.91-2.91-1.32-4.14-5.26-2.45-8.03 1.29-2.09 3.95-3.04 6.22-2.23v4.18c-1.63-.73-3.66.19-4.15 1.9-.38 1.34.42 2.92 1.83 3.23 1.64.33 3.19-.92 3.22-2.55V.02h-.46z" />
    </svg>
);

// --- COMPONENTS ---

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
        description: location?.description || ''
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="loc-form" onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <label className="block text-sm font-bold text-indigo-900 mb-1">Lien Google Avis (Public)</label>
                            <Input value={formData.google_review_url} onChange={e => setFormData({...formData, google_review_url: e.target.value})} placeholder="https://g.page/r/..." className="bg-white" />
                            <p className="text-xs text-indigo-700 mt-1">Indispensable pour le QR Code et la redirection Funnel.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description courte</label>
                            <textarea 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm" 
                                rows={2}
                                placeholder="Spécialités, ambiance... (Aide l'IA à répondre)"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
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
        // Init mappings with existing
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
            <Card className="w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
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
                                        <div className="relative w-full sm:w-64">
                                            <select 
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-8"
                                                value={mappings[loc.id] || ''}
                                                onChange={(e) => setMappings({...mappings, [loc.id]: e.target.value})}
                                            >
                                                <option value="">Sélectionner...</option>
                                                {googleLocations.map((gLoc, i) => (
                                                    <option key={i} value={gLoc.name}>
                                                        {gLoc.title} ({gLoc.storeCode || 'Sans code'})
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
                    <Button onClick={handleSubmit} disabled={loading || !!error} isLoading={loading}>Enregistrer</Button>
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
  const toast = useToast();

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

  useEffect(() => {
    loadData();
  }, []);

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

  const handleUpdateProfile = async () => {
      try {
          await api.auth.updateProfile({ name: userName, email: userEmail, password: userPassword || undefined, role: userRole });
          toast.success("Profil mis à jour !");
          setUserPassword(''); // Clear password field
          // Reload window to reflect role changes if any (simplest way for demo)
          if (user?.role !== userRole) window.location.reload();
      } catch(e: any) {
          toast.error("Erreur mise à jour profil : " + e.message);
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
      if(!orgCommercialName) setOrgCommercialName(company.legal_name); // Autofill commercial name if empty
      setSearchResults([]);
      setSearchQuery('');
  };

  const handleSaveOrg = async () => {
      if (!org) return;
      await api.organization.update({ 
          name: orgCommercialName, // Nom Commercial
          legal_name: orgLegalName, // Raison Sociale
          siret: orgSiret,
          address: orgAddress,
          industry: industry as any 
      });
      toast.success("Informations entreprise mises à jour");
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

  const handleSaveNotifications = async () => {
      if (!org) return;
      await api.organization.update({ notification_settings: notifSettings });
      toast.success("Préférences de notification enregistrées");
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

  const handleSaveMappings = async (mappings: Record<string, string>) => {
      try {
          for (const [locId, googleResource] of Object.entries(mappings)) {
              if (googleResource) {
                  await api.locations.update(locId, { external_reference: googleResource });
              }
          }
          toast.success("Configuration sauvegardée !");
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

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

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
            {['profile', 'organization', 'locations', 'integrations', 'brand', 'notifications', 'team'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    {tab === 'profile' ? 'Mon Profil' : tab === 'brand' ? 'Identité & IA' : tab === 'locations' ? 'Établissements' : tab === 'team' ? 'Équipe' : tab === 'integrations' ? 'Intégrations' : tab === 'organization' ? 'Entreprise' : tab === 'notifications' ? 'Notifications' : tab}
                </button>
            ))}
        </div>

        <div className="p-6 md:p-8">
            
            {/* --- ONGLET PROFIL --- */}
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
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-4">
                            <label className="block text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">
                                <ShieldCheck className="h-3 w-3 inline-block mr-1" />
                                Simulation de Rôle (Mode Démo)
                            </label>
                            <Select value={userRole} onChange={e => setUserRole(e.target.value)}>
                                <option value="super_admin">Super Admin (Vue SaaS)</option>
                                <option value="admin">Administrateur Organisation</option>
                                <option value="editor">Éditeur</option>
                                <option value="viewer">Lecteur</option>
                            </Select>
                            <p className="text-xs text-amber-700 mt-2">Changez votre rôle pour tester l'accès aux différentes interfaces (ex: Super Admin pour voir le menu caché).</p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <Button onClick={handleUpdateProfile} icon={Check}>Mettre à jour</Button>
                        <Button variant="ghost" onClick={handleResetPassword} icon={Lock}>Réinitialiser MDP</Button>
                    </div>
                </div>
            )}

            {/* --- ONGLET ENTREPRISE --- */}
            {activeTab === 'organization' && (
                <div className="max-w-2xl space-y-8">
                    
                    {/* Module Recherche SIRET */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Search className="h-5 w-5 text-indigo-600" />
                            Recherche Automatique (Societe.com)
                        </h3>
                        <div className="flex gap-2 relative">
                            <Input 
                                placeholder="Entrez un nom ou SIRET..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-white"
                            />
                            <Button onClick={handleSearchCompany} isLoading={searching}>Chercher</Button>
                            
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-10 overflow-hidden">
                                    {searchResults.map((res: any, i) => (
                                        <div 
                                            key={i} 
                                            className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0"
                                            onClick={() => handleSelectCompany(res)}
                                        >
                                            <div className="font-bold text-sm text-slate-900">{res.legal_name}</div>
                                            <div className="text-xs text-slate-500">SIRET: {res.siret} • {res.address}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Permet de pré-remplir les informations légales.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nom Commercial</label>
                            <Input value={orgCommercialName} onChange={e => setOrgCommercialName(e.target.value)} placeholder="Nom affiché aux clients (ex: Le Gourmet)" />
                            <p className="text-xs text-slate-500 mt-1">Utilisé par l'IA pour signer les réponses.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Raison Sociale</label>
                                <Input value={orgLegalName} onChange={e => setOrgLegalName(e.target.value)} placeholder="SAS LE GOURMET" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">SIRET</label>
                                <Input value={orgSiret} onChange={e => setOrgSiret(e.target.value)} placeholder="123 456 789 00012" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Adresse du Siège</label>
                            <Input value={orgAddress} onChange={e => setOrgAddress(e.target.value)} placeholder="10 Rue de la République..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Secteur d'activité (Important pour l'IA)</label>
                            <Select value={industry} onChange={e => setIndustry(e.target.value as any)}>
                                <option value="restaurant">Restauration</option>
                                <option value="hotel">Hôtellerie</option>
                                <option value="retail">Commerce de détail</option>
                                <option value="beauty">Beauté & Coiffure</option>
                                <option value="health">Santé & Bien-être</option>
                                <option value="services">Services aux entreprises</option>
                                <option value="automotive">Automobile / Garage</option>
                                <option value="real_estate">Immobilier</option>
                                <option value="legal">Juridique / Comptabilité</option>
                                <option value="other">Autre</option>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <Button onClick={handleSaveOrg} icon={CheckSquare}>Enregistrer les modifications</Button>
                    </div>
                </div>
            )}

            {/* --- ONGLET ÉTABLISSEMENTS --- */}
            {activeTab === 'locations' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Vos Points de Vente</h3>
                        <Button size="sm" icon={Plus} onClick={() => { setEditingLocation(null); setShowLocationModal(true); }}>Ajouter</Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {org?.locations.map(loc => (
                            <div key={loc.id} className="p-5 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all bg-white group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{loc.name}</h4>
                                            <p className="text-xs text-slate-500">{loc.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingLocation(loc); setShowLocationModal(true); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600" title="Modifier">
                                            <PenLine className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteLocation(loc.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600" title="Supprimer">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mt-3 border-t border-slate-50 pt-3">
                                    {loc.google_review_url ? (
                                        <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                            <CheckCircle2 className="h-3 w-3" /> Lien Google configuré
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                                            <AlertCircle className="h-3 w-3" /> Lien Google manquant
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                                        <MapPin className="h-3 w-3 shrink-0" /> {loc.address}
                                    </div>
                                    {loc.external_reference && (
                                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                                            <RefreshCw className="h-3 w-3" /> Sync Google Active
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <Button variant="outline" size="xs" className="w-full" onClick={() => { setEditingLocation(loc); setShowLocationModal(true); }}>
                                        Gérer (Import, Lien, Détails)
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- ONGLET INTÉGRATIONS --- */}
            {activeTab === 'integrations' && (
                <div className="space-y-8 animate-in fade-in">
                    
                    {/* Carte principale Google (Redesign Officiel) */}
                    <Card className={`border-2 ${org?.integrations.google ? 'border-green-100 bg-green-50/20' : 'border-indigo-100'}`}>
                        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 bg-white rounded-full p-3 shadow-md border border-slate-100 flex items-center justify-center">
                                    <GoogleIcon />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Google Business Profile</h3>
                                    <p className="text-sm text-slate-500 max-w-sm">Synchronisez vos avis, répondez en temps réel et analysez votre e-réputation locale.</p>
                                    {org?.integrations.google && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 mt-2"><CheckCircle2 className="h-3 w-3"/> Compte connecté</span>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                {!org?.integrations.google ? (
                                    <button 
                                        onClick={() => api.auth.connectGoogleBusiness()}
                                        className="flex items-center justify-center gap-3 bg-white text-slate-700 font-medium py-2.5 px-6 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 transition-all group"
                                    >
                                        <div className="h-5 w-5"><GoogleIcon /></div>
                                        <span>Sign in with Google</span>
                                    </button>
                                ) : (
                                    <>
                                        <Button icon={RefreshCw} onClick={handleSyncNow} isLoading={syncing}>Synchroniser maintenant</Button>
                                        <Button variant="outline" icon={LinkIcon} onClick={() => setShowMappingModal(true)}>Configurer les liens</Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-indigo-600" /> Autres Sources
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <IntegrationCard 
                                icon={Facebook} title="Facebook Page" 
                                description="Récupération des recommandations." 
                                connected={org?.integrations.facebook} 
                                onConnect={() => {}} 
                            />
                            <IntegrationCard icon={TripAdvisorIcon} title="TripAdvisor" description="Avis voyageurs et classements." comingSoon />
                            <IntegrationCard icon={TrustpilotIcon} title="Trustpilot" description="Avis vérifiés e-commerce." comingSoon />
                            <IntegrationCard icon={YelpIcon} title="Yelp" description="Populaire pour la restauration." comingSoon />
                            <IntegrationCard icon={Briefcase} title="Pages Jaunes" description="Annuaire local français." comingSoon />
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-pink-600" /> Canaux Marketing
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <IntegrationCard type="social" icon={Instagram} title="Instagram" description="Posts & Stories." connected={org?.integrations.instagram_posting} />
                            <IntegrationCard type="social" icon={Linkedin} title="LinkedIn" description="Communication B2B." connected={org?.integrations.linkedin_posting} />
                            <IntegrationCard type="social" icon={TikTokIcon} title="TikTok" description="Vidéos virales." connected={org?.integrations.tiktok_posting} />
                            <IntegrationCard type="social" icon={Facebook} title="Facebook" description="Posts page pro." connected={org?.integrations.facebook_posting} />
                        </div>
                    </div>
                </div>
            )}

            {/* --- ONGLET NOTIFICATIONS --- */}
            {activeTab === 'notifications' && (
                <div className="max-w-2xl space-y-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-slate-900">Alertes Email</h3>
                            <p className="text-sm text-slate-500">Recevez un email quand un nouvel avis arrive.</p>
                        </div>
                        <Toggle checked={notifSettings.email_alerts} onChange={(v) => setNotifSettings({...notifSettings, email_alerts: v})} />
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Seuil d'alerte critique</label>
                        <p className="text-sm text-slate-500 mb-4">Recevoir une alerte "Urgence" si la note est inférieure ou égale à :</p>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="1" max="5" 
                                value={notifSettings.alert_threshold} 
                                onChange={(e) => setNotifSettings({...notifSettings, alert_threshold: parseInt(e.target.value)})}
                                className="w-full max-w-xs"
                            />
                            <span className="font-bold text-lg text-indigo-600">{notifSettings.alert_threshold} ★</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-slate-900">Digest Hebdomadaire</h3>
                            <p className="text-sm text-slate-500">Un résumé de vos performances chaque semaine.</p>
                        </div>
                        <Toggle checked={notifSettings.weekly_digest} onChange={(v) => setNotifSettings({...notifSettings, weekly_digest: v})} />
                    </div>

                    {notifSettings.weekly_digest && (
                        <div className="ml-8 p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Jour d'envoi</label>
                            <Select value={notifSettings.digest_day} onChange={(e) => setNotifSettings({...notifSettings, digest_day: e.target.value})}>
                                <option value="monday">Lundi matin</option>
                                <option value="friday">Vendredi soir</option>
                            </Select>
                        </div>
                    )}

                    <div className="border-t border-slate-100 pt-6">
                        <Button onClick={handleSaveNotifications} icon={CheckSquare}>Enregistrer les préférences</Button>
                    </div>
                </div>
            )}

            {/* --- ONGLET MARQUE & IA --- */}
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
                        </div>

                        <Button onClick={handleSaveBrand} icon={CheckSquare}>Enregistrer</Button>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Simulateur de Voix
                        </h3>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                            <p className="text-sm text-slate-600 italic">"Service un peu lent ce midi, mais le plat était bon."</p>
                        </div>
                        <div className="flex justify-center mb-4">
                             <Button size="sm" variant="secondary" onClick={handleTestVoice} isLoading={testingVoice} icon={Play}>Tester la réponse</Button>
                        </div>
                        {testResponse && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-sm text-indigo-900 leading-relaxed">{testResponse}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ONGLET ÉQUIPE --- */}
            {activeTab === 'team' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900">Membres de l'équipe</h3>
                        <Button size="sm" icon={UserPlus} onClick={() => setShowInviteModal(true)}>Inviter</Button>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {team.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{member.name}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={member.role === 'admin' ? 'default' : 'neutral'}>{member.role}</Badge>
                                        {member.status === 'invited' && <span className="text-xs text-amber-600 italic">En attente</span>}
                                        <button className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
      
      {showLocationModal && <LocationModal location={editingLocation} onClose={() => setShowLocationModal(false)} onSave={handleSaveLocation} onUpload={handleImportCsv} />}
      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />}
      {showMappingModal && org?.locations && <GoogleMappingModal locations={org.locations} onClose={() => setShowMappingModal(false)} onSave={handleSaveMappings} />}
    </div>
  );
};
