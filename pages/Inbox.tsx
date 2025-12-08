
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Review, ReviewStatus, InternalNote, SavedReply, Location, ReviewTimelineEvent, Organization } from '../types';
import { Card, CardContent, Skeleton, useToast, Button, Badge } from '../components/ui';
import { SocialShareModal } from '../components/SocialShareModal';
import { InboxFocusMode } from '../components/InboxFocusMode';
import { 
  Star, 
  MessageCircle, 
  MapPin, 
  MoreHorizontal, 
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Send,
  Wand2,
  ArrowLeft,
  MessageSquare,
  Clock,
  BookOpen,
  Share2,
  Archive,
  Flag,
  Trash2,
  Store,
  ShieldCheck,
  Zap,
  ArrowDown,
  Tag,
  Activity,
  Plus,
  X,
  Undo
} from 'lucide-react';
import { useNavigate, useLocation as useRouterLocation } from '../components/ui';

const SourceIcon = ({ source }: { source: string }) => {
  const colors: Record<string, string> = {
    google: 'text-blue-500',
    facebook: 'text-blue-700',
    tripadvisor: 'text-green-600',
    yelp: 'text-red-600',
    direct: 'text-purple-600'
  };
  return <div className={`font-bold capitalize ${colors[source] || 'text-slate-500'}`}>{source}</div>;
};

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star 
        key={s} 
        className={`h-3.5 w-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
      />
    ))}
  </div>
);

const ReviewStatusBadge = ({ status }: { status: ReviewStatus }) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    draft: 'bg-blue-100 text-blue-800 border-blue-200',
    sent: 'bg-green-100 text-green-800 border-green-200',
    manual: 'bg-slate-100 text-slate-800 border-slate-200'
  };
  const labels = {
      pending: 'En attente',
      draft: 'Brouillon',
      sent: 'Envoyé',
      manual: 'Manuel'
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: {label: string, value: string}[] | string[] }) => (
    <div className="relative shrink-0">
        <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
        >
            <option value="Tout">{label}: Tout</option>
            {options.map(opt => {
                const val = typeof opt === 'string' ? opt : opt.value;
                const lbl = typeof opt === 'string' ? opt : opt.label;
                return <option key={val} value={val}>{lbl}</option>
            })}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown className="h-3 w-3" />
        </span>
    </div>
);

const InboxSkeleton = () => (
    <div className="divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="p-5">
                <div className="flex justify-between mb-2">
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-12 h-4" />
                </div>
                <div className="flex justify-between mb-2">
                    <Skeleton className="w-32 h-5" />
                    <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-full h-4 mb-2" />
                <Skeleton className="w-2/3 h-4" />
            </div>
        ))}
    </div>
);

const TimelineView = ({ review, onAddNote }: { review: Review; onAddNote: (text: string) => void }) => {
    const [noteText, setNoteText] = useState('');
    const timeline = api.reviews.getTimeline(review);

    const getIcon = (type: ReviewTimelineEvent['type']) => {
        switch(type) {
            case 'review_created': return <Star className="h-3 w-3 text-white" />;
            case 'ai_analysis': return <Zap className="h-3 w-3 text-white" />;
            case 'draft_generated': return <Wand2 className="h-3 w-3 text-white" />;
            case 'note': return <MessageSquare className="h-3 w-3 text-white" />;
            case 'reply_published': return <Send className="h-3 w-3 text-white" />;
            default: return <Activity className="h-3 w-3 text-white" />;
        }
    };

    const getColor = (type: ReviewTimelineEvent['type']) => {
        switch(type) {
            case 'review_created': return 'bg-amber-400';
            case 'ai_analysis': return 'bg-purple-500';
            case 'draft_generated': return 'bg-indigo-500';
            case 'note': return 'bg-yellow-500';
            case 'reply_published': return 'bg-green-500';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 relative pl-4 pb-4">
                <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-slate-100"></div>
                <div className="space-y-6 pt-4 relative">
                    {timeline.map((evt) => (
                        <div key={evt.id} className="flex gap-4 group">
                            <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${getColor(evt.type)}`}>
                                {getIcon(evt.type)}
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-700">{evt.actor_name}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(evt.date).toLocaleString()}</span>
                                </div>
                                <div className={`text-sm mt-1 p-2 rounded-lg ${evt.type === 'note' ? 'bg-yellow-50 text-yellow-800 border border-yellow-100' : 'text-slate-600'}`}>
                                    {evt.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 bg-white">
                <div className="relative">
                    <textarea 
                    className="w-full p-3 pr-12 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[60px] resize-none"
                    placeholder="Ajouter une note interne..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (noteText.trim()) {
                                onAddNote(noteText);
                                setNoteText('');
                            }
                        }
                    }}
                    />
                    <button 
                        onClick={() => {
                            if (noteText.trim()) {
                                onAddNote(noteText);
                                setNoteText('');
                            }
                        }}
                        disabled={!noteText.trim()}
                        className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowUpIcon className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-right">Appuyez sur Entrée pour envoyer</p>
            </div>
        </div>
    );
};

