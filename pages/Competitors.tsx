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
    RefreshCw,
    ArrowRight,
    History,
    FileText,
    Play,
    Zap,
    ExternalLink,
    Rocket,
    Globe
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
        { label: 'Note Moyenne', value: (avgRating / 5) * 100, angle: 0 },
        { label: 'Volume Avis', value: Math.min((avgVolume / 500) * 100, 100), angle: 90 },
        { label: 'Fréquence', value: Math.min((avgVolume / 100) * 80, 95), angle: 180 }, // Simulated based on volume
        { label: 'Réactivité', value: 65, angle: 270 } // Simulated/Static for now
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
        <div className={`relative w-full h-[400px] bg-black rounded-xl overflow-hidden shadow-2xl border border-emerald-900/50 flex flex-col items-center justify-center font-mono ${className}`}>
            {/* Grid Overlay */}
            <div className="absolute inset-0" style={{ 
                backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                opacity: 0.2
            }}></div>

            {/* Radar Scan Animation */}
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/30"></div>
            <div className="absolute top-1/2 left-1/2 w-[250px] h-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/30"></div>
            <div className="absolute top-1/2 left-1/2 w-[100px] h-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/30"></div>
            
            {/* The Sweeping Line */}
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none origin-center animate-[spin_4s_linear_infinite]"
                 style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(16, 185, 129, 0.4) 360deg)' }}>
            </div>

            {/* SVG Chart */}
            <svg width="300" height="300" className="relative z-10 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                {/* Axes Lines */}
                {axes.map((axis, i) => {
                    const end = getCoordinates(100, axis.angle);
                    return (
                        <g key={i}>
                            <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                            <text x={end.x} y={end.y} 
                                  dx={axis.angle === 90 ? 10 : axis.angle === 270 ? -80 : -40} 
                                  dy={axis.angle === 0 ? -10 : axis.angle === 180 ? 20 : 5}
                                  fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="start">
                                {axis.label.toUpperCase()}
                            </text>
                        </g>
                    );
                })}

                {/* Data Polygon */}
                <polygon points={polygonPoints} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
                
                {/* Data Points */}
                {axes.map((axis, i) => {
                    const coords = getCoordinates(axis.value, axis.angle);
                    return <circle key={i} cx={coords.x} cy={coords.y} r="3" fill="#ecfdf5" className="animate-pulse" />;
                })}
            </svg>

            {/* Info Overlay */}
            <div className="absolute top-4 left-4 text-emerald-500 text-xs">
                <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE MONITORING
                </div>
                <div className="font-bold opacity-80 uppercase tracking-widest">{industry}</div>
            </div>
            
            <div className="absolute bottom-4 right-4 text-emerald-600 text-[10px] font-mono">
                TARGETS: {competitors.length} <br/>
                ZONE: ACTIF
            </div>
        </div>
    );
};

