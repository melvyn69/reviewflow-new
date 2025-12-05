
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AnalyticsSummary, Review, SetupStatus, User } from '../types';
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
  ArrowRight,
  Plus,
  QrCode,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from '../components/ui';
import { useTranslation } from '../lib/i18n';

const KPI = ({ title, value, change, icon: Icon, trend, loading }: any) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
          ) : (
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          )}
        </div>
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {loading ? <Skeleton className="h-4 w-24" /> : (
            <>
                {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {change} <span className="text-slate-400 ml-1 font-medium">vs mois dernier</span>
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

    if (!activities || activities.length === 0) return <div className="p-6 text-center text-slate-400 text-sm">Aucune activité récente.</div>;

    return (
        <div className="space-y-0">
            {activities.map((act, i) => (
                <div key={act.id} className={`flex gap-4 p-4 hover:bg-slate-50 transition-colors ${i !== activities.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className={`mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${act.type === 'review' ? 'bg-blue-100 text-blue-600' : act.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {act.type === 'review' ? <Star className="h-4 w-4" /> : act.type === 'alert' ? <AlertCircle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="text-sm text-slate-900 font-medium">{act.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 font-medium">{act.location}</span>
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
        <Card className="mb-8 border-indigo-100 overflow-hidden relative shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${status.completionPercentage}%` }}></div>
            </div>
            <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-indigo-600" />
                            Démarrage Rapide
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Complétez ces étapes pour profiter à 100% de l'IA.</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <span className="text-3xl font-extrabold text-indigo-600">{status.completionPercentage}%</span>
                        <span className="text-xs text-slate-400 block uppercase tracking-wide font-bold">Complété</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-50">
                    {steps.map((step, i) => (
                        <div key={step.id} className={`p-4 flex items-center gap-4 transition-colors ${step.done ? 'bg-white opacity-60' : 'bg-white hover:bg-slate-50'}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 ${step.done ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                {step.done ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-bold text-sm">{i + 1}</span>}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-medium text-sm ${step.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{step.label}</h4>
                                <p className="text-xs text-slate-500">{step.desc}</p>
                            </div>
                            {!step.done && (
                                <Button size="xs" variant="outline" onClick={step.action} className="whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200">
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
  const [user, setUser] = useState<User | null>(null);
  const [skipOnboarding, setSkipOnboarding] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
    api.auth.getUser().then(setUser);
    const skipped = localStorage.getItem('skip_onboarding');
    if (skipped) setSkipOnboarding(true);
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Execute independently to avoid one failure blocking everything
      const org = await api.organization.get().catch(() => null);
      
      let analyticsData, reviewsData, status;
      
      if (org) {
          analyticsData = await api.analytics.getOverview(period).catch(() => null);
          reviewsData = await api.reviews.list({}).catch(() => []);
          status = await api.onboarding.checkStatus().catch(() => null);
          
          if (org.locations?.length > 0) {
              setRealLocationId(org.locations[0].id);
          }
      }

      setStats(analyticsData);
      setSetupStatus(status);
      
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

  const handleSkip = () => {
      setSkipOnboarding(true);
      localStorage.setItem('skip_onboarding', 'true');
  };

  const openFunnel = () => {
      if (realLocationId) {
          window.open(`#/feedback/${realLocationId}`, '_blank');
      } else {
          toast.error("Aucun établissement configuré.");
          navigate('/settings');
      }
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return t('dashboard.greeting_morning');
      if (hour < 18) return t('dashboard.greeting_afternoon');
      return t('dashboard.greeting_evening');
  };

  // Logic for empty state or new account
  const isGoogleConnected = setupStatus?.googleConnected;
  
  if (!loading && !isGoogleConnected && !skipOnboarding) {
      return (
          <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-2xl overflow-hidden relative min-h-[70vh] flex items-center justify-center">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <CardContent className="p-8 md:p-12 text-center relative z-10 max-w-2xl">
                  <div className="bg-white/20 p-5 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8 backdrop-blur-md shadow-inner ring-1 ring-white/30">
                      <Rocket className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-5xl font-extrabold mb-6 tracking-tight">Bienvenue sur Reviewflow</h2>
                  <p className="text-indigo-100 text-xl mb-12 leading-relaxed">
                      L'IA est prête à booster votre e-réputation. <br/> Connectez votre fiche Google pour commencer la magie.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                      <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 border-none px-10 py-7 text-lg shadow-xl hover:scale-105 transition-transform font-bold" onClick={() => navigate('/settings')}>
                          <UploadCloud className="mr-3 h-6 w-6" /> Connecter Google Business
                      </Button>
                      <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-7 text-lg backdrop-blur-sm" onClick={handleSeedData} isLoading={seeding}>
                          Mode Démo
                      </Button>
                  </div>
                  <div className="mt-8">
                      <button onClick={handleSkip} className="text-sm text-indigo-200 hover:text-white underline">
                          Accéder au dashboard sans connexion (Mode manuel)
                      </button>
                  </div>
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header with Greeting and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {getGreeting()}, <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'Chef'}</span> 👋
          </h1>
          <p className="text-slate-500">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                {['7j', '30j', 'Trimestre'].map((p) => (
                    <button 
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === p ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/collect')} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group">
              <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <QrCode className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-900 text-sm">{t('dashboard.actions.qrcode')}</div>
              <div className="text-xs text-slate-500">{t('dashboard.actions.print')}</div>
          </button>
          <button onClick={openFunnel} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-green-300 hover:shadow-md transition-all text-left group">
              <div className="bg-green-50 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ExternalLink className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-900 text-sm">{t('dashboard.actions.funnel')}</div>
              <div className="text-xs text-slate-500">{t('dashboard.actions.link')}</div>
          </button>
          <button onClick={() => navigate('/inbox')} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group">
              <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-900 text-sm">{t('dashboard.actions.reply')}</div>
              <div className="text-xs text-slate-500">{t('dashboard.actions.inbox')}</div>
          </button>
          <button onClick={() => navigate('/social')} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-pink-300 hover:shadow-md transition-all text-left group">
              <div className="bg-pink-50 text-pink-600 w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-900 text-sm">{t('dashboard.actions.social')}</div>
              <div className="text-xs text-slate-500">{t('dashboard.actions.create')}</div>
          </button>
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
            <Card className="border-l-4 border-l-amber-400">
                <CardHeader className="border-b border-slate-100 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        {t('dashboard.urgent')}
                        <Badge variant="neutral" className="ml-auto">{urgentReviews.length} {t('dashboard.urgent_sub')}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {urgentReviews.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {urgentReviews.map(review => (
                                <div 
                                    key={review.id} 
                                    className="p-4 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer group" 
                                    onClick={() => navigate(`/inbox?reviewId=${review.id}`)}
                                >
                                    <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-amber-100">
                                        {review.rating}★
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-sm font-bold text-slate-900 truncate">{review.author_name}</h4>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(review.received_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-1">{review.body}</p>
                                    </div>
                                    <Button size="xs" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {t('dashboard.actions.reply')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center">
                            <div className="bg-green-50 p-3 rounded-full mb-3">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="font-medium text-slate-900">{t('dashboard.all_good')}</p>
                            <p className="text-slate-400">{t('dashboard.no_urgent')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Insights Summary */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-green-50/50 border-green-100">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <h4 className="text-sm font-bold text-green-900 uppercase tracking-wide">{t('dashboard.strengths')}</h4>
                            </div>
                            <p className="text-sm text-green-800 leading-relaxed">{stats.strengths_summary || t('dashboard.analyzing')}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50/50 border-red-100">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">{t('dashboard.weaknesses')}</h4>
                            </div>
                            <p className="text-sm text-red-800 leading-relaxed">{stats.problems_summary || t('dashboard.analyzing')}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>

        <div className="space-y-6">
            {/* Live Feed */}
            <Card className="h-full flex flex-col border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        <Activity className="h-4 w-4" /> {t('dashboard.activity')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <ActivityFeed />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};
