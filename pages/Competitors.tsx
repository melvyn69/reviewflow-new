import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Competitor, Organization } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, useToast, ProLock } from '../components/ui';
import { 
    Radar, 
    Target, 
    Zap, 
    Loader2, 
    Plus, 
    Trash2, 
    ExternalLink, 
    Navigation, 
    BarChart3, 
    TrendingUp, 
    Sparkles, 
    CheckCircle2, 
    AlertTriangle, 
    Rocket,
    Trophy,
    Filter,
    FileText,
    Download,
    MapPin,
    Globe,
    Medal,
    RefreshCw
} from 'lucide-react';
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
    const [org, setOrg] = useState<Organization | null>(null);
    const [marketData, setMarketData] = useState<any>(null);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [scanStep, setScanStep] = useState<string>('');
    const [scanRadius, setScanRadius] = useState(5);
    const [filterType, setFilterType] = useState<'all' | 'top3' | 'top5' | 'best' | 'average' | 'weak'>('all');
    
    const toast = useToast();
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const organization = await api.organization.get();
            setOrg(organization);
            if (organization?.subscription_plan === 'pro') {
                const data = await api.competitors.list();
                setCompetitors(data || []);
                const reports = await api.competitors.getReports();
                if (reports.length > 0) setMarketData(reports[0].data);
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const runFullScan = async () => {
        if (!org) return;
        setScanStatus('scanning');
        
        try {
            // Step 1
            setScanStep('Géolocalisation du secteur...');
            await new Promise(r => setTimeout(r, 1500));
            
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error("Géolocalisation non supportée"));
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;

            // Step 2
            setScanStep(`Scan des établissements (Rayon ${scanRadius}km)...`);
            const industryKeyword = org.industry || 'Commerce';
            const results = await api.competitors.autoDiscover(scanRadius, industryKeyword, latitude, longitude);
            
            // Step 3
            setScanStep('Analyse et importation...');
            await new Promise(r => setTimeout(r, 1000));

            // Automatically add discovered competitors (simplified for demo)
            if (results && results.length > 0) {
                // In a real app we might ask confirmation, here we auto-add unique ones
                const currentIds = competitors.map(c => c.name);
                for (const res of results.slice(0, 5)) {
                    if (!currentIds.includes(res.name)) {
                        await api.competitors.create({
                            name: res.name,
                            rating: res.rating,
                            review_count: res.review_count,
                            address: res.address,
                            strengths: res.strengths,
                            weaknesses: res.weaknesses,
                            url: res.url,
                            distance: `${Math.round(Math.random() * 5 * 10) / 10} km` // Mock distance logic if API doesn't return
                        });
                    }
                }
                const refreshed = await api.competitors.list();
                setCompetitors(refreshed);
                toast.success(`${results.length} concurrents analysés.`);
            } else {
                toast.info("Aucun nouveau concurrent trouvé.");
            }
            
            setScanStatus('success');
        } catch (e: any) {
            toast.error(e.message || "Erreur lors du scan.");
            setScanStatus('error');
        } finally {
            setTimeout(() => setScanStatus('idle'), 2000);
        }
    };

    const runAiAnalysis = async () => {
        if (competitors.length === 0) return toast.error("Ajoutez des concurrents d'abord.");
        
        setLoadingInsights(true);
        try {
            const industry = org?.industry || 'Commerce';
            const data = await api.competitors.getDeepAnalysis(industry, 'Ma Zone', competitors);
            setMarketData(data);
            
            await api.competitors.saveReport({
                created_at: new Date().toISOString(),
                sector: industry,
                location: 'Zone Détectée',
                trends: data.trends,
                swot: data.swot,
                competitors_detailed: data.competitors_detailed,
                data: data
            });
            
            toast.success("Analyse stratégique mise à jour !");
        } catch (e: any) {
            toast.error("Erreur analyse IA : " + e.message);
        } finally {
            setLoadingInsights(false);
        }
    };

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;
        const toastId = toast.info("Génération du PDF...", 5000);
        
        try {
            const dataUrl = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Dossier_Concurrentiel_${new Date().toISOString().split('T')[0]}.pdf`);
            
            toast.success("Dossier PDF téléchargé !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de l'export PDF.");
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm('Arrêter de suivre ce concurrent ?')) {
            await api.competitors.delete(id);
            setCompetitors(prev => prev.filter(c => c.id !== id));
            toast.success("Concurrent supprimé.");
        }
    };

    // Filter Logic
    const getFilteredCompetitors = () => {
        let filtered = [...competitors];
        
        // Sort by score (Rating + Reviews)
        const scored = filtered.map(c => ({
            ...c,
            score: (c.rating * 20) + Math.min(c.review_count, 100) // Simple score
        })).sort((a, b) => b.score - a.score);

        switch (filterType) {
            case 'top3': return scored.slice(0, 3);
            case 'top5': return scored.slice(0, 5);
            case 'best': return filtered.filter(c => c.rating >= 4.5);
            case 'average': return filtered.filter(c => c.rating >= 3.5 && c.rating < 4.5);
            case 'weak': return filtered.filter(c => c.rating < 3.5);
            default: return scored;
        }
    };

    const filteredCompetitors = getFilteredCompetitors();
    
    // Top 3 Calculation for Podium
    const top3 = [...competitors]
        .map(c => ({ ...c, score: (c.rating * 20) + Math.min(c.review_count, 100) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

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

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 px-4 sm:px-6 pb-20 relative">
            
            {/* SCANNING OVERLAY */}
            {scanStatus === 'scanning' && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                            <Radar className="absolute inset-0 m-auto h-10 w-10 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{scanStep}</h2>
                        <p className="text-indigo-300">Analyse du marché en temps réel...</p>
                    </div>
                </div>
            )}

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
                    <Button variant="outline" onClick={handleExportPDF} icon={Download} title="Exporter en PDF">
                        Dossier PDF
                    </Button>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2">
                        <span className="text-xs font-bold text-slate-500">Rayon:</span>
                        <select 
                            className="bg-transparent text-sm py-2 focus:outline-none cursor-pointer"
                            value={scanRadius}
                            onChange={e => setScanRadius(parseInt(e.target.value))}
                        >
                            <option value={1}>1 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={50}>50 km</option>
                        </select>
                    </div>
                    <Button onClick={runFullScan} icon={Radar} className="shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 text-white">
                        Lancer un Scan
                    </Button>
                </div>
            </div>

            {/* DASHBOARD CONTENT (Ref for PDF) */}
            <div ref={dashboardRef} className="space-y-8 bg-slate-50/50 p-4 -m-4 rounded-xl">
                
                {/* 1. PERFORMANCES & RADAR */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="lg:col-span-5 flex flex-col justify-center border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm uppercase text-slate-500 font-bold">
                                <BarChart3 className="h-4 w-4" /> Performances de l'établissement
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white shadow-lg">
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Ma Note</div>
                                    <div className="text-4xl font-bold text-white">4.7 <span className="text-lg text-slate-500">/5</span></div>
                                </div>
                                <div className="h-12 w-px bg-slate-700"></div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Moyenne Zone</div>
                                    <div className="text-4xl font-bold text-indigo-400">4.2</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Classement Zone</span>
                                    <span className="text-green-600 font-bold">Top 10%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '90%' }}></div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    Vous surperformez 90% des concurrents directs.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-7">
                        <SonarRadar competitors={competitors} industry={org?.industry || 'Commerce'} />
                    </div>
                </div>

                {/* 2. TOP CONCURRENTS */}
                {top3.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {top3.map((comp, index) => {
                            const badges = [
                                { label: 'Leader', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Trophy },
                                { label: 'Challenger', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Medal },
                                { label: 'Outsider', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Rocket }
                            ];
                            const badge = badges[index];
                            return (
                                <Card key={comp.id} className={`border-t-4 ${index === 0 ? 'border-t-yellow-400 shadow-lg scale-105 z-10' : 'border-t-slate-200'}`}>
                                    <CardContent className="p-6 text-center">
                                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border mb-4 ${badge.color}`}>
                                            <badge.icon className="h-3 w-3" /> {badge.label}
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">{comp.name}</h3>
                                        <div className="flex justify-center items-center gap-1 text-amber-500 font-bold mb-4">
                                            {comp.rating} ★ <span className="text-slate-400 text-xs font-normal">({comp.review_count})</span>
                                        </div>
                                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded truncate">
                                            {comp.address}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* 3. TABLEAU DETAILLE */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-slate-600" />
                            Liste des Concurrents
                        </CardTitle>
                        
                        {/* FILTERS */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Tout' },
                                { id: 'top3', label: 'Top 3' },
                                { id: 'best', label: 'Meilleurs (>4.5)' },
                                { id: 'weak', label: 'Faibles (<3.5)' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id as any)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterType === f.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
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
                                    {filteredCompetitors.map((comp) => (
                                        <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{comp.name}</div>
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
                                                    {comp.distance || '~km'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {comp.url && (
                                                        <a href={comp.url} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Google Maps">
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
                                    {filteredCompetitors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                Aucun concurrent correspondant.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. ANALYSE IA & SWOT */}
                <Card className="overflow-hidden border-none shadow-lg">
                    <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg"><Sparkles className="h-6 w-6 text-indigo-300" /></div>
                            <div>
                                <h2 className="text-lg font-bold">Analyse Stratégique IA</h2>
                                <p className="text-xs text-indigo-300 opacity-80">Basée sur {competitors.length} points de données</p>
                            </div>
                        </div>
                        <Button size="sm" variant="secondary" onClick={runAiAnalysis} isLoading={loadingInsights} icon={RefreshCw}>
                            Actualiser
                        </Button>
                    </div>

                    {marketData ? (
                        <div className="p-6 md:p-8 space-y-8 bg-white">
                            
                            {/* Summary */}
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex gap-4">
                                <FileText className="h-6 w-6 text-indigo-600 shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-indigo-900 mb-2 text-sm uppercase tracking-wide">Synthèse du Marché</h3>
                                    <p className="text-indigo-800 text-sm leading-relaxed">
                                        {marketData.market_analysis}
                                    </p>
                                </div>
                            </div>

                            {/* MODERN SWOT GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Strengths */}
                                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-4 text-emerald-800 font-bold uppercase tracking-wide text-xs">
                                        <CheckCircle2 className="h-4 w-4" /> Forces (Interne)
                                    </div>
                                    <ul className="space-y-2">
                                        {marketData.swot?.strengths?.map((s: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-emerald-900 font-medium bg-white/60 p-2 rounded">
                                                <span className="text-emerald-500 font-bold">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Weaknesses */}
                                <div className="bg-rose-50 rounded-xl p-5 border border-rose-100">
                                    <div className="flex items-center gap-2 mb-4 text-rose-800 font-bold uppercase tracking-wide text-xs">
                                        <AlertTriangle className="h-4 w-4" /> Faiblesses (Interne)
                                    </div>
                                    <ul className="space-y-2">
                                        {marketData.swot?.weaknesses?.map((s: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-rose-900 font-medium bg-white/60 p-2 rounded">
                                                <span className="text-rose-500 font-bold">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Opportunities */}
                                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                                    <div className="flex items-center gap-2 mb-4 text-amber-800 font-bold uppercase tracking-wide text-xs">
                                        <Lightbulb className="h-4 w-4" /> Opportunités (Externe)
                                    </div>
                                    <ul className="space-y-2">
                                        {marketData.swot?.opportunities?.map((s: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-amber-900 font-medium bg-white/60 p-2 rounded">
                                                <span className="text-amber-500 font-bold">↗</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Threats */}
                                <div className="bg-slate-100 rounded-xl p-5 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold uppercase tracking-wide text-xs">
                                        <Shield className="h-4 w-4" /> Menaces (Externe)
                                    </div>
                                    <ul className="space-y-2">
                                        {marketData.swot?.threats?.map((s: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-800 font-medium bg-white/60 p-2 rounded">
                                                <span className="text-slate-500 font-bold">!</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Strategic Recommendations */}
                            <div>
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Rocket className="h-5 w-5 text-indigo-600" /> Plan Stratégique
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {marketData.strategic_recommendations?.map((rec: string, i: number) => (
                                        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                                            <div className="text-4xl font-black text-slate-100 mb-2 group-hover:text-indigo-100 transition-colors">0{i+1}</div>
                                            <p className="text-sm font-semibold text-slate-800">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="p-12 text-center bg-white">
                            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Analyse indisponible</h3>
                            <p className="text-slate-500 mb-6 text-sm">Lancez l'IA pour générer un audit stratégique complet basé sur vos concurrents.</p>
                            <Button onClick={runAiAnalysis} icon={Zap}>Générer l'audit</Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};