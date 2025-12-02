import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MapPin, Loader2, ArrowRight, CheckCircle2, Copy, ExternalLink, MessageSquare, ThumbsDown, Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

const POSITIVE_TAGS = ['Accueil', 'Rapidité', 'Propreté', 'Qualité', 'Ambiance', 'Conseil'];
const NEGATIVE_TAGS = ['Attente', 'Service', 'Prix', 'Bruit', 'Hygiène', 'Qualité'];

const Confetti = () => (
    <div className="confetti-container">
        {[...Array(15)].map((_, i) => (
            <div key={i} className="confetti"></div>
        ))}
    </div>
);

export const ReviewFunnel = () => {
    // Extract locationId from URL using useParams hook (v6)
    const { locationId } = useParams();
    
    const [step, setStep] = useState<'rating' | 'details' | 'redirect' | 'success'>('rating');
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Type checking for location info
    const [locationInfo, setLocationInfo] = useState<{name: string, city: string, googleUrl?: string} | null>(null);

    useEffect(() => {
        if (locationId) {
            api.public.getLocationInfo(locationId)
                .then((info) => setLocationInfo(info as any))
                .catch(() => setLocationInfo({ name: "Notre Établissement", city: "Paris", googleUrl: "#" }));
        }
    }, [locationId]);

    const handleRatingSelect = (score: number) => {
        setRating(score);
        // Step transition with slight delay for visual feedback
        setTimeout(() => {
            setStep('details');
        }, 300);
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmitFeedback = async () => {
        setLoading(true);
        try {
            if (locationId) {
                // Include tags in the submission
                await api.public.submitFeedback(locationId, rating, feedback, contact, selectedTags);
            }
        } catch (error) {
            console.warn("Feedback submission mock fallback", error);
        } finally {
            setLoading(false);
            
            if (rating >= 4) {
                setStep('redirect');
            } else {
                setStep('success');
            }
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(feedback);
        // Could show a small tooltip here
    };

    if (!locationInfo) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-600"/></div>;

    const isPositive = rating >= 4;
    const currentTags = isPositive ? POSITIVE_TAGS : NEGATIVE_TAGS;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {step === 'redirect' && <Confetti />}
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10">
                {/* Header Image / Brand */}
                <div className="bg-indigo-600 h-32 relative flex items-center justify-center">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                     <div className="absolute -bottom-8 bg-white p-1 rounded-full shadow-lg">
                        <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl border-4 border-white">
                            {locationInfo.name.charAt(0)}
                        </div>
                     </div>
                </div>

                <div className="pt-12 pb-8 px-8 text-center">
                    <h1 className="text-xl font-bold text-slate-900 mb-1">{locationInfo.name}</h1>
                    <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mb-8">
                        <MapPin className="h-3 w-3" /> {locationInfo.city}
                    </p>

                    {/* STEP 1: RATING */}
                    {step === 'rating' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <h2 className="text-lg font-medium text-slate-800 mb-6">Comment s'est passée votre visite ?</h2>
                            <div className="flex justify-center gap-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleRatingSelect(star)}
                                        className="transition-all hover:scale-110 focus:outline-none group active:scale-90"
                                    >
                                        <Star 
                                            className={`h-10 w-10 transition-colors duration-300 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-200 group-hover:text-amber-200'}`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400">Touchez une étoile pour noter</p>
                        </div>
                    )}

                    {/* STEP 2: DETAILS (Tags + Text) */}
                    {step === 'details' && (
                        <div className="animate-in slide-in-from-right-8 duration-300 text-left">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold mb-4">
                                    <Star className="h-3 w-3 fill-current" /> {rating}/5
                                    <button onClick={() => setStep('rating')} className="ml-2 text-xs underline text-amber-400 font-normal">Modifier</button>
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    {isPositive ? "Qu'avez-vous le plus aimé ?" : "Que pouvons-nous améliorer ?"}
                                </h2>
                            </div>

                            {/* Tags Selection */}
                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                {currentTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                            selectedTags.includes(tag)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Message (Optionnel)</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] transition-all"
                                        placeholder={isPositive ? "Racontez-nous votre expérience..." : "Dites-nous en plus..."}
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                                
                                {!isPositive && (
                                    <div className="animate-in fade-in">
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email (pour vous répondre)</label>
                                        <Input 
                                            placeholder="votre@email.com"
                                            value={contact}
                                            onChange={e => setContact(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                )}

                                <Button 
                                    onClick={handleSubmitFeedback} 
                                    className="w-full h-12 text-base rounded-xl shadow-lg shadow-indigo-100 mt-2" 
                                    isLoading={loading}
                                    icon={ArrowRight}
                                >
                                    Envoyer
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: REDIRECT (High Rating) */}
                    {step === 'redirect' && (
                        <div className="animate-in zoom-in-95 duration-500 text-center">
                            <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-4 animate-bounce">
                                <Heart className="h-8 w-8 fill-current" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Merci, c'est génial !</h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                Votre avis compte énormément pour nous. Pourriez-vous prendre 10 secondes pour le poster sur Google ? Cela nous aide beaucoup.
                            </p>
                            
                            {feedback && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-left relative group">
                                    <p className="text-sm text-slate-700 italic">"{feedback}"</p>
                                    <button 
                                        onClick={handleCopyToClipboard}
                                        className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-500 text-xs flex items-center gap-1"
                                    >
                                        <Copy className="h-3 w-3" /> Copier
                                    </button>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button 
                                    className="w-full h-14 text-lg rounded-xl shadow-xl shadow-indigo-200 bg-[#4285F4] hover:bg-[#3367D6] border-none"
                                    onClick={() => window.location.href = locationInfo.googleUrl || '#'}
                                >
                                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    Poster sur Google
                                </Button>
                                <button 
                                    onClick={() => setStep('success')}
                                    className="text-sm text-slate-400 hover:text-slate-600 py-2"
                                >
                                    Non merci, j'ai terminé
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS (Low Rating / End) */}
                    {step === 'success' && (
                        <div className="animate-in zoom-in-95 duration-300">
                             <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Merci pour votre retour</h2>
                            <p className="text-slate-600 mb-8">
                                Votre message a bien été transmis à la direction. Nous faisons de notre mieux pour améliorer nos services.
                            </p>
                            <Button variant="outline" onClick={() => window.location.reload()}>Fermer</Button>
                        </div>
                    )}
                </div>
                
                {/* Footer Branding */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100 flex items-center justify-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Powered by</span>
                    <span className="text-xs font-bold text-indigo-600">Reviewflow</span>
                </div>
            </div>
        </div>
    );
};