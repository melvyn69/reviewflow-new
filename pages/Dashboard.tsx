
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
  UploadCloud, 
  Rocket, 
  ExternalLink,
  Activity, 
  Zap, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from '../components/ui';
import { useTranslation } from '../lib/i18n';

const KPI = ({ title, value, change, icon: Icon, trend, loading }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
          ) : (
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
          )}
        </div>
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {loading ? <Skeleton className="h-4 w-24" /> : (
            <>
                {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {change} <span className="text-slate-400 ml-1">vs mois dernier</span>
            </>
        )}
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
    const navigate = useNavigate();
    if (!status || status.completionPercentage === 100) return null;

    const steps = [
        {
            id: 'google',
            label: 'Connecter Google Business Profile',
            desc: 'Pour récupérer vos avis existants.',
            done: status.googleConnected,
            action: () => navigate('/settings'),
            btn: 'Connecter'
        },
        {
            id: 'brand',
            label: 'Définir votre Identité IA',
            desc: 'Configurez le ton et le style de vos réponses.',
            done: status.brandVoiceConfigured,
            action: () => navigate('/settings'),
            btn: 'Configurer'
        },
        {
            id: 'first_reply',
            label: 'Répondre à un premier avis',
            desc: 'Testez la génération de réponse IA.',
            done: status.firstReviewReplied,
            action: () => navigate('/inbox'),
            btn: 'Aller aux avis'
        }
    ];

    return (
        <Card className="mb-8 border-indigo-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${status.completionPercentage}%` }}></div>
            </div>
            <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-white border-b border-indigo-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-indigo-600" />
                            Démarrage Rapide
                        </h3>
                        <p className="text-slate-500 text-sm">Complétez ces étapes pour profiter à 100% de l'IA.</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <span className="text-2xl font-bold text-indigo-600">{status.completionPercentage}%</span>
                        <span className="text-xs text-slate-400 block uppercase tracking-wide">Complété</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-50">
                    {steps.map((step, i) => (
                        <div key={step.id} className={`p-4 flex items-center gap-4 transition-colors ${step.done ? 'bg-white opacity-50' : 'bg-white hover:bg-slate-50'}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 ${step.done ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                {step.done ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-bold text-sm">{i + 1}</span>}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-medium text-sm ${step.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{step.label}</h4>
                                <p className="text-xs text-slate-500">{step.desc}</p>
                            </div>
                            {!step.done && (
                                <Button size="xs" variant="outline" onClick={step.action} className="whitespace-nowrap">
                                    {step.btn} <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<Review[]>([]);
  const [period, setPeriod] = useState('30j');
  const [seeding, setSeeding] = useState(false);
  const [realLocationId, setRealLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
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
          setRealLocationId(org.locations[0].id);
      }
      
      // Filter for "Urgent": Low rating + Pending/Draft
      const urgent = (reviewsData || [])
        .filter(r => r.rating <= 3 && (r.status === 'pending' || r.status === 'draft'))
        .slice(0, 5);
      setUrgentReviews(urgent);
    } catch (e) {
      console.error("Dashboard Load Error", e);
    } finally {
        setLoading(false);
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

  const openFunnel = () => {
      if (realLocationId) {
          window.open(`#/feedback/${realLocationId}`, '_blank');
      } else {
          toast.error("Aucun établissement configuré.");
          navigate('/settings');
      }
  };

  // Logic for empty state or new account
  const isGoogleConnected = setupStatus?.googleConnected;
  
  // Show big empty state if Google is NOT connected, regardless of stats
  if (!loading && !isGoogleConnected) {
      return (
          <Card className="bg-indigo-600 text-white border-none shadow-xl overflow-hidden relative min-h-[60vh] flex items-center justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <CardContent className="p-8 md:p-12 text-center relative z-10 max-w-2xl">
                  <div className="bg-white/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <Rocket className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-4xl font-extrabold mb-4">Bienvenue sur Reviewflow !</h2>
                  <p className="text-indigo-100 text-xl mb-10 leading-relaxed">
                      Pour commencer à automatiser vos réponses et booster votre note, nous devons synchroniser vos avis existants.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                      <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 border-none px-10 py-6 text-lg shadow-xl hover:scale-105 transition-transform" onClick={() => navigate('/settings')}>
                          <UploadCloud className="mr-2 h-6 w-6" /> Connecter Google Business
                      </Button>
                      <Button size="lg" variant="outline" className="text-white border-indigo-300 hover:bg-indigo-700/50 py-6 text-lg" onClick={handleSeedData} isLoading={seeding}>
                          Mode Démo (Données Test)
                      </Button>
                  </div>
                  <p className="mt-8 text-xs text-indigo-300 opacity-80">
                      Connexion sécurisée via l'API officielle Google. Aucun mot de passe requis.
                  </p>
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">Bienvenue, voici vos performances en temps réel.</p>
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

      <SetupProgress status={setupStatus} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI title={t('kpi.rating')} value={stats?.average_rating ? stats.average_rating + '/5' : '-'} change="+0.1" icon={Star} trend="up" loading={loading} />
        <KPI title={t('kpi.response')} value={stats?.response_rate + '%'} change="+5%" icon={MessageSquare} trend="up" loading={loading} />
        <KPI title={t('kpi.nps')} value={stats?.nps_score} change="+2" icon={Clock} trend="up" loading={loading} />
        <KPI title={t('kpi.sentiment')} value={(stats ? Math.round(stats.sentiment_distribution.positive * 100) : 0) + '%'} change="+4%" icon={Activity} trend="up" loading={loading} />
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
                                <div 
                                    key={review.id} 
                                    className="p-4 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer" 
                                    onClick={() => navigate(`/inbox?reviewId=${review.id}`)}
                                >
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

            {/* Shortcuts Card */}
            <Card className="bg-indigo-900 text-white border-none">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        Accès Rapides
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                            onClick={openFunnel}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold">Formulaire de Collecte</h4>
                            <ExternalLink className="h-4 w-4 text-indigo-300" />
                        </div>
                        <p className="text-xs text-indigo-200">Page publique pour vos clients.</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                            onClick={() => navigate('/collect')}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold">QR Code</h4>
                            <Zap className="h-4 w-4 text-yellow-300" />
                        </div>
                        <p className="text-xs text-indigo-200">Imprimer l'affiche comptoir.</p>
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
    </div>
  );
};
