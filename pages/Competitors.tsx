import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Competitor, Organization, MarketReport } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, useToast, Input, ProLock } from '../components/ui';
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
    ArrowRight,
    History,
    FileText,
    Play,
    Zap,
    ExternalLink,
    Rocket,
    Globe,
    Navigation,
    LocateFixed,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { useNavigate } from '../components/ui';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

// --- SONAR RADAR COMPONENT ---
const SonarRadar = ({ competitors, industry, className = "" }: { competitors: any[], industry: string, className?: string }) => {
    // Calculate aggregate metrics for the 4 axes
    const avgRating = competitors.length ? competitors.reduce((acc, c) => acc + (c.rating || 0), 0) / competitors.length : 0;
    const avgVolume = competitors.length ? competitors.reduce((acc, c) => acc + (c.review_count || 0), 0) / competitors.length : 0;
    
    // Normalize metrics 0-100 for the chart
    const axes = [
        { label: 'Qualité', value: (avgRating / 5) * 100, angle: 0 },
        { label: 'Volume', value: Math.min((avgVolume / 500) * 100, 100), angle: 90 },
        { label: 'Récent', value: Math.min((avgVolume / 100) * 80, 95), angle: 180 }, 
        { label: 'Proximité', value: 65, angle: 270 } 
    ];

    const radius = 120;
    const center = 150;

    const getCoordinates = (value: number, angle: number) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return {
            x: center + (radius * (value / 100)) * Math.cos(rad),
            y: center + (radius * (value / 100)) * Math.sin(rad)
        };
    };

    const polygonPoints = axes.map(axis => {
        const coords = getCoordinates(axis.value, axis.angle);
        return `${coords.x},${coords.y}`;
    }).join(' ');

    return (
        <div className={`relative w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800 flex flex-col items-center justify-center font-mono ${className}`}>
            {/* Grid Overlay */}
            <div className="absolute inset-0" style={{ 
                backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.05) 1px, transparent 1px)', 
                backgroundSize: '20px 20px'
            }}></div>

            {/* Radar Scan Animation */}
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/20"></div>
            <div className="absolute top-1/2 left-1/2 w-[250px] h-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/30"></div>
            <div className="absolute top-1/2 left-1/2 w-[100px] h-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/40"></div>
            
            {/* The Sweeping Line */}
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none origin-center animate-[spin_4s_linear_infinite]"
                 style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(99, 102, 241, 0.2) 360deg)' }}>
            </div>

            {/* SVG Chart */}
            <svg width="300" height="300" className="relative z-10 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                {/* Axes Lines */}
                {axes.map((axis, i) => {
                    const end = getCoordinates(100, axis.angle);
                    return (
                        <g key={i}>
                            <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1" />
                            <text x={end.x} y={end.y} 
                                  dx={axis.angle === 90 ? 10 : axis.angle === 270 ? -80 : -40} 
                                  dy={axis.angle === 0 ? -10 : axis.angle === 180 ? 20 : 5}
                                  fill="#818cf8" fontSize="10" fontWeight="bold" textAnchor="start">
                                {axis.label.toUpperCase()}
                            </text>
                        </g>
                    );
                })}

                {/* Data Polygon */}
                <polygon points={polygonPoints} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
                
                {/* Data Points */}
                {axes.map((axis, i) => {
                    const coords = getCoordinates(axis.value, axis.angle);
                    return <circle key={i} cx={coords.x} cy={coords.y} r="3" fill="#e0e7ff" className="animate-pulse" />;
                })}
            </svg>

            {/* Info Overlay */}
            <div className="absolute top-4 left-4 text-indigo-400 text-xs">
                <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    ZONE SCAN: {industry.toUpperCase()}
                </div>
            </div>
            
            <div className="absolute bottom-4 right-4 text-indigo-500 text-[10px] font-mono text-right">
                SOURCES: {competitors.length} <br/>
                STATUS: ACTIF
            </div>
        </div>
    );
};

