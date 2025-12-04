
import React, { useState, useEffect } from 'react';
import { Review } from '../types';
import { api } from '../lib/api';
import { Button, Badge } from './ui';
import { X, Send, SkipForward, Wand2, CheckCircle2, MessageSquare, Star, ArrowRight, Keyboard } from 'lucide-react';

interface InboxFocusModeProps {
    reviews: Review[];
    onClose: () => void;
    onUpdate: () => void;
}

export const InboxFocusMode: React.FC<InboxFocusModeProps> = ({ reviews, onClose, onUpdate }) => {
    const [queue, setQueue] = useState<Review[]>(reviews);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [replyText, setReplyText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [finished, setFinished] = useState(false);

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
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [replyText, currentReview]);

    const generateDraft = async (review: Review) => {
        if (review.ai_reply?.text && !review.ai_reply.needs_manual_validation) {
            setReplyText(review.ai_reply.text);
            return;
        }
        
        setIsGenerating(true);
        try {
            // Check organization settings for tone preferences? Defaulting here.
            const text = await api.ai.generateReply(review, { tone: 'professionnel', length: 'short' });
            setReplyText(text);
        } catch (e) {
            console.error(e);
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
            // Wait a tiny bit for effect
            await new Promise(r => setTimeout(r, 500));
            handleNext();
            onUpdate(); // Refresh parent list in background
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    const handleSkip = () => {
        handleNext();
    };

    if (finished) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                <div className="bg-green-500 rounded-full p-6 mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Session Terminée !</h2>
                <p className="text-slate-400 mb-8">Vous avez traité tous les avis en attente.</p>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={onClose} size="lg">Retour au Dashboard</Button>
                </div>
                
                {/* Confetti effect could go here */}
            </div>
        );
    }

    if (!currentReview) return null;

    const progress = Math.round(((currentIndex) / queue.length) * 100);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-800 rounded-full px-4 py-1 text-xs font-medium text-slate-300 border border-slate-700">
                        Focus Mode
                    </div>
                    <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500">{currentIndex + 1} / {queue.length}</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 md:p-8 gap-6 overflow-hidden">
                
                {/* Left: Review Card */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 key={currentReview.id}">
                        {/* Rating Badge */}
                        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 px-4 py-2 rounded-bl-2xl font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 fill-current" /> {currentReview.rating}/5
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-lg font-bold text-indigo-700">
                                {currentReview.author_name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{currentReview.author_name}</h3>
                                <div className="flex gap-2 text-sm text-slate-500">
                                    <span className="capitalize">{currentReview.source}</span>
                                    <span>•</span>
                                    <span>{new Date(currentReview.received_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-lg text-slate-700 leading-relaxed font-medium mb-6">
                            "{currentReview.body}"
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {currentReview.analysis?.themes?.map(t => (
                                <Badge key={t} variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200">
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
                <div className="flex-1 flex flex-col justify-center max-w-xl">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-indigo-400 font-medium flex items-center gap-2">
                                <Wand2 className="h-4 w-4" /> 
                                {isGenerating ? 'L\'IA réfléchit...' : 'Brouillon IA'}
                            </h4>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Keyboard className="h-3 w-3" /> CMD+ENTER pour envoyer
                            </span>
                        </div>

                        <textarea 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full h-40 bg-slate-900 border-slate-700 text-slate-200 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-medium leading-relaxed"
                            placeholder="Écrivez votre réponse..."