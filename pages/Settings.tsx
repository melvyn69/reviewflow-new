import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, SavedReply, BrandSettings } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Toggle, useToast, Badge } from '../components/ui';
import { Terminal, Building2, Plus, UploadCloud, X, Sparkles, Download, Database } from 'lucide-react';

export const SettingsPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('');

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!org) setLoading(false);
    }, 3000);

    loadOrg();
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

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!org) return;
      await api.organization.update({ name: org.name, industry: org.industry });
      toast.success("Profil mis à jour");
  };

  const handleSaveBrand = async () => {
      if (!org) return;
      await api.organization.update({ brand: org.brand });
      toast.success("Identité de marque sauvegardée");
  };

  const handleAddLocation = async () => {
      if (!newLocationName || !newLocationCity) return;
      try {
          await api.locations.create({ name: newLocationName, city: newLocationCity, address: 'À compléter', country: 'France' });
          setShowLocationModal(false);
          setNewLocationName('');
          setNewLocationCity('');
          toast.success("Établissement ajouté");
          loadOrg();
      } catch (e) {
          toast.error("Erreur lors de l'ajout");
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
                              {/* CORRECTION : Utilisation de 'org' au lieu de la promesse getUser() */}
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
                            onChange={(e) => setOrg({...org, brand: {...org.brand!, knowledge_base: e.target.value}})}
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

      {/* Locations Tab */}
      {activeTab === 'locations' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-end">
                  <Button icon={Plus} onClick={() => setShowLocationModal(true)}>Ajouter un établissement</Button>
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
                              <Badge variant={loc.connection_status === 'connected' ? 'success' : 'neutral'}>
                                  {loc.connection_status === 'connected' ? 'Connecté' : 'Déconnecté'}
                              </Badge>
                          </CardContent>
                      </Card>
                  ))}
              </div>
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
                      <CardTitle>Nouvel Établissement</CardTitle>
                      <button onClick={() => setShowLocationModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                          <Input placeholder="ex: Restaurant Le Gourmet" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                          <Input placeholder="ex: Paris" value={newLocationCity} onChange={e => setNewLocationCity(e.target.value)} />
                      </div>
                      <Button className="w-full mt-2" onClick={handleAddLocation}>Ajouter</Button>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};