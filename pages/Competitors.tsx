
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Competitor } from '../types';
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
    DollarSign,
    Zap
} from 'lucide-react';

export const CompetitorsPage = () => {
    const [trackedCompetitors, setTrackedCompetitors] = useState<Competitor[]>([]);
    const [scannedResults, setScannedResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'tracked' | 'scan'>('tracked');
    const [loading, setLoading] = useState(false);
    
    // Scan settings
    const [scanRadius, setScanRadius] = useState(5);
    const [scanSector, setScanSector] = useState('');
    
    const toast = useToast();

    useEffect(() => {
        loadTracked();
    }, []);

    const loadTracked = async () => {
        setLoading(true);
        const data = await api.competitors.list();
        setTrackedCompetitors(data);
        setLoading(false);
    };

    const handleScan = async () => {
        setLoading(true);
        try {
            // Fake delay for radar effect
            await new Promise(r => setTimeout(r, 1500));
            const results = await api.competitors.autoDiscover(scanRadius, scanSector);
            setScannedResults(results);
            setActiveTab('scan');
            toast.success(`${results.length} concurrents détectés dans la zone.`);
        } catch (e: any) {
            toast.error(e.message);
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
                <div className="flex gap-2">
                    <Button 
                        variant={activeTab === 'tracked' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('tracked')}
                    >
                        Ma Sélection ({trackedCompetitors.length})
                    </Button>
                    <Button 
                        variant={activeTab === 'scan' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('scan')}
                        icon={Radar}
                    >
                        Radar de Zone
                    </Button>
                </div>
            </div>

            {/* SCANNER SECTION */}
            {activeTab === 'scan' && (
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Secteur d'activité (Optionnel)</label>
                                    <Input 
                                        placeholder="ex: Pizzeria, Garage, Coiffeur..." 
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
                                    icon={Radar}
                                >
                                    Scanner la zone
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
                                                    <MapPin className="h-3 w-3" /> {result.distance || 'Proche'}
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
                                            <div>
                                                <div className="text-slate-400 text-xs">CA Est.</div>
                                                <div className="font-bold text-slate-900">{result.estimated_revenue}</div>
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
