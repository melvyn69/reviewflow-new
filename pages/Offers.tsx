
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Offer } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast, Badge, Toggle } from '../components/ui';
import { Gift, Plus, Trash2, ScanLine, Ticket, Copy, CheckCircle2, XCircle, Percent, Coffee, ShoppingBag, Clock, Star, Camera, X, Zap, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const CouponPreview = ({ offer }: { offer: Partial<Offer> }) => {
    return (
        <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl overflow-hidden border-2 border-dashed border-slate-300">
            {/* Left/Right Cutouts */}
            <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 rounded-full"></div>
            <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 rounded-full"></div>
            
            <div className={`h-24 flex items-center justify-center`} style={{ backgroundColor: offer.style?.color || '#4f46e5' }}>
                <div className="bg-white/20 p-3 rounded-full">
                    {offer.style?.icon === 'coffee' ? <Coffee className="h-8 w-8 text-white" /> : 
                     offer.style?.icon === 'percent' ? <Percent className="h-8 w-8 text-white" /> :
                     <Gift className="h-8 w-8 text-white" />}
                </div>
            </div>
            <div className="p-6 text-center">
                <h3 className="font-bold text-xl text-slate-900 mb-2">{offer.title || 'Titre de l\'offre'}</h3>
                <p className="text-sm text-slate-500 mb-4">{offer.description || 'Description de la récompense...'}</p>
                
                <div className="bg-slate-100 p-3 rounded-lg font-mono text-lg font-bold tracking-widest text-slate-700 border border-slate-200 mb-4">
                    {offer.code_prefix || 'CODE'}-XXXX
                </div>
                
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> Valable {offer.expiry_days || 30} jours après l'avis
                </div>
            </div>
        </div>
    );
};

export const OffersPage = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeTab, setActiveTab] = useState<'manage' | 'scanner'>('manage');
    const [isCreating, setIsCreating] = useState(false);
    const [scanCode, setScanCode] = useState('');
    const [scanResult, setScanResult] = useState<{valid: boolean, reason?: string, discount?: string} | null>(null);
    const [scanning, setScanning] = useState(false);
    
    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [flashOn, setFlashOn] = useState(false);

    const toast = useToast();

    // Form State
    const [newOffer, setNewOffer] = useState<Partial<Offer>>({
        title: '',
        description: '',
        code_prefix: 'MERCI',
        trigger_rating: 5,
        expiry_days: 30,
        style: { color: '#4f46e5', icon: 'gift' }
    });

    useEffect(() => {
        loadOffers();
        return () => {
            stopCamera();
        };
    }, []);

    const loadOffers = async () => {
        const data = await api.offers.list();
        setOffers(data);
    };

    const handleCreate = async () => {
        if (!newOffer.title) return;
        await api.offers.create(newOffer);
        setIsCreating(false);
        loadOffers();
        toast.success("Offre créée avec succès !");
        setNewOffer({ title: '', description: '', code_prefix: 'MERCI', trigger_rating: 5, expiry_days: 30, style: { color: '#4f46e5', icon: 'gift' } });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer cette offre ?")) {
            await api.offers.delete(id);
            loadOffers();
        }
    };

    const handleVerifyCode = async (codeToVerify?: string) => {
        const code = codeToVerify || scanCode;
        if (!code) return;
        
        setScanning(true);
        // Simulate network delay
        if (showCamera) await new Promise(r => setTimeout(r, 500));
        
        const result = await api.offers.validate(code);
        setScanResult(result);
        setScanning(false);
        
        if (showCamera) {
            stopCamera();
            toast.success("Code détecté !");
        }
    };

    // --- CAMERA LOGIC ---
    const startCamera = async () => {
        setShowCamera(true);
        setScanResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            // Simulate detection after 2 seconds
            setTimeout(() => {
                if(showCamera) { // Check if still open
                    setScanCode("MERCI-X9Y2Z");
                    handleVerifyCode("MERCI-X9Y2Z");
                }
            }, 3000);
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("Impossible d'accéder à la caméra. Mode simulation activé.");
            // Fallback simulation
            setTimeout(() => {
                setScanCode("MERCI-SIMUL");
                handleVerifyCode("MERCI-SIMUL");
            }, 2000);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-8 w-8 text-pink-600" />
                        Offres & Fidélité
                    </h1>
                    <p className="text-slate-500">Récompensez vos meilleurs clients pour les faire revenir.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'manage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Ticket className="h-4 w-4" /> Mes Offres
                    </button>
                    <button 
                        onClick={() => setActiveTab('scanner')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'scanner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ScanLine className="h-4 w-4" /> Scanner
                    </button>
                </div>
            </div>

            {activeTab === 'manage' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Offres Actives</h3>
                            <Button size="sm" icon={Plus} onClick={() => setIsCreating(true)}>Créer une offre</Button>
                        </div>

                        {offers.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">Aucune récompense active.</p>
                                <p className="text-xs text-slate-400">Créez un coupon pour motiver les avis 5 étoiles.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {offers.map(offer => (
                                    <Card key={offer.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-5 flex items-center gap-4">
                                            <div className="h-16 w-16 rounded-lg flex items-center justify-center text-white text-2xl" style={{ backgroundColor: offer.style?.color }}>
                                                {offer.style?.icon === 'coffee' ? <Coffee /> : offer.style?.icon === 'percent' ? <Percent /> : <Gift />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{offer.title}</h4>
                                                        <p className="text-sm text-slate-500">{offer.description}</p>
                                                    </div>
                                                    <Badge variant={offer.active ? 'success' : 'neutral'}>{offer.active ? 'Active' : 'Pause'}</Badge>
                                                </div>
                                                <div className="flex gap-4 mt-3 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1"><Ticket className="h-3 w-3" /> {offer.stats.distributed} distribués</span>
                                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {offer.stats.redeemed} utilisés</span>
                                                    <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Min: {offer.trigger_rating}★</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(offer.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-50">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Creator / Preview */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit sticky top-6">
                        {isCreating ? (
                            <div className="space-y-4 animate-in slide-in-from-right">
                                <h3 className="font-bold text-slate-900 mb-4">Nouvelle Récompense</h3>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Titre (ex: Café Offert)</label>
                                    <Input value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                    <Input value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})} placeholder="Sur présentation de ce coupon..." />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Déclencheur (Note)</label>
                                        <Select value={newOffer.trigger_rating} onChange={e => setNewOffer({...newOffer, trigger_rating: parseInt(e.target.value)})}>
                                            <option value={5}>5 Étoiles (Top)</option>
                                            <option value={4}>4 Étoiles et +</option>
                                            <option value={1}>Tous les avis</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Validité (Jours)</label>
                                        <Input type="number" value={newOffer.expiry_days} onChange={e => setNewOffer({...newOffer, expiry_days: parseInt(e.target.value)})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Style</label>
                                    <div className="flex gap-2 mb-2">
                                        {['#4f46e5', '#ea580c', '#16a34a', '#db2777'].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setNewOffer({...newOffer, style: { ...newOffer.style!, color: c }})}
                                                className={`w-6 h-6 rounded-full border-2 ${newOffer.style?.color === c ? 'border-slate-900' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        {['gift', 'coffee', 'percent', 'shopping-bag'].map(i => (
                                            <button 
                                                key={i} 
                                                onClick={() => setNewOffer({...newOffer, style: { ...newOffer.style!, icon: i }})}
                                                className={`p-2 rounded border ${newOffer.style?.icon === i ? 'bg-slate-200 border-slate-400' : 'bg-white border-slate-200'}`}
                                            >
                                                {i === 'gift' && <Gift className="h-4 w-4" />}
                                                {i === 'coffee' && <Coffee className="h-4 w-4" />}
                                                {i === 'percent' && <Percent className="h-4 w-4" />}
                                                {i === 'shopping-bag' && <ShoppingBag className="h-4 w-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 text-center">Aperçu</p>
                                    <CouponPreview offer={newOffer} />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="ghost" className="flex-1" onClick={() => setIsCreating(false)}>Annuler</Button>
                                    <Button className="flex-1" onClick={handleCreate}>Publier</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500 text-sm mb-4">Sélectionnez une offre pour voir les détails ou en créer une nouvelle.</p>
                                <Button variant="outline" onClick={() => setIsCreating(true)}>Créer une offre</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'scanner' && (
                <div className="max-w-md mx-auto">
                    
                    {/* CAMERA OVERLAY (FULL SCREEN) */}
                    {showCamera && (
                        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center">
                            {/* Controls Bar */}
                            <div className="w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                                <button 
                                    onClick={() => setFlashOn(!flashOn)}
                                    className={`p-3 rounded-full ${flashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}
                                >
                                    <Zap className="h-6 w-6" fill={flashOn ? "currentColor" : "none"} />
                                </button>
                                <button 
                                    onClick={() => toast.info("Changement de caméra simulé")}
                                    className="p-3 rounded-full bg-white/20 text-white"
                                >
                                    <RotateCcw className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="relative flex-1 w-full bg-black flex items-center justify-center">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                                />
                                
                                {/* Scanning Frame */}
                                <div className="w-72 h-72 border-2 border-white/50 rounded-3xl relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                                    {/* Corners */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
                                    
                                    {/* Laser Animation */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                </div>
                            </div>

                            {/* Bottom Bar */}
                            <div className="w-full p-8 bg-black flex justify-center pb-safe">
                                <Button variant="secondary" onClick={stopCamera} className="rounded-full h-16 w-16 p-0 flex items-center justify-center bg-white hover:bg-slate-200">
                                    <X className="h-8 w-8 text-black" />
                                </Button>
                            </div>
                            
                            {/* CSS for Scan Animation */}
                            <style>{`
                                @keyframes scan {
                                    0% { top: 0%; opacity: 0; }
                                    10% { opacity: 1; }
                                    90% { opacity: 1; }
                                    100% { top: 100%; opacity: 0; }
                                }
                            `}</style>
                        </div>
                    )}

                    <Card className="shadow-xl border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 p-6 text-center">
                            <ScanLine className="h-12 w-12 text-white mx-auto mb-2 opacity-80" />
                            <h3 className="text-white font-bold text-lg">Scanner de Coupons</h3>
                            <p className="text-slate-400 text-sm">Vérifiez la validité d'un code client.</p>
                        </div>
                        <CardContent className="p-8">
                            <div className="space-y-6">
                                <Button 
                                    className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30" 
                                    onClick={startCamera}
                                    icon={Camera}
                                >
                                    Scanner avec la caméra
                                </Button>
                                
                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-slate-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase">Ou saisir manuellement</span>
                                    <div className="flex-grow border-t border-slate-200"></div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Code Coupon</label>
                                    <Input 
                                        placeholder="ex: MERCI-A1B2C" 
                                        className="text-center text-xl font-mono uppercase tracking-widest h-14" 
                                        value={scanCode}
                                        onChange={e => { setScanCode(e.target.value.toUpperCase()); setScanResult(null); }}
                                    />
                                </div>
                                <Button 
                                    size="lg" 
                                    variant="secondary"
                                    className="w-full" 
                                    onClick={() => handleVerifyCode()}
                                    isLoading={scanning}
                                    disabled={scanCode.length < 5}
                                >
                                    Vérifier le code
                                </Button>

                                {scanResult && (
                                    <div className={`p-4 rounded-xl border-2 flex items-start gap-4 animate-in zoom-in-95 ${scanResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className={`p-2 rounded-full shrink-0 ${scanResult.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {scanResult.valid ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${scanResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                                                {scanResult.valid ? 'Coupon Valide !' : 'Invalide'}
                                            </h4>
                                            <p className={`text-sm ${scanResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                                                {scanResult.valid ? scanResult.discount : scanResult.reason}
                                            </p>
                                            {scanResult.valid && (
                                                <Button size="xs" className="mt-2 bg-green-600 hover:bg-green-700 border-none">Marquer comme utilisé</Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
