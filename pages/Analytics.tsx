
import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Card, CardContent, CardTitle, CardHeader, Button, Badge, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { AnalyticsSummary, Competitor } from '../types';
import { Download, Calendar, Cloud, Trophy, TrendingUp, AlertTriangle, Plus, Trash2, X, Radio, Loader2 } from 'lucide-react';

const COLORS = ['#4f46e5', '#94a3b8', '#f43f5e']; // Indigo, Slate, Rose

// Simple Word Cloud Component
const WordCloud = ({ keywords }: { keywords: { keyword: string; count: number }[] }) => {
    if (!keywords || keywords.length === 0) return <div className="text-slate-400 text-sm">Pas de données mots-clés</div>;
    
    // Find max to normalize sizes
    const maxCount = Math.max(...keywords.map(k => k.count));
    
    // Shuffle slightly for visual variation (stable sort based on string hash would be better but simple random here for demo)
    const sorted = [...keywords].sort((a,b) => b.count - a.count);

    return (
        <div className="flex flex-wrap items-center justify-center gap-4 p-8 min-h-[250px]">
            {sorted.map((item, i) => {
                const size = 0.8 + (item.count / maxCount) * 1.5; // Scale 0.8rem to 2.3rem
                const opacity = 0.6 + (item.count / maxCount) * 0.4;
                const colors = ['text-indigo-600', 'text-blue-500', 'text-violet-600', 'text-slate-600'];
                return (
                    <span 
                        key={i} 
                        className={`font-bold ${colors[i % 4]} hover:scale-110 transition-transform cursor-default`}
                        style={{ fontSize: `${size}rem`, opacity }}
                        title={`${item.count} mentions`}
                    >
                        {item.keyword}
                    </span>
                )
            })}
        </div>
    )
}

