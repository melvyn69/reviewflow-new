
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AnalyticsSummary, Review, SetupStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, useToast } from '../components/ui';
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Star, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  ChevronDown,
  Calendar,
  Activity,
  Zap,
  CheckCircle2,
  CloudUpload,
  Rocket,
  ExternalLink,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

const KPI = ({ title, value, trend, trendLabel, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className={`flex items-center font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          {Math.abs(trend)}%
        </span>
        <span className="text-slate-500 ml-2">{trendLabel}</span>
      </div>
    </CardContent>
  </Card>
);

const SetupProgress = ({ status }: { status: SetupStatus }) => (
  <Card className="mb-6 border-indigo-100 bg-indigo-50/50">
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Guide de Démarrage
        </h3>
        <span className="font-bold text-indigo-600">{status.completionPercentage}%</span>
      </div>
      <div className="w-full bg-indigo-200 rounded-full h-2 mb-6">
        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${status.completionPercentage}%` }}></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status.googleConnected ? 'bg-white border-green-200' : 'bg-white border-slate-200 opacity-70'}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${status.googleConnected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {status.googleConnected ? <CheckCircle2 className="h-4 w-4" /> : '1'}
          </div>
          <span className={`text-sm font-medium ${status.googleConnected ? 'text-green-800' : 'text-slate-600'}`}>Connecter Google</span>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status.brandVoiceConfigured ? 'bg-white border-green-200' : 'bg-white border-slate-200 opacity-70'}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${status.brandVoiceConfigured ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {status.brandVoiceConfigured ? <CheckCircle2 className="h-4 w-4" /> : '2'}
          </div>
          <span className={`text-sm font-medium ${status.brandVoiceConfigured ? 'text-green-800' : 'text-slate-600'}`}>Configurer l'IA</span>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status.firstReviewReplied ? 'bg-white border-green-200' : 'bg-white border-slate-200 opacity-70'}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${status.firstReviewReplied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {status.firstReviewReplied ? <CheckCircle2 className="h-4 w-4" /> : '3'}
          </div>
          <span className={`text-sm font-medium ${status.firstReviewReplied ? 'text-green-800' : 'text-slate-600'}`}>Répondre à un avis</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
        <div className="flex justify-between items-center h-10 mb-6">
            <div className="w-48 h-8 bg-slate-200 rounded"></div>
            <div className="w-64 h-8 bg-slate-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 h-40">
                    <div className="flex justify-between mb-4">
                        <div className="w-20 h-4 bg-slate-200 rounded"></div>
                        <div className="w-10 h-10 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-16 h-8 bg-slate-200 rounded mb-4"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6"></div>
            <div className="bg-white rounded-xl border border-slate-100 p-6"></div>
        </div>
    </div>
);

