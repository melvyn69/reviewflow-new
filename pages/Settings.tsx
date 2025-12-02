import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, SavedReply, BrandSettings, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Toggle, useToast, Badge } from '../components/ui';
import { Terminal, Building2, Plus, UploadCloud, X, Sparkles, Download, Database, Users, Mail, Bell, Instagram, Facebook, Trash2, CheckCircle2, Loader2, ArrowRight, AlertCircle, RefreshCw, Send, Edit, Link } from 'lucide-react';

// --- GOOGLE CONNECT WIZARD COMPONENT ---
const GoogleConnectWizard = ({ onClose, onConnect }: { onClose: () => void, onConnect: () => void }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<{id: string, name: string, address: string}[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleAuth = () => {
        setLoading(true);
        // Simulation délai OAuth Google
        setTimeout(() => {
            setLoading(false);
            setLocations([
                { id: 'g1', name: 'Mon Entreprise (Siège)', address: '12 Rue de la Paix, Paris' },
                { id: 'g2', name: 'Mon Entreprise (Annexe)', address: '45 Avenue Jean Jaurès, Lyon' }
            ]);
            setStep(2);
        }, 1500);
    };

    const handleSync = () => {
        if(!selectedId) return;
        setLoading(true);
        // Simulation import avis
        setTimeout(() => {
            setLoading(false);
            setStep(3);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <CardTitle className="flex items-center gap-2">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-5 w-5" alt="G" />
                        Connexion Google Business
                    </CardTitle>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </CardHeader>
                <CardContent className="p-8">
                    {step === 1 && (
                        <div className="text-center space-y-6">
                            <div className="h-16 w-16 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mx-auto">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-8 w-8" alt="G" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Associer votre compte Google</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                                    Nous avons besoin de votre autorisation pour lire vos avis et publier vos réponses.
                                </p>
                            </div>
                            <Button size="lg" className="w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-50" onClick={handleAuth} isLoading={loading}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-4 w-4 mr-2" alt="G" />
                                Continuer avec Google
                            </Button>
                            <p className="text-xs text-slate-400">Reviewflow utilise l'API officielle Google Business Profile.</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Sélectionnez l'établissement</h3>
                                <p className="text-sm text-slate-500 mt-1">Quel établissement souhaitez-vous gérer ?</p>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {locations.map(loc => (
                                    <div 
                                        key={loc.id}
                                        onClick={() => setSelectedId(loc.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedId === loc.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <Building2 className={`h-5 w-5 ${selectedId === loc.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="font-medium text-slate-900">{loc.name}</div>
                                            <div className="text-xs text-slate-500">{loc.address}</div>
                                        </div>
                                        {selectedId === loc.id && <CheckCircle2 className="h-5 w-5 text-indigo-600 ml-auto" />}
                                    </div>
                                ))}
                            </div>
                            <Button className="w-full" disabled={!selectedId} onClick={handleSync} isLoading={loading}>
                                Confirmer et Synchroniser
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6 animate-in zoom-in-95">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Connexion réussie !</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    Vos avis sont en cours d'importation. Cela peut prendre quelques minutes.
                                </p>
                            </div>
                            <Button className="w-full" onClick={onConnect}>
                                Accéder aux paramètres
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export const SettingsPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationGoogleUrl, setLocationGoogleUrl] = useState('');

  // Google Connect State
  const [showGoogleWizard, setShowGoogleWizard] = useState(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Template State
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // Team Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Email Test State
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!org) setLoading(false);
    }, 3000);

    loadOrg();
    loadTeam();
    return () => clearTimeout(timer);
  }, []);

  const loadOrg = async () => {
    try {
        const data = await api.organization.get();
        setOrg(data);
    } catch (e) {
        console.error("Failed to load settings");
    } finally {
        setLoading(false);
    }
  };

  const loadTeam = async () => {
      const data = await api.team.list();
      setTeam(data);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!org) return;
      await api.organization.update({ name: org.name, industry: org.industry });
      toast.success("Profil mis à jour");
  };

  const handleSaveBrand = async () => {
      if (!org) return;
      
      const currentKnowledgeBase = org.brand?.knowledge_base || '';
      
      const updatedBrand: BrandSettings = { 
          ...org.brand!, // Force non-null car initialisé dans loadOrg
          knowledge_base: currentKnowledgeBase
      };
      
      try {
          await api.organization.update({ brand: updatedBrand });
          setOrg(prev => prev ? ({ ...prev, brand: updatedBrand }) : null);
          toast.success("Identité de marque sauvegardée !");
      } catch (e) {
          toast.error("Erreur lors de la sauvegarde.");
      }
  };

  const handleSaveNotifications = async () => {
      if (!org) return;
      await api.organization.update({ notification_settings: org.notification_settings });
      toast.success("Préférences de notification sauvegardées");
  };
  
  const handleTestEmail = async () => {
      setSendingTest(true);
      try {
          await api.notifications.sendTestEmail();
          toast.success("Email de test envoyé ! Vérifiez votre boîte mail.");
      } catch (e: any) {
          toast.error("Erreur: " + e.message);
      } finally {
          setSendingTest(false);
      }
  };

  const openAddLocation = () => {
      setEditLocationId(null);
      setLocationName('');
      setLocationCity('');
      setLocationGoogleUrl('');
      setShowLocationModal(true);
  };

  const openEditLocation = (loc: Location) => {
      setEditLocationId(loc.id);
      setLocationName(loc.name);
      setLocationCity(loc.city);
      setLocationGoogleUrl(loc.google_review_url || '');
      setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
      if (!locationName || !locationCity) return;
      
      try {
          if (editLocationId) {
             // Update logic (Not implemented in API mock, assuming similar to create for UI)
             // In real app: await api.locations.update(editLocationId, ...)
             toast.success("Établissement mis à jour (Simulé)");
             // Update local state for immediate feedback
             if (org) {
                 const updatedLocs = org.locations.map(l => l.id === editLocationId ? { ...l, name: locationName, city: locationCity, google_review_url: locationGoogleUrl } : l);
                 setOrg({ ...org, locations: updatedLocs });
             }
          } else {
             await api.locations.create({ name: locationName, city: locationCity, address: 'À compléter', country: 'France', google_review_url: locationGoogleUrl });
             toast.success("Établissement ajouté");
             loadOrg();
          }
          setShowLocationModal(false);
      } catch (e) {
          toast.error("Erreur lors de la sauvegarde");
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImportFile(e.target.files[0]);
      }
  };

  const handleFileDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          setImportFile(e.dataTransfer.files[0]);
      }
  };

  const handleImport = async () => {
      if (!importFile || !org || org.locations.length === 0) return;
      setImporting(true);
      setImportProgress(10);
      
      setTimeout(async () => {
          setImportProgress(50);
          try {
              const mockData = Array(50).fill(null).map((_, i) => ({
                  source: 'google',
                  rating: 5,
                  author_name: `Imported User ${i}`,
                  text: "Excellent service via import CSV.",
                  date: new Date().toISOString()
              }));
              
              await api.reviews.importBulk(mockData, org.locations[0].id);
              setImportProgress(100);
              toast.success("50 avis importés avec succès !");
              setImportFile(null);
          } catch (e) {
              toast.error("Erreur d'importation");
          } finally {
              setImporting(false);
              setImportProgress(0);
          }
      }, 1500);
  };

  const handleAddTemplate = async () => {
      if (!newTemplateTitle || !newTemplateContent || !org) return;
      const newTemplate: SavedReply = {
          id: `tpl-${Date.now()}`,
          title: newTemplateTitle,
          content: newTemplateContent,
          category: 'positive'
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
      const updatedTemplates = (org.saved_replies || []).filter(t => t.id !== id);
      await api.organization.update({ saved_replies: updatedTemplates });
      setOrg({ ...org, saved_replies: updatedTemplates });
      toast.success("Modèle supprimé");
  };

  const handleInvite = async () => {
      if (!inviteEmail) return;
      await api.team.invite(inviteEmail, 'editor');
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
  };

  const handleToggleIntegration = async (key: string, current: boolean) => {
      if (!org) return;
      
      // Special handler for Google to show Wizard if enabling
      if (key === 'google' && !current) {
          setShowGoogleWizard(true);
          return;
      }

      const updatedIntegrations = { ...org.integrations, [key]: !current };
      setOrg({ ...org, integrations: updatedIntegrations });
      await api.organization.update({ integrations: updatedIntegrations });
      toast.success(current ? "Intégration désactivée" : "Intégration activée");
  };
  
  const handleGoogleConnected = async () => {
      setShowGoogleWizard(false);
      if (org) {
          const updatedIntegrations = { ...org.integrations, google: true };
          setOrg({ ...org, integrations: updatedIntegrations });
          await api.organization.update({ integrations: updatedIntegrations });
          toast.success("Compte Google associé avec succès !");
      }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des paramètres...</div>;
  if (!org) return <div className="p-8 text-center text-slate-500">Impossible de charger les paramètres. <Button onClick={loadOrg} variant="ghost" className="ml-2">Réessayer</Button></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
      
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        {['general', 'brand', 'templates', 'notifications', 'locations', 'team', 'integrations', 'data'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                {tab === 'general' ? 'Général' : tab === 'brand' ? 'IA & Identité' : tab === 'templates' ? 'Modèles' : tab === 'locations' ? 'Établissements' : tab === 'team' ? 'Équipe' : tab === 'integrations' ? 'Intégrations' : tab === 'data' ? 'Données' : tab}
            </button>
        ))}
      </div>

      {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Profil de l'Organisation</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'organisation</label>
                                  <Input value={org.name} onChange={(e) => setOrg({...org, name: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Secteur d'activité</label>
                                  <Select 
                                    value={org.industry || 'other'} 
                                    onChange={(e) => setOrg({...org, industry: e.target.value as any})}
                                  >
                                      <option value="restaurant">Restauration</option>
                                      <option value="hotel">Hôtellerie</option>
                                      <option value="retail">Commerce / Boutique</option>
                                      <option value="beauty">Beauté / Coiffure</option>
                                      <option value="health">Santé</option>
                                      <option value="services">Artisan / Services</option>
                                      <option value="other">Autre</option>
                                  </Select>
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> L'IA adaptera son vocabulaire à ce secteur.</p>
                              </div>
                          </div>
                          <div className="flex justify-end">
                              <Button type="submit">Sauvegarder</Button>
                          </div>
                      </form>
                  </CardContent>
              </Card>

              {/* Developer Mode Card */}
              <Card className="border-slate-200 bg-slate-50">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-700">
                          <Terminal className="h-5 w-5" /> Mode Développeur
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full ${org ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-sm font-medium">Base de données : Connectée</span>
                          </div>
                          <Badge variant="success">OK</Badge>
                      </div>
                      
                      <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            className="w-full bg-white"
                            onClick={() => window.location.href = '#/playground'}
                          >
                              Ouvrir AI Playground
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full bg-white" 
                            icon={UploadCloud}
                            onClick={async () => {
                                try {
                                    await api.seedCloudDatabase();
                                    toast.success("Injection réussie !");
                                } catch (e:any) {
                                    toast.error(e.message);
                                }
                            }}
                          >
                              Injecter Données Démo
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {activeTab === 'brand' && org.brand && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Personnalité de l'IA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Ton de voix</label>
                              <Input 
                                placeholder="ex: Professionnel, Amical, Empathique..." 
                                value={org.brand.tone}
                                onChange={(e) => setOrg({...org, brand: {...org.brand!, tone: e.target.value}})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Style de langage</label>
                              <div className="flex gap-4 mt-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name="style" 
                                        checked={org.brand.language_style === 'formal'} 
                                        onChange={() => setOrg({...org, brand: {...org.brand!, language_style: 'formal'}})}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span className="text-sm">Vouvoiement</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name="style" 
                                        checked={org.brand.language_style === 'casual'} 
                                        onChange={() => setOrg({...org, brand: {...org.brand!, language_style: 'casual'}})}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span className="text-sm">Tutoiement</span>
                                  </label>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                          <Toggle 
                            checked={org.brand.use_emojis} 
                            onChange={(checked) => setOrg({...org, brand: {...org.brand!, use_emojis: checked}})}
                          />
                          <div>
                              <span className="block text-sm font-medium text-indigo-900">Utiliser des Emojis</span>
                              <span className="block text-xs text-indigo-700">L'IA ajoutera des 😊, 🙏, ⭐ dans ses réponses.</span>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Base de Connaissance (Context)</label>
                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Entrez ici les faits que l'IA doit connaître : 'Nous sommes fermés le lundi', 'Le Wifi est gratuit', 'Menu enfant à 12€'..."
                            value={org.brand.knowledge_base || ''}
                            onChange={(e) => setOrg(prev => {
                                if (!prev) return null;
                                return { 
                                    ...prev, 
                                    brand: { ...prev.brand!, knowledge_base: e.target.value } 
                                };
                            })}
                          />
                          <p className="text-xs text-slate-500 mt-1">Ces informations seront utilisées par l'IA pour répondre aux questions spécifiques.</p>
                      </div>

                      <div className="flex justify-end">
                          <Button onClick={handleSaveBrand}>Enregistrer</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Réponses Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h4 className="text-sm font-semibold mb-3">Créer un nouveau modèle</h4>
                          <div className="space-y-3">
                              <Input 
                                placeholder="Titre (ex: Remerciement Standard)" 
                                value={newTemplateTitle}
                                onChange={(e) => setNewTemplateTitle(e.target.value)}
                              />
                              <textarea 
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24"
                                placeholder="Contenu de la réponse..."
                                value={newTemplateContent}
                                onChange={(e) => setNewTemplateContent(e.target.value)}
                              />
                              <div className="flex justify-end">
                                  <Button size="sm" icon={Plus} onClick={handleAddTemplate} disabled={!newTemplateTitle || !newTemplateContent}>Ajouter</Button>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-3">
                          {org.saved_replies?.map((reply) => (
                              <div key={reply.id} className="flex justify-between items-start p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                  <div>
                                      <h5 className="font-medium text-slate-900">{reply.title}</h5>
                                      <p className="text-sm text-slate-500 mt-1">{reply.content}</p>
                                  </div>
                                  <button onClick={() => handleDeleteTemplate(reply.id)} className="text-slate-400 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </div>
                          ))}
                          {(!org.saved_replies || org.saved_replies.length === 0) && (
                              <p className="text-center text-slate-400 py-4">Aucun modèle enregistré.</p>
                          )}
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && org.notification_settings && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Préférences de Notification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                          <div className="flex items-center gap-3">
                              <Bell className="h-5 w-5 text-indigo-600" />
                              <div>
                                  <h4 className="font-medium text-slate-900">Alertes par Email</h4>
                                  <p className="text-xs text-slate-500">Recevoir un email pour les nouveaux avis.</p>
                              </div>
                          </div>
                          <Toggle 
                            checked={org.notification_settings.email_alerts} 
                            onChange={(c) => setOrg({...org, notification_settings: {...org.notification_settings!, email_alerts: c}})}
                          />
                      </div>

                      {org.notification_settings.email_alerts && (
                          <div className="ml-8">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Seuil d'alerte</label>
                              <div className="flex items-center gap-2">
                                  <Select 
                                    className="w-48"
                                    value={org.notification_settings.alert_threshold}
                                    onChange={(e) => setOrg({...org, notification_settings: {...org.notification_settings!, alert_threshold: parseInt(e.target.value)}})}
                                  >
                                      <option value="1">1 Étoile (Critique)</option>
                                      <option value="2">2 Étoiles et moins</option>
                                      <option value="3">3 Étoiles et moins</option>
                                      <option value="4">4 Étoiles et moins</option>
                                      <option value="5">Tous les avis</option>
                                  </Select>
                                  <span className="text-xs text-slate-500">M'alerter uniquement si la note est inférieure ou égale à ce seuil.</span>
                              </div>
                              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                  <p className="text-xs text-indigo-800 mb-2">Vérifiez que votre configuration email (Resend) fonctionne :</p>
                                  <Button size="sm" variant="secondary" icon={Send} onClick={handleTestEmail} isLoading={sendingTest} className="bg-white">
                                      Envoyer un email de test
                                  </Button>
                              </div>
                          </div>
                      )}

                      <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                          <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-indigo-600" />
                              <div>
                                  <h4 className="font-medium text-slate-900">Digest Hebdomadaire</h4>
                                  <p className="text-xs text-slate-500">Un résumé de vos performances chaque Lundi.</p>
                              </div>
                          </div>
                          <Toggle 
                            checked={org.notification_settings.weekly_digest} 
                            onChange={(c) => setOrg({...org, notification_settings: {...org.notification_settings!, weekly_digest: c}})}
                          />
                      </div>

                      <div className="flex justify-end">
                          <Button onClick={handleSaveNotifications}>Enregistrer</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-end">
                  <Button icon={Plus} onClick={openAddLocation}>Ajouter un établissement</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {org.locations.map(loc => (
                      <Card key={loc.id}>
                          <CardContent className="p-5 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <Building2 className="h-5 w-5 text-slate-500" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-900">{loc.name}</h4>
                                      <p className="text-xs text-slate-500">{loc.city}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Badge variant={loc.connection_status === 'connected' ? 'success' : 'neutral'}>
                                      {loc.connection_status === 'connected' ? 'Connecté' : 'Déconnecté'}
                                  </Badge>
                                  <Button size="xs" variant="ghost" icon={Edit} onClick={() => openEditLocation(loc)}>Modifier</Button>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                      <CardTitle>Membres de l'équipe</CardTitle>
                      <Badge variant="neutral">{team.length} membres</Badge>
                  </CardHeader>
                  <CardContent>
                      <div className="flex gap-2 mb-6">
                          <Input 
                            placeholder="Email du collaborateur..." 
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                          <Button onClick={handleInvite} disabled={!inviteEmail}>Inviter</Button>
                      </div>

                      <div className="divide-y divide-slate-100">
                          {team.map((user) => (
                              <div key={user.id} className="py-4 flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                          {user.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="font-medium text-slate-900">{user.name}</div>
                                          <div className="text-xs text-slate-500">{user.email}</div>
                                      </div>
                                  </div>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'neutral'}>{user.role}</Badge>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Sources d'Avis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${org.integrations.google ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm relative">
                                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-5 w-5" alt="Google" />
                                  {org.integrations.google && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white"><CheckCircle2 className="h-3 w-3 text-white" /></div>}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900">Google Business Profile</h4>
                                  <p className="text-xs text-slate-500">
                                      {org.integrations.google 
                                        ? 'Compte associé. Les avis sont synchronisés.' 
                                        : 'Synchronisation des avis et réponses.'}
                                  </p>
                              </div>
                          </div>
                          
                          {org.integrations.google ? (
                              <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="xs" onClick={() => handleToggleIntegration('google', true)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                      Déconnecter
                                  </Button>
                                  <Badge variant="success">Connecté</Badge>
                              </div>
                          ) : (
                              <Button size="sm" variant="outline" onClick={() => handleToggleIntegration('google', false)}>
                                  Connecter
                              </Button>
                          )}
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-[#1877F2] rounded-full flex items-center justify-center shadow-sm">
                                  <Facebook className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900">Facebook Page</h4>
                                  <p className="text-xs text-slate-500">Récupération des avis et recommandations.</p>
                              </div>
                          </div>
                          <Toggle checked={org.integrations.facebook} onChange={(c) => handleToggleIntegration('facebook', org.integrations.facebook)} />
                      </div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Publication Sociale (Marketing)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-tr from-yellow-400 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                                  <Instagram className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900">Instagram Business</h4>
                                  <p className="text-xs text-slate-500">Pour publier vos avis en story ou post.</p>
                              </div>
                          </div>
                          <Toggle checked={org.integrations.instagram_posting} onChange={(c) => handleToggleIntegration('instagram_posting', org.integrations.instagram_posting)} />
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Data Import Tab */}
      {activeTab === 'data' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-indigo-600" />
                          Import Historique
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div 
                        className={`bg-slate-50 p-8 rounded-xl border-2 border-dashed border-slate-300 text-center cursor-pointer hover:bg-slate-100 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                          <input type="file" id="file-upload" className="hidden" accept=".csv" onChange={handleFileSelect} />
                          <UploadCloud className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          {importFile ? (
                              <div>
                                  <p className="text-sm font-medium text-slate-900 mb-1">{importFile.name}</p>
                                  <p className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(2)} KB</p>
                              </div>
                          ) : (
                              <>
                                <p className="text-sm font-medium text-slate-900 mb-1">Cliquez ou glissez un fichier CSV ici</p>
                                <p className="text-xs text-slate-500">Format: Date, Source, Note, Auteur, Commentaire</p>
                              </>
                          )}
                      </div>

                      {importing && (
                          <div className="space-y-2">
                              <div className="flex justify-between text-xs font-medium text-slate-600">
                                  <span>Importation en cours...</span>
                                  <span>{importProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                              </div>
                          </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.open('data:text/csv;charset=utf-8,Date,Source,Note,Auteur,Commentaire', '_blank')}>
                              Télécharger modèle
                          </Button>
                          <Button onClick={handleImport} isLoading={importing} disabled={!importFile}>
                              Lancer l'import
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md animate-in zoom-in-95">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                      <CardTitle>{editLocationId ? 'Modifier Établissement' : 'Nouvel Établissement'}</CardTitle>
                      <button onClick={() => setShowLocationModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                          <Input placeholder="ex: Restaurant Le Gourmet" value={locationName} onChange={e => setLocationName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                          <Input placeholder="ex: Paris" value={locationCity} onChange={e => setLocationCity(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                              <Link className="h-4 w-4 text-indigo-600"/>
                              Lien Google Avis
                          </label>
                          <Input 
                            placeholder="ex: https://g.page/r/YOUR_CODE/review" 
                            value={locationGoogleUrl} 
                            onChange={e => setLocationGoogleUrl(e.target.value)} 
                          />
                          <p className="text-xs text-slate-500 mt-1">Utilisé pour la redirection après 5 étoiles.</p>
                      </div>
                      <Button className="w-full mt-2" onClick={handleSaveLocation}>
                          {editLocationId ? 'Enregistrer' : 'Ajouter'}
                      </Button>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Google Wizard Modal */}
      {showGoogleWizard && (
          <GoogleConnectWizard onClose={() => setShowGoogleWizard(false)} onConnect={handleGoogleConnected} />
      )}
    </div>
  );
};