export const AnalyticsPage = () => {
  const [data, setData] = React.useState<AnalyticsSummary | null>(null);
  const [competitors, setCompetitors] = React.useState<Competitor[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'competitors'>('overview');
  
  // Competitor Modal State
  const [showCompModal, setShowCompModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compRating, setCompRating] = useState('4.5');
  const [compStrengths, setCompStrengths] = useState('');
  const [compWeaknesses, setCompWeaknesses] = useState('');
  
  // Auto-Discover State
  const [isScanning, setIsScanning] = useState(false);

  const toast = useToast();

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      const analytics = await api.analytics.getOverview();
      const comps = await api.competitors.list();
      setData(analytics);
      setCompetitors(comps);
  };

  const handleExport = () => {
      if (!data) return;
      
      const rows = [
          ['Metric', 'Value'],
          ['Total Reviews', data.total_reviews],
          ['Avg Rating', data.average_rating],
          ['Response Rate', data.response_rate + '%'],
          ['NPS', data.nps_score],
          ['Positive %', data.sentiment_distribution.positive * 100],
          ['Neutral %', data.sentiment_distribution.neutral * 100],
          ['Negative %', data.sentiment_distribution.negative * 100],
          [],
          ['Top Keywords', 'Count'],
          ...data.top_keywords.map(k => [k.keyword, k.count])
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "analytics_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleAddCompetitor = async () => {
      if (!compName) return;
      await api.competitors.create({
          name: compName,
          rating: parseFloat(compRating),
          review_count: Math.floor(Math.random() * 200) + 50, // Mock count
          address: 'Local',
          strengths: compStrengths.split(',').map(s => s.trim()).filter(s => s),
          weaknesses: compWeaknesses.split(',').map(s => s.trim()).filter(s => s)
      });
      setShowCompModal(false);
      setCompName('');
      setCompStrengths('');
      setCompWeaknesses('');
      toast.success("Concurrent ajouté");
      loadData();
  };

  const handleDeleteCompetitor = async (id: string) => {
      if (confirm("Supprimer ce concurrent ?")) {
          await api.competitors.delete(id);
          toast.success("Concurrent supprimé");
          loadData();
      }
  };

  const handleAutoScan = async () => {
      setIsScanning(true);
      try {
          toast.info("Scan de la zone de chalandise en cours...");
          // Simulation d'un délai pour l'effet "Radar"
          await new Promise(r => setTimeout(r, 1500)); 
          const results = await api.competitors.autoDiscover();
          setCompetitors(results);
          toast.success(`${results.length} concurrents trouvés par l'IA !`);
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsScanning(false);
      }
  };

  if (!data) return <div className="p-8 text-center text-slate-500">Chargement des statistiques...</div>;

  const pieData = [
    { name: 'Positif', value: data.sentiment_distribution.positive },
    { name: 'Neutre', value: data.sentiment_distribution.neutral },
    { name: 'Négatif', value: data.sentiment_distribution.negative },
  ];

  // Competitor Chart Data
  const compBarData = [
      { name: 'Vous', rating: data.average_rating, reviews: data.total_reviews },
      ...competitors.map(c => ({ name: c.name, rating: c.rating, reviews: c.review_count }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Vue d'ensemble</h1>
           <p className="text-slate-500">Suivez vos performances sur tous vos établissements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={Calendar}>30 derniers jours</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>Exporter</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Ma Performance
        </button>
        <button
            onClick={() => setActiveTab('competitors')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'competitors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Veille Concurrentielle
        </button>
      </div>

      {activeTab === 'overview' ? (
      <>
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volume d'avis</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volume_by_date}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition Sentiment</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold text-slate-900">{Math.round(data.sentiment_distribution.positive * 100)}%</span>
                <span className="text-xs text-slate-500 uppercase font-semibold">Positif</span>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Semantic Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-indigo-500" />
                    Sujets Tendances
                </CardTitle>
            </CardHeader>
            <CardContent>
                <WordCloud keywords={data.top_keywords} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Analyse par Thème</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div>
                 <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Points Forts</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Impact</span>
                 </div>
                 <div className="space-y-3">
                   {data.top_themes_positive.map(theme => (
                     <div key={theme.name} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize font-medium text-slate-700">{theme.name}</span>
                            <span className="text-slate-500">{Math.round(theme.weight * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                             <div className="bg-green-500 h-2 rounded-full" style={{ width: `${theme.weight * 100}%` }}></div>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Points Faibles</h4>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Impact</span>
                 </div>
                 <div className="space-y-3">
                   {data.top_themes_negative.map(theme => (
                     <div key={theme.name} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize font-medium text-slate-700">{theme.name}</span>
                            <span className="text-slate-500">{Math.round(theme.weight * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                             <div className="bg-red-500 h-2 rounded-full" style={{ width: `${theme.weight * 100}%` }}></div>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </CardContent>
          </Card>
      </div>

      <Card className="animate-in fade-in slide-in-from-bottom-8">
        <CardHeader>
            <CardTitle>Résumé des Insights IA</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-green-50/50 p-4 rounded-lg border border-green-100">
                   <h4 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-green-500"></span> Ce que vous faites bien
                   </h4>
                   <p className="text-sm text-green-800 leading-relaxed">{data.strengths_summary || 'Analyse en cours...'}</p>
               </div>
               <div className="bg-red-50/50 p-4 rounded-lg border border-red-100">
                   <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-red-500"></span> Où progresser
                   </h4>
                   <p className="text-sm text-red-800 leading-relaxed">{data.problems_summary || 'Analyse en cours...'}</p>
               </div>
           </div>
        </CardContent>
      </Card>
      </>
      ) : (
        // COMPETITORS TAB
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-end gap-3">
                <Button 
                    variant="primary" 
                    icon={isScanning ? Loader2 : Radio} 
                    onClick={handleAutoScan} 
                    isLoading={isScanning}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 border-none shadow-md"
                >
                    {isScanning ? 'Analyse de la zone...' : 'Scanner la zone de chalandise'}
                </Button>
                <Button variant="outline" icon={Plus} onClick={() => setShowCompModal(true)}>Ajout manuel</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Comparaison des Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compBarData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 5]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="rating" fill="#4f46e5" name="Note Moyenne" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Positionnement</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                { subject: 'Prix', A: 120, B: 110, fullMark: 150 },
                                { subject: 'Service', A: 98, B: 130, fullMark: 150 },
                                { subject: 'Accueil', A: 86, B: 130, fullMark: 150 },
                                { subject: 'Propreté', A: 99, B: 100, fullMark: 150 },
                                { subject: 'Rapidité', A: 85, B: 90, fullMark: 150 },
                            ]}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis />
                                <Radar name="Vous" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                                <Radar name="Moyenne" dataKey="B" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.6} />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Classement Local
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider text-left">
                                    <th className="py-3 px-4">Rang</th>
                                    <th className="py-3 px-4">Établissement</th>
                                    <th className="py-3 px-4">Note</th>
                                    <th className="py-3 px-4">Volume</th>
                                    <th className="py-3 px-4">Points Forts</th>
                                    <th className="py-3 px-4">Points Faibles</th>
                                    <th className="py-3 px-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[
                                    ...(competitors.length > 0 ? competitors.map((c, i) => ({ ...c, rank: 0 })) : []), 
                                    { id: 'self', name: 'Vous', rating: data.average_rating, review_count: data.total_reviews, strengths: ['Service', 'Propreté'], weaknesses: ['Prix'], rank: 0 }
                                ]
                                .sort((a,b) => b.rating - a.rating)
                                .map((comp, i) => (
                                    <tr key={comp.id || i} className={comp.name.startsWith('Vous') ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}>
                                        <td className="py-4 px-4 font-bold text-slate-400">#{i + 1}</td>
                                        <td className="py-4 px-4 font-medium text-slate-900">{comp.name}</td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-1 font-bold text-slate-800">
                                                {comp.rating} <span className="text-amber-400">★</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-slate-500">{comp.review_count} avis</td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {comp.strengths?.map(s => <Badge key={s} variant="success" className="text-[10px]">{s}</Badge>)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {comp.weaknesses?.map(w => <Badge key={w} variant="error" className="text-[10px]">{w}</Badge>)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            {!comp.name.startsWith('Vous') && (
                                                <button onClick={() => handleDeleteCompetitor(comp.id)} className="text-slate-400 hover:text-red-500">
                                                    <Trash2 className="h-4 w-4"/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {showCompModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md animate-in zoom-in-95">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                      <CardTitle>Ajouter un concurrent</CardTitle>
                      <button onClick={() => setShowCompModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                          <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Ex: Salon Prestige" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Note Moyenne</label>
                          <Input type="number" step="0.1" max="5" value={compRating} onChange={e => setCompRating(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Points Forts (séparés par virgule)</label>
                          <Input value={compStrengths} onChange={e => setCompStrengths(e.target.value)} placeholder="Service, Prix..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Points Faibles (séparés par virgule)</label>
                          <Input value={compWeaknesses} onChange={e => setCompWeaknesses(e.target.value)} placeholder="Attente, Bruit..." />
                      </div>
                      <Button className="w-full mt-2" onClick={handleAddCompetitor}>Enregistrer</Button>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};
