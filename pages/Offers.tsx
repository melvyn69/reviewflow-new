import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Offer, CampaignLog, Customer } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, XCircle, Trash2, Tag, Loader2, Send, Users, BarChart3, Mail, Smartphone, RefreshCw, DollarSign, X, AlertTriangle, Link as LinkIcon, Wand2, Edit3, UserCheck, ArrowRight, History, Calendar, ExternalLink, QrCode, Camera, Flashlight, Clock, Check, AlertOctagon, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

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

// Simplified Offer Creation Form
const CreateOfferForm = ({ onCreate }: { onCreate: (o: any) => Promise<void> }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [offerType, setOfferType] = useState<'discount' | 'gift' | 'loyalty'>('discount');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [channel, setChannel] = useState<'email' | 'sms' | 'qr'>('email');
    const [target, setTarget] = useState('all');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title) return;
        setLoading(true);
        
        const iconMap = { discount: 'percent', gift: 'gift', loyalty: 'star' };
        const colorMap = { discount: '#f59e0b', gift: '#ec4899', loyalty: '#4f46e5' };

        const payload: any = {
            title,
            description: desc,
            code_prefix: title.substring(0, 3).toUpperCase() + Math.floor(Math.random()*100),
            active: true,
            validity_start: new Date(startDate).toISOString(),
            validity_end: endDate ? new Date(endDate).toISOString() : undefined,
            target_segment: target,
            preferred_channel: channel,
            style: { 
                color: colorMap[offerType], 
                icon: iconMap[offerType] 
            },
            stats: { distributed: 0, redeemed: 0 }
        };
        
        await onCreate(payload);
        setLoading(false);
        // Reset basic fields
        setTitle('');
        setDesc('');
    };

    return (
        <Card className="border-indigo-100 shadow-md">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-50 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                    <Plus className="h-4 w-4" /> Nouvelle Offre
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">1. Informations</label>
                    <Input placeholder="Titre (ex: -20% Menu)" value={title} onChange={e => setTitle(e.target.value)} className="mb-2" />
                    <Input placeholder="Description courte..." value={desc} onChange={e => setDesc(e.target.value)} className="text-xs" />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">2. Type & Validité</label>
                    <div className="flex gap-2 mb-2">
                        {['discount', 'gift', 'loyalty'].map((t: any) => (
                            <button key={t} onClick={() => setOfferType(t)} className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded border ${offerType === t ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200'}`}>
                                {t === 'discount' ? 'Réduction' : t === 'gift' ? 'Cadeau' : 'Fidélité'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs" />
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs" placeholder="Fin (optionnel)" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">3. Cible & Canal</label>
                    <Select value={target} onChange={e => setTarget(e.target.value)} className="mb-2 text-xs">
                        <option value="all">Tous les clients</option>
                        <option value="vip">Ambassadeurs (VIP)</option>
                        <option value="risk">À reconquérir (Inactifs)</option>
                        <option value="manual">Liste Manuelle</option>
                    </Select>
                    <div className="flex gap-2">
                        {['email', 'sms', 'qr'].map((c: any) => (
                            <button key={c} onClick={() => setChannel(c)} className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded border ${channel === c ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit} isLoading={loading} disabled={!title}>
                    Créer et Activer
                </Button>
            </CardContent>
        </Card>
    );
};

// Advanced Scanner
const ScannerModule = () => {
    const [scannedCode, setScannedCode] = useState('');
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const toast = useToast();

    useEffect(() => {
        return () => {
            if (scannerRef.current && cameraActive) {
                stopScanner();
            }
        };
    }, [cameraActive]);

    const startScanner = async () => {
        try {
            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;
            
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    handleCodeScanned(decodedText);
                },
                () => {} // Ignore frame errors
            );
            setCameraActive(true);
        } catch (err) {
            console.error(err);
            toast.error("Impossible d'accéder à la caméra");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setCameraActive(false);
                setFlashOn(false);
            } catch (err) {
                console.error("Stop failed", err);
            }
        }
    };

    const toggleFlash = async () => {
        if (scannerRef.current && cameraActive) {
            try {
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ torch: !flashOn }]
                } as any);
                setFlashOn(!flashOn);
            } catch (err) {
                toast.error("Flash non supporté par cet appareil");
            }
        }
    };

    const handleCodeScanned = async (code: string) => {
        // Debounce or pause scanning on success
        if (scanning) return;
        setScanning(true);
        
        // Optional: play beep sound
        
        try {
            const res = await api.offers.validate(code);
            setScanResult(res);
            if (cameraActive) await stopScanner(); // Stop camera on success to show result
        } catch (e) {
            toast.error("Erreur de validation");
        } finally {
            setScanning(false);
        }
    };

    const handleRedeem = async () => {
        if (!scanResult?.coupon?.code) return;
        setScanning(true);
        try {
            await api.offers.redeem(scanResult.coupon.code);
            toast.success("Offre validée !");
            setScanResult(prev => ({ ...prev, redeemed_now: true }));
        } catch (e) {
            toast.error("Erreur validation");
        } finally {
            setScanning(false);
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setScannedCode('');
        // Option to restart camera automatically
    };

    return (
        <div className="max-w-md mx-auto">
            {!scanResult ? (
                <Card className="border-indigo-200 shadow-lg overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white py-4">
                        <CardTitle className="flex justify-between items-center">
                            <span className="flex items-center gap-2"><Scan className="h-5 w-5"/> Scanner QR</span>
                            {cameraActive && (
                                <button onClick={toggleFlash} className={`p-2 rounded-full ${flashOn ? 'bg-yellow-400 text-black' : 'bg-slate-700 text-white'}`}>
                                    <Flashlight className="h-4 w-4" />
                                </button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <div className="bg-black min-h-[300px] relative flex flex-col items-center justify-center">
                        <div id="reader" className="w-full"></div>
                        {!cameraActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
                                <Button onClick={startScanner} size="lg" className="rounded-full h-16 w-16 bg-indigo-600 hover:bg-indigo-500 shadow-xl border-4 border-indigo-400">
                                    <Camera className="h-8 w-8" />
                                </Button>
                            </div>
                        )}
                        {cameraActive && (
                            <div className="absolute bottom-4 z-20">
                                <Button variant="secondary" size="sm" onClick={stopScanner} className="bg-white/90">Fermer Caméra</Button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Code manuel (ex: GIFT-123)" 
                                value={scannedCode} 
                                onChange={e => setScannedCode(e.target.value.toUpperCase())}
                                className="font-mono text-center uppercase"
                            />
                            <Button onClick={() => handleCodeScanned(scannedCode)} disabled={!scannedCode}>OK</Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className={`border-l-4 shadow-xl animate-in zoom-in-95 ${scanResult.valid ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-6 text-center">
                        {scanResult.valid ? (
                            <>
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-700 mb-1">Offre Valide !</h2>
                                <p className="text-lg font-medium text-slate-900">{scanResult.discount}</p>
                                
                                <div className="bg-slate-50 rounded-lg p-4 mt-6 text-left space-y-2 border border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Offre :</span>
                                        <span className="font-medium">{scanResult.coupon.offer_title}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Client :</span>
                                        <span className="font-medium">{scanResult.coupon.customer_email || 'Anonyme'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Validité :</span>
                                        <span className="font-medium text-green-600">Jusqu'au {new Date(scanResult.coupon.expires_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {!scanResult.redeemed_now ? (
                                    <Button onClick={handleRedeem} className="w-full mt-6 bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg" isLoading={scanning}>
                                        Confirmer l'utilisation
                                    </Button>
                                ) : (
                                    <div className="mt-6 bg-green-50 text-green-800 p-3 rounded-lg font-bold border border-green-200">
                                        Coupon consommé à l'instant ✅
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertOctagon className="h-10 w-10 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-red-700 mb-2">Code Invalide</h2>
                                <p className="text-slate-600 mb-6">{scanResult.reason}</p>
                            </>
                        )}
                        
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <Button variant="ghost" onClick={resetScan} className="w-full">Scanner un autre code</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export const OffersPage = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeTab, setActiveTab] = useState<'offers' | 'scanner' | 'stats'>('offers');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('active');
    const [loading, setLoading] = useState(true);
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

    const filteredOffers = offers.filter(o => {
        if (statusFilter === 'all') return true;
        const status = getOfferStatus(o);
        if (statusFilter === 'active') return status === 'active' || status === 'upcoming' || status === 'paused'; // Show all non-expired
        return status === statusFilter;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 sm:px-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-8 w-8 text-pink-600" />
                        Offres & Fidélité
                    </h1>
                    <p className="text-slate-500 text-sm">Pilotez vos campagnes et récompensez vos clients.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { id: 'offers', label: 'Offres', icon: Tag },
                        { id: 'scanner', label: 'Scanner', icon: Scan },
                        { id: 'stats', label: 'Stats', icon: BarChart3 }
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
                    {/* Left: Offers Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filters */}
                        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'active', label: 'Actives' },
                                { id: 'expired', label: 'Expirées' },
                                { id: 'all', label: 'Tout' }
                            ].map(f => (
                                <button 
                                    key={f.id}
                                    onClick={() => setStatusFilter(f.id as any)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${statusFilter === f.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filteredOffers.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <p className="text-slate-500 mb-2">Aucune offre trouvée.</p>
                                <p className="text-xs text-slate-400">Créez votre première campagne à droite.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredOffers.map(offer => {
                                    const status = getOfferStatus(offer);
                                    const usage = offer.stats.distributed > 0 ? Math.round((offer.stats.redeemed / offer.stats.distributed) * 100) : 0;
                                    return (
                                        <Card key={offer.id} className="hover:shadow-md transition-shadow group">
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
                                                        <span className={`font-bold ${usage > 20 ? 'text-green-600' : 'text-slate-700'}`}>{offer.stats.redeemed} ({usage}%)</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t pt-3 mt-auto">
                                                    <span>{offer.validity_end ? `Fin le ${new Date(offer.validity_end).toLocaleDateString()}` : 'Durée illimitée'}</span>
                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{offer.code_prefix}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Create Form */}
                    <div className="lg:col-span-1">
                        <CreateOfferForm onCreate={handleCreateOffer} />
                    </div>
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
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Coupons utilisés</div>
                                <div className="text-2xl font-bold text-green-600">{offers.reduce((acc, o) => acc + o.stats.redeemed, 0)}</div>
                            </CardContent>
                        </Card>
                        {/* Hidden Revenue logic per user request if 0 */}
                        {offers.some(o => o.stats.revenue_generated) && (
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">CA Estimé</div>
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
                                    <Bar dataKey="stats.distributed" name="Distribués" fill="#e2e8f0" radius={[4,4,0,0]} />
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