import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Offer, Coupon } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge } from '../components/ui';
import { Gift, Plus, Scan, CheckCircle2, XCircle, Trash2, Tag, Loader2 } from 'lucide-react';

export const OffersPage = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'manage' | 'scan'>('manage');
    
    // Manage State
    const [newOfferTitle, setNewOfferTitle] = useState('');
    const [newOfferDesc, setNewOfferDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Scan State
    const [scanCode, setScanCode] = useState('');
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanning, setScanning] = useState(false);

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

    const handleCreateOffer = async () => {
        if (!newOfferTitle) return;
        setCreating(true);
        // Mock create
        setTimeout(() => {
            const newOffer: Offer = {
                id: Date.now().toString(),
                title: newOfferTitle,
                description: newOfferDesc,
                code_prefix: 'PROMO',
                trigger_rating: 5,
                active: true,
                expiry_days: 30,
                stats: { distributed: 0, redeemed: 0 }
            };
            setOffers([...offers, newOffer]);
            setNewOfferTitle('');
            setNewOfferDesc('');
            setCreating(false);
            toast.success("Offre créée !");
        }, 500);
    };

    const handleVerifyCode = async () => {
        if (!scanCode) return;
        setScanning(true);
        try {
            const result = await api.offers.validate(scanCode);
            setScanResult(result);
        } catch (e) {
            toast.error("Code invalide");
            setScanResult({ valid: false, reason: "Erreur technique" });
        } finally {
            setScanning(false);
        }
    };

    const handleRedeem = async () => {
        if (!scanCode) return;
        setScanning(true);
        try {
            await api.offers.redeem(scanCode);
            toast.success("Coupon consommé !");
            setScanResult(null);
            setScanCode('');
        } catch (e) {
            toast.error("Erreur validation");
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-8 w-8 text-pink-600" />
                        Offres & Fidélité
                    </h1>
                    <p className="text-slate-500">Récompensez vos meilleurs clients.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'manage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Gérer
                    </button>
                    <button 
                        onClick={() => setActiveTab('scan')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Scanner
                    </button>
                </div>
            </div>

            {activeTab === 'manage' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Créer une offre (Win-back)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input placeholder="Titre (ex: Café Offert)" value={newOfferTitle} onChange={e => setNewOfferTitle(e.target.value)} />
                                <Input placeholder="Détails (ex: Pour tout repas...)" value={newOfferDesc} onChange={e => setNewOfferDesc(e.target.value)} />
                            </div>
                            <Button icon={Plus} onClick={handleCreateOffer} isLoading={creating} disabled={!newOfferTitle}>Créer l'offre</Button>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        {offers.map(offer => (
                            <div key={offer.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center">
                                        <Gift className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{offer.title}</h4>
                                        <p className="text-sm text-slate-500">{offer.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-slate-900">{offer.stats.distributed}</div>
                                        <div className="text-[10px] uppercase text-slate-400">Envoyés</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">{offer.stats.redeemed}</div>
                                        <div className="text-[10px] uppercase text-slate-400">Utilisés</div>
                                    </div>
                                    <Badge variant={offer.active ? 'success' : 'neutral'}>{offer.active ? 'Active' : 'Pause'}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'scan' && (
                <div className="max-w-md mx-auto">
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
                                    value={scanCode}
                                    onChange={e => setScanCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            
                            <Button 
                                size="lg" 
                                className="w-full" 
                                onClick={handleVerifyCode} 
                                isLoading={scanning}
                                disabled={!scanCode}
                            >
                                Vérifier
                            </Button>

                            {scanResult && (
                                <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center gap-2 animate-in zoom-in-95 ${scanResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    {scanResult.valid ? (
                                        <>
                                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                                            <h3 className="font-bold text-green-800 text-xl">Valide !</h3>
                                            <p className="text-green-700 font-medium">{scanResult.discount}</p>
                                            <Button className="w-full mt-2 bg-green-600 hover:bg-green-700 border-none" onClick={handleRedeem}>
                                                Valider l'utilisation
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-12 w-12 text-red-600" />
                                            <h3 className="font-bold text-red-800 text-xl">Invalide</h3>
                                            <p className="text-red-700">{scanResult.reason}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};