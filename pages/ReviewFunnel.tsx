
import React, { useState, useEffect } from 'react';
import { Star, MapPin, Loader2, ArrowRight, CheckCircle2, Heart, Gift, Mail, Facebook } from 'lucide-react';
import { Button, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { useParams, useSearchParams } from '../components/ui';
import { Offer, Coupon } from '../types';

const NEGATIVE_TAGS = ['Attente', 'Service', 'Prix', 'Bruit', 'Hygiène', 'Qualité'];

const Confetti = () => (
    <div className="confetti-container">
        {[...Array(30)].map((_, i) => (
            <div key={i} className="confetti"></div>
        ))}
    </div>
);

const TripAdvisorIcon = () => <div className="font-serif font-bold text-green-600 text-3xl tracking-tighter">TA</div>;

export const ReviewFunnel = () => {
    const { locationId } = useParams();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    
    const [step, setStep] = useState<'rating' | 'capture' | 'details' | 'redirecting' | 'success' | 'reward'>('rating');
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [revealed, setRevealed] = useState(false);

    const staffName = searchParams.get('staff');
    
    const [locationInfo, setLocationInfo] = useState<{
        name: string, 
        city: string, 
        googleUrl?: string, 
        facebookUrl?: string, 
        tripadvisorUrl?: string
    } | null>(null);

    useEffect(() => {
        if (locationId) {
            api.public.getLocationInfo(locationId)
                .then((info) => {
                    if (info) {
                        setLocationInfo({
                            name: info.name,
                            city: info.city,
                            googleUrl: (info as any).google_review_url || (info as any).googleUrl,
                            facebookUrl: (info as any).facebook_review_url,
                            tripadvisorUrl: (info as any).tripadvisor_review_url
                        });
                    }
                });
        }
    }, [locationId]);

    const handleRatingSelect = async (score: number) => {
        setRating(score);
        
        if (locationId) {
            // Check for rewards (optional)
            // const offer = await api.public.getActiveOffer(locationId, score);
            // setActiveOffer(offer);
        }

        if (score >= 4) {
            // FLUX POSITIF (4 ou 5 étoiles)
            
            // 1. Sauvegarder immédiatement l'intention
            if (locationId) {
                api.public.submitFeedback(locationId, score, "Note positive (Redirection)", "", [], staffName || undefined).catch(console.error);
            }

            // 2. Vérifier si un lien Google est configuré
            if (locationInfo?.googleUrl && locationInfo.googleUrl.length > 5) {
                // REDIRECTION IMMEDIATE : Pas de question, pas de choix
                setStep('redirecting'); 
                
                setTimeout(() => {
                    window.location.href = locationInfo.googleUrl!;
                }, 2500); // 2.5s delay for confetti effect
            } else {
                // Pas de lien Google, on demande juste l'email (ou fin)
                setStep('capture');
            }
        } else {
            // FLUX NÉGATIF (< 4)
            setTimeout(() => {
                setStep('details');
            }, 300);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!locationId) return;
        setLoading(true);
        try {
            await api.public.submitFeedback(locationId, rating, feedback, contact, selectedTags, staffName || undefined);
            setStep('success');
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!locationInfo) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-600"/></div>;

    const hasGoogle = locationInfo.googleUrl && locationInfo.googleUrl.length > 5;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {(step === 'redirecting' || step === 'reward') && <Confetti />}
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 min-h-[500px] flex flex-col">
                {/* Header Image */}
                <div className="bg-indigo-600 h-32 relative flex items-center justify-center shrink-0">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                     <div className="absolute -bottom-8 bg-white p-1 rounded-full shadow-lg">
                        <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl border-4 border-white">
                            {locationInfo.name ? locationInfo.name.charAt(0) : 'E'}
                        </div>
                     </div>
                </div>

                <div className="pt-12 pb-8 px-8 text-center flex-1 flex flex-col justify-center">
                    <h1 className="text-xl font-bold text-slate-900 mb-1">{locationInfo.name}</h1>
                    {locationInfo.city && (
                        <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mb-8">
                            <MapPin className="h-3 w-3" /> {locationInfo.city}
                        </p>
                    )}

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

                    {/* STEP 2: REDIRECTING (Positive) */}
                    {step === 'redirecting' && (
                        <div className="animate-in zoom-in-95 duration-500 py-4">
                             <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-6 animate-bounce">
                                <Heart className="h-12 w-12 fill-current" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">C'est génial !</h2>
                            
                            {hasGoogle ? (
                                <p className="text-slate-600 mb-8 font-medium">
                                    Redirection vers Google en cours...<br/>
                                    <span className="text-sm font-normal text-slate-400">Merci de confirmer votre note sur la fiche.</span>
                                </p>
                            ) : (
                                <p className="text-slate-600 mb-8">
                                    Merci pour votre soutien !
                                </p>
                            )}
                            
                            {/* NO RETURN BUTTON HERE as requested */}
                        </div>
                    )}

                    {/* STEP 3: DETAILS (Negative Only) */}
                    {step === 'details' && (
                        <div className="animate-in slide-in-from-right-8 duration-300 text-left">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold mb-4">
                                    <Star className="h-3 w-3 fill-current" /> {rating}/5
                                    <button onClick={() => setStep('rating')} className="ml-2 text-xs underline text-amber-400 font-normal">Modifier</button>
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Que pouvons-nous améliorer ?
                                </h2>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                {NEGATIVE_TAGS.map(tag => (
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
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Message</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px]"
                                        placeholder="Dites-nous en plus..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email (pour vous répondre)</label>
                                    <Input 
                                        placeholder="votre@email.com"
                                        value={contact}
                                        onChange={e => setContact(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>

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

                    {/* STEP 4: SUCCESS (End of Negative Flow) */}
                    {step === 'success' && (
                        <div className="animate-in zoom-in-95 duration-500 py-8">
                            <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-6">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Merci pour votre retour !</h2>
                            <p className="text-slate-600 mb-8">
                                Votre avis a bien été pris en compte.
                            </p>
                            {/* NO RETURN BUTTON HERE as requested */}
                        </div>
                    )}
                </div>
                
                <div className="py-4 text-center bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                        Propulsé par <span className="font-bold text-indigo-600">Reviewflow</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
