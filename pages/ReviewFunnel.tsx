
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, ThumbsUp, MessageSquare, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { api } from '../lib/api';

export const ReviewFunnel = () => {
    const { locationId } = useParams<{ locationId: string }>();
    const [step, setStep] = useState<'rating' | 'feedback' | 'success'>('rating');
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);
    const [locationInfo, setLocationInfo] = useState<{name: string, city: string, googleUrl: string} | null>(null);

    useEffect(() => {
        if (locationId) {
            api.public.getLocationInfo(locationId)
                .then(setLocationInfo)
                .catch(() => setLocationInfo({ name: "Notre Établissement", city: "Paris", googleUrl: "#" }));
        }
    }, [locationId]);

    const handleRatingSelect = (score: number) => {
        setRating(score);
        if (score === 5) {
            // Redirect to Google directly for 5 stars
            if (locationInfo?.googleUrl && locationInfo.googleUrl !== '#') {
                window.location.href = locationInfo.googleUrl;
            } else {
                // If no link configured, fall back to success screen or google search
                window.open(`https://www.google.com/search?q=${encodeURIComponent(locationInfo?.name || 'Reviewflow')}`, '_blank');
                setStep('success');
            }
        } else {
            // Internal feedback for < 5 stars
            setStep('feedback');
        }
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (locationId) {
            await api.public.submitFeedback(locationId, rating, feedback, contact);
        }
        setLoading(false);
        setStep('success');
    };

    if (!locationInfo) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-none">
                <div className="p-8 text-center">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 font-bold text-2xl">
                            {locationInfo.name.charAt(0)}
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">{locationInfo.name}</h1>
                        <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {locationInfo.city}
                        </p>
                    </div>

                    {/* Step 1: Rating */}
                    {step === 'rating' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <h2 className="text-lg font-medium text-slate-800 mb-6">Comment s'est passée votre expérience ?</h2>
                            <div className="flex justify-center gap-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleRatingSelect(star)}
                                        className="transition-transform hover:scale-110 focus:outline-none group"
                                    >
                                        <Star 
                                            className={`h-10 w-10 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 group-hover:text-amber-200'}`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400">Touchez une étoile pour noter</p>
                        </div>
                    )}

                    {/* Step 2: Internal Feedback */}
                    {step === 'feedback' && (
                        <form onSubmit={handleSubmitFeedback} className="animate-in slide-in-from-right-8 duration-300 text-left">
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                                <p className="text-sm text-amber-800 text-center font-medium">
                                    Désolé que tout n'ait pas été parfait. Dites-nous comment nous améliorer.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Votre message</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px]"
                                        placeholder="Ce qui n'a pas été..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Email / Tél (Optionnel)</label>
                                    <Input 
                                        placeholder="Pour que nous puissions vous recontacter"
                                        value={contact}
                                        onChange={e => setContact(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" className="w-full" isLoading={loading}>Envoyer</Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Success */}
                    {step === 'success' && (
                        <div className="animate-in zoom-in-95 duration-300">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                                <ThumbsUp className="h-10 w-10" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Merci beaucoup !</h2>
                            <p className="text-slate-600">
                                Votre avis a bien été pris en compte.
                            </p>
                        </div>
                    )}

                </div>
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Propulsé par Reviewflow</span>
                </div>
            </Card>
        </div>
    );
};
