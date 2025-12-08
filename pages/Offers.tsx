


import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Offer, Coupon, Customer, CampaignLog } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select, Toggle } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, XCircle, Trash2, Tag, Loader2, Send, Users, BarChart3, PieChart, Palette, Mail, Smartphone, RefreshCw, DollarSign, MessageSquare, Zap, X, AlertTriangle, Link as LinkIcon, Wand2, Edit3, UserCheck, Search, ArrowRight, History, Calendar, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Quote Modal Component
const QuoteModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => Promise<void> }) => {
    const [data, setData] = useState({
        name: '',
        email: '',
        needs: '',
        volume: ''
    });
    const [sending, setSending] = useState(false);

    const handleSubmit = async () => {
        setSending(true);
        await onSubmit(data);
        setSending(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                    <CardTitle>Demande de devis</CardTitle>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Décrivez votre besoin pour une campagne sur-mesure. Notre équipe marketing vous contactera sous 24h.
                    </p>
                    <Input 
                        placeholder="Votre nom" 
                        value={data.name} 
                        onChange={e => setData({...data, name: e.target.value})} 
                    />
                    <Input 
                        placeholder="Votre email" 
                        type="email"
                        value={data.email} 
                        onChange={e => setData({...data, email: e.target.value})} 
                    />
                    <Input 
                        placeholder="Volume estimé de clients (ex: 500)" 
                        type="number"
                        value={data.volume} 
                        onChange={e => setData({...data, volume: e.target.value})} 
                    />
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm min-h-[100px]"
                        placeholder="Détails du besoin (Objectif, Cible, Délai...)"
                        value={data.needs}
                        onChange={e => setData({...data, needs: e.target.value})}
                    />
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSubmit} isLoading={sending} disabled={!data.email || !data.needs}>Envoyer la demande</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export const OffersPage = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'manage' | 'campaigns' | 'analytics' | 'scan'>('manage');
    
    const toast = useToast();

    useEffect(() => {
        loadOffers();
    }, []);

    const loadOffers = async () => {
        setLoading(true);
        const org = await api.organization.get();
        setOffers(org?.offers || []);
        setLoading(false);
    };

    const handleCreateOffer = async (offerData: Partial<Offer>) => {
        try {
            await api.offers.create(offerData);
            await loadOffers();
            toast.success("Offre créée avec succès !");
        } catch (e) {
            toast.error("Erreur création offre");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-8 w-8 text-pink-600" />
                        Offres & Fidélité
                    </h1>
                    <p className="text-slate-500">Créez, diffusez et analysez vos campagnes promotionnelles.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'manage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Catalogue
                    </button>
                    <button 
                        onClick={() => setActiveTab('campaigns')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'campaigns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Campagnes
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Performances
                    </button>
                    <button 
                        onClick={() => setActiveTab('scan')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Scanner
                    </button>
                </div>
            </div>

            {/* CATALOGUE TAB */}
            {activeTab === 'manage' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {offers.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-xl border-dashed border-slate-300">
                                <Gift className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">Aucune offre active</h3>
                                <p className="text-slate-500 mb-6">Créez votre première offre pour fidéliser vos clients.</p>
                            </div>
                        ) : (
                            offers.map(offer => (
                                <div key={offer.id} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm hover:shadow-md transition-shadow gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                                            {offer.style?.icon === 'coffee' ? '☕️' : offer.style?.icon === 'percent' ? '%' : '🎁'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{offer.title}</h4>
                                            <p className="text-sm text-slate-500">{offer.description}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="neutral" className="text-[10px]">Code: {offer.code_prefix}...</Badge>
                                                <Badge variant="neutral" className="text-[10px]">Exp: {offer.expiry_days}j</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-slate-900">{offer.stats.distributed}</div>
                                            <div className="text-[10px] uppercase text-slate-400 font-bold">Envoyés</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-green-600">{offer.stats.redeemed}</div>
                                            <div className="text-[10px] uppercase text-slate-400 font-bold">Utilisés</div>
                                        </div>
                                        <Badge variant={offer.active ? 'success' : 'neutral'}>{offer.active ? 'Active' : 'Pause'}</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Create Form */}
                    <div>
                        <CreateOfferForm onCreate={handleCreateOffer} />
                    </div>
                </div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
                <div className="max-w-6xl mx-auto">
                    <CampaignManager offers={offers} onCampaignSent={loadOffers} />
                </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-slate-500 mb-1">Chiffre d'Affaires Généré</div>
                                <div className="text-3xl font-bold text-slate-900">
                                    {offers.reduce((acc, o) => acc + (o.stats.revenue_generated || 0), 0)}€
                                </div>
                                <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> ROI estimé
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-slate-500 mb-1">Taux de Conversion Global</div>
                                <div className="text-3xl font-bold text-slate-900">
                                    {offers.length > 0 
                                        ? Math.round((offers.reduce((acc, o) => acc + o.stats.redeemed, 0) / Math.max(1, offers.reduce((acc, o) => acc + o.stats.distributed, 0))) * 100)
                                        : 0}%
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Utilisation / Distribution</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-slate-500 mb-1">Coupons Actifs</div>
                                <div className="text-3xl font-bold text-slate-900">
                                    {offers.reduce((acc, o) => acc + (o.stats.distributed - o.stats.redeemed), 0)}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">En circulation</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Performance par Offre</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={offers}>
                                    <XAxis dataKey="title" fontSize={12} stroke="#888888" />
                                    <YAxis fontSize={12} stroke="#888888" />
                                    <Tooltip />
                                    <Bar dataKey="stats.distributed" name="Distribués" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="stats.redeemed" name="Utilisés" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SCANNER TAB */}
            {activeTab === 'scan' && (
                <div className="max-w-md mx-auto">
                    <CouponScanner />
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const CreateOfferForm = ({ onCreate }: { onCreate: (o: any) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [trigger, setTrigger] = useState('5');
    const [icon, setIcon] = useState('gift');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title) return;
        setLoading(true);
        await onCreate({
            title,
            description: desc,
            code_prefix: title.substring(0, 3).toUpperCase(),
            trigger_rating: parseInt(trigger),
            active: true,
            expiry_days: 30,
            style: { color: '#ec4899', icon }
        });
        setTitle('');
        setDesc('');
        setLoading(false);
    };

    return (
        <Card className="sticky top-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-600" /> Nouvelle Offre
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Titre de l'offre</label>
                    <Input placeholder="ex: Café Offert" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Détails</label>
                    <Input placeholder="ex: Pour tout repas > 15€" value={desc} onChange={e => setDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Déclencheur</label>
                        <Select value={trigger} onChange={e => setTrigger(e.target.value)}>
                            <option value="5">5 Étoiles</option>
                            <option value="4">4 Étoiles +</option>
                            <option value="0">Manuel</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Icône</label>
                        <div className="flex gap-2">
                            {['gift', 'coffee', 'percent'].map(i => (
                                <button 
                                    key={i} 
                                    onClick={() => setIcon(i)}
                                    className={`p-2 rounded border ${icon === i ? 'bg-pink-50 border-pink-500 text-pink-600' : 'bg-white border-slate-200'}`}
                                >
                                    {i === 'gift' ? '🎁' : i === 'coffee' ? '☕️' : '%'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <Button className="w-full mt-2" onClick={handleSubmit} isLoading={loading} disabled={!title}>Créer</Button>
            </CardContent>
        </Card>
    );
};

// Campaign Manager with Wizard & History
const CampaignManager = ({ offers, onCampaignSent }: { offers: Offer[], onCampaignSent: () => void }) => {
    // Steps: 'edit' -> 'review' -> 'success'
    const [step, setStep] = useState<'edit' | 'review' | 'success'>('edit');
    const [selectedOfferId, setSelectedOfferId] = useState<string>('');
    const [channel, setChannel] = useState<'email' | 'sms'>('email');
    const [sending, setSending] = useState(false);
    
    // Audience (CRM Logic)
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<string>('all');
    const [targetAudience, setTargetAudience] = useState<Customer[]>([]);
    
    // Message State
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    
    const [generating, setGenerating] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    
    // Campaign Results State
    const [lastCampaignResult, setLastCampaignResult] = useState<CampaignLog | null>(null);
    const [campaignHistory, setCampaignHistory] = useState<CampaignLog[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<CampaignLog | null>(null);

    const toast = useToast();
    const selectedOffer = offers.find(o => o.id === selectedOfferId);

    // Initial Load
    useEffect(() => {
        const fetchCRM = async () => {
            const list = await api.customers.list();
            setCustomers(list);
            setTargetAudience(list); // Default all
        };
        const fetchHistory = async () => {
            const hist = await api.campaigns.getHistory();
            setCampaignHistory(hist);
        };
        fetchCRM();
        fetchHistory();
    }, []);

    // Link generation
    useEffect(() => {
        if (selectedOffer) {
            prepareLink();
        }
    }, [selectedOffer]);

    // Segment update
    useEffect(() => {
        if (!customers.length) return;
        let filtered = [];
        switch (selectedSegment) {
            case 'vip':
                filtered = customers.filter(c => c.status === 'promoter' || (c.ltv_estimate && c.ltv_estimate > 200));
                break;
            case 'risk':
                filtered = customers.filter(c => c.status === 'detractor' || c.average_rating <= 3);
                break;
            case 'new':
                filtered = customers.filter(c => c.stage === 'new');
                break;
            default:
                filtered = customers;
        }
        setTargetAudience(filtered);
    }, [selectedSegment, customers]);

    const prepareLink = async () => {
        if (!selectedOffer) return;
        const longUrl = `https://reviewflow.vercel.app/#/redeem/${selectedOffer.id}`;
        try {
            const short = await api.links.createShortLink(longUrl);
            setGeneratedLink(`https://${short.short_url}`);
        } catch (e) {
            setGeneratedLink(longUrl);
        }
    };

    const handleGenerateMessage = async () => {
        if (!selectedOffer) return;
        setGenerating(true);
        try {
            if (channel === 'sms') {
                const context = {
                    offerTitle: selectedOffer.title,
                    offerDesc: selectedOffer.description,
                    offerCode: selectedOffer.code_prefix + 'VIP',
                    segment: selectedSegment,
                    channel: channel
                };
                const text = await api.ai.generateSms(context);
                setBody(text);
            } else {
                const context = {
                    offerTitle: selectedOffer.title,
                    offerDesc: selectedOffer.description,
                    segment: selectedSegment
                };
                const result = await api.ai.generateEmailCampaign(context);
                setSubject(result.subject);
                setBody(result.body);
            }
            setIsAiGenerated(true);
        } catch (e) {
            console.error(e);
            toast.error("Erreur génération IA");
        } finally {
            setGenerating(false);
        }
    };

    const insertVariable = (variable: string) => {
        if (channel === 'email') {
            setBody(prev => prev + ` {{${variable}}} `);
        } else {
            setBody(prev => prev + ` {${variable}} `);
        }
    };

    const handleQuoteRequest = async (data: any) => {
        try {
            await api.campaigns.requestQuote(data);
            toast.success("Demande envoyée !");
            setShowQuoteModal(false);
        } catch (e) {
            toast.error("Erreur lors de l'envoi de la demande");
        }
    };

    // --- ACTIONS FLOW ---

    const goToReview = () => {
        if (!selectedOffer || !body || (channel === 'email' && !subject)) {
            toast.error("Veuillez compléter le message.");
            return;
        }
        if (targetAudience.length === 0) {
            toast.error("L'audience est vide.");
            return;
        }
        setStep('review');
    };

    const handleSend = async () => {
        setSending(true);
        try {
            // Map audience to recipient objects
            const recipientsList = targetAudience.map(c => ({
                email: c.email || '',
                name: c.name,
                phone: c.phone,
                link: generatedLink,
                businessName: 'Notre Établissement'
            })).filter(r => (channel === 'email' ? !!r.email : !!r.phone));

            if (recipientsList.length === 0) {
                toast.error(`Aucun contact avec ${channel === 'email' ? 'email' : 'téléphone'} dans ce segment.`);
                setSending(false);
                return;
            }

            const segmentLabel = selectedSegment === 'all' ? 'Tous les clients' : selectedSegment === 'vip' ? 'VIP' : selectedSegment === 'risk' ? 'À reconquérir' : 'Nouveaux';

            const result = await api.campaigns.send(channel, recipientsList, subject, body, segmentLabel, generatedLink);
            setLastCampaignResult(result);
            
            // Refresh history immediately
            const updatedHistory = await api.campaigns.getHistory();
            setCampaignHistory(updatedHistory);
            
            setStep('success');
            onCampaignSent();
        } catch (e: any) {
            toast.error("Erreur d'envoi: " + e.message);
        } finally {
            setSending(false);
        }
    };

    const resetCampaign = () => {
        setStep('edit');
        setBody('');
        setSubject('');
        setLastCampaignResult(null);
    };

    return (
        <div className="space-y-8">
            {showQuoteModal && <QuoteModal onClose={() => setShowQuoteModal(false)} onSubmit={handleQuoteRequest} />}

            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowQuoteModal(true)}>
                    Demande de devis / Sur-mesure
                </Button>
            </div>

            {/* WIZARD CARD */}
            {step === 'edit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-600"/> 1. Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Offre à envoyer</label>
                                <Select value={selectedOfferId} onChange={e => setSelectedOfferId(e.target.value)}>
                                    <option value="">Choisir une offre...</option>
                                    {offers.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Segment CRM</label>
                                <Select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}>
                                    <option value="all">Tous les clients</option>
                                    <option value="vip">Ambassadeurs (VIP &gt; 4.5★)</option>
                                    <option value="risk">À reconquérir (Risque)</option>
                                    <option value="new">Nouveaux Clients (30j)</option>
                                </Select>
                                
                                <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-indigo-900">
                                        <UserCheck className="h-4 w-4" />
                                        <span className="font-bold">{targetAudience.length} contacts</span> sélectionnés
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Canal de diffusion</label>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setChannel('email')}
                                        className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${channel === 'email' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                                    >
                                        <Mail className="h-4 w-4" /> Email
                                    </button>
                                    <button 
                                        onClick={() => setChannel('sms')}
                                        className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${channel === 'sms' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                                    >
                                        <Smartphone className="h-4 w-4" /> SMS
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 flex flex-col h-full relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-indigo-600"/> 2. Message
                            </CardTitle>
                            <div className="flex gap-2">
                                {isAiGenerated && <Badge variant="success" className="animate-in fade-in">✨ Généré par IA</Badge>}
                                <Button 
                                    size="xs" 
                                    variant="secondary" 
                                    onClick={handleGenerateMessage} 
                                    isLoading={generating} 
                                    icon={Wand2}
                                    disabled={!selectedOffer}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none hover:opacity-90"
                                >
                                    IA Magic
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-4 bg-white">
                            {selectedOffer ? (
                                <div className="space-y-4 flex-1 flex flex-col">
                                    {channel === 'email' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Objet</label>
                                            <Input 
                                                value={subject} 
                                                onChange={e => setSubject(e.target.value)} 
                                                placeholder="Sujet accrocheur..."
                                                className="bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase">Message</label>
                                            <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] sm:max-w-none">
                                                {[
                                                    { label: 'Prénom', val: 'prénom' },
                                                    { label: 'Nom', val: 'nom' },
                                                    { label: 'Lien Avis', val: 'lien_avis' },
                                                    { label: 'Établissement', val: 'nom_etablissement' }
                                                ].map(v => (
                                                    <button
                                                        key={v.val}
                                                        onClick={() => insertVariable(v.val)}
                                                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded border border-slate-200 transition-colors whitespace-nowrap"
                                                    >
                                                        {`{{${v.label}}}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea 
                                            className="w-full bg-slate-50 p-4 rounded-lg border border-slate-200 resize-none text-sm text-slate-800 min-h-[150px] focus:ring-2 focus:ring-indigo-500 flex-1 font-mono"
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                            placeholder={channel === 'sms' ? "Votre message SMS..." : "<h1>Corps de l'email</h1><p>HTML supporté...</p>"}
                                        />
                                        
                                        {generatedLink && (
                                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                                                <LinkIcon className="h-3 w-3 text-indigo-500" /> 
                                                Lien court utilisé : <span className="font-mono text-indigo-600 ml-1">{generatedLink}</span>
                                            </div>
                                        )}

                                        {channel === 'sms' && body.length > 160 && (
                                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2 font-medium">
                                                <AlertTriangle className="h-3 w-3" /> Attention: Ce message utilisera {Math.ceil(body.length / 160)} SMS.
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={goToReview} icon={ArrowRight}>Suivant : Vérification</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-12 flex-1 flex items-center justify-center flex-col">
                                    <Gift className="h-12 w-12 mb-3 opacity-20" />
                                    <p>Sélectionnez une offre à gauche pour commencer.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* REVIEW CARD */}
            {step === 'review' && (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Scan className="h-6 w-6 text-indigo-600"/> Récapitulatif avant envoi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Type</span>
                                    <div className="flex items-center gap-2 font-bold text-slate-900">
                                        {channel === 'email' ? <Mail className="h-4 w-4"/> : <Smartphone className="h-4 w-4"/>} 
                                        {channel.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Audience</span>
                                    <div className="flex items-center gap-2 font-bold text-slate-900">
                                        <Users className="h-4 w-4"/>
                                        {targetAudience.length} destinataires ({selectedSegment})
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Offre</span>
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Tag className="h-4 w-4"/> {selectedOffer?.title}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Date d'envoi</span>
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Zap className="h-4 w-4 text-amber-500"/> Immédiat
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase font-bold block mb-2">Aperçu du message</span>
                                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                    {channel === 'email' && <div className="font-bold border-b border-slate-100 pb-2 mb-2">Objet : {subject}</div>}
                                    <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                        {body}
                                    </div>
                                    <div className="mt-3 text-xs text-indigo-500 flex items-center gap-1">
                                        <LinkIcon className="h-3 w-3"/> Lien inclus : {generatedLink}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setStep('edit')}>Retour</Button>
                                <Button size="lg" onClick={handleSend} isLoading={sending} className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                                    Confirmer et Envoyer ({targetAudience.length})
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SUCCESS CARD */}
            {step === 'success' && (
                <div className="max-w-2xl mx-auto text-center animate-in zoom-in-95 duration-500">
                    <div className="inline-flex h-20 w-20 bg-green-100 text-green-600 rounded-full items-center justify-center mb-6 shadow-sm">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Campagne Lancée !</h2>
                    <p className="text-slate-500 mb-8">Votre message est en cours d'envoi à {lastCampaignResult?.recipient_count} contacts.</p>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-2xl font-bold text-slate-900">{lastCampaignResult?.success_count}</div>
                            <div className="text-xs text-green-600 font-bold uppercase">Succès</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-2xl font-bold text-slate-900">{lastCampaignResult ? lastCampaignResult.recipient_count - lastCampaignResult.success_count : 0}</div>
                            <div className="text-xs text-red-500 font-bold uppercase">Échecs</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}>
                            Voir l'historique
                        </Button>
                        <Button onClick={resetCampaign}>
                            Nouvelle Campagne
                        </Button>
                    </div>
                </div>
            )}

            {/* HISTORY SECTION */}
            <div id="history-section" className="pt-8 border-t border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <History className="h-6 w-6 text-slate-400" /> Historique des Campagnes
                </h3>
                
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Canal</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Message / Objet</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Cible</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Taux Succès</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-50">
                                {campaignHistory.map((camp) => (
                                    <tr 
                                        key={camp.id} 
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedHistoryItem(camp)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {new Date(camp.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {camp.type === 'email' ? (
                                                <Badge variant="neutral" className="bg-blue-50 text-blue-700 border-blue-100"><Mail className="h-3 w-3 mr-1"/> Email</Badge>
                                            ) : (
                                                <Badge variant="neutral" className="bg-purple-50 text-purple-700 border-purple-100"><Smartphone className="h-3 w-3 mr-1"/> SMS</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900 truncate max-w-[250px]">
                                                {camp.subject || camp.content}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full inline-block">
                                                {camp.segment_name} ({camp.recipient_count})
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={camp.status === 'completed' ? 'success' : camp.status === 'sending' ? 'warning' : 'error'} className="capitalize">
                                                {camp.status === 'completed' ? 'Terminé' : camp.status === 'sending' ? 'En cours' : 'Échec'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium text-green-600">
                                            {camp.recipient_count > 0 ? Math.round((camp.success_count / camp.recipient_count) * 100) : 0}%
                                        </td>
                                    </tr>
                                ))}
                                {campaignHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Aucune campagne envoyée pour le moment.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* DETAIL MODAL */}
            {selectedHistoryItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-lg shadow-xl">
                        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                            <CardTitle>Détails Campagne</CardTitle>
                            <button onClick={() => setSelectedHistoryItem(null)}><X className="h-5 w-5 text-slate-400" /></button>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div><span className="font-bold text-slate-500">Date:</span> {new Date(selectedHistoryItem.created_at).toLocaleString()}</div>
                                <div><span className="font-bold text-slate-500">Type:</span> {selectedHistoryItem.type.toUpperCase()}</div>
                                <div><span className="font-bold text-slate-500">Cible:</span> {selectedHistoryItem.segment_name}</div>
                                <div><span className="font-bold text-slate-500">Volume:</span> {selectedHistoryItem.recipient_count}</div>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Contenu envoyé</span>
                                {selectedHistoryItem.subject && (
                                    <div className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-2">
                                        Objet: {selectedHistoryItem.subject}
                                    </div>
                                )}
                                <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                                    {selectedHistoryItem.content}
                                </div>
                            </div>

                            {selectedHistoryItem.funnel_link && (
                                <div className="flex items-center gap-2 text-sm bg-indigo-50 p-3 rounded-lg text-indigo-700 border border-indigo-100">
                                    <LinkIcon className="h-4 w-4" />
                                    Lien utilisé : <a href={selectedHistoryItem.funnel_link} target="_blank" className="underline font-bold">{selectedHistoryItem.funnel_link}</a>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button onClick={() => setSelectedHistoryItem(null)}>Fermer</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

const CouponScanner = () => {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const toast = useToast();

    const handleScan = async () => {
        if (!code) return;
        setScanning(true);
        try {
            const res = await api.offers.validate(code);
            setResult(res);
        } catch (e) {
            setResult({ valid: false, reason: "Erreur technique" });
        } finally {
            setScanning(false);
        }
    };

    const handleRedeem = async () => {
        setScanning(true);
        try {
            await api.offers.redeem(code);
            toast.success("Validé avec succès !");
            setResult(null);
            setCode('');
        } catch (e) {
            toast.error("Erreur lors de la validation");
        } finally {
            setScanning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Scan className="h-6 w-6 text-indigo-600" /> Vérification Coupon
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Code Client</label>
                    <Input 
                        placeholder="ex: GIFT-X892" 
                        className="text-center text-2xl tracking-widest font-mono uppercase h-16"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                    />
                </div>
                
                <Button 
                    size="lg" 
                    className="w-full" 
                    onClick={handleScan} 
                    isLoading={scanning}
                    disabled={!code}
                >
                    Vérifier
                </Button>

                {result && (
                    <div className={`p-6 rounded-xl border-2 flex flex-col items-center text-center gap-2 animate-in zoom-in-95 ${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {result.valid ? (
                            <>
                                <CheckCircle2 className="h-16 w-16 text-green-600 mb-2" />
                                <h3 className="font-bold text-green-800 text-2xl">Valide !</h3>
                                <p className="text-green-700 font-medium text-lg">{result.discount}</p>
                                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 border-none h-12 text-lg" onClick={handleRedeem}>
                                    Consommer le coupon
                                </Button>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-16 w-16 text-red-600 mb-2" />
                                <h3 className="font-bold text-red-800 text-2xl">Invalide</h3>
                                <p className="text-red-700 text-lg">{result.reason}</p>
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};