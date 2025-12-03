
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Location, SavedReply, BrandSettings, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Toggle, useToast, Badge } from '../components/ui';
import { Terminal, Building2, Plus, UploadCloud, X, Sparkles, Download, Database, Users, Mail, Bell, Instagram, Facebook, Trash2, CheckCircle2, Loader2, ArrowRight, AlertCircle, RefreshCw, Send, Edit, Link, Play, MessageSquare, User as UserIcon, Lock, AlertTriangle, Square, CheckSquare, Info, ShieldCheck, Check } from 'lucide-react';

// --- GOOGLE CONNECT WIZARD COMPONENT ---
const GoogleConnectWizard = ({ onClose, onConnect }: { onClose: () => void, onConnect: () => void }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    // Mock list of locations returned by Google API
    const [locations, setLocations] = useState<{id: string, name: string, address: string}[]>([
        { id: 'loc_g_1', name: 'Le Bistrot Gourmand', address: '12 Rue de la République, Lyon' },
        { id: 'loc_g_2', name: 'Bistrot Express', address: 'Centre Commercial Part-Dieu, Lyon' },
        { id: 'loc_g_3', name: 'Garage Auto Plus', address: 'Zone Industrielle Nord, Paris' }
    ]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const toast = useToast();

    const handleAuth = async () => {
        setLoading(true);
        try {
            // Lancement du vrai flux OAuth Google Business
            await api.auth.connectGoogleBusiness();
        } catch (e: any) {
            console.error(e);
            toast.error("Erreur de connexion Google : " + e.message);
            setLoading(false);
        }
    };

    const toggleLocation = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSync = async () => {
        if(selectedIds.length === 0) return;
        setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // On simule la création des locations dans la DB locale
            for (const id of selectedIds) {
                const gLoc = locations.find(l => l.id === id);
                if (gLoc) {
                    await api.locations.create({
                        name: gLoc.name,
                        address: gLoc.address,
                        city: gLoc.address.split(',')[1]?.trim() || 'Ville inconnue',
                        country: 'France',
                        google_review_url: `https://search.google.com/local/writereview?placeid=${id}`
                    });
                }
            }
            
            setLoading(false);
            setStep(3);
        } catch (e) {
            toast.error("Erreur lors de la synchronisation");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
                <div className="bg-white p-2 flex justify-end">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <CardContent className="p-8 pt-2">
                    {step === 1 && (
                        <div className="text-center space-y-8">
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                                <div className="relative bg-white rounded-full p-4 shadow-lg border border-slate-100 flex items-center justify-center h-full w-full">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-10 w-10" alt="G" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 border-4 border-white shadow-sm">
                                    <RefreshCw className="h-4 w-4" />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Connecter Google Business</h3>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                                    Importez vos établissements, synchronisez vos avis en temps réel et répondez directement depuis Reviewflow.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Synchronisation des avis 24/7</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Réponses publiées instantanément</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>
                                    <span className="text-sm text-slate-700 font-medium">Import historique illimité</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleAuth}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all py-3.5 px-6 rounded-xl font-roboto font-medium text-base shadow-sm relative overflow-hidden group"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                                ) : (
                                    <>
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="h-5 w-5" alt="G" />
                                        <span>Continuer avec Google</span>
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-slate-400">En continuant, vous acceptez d'accorder les permissions de gestion.</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900">Établissements détectés</h3>
                                <p className="text-sm text-slate-500 mt-1">Sélectionnez les fiches à importer.</p>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {locations.map(loc => {
                                    const isSelected = selectedIds.includes(loc.id);
                                    return (
                                        <div 
                                            key={loc.id}
                                            onClick={() => toggleLocation(loc.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 group ${isSelected ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-sm' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'}`}
                                        >
                                            <div className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                                                {isSelected && <Check className="h-4 w-4 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-slate-900 truncate">{loc.name}</div>
                                                <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                    <Building2 className="h-3 w-3" />
                                                    {loc.address}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                                <Button size="lg" className="w-full shadow-lg shadow-indigo-200" disabled={selectedIds.length === 0} onClick={handleSync} isLoading={loading}>
                                    Importer {selectedIds.length > 0 ? `${selectedIds.length} fiche(s)` : ''}
                                </Button>
                                <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Retour</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-8 animate-in zoom-in-95">
                            <div className="relative mx-auto w-24 h-24">
                                <svg className="w-full h-full text-green-500" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="283" strokeDashoffset="0" className="animate-[dash_1s_ease-out_forwards]" />
                                    <path d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="animate-[check_0.5s_ease-out_0.5s_forwards] opacity-0" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">C'est tout bon !</h3>
                                <p className="text-slate-600 mt-2 max-w-xs mx-auto">
                                    Vos avis sont en cours d'importation. Vous pouvez commencer à configurer vos réponses automatiques.
                                </p>
                            </div>
                            <Button size="lg" className="w-full" onClick={onConnect}>
                                Accéder à mes avis
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <style>{`
                @keyframes dash { from { stroke-dashoffset: 283; } to { stroke-dashoffset: 0; } }
                @keyframes check { from { opacity: 0; stroke-dasharray: 0, 100; } to { opacity: 1; stroke-dasharray: 100, 0; } }
            `}</style>
        </div>
    );
};

export const SettingsPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('integrations'); // Default to integrations to show Google Button
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  //