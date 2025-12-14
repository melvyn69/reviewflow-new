
import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardTitle, CardHeader, Button, Badge, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { AnalyticsSummary } from '../types';
import { Download, Calendar, Cloud } from 'lucide-react';

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
  const toast = useToast();

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      const analytics = await api.analytics.getOverview();
      setData(analytics);
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

  if (!data) return <div className="p-8 text-center text-slate-500">Chargement des statistiques...</div>;

  const pieData = [
    { name: 'Positif', value: data.sentiment_distribution.positive },
    { name: 'Neutre', value: data.sentiment_distribution.neutral },
    { name: 'Négatif', value: data.sentiment_distribution.negative },
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
    </div>
  );
};
