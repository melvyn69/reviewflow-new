import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, BrandSettings, User, IndustryType, NotificationSettings, SavedReply } from '../types';
import { Card, CardContent, Button, Input, Select, Toggle, useToast, Badge, CardHeader, CardTitle, useNavigate, useLocation } from '../components/ui';
import { 
    Building2, Plus, X, Sparkles, User as UserIcon, Mail, Trash2, Loader2, AlertCircle, 
    BookOpen, ExternalLink, ImageIcon, UploadCloud
} from 'lucide-react';

// Helper to remove button focus immediately
const handleAction = (e: React.MouseEvent, action: () => void | Promise<void>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur(); 
    action();
};

const LocationModal = ({ location, onClose, onSave, onUpload }: { location?: Location | null, onClose: () => void, onSave: (data: any) => Promise<void>, onUpload?: (file: File, id: string) => Promise<void> }) => {
    const [formData, setFormData] = useState({
        name: location?.name || '',
        address: location?.address || '',
        city: location?.city || '',
        country: location?.country || 'France',
        phone: location?.phone || '',
        website: location?.website || '',
        google_review_url: location?.google_review_url || '',
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
                                
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Liens de Collecte (Review Funnel)</h4>
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <label className="block text-xs font-bold text-indigo-900 mb-1">Google Avis (Prioritaire)</label>
                                        <Input value={formData.google_review_url} onChange={e => setFormData({...formData, google_review_url: e.target.value})} placeholder="https://g.page/r/..." className="bg-white text-xs" />
                                    </div>
                                </div>
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

export const SettingsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

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
  const [industry, setIndustry] = useState<IndustryType>('other');
  
  // Saved Replies
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // Form states (Profile)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) setActiveTab(tabParam);

    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        api.organization.saveGoogleTokens().then((success) => {
            if (success) {
                toast.success("Compte connecté avec succès !");
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                loadData(); 
            }
        });
    } else {
        loadData();
    }
  }, [location.search]);

  const loadData = async () => {
      setLoading(true);
      try {
        const [userData, orgData] = await Promise.all([
            api.auth.getUser(),
            api.organization.get()
        ]);
        
        setUser(userData);
        setOrg(orgData);
        
        if (userData) {
            setUserName(userData.name);
            setUserEmail(userData.email);
        }

        if (orgData) {
            setOrgCommercialName(orgData.name);
            setIndustry(orgData.industry || 'other');
            if (orgData.brand) {
                setBrandTone(orgData.brand.tone || '');
                setBrandDesc(orgData.brand.description || '');
                setBrandKnowledge(orgData.brand.knowledge_base || '');
                setUseEmojis(orgData.brand.use_emojis || false);
                setLanguageStyle(orgData.brand.language_style || 'formal');
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
          await api.auth.updateProfile({ name: userName, email: userEmail });
          toast.success("Profil mis à jour !");
      } catch(e: any) {
          toast.error("Erreur mise à jour profil : " + e.message);
      }
  };

  const handleSaveOrg = async () => {
      if (!org) return;
      await api.organization.update({ 
          name: orgCommercialName, 
          industry: industry as any 
      });
      toast.success("Informations entreprise mises à jour");
  };

  const handleSaveTemplate = async () => {
      if (!org || !newTemplateTitle || !newTemplateContent) return;
      const newTemplate: SavedReply = {
          id: Date.now().toString(),
          title: newTemplateTitle,
          content: newTemplateContent,
          category: 'neutral'
      };
      const updatedTemplates = [...(org.saved_replies || []), newTemplate];
      await api.organization.update({ saved_replies: updatedTemplates });
      setOrg({ ...org, saved_replies: updatedTemplates });
      setNewTemplateTitle('');
      setNewTemplateContent('');
      toast.success("Modèle ajouté");
  };

  const handleDeleteTemplate = async (id: string) => {
      if (!org) return;
      const updatedTemplates = org.saved_replies?.filter(t => t.id !== id) || [];
      await api.organization.update({ saved_replies: updatedTemplates });
      setOrg({ ...org, saved_replies: updatedTemplates });
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
              author_name: "Client Test",
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
      } catch (e: any) {
          setTestResponse("Erreur : " + e.message);
      } finally {
          setTestingVoice(false);
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
            {['profile', 'organization', 'locations', 'brand'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => {
                        setActiveTab(tab);
                        navigate(`/settings?tab=${tab}`);
                    }}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    {tab === 'profile' ? 'Mon Profil' : tab === 'brand' ? 'Identité & IA' : tab === 'locations' ? 'Établissements' : tab === 'organization' ? 'Entreprise' : tab}
                </button>
            ))}
        </div>

        <div className="p-6 md:p-8">
            {activeTab === 'profile' && (
                <div className="max-w-xl space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom Complet</label>
                            <Input value={userName} onChange={e => setUserName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <Input value={userEmail} onChange={e => setUserEmail(e.target.value)} />
                        </div>
                        <Button onClick={(e) => handleAction(e, handleUpdateProfile)}>Enregistrer le profil</Button>
                    </div>
                </div>
            )}

            {activeTab === 'organization' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="font-bold text-lg text-slate-900">Détails Entreprise</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom Commercial</label>
                                <Input value={orgCommercialName} onChange={e => setOrgCommercialName(e.target.value)} />
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
                            <Button onClick={(e) => handleAction(e, handleSaveOrg)}>Mettre à jour</Button>
                        </div>
                    </div>

                    <div className="space-y-6 border-l border-slate-100 pl-8">
                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                            Modèles de réponse
                        </h4>
                        <p className="text-sm text-slate-500">Créez des réponses types à insérer rapidement dans l'Inbox.</p>
                        
                        <div className="space-y-4">
                            {org?.saved_replies?.map(tpl => (
                                <div key={tpl.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center group">
                                    <div>
                                        <div className="font-medium text-sm text-slate-900">{tpl.title}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-xs">{tpl.content}</div>
                                    </div>
                                    <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <Input placeholder="Titre (ex: Remerciement Standard)" value={newTemplateTitle} onChange={e => setNewTemplateTitle(e.target.value)} className="text-sm" />
                                <textarea 
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="Contenu du modèle..." 
                                    rows={3}
                                    value={newTemplateContent}
                                    onChange={e => setNewTemplateContent(e.target.value)}
                                />
                                <Button size="sm" variant="outline" onClick={(e) => handleAction(e, handleSaveTemplate)} disabled={!newTemplateTitle}>
                                    <Plus className="h-4 w-4 mr-2" /> Ajouter un modèle
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'brand' && (
                <div className="max-w-2xl space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <Sparkles className="h-5 w-5" /> Brand Voice IA
                        </h4>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900 mb-1">Ton</label>
                                    <Select value={brandTone} onChange={e => setBrandTone(e.target.value)}>
                                        <option value="professionnel">Professionnel</option>
                                        <option value="amical">Amical & Chaleureux</option>
                                        <option value="luxe">Luxe & Distingué</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900 mb-1">Style</label>
                                    <Select value={languageStyle} onChange={e => setLanguageStyle(e.target.value as any)}>
                                        <option value="formal">Vouvoiement</option>
                                        <option value="casual">Tutoiement</option>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-900 mb-1">Contexte & Instructions</label>
                                <textarea 
                                    className="w-full p-3 rounded-lg border border-indigo-200 text-sm h-32 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Nous sommes fermés le lundi. Le chef s'appelle Mario..."
                                    value={brandKnowledge}
                                    onChange={e => setBrandKnowledge(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <Button variant="secondary" size="sm" onClick={(e) => handleAction(e, handleTestVoice)} isLoading={testingVoice}>Tester la voix</Button>
                                <Button onClick={(e) => handleAction(e, handleSaveBrand)}>Sauvegarder</Button>
                            </div>
                            {testResponse && (
                                <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100 text-sm text-slate-600 italic">
                                    "{testResponse}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'locations' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Vos Établissements</h3>
                        <Button icon={Plus} onClick={(e) => handleAction(e, () => { setEditingLocation(null); setShowLocationModal(true); })}>Ajouter</Button>
                    </div>
                    {org?.locations?.map(loc => (
                        <Card key={loc.id}>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-900">{loc.name}</h4>
                                    <p className="text-sm text-slate-500">{loc.address}</p>
                                </div>
                                <Button size="xs" variant="ghost" onClick={(e) => handleAction(e, () => { setEditingLocation(loc); setShowLocationModal(true); })}>Modifier</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
      </div>

      {showLocationModal && <LocationModal location={editingLocation} onClose={() => setShowLocationModal(false)} onSave={async (d) => { await api.locations.create(d); loadData(); }} />}
    </div>
  );
};