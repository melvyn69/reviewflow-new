
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Star, MessageCircle, Loader2 } from 'lucide-react';

export const WidgetPage = () => {
    const { locationId } = useParams();
    const [searchParams] = useSearchParams();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    // Options via URL
    const theme = searchParams.get('theme') || 'light'; // light, dark
    const type = searchParams.get('type') || 'carousel'; // carousel, list, badge

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

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-indigo-500" /></div>;

    if (reviews.length === 0) return (
        <div className={`text-center p-4 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Aucun avis à afficher pour le moment.
        </div>
    );

    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200';
    const cardClass = `rounded-xl p-6 border shadow-sm transition-all duration-500 ${bgClass}`;

    if (type === 'badge') {
        const avg = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
        return (
            <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm ${bgClass}`}>
                <div className="flex gap-0.5 text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold text-sm ml-1">{avg}</span>
                </div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{reviews.length} avis vérifiés</span>
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                <span className="text-[10px] font-bold tracking-wider opacity-70">REVIEWFLOW</span>
            </div>
        );
    }

    if (type === 'list') {
        return (
            <div className="space-y-4 p-2">
                {reviews.map((review, i) => (
                    <div key={i} className={cardClass}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {review.author_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{review.author_name}</div>
                                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(review.received_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex text-amber-400">
                                {[...Array(review.rating)].map((_, j) => <Star key={j} className="h-3 w-3 fill-current" />)}
                            </div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>"{review.body}"</p>
                    </div>
                ))}
            </div>
        );
    }

    // Default: Carousel
    const currentReview = reviews[activeIndex];

    return (
        <div className="p-2 h-full flex items-center justify-center">
            <div className={`${cardClass} w-full max-w-md relative overflow-hidden`}>
                <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-[5000ms] ease-linear w-full opacity-50" key={activeIndex}></div>
                
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-indigo-600 text-white'}`}>
                            {currentReview.author_name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold">{currentReview.author_name}</div>
                            <div className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>Vérifié par Reviewflow</span>
                                <MessageCircle className="h-3 w-3" />
                            </div>
                        </div>
                    </div>
                    <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < currentReview.rating ? 'fill-current' : 'text-slate-300 fill-slate-300'}`} />
                        ))}
                    </div>
                </div>

                <div className="min-h-[80px] flex items-center">
                    <p className={`text-sm italic leading-relaxed line-clamp-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        "{currentReview.body}"
                    </p>
                </div>

                <div className="flex justify-center gap-1.5 mt-4">
                    {reviews.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-slate-300'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
