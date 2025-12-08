
import React, { useState, useEffect } from 'react';
import { Review } from '../types';
import { api } from '../lib/api';
import { Button, Badge, useToast } from './ui';
import { X, Send, SkipForward, Wand2, CheckCircle2, MessageSquare, Star, ArrowRight, ArrowLeft, RefreshCw, Zap, Edit2 } from 'lucide-react';

interface InboxFocusModeProps {
    reviews: Review[];
    onClose: () => void;
    onUpdate: () => void;
}

export const InboxFocusMode: React.FC<InboxFocusModeProps> = ({ reviews, onClose, onUpdate }) => {
    // Filter only pending reviews for focus mode
    const [queue, setQueue] = useState<Review[]>(reviews.filter(r => r.status === 'pending' || r.status === 'draft'));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [replyText, setReplyText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [finished, setFinished] = useState(false);
    const toast = useToast();

    const currentReview = queue[currentIndex];

    // Auto-generate AI draft when slide changes
    useEffect(() => {
        if (currentReview && !finished) {
            generateDraft(currentReview);
        }
    }, [currentIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
            if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) handleSkip();
            if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [replyText, currentReview]);

    const generateDraft = async (review: Review) => {
        // If already has a draft, use it
        if (review.ai_reply?.text && !isGenerating) {
            setReplyText(review.ai_reply.text);
            return;
        }
        
        setIsGenerating(true);
        setReplyText(''); // Clear previous
        try {
            // "Short" length is optimized for speed and chat-like interaction
            const text = await api.ai.generateReply(review, { tone: 'professionnel', length: 'short' });
            setReplyText(text);
        } catch (e) {
            console.error(e);
            toast.error("Erreur IA");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setReplyText('');
        } else {
            setFinished(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setReplyText('');
        }
    };

    const handleSend = async () => {
        if (!replyText.trim() || isSending) return;
        setIsSending(true);
        try {
            await api.reviews.reply(currentReview.id, replyText);
            toast.success("Envoyé !");
            // Wait a tiny bit for effect
            await new Promise(r => setTimeout(r, 300));
            onUpdate(); // Refresh parent list in background
            handleNext();
        } catch (e) {
            console.error(e);
            toast.error("Erreur d'envoi");
        } finally {
            setIsSending(false);
        }
    };

    const handleSkip = () => {
        handleNext();
    };

    const handleRegenerate = () => {
        if (!currentReview) return;
        // Force regeneration ignoring existing draft
        setIsGenerating(true);
        setReplyText('');
        api.ai.generateReply(currentReview, { tone: 'professionnel', length: 'short' })
            .then(text => setReplyText(text))
            .catch(() => toast.error("Erreur IA"))
            .finally(() => setIsGenerating(false));
    };

    if (finished || queue.length === 0) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                <div className="bg-green-500 rounded-full p-6 mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Session Terminée !</h2>
                <p className="text-slate-400 mb-8">Vous avez traité tous les avis en attente.</p>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={onClose} size="lg">Retour au Dashboard</Button>
                </div>
            </div>
        );
    }

    if (!currentReview) return null;

    const progress = Math.round(((currentIndex + 1) / queue.length) * 100);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full px-4 py-1 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                        <Zap className="h-3 w-3 fill-white" /> MODE FOCUS
                    </div>
                    <div className="hidden sm:block h-2 w-48 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{currentIndex + 1} / {queue.length}</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Main Content Area - Tinder Style Centered Card */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-3xl flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300 key={currentReview.id}">
                    
                    {/* Review Card */}
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-lg font-bold text-indigo-700 ring-4 ring-indigo-50">
                                    {currentReview.author_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{currentReview.author_name}</h3>
                                    <div className="flex gap-2 text-xs text-slate-500 items-center">
                                        <span className="capitalize font-medium">{currentReview.source}</span>
                                        <span>•</span>
                                        <span>{new Date(currentReview.received_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-100">
                                <Star className="h-4 w-4 fill-current" /> 
                                <span className="font-bold">{currentReview.rating}/5</span>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <MessageSquare className="absolute -top-3 -left-3 h-8 w-8 text-slate-100 -z-10" />
                            <p className="text-base text-slate-800 leading-relaxed font-medium italic pl-2 border-l-4 border-indigo-100">
                                "{currentReview.body}"
                            </p>
                        </div>

                        {/* Analysis Tags */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {currentReview.analysis?.sentiment && (
                                <Badge variant={currentReview.analysis.sentiment === 'positive' ? 'success' : currentReview.analysis.sentiment === 'negative' ? 'error' : 'warning'}>
                                    {currentReview.analysis.sentiment}
                                </Badge>
                            )}
                            {currentReview.analysis?.themes?.map(t => (
                                <Badge key={t} variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200 uppercase text-[10px]">
                                    {t}
                                </Badge>
                            ))}
                        </div>

                        {/* AI Response Area */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                            {isGenerating ? (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-indigo-600 rounded-xl">
                                    <Wand2 className="h-6 w-6 animate-spin mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Rédaction IA...</span>
                                </div>
                            ) : (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-400 flex items-center gap-1">
                                        <Edit2 className="h-3 w-3" /> Modifiable
                                    </span>
                                </div>
                            )}
                            
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Votre Réponse</label>
                            <textarea 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-slate-700 text-sm focus:ring-0 resize-none min-h-[100px] leading-relaxed"
                                placeholder="L'IA prépare la réponse..."
                            />
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={handleSkip} 
                                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
                            >
                                <SkipForward className="h-4 w-4 mr-2" /> Passer
                            </Button>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleRegenerate}
                            className="text-slate-400 hover:text-indigo-400 hover:bg-transparent"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> Régénérer
                        </Button>

                        <Button 
                            variant="primary" 
                            size="lg"
                            onClick={handleSend} 
                            isLoading={isSending} 
                            disabled={!replyText.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 min-w-[140px]"
                        >
                            <Send className="h-4 w-4 mr-2" /> Envoyer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
