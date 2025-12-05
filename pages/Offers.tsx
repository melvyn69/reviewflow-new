
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Offer, Coupon } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, XCircle, Trash2, Tag, Loader2, Send, Users, BarChart3, PieChart, Palette, Mail, Smartphone, RefreshCw, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    const [channel, setChannel] = useState('email');
    const [sending, setSending] = useState(false);
    const toast = useToast();

    const selectedOffer = offers.find(o => o.id === selectedOfferId);

    const handleSend = async () => {
        if (!selectedOffer) return;
        setSending(true);
        try {
            const res = await api.offers.distributeCampaign(selectedOffer.id, segment, channel);
            toast.success(`Campagne envoyée à ${res.sent_count || 0} clients !`);
            onCampaignSent();
        } catch (e) {
            toast.error("Erreur d'envoi");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
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

                {/* PREVIEW */}
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle>Aperçu {channel === 'email' ? 'Email' : 'SMS'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedOffer ? (
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                                {channel === 'email' ? (
                                    <div className="space-y-4">
                                        <div className="border-b pb-2 mb-2">
                                            <div className="text-xs text-slate-400">Sujet:</div>
                                            <div className="font-bold text-slate-900">🎁 Une surprise vous attend chez {api.auth.getUser().then(u => u?.name)} !</div>
                                        </div>
                                        <p className="text-sm text-slate-600">Bonjour,</p>
                                        <p className="text-sm text-slate-600">Pour vous remercier de votre fidélité, nous avons le plaisir de vous offrir :</p>
                                        <div className="bg-pink-50 p-4 rounded-lg text-center border border-pink-100 my-4">
                                            <div className="text-2xl mb-2">{selectedOffer.style?.icon === 'coffee' ? '☕️' : '🎁'}</div>
                                            <h3 className="text-xl font-bold text-pink-700">{selectedOffer.title}</h3>
                                            <p className="text-sm text-pink-600">{selectedOffer.description}</p>
                                            <div className="mt-2 text-xs text-pink-400 uppercase tracking-widest font-mono">CODE: {selectedOffer.code_prefix}VIP</div>
                                        </div>
                                        <p className="text-xs text-slate-400">Valable 30 jours. Présentez ce code en caisse.</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 p-4 rounded-lg rounded-bl-none max-w-[80%] ml-auto text-sm text-slate-800">
                                        Hello ! 👋 Profitez de <strong>{selectedOffer.title}</strong> chez nous cette semaine ! Montrez ce code : {selectedOffer.code_prefix}VIP. À bientôt !
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-12">Sélectionnez une offre pour voir l'aperçu.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button size="lg" icon={Send} onClick={handleSend} isLoading={sending} disabled={!selectedOffer} className="shadow-xl shadow-indigo-200">
                    Lancer la campagne
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