const ActivityFeed = () => {
    const [activities, setActivities] = useState<any[]>([]);
    
    useEffect(() => {
        api.activity.getRecent().then(setActivities);
    }, []);

    if (activities.length === 0) return <div className="p-4"><Skeleton className="h-8 w-full mb-2" /><Skeleton className="h-8 w-full" /></div>;

    const getIcon = (type: string) => {
        switch(type) {
            case 'review': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'reply': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'alert': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'workflow': return <Zap className="h-4 w-4 text-amber-500" />;
            default: return <Activity className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-4">
            {activities.map((item) => (
                <div key={item.id} className="flex gap-3 items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="mt-1 shrink-0 p-1.5 bg-slate-50 rounded-full border border-slate-100">
                        {getIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">{item.time}</span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-500 truncate">{item.location}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const DashboardPage = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<Review[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [period, setPeriod] = useState('last_30_days');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [demoLocationId, setDemoLocationId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadData();
    api.auth.getUser().then(u => setUserEmail(u?.email || ''));
  }, [period]);

  const loadData = async () => {
    // Simulate slight delay for skeleton demo
    const [analyticsData, reviewsData, status, org] = await Promise.all([
      api.analytics.getOverview(period),
      api.reviews.list({}),
      api.onboarding.checkStatus(),
      api.organization.get()
    ]);
    
    setStats(analyticsData);
    setSetupStatus(status);
    
    // Add optional chaining here
    if (org && org.locations?.length > 0) {
        setDemoLocationId(org.locations[0].id);
    }
    
    // Filter for "Urgent": Low rating + Pending/Draft
    const urgent = (reviewsData || [])
      .filter(r => r.rating <= 3 && (r.status === 'pending' || r.status === 'draft'))
      .slice(0, 5);
    setUrgentReviews(urgent);
  };

  const handleSeedData = async () => {
      setSeeding(true);
      try {
          await api.seedCloudDatabase();
          toast.success("Données injectées avec succès !");
          await loadData(); // Refresh dashboard
      } catch (e: any) {
          toast.error("Erreur: " + e.message);
      } finally {
          setSeeding(false);
      }
  }

  if (!stats) return <DashboardSkeleton />;

  // --- EMPTY STATE (ONBOARDING) ---
  if (stats.total_reviews === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-3xl mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500 p-4">
              <div className="h-24 w-24 bg-indigo-50 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Rocket className="h-12 w-12 text-indigo-600" />
              </div>
              <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-3">Bienvenue sur Reviewflow</h1>
                  <p className="text-lg text-slate-500 max-w-lg mx-auto">
                      Votre base de données est actuellement vide. Pour voir la puissance de la gestion d'avis par IA, injectons des données de démonstration.
                  </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                   <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                       <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center mb-4 mx-auto text-green-600">
                           <MessageSquare className="h-6 w-6" />
                       </div>
                       <h3 className="font-bold text-slate-900 mb-1">Avis</h3>
                       <p className="text-sm text-slate-500">Injecte 3 avis exemples</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                       <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 mx-auto text-blue-600">
                           <Activity className="h-6 w-6" />
                       </div>
                       <h3 className="font-bold text-slate-900 mb-1">Statistiques</h3>
                       <p className="text-sm text-slate-500">Génère des tendances</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                       <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center mb-4 mx-auto text-amber-600">
                           <Zap className="h-6 w-6" />
                       </div>
                       <h3 className="font-bold text-slate-900 mb-1">Automatisation</h3>
                       <p className="text-sm text-slate-500">Configure des workflows</p>
                   </div>
              </div>

              <Button size="lg" icon={CloudUpload} onClick={handleSeedData} isLoading={seeding} className="px-8 shadow-xl shadow-indigo-200 w-full md:w-auto">
                  Initialiser les Données Démo
              </Button>
              
              <p className="text-xs text-slate-400">
                  Ceci peuplera votre base Supabase avec des données de test sécurisées.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">Vue d'ensemble de votre réputation sur tous les sites.</p>
        </div>
        <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-max">
            <Button 
                    variant={period === 'last_7_days' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('last_7_days')}
                    className={period === 'last_7_days' ? 'shadow-sm' : 'text-slate-600'}
                >
                    7 jours
                </Button>
            <Button 
                    variant={period === 'last_30_days' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('last_30_days')}
                    className={period === 'last_30_days' ? 'shadow-sm' : 'text-slate-600'}
                >
                    30 jours
                </Button>
            <Button 
                    variant={period === 'last_90_days' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('last_90_days')}
                    className={period === 'last_90_days' ? 'shadow-sm' : 'text-slate-600'}
                >
                    Ce trimestre
                </Button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <Button variant="ghost" size="sm" icon={Calendar}>Perso</Button>
            </div>
        </div>
      </div>

      {setupStatus && setupStatus.completionPercentage < 100 && (
          <SetupProgress status={setupStatus} />
      )}

      {/* DEMO SHORTCUTS */}
      <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="py-4 border-slate-800 flex justify-between items-center">
              <CardTitle className="text-sm font-mono text-indigo-400 flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Raccourcis Démo (Mode Dev)
              </CardTitle>
          </CardHeader>
          <CardContent className="py-4 pt-0 flex flex-wrap gap-4">
              <a 
                href={`#/feedback/${demoLocationId || 'loc_missing'}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center gap-2 text-sm transition-colors bg-slate-800 px-3 py-2 rounded-lg border hover:border-indigo-500 ${!demoLocationId ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                onClick={e => !demoLocationId && e.preventDefault()}
              >
                  <ExternalLink className="h-4 w-4" />
                  {demoLocationId ? 'Ouvrir Funnel Public' : 'Chargement...'}
              </a>
              
              <button 
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-sm text-red-300 hover:text-white transition-colors bg-red-900/20 px-3 py-2 rounded-lg border border-red-900 hover:border-red-500"
              >
                  <ShieldAlert className="h-4 w-4" />
                  Super Admin
              </button>

              <button 
                onClick={() => api.auth.logout().then(() => window.location.reload())}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 hover:border-red-500"
              >
                  <ArrowRight className="h-4 w-4" />
                  Voir Landing Page (Déconnexion)
              </button>
          </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          title="Volume d'avis" 
          value={stats.total_reviews} 
          trend={12.5} 
          trendLabel="vs période préc." 
          icon={MessageSquare} 
          color="indigo" 
        />
        <KPI 
          title="Note Moyenne" 
          value={stats.average_rating} 
          trend={2.1} 
          trendLabel="vs période préc." 
          icon={Star} 
          color="green" 
        />
        <KPI 
          title="Temps de réponse" 
          value="14h" 
          trend={-8.4} 
          trendLabel="vs période préc." 
          icon={Clock} 
          color="blue" 
        />
        <KPI 
          title="Actions en attente" 
          value={urgentReviews.length} 
          trend={-5} 
          trendLabel="vs hier" 
          icon={AlertCircle} 
          color="red" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Chart */}
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tendances et Sentiment</CardTitle>
            <div className="flex gap-2">
                <span className="flex items-center text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>Volume</span>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.volume_by_date} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card className="flex flex-col h-full min-h-[300px]">
            <CardHeader className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    Flux en direct
                </CardTitle>
                <div className="flex gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[350px]">
                <ActivityFeed />
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action Center */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                <span>Nécessite Attention</span>
                <Badge variant="error">{urgentReviews.length} Critiques</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
                {urgentReviews.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                        <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center mb-2">
                            <Star className="h-6 w-6 text-green-500" />
                        </div>
                        <p>Tout est calme ! Aucun avis urgent.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                    {urgentReviews.map(review => (
                        <div 
                            key={review.id} 
                            onClick={() => navigate('/inbox')}
                            className="group flex gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                        >
                        <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-white text-xs ${review.source === 'google' ? 'bg-blue-500' : 'bg-green-600'}`}>
                                {review.source.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                                <h4 className="text-sm font-semibold text-slate-900 truncate">{review.author_name}</h4>
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{review.body}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="neutral" className="text-[10px] px-1.5 py-0 h-5">
                                    {review.analysis?.themes[0] || 'Problème'}
                                </Badge>
                                <span className="text-xs text-red-500 font-medium hidden sm:inline">Non répondu</span>
                            </div>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                <Button variant="ghost" className="w-full mt-4 text-indigo-600 hover:text-indigo-700 hover:bg-transparent" onClick={() => navigate('/inbox')}>
                    Voir la Boîte de réception <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-xl shadow-indigo-200">
              <CardContent className="flex flex-col h-full justify-between p-8">
                  <div>
                    <Badge className="bg-white/20 text-white border-none mb-4 backdrop-blur-sm">Conseil Pro</Badge>
                    <h3 className="text-2xl font-bold mb-2">Automatisez votre succès</h3>
                    <p className="text-indigo-100 text-sm leading-relaxed max-w-sm">
                        Vous avez 12 avis éligibles à l'automatisation. Activez le workflow "Réponse Auto 5 Étoiles" pour gagner 3h cette semaine.
                    </p>
                  </div>
                  <Button className="bg-white text-indigo-600 hover:bg-indigo-50 border-none w-fit mt-6" onClick={() => navigate('/automation')}>
                      Voir les Workflows
                  </Button>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};
