import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Review, ReviewStatus, InternalNote, SavedReply } from '../types';
import { Card, CardContent, Skeleton, useToast } from '../components/ui';
import { SocialShareModal } from '../components/SocialShareModal';
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
  Trash2
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
import { useHistory, useLocation } from 'react-router-dom';

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
            <option value="Tout">Tout</option>
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

const NotesList = ({ notes }: { notes: InternalNote[] }) => {
    if (!notes || notes.length === 0) return (
        <div className="text-center py-8 text-slate-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune note interne.</p>
            <p className="text-xs">Ajoutez un commentaire pour votre équipe.</p>
        </div>
    );

    return (
        <div className="space-y-4 mb-4">
            {notes.map(note => (
                <div key={note.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {note.author_name.charAt(0)}
                    </div>
                    <div className="flex-1 bg-white border border-slate-100 rounded-lg rounded-tl-none p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-900">{note.author_name}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(note.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700">{note.text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const InboxPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('Tout');
  const [sourceFilter, setSourceFilter] = useState('Tout');
  const [ratingFilter, setRatingFilter] = useState('Tout');

  const [activeTab, setActiveTab] = useState<'reply' | 'notes'>('reply');
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'empathic'>('professional');
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'long'>('medium');

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
    loadReviews();
    loadTemplates();
  }, [statusFilter, sourceFilter, ratingFilter, searchQuery]);

  const loadReviews = async () => {
    setLoading(true);
    const data = await api.reviews.list({
        status: statusFilter,
        source: sourceFilter,
        rating: ratingFilter,
        search: searchQuery
    });
    setReviews(data);
    setLoading(false);
  };

  const loadTemplates = async () => {
      const org = await api.organization.get();
      if (org?.saved_replies) {
          setSavedReplies(org.saved_replies);
      }
  };

  const handleResetFilters = () => {
      setStatusFilter('Tout');
      setSourceFilter('Tout');
      setRatingFilter('Tout');
      history.push('/inbox'); 
  };

const handleGenerateReply = async () => {
    if (!selectedReview) return;
    setIsGenerating(true);
    setLimitReached(false);
    setReplyText("");
    
    try {
        const draftText = await api.ai.generateReply(selectedReview, {
            tone: aiTone,
            length: aiLength
        });
        setReplyText(draftText);
    } catch (error: any) {
        console.error("Erreur UI Génération:", error);
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

  const handleAddNote = async () => {
      if (!selectedReview || !noteText.trim()) return;
      setIsSavingNote(true);
      try {
          const newNote = await api.reviews.addNote(selectedReview.id, noteText);
          if (newNote) {
              const updatedReview = {
                  ...selectedReview,
                  internal_notes: [...(selectedReview.internal_notes || []), newNote]
              };
              setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
              setSelectedReview(updatedReview);
              setNoteText('');
              toast.success("Note ajoutée");
          }
      } catch (e) {
          toast.error("Erreur lors de l'ajout de la note");
      } finally {
          setIsSavingNote(false);
      }
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
      toast.success("Avis archivé (Simulation)");
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

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-8 overflow-hidden bg-white">
      <div className={`flex-1 flex flex-col min-w-0 border-r border-slate-200 transition-all duration-300 ${selectedReview ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
        
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Boîte de réception <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{reviews.length}</span>
            </h1>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
             {searchQuery && (
                 <Badge variant="neutral" onClick={() => history.push('/inbox')} className="mr-2 cursor-pointer shrink-0">Recherche: {searchQuery} <span className="ml-1 opacity-50">×</span></Badge>
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
             {(statusFilter !== 'Tout' || sourceFilter !== 'Tout' || ratingFilter !== 'Tout' || searchQuery) && (
                 <Button variant="ghost" size="xs" onClick={handleResetFilters} className="text-slate-400 hover:text-red-500 ml-auto shrink-0">Réinit.</Button>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <InboxSkeleton />
          ) : reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                  <div className="mb-2">📭</div>
                  Aucun avis ne correspond à vos filtres.
              </div>
          ) : (
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
                      </div>
                      {review.internal_notes && review.internal_notes.length > 0 && (
                          <div className="flex items-center text-[10px] text-slate-400 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                              <MessageSquare className="h-3 w-3 mr-1 text-yellow-600" />
                              {review.internal_notes.length} note(s)
                          </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
               <Button variant="outline" size="sm" icon={Share2} onClick={() => setShowShareModal(true)}>Partager</Button>
               <Button variant="outline" size="sm" icon={MoreHorizontal} onClick={() => setShowActionsMenu(!showActionsMenu)}>Actions</Button>
               
               {showActionsMenu && (
                   <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                       <button onClick={handleArchive} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                           <Archive className="h-4 w-4" /> Archiver
                       </button>
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
                        Hôtel Bellevue Paris
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative pb-20 lg:pb-0">
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                  <button 
                    onClick={() => setActiveTab('reply')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'reply' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <Sparkles className="h-4 w-4" /> Réponse
                  </button>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'notes' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <MessageSquare className="h-4 w-4" /> Notes Internes
                      {selectedReview.internal_notes && selectedReview.internal_notes.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 rounded-full">{selectedReview.internal_notes.length}</span>
                      )}
                  </button>
              </div>
              
              <div className="p-4 md:p-6 flex-1">
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
                            <Button variant="primary" onClick={() => history.push('/billing')} className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-200">Passer Pro</Button>
                        </div>
                     ) : (
                        <>
                            <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-between">
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
                                                    <span className="text-indigo-500 cursor-pointer hover:underline" onClick={() => history.push('/settings')}>En créer un</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative mb-4 group">
                                <textarea 
                                className="w-full h-48 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none leading-relaxed shadow-sm bg-white transition-all font-medium text-slate-700"
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
                            
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
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
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button variant="ghost" size="sm" onClick={handleSaveDraft} isLoading={isSaving} disabled={!replyText} className="flex-1 sm:flex-none">Sauvegarder</Button>
                                <Button variant="primary" size="sm" icon={Send} onClick={handleSendReply} className="flex-1 sm:flex-none shadow-lg shadow-indigo-200" disabled={!replyText}>Envoyer</Button>
                            </div>
                            </div>
                        </>
                     )
                 )}

                 {activeTab === 'notes' && (
                     <div className="h-full flex flex-col">
                         <div className="flex-1 overflow-y-auto pr-2">
                             <NotesList notes={selectedReview.internal_notes || []} />
                         </div>
                         <div className="mt-4 pt-4 border-t border-slate-100">
                             <textarea 
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px]"
                                placeholder="Ajoutez une note pour votre équipe..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                             />
                             <div className="flex justify-end mt-2">
                                 <Button size="sm" onClick={handleAddNote} isLoading={isSavingNote} disabled={!noteText.trim()}>Ajouter la note</Button>
                             </div>
                         </div>
                     </div>
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