export const CompetitorsPage = () => {
    const [trackedCompetitors, setTrackedCompetitors] = useState<Competitor[]>([]);
    const [scannedResults, setScannedResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'tracked' | 'scan' | 'insights'>('tracked');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [marketData, setMarketData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    
    // Scan settings
    const [scanRadius, setScanRadius] = useState(5);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'found' | 'error'>('idle');
    
    // Insights / Report settings
    const [locationInput, setLocationInput] = useState('');
    const [reportHistory, setReportHistory] = useState<MarketReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<MarketReport | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

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
                await loadTracked();
                await loadReports();
            }
        } catch (e) {
            console.error("Failed to load org", e);
        } finally {
            setInitialLoading(false);
        }
    };

    const loadTracked = async () => {
        setLoading(true);
        try {
            const data = await api.competitors.list();
            setTrackedCompetitors(data || []);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    const loadReports = async () => {
        const reports = await api.competitors.getReports();
        setReportHistory(reports);
        if (reports.length > 0) {
            setSelectedReport(reports[0]);
            setMarketData(reports[0].data);
        }
    };

    const handleScan = async () => {
        if (!org) return;
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
            // Use org industry automatically
            const industryKeyword = org.industry || 'Commerce';
            const results = await api.competitors.autoDiscover(scanRadius, industryKeyword, latitude, longitude);
            
            setScannedResults(results || []);
            setActiveTab('scan');
            
            if (results && results.length > 0) {
                toast.success(`${results.length} concurrents détectés dans la zone.`);
            } else {
                toast.info("Aucun concurrent trouvé. Essayez d'élargir le rayon.");
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

    const runAnalysis = async () => {
        if (!locationInput) {
            toast.error("Veuillez définir la zone géographique.");
            return;
        }
        
        setLoadingInsights(true);
        setMarketData(null); // Clear previous view
        try {
            const industry = org?.industry || 'Commerce';
            const data = await api.competitors.getDeepAnalysis(industry, locationInput, trackedCompetitors);
            setMarketData(data);
            
            // Save to history
            const newReport: Omit<MarketReport, 'id'> = {
                created_at: new Date().toISOString(),
                sector: industry,
                location: locationInput,
                trends: data.trends,
                swot: data.swot,
                competitors_detailed: data.competitors_detailed,
                data: data // Store full payload including recommendations
            };
            
            await api.competitors.saveReport(newReport);
            await loadReports();
            toast.success("Analyse terminée et sauvegardée !");
        } catch (e: any) {
            toast.error("Erreur lors de l'analyse : " + e.message);
        } finally {
            setLoadingInsights(false);
        }
    };

    const handleSelectReport = (report: MarketReport) => {
        setSelectedReport(report);
        setMarketData(report.data || { trends: report.trends, swot: report.swot, competitors_detailed: report.competitors_detailed });
    };

    const handleDownloadPDF = async () => {
        if (!marketData || !pdfRef.current) return;
        setGeneratingPdf(true);
        toast.info("Génération du rapport PDF...");

        try {
            // Wait a moment for the hidden div to fully render graphics
            await new Promise(resolve => setTimeout(resolve, 1000));

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Use toPng to capture the hidden div as an image
            const imgData = await toPng(pdfRef.current, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            const imgProps = doc.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

            // Simple integration: just add the long image. 
            // In a real production app, we would split into pages if too long.
            doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pdfHeight);

            doc.save(`Rapport_Strategique_${selectedReport?.sector || 'Analyse'}.pdf`);
            toast.success("PDF téléchargé !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la génération du PDF.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (initialLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

    if (!org) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
                <div className="bg-indigo-50 p-4 rounded-full mb-4">
                    <Target className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Configuration requise</h3>
                <p className="text-slate-500 mb-6 max-w-sm">Vous devez configurer votre établissement pour accéder à la veille concurrentielle.</p>
                <Button onClick={() => navigate('/onboarding')} icon={ArrowRight}>Configurer maintenant</Button>
            </div>
        );
    }

    // PAYWALL - PRO (GROWTH) PLAN ONLY
    if (org.subscription_plan === 'free' || org.subscription_plan === 'starter') {
        return (
            <div className="max-w-5xl mx-auto mt-12 animate-in fade-in space-y-8 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Veille Concurrentielle</h1>
                    <p className="text-slate-500 text-sm md:text-base">Espionnez légalement vos concurrents et analysez leur stratégie.</p>
                </div>
                
                <ProLock 
                    title="Débloquez le Radar Concurrentiel"
                    description="Suivez jusqu'à 10 concurrents, analysez leurs faiblesses et recevez des alertes quand ils changent de stratégie."
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 filter blur-[2px] opacity-30">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="opacity-50">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                                        <div className="h-6 w-16 bg-slate-200 rounded"></div>
                                    </div>
                                    <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
                                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ProLock>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 px-4 sm:px-6 md:px-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="h-8 w-8 text-red-600 shrink-0" />
                        Veille Concurrentielle
                        <Badge variant="pro" className="hidden sm:inline-flex">GROWTH</Badge>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Surveillez votre marché et anticipez les mouvements adverses.</p>
                </div>
                
                {/* Mobile Scrollable Tabs */}
                <div className="w-full lg:w-auto overflow-x-auto pb-1 -mx-1 px-1">
                    <div className="flex bg-slate-100 p-1 rounded-lg min-w-fit">
                        <button 
                            onClick={() => setActiveTab('tracked')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'tracked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ma Sélection
                        </button>
                        <button 
                            onClick={() => setActiveTab('scan')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Radar className="h-4 w-4" /> Radar
                        </button>
                        <button 
                            onClick={() => setActiveTab('insights')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart3 className="h-4 w-4" /> Analyse SWOT
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB: INSIGHTS (SWOT & STRATEGY) */}
            {activeTab === 'insights' && (
                <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Left Panel: Configuration */}
                    <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Nouvelle Analyse</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Secteur détecté</label>
                                    <div className="font-medium text-indigo-900 flex items-center gap-2">
                                        <Zap className="h-4 w-4" /> {org.industry || 'Non défini'}
                                    </div>
                                    <p className="text-[10px] text-indigo-700 mt-1">L'IA analysera le marché en fonction de ce secteur.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Zone Géographique</label>
                                    <Input 
                                        placeholder="ex: Paris 11ème" 
                                        value={locationInput} 
                                        onChange={e => setLocationInput(e.target.value)} 
                                        className="bg-slate-50"
                                    />
                                </div>
                                <Button className="w-full" onClick={runAnalysis} isLoading={loadingInsights} icon={Play}>
                                    Lancer l'Audit IA
                                </Button>
                            </CardContent>
                        </Card>
                        
                        {/* Report History */}
                        {reportHistory.length > 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <History className="h-3 w-3" /> Historique
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {reportHistory.map(report => (
                                        <div 
                                            key={report.id}
                                            onClick={() => handleSelectReport(report)}
                                            className={`p-3 border-b border-slate-50 cursor-pointer transition-colors hover:bg-indigo-50 last:border-0 ${selectedReport?.id === report.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600 pl-2' : ''}`}
                                        >
                                            <div className="font-medium text-sm text-slate-900 truncate">{report.sector}</div>
                                            <div className="text-xs text-slate-500 flex justify-between mt-1">
                                                <span className="truncate max-w-[120px]">{report.location}</span>
                                                <span className="shrink-0">{new Date(report.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Panel: Results */}
                    <div className="col-span-12 lg:col-span-8 xl:col-span-9">
                        {loadingInsights ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 bg-white rounded-xl border border-slate-200 min-h-[400px]">
                                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 text-center">Analyse stratégique en cours...</h3>
                                <p className="text-slate-500 mt-2 max-w-md text-center text-sm">
                                    L'IA compare vos performances avec les standards du secteur {org.industry} pour la zone ciblée.
                                </p>
                            </div>
                        ) : marketData ? (
                            <div className="space-y-6">
                                {/* Header Results */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-4 border-b border-slate-200 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mb-1">
                                            <FileText className="h-4 w-4" /> 
                                            Rapport généré le {selectedReport ? new Date(selectedReport.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                                            Audit: {selectedReport?.sector || org.industry} - {locationInput || selectedReport?.location}
                                        </h2>
                                    </div>
                                    <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadPDF} isLoading={generatingPdf}>
                                        Export PDF
                                    </Button>
                                </div>

                                {/* Market Analysis Context */}
                                {marketData.market_analysis && (
                                    <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <Globe className="h-5 w-5 text-indigo-600" /> Contexte Marché
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed">
                                            {marketData.market_analysis}
                                        </p>
                                    </div>
                                )}

                                {/* Trends & SWOT */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Trends Card */}
                                    <Card className="xl:col-span-1 bg-slate-900 text-white border-none shadow-xl flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5 text-yellow-400" />
                                                Tendances Clés
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <ul className="space-y-4">
                                                {marketData.trends?.map((trend: string, i: number) => (
                                                    <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                                                        <span className="text-yellow-400 font-bold mt-1">•</span>
                                                        <span>{trend}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>

                                    {/* SWOT Grid */}
                                    <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-emerald-800 flex items-center gap-2 text-base">
                                                    <CheckCircle2 className="h-5 w-5" /> Forces du Marché
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {marketData.swot?.strengths?.map((item: string, i: number) => (
                                                        <li key={i} className="text-sm text-emerald-700 flex gap-2 items-start">
                                                            <span className="font-bold mt-0.5">+</span> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-rose-50 border-rose-100 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-rose-800 flex items-center gap-2 text-base">
                                                    <AlertTriangle className="h-5 w-5" /> Faiblesses
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {marketData.swot?.weaknesses?.map((item: string, i: number) => (
                                                        <li key={i} className="text-sm text-rose-700 flex gap-2 items-start">
                                                            <span className="font-bold mt-0.5">-</span> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-blue-50 border-blue-100 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
                                                    <Lightbulb className="h-5 w-5" /> Opportunités
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {marketData.swot?.opportunities?.map((item: string, i: number) => (
                                                        <li key={i} className="text-sm text-blue-700 flex gap-2 items-start">
                                                            <span className="font-bold mt-0.5">→</span> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-amber-50 border-amber-100 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                                                    <Shield className="h-5 w-5" /> Menaces
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {marketData.swot?.threats?.map((item: string, i: number) => (
                                                        <li key={i} className="text-sm text-amber-700 flex gap-2 items-start">
                                                            <span className="font-bold mt-0.5">!</span> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Strategic Recommendations */}
                                {marketData.strategic_recommendations && (
                                    <div className="bg-indigo-600 text-white rounded-xl p-6 shadow-lg">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <Rocket className="h-6 w-6 text-yellow-400" />
                                            Plan d'Action Recommandé
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {marketData.strategic_recommendations.map((rec: string, i: number) => (
                                                <div key={i} className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/20">
                                                    <div className="font-bold text-yellow-400 text-xl mb-2">0{i + 1}</div>
                                                    <p className="text-sm leading-relaxed font-medium">{rec}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Détail par Concurrent</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {marketData.competitors_detailed?.map((comp: any, i: number) => (
                                        <Card key={i} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-900 truncate pr-2 max-w-[70%]">{comp.name}</h4>
                                                    <Badge variant={comp.sentiment_trend === 'Positif' ? 'success' : comp.sentiment_trend === 'Négatif' ? 'error' : 'neutral'} className="shrink-0">
                                                        {comp.sentiment_trend}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                                                    Croissance: <span className="font-semibold text-indigo-600">{comp.last_month_growth}</span>
                                                </p>
                                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                                    <p className="text-[10px] text-red-500 font-bold uppercase mb-1">Point faible majeur</p>
                                                    <p className="text-xs text-red-800 font-medium line-clamp-2">{comp.top_complaint}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
                                <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 text-center">Aucune analyse sélectionnée</h3>
                                <p className="text-slate-500 mb-6 text-center max-w-sm text-sm">
                                    Sélectionnez un rapport dans l'historique ou lancez une nouvelle analyse pour obtenir des insights stratégiques.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* TAB: SCAN (RADAR) */}
            {activeTab === 'scan' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    {/* Sonar Visualization Area */}
                    <SonarRadar competitors={scannedResults} industry={org.industry || 'Général'} />

                    <Card className="bg-white border-slate-200 shadow-sm mt-6">
                        <CardHeader className="bg-slate-50 border-b border-slate-200">
                            <CardTitle className="text-sm uppercase font-bold text-slate-500">Paramètres du Scan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <div className="flex flex-col lg:flex-row gap-6 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Secteur cible</label>
                                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium cursor-not-allowed flex items-center gap-2">
                                        <Target className="h-4 w-4" /> {org.industry || 'Non défini (Configurer dans Paramètres)'}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Basé sur vos paramètres d'établissement.</p>
                                </div>
                                <div className="w-full lg:w-48">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Rayon de recherche</label>
                                    <select 
                                        className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                                        value={scanRadius}
                                        onChange={e => setScanRadius(parseInt(e.target.value))}
                                    >
                                        <option value={1}>1 km (Quartier)</option>
                                        <option value={3}>3 km (Large)</option>
                                        <option value={5}>5 km (Ville)</option>
                                        <option value={10}>10 km (Agglo)</option>
                                        <option value={50}>50 km (Région)</option>
                                    </select>
                                </div>
                                <Button 
                                    size="lg" 
                                    className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-200"
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
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-lg text-slate-900 truncate">{result.name}</h3>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                                    <MapPin className="h-3 w-3 shrink-0" /> {result.address || 'Proche'}
                                                </p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${result.threat_level > 80 ? 'bg-red-100 text-red-700' : result.threat_level > 50 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                Menace: {result.threat_level}%
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mb-4 text-sm bg-slate-50 p-2 rounded">
                                            <div className="flex-1 text-center border-r border-slate-200">
                                                <div className="text-slate-400 text-xs uppercase font-bold">Note</div>
                                                <div className="font-bold text-slate-900">{result.rating} ★</div>
                                            </div>
                                            <div className="flex-1 text-center">
                                                <div className="text-slate-400 text-xs uppercase font-bold">Avis</div>
                                                <div className="font-bold text-slate-900">{result.review_count}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            <div className="text-xs font-semibold text-green-700 bg-green-50 p-2 rounded flex gap-2">
                                                <span>👍</span> <span className="truncate">{result.strengths[0]}</span>
                                            </div>
                                            <div className="text-xs font-semibold text-red-700 bg-red-50 p-2 rounded flex gap-2">
                                                <span>👎</span> <span className="truncate">{result.weaknesses[0]}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="flex-1" variant="outline" icon={Plus} onClick={() => handleTrack(result)}>
                                                Suivre
                                            </Button>
                                            {result.url && (
                                                <a 
                                                    href={result.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600"
                                                    title="Voir sur Google Maps"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: TRACKED */}
            {activeTab === 'tracked' && (
                <Card className="animate-in fade-in shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Concurrents Surveillés</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {trackedCompetitors.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun concurrent suivi</h3>
                                <p className="text-slate-500 mb-6 max-w-sm mx-auto">Utilisez le Radar de Zone pour détecter vos concurrents automatiquement et les ajouter à votre liste.</p>
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Forces</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Faiblesses</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {trackedCompetitors.map((comp) => (
                                            <tr key={comp.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-none">{comp.name}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-none">{comp.address}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={comp.rating >= 4.5 ? 'success' : comp.rating >= 4 ? 'default' : 'warning'}>
                                                        {comp.rating} ★
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {comp.review_count}
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex flex-wrap gap-1">
                                                        {comp.strengths.slice(0, 2).map(s => (
                                                            <span key={s} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 whitespace-nowrap">{s}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex flex-wrap gap-1">
                                                        {comp.weaknesses.slice(0, 2).map(s => (
                                                            <span key={s} className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 whitespace-nowrap">{s}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDelete(comp.id)} className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-slate-100">
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

            {/* Hidden PDF Template (Only rendered when generating PDF) */}
            <div className="fixed top-0 left-0 w-[210mm] opacity-0 pointer-events-none z-[-1]" ref={pdfRef} style={{ background: 'white', padding: '20mm' }}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Rapport de Veille Concurrentielle</h1>
                        <p className="text-sm text-slate-500 mt-1">{org.industry} • {selectedReport?.location}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase font-bold">Reviewflow Intelligence</div>
                        <div className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                {marketData && (
                    <>
                        {/* Market Analysis Section in PDF */}
                        {marketData.market_analysis && (
                            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-2 uppercase text-xs">Contexte Marché</h3>
                                <p className="text-sm text-slate-700 leading-relaxed">{marketData.market_analysis}</p>
                            </div>
                        )}

                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 border-l-4 border-indigo-600 pl-3">Radar Stratégique</h2>
                            {/* Render static version of radar for PDF */}
                            <SonarRadar competitors={scannedResults.length ? scannedResults : trackedCompetitors} industry={org.industry || ''} className="h-[300px] border-none shadow-none" />
                        </div>

                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 border-l-4 border-yellow-500 pl-3">Tendances du Marché</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                {marketData.trends?.map((t: string, i: number) => (
                                    <li key={i} className="text-sm text-slate-700">{t}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="font-bold text-emerald-700 mb-2 uppercase text-xs">Forces</h3>
                                <ul className="text-xs space-y-1">
                                    {marketData.swot?.strengths?.map((s: string, i: number) => <li key={i}>+ {s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-rose-700 mb-2 uppercase text-xs">Faiblesses</h3>
                                <ul className="text-xs space-y-1">
                                    {marketData.swot?.weaknesses?.map((s: string, i: number) => <li key={i}>- {s}</li>)}
                                </ul>
                            </div>
                        </div>

                        {/* Strategy Section in PDF */}
                        {marketData.strategic_recommendations && (
                            <div className="mb-8 border border-slate-200 rounded-xl p-4">
                                <h2 className="text-lg font-bold text-slate-900 mb-4 border-l-4 border-indigo-600 pl-3">Stratégie Recommandée</h2>
                                <ul className="space-y-3">
                                    {marketData.strategic_recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                                            <span className="font-bold text-indigo-600">{i + 1}.</span> {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
                
                <div className="mt-8 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                    Généré automatiquement par Reviewflow AI Engine.
                </div>
            </div>
        </div>
    );
};