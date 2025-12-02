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
  UploadCloud, // CORRECTION : Bon nom d'icône
  Rocket, 
  ExternalLink,
  Activity, 
  Zap, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';
import { useHistory } from 'react-router-dom';

const KPI = ({ title, value, change, icon: Icon, trend }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {change} <span className="text-slate-400 ml-1">vs mois dernier</span>
      </div>
    </CardContent>
  </Card>
);

const ActivityFeed = () => {
    const [activities, setActivities] = useState<any[]>([]);
    
    useEffect(() => {
        api.activity.getRecent().then((data) => setActivities(data || []));
    }, []);

    if (!activities || activities.length === 0) return <div className="p-4"><Skeleton className="h-8 w-full mb-2" /><Skeleton className="h-8 w-full" /></div>;

    return (
        <div className="space-y-4">
            {activities.map((act) => (
                <div key={act.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${act.type === 'review' ? 'bg-blue-100 text-blue-600' : act.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {act.type === 'review' ? <Star className="h-4 w-4" /> : act.type === 'alert' ? <AlertCircle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="text-sm text-slate-900 font-medium">{act.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{act.location}</span>
                            <span className="text-[10px] text-slate-400">• {act.time}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

const SetupProgress = ({ status }: { status: SetupStatus | null }) => {
    const history = useHistory();
    if (!status) return null;
    if (status.completionPercentage === 100) return null;

    return (
        <Card className="bg-gradient-to-r from-indigo-50 to-white border-indigo-100 mb-8">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 flex items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-indigo-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            <path className="text-indigo-600 drop-shadow-sm transition-all duration-1000 ease-out" strokeDasharray={`${status.completionPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        </svg>
                        <span className="absolute text-sm font-bold text-indigo-700">{status.completionPercentage}%</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900 text-lg">Configuration du compte</h3>
                        <p className="text-indigo-600/80 text-sm">Complétez votre profil pour activer l'IA.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {!status.googleConnected && (
                        <Button size="sm" variant="outline" className="bg-white border-indigo-200 text-indigo-700" onClick={() => history.push('/settings')}>
                            Connecter Google
                        </Button>
                    )}
                    {!status.brandVoiceConfigured && (
                        <Button size="sm" variant="outline" className="bg-white border-indigo-200 text-indigo-700" onClick={() => history.push('/settings')}>
                            Définir Voix de Marque
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<Review[]>([]);
  const [period, setPeriod] = useState('30j');
  const [seeding, setSeeding] = useState(false);
  const [demoLocationId, setDemoLocationId] = useState<string>('');
  
  const toast = useToast();
  const history = useHistory();

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const [analyticsData, reviewsData, status, org] = await Promise.all([
        api.analytics.getOverview(period),
        api.reviews.list({}),
        api.onboarding.checkStatus(),
        api.organization.get()
      ]);
      
      setStats(analyticsData);
      setSetupStatus(status);
      
      if (org && org.locations?.length > 0) {
          setDemoLocationId(org.locations[0].id);
      }
      
      // Filter for "Urgent": Low rating + Pending/Draft
      const urgent = (reviewsData || [])
        .filter(r => r.rating <= 3 && (r.status === 'pending' || r.status === 'draft'))
        .slice(0, 5);
      setUrgentReviews(urgent);
    } catch (e) {
      console.error("Dashboard Load Error", e);
    }
  };

  const handleSeedData = async () => {
      setSeeding(true);
      try {
          await api.seedCloudDatabase();
          toast.success("Données envoyées avec succès !");
          await loadData();
      } catch (error: any) {
          toast.error("Erreur: " + error.message);
      } finally {
          setSeeding(false);
      }
  };

  const isNewAccount = !stats || stats.total_reviews === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">Bienvenue, voici ce qui se passe aujourd'hui.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            {['7j', '30j', 'Trimestre'].map((p) => (
                <button 
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {p}
                </button>
            ))}
        </div>
      </div>

      {isNewAccount ? (
          <Card className="bg-indigo-600 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <CardContent className="p-8 md:p-12 text-center relative z-10">
                  <Rocket className="h-16 w-16 mx-auto mb-6 text-indigo-200" />
                  <h2 className="text-3xl font-bold mb-4">Bienvenue sur Reviewflow !</h2>
                  <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">
                      Votre tableau de bord est vide car vous n'avez pas encore connecté de source d'avis. 
                      Pour découvrir la puissance de l'outil maintenant, nous pouvons injecter des données de démonstration.
                  </p>
                  <Button size="lg" icon={UploadCloud} onClick={handleSeedData} isLoading={seeding} className="bg-white text-indigo-600 hover:bg-indigo-50 border-none px-8 shadow-xl">
                      Initialiser les Données Démo
                  </Button>
                  <p className="mt-4 text-xs text-indigo-300">Cela créera des faux avis, clients et statistiques pour tester l'interface.</p>
              </CardContent>
          </Card>
      ) : (
        <>
          <SetupProgress status={setupStatus} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI title="Note Moyenne" value={stats?.average_rating + '/5'} change="+0.2" icon={Star} trend="up" />
            <KPI title="Avis non lus" value={urgentReviews.length} change="-5" icon={MessageSquare} trend="up" />
            <KPI title="Temps de réponse" value="12h" change="-2h" icon={Clock} trend="up" />
            <KPI title="Sentiment Positif" value={(stats ? Math.round(stats.sentiment_distribution.positive * 100) : 0) + '%'} change="+4%" icon={Activity} trend="up" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                {/* Urgent Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            À traiter en priorité
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {urgentReviews.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {urgentReviews.map(review => (
                                    <div key={review.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer" onClick={() => history.push('/inbox')}>
                                        <div className="h-10 w-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                                            {review.rating}★
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-semibold text-slate-900 truncate">{review.author_name}</h4>
                                                <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(review.received_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-1">{review.body}</p>
                                        </div>
                                        <Button size="xs" variant="outline">Répondre</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                Tout est à jour ! Aucune urgence.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Demo Shortcuts Card */}
                <Card className="bg-indigo-900 text-white border-none">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            Raccourcis Démo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                             onClick={() => window.open(`#/feedback/${demoLocationId || 'loc1'}`, '_blank')}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold">Funnel Public</h4>
                                <ExternalLink className="h-4 w-4 text-indigo-300" />
                            </div>
                            <p className="text-xs text-indigo-200">Voir la page de collecte que voient vos clients.</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                             onClick={() => history.push('/admin')}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold">Super Admin</h4>
                                <ShieldAlert className="h-4 w-4 text-red-300" />
                            </div>
                            <p className="text-xs text-indigo-200">Accéder au tableau de bord de gestion SaaS.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {/* Live Feed */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-slate-500">
                            <Activity className="h-4 w-4" /> Flux d'activité
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                            <ActivityFeed />
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};