export const CompetitorsPage = () => {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [scannedResults, setScannedResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [marketData, setMarketData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    
    // Scan State
    const [scanRadius, setScanRadius] = useState(5);
    const [scanMessage, setScanMessage] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    
    const toast = useToast();
    const navigate = useNavigate();
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setInitialLoading(true);
        try {
            const organization = await api.organization.get();
            setOrg(organization);
            if (organization?.subscription_plan === 'pro') {
                const data = await api.competitors.list();
                setCompetitors(data || []);
                
                // Load cached report if any
                const reports = await api.competitors.getReports();
                if (reports.length > 0) setMarketData(reports[0].data);
            }
        } catch (e) {
            console.error("Failed to load org", e);
        } finally {
            setInitialLoading(false);
        }
    };

    const runFullScan = async () => {
        if (!org) return;
        setLoading(true);
        setScanMessage('Initialisation du satellite...');
        
        try {
            // Step 1: Geolocate
            setScanMessage('Géolocalisation précise...');
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("Géolocalisation non supportée"));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;

            // Step 2: Fetch Places
            setScanMessage(`Scanning rayon ${scanRadius}km...`);
            const industryKeyword = org.industry || 'Commerce';
            const results = await api.competitors.autoDiscover(scanRadius, industryKeyword, latitude, longitude);
            
            // Step 3: Analyze
            setScanMessage('Analyse des données concurrentielles...');
            await new Promise(r => setTimeout(r, 1000)); // Fake processing time for UX

            setScannedResults(results || []);
            setShowScanner(true); // Show results modal/section
            
            if (results && results.length > 0) {
                toast.success(`${results.length} concurrents détectés avec succès.`);
            } else {
                toast.info("Aucun concurrent trouvé dans cette zone.");
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur lors du scan.");
        } finally {
            setLoading(false);
            setScanMessage('');
        }
    };

    const handleAddCompetitor = async (comp: any) => {
        await api.competitors.create({
            name: comp.name,
            rating: comp.rating,
            review_count: comp.review_count,
            address: comp.address,
            strengths: comp.strengths,
            weaknesses: comp.weaknesses,
            url: comp.url,
            distance: "Calculating..." // Would be real dist in prod
        });
        toast.success("Concurrent ajouté !");
        
        // Refresh List
        const data = await api.competitors.list();
        setCompetitors(data || []);
        
        // Remove from scan results visually
        setScannedResults(prev => prev.filter(c => c.place_id !== comp.place_id));
    };

    const handleDelete = async (id: string) => {
        if(confirm('Arrêter de suivre ce concurrent ?')) {
            await api.competitors.delete(id);
            setCompetitors(prev => prev.filter(c => c.id !== id));
            toast.success("Concurrent supprimé.");
        }
    };

    const runAiAnalysis = async () => {
        if (competitors.length === 0) return toast.error("Ajoutez des concurrents d'abord.");
        
        setLoadingInsights(true);
        try {
            const industry = org?.industry || 'Commerce';
            const data = await api.competitors.getDeepAnalysis(industry, 'Ma Zone', competitors);
            setMarketData(data);
            
            // Save report
            await api.competitors.saveReport({
                created_at: new Date().toISOString(),
                sector: industry,
                location: 'Zone Détectée',
                trends: data.trends,
                swot: data.swot,
                competitors_detailed: data.competitors_detailed,
                data: data
            });
            
            toast.success("Nouvelle analyse stratégique disponible !");
        } catch (e: any) {
            toast.error("Erreur analyse IA : " + e.message);
        } finally {
            setLoadingInsights(false);
        }
    };

    if (initialLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

    // PAYWALL
    if (!org || org.subscription_plan === 'free' || org.subscription_plan === 'starter') {
        return (
            <div className="max-w-5xl mx-auto mt-12 animate-in fade-in space-y-8 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Veille Concurrentielle</h1>
                    <p className="text-slate-500">Espionnez légalement vos concurrents et analysez leur stratégie.</p>
                </div>
                <ProLock 
                    title="Débloquez le Radar Concurrentiel"
                    description="Suivez jusqu'à 10 concurrents, analysez leurs faiblesses et recevez des alertes."
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 filter blur-sm opacity-50">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl"></div>)}
                    </div>
                </ProLock>
            </div>
        );
    }

    // LOADING OVERLAY
    if (loading) {
        return (
            <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Radar className="h-20 w-20 text-indigo-600 animate-[spin_3s_linear_infinite] relative z-10" />
                </div>
                <h3 className="mt-8 text-xl font-bold text-slate-900">{scanMessage}</h3>
                <p className="text-slate-500 mt-2 text-sm">Veuillez patienter pendant que nous scannons le secteur.</p>
            </div>
        );
    }

    // MAIN DASHBOARD LAYOUT
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 px-4 sm:px-6 pb-20">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="h-8 w-8 text-red-600 shrink-0" />
                        Veille Concurrentielle
                        <Badge variant="pro">GROWTH</Badge>
                    </h1>
                    <p className="text-slate-500">Surveillez votre marché et anticipez les mouvements adverses.</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        value={scanRadius}
                        onChange={e => setScanRadius(parseInt(e.target.value))}
                    >
                        <option value={1}>1 km</option>
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                        <option value={50}>50 km</option>
                    </select>
                    <Button onClick={runFullScan} icon={Radar} className="shadow-lg shadow-indigo-200">
                        Lancer un Scan
                    </Button>
                </div>
            </div>

            {/* SCAN RESULTS (Visible only after scan) */}
            {showScanner && scannedResults.length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-indigo-600" />
                            {scannedResults.length} Concurrents Détectés
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)} className="text-indigo-600 hover:bg-indigo-100">Masquer</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scannedResults.slice(0, 6).map((res, i) => (
                            <div key={i} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-slate-800 truncate">{res.name}</div>
                                    <div className="text-xs font-bold text-amber-500">{res.rating}★</div>
                                </div>
                                <div className="text-xs text-slate-500 mb-3 truncate">{res.address}</div>
                                <div className="flex gap-2 mt-auto">
                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold border border-red-100 flex-1 text-center">
                                        Menace: {res.threat_level}%
                                    </span>
                                    <Button size="xs" onClick={() => handleAddCompetitor(res)} icon={Plus}>Suivre</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BLOCK 1: PERFORMANCES & RADAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Key Metrics */}
                <Card className="lg:col-span-5 flex flex-col justify-center">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm uppercase text-slate-500 font-bold">
                            <BarChart3 className="h-4 w-4" /> Ma Position
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ma Note</div>
                                <div className="text-3xl font-bold text-indigo-600">4.7 <span className="text-lg text-slate-400">/5</span></div>
                            </div>
                            <div className="h-10 w-px bg-slate-200"></div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Moyenne Marché</div>
                                <div className="text-3xl font-bold text-slate-700">4.2</div>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-bold ${4.7 >= 4.2 ? 'text-green-600' : 'text-red-600'}`}>
                                {4.7 >= 4.2 ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
                                +12%
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Classement Zone</span>
                                <span className="text-indigo-600">Top 10%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                            </div>
                            <p className="text-xs text-slate-400">Vous êtes mieux noté que 90% des concurrents suivis.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Radar */}
                <div className="lg:col-span-7">
                    <SonarRadar competitors={competitors} industry={org?.industry || 'Commerce'} />
                </div>
            </div>

            {/* BLOCK 2: COMPETITOR LIST TABLE */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-slate-600" />
                        Liste des Concurrents ({competitors.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Établissement</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Adresse</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Note</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Avis</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Distance</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-50">
                                {competitors.map((comp) => (
                                    <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{comp.name}</div>
                                            <div className="text-xs text-green-600 font-medium md:hidden">{comp.address}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="text-sm text-slate-600 truncate max-w-[200px]" title={comp.address}>{comp.address}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={comp.rating >= 4.5 ? 'success' : comp.rating >= 4 ? 'default' : 'warning'}>
                                                {comp.rating} ★
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-600">
                                            {comp.review_count}
                                        </td>
                                        <td className="px-6 py-4 text-center hidden sm:table-cell">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                <Navigation className="h-3 w-3" />
                                                {comp.distance || '~1.2 km'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {comp.url && (
                                                    <a href={comp.url} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Voir sur Maps">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                                <button onClick={() => handleDelete(comp.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Supprimer">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {competitors.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <p className="mb-2">Aucun concurrent suivi.</p>
                                            <Button variant="outline" size="sm" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>Lancer un scan</Button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* BLOCK 3: AI ANALYSIS (Hidden if no data) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" /> Analyse Stratégique IA
                        </h2>
                        <p className="text-sm text-slate-500">Rapport généré le {marketData ? new Date().toLocaleDateString() : '-'}</p>
                    </div>
                    <Button onClick={runAiAnalysis} isLoading={loadingInsights} icon={RefreshCw} variant="secondary">
                        Actualiser l'analyse
                    </Button>
                </div>

                {marketData ? (
                    <div className="p-6 md:p-8 space-y-8 animate-in fade-in">
                        
                        {/* Summary */}
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                            <h3 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-wider">Résumé du Marché</h3>
                            <p className="text-indigo-800 leading-relaxed text-sm">
                                {marketData.market_analysis || "Le marché local montre une forte dynamique sur la qualité de service. Vos concurrents directs misent sur le prix, tandis que vous dominez sur l'expérience client."}
                            </p>
                        </div>

                        {/* Grid SWOT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" /> Forces & Opportunités
                                </h3>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-2">
                                    {marketData.swot?.strengths?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 text-sm text-green-800">
                                            <span className="font-bold">+</span> {s}
                                        </div>
                                    ))}
                                    {marketData.swot?.opportunities?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 text-sm text-green-700">
                                            <span className="font-bold">↗</span> {s}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" /> Faiblesses & Menaces
                                </h3>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-2">
                                    {marketData.swot?.weaknesses?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 text-sm text-red-800">
                                            <span className="font-bold">-</span> {s}
                                        </div>
                                    ))}
                                    {marketData.swot?.threats?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 text-sm text-red-700">
                                            <span className="font-bold">!</span> {s}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Strategy */}
                        <div>
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-indigo-600" /> Plan d'Action Recommandé
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {marketData.strategic_recommendations?.map((rec: string, i: number) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="text-3xl font-black text-slate-200 mb-2">0{i+1}</div>
                                        <p className="text-sm font-medium text-slate-700">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lightbulb className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Analyse indisponible</h3>
                        <p className="text-slate-500 mb-6 text-sm">Lancez l'IA pour générer un audit stratégique complet basé sur vos concurrents.</p>
                        <Button onClick={runAiAnalysis} icon={Zap}>Générer l'audit</Button>
                    </div>
                )}
            </div>
        </div>
    );
};