// Simple ArrowUp icon for the input
const ArrowUpIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

export const InboxPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const navigate = useNavigate();
  const routeLocation = useRouterLocation();
  const searchParams = new URLSearchParams(routeLocation.search);
  const searchQuery = searchParams.get('search') || '';
  const targetReviewId = searchParams.get('reviewId');
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('Tout');
  const [sourceFilter, setSourceFilter] = useState('Tout');
  const [ratingFilter, setRatingFilter] = useState('Tout');
  const [locationFilter, setLocationFilter] = useState('Tout');
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');

  const [activeTab, setActiveTab] = useState<'reply' | 'activity'>('reply');
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  // Focus Mode State
  const [showFocusMode, setShowFocusMode] = useState(false);

  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'empathic'>('professional');
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'long'>('medium');
  
  // Tags State
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const toneLabels = {
      professional: 'Professionnel',
      friendly: 'Amical',
      empathic: 'Empathique'
  };

  const lengthLabels = {
      short: 'Court',
      medium: 'Moyen',
      long: 'Long'
  };

  useEffect(() => {
    const init = async () => {
        const orgData = await api.organization.get();
        setOrg(orgData);
        if (orgData && orgData.locations) {
            setLocations(orgData.locations);
        }
        if (targetReviewId) {
            setStatusFilter('Tout');
            setSourceFilter('Tout');
            setRatingFilter('Tout');
            setLocationFilter('Tout');
        }
    };
    init();
  }, [targetReviewId]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadReviews(true);
    loadTemplates();
  }, [statusFilter, sourceFilter, ratingFilter, locationFilter, archiveFilter, searchQuery]);

  // Real-time subscription
  useEffect(() => {
      const sub = api.reviews.subscribe((payload) => {
          // Handle Realtime updates
          if (payload.eventType === 'INSERT') {
              const newReview = payload.new;
              newReview.body = newReview.text; // mapper body
              
              // Only add if matches current filters? (Simplified for now: always show toast, add to top)
              setReviews(prev => [newReview, ...prev]);
              toast.info(`Nouvel avis reçu de ${newReview.author_name} !`);
          } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new;
              updated.body = updated.text;
              setReviews(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
              
              if (selectedReview?.id === updated.id) {
                  setSelectedReview(prev => ({ ...prev!, ...updated }));
              }
          }
      });
      return () => { sub.unsubscribe(); };
  }, [selectedReview]);

  const loadReviews = async (reset = false) => {
    if (reset) {
        setLoading(true);
        setReviews([]);
    } else {
        setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;

    // Build filters object
    const filters: any = {
        page: currentPage,
        limit: LIMIT,
        search: searchQuery,
        archived: archiveFilter === 'archived'
    };
    if (statusFilter !== 'Tout') filters.status = statusFilter;
    if (sourceFilter !== 'Tout') filters.source = sourceFilter;
    if (ratingFilter !== 'Tout') filters.rating = ratingFilter;
    
    const data = await api.reviews.list(filters);
    
    let filtered = data;
    if (locationFilter !== 'Tout') {
        filtered = data.filter(r => r.location_id === locationFilter);
    }

    if (reset) {
        setReviews(filtered);
    } else {
        setReviews(prev => [...prev, ...filtered]);
    }
    
    // Check if we reached the end
    if (data.length < LIMIT) {
        setHasMore(false);
    }

    // Handle deep link
    if (targetReviewId && reset) {
        const target = filtered.find(r => r.id === targetReviewId);
        if (target) {
            onSelectReview(target);
            window.history.replaceState({}, '', '#/inbox');
        }
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
      if (!loadingMore && hasMore) {
          setPage(prev => prev + 1);
          loadReviews(false);
      }
  };

  const loadTemplates = async () => {
      const org = await api.organization.get();
      if (org?.saved_replies) {
          setSavedReplies(org.saved_replies);
      }
  };

  const getLocationName = (id: string) => {
      const loc = locations.find(l => l.id === id);
      return loc ? loc.name : 'Établissement inconnu';
  };

  const handleResetFilters = () => {
      setStatusFilter('Tout');
      setSourceFilter('Tout');
      setRatingFilter('Tout');
      setLocationFilter('Tout');
      setArchiveFilter('active');
      navigate('/inbox'); 
  };

  const handleGenerateReply = async () => {
    if (!selectedReview) return;
    setIsGenerating(true);
    setLimitReached(false);
    setReplyText("");
    
    try {
        // Retrieve context data from location list
        const locationData = locations.find(l => l.id === selectedReview.location_id);
        
        const draftText = await api.ai.generateReply(selectedReview, {
            tone: aiTone,
            length: aiLength,
            businessName: locationData?.name || "",
            city: locationData?.city || "",
            category: "Commerce" // Optional: could be fetched from org industry
        });
        setReplyText(draftText);
    } catch (error: any) {
        if (error.message.includes('LIMIT_REACHED')) {
            setLimitReached(true);
        } else {
            setReplyText(`[ERREUR] ${error.message}`);
            toast.error(error.message);
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handleInsertTemplate = (content: string) => {
      setReplyText(content);
      setShowTemplates(false);
      toast.success("Modèle inséré");
  };

  const handleSendReply = async () => {
    if (!selectedReview) return;
    await api.reviews.reply(selectedReview.id, replyText);
    
    const updatedReview: Review = { 
        ...selectedReview, 
        status: 'sent', 
        posted_reply: replyText,
        replied_at: new Date().toISOString()
    };
    
    setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
    setSelectedReview(updatedReview);
    toast.success("Réponse envoyée avec succès !");
  };

  const handleSaveDraft = async () => {
      if (!selectedReview) return;
      setIsSaving(true);
      await api.reviews.saveDraft(selectedReview.id, replyText);
      setIsSaving(false);
      
      const updatedReview: Review = {
          ...selectedReview,
          status: 'draft',
          ai_reply: { ...selectedReview.ai_reply, text: replyText } as any
      };
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
      setSelectedReview(updatedReview);
      toast.success("Brouillon sauvegardé");
  };

  const handleAddNote = async (text: string) => {
      if (!selectedReview) return;
      try {
          const newNote = await api.reviews.addNote(selectedReview.id, text);
          if (newNote) {
              const updatedReview = {
                  ...selectedReview,
                  internal_notes: [...(selectedReview.internal_notes || []), newNote]
              };
              setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
              setSelectedReview(updatedReview);
              toast.success("Note ajoutée");
          }
      } catch (e) {
          toast.error("Erreur lors de l'ajout de la note");
      }
  };

  const handleAddTag = async () => {
      if (!selectedReview || !newTag.trim()) return;
      await api.reviews.addTag(selectedReview.id, newTag.trim());
      
      const updatedReview = {
          ...selectedReview,
          tags: [...(selectedReview.tags || []), newTag.trim()]
      };
      
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
      setSelectedReview(updatedReview);
      setNewTag('');
      setShowTagInput(false);
  };

  const handleRemoveTag = async (tag: string) => {
      if (!selectedReview) return;
      await api.reviews.removeTag(selectedReview.id, tag);
      
      const updatedReview = {
          ...selectedReview,
          tags: selectedReview.tags?.filter(t => t !== tag) || []
      };
      
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
      setSelectedReview(updatedReview);
  };

  const onSelectReview = (review: Review) => {
      setSelectedReview(review);
      if (review.status === 'sent' && review.posted_reply) {
          setReplyText(review.posted_reply);
      } else if (review.ai_reply?.text) {
          setReplyText(review.ai_reply.text);
      } else {
          setReplyText('');
      }
      setLimitReached(false);
      setActiveTab('reply');
      setShowTemplates(false);
      setShowActionsMenu(false);
  };

  const handleArchive = async () => {
      if (!selectedReview) return;
      await api.reviews.archive(selectedReview.id);
      toast.success("Avis archivé");
      setReviews(prev => prev.filter(r => r.id !== selectedReview.id));
      setSelectedReview(null);
      setShowActionsMenu(false);
  };

  const handleUnarchive = async () => {
      if (!selectedReview) return;
      await api.reviews.unarchive(selectedReview.id);
      toast.success("Avis désarchivé");
      setReviews(prev => prev.filter(r => r.id !== selectedReview.id));
      setSelectedReview(null);
      setShowActionsMenu(false);
  };

  const handleFlag = async () => {
      if (!selectedReview) return;
      toast.success("Signalement envoyé à Google (Simulation)");
      setShowActionsMenu(false);
  };

  const handleDelete = async () => {
      if (!selectedReview) return;
      toast.error("Impossible de supprimer un avis public");
      setShowActionsMenu(false);
  };

  const handleShareClick = () => {
      const isPro = org?.subscription_plan === 'pro' || org?.subscription_plan === 'enterprise';
      if (!isPro) {
          toast.info("Le partage social est une fonctionnalité Premium. Passez au plan Growth pour débloquer.");
          setTimeout(() => navigate('/billing'), 1500);
          return;
      }
      setShowShareModal(true);
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const isPro = org?.subscription_plan === 'pro' || org?.subscription_plan === 'enterprise';

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-8 overflow-hidden bg-white">
      
      {/* Focus Mode Overlay */}
      {showFocusMode && (
          <InboxFocusMode 
              reviews={reviews} 
              onClose={() => { setShowFocusMode(false); loadReviews(true); }} 
              onUpdate={() => loadReviews(true)}
          />
      )}

      <div className={`flex-1 flex flex-col min-w-0 border-r border-slate-200 transition-all duration-300 ${selectedReview ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
        
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Boîte de réception 
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{reviews.length}{hasMore ? '+' : ''}</span>
            </h1>
            
            {pendingCount > 0 && archiveFilter !== 'archived' && (
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 animate-pulse"
                    size="sm"
                    icon={Zap}
                    onClick={() => setShowFocusMode(true)}
                >
                    Mode Focus ({pendingCount})
                </Button>
            )}
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
             {searchQuery && (
                 <Badge variant="neutral" onClick={() => navigate('/inbox')} className="mr-2 cursor-pointer shrink-0">Recherche: {searchQuery} <span className="ml-1 opacity-50">×</span></Badge>
             )}
             
             {locations.length > 1 && (
                 <FilterSelect 
                    label="Lieu" 
                    value={locationFilter} 
                    onChange={setLocationFilter} 
                    options={locations.map(l => ({ label: l.name, value: l.id }))} 
                 />
             )}

             <FilterSelect 
                label="Statut" 
                value={statusFilter} 
                onChange={setStatusFilter} 
                options={[
                    { label: 'En attente', value: 'pending' },
                    { label: 'Brouillon', value: 'draft' },
                    { label: 'Envoyé', value: 'sent' }
                ]} 
             />
             <FilterSelect 
                label="Source" 
                value={sourceFilter} 
                onChange={setSourceFilter} 
                options={['Google', 'Facebook', 'TripAdvisor', 'Direct']} 
             />
             <FilterSelect 
                label="Note" 
                value={ratingFilter} 
                onChange={setRatingFilter} 
                options={['5 ★', '4 ★', '3 ★', '2 ★', '1 ★']} 
             />
             <FilterSelect
                label="Vue"
                value={archiveFilter}
                onChange={(v) => setArchiveFilter(v as any)}
                options={[
                    { label: 'Actifs', value: 'active' },
                    { label: 'Archivés', value: 'archived' }
                ]}
             />
             {(statusFilter !== 'Tout' || sourceFilter !== 'Tout' || ratingFilter !== 'Tout' || locationFilter !== 'Tout' || archiveFilter !== 'active' || searchQuery) && (
                 <Button variant="ghost" size="xs" onClick={handleResetFilters} className="text-slate-400 hover:text-red-500 ml-auto shrink-0">Réinit.</Button>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" id="reviews-list">
          {loading ? (
            <InboxSkeleton />
          ) : reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                  <div className="mb-2">{archiveFilter === 'archived' ? '🗄️' : '📭'}</div>
                  {archiveFilter === 'archived' ? 'Aucun avis archivé.' : 'Aucun avis ne correspond à vos filtres.'}
              </div>
          ) : (
            <>
                <div className="divide-y divide-slate-50">
                {reviews.map((review) => (
                    <div 
                    key={review.id}
                    onClick={() => onSelectReview(review)}
                    className={`p-5 cursor-pointer hover:bg-slate-50 transition-all duration-200 border-l-4 ${selectedReview?.id === review.id ? 'bg-indigo-50/60 border-l-indigo-600' : 'border-l-transparent bg-white'}`}
                    >
                    <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2">
                        <ReviewStatusBadge status={review.status} />
                        <span className="text-[10px] font-medium text-slate-400">
                            {new Date(review.received_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        </div>
                        <SourceIcon source={review.source} />
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                            <Store className="h-3 w-3" />
                            {getLocationName(review.location_id)}
                        </span>
                    </div>
                    
                    <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                        <h3 className={`font-semibold text-slate-900 truncate pr-4 ${review.status === 'pending' ? 'font-bold' : ''}`}>{review.author_name}</h3>
                        <RatingStars rating={review.rating} />
                        </div>
                        <p className={`text-sm text-slate-600 line-clamp-2 leading-snug ${review.status === 'pending' ? 'text-slate-900' : ''}`}>{review.body}</p>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                        <div className="flex flex-wrap gap-2">
                            {review.analysis && review.analysis.themes && review.analysis.themes.slice(0, 2).map(t => (
                            <span key={t} className="capitalize text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{t}</span>
                            ))}
                            {review.tags?.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] font-bold text-white px-1.5 py-0.5 bg-indigo-400 rounded">{tag}</span>
                            ))}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
                
                {hasMore && (
                    <div className="p-4 flex justify-center">
                        <Button variant="ghost" onClick={loadMore} isLoading={loadingMore} icon={ArrowDown}>
                            Charger plus d'avis
                        </Button>
                    </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* Right Column: Review Details (Same as before) */}
      {selectedReview ? (
        <div className="fixed inset-0 z-50 lg:static lg:z-auto flex-1 w-full lg:w-1/2 flex flex-col bg-slate-50/50 min-w-0">
          <div className="px-4 md:px-6 py-3 border-b border-slate-200 bg-white flex justify-between items-center h-[73px]">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedReview(null)} className="lg:hidden text-slate-500">
                  <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-semibold text-slate-800">Détails de l'avis</h2>
            </div>
            <div className="flex gap-2 relative">
               <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={handleShareClick}
                   className={!isPro ? "opacity-75" : ""}
               >
                   <Share2 className="h-4 w-4 mr-2" />
                   Partager {!isPro && <Lock className="ml-1 h-3 w-3 inline" />}
               </Button>
               <Button variant="outline" size="sm" icon={MoreHorizontal} onClick={() => setShowActionsMenu(!showActionsMenu)}>Actions</Button>
               
               {showActionsMenu && (
                   <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                       {archiveFilter === 'archived' ? (
                           <button onClick={handleUnarchive} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                               <Undo className="h-4 w-4" /> Désarchiver
                           </button>
                       ) : (
                           <button onClick={handleArchive} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                               <Archive className="h-4 w-4" /> Archiver
                           </button>
                       )}
                       <button onClick={handleFlag} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50">
                           <Flag className="h-4 w-4" /> Signaler à Google
                       </button>
                       <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50">
                           <Trash2 className="h-4 w-4" /> Supprimer
                       </button>
                   </div>
               )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                        {selectedReview.author_name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">{selectedReview.author_name}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {getLocationName(selectedReview.location_id)}
                        <span>•</span>
                        {new Date(selectedReview.received_at).toLocaleString()}
                        </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                     <div className="flex justify-end mb-1"><RatingStars rating={selectedReview.rating} /></div>
                     <span className="text-xs font-medium text-slate-400 capitalize">{selectedReview.source}</span>
                  </div>
                </div>
                
                {/* TAGS BAR */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {selectedReview.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900"><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                    
                    {showTagInput ? (
                        <div className="flex items-center gap-1">
                            <input 
                                className="w-24 px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Nouveau tag..."
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                autoFocus
                            />
                            <button onClick={handleAddTag} className="text-green-600 hover:text-green-800"><CheckCircle2 className="h-4 w-4" /></button>
                            <button onClick={() => setShowTagInput(false)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setShowTagInput(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 text-slate-500 text-xs hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                            <Plus className="h-3 w-3" /> Ajouter un tag
                        </button>
                    )}
                </div>

                <p className="text-slate-800 text-sm leading-relaxed mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  "{selectedReview.body}"
                </p>
                
                {selectedReview.analysis && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-slate-100 bg-white">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Analyse Sentiment</span>
                            <div className="flex gap-2 mb-2">
                                <Badge variant={selectedReview.analysis.sentiment === 'positive' ? 'success' : selectedReview.analysis.sentiment === 'negative' ? 'error' : 'warning'}>
                                    {selectedReview.analysis.sentiment}
                                </Badge>
                                {selectedReview.analysis.emotion && <Badge variant="neutral">{selectedReview.analysis.emotion}</Badge>}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 bg-white">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Mots Clés</span>
                             <div className="flex flex-wrap gap-1.5">
                                {selectedReview.analysis.keywords.slice(0, 4).map(k => (
                                    <span key={k} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{k}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {selectedReview.analysis?.flags && Object.values(selectedReview.analysis.flags).some(v => v) && (
                     <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-100 flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-red-800 uppercase">Alerte Critique</h4>
                            <p className="text-xs text-red-700 mt-0.5">Cet avis mentionne des problèmes potentiels d'hygiène ou de sécurité.</p>
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative pb-20 lg:pb-0 h-[600px]">
              <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <button 
                    onClick={() => setActiveTab('reply')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'reply' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <Sparkles className="h-4 w-4" /> Réponse
                  </button>
                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <Activity className="h-4 w-4" /> Activité & Notes
                  </button>
              </div>
              
              <div className="p-4 md:p-6 flex-1 overflow-hidden h-full flex flex-col">
                 {activeTab === 'reply' && (
                     selectedReview.status === 'sent' ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
                            <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-green-50/50">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-slate-900 font-bold mb-1">Réponse Publiée</h3>
                            <p className="text-sm text-slate-500 mb-6">Envoyée le {selectedReview.replied_at ? new Date(selectedReview.replied_at).toLocaleDateString() : 'Date inconnue'}</p>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left w-full max-w-lg">
                                <p className="text-slate-700 italic text-sm">"{selectedReview.posted_reply}"</p>
                            </div>
                        </div>
                     ) : limitReached ? (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center">
                            <Lock className="h-8 w-8 text-amber-500 mx-auto mb-4" />
                            <h3 className="font-bold text-amber-900 text-lg mb-2">Limite Gratuite Atteinte</h3>
                            <p className="text-sm text-amber-800 mb-6 max-w-xs mx-auto">Vous avez atteint la limite quotidienne d'IA. Passez en Pro pour l'illimité.</p>
                            <Button variant="primary" onClick={() => navigate('/billing')} className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-200">Passer Pro</Button>
                        </div>
                     ) : (
                        <>
                            <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-between shrink-0">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
                                        {['short', 'medium', 'long'].map((l) => (
                                            <button 
                                                key={l}
                                                onClick={() => setAiLength(l as any)}
                                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${aiLength === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {lengthLabels[l as keyof typeof lengthLabels]}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
                                        {['professional', 'friendly', 'empathic'].map((t) => (
                                            <button 
                                                key={t}
                                                onClick={() => setAiTone(t as any)}
                                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${aiTone === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {toneLabels[t as keyof typeof toneLabels]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <Button variant="outline" size="xs" icon={BookOpen} onClick={() => setShowTemplates(!showTemplates)}>
                                        Modèles
                                    </Button>
                                    {showTemplates && (
                                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-2">
                                            <div className="text-xs font-semibold text-slate-400 uppercase px-2 py-1 mb-1">Réponses Types</div>
                                            {savedReplies.length > 0 ? (
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {savedReplies.map(tpl => (
                                                        <button 
                                                            key={tpl.id}
                                                            onClick={() => handleInsertTemplate(tpl.content)}
                                                            className="w-full text-left px-2 py-2 hover:bg-indigo-50 rounded-lg text-sm text-slate-700 transition-colors"
                                                        >
                                                            <div className="font-medium">{tpl.title}</div>
                                                            <div className="text-xs text-slate-400 truncate">{tpl.content}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-xs text-slate-400">
                                                    Aucun modèle.<br/>
                                                    <span className="text-indigo-500 cursor-pointer hover:underline" onClick={() => navigate('/settings')}>En créer un</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative mb-4 group flex-1">
                                <textarea 
                                className="w-full h-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none leading-relaxed shadow-sm bg-white transition-all font-medium text-slate-700"
                                placeholder="Cliquez sur 'Générer' pour laisser l'IA rédiger une réponse..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                ></textarea>
                                
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px] z-10">
                                        <div className="h-1.5 w-48 bg-slate-100 rounded-full overflow-hidden mb-3">
                                            <div className="h-full bg-indigo-600 animate-[progress_1s_ease-in-out_infinite]"></div>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Consultation du réseau neuronal...</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                            <Button 
                                variant="secondary" 
                                size="sm"
                                icon={Wand2} 
                                onClick={handleGenerateReply}
                                disabled={isGenerating}
                                className="w-full sm:w-auto border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-none hover:shadow-sm"
                            >
                                {replyText ? 'Régénérer' : 'Générer Brouillon'}
                            </Button>
                            
                            <div className="flex gap-3 w-full sm:w-auto items-center">
                                {/* Reply Context Safety Indicator */}
                                <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 mr-2">
                                    <ShieldCheck className="h-3 w-3 text-green-500" />
                                    Réponse publique via : <span className="font-bold text-slate-600 truncate max-w-[100px]">{getLocationName(selectedReview.location_id)}</span>
                                </div>

                                <Button variant="ghost" size="sm" onClick={handleSaveDraft} isLoading={isSaving} disabled={!replyText} className="flex-1 sm:flex-none">Sauvegarder</Button>
                                <Button variant="primary" size="sm" icon={Send} onClick={handleSendReply} className="flex-1 sm:flex-none shadow-lg shadow-indigo-200" disabled={!replyText}>Envoyer</Button>
                            </div>
                            </div>
                        </>
                     )
                 )}

                 {activeTab === 'activity' && (
                     <TimelineView review={selectedReview} onAddNote={handleAddNote} />
                 )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-1/2 hidden lg:flex items-center justify-center bg-slate-50 text-slate-400 flex-col gap-4">
           <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-2">
             <MessageCircle className="h-10 w-10 text-slate-200" />
           </div>
           <p className="font-medium text-slate-500">Sélectionnez un avis pour ouvrir le Centre de Commande</p>
        </div>
      )}

      {showShareModal && selectedReview && (
          <SocialShareModal review={selectedReview} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};
