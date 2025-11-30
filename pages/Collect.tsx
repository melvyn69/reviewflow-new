import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Review } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast, Badge } from '../components/ui';
import { QrCode, Download, Send, Smartphone, Mail, Copy, Printer, CheckCircle2, Layout, Code, Eye, Moon, Sun, Star, Loader2, AlertCircle, Share2, Instagram, Facebook, Sparkles } from 'lucide-react';
import { INITIAL_ORG } from '../lib/db';
// CORRECTION ICI : Import depuis le dossier components
import { SocialShareModal } from '../components/SocialShareModal';

export const CollectPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'campaigns' | 'widgets' | 'social'>('qr');
  const [campaignType, setCampaignType] = useState<'sms' | 'email'>('sms');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [topReviews, setTopReviews] = useState<Review[]>([]);
  const [selectedReviewForPost, setSelectedReviewForPost] = useState<Review | null>(null);
  
  // Widget State
  const [widgetType, setWidgetType] = useState<'carousel' | 'list' | 'badge'>('carousel');
  const [widgetTheme, setWidgetTheme] = useState<'light' | 'dark'>('light');
  
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!org) setLoadingError(true);
    }, 5000); 

    loadOrg();
    loadTopReviews();
    
    return () => clearTimeout(timer);
  }, []);

  const loadOrg = async () => {
    try {
        const data = await api.organization.get();
        if (data) {
            setOrg(data);
            if (data.locations?.length > 0) {
              setSelectedLocationId(data.locations[0].id);
            }
            setLoadingError(false);
        } else {
            setOrg(INITIAL_ORG);
            if (INITIAL_ORG.locations.length > 0) setSelectedLocationId(INITIAL_ORG.locations[0].id);
        }
    } catch (e) {
        console.error("Load failed", e);
        setLoadingError(true);
    }
  };

  const loadTopReviews = async () => {
      const reviews = await api.reviews.list({ rating: '5' });
      setTopReviews(reviews.slice(0, 3));
  };

  const useDemoData = () => {
      setOrg(INITIAL_ORG);
      setSelectedLocationId(INITIAL_ORG.locations[0].id);
      setLoadingError(false);
      toast.info("Mode démonstration activé");
  };

  const selectedLocation = org?.locations.find(l => l.id === selectedLocationId);
  const reviewLink = selectedLocation 
    ? `${window.location.origin}/#/feedback/${selectedLocation.id}` 
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink);
    toast.success("Lien copié !");
  };

  const handleCopyWidgetCode = () => {
      const code = `<div class="reviewflow-widget" data-id="${selectedLocationId}" data-type="${widgetType}" data-theme="${widgetTheme}"></div>\n<script src="https://cdn.reviewflow.com/widget.js" async></script>`;
      navigator.clipboard.writeText(code);
      toast.success("Code HTML copié !");
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reviewLink)}`;
    link.download = 'qrcode.png';
    link.target = '_blank';
    link.click();
    toast.success("Téléchargement lancé");
  };

  const handleSendCampaign = async () => {
    if (!recipient) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    toast.success(`Campagne ${campaignType === 'sms' ? 'SMS' : 'Email'} envoyée à ${recipient}`);
    setRecipient('');
  };

  if (!org) {
      if (loadingError) {
          return (
              <div className="p-12 text-center flex flex-col items-center justify-center h-96">
                  <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Chargement difficile</h3>
                  <p className="text-slate-500 mb-6">Nous n'arrivons pas à joindre la base de données. Voulez-vous voir la démo ?</p>
                  <Button onClick={useDemoData}>Charger les données de démo</Button>
              </div>
          );
      }
      return (
          <div className="p-12 text-center flex flex-col items-center justify-center h-96">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-slate-500">Chargement de vos établissements...</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acquisition & Diffusion</h1>
          <p className="text-slate-500">Collectez plus d'avis et affichez-les sur votre site web.</p>
        </div>
        {org.locations?.length > 1 && (
            <div className="w-full md:w-64">
                <Select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                    {org.locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </Select>
            </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
            onClick={() => setActiveTab('qr')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'qr' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            QR Code & Affichage
        </button>
        <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'campaigns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Campagnes (SMS/Email)
        </button>
        <button
            onClick={() => setActiveTab('widgets')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'widgets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Widgets Site Web
        </button>
        <button
            onClick={() => setActiveTab('social')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'social' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Social Booster
        </button>
      </div>

      {activeTab === 'qr' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>QR Code Numérique</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewLink)}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                          />
                      </div>
                      <div className="flex gap-3 w-full">
                          <Button variant="outline" className="flex-1" icon={Copy} onClick={handleCopyLink}>Copier le lien</Button>
                          <Button variant="primary" className="flex-1" icon={Download} onClick={handleDownloadQr}>Télécharger PNG</Button>
                      </div>
                      <p className="text-xs text-slate-400 mt-4 text-center">
                          Ce QR Code redirige vers votre entonnoir de satisfaction.
                          <br/>
                          <span className="text-indigo-400 text-[10px] break-all">{reviewLink}</span>
                      </p>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Supports Imprimables</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="p-4 border border-slate-200 rounded-lg flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                              <Printer className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-slate-900">Affiche Comptoir A4</h4>
                              <p className="text-sm text-slate-500">Idéal pour la réception ou la caisse.</p>
                          </div>
                          <Download className="h-5 w-5 text-slate-400" />
                      </div>
                      {/* ... other items ... */}
                  </CardContent>
              </Card>
          </div>
      )}

      {/* ... campaigns tab ... */}
      {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="lg:col-span-2 space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Nouvelle Campagne</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="flex gap-4 mb-4">
                              <button 
                                onClick={() => setCampaignType('sms')}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${campaignType === 'sms' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                              >
                                  <Smartphone className="h-6 w-6" />
                                  <span className="font-bold">SMS</span>
                              </button>
                              <button 
                                onClick={() => setCampaignType('email')}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${campaignType === 'email' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                              >
                                  <Mail className="h-6 w-6" />
                                  <span className="font-bold">Email</span>
                              </button>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                  {campaignType === 'sms' ? 'Numéro de mobile' : 'Adresse Email'}
                              </label>
                              <Input 
                                placeholder={campaignType === 'sms' ? '+33 6 12 34 56 78' : 'client@exemple.com'} 
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                              />
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Message (Aperçu)</label>
                              <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-200">
                                  {campaignType === 'sms' ? (
                                      <p>Bonjour, merci de votre visite chez {selectedLocation?.name}. Cela nous aiderait beaucoup si vous pouviez nous laisser un avis : {reviewLink}</p>
                                  ) : (
                                      <p>
                                          Sujet : Votre avis compte pour nous<br/><br/>
                                          Bonjour,<br/>
                                          Merci d'avoir choisi {selectedLocation?.name}.<br/>
                                          Nous espérons que vous avez apprécié votre expérience.<br/>
                                          Pourriez-vous prendre 30 secondes pour nous laisser une note ?<br/>
                                          <a href="#" className="text-indigo-600 underline">{reviewLink}</a>
                                      </p>
                                  )}
                              </div>
                          </div>

                          <div className="flex justify-end pt-2">
                              <Button icon={Send} onClick={handleSendCampaign} isLoading={isSending} disabled={!recipient}>
                                  Envoyer la demande
                              </Button>
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {/* ... widgets tab ... */}
      {activeTab === 'widgets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Type de Widget</label>
                              <div className="space-y-2">
                                  <div onClick={() => setWidgetType('carousel')} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${widgetType === 'carousel' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                                      <Layout className="h-5 w-5 text-indigo-600" />
                                      <div>
                                          <div className="font-medium text-sm text-slate-900">Carrousel</div>
                                          <div className="text-xs text-slate-500">Défilement horizontal</div>
                                      </div>
                                  </div>
                                  {/* ... other types ... */}
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Thème</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setWidgetTheme('light')} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${widgetTheme === 'light' ? 'bg-white text-slate-900 border-indigo-600 ring-1 ring-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                      <Sun className="h-4 w-4" /> Clair
                                  </button>
                                  <button onClick={() => setWidgetTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${widgetTheme === 'dark' ? 'bg-slate-900 text-white border-slate-700 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                      <Moon className="h-4 w-4" /> Sombre
                                  </button>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Intégration</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-slate-500 mb-3">Copiez ce code et collez-le dans le HTML de votre site web.</p>
                          <div className="bg-slate-900 rounded-lg p-3 relative group">
                              <code className="text-xs font-mono text-green-400 block overflow-x-auto whitespace-pre-wrap">
                                  {`<div class="reviewflow-widget" data-id="${selectedLocationId}" data-type="${widgetType}" data-theme="${widgetTheme}"></div>\n<script src="https://cdn.reviewflow.com/widget.js" async></script>`}
                              </code>
                              <button 
                                onClick={handleCopyWidgetCode}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copier"
                              >
                                  <Copy className="h-4 w-4" />
                              </button>
                          </div>
                      </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-2">
                  <Card className="h-full flex flex-col">
                      <CardHeader className="border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                              <Eye className="h-5 w-5 text-slate-400" />
                              Aperçu en direct
                          </CardTitle>
                          <Badge variant="neutral">Mode: {widgetType}</Badge>
                      </CardHeader>
                      <CardContent className={`flex-1 flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ${widgetTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          {/* Widget Preview Mockup */}
                          <div className={`w-full max-w-lg transition-all duration-500 ${widgetTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              <div className={`p-6 rounded-xl shadow-lg border ${widgetTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                  <div className="flex items-center gap-2 mb-4">
                                      <div className="flex text-yellow-400">
                                          {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                                      </div>
                                      <span className="text-xs opacity-60">il y a 2 jours</span>
                                  </div>
                                  <p className="text-sm font-medium italic mb-4">"Excellent service, je recommande vivement cet établissement !"</p>
                                  <div className="flex items-center gap-3">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${widgetTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>S</div>
                                      <div className="text-xs font-bold">Sophie Martin</div>
                                  </div>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {activeTab === 'social' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                              <Share2 className="h-5 w-5 text-indigo-600" />
                              Comptes Connectés
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <p className="text-sm text-slate-500 mb-4">Pour transformer vos avis en posts, connectez vos pages professionnelles.</p>
                          
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-100">
                                      <Instagram className="h-5 w-5 text-pink-600" />
                                  </div>
                                  <div>
                                      <h4 className="font-medium text-slate-900">Instagram</h4>
                                      <p className="text-xs text-slate-500">{org.integrations.instagram_posting ? 'Connecté' : 'Non connecté'}</p>
                                  </div>
                              </div>
                              {org.integrations.instagram_posting ? (
                                  <Badge variant="success">Actif</Badge>
                              ) : (
                                  <Button variant="outline" size="sm" onClick={() => toast.info("Allez dans Paramètres > Intégrations")}>Connecter</Button>
                              )}
                          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-100">
                                      <Facebook className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                      <h4 className="font-medium text-slate-900">Facebook Page</h4>
                                      <p className="text-xs text-slate-500">{org.integrations.facebook_posting ? 'Connecté' : 'Non connecté'}</p>
                                  </div>
                              </div>
                              {org.integrations.facebook_posting ? (
                                  <Badge variant="success">Actif</Badge>
                              ) : (
                                  <Button variant="outline" size="sm" onClick={() => toast.info("Allez dans Paramètres > Intégrations")}>Connecter</Button>
                              )}
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-none">
                      <CardContent className="p-6">
                          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                              <Sparkles className="h-5 w-5" /> Conseil Pro
                          </h3>
                          <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                              Les avis avec du texte émotionnel ("Incroyable", "Merci", "J'adore") obtiennent 3x plus d'engagement sur Instagram.
                          </p>
                      </CardContent>
                  </Card>
              </div>

              <div className="space-y-6">
                  <Card className="h-full flex flex-col">
                      <CardHeader>
                          <CardTitle>Pépites à Partager</CardTitle>
                          <p className="text-sm text-slate-500">Vos meilleurs avis récents, prêts à être publiés.</p>
                      </CardHeader>
                      <CardContent className="flex-1">
                          {topReviews.length === 0 ? (
                              <div className="text-center py-12 text-slate-400">
                                  <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                  <p>Aucun avis 5 étoiles récent.</p>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  {topReviews.map(review => (
                                      <div key={review.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white">
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="flex items-center gap-2">
                                                  <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                                      {review.author_name.charAt(0)}
                                                  </div>
                                                  <span className="font-medium text-sm text-slate-900">{review.author_name}</span>
                                              </div>
                                              <div className="flex text-amber-400">
                                                  {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-current" />)}
                                              </div>
                                          </div>
                                          <p className="text-sm text-slate-600 italic mb-4 line-clamp-3">"{review.body}"</p>
                                          <Button size="sm" className="w-full" icon={Share2} onClick={() => setSelectedReviewForPost(review)}>
                                              Générer le Post
                                          </Button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {selectedReviewForPost && (
          <SocialShareModal review={selectedReviewForPost} onClose={() => setSelectedReviewForPost(null)} />
      )}
    </div>
  );
};