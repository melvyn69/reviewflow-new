
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from '../components/ui';
import { api } from '../lib/api';
import { Star, MessageCircle, Loader2, Quote } from 'lucide-react';

export const WidgetPage = () => {
    const { locationId } = useParams();
    const [searchParams] = useSearchParams();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    // Options via URL
    const theme = searchParams.get('theme') || 'light'; // light, dark
    const type = searchParams.get('type') || 'carousel'; // carousel, list, badge
    
    // Pro Options
    const primaryColor = '#' + (searchParams.get('color') || '4f46e5');
    const showDate = searchParams.get('showDate') !== 'false';
    const showBorder = searchParams.get('border') !== 'false';
    const borderRadius = parseInt(searchParams.get('radius') || '12');

    useEffect(() => {
        if (locationId) {
            loadReviews(locationId);
        }
    }, [locationId]);

    // Carousel Logic
    useEffect(() => {
        if (type === 'carousel' && reviews.length > 1) {
            const interval = setInterval(() => {
                setActiveIndex((current) => (current + 1) % reviews.length);
            }, 5000); // 5 seconds
            return () => clearInterval(interval);
        }
    }, [type, reviews.length]);

    const loadReviews = async (id: string) => {
        try {
            const data = await api.public.getWidgetReviews(id);
            setReviews(data);
        } catch (e) {
            console.error("Widget error", e);
        } finally {
            setLoading(false);
        }
    };

    // Format helpers
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getAverageRating = () => {
        if (!reviews.length) return "0,0";
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1).replace('.', ',');
    };

    if (loading) return <div className="flex justify-center items-center h-screen p-4"><Loader2 className="animate-spin h-8 w-8" style={{ color: primaryColor }} /></div>;

    if (reviews.length === 0) return (
        <div className={`text-center p-4 text-sm font-medium h-full flex items-center justify-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Aucun avis à afficher pour le moment.
        </div>
    );

    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';
    // Subtle border for light mode, slightly clearer for dark mode
    const borderClass = showBorder ? (isDark ? 'border border-slate-700' : 'border border-slate-200/80') : 'border-none';
    const cardStyle = { borderRadius: `${borderRadius}px` };
    
    // Enhanced Card Classes
    const cardBaseClass = `p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full ${bgClass} ${borderClass}`;

    // --- BADGE VIEW ---
    if (type === 'badge') {
        const avg = getAverageRating();
        return (
            <div className="flex items-center justify-center h-full p-4">
                <div className={`inline-flex items-center gap-3 px-5 py-2.5 shadow-md hover:shadow-lg transition-all duration-300 ${bgClass} ${borderClass}`} style={{ borderRadius: '9999px' }}>
                    <div className="flex gap-1" style={{ color: '#fbbf24' }}>
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-bold text-base ml-1" style={{ color: isDark ? 'white' : 'black' }}>{avg}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold leading-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Excellents avis</span>
                        <span className={`text-[10px] font-medium leading-none mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{reviews.length} avis vérifiés</span>
                    </div>
                    <div className={`h-6 w-px mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                    <span className="text-[9px] font-black tracking-widest opacity-50 uppercase">Reviewflow</span>
                </div>
            </div>
        );
    }

    // --- LIST / GRID VIEW ---
    if (type === 'list') {
        return (
            <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                {/* Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reviews.map((review, i) => (
                        <div key={i} className={cardBaseClass} style={cardStyle}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-50 border border-slate-100'}`} style={!isDark ? { color: primaryColor } : {}}>
                                        {review.author_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm truncate pr-2">{review.author_name}</div>
                                        {showDate && <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{formatDate(review.received_at)}</div>}
                                    </div>
                                </div>
                                <div className="flex text-amber-400 shrink-0">
                                    {[...Array(review.rating)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-current" />)}
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm leading-relaxed line-clamp-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    "{review.body}"
                                </p>
                            </div>
                            <div className="mt-4 pt-3 flex items-center gap-1.5 opacity-60 border-t border-dashed border-current" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                                <MessageCircle className="h-3 w-3" />
                                <span className="text-[10px] font-medium uppercase tracking-wide">Vérifié Google</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- CAROUSEL VIEW (Default) ---
    const currentReview = reviews[activeIndex];

    return (
        <div className="p-4 h-full flex items-center justify-center w-full">
            <div className={`${cardBaseClass} w-full max-w-lg relative overflow-hidden`} style={cardStyle}>
                {/* Progress Bar for Auto-rotation */}
                <div className="absolute top-0 left-0 h-1 transition-all duration-[5000ms] ease-linear w-full opacity-70" style={{ backgroundColor: primaryColor }} key={activeIndex}></div>
                
                <div className="flex justify-between items-start mb-6 pt-2">
                    <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${isDark ? 'bg-slate-800 text-white ring-2 ring-slate-700' : 'ring-4 ring-slate-50'}`} style={!isDark ? { backgroundColor: primaryColor, color: 'white' } : {}}>
                            {currentReview.author_name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-base">{currentReview.author_name}</div>
                            <div className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <MessageCircle className="h-3 w-3" />
                                <span>Avis certifié</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < currentReview.rating ? 'fill-current' : 'text-transparent'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex items-center mb-6 relative">
                    <Quote className={`absolute -top-2 -left-2 h-8 w-8 opacity-10 ${isDark ? 'text-white' : 'text-slate-900'}`} />
                    <p className={`text-base font-medium leading-relaxed line-clamp-4 pl-4 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        "{currentReview.body}"
                    </p>
                </div>

                <div className="flex justify-between items-end mt-auto">
                    {showDate && (
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Publié le {formatDate(currentReview.received_at)}
                        </span>
                    )}
                    
                    {/* Dots Indicator */}
                    <div className="flex justify-center gap-1.5 ml-auto">
                        {reviews.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-500 ${i === activeIndex ? 'w-6' : 'w-1.5 bg-slate-200 opacity-50'}`}
                                style={i === activeIndex ? { backgroundColor: primaryColor } : {}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
