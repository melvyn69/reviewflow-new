
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Competitor, Organization } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, useToast, Input } from '../components/ui';
import { 
    Search, 
    MapPin, 
    TrendingUp, 
    AlertTriangle, 
    Plus, 
    Loader2, 
    Trash2, 
    Target, 
    Radar, 
    CheckCircle2,
    BarChart3,
    Download,
    Lightbulb,
    Shield,
    Lock
} from 'lucide-react';
import { useNavigate } from '../components/ui';

export const CompetitorsPage = () => {
    const [trackedCompetitors, setTrackedCompetitors] = useState<Competitor[]>([]);
    const [scannedResults, setScannedResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'tracked' | 'scan' | 'insights'>('tracked');
    const [loading, setLoading] = useState(false);
    const [marketData, setMarketData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    
    // Scan settings
    const [scanRadius, setScanRadius] = useState(5);
    const [scanSector, setScanSector] = useState('');
    const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'found' | 'error'>('idle');
    
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            const organization = await api.organization.get();
            setOrg(organization);
            if (organization?.subscription_plan === 'pro') {
                loadTracked();
            }
        };
        init();
    }, []);

    const loadTracked = async () => {
        setLoading(true);
        const data = await api.competitors.list();
        setTrackedCompetitors(data);
        setLoading(false);
    };

    const handleScan = async () => {
        setLoading(true);
        setLocationStatus('locating');
        setScannedResults([]);
        
        try {
            // 1. Get Real Geolocation from Browser
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("La géolocalisation n'est pas supportée par votre navigateur."));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            const { latitude, longitude } = position.coords;
            setLocationStatus('found');

            // 2. Call the Real Edge Function via API
            // This now hits 'fetch_places' on Supabase
            const results = await api.competitors.autoDiscover(scanRadius, scanSector, latitude, longitude);
            
            setScannedResults(results);
            setActiveTab('scan');
            
            if (results.length > 0) {
                toast.success(`${results.length} concurrents détectés dans la zone.`);
            } else {
                toast.info("Aucun concurrent trouvé avec ces critères.");
            }
        } catch (e: any) {
            setLocationStatus('error');
            if (e.code === 1) { // PERMISSION_DENIED
                toast.error("Veuillez autoriser la géolocalisation pour scanner votre zone.");
            } else {
                console.error(e);
                toast.error(e.message || "Erreur lors du scan.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTrack = async (competitor: any) => {
        await api.competitors.create({
            name: competitor.name,
            rating: competitor.rating,
            review_count: competitor.review_count,
            address: competitor.address,
            strengths: competitor.strengths,
            weaknesses: competitor.weaknesses
        });
        toast.success(`${competitor.name} ajouté à votre veille.`);
        // Remove from scanned list visually
        setScannedResults(prev => prev.filter(c => c.name !== competitor.name));
        loadTracked();
    };

    const handleDelete = async (id: string) => {
        if(confirm('Arrêter de suivre ce concurrent ?')) {
            await api.competitors.delete(id);
            loadTracked();
            toast.success("Concurrent supprimé.");
        }
    };

    const loadInsights = async () => {
        setLoadingInsights(true);
        try {
            const data = await api.competitors.getDeepAnalysis();
            setMarketData(data);
        } catch (e: any) {
            toast.error("Erreur lors de l'analyse : " + e.message);
        } finally {
            setLoadingInsights(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'insights' && !marketData && org?.subscription_plan === 'pro') {
            loadInsights();
        }
    }, [activeTab]);

    if (!org) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

    // PAYWALL - PRO (GROWTH) PLAN ONLY
    if (org.subscription_plan === 'free' || org.subscription_plan === 'starter') {
        return (
            <div className="max-w-5xl mx-auto mt-12 relative overflow-hidden rounded-2xl border border-slate-200 shadow-xl bg-white">
                <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-white p-4 rounded-full shadow-lg mb-6">
                        <Lock className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Fonctionnalité Growth</h2>
                    <p className="text-slate-600 max-w-lg mb-8 text-lg">
                        La veille concurrentielle et l'analyse de marché par IA sont réservées aux membres du plan Growth.
                        Espionnez vos concurrents légalement et récupérez leurs clients déçus.
                    </p>
                    <Button size="lg" className="shadow-xl shadow-indigo-200" onClick={() => navigate('/billing')}>
                        Passer au plan Growth
                    </Button>
                </div>
                
                {/* Blurred Background Content Preview */}
                <div className="p-8 filter blur-sm pointer-events-none opacity-50">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold">Veille Concurrentielle</h1>
                        <div className="flex gap-2">
                            <Button variant="outline">Ma Sélection</Button>
                            <Button>Radar</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        {[1,2,3].map(i => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <div className="h-4 w-1/3 bg-slate-200 rounded mb-4"></div>
                                    <div className="h-3 w-2/3 bg-slate-100 rounded mb-2"></div>
                                    <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="h-8 w-8 text-red-600" />
                        Veille Concurrentielle
                    </h1>
                    <p className="text-slate-500">Surveillez votre marché et anticipez les mouvements adverses.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('tracked')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'tracked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Ma Sélection
                    </button>
                    <button 
                        onClick={() => setActiveTab('scan')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Radar className="h-4 w-4" /> Radar
                    </button>
                    <button 
                        onClick={() => setActiveTab('insights')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="h-4 w-4" /> Analyse SWOT
                    </button>
                </div>
            </div>

            {/* INSIGHTS / SWOT SECTION */}
            {activeTab === 'insights' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {loadingInsights ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">Analyse du marché en cours...</h3>
                            <p className="text-slate-500">L'IA examine les avis de vos concurrents pour identifier les tendances.</p>
                        </div>
                    ) : marketData ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* TRENDS */}
                                <Card className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-yellow-400" />
                                            Tendances Clés
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {marketData.trends?.map((trend: string, i: number) => (
                                                <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                                                    <span className="text-yellow-400 font-bold">•</span>
                                                    {trend}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-8 pt-6 border-t border-slate-700">
                                            <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20" icon={Download}>
                                                Télécharger le Rapport Complet
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* SWOT MATRIX */}
                                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Forces */}
                                    <Card className="bg-green-50 border-green-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-green-800 flex items-center gap-2 text-base">
                                                <CheckCircle2 className="h-5 w-5" /> Forces du Marché
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {marketData.swot?.strengths?.map((item: string, i: number) => (
                                                    <li key={i} className="text-sm text-green-700 flex gap-2">
                                                        <span className="font-bold">+</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>

                                    {/* Faiblesses */}
                                    <Card className="bg-red-50 border-red-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-red-800 flex items-center gap-2 text-base">
                                                <AlertTriangle className="h-5 w-5" /> Faiblesses (Opportunités)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {marketData.swot?.weaknesses?.map((item: string, i: number) => (
                                                    <li key={i} className="text-sm text-red-700 flex gap-2">
                                                        <span className="font-bold">-</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>

                                    {/* Opportunités */}
                                    <Card className="bg-blue-50 border-blue-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
                                                <Lightbulb className="h-5 w-5" /> Opportunités Stratégiques
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {marketData.swot?.opportunities?.map((item: string, i: number) => (
                                                    <li key={i} className="text-sm text-blue-700 flex gap-2">
                                                        <span className="font-bold">→</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>

                                    {/* Menaces */}
                                    <Card className="bg-amber-50 border-amber-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                                                <Shield className="h-5 w-5" /> Menaces & Risques
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {marketData.swot?.threats?.map((item: string, i: number) => (
                                                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                                                        <span className="font-bold">!</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Détail par Concurrent</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {marketData.competitors_detailed?.map((comp: any, i: number) => (
                                    <Card key={i}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-900">{comp.name}</h4>
                                                <Badge variant={comp.sentiment_trend === 'Positif' ? 'success' : 'neutral'}>
                                                    Tendance: {comp.sentiment_trend}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-indigo-500" />
                                                Croissance: <span className="font-semibold text-indigo-600">{comp.last_month_growth}</span>
                                            </p>
                                            <div className="text-xs space-y-1">
                                                <p className="text-red-600 font-medium">Plainte fréquente: {comp.top_complaint}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Impossible de charger les données.</p>
                            <Button onClick={loadInsights} variant="outline" className="mt-4">Réessayer</Button>
                        </div>
                    )}
                </div>
            )}

            {/* SCANNER SECTION */}
            {activeTab === 'scan' && (
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Secteur d'activité (ex: Pizzeria)</label>
                                    <Input 
                                        placeholder="Mot-clé (facultatif)" 
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                        value={scanSector}
                                        onChange={e => setScanSector(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-48">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Rayon de recherche</label>
                                    <select 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg text-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                                        value={scanRadius}
                                        onChange={e => setScanRadius(parseInt(e.target.value))}
                                    >
                                        <option value={2}>2 km (Quartier)</option>
                                        <option value={5}>5 km (Ville)</option>
                                        <option value={10}>10 km (Agglo)</option>
                                        <option value={50}>50 km (Région)</option>
                                    </select>
                                </div>
                                <Button 
                                    size="lg" 
                                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 border-none shadow-lg shadow-indigo-900/50"
                                    onClick={handleScan}
                                    isLoading={loading}
                                    disabled={locationStatus === 'locating'}
                                    icon={Radar}
                                >
                                    {locationStatus === 'locating' ? 'Géolocalisation...' : 'Scanner ma zone'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {scannedResults.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                            {scannedResults.map((result, i) => (
                                <Card key={i} className="hover:shadow-lg transition-shadow border-slate-200">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">{result.name}</h3>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {result.address || 'Proche'}
                                                </p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${result.threat_level > 80 ? 'bg-red-100 text-red-700' : result.threat_level > 50 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                Menace: {result.threat_level}%
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mb-4 text-sm">
                                            <div>
                                                <div className="text-slate-400 text-xs">Note</div>
                                                <div className="font-bold text-slate-900">{result.rating} ★</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-400 text-xs">Volume</div>
                                                <div className="font-bold text-slate-900">{result.review_count} avis</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <div className="text-xs font-semibold text-green-700 bg-green-50 p-2 rounded">
                                                👍 {result.strengths[0]}
                                            </div>
                                            <div className="text-xs font-semibold text-red-700 bg-red-50 p-2 rounded">
                                                👎 {result.weaknesses[0]}
                                            </div>
                                        </div>

                                        <Button className="w-full" variant="outline" icon={Plus} onClick={() => handleTrack(result)}>
                                            Suivre ce concurrent
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TRACKED LIST SECTION */}
            {activeTab === 'tracked' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Concurrents Surveillés</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {trackedCompetitors.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun concurrent suivi</h3>
                                <p className="text-slate-500 mb-6">Utilisez le Radar de Zone pour détecter vos concurrents automatiquement.</p>
                                <Button onClick={() => setActiveTab('scan')} icon={Radar}>Lancer un Scan</Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nom</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Note</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Volume</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Forces</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Faiblesses</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {trackedCompetitors.map((comp) => (
                                            <tr key={comp.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{comp.name}</div>
                                                    <div className="text-xs text-slate-500">{comp.address}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={comp.rating >= 4.5 ? 'success' : comp.rating >= 4 ? 'default' : 'warning'}>
                                                        {comp.rating} ★
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {comp.review_count} avis
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {comp.strengths.slice(0, 2).map(s => (
                                                            <span key={s} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">{s}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {comp.weaknesses.slice(0, 2).map(s => (
                                                            <span key={s} className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">{s}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDelete(comp.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
