
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Offer, CampaignLog } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, Trash2, Tag, Loader2, Send, BarChart3, Mail, Smartphone, AlertTriangle, Wand2, ArrowRight, History, Calendar, QrCode, Camera, Flashlight, Clock, AlertOctagon, Megaphone, Users, MessageSquare, ExternalLink, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Html5Qrcode } from 'html5-qrcode';

// --- UTILS ---
const getOfferStatus = (offer: Offer) => {
    if (!offer.active) return 'paused';
    const now = new Date();
    if (offer.validity_start && new Date(offer.validity_start) > now) return 'upcoming';
    if (offer.validity_end && new Date(offer.validity_end) < now) return 'expired';
    return 'active';
};

const OfferStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'active': return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>;
        case 'upcoming': return <Badge variant="neutral" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Clock className="h-3 w-3" /> À venir</Badge>;
        case 'expired': return <Badge variant="neutral" className="opacity-70 gap-1"><History className="h-3 w-3" /> Expirée</Badge>;
        case 'paused': return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" /> Pause</Badge>;
        default: return <Badge variant="neutral">Inconnu</Badge>;
    }
};

// --- COMPONENTS ---

// 1. CAMPAIGN BUILDER MODAL
const CampaignBuilder = ({ offer, onClose, onSend }: { offer?: Offer | null, onClose: () => void, onSend: () => void }) => {
    const [channel, setChannel] = useState<'sms' | 'email'>('sms');
    const [segment, setSegment] = useState('all');
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [sending, setSending] = useState(false);
    const toast = useToast();

    // Auto-fill message based on offer if present
    useEffect(() => {
        if (offer) {
            setSubject(`Offre spéciale : ${offer.title}`);
            const baseMsg = channel === 'sms' 
                ? `Bonjour ! Profitez de ${offer.title} chez nous. Montrez ce code : ${offer.code_prefix}. ${offer.description.substring(0, 50)}... STOP au 36X`
                : `<p>Bonjour,</p><p>Nous avons le plaisir de vous offrir <strong>${offer.title}</strong>.</p><p>${offer.description}</p><p>Code : <strong>${offer.code_prefix}</strong></p>`;
            setMessage(baseMsg);
        }
    }, [offer, channel]);

    const handleSend = async () => {
        if (!message) return toast.error("Le message est vide.");
        setSending(true);
        try {
            await api.campaigns.send(
                channel, 
                segment === 'manual' ? 'test@client.com' : 'list:all', // Mock recipient logic
                subject || "Nouvelle annonce", 
                message, 
                segment,
                offer ? `/offers/${offer.id}` : undefined
            );
            toast.success("Campagne envoyée avec succès !");
            onSend();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-2xl shadow-2xl border-none">
                <CardHeader className="bg-indigo-600 text-white rounded-t-xl py-4 flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Megaphone className="h-5 w-5" /> 
                        {offer ? `Diffuser l'offre "${offer.title}"` : "Nouvelle Campagne Libre"}
                    </CardTitle>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><AlertTriangle className="h-5 w-5 rotate-45" /></button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Configuration */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Canal</label>
                                <div className="flex gap-3">
                                    <button onClick={() => setChannel('sms')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${channel === 'sms' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}>
                                        <Smartphone className="h-5 w-5" /> SMS
                                    </button>
                                    <button onClick={() => setChannel('email')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${channel === 'email' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}>
                                        <Mail className="h-5 w-5" /> Email
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Audience</label>
                                <Select value={segment} onChange={e => setSegment(e.target.value)}>
                                    <option value="all">Tous les clients (opt-in)</option>
                                    <option value="vip">Clients VIP (Top 20%)</option>
                                    <option value="churn">Clients inactifs (> 3 mois)</option>
                                    <option value="manual">Test (Moi uniquement)</option>
                                </Select>
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Users className="h-3 w-3" /> 
                                    Estimation : {segment === 'all' ? '1,240' : segment === 'vip' ? '240' : '5'} destinataires
                                </p>
                            </div>

                            {channel === 'email' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Objet</label>
                                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Surprise pour vous !" />
                                </div>
                            )}
                        </div>

                        {/* Right: Message Editor */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                                Message
                                <button className="text-indigo-600 flex items-center gap-1 hover:underline" onClick={() => setMessage(prev => prev + " {{prenom}}")}>
                                    <Wand2 className="h-3 w-3" /> Insérer variable
                                </button>
                            </label>
                            <textarea 
                                className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                                placeholder={channel === 'sms' ? "Votre message SMS..." : "Contenu HTML de l'email..."}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                style={{ minHeight: '150px' }}
                            />
                            {channel === 'sms' && (
                                <div className={`text-right text-xs mt-2 ${message.length > 160 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                    {message.length} / 160 caractères
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose}>Annuler</Button>
                        <Button onClick={handleSend} isLoading={sending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                            <Send className="h-4 w-4 mr-2" /> Envoyer la campagne
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// 2. CAMPAIGN HISTORY LIST
const CampaignHistory = () => {
    const [logs, setLogs] = useState<CampaignLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.campaigns.getHistory().then(setLogs).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600"/></div>;

    if (logs.length === 0) return (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune campagne envoyée pour le moment.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${log.type === 'sms' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {log.type === 'sms' ? <Smartphone className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">{log.subject || "Message SMS"}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{log.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="neutral" className="text-[10px]">{new Date(log.created_at).toLocaleDateString()}</Badge>
                                <span className="text-[10px] text-slate-400">• Cible : {log.segment_name}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end bg-slate-50 p-2 md:p-0 md:bg-transparent rounded-lg">
                        <div className="text-center md:text-right px-2">
                            <div className="text-lg font-bold text-slate-900">{log.recipient_count}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Envoyés</div>
                        </div>
                        <div className="text-center md:text-right px-2 border-l border-slate-200">
                            <div className="text-lg font-bold text-green-600">{Math.round((log.success_count / log.recipient_count) * 100)}%</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Délivrés</div>
                        </div>
                        {log.funnel_link && (
                            <Button size="xs" variant="ghost" icon={ExternalLink} onClick={() => window.open(log.funnel_link, '_blank')} />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// 3. SCANNER
const ScannerModule = () => {
    const [scannedCode, setScannedCode] = useState('');
    const [scanResult, setScanResult] = useState<any>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const toast = useToast();

    useEffect(() => {
        return () => {
            if (scannerRef.current && cameraActive) stopScanner();
        };
    }, [cameraActive]);

    const startScanner = async () => {
        try {
            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                handleCodeScanned,
                () => {}
            );
            setCameraActive(true);
        } catch (err) {
            toast.error("Impossible d'accéder à la caméra");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setCameraActive(false);
            } catch (err) { console.error(err); }
        }
    };

    const handleCodeScanned = async (code: string) => {
        if (scanResult) return; // Prevent double scan
        try {
            const res = await api.offers.validate(code);
            setScanResult(res);
            if (cameraActive) await stopScanner();
        } catch (e) {
            toast.error("Erreur de validation");
        }
    };

    const handleRedeem = async () => {
        if (!scanResult?.coupon?.code) return;
        try {
            await api.offers.redeem(scanResult.coupon.code);
            toast.success("Offre validée !");
            setScanResult((prev: any) => ({ ...prev, redeemed_now: true }));
        } catch (e) {
            toast.error("Erreur validation");
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setScannedCode('');
    };

    return (
        <div className="max-w-md mx-auto">
            {!scanResult ? (
                <Card className="border-indigo-200 shadow-lg overflow-hidden">
                    <div className="bg-black min-h-[300px] relative flex flex-col items-center justify-center">
                        <div id="reader" className="w-full"></div>
                        {!cameraActive ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10 flex-col gap-4">
                                <Button onClick={startScanner} size="lg" className="rounded-full h-20 w-20 bg-indigo-600 hover:bg-indigo-500 shadow-xl border-4 border-indigo-400">
                                    <Camera className="h-10 w-10" />
                                </Button>
                                <p className="text-white text-sm font-medium">Scanner un QR Code client</p>
                            </div>
                        ) : (
                            <div className="absolute bottom-4 z-20 w-full flex justify-center gap-4">
                                <Button variant="secondary" size="sm" onClick={stopScanner} className="bg-white/90 backdrop-blur">Arrêter</Button>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-white border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Ou saisir le code manuellement</p>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="GIFT-123..." 
                                value={scannedCode} 
                                onChange={e => setScannedCode(e.target.value.toUpperCase())}
                                className="font-mono text-center uppercase text-lg tracking-widest"
                            />
                            <Button onClick={() => handleCodeScanned(scannedCode)} disabled={!scannedCode} className="px-6">OK</Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className={`border-l-8 shadow-xl animate-in zoom-in-95 ${scanResult.valid ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-8 text-center">
                        {scanResult.valid ? (
                            <>
                                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-2">Offre Valide !</h2>
                                <p className="text-lg text-green-700 font-bold mb-6 bg-green-50 py-2 rounded-lg">{scanResult.discount}</p>
                                
                                <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Client :</span>
                                        <span className="font-medium text-slate-900">{scanResult.coupon.customer_email || 'Anonyme'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Expire le :</span>
                                        <span className="font-medium text-slate-900">{new Date(scanResult.coupon.expires_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {!scanResult.redeemed_now ? (
                                    <Button onClick={handleRedeem} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        Valider l'utilisation
                                    </Button>
                                ) : (
                                    <div className="bg-slate-100 text-slate-500 p-3 rounded-lg font-bold text-sm">
                                        Coupon déjà consommé ✅
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                    <AlertOctagon className="h-12 w-12 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Code Invalide</h2>
                                <p className="text-red-600 font-medium mb-6">{scanResult.reason}</p>
                            </>
                        )}
                        
                        <Button variant="ghost" onClick={resetScan} className="w-full mt-4">Scanner un autre code</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// MAIN PAGE COMPONENT
export const OffersPage = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeTab, setActiveTab] = useState<'offers' | 'campaigns' | 'scanner' | 'stats'>('offers');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('active');
    const [loading, setLoading] = useState(true);
    
    // Campaign Modal State
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [selectedOfferForCampaign, setSelectedOfferForCampaign] = useState<Offer | null>(null);

    const toast = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const org = await api.organization.get();
        setOffers(org?.offers || []);
        setLoading(false);
    };

    const handleCreateOffer = async (offer: any) => {
        try {
            await api.offers.create(offer);
            toast.success("Offre créée");
            loadData();
        } catch (e) {
            toast.error("Erreur création");
        }
    };

    const openCampaignBuilder = (offer: Offer | null = null) => {
        setSelectedOfferForCampaign(offer);
        setShowCampaignModal(true);
    };

    const filteredOffers = offers.filter(o => {
        if (statusFilter === 'all') return true;
        const status = getOfferStatus(o);
        if (statusFilter === 'active') return status === 'active' || status === 'upcoming' || status === 'paused';
        return status === statusFilter;
    });

    // Sub-Component: Create Offer Form (Simplified for UI cleanliness)
    const CreateForm = () => {
        const [title, setTitle] = useState('');
        const [desc, setDesc] = useState('');
        const [type, setType] = useState('discount');
        const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
        const [end, setEnd] = useState('');
        
        const submit = () => {
            handleCreateOffer({
                title, description: desc, active: true,
                validity_start: new Date(start).toISOString(),
                validity_end: end ? new Date(end).toISOString() : undefined,
                code_prefix: 'PROMO',
                style: { icon: type === 'discount' ? 'percent' : 'gift', color: '#4f46e5' }
            });
            setTitle(''); setDesc('');
        };

        return (
            <Card className="border-indigo-100 shadow-md">
                <CardHeader className="bg-indigo-50/50 py-3 border-b border-indigo-100">
                    <CardTitle className="text-sm font-bold text-indigo-900">Nouvelle Offre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Input placeholder="Titre (ex: -20% sur l'addition)" value={title} onChange={e => setTitle(e.target.value)} />
                    <Input placeholder="Description courte" value={desc} onChange={e => setDesc(e.target.value)} className="text-xs" />
                    <div className="flex gap-2">
                        <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="text-xs" />
                        <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="text-xs" />
                    </div>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={!title}>Créer l'offre</Button>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 sm:px-6">
            
            {showCampaignModal && (
                <CampaignBuilder 
                    offer={selectedOfferForCampaign} 
                    onClose={() => setShowCampaignModal(false)} 
                    onSend={loadData} // Refresh potential logs
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-8 w-8 text-pink-600" />
                        Marketing & Fidélité
                    </h1>
                    <p className="text-slate-500 text-sm">Créez des offres et diffusez-les par SMS/Email.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { id: 'offers', label: 'Offres', icon: Tag },
                        { id: 'campaigns', label: 'Campagnes & Envois', icon: Megaphone },
                        { id: 'scanner', label: 'Scanner', icon: Scan },
                        { id: 'stats', label: 'Rapports', icon: BarChart3 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <tab.icon className="h-4 w-4" /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* OFFERS TAB */}
            {activeTab === 'offers' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filters */}
                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                <button onClick={() => setStatusFilter('active')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${statusFilter === 'active' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>Actives</button>
                                <button onClick={() => setStatusFilter('expired')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${statusFilter === 'expired' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>Terminées</button>
                            </div>
                        </div>

                        {filteredOffers.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <p className="text-slate-500 mb-2">Aucune offre trouvée.</p>
                                <p className="text-xs text-slate-400">Utilisez le formulaire à droite pour créer votre première offre.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredOffers.map(offer => {
                                    const status = getOfferStatus(offer);
                                    return (
                                        <Card key={offer.id} className="hover:shadow-md transition-shadow group flex flex-col h-full border-slate-200">
                                            <CardContent className="p-5 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${offer.style?.icon === 'percent' ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600'}`}>
                                                        {offer.style?.icon === 'percent' ? '%' : '🎁'}
                                                    </div>
                                                    <OfferStatusBadge status={status} />
                                                </div>
                                                
                                                <div className="mb-4 flex-1">
                                                    <h4 className="font-bold text-slate-900 mb-1">{offer.title}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2">{offer.description}</p>
                                                </div>

                                                <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-center text-xs mb-4">
                                                    <div>
                                                        <span className="text-slate-400 uppercase font-bold text-[10px] block">Distribués</span>
                                                        <span className="font-bold text-slate-700">{offer.stats.distributed}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 uppercase font-bold text-[10px] block">Utilisés</span>
                                                        <span className="font-bold text-green-600">{offer.stats.redeemed}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openCampaignBuilder(offer)}>
                                                        <Send className="h-3 w-3 mr-1" /> Diffuser
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="px-2 text-slate-400 hover:text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <CreateForm />
                        
                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" /> Conseil Pro
                            </h4>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Créez une offre "Café Offert" valable uniquement les mardis pour booster vos heures creuses. Diffusez-la par SMS le lundi soir.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-900">Historique des envois</h3>
                        <Button onClick={() => openCampaignBuilder(null)} icon={Megaphone} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Nouvelle Campagne Libre
                        </Button>
                    </div>
                    <CampaignHistory />
                </div>
            )}

            {/* SCANNER TAB */}
            {activeTab === 'scanner' && (
                <div className="animate-in fade-in">
                    <ScannerModule />
                </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Offres Actives</div>
                                <div className="text-2xl font-bold text-slate-900">{offers.filter(o => o.active).length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Coupons Validés</div>
                                <div className="text-2xl font-bold text-green-600">{offers.reduce((acc, o) => acc + o.stats.redeemed, 0)}</div>
                            </CardContent>
                        </Card>
                        {/* Example of simulated revenue, hidden if 0 or unavailable */}
                        {offers.some(o => o.stats.revenue_generated) && (
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">CA Généré (Est.)</div>
                                    <div className="text-2xl font-bold text-indigo-600">{offers.reduce((acc, o) => acc + (o.stats.revenue_generated || 0), 0)}€</div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Performance par Offre</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={offers}>
                                    <XAxis dataKey="title" fontSize={12} stroke="#888888" tickFormatter={(v) => v.substring(0, 10)} />
                                    <YAxis fontSize={12} stroke="#888888" />
                                    <Tooltip />
                                    <Bar dataKey="stats.distributed" name="Envoyés" fill="#e2e8f0" radius={[4,4,0,0]} />
                                    <Bar dataKey="stats.redeemed" name="Utilisés" fill="#4f46e5" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
