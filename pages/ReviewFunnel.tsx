
import React, { useState, useEffect } from 'react';
import { Star, MapPin, Loader2, ArrowRight, CheckCircle2, Copy, Heart, AlertTriangle, ExternalLink, Gift, Mail, Facebook, Ticket } from 'lucide-react';
import { Button, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { useParams, useSearchParams } from '../components/ui';
import { Offer, Coupon } from '../types';

const POSITIVE_TAGS = ['Accueil', 'Rapidité', 'Propreté', 'Qualité', 'Ambiance', 'Conseil'];
const NEGATIVE_TAGS = ['Attente', 'Service', 'Prix', 'Bruit', 'Hygiène', 'Qualité'];

const Confetti = () => (
    <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
            <div key={i} className="confetti"></div>
        ))}
    </div>
);

// Platform Icons
const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.95-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
);
const TripAdvisorIcon = () => <div className="font-serif font-bold text-green-600 text-3xl tracking-tighter">TA</div>;

export const ReviewFunnel = () => {
    const { locationId } = useParams();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    
    // Steps: rating -> capture (VIP) -> redirecting -> success -> reward
    const [step, setStep] = useState<'rating' | 'capture' | 'details' | 'redirecting' | 'success' | 'reward'>('rating');
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Reward Logic
    const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [revealed, setRevealed] = useState(false);

    // Identifier un client via lien de campagne (ex: ?cid=123)
    const customerId = searchParams.get('cid');
    // Identifier un membre du staff pour la gamification
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
                    } else {
                        setLocationInfo({ name: "Établissement", city: "" });
                    }
                })
                .catch(() => setLocationInfo({ name: "Établissement", city: "" }));
        }
    }, [locationId]);

    const handleRatingSelect = async (score: number) => {
        setRating(score);
        
        // Check for rewards immediately
        if (locationId) {
            const offer = await api.public.getActiveOffer(locationId, score);
            setActiveOffer(offer);
        }

        if (score >= 4) {
            // FLUX POSITIF
            if (customerId) {
                // Client déjà connu, on zappe la capture
                setStep('redirecting');
            } else {
                setStep('capture');
            }
        } else {
            // FLUX NÉGATIF
            setTimeout(() => {
                setStep('details');
            }, 300);
        }
    };

    const handleRedirect = (url: string) => {
        // AUTO-COPY FEATURE
        if (feedback.length > 5) {
            navigator.clipboard.writeText(feedback).then(() => {
                toast.success("Texte copié ! Collez-le sur la plateforme.", 3000);
            }).catch(() => {});
        }
        
        // Enregistrement stat avec attribution staff si présent
        if (locationId) {
            api.public.submitFeedback(locationId, rating, "Avis positif (Click)", contact, [], staffName || undefined)
                .catch(err => console.error(err));
        }

        setTimeout(() => {
            window.open(url, '_blank');
            // Move to reward if available, else success
            if (activeOffer) {
                setStep('reward');
            } else {
                setStep('success');
            }
        }, 1000);
    };

    const handleCaptureSubmit = async () => {
        setStep('redirecting');
    };

    const handleSkipCapture = () => {
        setStep('redirecting');
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
            toast.error(`Erreur: ${error.message || "Problème technique"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevealReward = async () => {
        if (!activeOffer) return;
        setLoading(true);
        try {
            const newCoupon = await api.offers.generateCoupon(activeOffer.id, contact);
            setCoupon(newCoupon);
            setRevealed(true);
        } catch (e) {
            toast.error("Erreur lors de la génération du cadeau");
        } finally {
            setLoading(false);
        }
    };

    if (!locationInfo) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-600"/></div>;

    const hasGoogle = locationInfo.googleUrl && locationInfo.googleUrl.length > 5;
    const hasFacebook = locationInfo.facebookUrl && locationInfo.facebookUrl.length > 5;
    const hasTripAdvisor = locationInfo.tripadvisorUrl && locationInfo.tripadvisorUrl.length > 5;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {(step === 'redirecting' || step === 'reward') && <Confetti />}
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 min-h-[500px] flex flex-col">
                {/* Header Image / Brand */}
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
                    {!locationInfo.city && <div className="mb-8"></div>}

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
                            
                            {staffName && (
                                <p className="text-xs text-slate-300 mt-8 italic">Servi par {staffName}</p>
                            )}
                        </div>
                    )}

                    {/* STEP 1.5: CAPTURE (Smart Gate) */}
                    {step === 'capture' && (
                        <div className="animate-in slide-in-from-right-8 duration-300">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                                <Gift className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                                <h3 className="font-bold text-indigo-900">Merci pour cette note !</h3>
                                <p className="text-sm text-indigo-700 mt-1">
                                    Laissez votre email pour recevoir votre surprise.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="text-left">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Votre message (sera copié)</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px]"
                                        placeholder="Ce que vous avez aimé..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input 
                                        placeholder="votre@email.com" 
                                        className="pl-10 h-12 rounded-xl border-slate-300"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    className="w-full h-12 rounded-xl shadow-lg shadow-indigo-200" 
                                    onClick={handleCaptureSubmit}
                                    disabled={!contact.includes('@')}
                                >
                                    Rejoindre & Publier mon avis
                                </Button>
                                <button 
                                    onClick={handleSkipCapture}
                                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                                >
                                    Non merci, publier directement
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: REDIRECTING (Positive Multi-Platform) */}
                    {step === 'redirecting' && (
                        <div className="animate-in zoom-in-95 duration-500 py-4">
                             <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-6 animate-bounce">
                                <Heart className="h-12 w-12 fill-current" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">C'est génial !</h2>
                            <p className="text-slate-600 mb-8">
                                Votre avis nous aide énormément. Sur quelle plateforme souhaitez-vous le partager ?
                            </p>
                            
                            <div className="space-y-3">
                                {hasGoogle && (
                                    <button 
                                        onClick={() => handleRedirect(locationInfo.googleUrl!)}
                                        className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group text-left"
                                    >
                                        <div className="h-12 w-12 flex items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm mr-4 group-hover:scale-110 transition-transform">
                                            <GoogleIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Google Avis</h4>
                                            <p className="text-xs text-slate-500">Le plus utile pour nous</p>
                                        </div>
                                        <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-indigo-500" />
                                    </button>
                                )}

                                {hasFacebook && (
                                    <button 
                                        onClick={() => handleRedirect(locationInfo.facebookUrl!)}
                                        className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group text-left"
                                    >
                                        <div className="h-12 w-12 flex items-center justify-center bg-blue-50 rounded-full border border-blue-100 shadow-sm mr-4 group-hover:scale-110 transition-transform">
                                            <Facebook className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Facebook</h4>
                                            <p className="text-xs text-slate-500">Recommander à vos amis</p>
                                        </div>
                                        <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                                    </button>
                                )}

                                {hasTripAdvisor && (
                                    <button 
                                        onClick={() => handleRedirect(locationInfo.tripadvisorUrl!)}
                                        className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all group text-left"
                                    >
                                        <div className="h-12 w-12 flex items-center justify-center bg-green-50 rounded-full border border-green-100 shadow-sm mr-4 group-hover:scale-110 transition-transform">
                                            <TripAdvisorIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">TripAdvisor</h4>
                                            <p className="text-xs text-slate-500">Pour les voyageurs</p>
                                        </div>
                                        <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-green-500" />
                                    </button>
                                )}

                                {!hasGoogle && !hasFacebook && !hasTripAdvisor && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-slate-600 mb-2">
                                            Merci infiniment pour votre soutien.
                                        </p>
                                        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retour</Button>
                                    </div>
                                )}
                            </div>
                            
                            {feedback && (hasGoogle || hasFacebook || hasTripAdvisor) && (
                                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 py-2 px-4 rounded-full mx-auto w-fit">
                                    <Copy className="h-3 w-3" />
                                    Votre message sera copié automatiquement
                                </div>
                            )}
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

                            {/* Tags Selection */}
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
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Message (Optionnel)</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] transition-all"
                                        placeholder="Dites-nous en plus..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                                
                                <div className="animate-in fade-in">
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
                                Votre avis a bien été pris en compte. Nous faisons tout pour nous améliorer grâce à vous.
                            </p>
                            {/* Bouton de retour supprimé pour éviter la confusion/sortie prématurée */}
                        </div>
                    )}

                    {/* STEP 5: REWARD (Positive Flow with Offer) */}
                    {step === 'reward' && activeOffer && (
                        <div className="animate-in zoom-in-95 duration-500">
                            <div className="text-center mb-6">
                                <div className="inline-block p-3 rounded-full bg-pink-100 text-pink-600 mb-4 animate-bounce">
                                    <Gift className="h-8 w-8" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Une surprise pour vous !</h2>
                                <p className="text-sm text-slate-500">Pour vous remercier de votre avis 5 étoiles.</p>
                            </div>

                            {!revealed ? (
                                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-indigo-200 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={handleRevealReward}>
                                    <p className="font-bold text-indigo-600 mb-2">{activeOffer.title}</p>
                                    <Button isLoading={loading} icon={Gift} className="shadow-lg shadow-pink-200 bg-pink-600 hover:bg-pink-700 border-none">
                                        Découvrir mon cadeau
                                    </Button>
                                </div>
                            ) : coupon ? (
                                <div className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{coupon.offer_title}</h3>
                                    <p className="text-slate-500 text-sm mb-4">{coupon.discount_detail}</p>
                                    
                                    <div className="bg-slate-100 p-3 rounded-lg mb-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Code Coupon</p>
                                        <div className="font-mono text-2xl font-bold text-indigo-700 tracking-widest">{coupon.code}</div>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-400 mb-4">
                                        Valable jusqu'au {new Date(coupon.expires_at).toLocaleDateString()}. Présentez ce code en caisse.
                                    </p>
                                    
                                    <p className="text-xs text-green-600 font-bold flex items-center justify-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Envoyé à {contact}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-red-500">Erreur de chargement du coupon.</div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer Branding */}
                <div className="py-4 text-center bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                        Propulsé par <span className="font-bold text-indigo-600">Reviewflow</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
