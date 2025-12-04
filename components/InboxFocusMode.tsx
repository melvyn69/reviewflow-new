import React, { useState, useEffect } from 'react';
import { Review } from '../types';
import { api } from '../lib/api';
import { Button, Badge, useToast } from './ui';
import { X, Send, SkipForward, Wand2, CheckCircle2, MessageSquare, Star, ArrowRight, Keyboard, Zap } from 'lucide-react';

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
            // ArrowRight to skip? Maybe too risky.
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [replyText, currentReview]);

    const generateDraft = async (review: Review) => {
        // If already has a draft, use it
        if (review.ai_reply?.text) {
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

    const progress = Math.round(((currentIndex) / queue.length) * 100);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col h-screen overflow-hidden">
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-8 gap-6 overflow-hidden">
                
                {/* Left: Review Card */}
                <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden animate-in slide-in-from-right-8 duration-300 key={currentReview.id}">
                        {/* Rating Badge */}
                        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 px-4 py-2 rounded-bl-2xl font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 fill-current" /> {currentReview.rating}/5
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-14 w-14 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-700 ring-4 ring-indigo-50">
                                {currentReview.author_name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{currentReview.author_name}</h3>
                                <div className="flex gap-2 text-sm text-slate-500 items-center">
                                    <span className="capitalize font-medium">{currentReview.source}</span>
                                    <span>•</span>
                                    <span>{new Date(currentReview.received_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <MessageSquare className="absolute -top-2 -left-2 h-8 w-8 text-slate-100 -z-10" />
                            <p className="text-lg text-slate-800 leading-relaxed font-medium mb-6 italic">
                                "{currentReview.body}"
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                            {currentReview.analysis?.themes?.map(t => (
                                <Badge key={t} variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200 uppercase text-[10px]">
                                    {t}
                                </Badge>
                            ))}
                            {currentReview.analysis?.sentiment && (
                                <Badge variant={currentReview.analysis.sentiment === 'positive' ? 'success' : currentReview.analysis.sentiment === 'negative' ? 'error' : 'warning'}>
                                    {currentReview.analysis.sentiment}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Action Panel */}
                <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        
                        {/* AI Loading State */}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-indigo-400">
                                <Wand2 className="h-8 w-8 animate-spin mb-2" />
                                <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Rédaction IA...</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-indigo-400 font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                                <Wand2 className="h-4 w-4" /> 
                                Réponse suggérée
                            </h4>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 hidden sm:flex">
                                <Keyboard className="h-3 w-3" /> CMD+ENTER pour envoyer
                            </span>
                        </div>

                        <textarea 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full h-48 bg-slate-900 border-slate-700 text-slate-100 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-medium leading-relaxed text-base"
                            placeholder="L'IA prépare la réponse..."
                        />

                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={handleSkip} 
                                className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
                            >
                                <SkipForward className="h-4 w-4 mr-2" /> Passer
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={handleSend} 
                                isLoading={isSending} 
                                disabled={!replyText.trim()}
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50"
                            >
                                <Send className="h-4 w-4 mr-2" /> Envoyer et Suivant
                            </Button>
                        </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                        <button onClick={() => generateDraft(currentReview)} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1 mx-auto">
                            <Wand2 className="h-3 w-3" /> Régénérer une autre réponse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};