
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Offer, Coupon } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select, Toggle } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, XCircle, Trash2, Tag, Loader2, Send, Users, BarChart3, PieChart, Palette, Mail, Smartphone, RefreshCw, DollarSign, MessageSquare, Zap, X, AlertTriangle, Link as LinkIcon, Wand2 } from 'lucide-react';
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
                <div className="max-w-4xl mx-auto">
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

const CampaignManager = ({ offers, onCampaignSent }: { offers: Offer[], onCampaignSent: () => void }) => {
    const [selectedOfferId, setSelectedOfferId] = useState<string>('');
    const [segment, setSegment] = useState('vip');
    const [channel, setChannel] = useState<'email' | 'sms'>('email');
    const [sending, setSending] = useState(false);
    
    // Message State
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    
    const [generating, setGenerating] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const toast = useToast();

    const selectedOffer = offers.find(o => o.id === selectedOfferId);

    // Initial setup when offer selected
    useEffect(() => {
        if (selectedOffer) {
            prepareLink();
        }
    }, [selectedOffer]);

    const prepareLink = async () => {
        if (!selectedOffer) return;
        // Generate a "pretty" short link for this campaign
        // In reality, this would likely be specific to the campaign batch or user
        // Here we create one generic for the offer/campaign context
        const longUrl = `https://reviewflow.vercel.app/#/redeem/${selectedOffer.id}`;
        try {
            const short = await api.links.createShortLink(longUrl);
            setGeneratedLink(`avis.reviewflow.com/v/${short.slug}`);
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
                    segment: segment,
                    channel: channel
                };
                const text = await api.ai.generateSms(context);
                setBody(text);
            } else {
                const context = {
                    offerTitle: selectedOffer.title,
                    offerDesc: selectedOffer.description,
                    segment: segment
                };
                const result = await api.ai.generateEmailCampaign(context);
                setSubject(result.subject);
                setBody(result.body);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur génération IA");
        } finally {
            setGenerating(false);
        }
    };

    const insertVariable = (variable: string) => {
        setBody(prev => prev + ` {{${variable}}} `);
    };

    const handleSend = async () => {
        setSending(true);
        try {
            // For demo purposes, we send to a dummy recipient or loop through customers
            // Here we assume backend handles list based on segment
            await api.campaigns.send(channel, 'list:' + segment, subject, body);
            toast.success(`Campagne ${channel === 'email' ? 'email' : 'SMS'} envoyée !`);
            onCampaignSent();
        } catch (e: any) {
            toast.error("Erreur d'envoi: " + e.message);
        } finally {
            setSending(false);
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

    return (
        <div className="space-y-6">
            {showQuoteModal && <QuoteModal onClose={() => setShowQuoteModal(false)} onSubmit={handleQuoteRequest} />}

            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowQuoteModal(true)}>
                    Demande de devis / Sur-mesure
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Offre à envoyer</label>
                            <Select value={selectedOfferId} onChange={e => setSelectedOfferId(e.target.value)}>
                                <option value="">Choisir une offre...</option>
                                {offers.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cible (Audience)</label>
                            <Select value={segment} onChange={e => setSegment(e.target.value)}>
                                <option value="vip">Clients VIP (Fidèles)</option>
                                <option value="risk">À reconquérir (Pas vus depuis 30j)</option>
                                <option value="all">Tous les clients</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Canal</label>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setChannel('email')}
                                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${channel === 'email' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-slate-50'}`}
                                >
                                    <Mail className="h-4 w-4" /> Email
                                </button>
                                <button 
                                    onClick={() => setChannel('sms')}
                                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${channel === 'sms' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-slate-50'}`}
                                >
                                    <Smartphone className="h-4 w-4" /> SMS
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* PREVIEW & MESSAGE */}
                <Card className="bg-slate-50 border-slate-200 flex flex-col h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Contenu du message</CardTitle>
                        <Button 
                            size="xs" 
                            variant="secondary" 
                            onClick={handleGenerateMessage} 
                            isLoading={generating} 
                            icon={Wand2}
                            disabled={!selectedOffer}
                        >
                            Générer avec IA
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        {selectedOffer ? (
                            <div className="space-y-4 flex-1">
                                {channel === 'email' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Objet</label>
                                        <Input 
                                            value={subject} 
                                            onChange={e => setSubject(e.target.value)} 
                                            placeholder="Sujet de l'email..."
                                            className="bg-white"
                                        />
                                    </div>
                                )}
                                
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Corps du message</label>
                                        <div className="flex gap-1">
                                            <Badge variant="neutral" className="cursor-pointer hover:bg-white" onClick={() => insertVariable('name')}>Prénom</Badge>
                                            <Badge variant="neutral" className="cursor-pointer hover:bg-white" onClick={() => insertVariable('link')}>Lien</Badge>
                                        </div>
                                    </div>
                                    <textarea 
                                        className="w-full bg-white p-4 rounded-lg border border-slate-200 resize-none text-sm text-slate-800 min-h-[150px] focus:ring-2 focus:ring-indigo-500 flex-1"
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        placeholder={channel === 'sms' ? "Votre message SMS..." : "Corps de l'email (HTML supporté)..."}
                                    />
                                    
                                    {generatedLink && (
                                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded w-fit border border-slate-200">
                                            <LinkIcon className="h-3 w-3" /> Lien court actif : <span className="font-mono text-indigo-600">{generatedLink}</span>
                                        </div>
                                    )}

                                    {channel === 'sms' && body.length > 160 && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                                            <AlertTriangle className="h-3 w-3" /> Attention: Ce message utilisera 2 SMS.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-12 flex-1 flex items-center justify-center">Sélectionnez une offre pour commencer.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button size="lg" icon={Send} onClick={handleSend} isLoading={sending} disabled={!selectedOffer || !body} className="shadow-xl shadow-indigo-200">
                    Envoyer la campagne {channel === 'email' ? 'Email' : 'SMS'}
                </Button>
            </div>
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
