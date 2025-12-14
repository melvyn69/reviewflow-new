import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  AnalyticsSummary,
  Review,
  User,
  ClientProgress,
  AiCoachMessage,
  Organization,
} from '../types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  useToast,
} from '../components/ui';
import {
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  Activity,
  Zap,
  CheckCircle2,
  ArrowRight,
  QrCode,
  Sparkles,
  RefreshCw,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from '../components/ui';
import { useTranslation } from '../lib/i18n';

// ----------------------
// Small UI helpers
// ----------------------

const CoachWidget = ({
  progress,
  coachMessage,
}: {
  progress: ClientProgress;
  coachMessage?: AiCoachMessage;
}) => {
  if (!coachMessage) return <Skeleton className="h-40 w-full rounded-2xl" />;

  return (
    <Card className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white border-none shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Trophy className="h-32 w-32" />
      </div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

      <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">
              Coach ReviewFlow
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2">{coachMessage.title}</h3>
          <p className="text-indigo-100 text-sm leading-relaxed max-w-xl">
            {coachMessage.message}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 min-w-[140px]">
          <span className="text-xs font-bold text-indigo-200 uppercase">Score Global</span>
          <div className="text-4xl font-black text-white">{progress?.score ?? 0}%</div>
          <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-green-400 h-full transition-all duration-1000"
              style={{ width: `${progress?.score ?? 0}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActionCenter = ({
  actions,
}: {
  actions?: ClientProgress['next_actions'];
}) => {
  const navigate = useNavigate();

  // ✅ anti-crash
  const safeActions = Array.isArray(actions) ? actions : [];
  if (safeActions.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-indigo-900">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          Actions Recommandées
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {safeActions.map((action: any) => (
            <div
              key={action.id}
              className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all cursor-pointer"
              onClick={() => action?.action_link && navigate(action.action_link)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    action.impact === 'high' ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'
                  }`}
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const AlertBanner = ({
  progress,
  organization,
}: {
  progress?: ClientProgress | null;
  organization?: Organization | null;
}) => {
  const navigate = useNavigate();

  // ✅ anti-crash (organization peut être null)
  const googleConnected = Boolean(
    organization?.integrations?.google ||
      (organization as any)?.google_connected ||
      (organization as any)?.integrations?.google_connected
  );

  // ✅ anti-crash (steps peut être undefined)
  const progressSaysGoogleConnected = Boolean(progress?.steps?.google_connected);

  // On considère connecté si l’un des deux le dit
  const isConnected = googleConnected || progressSaysGoogleConnected;

  if (!isConnected) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mb-6 animate-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Connexion Google manquante</h4>
            <p className="text-xs text-amber-800">
              Vous ne pouvez pas recevoir d’avis sans connecter votre fiche.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white border-none"
          onClick={() => navigate('/settings?tab=integrations')}
        >
          Connecter
        </Button>
      </div>
    );
  }

  return null;
};

const KPI = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  loading,
}: any) => (
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
        <div
          className={`p-3 rounded-xl ${
            trend === 'up' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div
        className={`flex items-center text-xs font-bold ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            <TrendingUp className="h-3 w-3 mr-1" />
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
    api.activity.getRecent().then((data) => setActivities(Array.isArray(data) ? data : []));
  }, []);

  if (!activities || activities.length === 0) {
    return <div className="p-6 text-center text-slate-400 text-sm">Aucune activité récente.</div>;
  }

  return (
    <div className="space-y-0">
      {activities.map((act, i) => (
        <div
          key={act.id ?? i}
          className={`flex gap-4 p-4 hover:bg-slate-50 transition-colors ${
            i !== activities.length - 1 ? 'border-b border-slate-50' : ''
          }`}
        >
          <div className="mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm bg-blue-100 text-blue-600">
            <Star className="h-4 w-4" />
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
  );
};

// ----------------------
// Page
// ----------------------

export const DashboardPage = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [urgentReviews, setUrgentReviews] = useState<Review[]>([]);
  const [period] = useState('30j');
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const [progress, setProgress] = useState<ClientProgress | null>(null);
  const [coachMessage, setCoachMessage] = useState<AiCoachMessage | undefined>(undefined);

  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    void loadData(false);
    api.auth.getUser().then(setUser);
    api.organization.get().then(setOrganization);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      const [analyticsData, reviewsData, progressData, orgData] = await Promise.all([
        api.analytics.getOverview(period).catch(() => null),
        api.reviews.list({}).catch(() => []),
        api.progression.get().catch(() => null),
        api.organization.get().catch(() => null),
      ]);

      setStats(analyticsData);
      setProgress(progressData);
      setOrganization(orgData);

      if (progressData) {
        api.ai.getCoachAdvice(progressData).then((msg) => setCoachMessage(msg));
      } else {
        setCoachMessage(undefined);
      }

      const safeReviews = Array.isArray(reviewsData) ? reviewsData : [];
      const urgent = safeReviews
        .filter((r: any) => (r?.rating ?? 5) <= 3 && (r?.status === 'pending' || r?.status === 'draft'))
        .slice(0, 5);

      setUrgentReviews(urgent);

      if (isRefresh) toast.success('Données actualisées !');
    } catch (e) {
      console.error('Dashboard Load Error', e);
    } finally {
      setLoading(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting_morning');
    if (hour < 18) return t('dashboard.greeting_afternoon');
    return t('dashboard.greeting_evening');
  }, [t]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {greeting},{' '}
            <span className="text-indigo-600">{user?.name?.split(' ')?.[0] || 'Chef'}</span> 👋
          </h1>
          <p className="text-slate-500">{t('dashboard.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData(true)}
            className="text-slate-400 hover:text-indigo-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertBanner progress={progress} organization={organization} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {progress && <CoachWidget progress={progress} coachMessage={coachMessage} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <KPI
              title={t('kpi.rating')}
              value={stats?.average_rating ? `${stats.average_rating}/5` : '-'}
              change="+0.1"
              icon={Star}
              trend="up"
              loading={loading}
            />
            <KPI
              title={t('kpi.response')}
              value={typeof stats?.response_rate === 'number' ? `${stats.response_rate}%` : '-'}
              change="+5%"
              icon={MessageSquare}
              trend="up"
              loading={loading}
            />
          </div>

          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                {t('dashboard.urgent')}
                <Badge variant="neutral" className="ml-auto">
                  {(urgentReviews?.length ?? 0)} {t('dashboard.urgent_sub')}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {(urgentReviews?.length ?? 0) > 0 ? (
                <div className="divide-y divide-slate-50">
                  {urgentReviews.map((review: any) => (
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
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {review.author_name}
                          </h4>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {review.received_at
                              ? new Date(review.received_at).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-1">
                          {review.body ?? review.text ?? ''}
                        </p>
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
        </div>

        <div className="space-y-6">
          {/* ✅ anti-crash: on envoie toujours un array */}
          <ActionCenter actions={progress?.next_actions ?? []} />

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/collect')}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group"
            >
              <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="font-bold text-slate-900 text-xs">{t('dashboard.actions.qrcode')}</span>
            </button>

            <button
              onClick={() => navigate('/inbox')}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group"
            >
              <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="font-bold text-slate-900 text-xs">{t('dashboard.actions.inbox')}</span>
            </button>
          </div>

          <Card className="flex flex-col border-slate-200 shadow-sm flex-1">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Activity className="h-4 w-4" /> {t('dashboard.activity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <ActivityFeed />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
