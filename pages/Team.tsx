import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { StaffMember, Review } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast } from '../components/ui';
import { Trophy, Users, Plus, Star, Award, TrendingUp, UserPlus, Trash2, Medal, Gift, Mail, Lightbulb, RefreshCw, Calendar as CalendarIcon, Filter } from 'lucide-react';

const ROLES = [
    "Serveur", "Cuisinier", "Manager", "Réception", 
    "Responsable de salle", "Community Manager", 
    "Responsable SAV", "Vendeur", "Hôte(sse)", "Barman", 
    "Directeur", "Assistant", "Chef de rang", "Sommelier", "Autre"
];

const PERIODS = [
    { id: 'week', label: 'Cette Semaine' },
    { id: 'month', label: 'Ce Mois' },
    { id: 'quarter', label: 'Ce Trimestre' },
    { id: 'year', label: 'Cette Année' },
    { id: 'custom', label: 'Personnalisé' }
];

const getGenderedAvatar = (name: string, currentAvatar?: string) => {
    if (currentAvatar && currentAvatar.length > 0) return currentAvatar;
    const cleanName = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const femaleEndings = ['a', 'e', 'ie', 'ne', 'le', 'na', 'ra'];
    const maleExceptions = ['pierre', 'mike', 'steve', 'dave', 'luca', 'noah', 'jerome', 'guillaume', 'antoine', 'baptiste', 'alexandre', 'maxime', 'theodore', 'gilles', 'herve', 'dominique', 'jean', 'philippe', 'christophe', 'luc'];
    const femaleExceptions = ['zoe', 'chloe', 'cleo', 'alice', 'sarah', 'ines', 'jade', 'louise', 'emma', 'eva'];
    let isFemale = false;
    if (femaleExceptions.includes(cleanName)) {
        isFemale = true;
    } else if (maleExceptions.includes(cleanName)) {
        isFemale = false;
    } else {
        const lastChar = cleanName.slice(-1);
        isFemale = femaleEndings.includes(lastChar);
    }
    const bg = isFemale ? 'f472b6' : '60a5fa';
    const color = 'ffffff';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}&size=128&bold=true`;
};

const Podium = ({ winners }: { winners: StaffMember[] }) => {
    if (winners.length === 0) return null;

    return (
        <div className="flex items-end justify-center gap-2 md:gap-6 mb-8 md:mb-12 mt-4 md:mt-8">
            {winners[1] && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 delay-100 w-1/3 max-w-[120px]">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-slate-700 text-xs md:text-base truncate w-full">{winners[1].name}</div>
                        <div className="text-[10px] md:text-xs text-slate-500">{winners[1].reviews_count} avis</div>
                    </div>
                    <div className="h-24 md:h-32 w-full bg-slate-300 rounded-t-lg relative flex items-center justify-center shadow-lg">
                        <span className="text-3xl md:text-4xl font-black text-slate-400/50 absolute bottom-2">2</span>
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-full border-4 border-slate-300 absolute -top-6 md:-top-8 flex items-center justify-center font-bold text-slate-500 text-xl overflow-hidden">
                            <img src={getGenderedAvatar(winners[1].name, winners[1].avatar)} alt={winners[1].name} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            )}

            {winners[0] && (
                <div className="flex flex-col items-center z-10 animate-in slide-in-from-bottom-12 w-1/3 max-w-[140px]">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-amber-600 text-sm md:text-lg flex items-center justify-center gap-1">
                            <Trophy className="h-3 w-3 md:h-4 md:w-4" /> <span className="truncate">{winners[0].name}</span>
                        </div>
                        <div className="text-[10px] md:text-sm text-slate-500 font-bold">{winners[0].reviews_count} avis (Top !)</div>
                    </div>
                    <div className="h-32 md:h-40 w-full bg-gradient-to-b from-amber-300 to-amber-500 rounded-t-lg relative flex items-center justify-center shadow-xl">
                        <span className="text-4xl md:text-5xl font-black text-white/50 absolute bottom-2">1</span>
                        <div className="h-16 w-16 md:h-20 md:w-20 bg-white rounded-full border-4 border-amber-400 absolute -top-8 md:-top-10 flex items-center justify-center font-bold text-amber-600 text-2xl overflow-hidden shadow-md">
                            <img src={getGenderedAvatar(winners[0].name, winners[0].avatar)} alt={winners[0].name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-6 bg-white px-2 py-1 md:px-3 rounded-full text-[10px] md:text-xs font-bold text-amber-600 shadow-sm border border-amber-100 flex items-center gap-1 whitespace-nowrap">
                            <Star className="h-3 w-3 fill-current" /> <span className="hidden md:inline">Champion</span><span className="md:hidden">MVP</span>
                        </div>
                    </div>
                </div>
            )}

            {winners[2] && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 delay-200 w-1/3 max-w-[120px]">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-orange-800 text-xs md:text-base truncate w-full">{winners[2].name}</div>
                        <div className="text-[10px] md:text-xs text-slate-500">{winners[2].reviews_count} avis</div>
                    </div>
                    <div className="h-16 md:h-24 w-full bg-orange-300 rounded-t-lg relative flex items-center justify-center shadow-lg">
                        <span className="text-2xl md:text-4xl font-black text-orange-900/20 absolute bottom-2">3</span>
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-full border-4 border-orange-300 absolute -top-6 md:-top-8 flex items-center justify-center font-bold text-orange-700 text-xl overflow-hidden">
                            <img src={getGenderedAvatar(winners[2].name, winners[2].avatar)} alt={winners[2].name} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// New Component: Spotlight Section
const HallOfFame = ({ staff }: { staff: StaffMember[] }) => {
    // Sort by review count desc
    const topVolume = [...staff].sort((a,b) => b.reviews_count - a.reviews_count)[0];
    // Sort by rating desc (min 1 review)
    const topQuality = [...staff].filter(s => s.reviews_count > 0).sort((a,b) => b.average_rating - a.average_rating)[0];
    // "Rising Star" or Balanced (mix of both)
    const topBalanced = [...staff].sort((a,b) => (b.reviews_count * b.average_rating) - (a.reviews_count * a.average_rating))[0];

    if (!topVolume) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Trophy className="h-16 w-16" /></div>
                <div className="relative z-10">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Machine à Avis</div>
                    <div className="flex items-center gap-3">
                        <img src={getGenderedAvatar(topVolume.name, topVolume.avatar)} className="h-12 w-12 rounded-full border-2 border-white/50" />
                        <div>
                            <div className="font-bold text-lg">{topVolume.name}</div>
                            <div className="text-sm opacity-90">{topVolume.reviews_count} avis collectés</div>
                        </div>
                    </div>
                </div>
            </div>

            {topQuality && topQuality.id !== topVolume.id && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Star className="h-16 w-16" /></div>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Excellence Client</div>
                        <div className="flex items-center gap-3">
                            <img src={getGenderedAvatar(topQuality.name, topQuality.avatar)} className="h-12 w-12 rounded-full border-2 border-white/50" />
                            <div>
                                <div className="font-bold text-lg">{topQuality.name}</div>
                                <div className="text-sm opacity-90">{topQuality.average_rating.toFixed(1)}/5 de moyenne</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {topBalanced && topBalanced.id !== topVolume.id && topBalanced.id !== topQuality?.id && (
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Award className="h-16 w-16" /></div>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Performer Global</div>
                        <div className="flex items-center gap-3">
                            <img src={getGenderedAvatar(topBalanced.name, topBalanced.avatar)} className="h-12 w-12 rounded-full border-2 border-white/50" />
                            <div>
                                <div className="font-bold text-lg">{topBalanced.name}</div>
                                <div className="text-sm opacity-90">Score: {Math.round(topBalanced.reviews_count * topBalanced.average_rating)} pts</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeamPage = () => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffRole, setNewStaffRole] = useState(ROLES[0]);
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // Manager Advice State
    const [adviceMemberId, setAdviceMemberId] = useState('');
    const [adviceType, setAdviceType] = useState<'volume' | 'quality'>('volume');
    const [adviceText, setAdviceText] = useState('');
    const [isAdviceLoading, setIsAdviceLoading] = useState(false);

    // Period Filter State
    const [period, setPeriod] = useState('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [reviews, setReviews] = useState<Review[]>([]);

    const toast = useToast();

    useEffect(() => {
        loadData();
    }, [period, customStartDate, customEndDate]);

    const getDateRange = () => {
        const now = new Date();
        const start = new Date();
        const end = new Date(); // Today

        switch (period) {
            case 'week':
                start.setDate(now.getDate() - now.getDay() + 1); // Monday
                break;
            case 'month':
                start.setDate(1); // 1st of month
                break;
            case 'quarter':
                start.setMonth(Math.floor(now.getMonth() / 3) * 3);
                start.setDate(1);
                break;
            case 'year':
                start.setMonth(0, 1);
                break;
            case 'custom':
                if (customStartDate) return { start: new Date(customStartDate), end: customEndDate ? new Date(customEndDate) : now };
                return { start: null, end: null }; // Wait for input
            default:
                return { start: null, end: null }; // All time (or default logic)
        }
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return { start, end };
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const org = await api.organization.get();
            let currentStaff = org?.staff_members || [];

            // Fetch reviews for period to recalculate stats
            const { start, end } = getDateRange();
            
            // If period is not 'all time' (which we assume default org stats are NOT, they are likely aggregated totals)
            // Actually, we want dynamic stats. So we fetch reviews filtered by date.
            // If start is null (custom not ready), we might wait or show 0.
            
            let fetchedReviews: Review[] = [];
            
            if (start && end) {
                fetchedReviews = await api.reviews.list({
                    limit: 1000, // Fetch enough to aggregate. In real app, use a stats endpoint.
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                });
            } else if (period === 'custom' && !customStartDate) {
                fetchedReviews = [];
            } else {
                // If simple view without date filter logic implies "All Time", we could rely on stored stats,
                // but to be consistent let's fetch all (limit applies).
                // For "All Time" let's just use the org data directly or fetch.
                // To keep it simple for this feature: specific periods recalc, 'year' is long enough.
                // Let's assume 'month' is default.
                // If org.staff_members has accumulated counts, we should overwrite them with calculated ones.
                const startMonth = new Date(); startMonth.setDate(1);
                fetchedReviews = await api.reviews.list({
                    limit: 1000,
                    startDate: startMonth.toISOString()
                });
            }

            setReviews(fetchedReviews);

            // Compute Stats per Staff
            const computedStaff = currentStaff.map(s => {
                const staffReviews = fetchedReviews.filter(r => 
                    r.staff_attributed_to && r.staff_attributed_to.toLowerCase() === s.name.toLowerCase()
                );
                
                const count = staffReviews.length;
                const totalRating = staffReviews.reduce((sum, r) => sum + r.rating, 0);
                const avg = count > 0 ? totalRating / count : 0;

                return {
                    ...s,
                    reviews_count: count,
                    average_rating: avg
                };
            });

            setStaff(computedStaff);

            if (currentStaff.length > 0 && !adviceMemberId) {
                setAdviceMemberId(currentStaff[0].id);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur chargement données équipe");
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async () => {
        if (!newStaffName) return;
        setIsAdding(true);
        try {
            await api.organization.addStaffMember(newStaffName, newStaffRole, newStaffEmail);
            setNewStaffName('');
            setNewStaffEmail('');
            loadData();
            toast.success("Membre ajouté !");
        } catch (e) {
            toast.error("Erreur lors de l'ajout");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm('Supprimer ce membre ?')) {
            await api.organization.removeStaffMember(id);
            loadData();
        }
    };

    const handleSendReward = (member: StaffMember) => {
        if (member.email) {
            window.location.href = `mailto:${member.email}?subject=Félicitations !&body=Bonjour ${member.name}, bravo pour ton excellent travail ce mois-ci ! Continue comme ça.`;
            toast.success(`Client mail ouvert pour ${member.name}`);
        } else {
            if (confirm(`Aucun email pour ${member.name}. Voulez-vous copier un message de félicitations ?`)) {
                navigator.clipboard.writeText(`Bravo ${member.name} pour ton excellent travail ce mois-ci !`);
                toast.success("Message copié dans le presse-papier");
            }
        }
    };

    const handleGenerateAdvice = async () => {
        if (!adviceMemberId) return;
        setIsAdviceLoading(true);
        setAdviceText('');
        
        try {
            const member = staff.find(s => s.id === adviceMemberId);
            if (!member) return;
            
            const sorted = [...staff].sort((a, b) => b.reviews_count - a.reviews_count);
            const rank = sorted.findIndex(s => s.id === member.id) + 1;

            const text = await api.ai.generateManagerAdvice(member, rank, adviceType);
            setAdviceText(text);
        } catch (e) {
            toast.error("Erreur lors de la génération du conseil");
        } finally {
            setIsAdviceLoading(false);
        }
    };

    // Sort for leaderboard
    const sortedStaff = [...staff].sort((a, b) => b.reviews_count - a.reviews_count);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-8 w-8 text-indigo-600" />
                        Challenge d'Équipe
                    </h1>
                    <p className="text-slate-500">Transformez la collecte d'avis en jeu collectif.</p>
                </div>
                
                {/* PERIOD SELECTOR */}
                <div className="flex flex-col sm:flex-row gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center px-2 text-slate-400">
                        <CalendarIcon className="h-4 w-4" />
                    </div>
                    <select 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 py-1 focus:outline-none cursor-pointer"
                    >
                        {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    
                    {period === 'custom' && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <input 
                                type="date" 
                                value={customStartDate} 
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="text-xs border rounded px-1 py-0.5"
                            />
                            <span className="text-xs">-</span>
                            <input 
                                type="date" 
                                value={customEndDate} 
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="text-xs border rounded px-1 py-0.5"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* HALL OF FAME */}
            {staff.length > 0 && <HallOfFame staff={staff} />}

            {/* ASTUCE MANAGER AI */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                        <Lightbulb className="h-6 w-6 text-indigo-600" />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <h3 className="font-bold text-lg text-indigo-900 mb-2">💡 Astuce du Manager (IA)</h3>
                        
                        {!adviceText ? (
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <select 
                                        className="bg-white border border-indigo-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        value={adviceMemberId}
                                        onChange={(e) => setAdviceMemberId(e.target.value)}
                                    >
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    
                                    <select 
                                        className="bg-white border border-indigo-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        value={adviceType}
                                        onChange={(e) => setAdviceType(e.target.value as any)}
                                    >
                                        <option value="volume">Objectif: Plus d'avis (Volume)</option>
                                        <option value="quality">Objectif: Meilleure note (Qualité)</option>
                                    </select>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={handleGenerateAdvice} 
                                    isLoading={isAdviceLoading}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-md w-full sm:w-auto"
                                    icon={RefreshCw}
                                >
                                    Générer conseil
                                </Button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-indigo-800 text-sm font-medium leading-relaxed italic bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                    "{adviceText}"
                                </p>
                                <button 
                                    onClick={() => setAdviceText('')} 
                                    className="text-xs text-indigo-500 hover:text-indigo-700 mt-2 underline"
                                >
                                    Générer un autre conseil
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {staff.length > 0 ? (
                <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h2 className="text-center font-bold text-slate-900 uppercase tracking-widest text-sm mb-4">🏆 Classement ({period === 'custom' ? 'Période' : PERIODS.find(p => p.id === period)?.label})</h2>
                    <Podium winners={sortedStaff} />
                </div>
            ) : (
                <div className="p-12 text-center bg-slate-50 rounded-xl border-dashed border border-slate-300">
                    <Medal className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Aucun membre d'équipe configuré</h3>
                    <p className="text-slate-500 mb-6">Ajoutez votre personnel pour commencer le challenge. L'IA attribuera automatiquement les avis s'ils sont mentionnés.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* LIST */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Individuelle</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase">
                                            <th className="pb-3 pl-2">Membre</th>
                                            <th className="pb-3">Rôle</th>
                                            <th className="pb-3 text-center">Avis Récoltés</th>
                                            <th className="pb-3 text-center">Note Moy.</th>
                                            <th className="pb-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {staff.map(member => (
                                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 pl-2">
                                                    <div className="flex items-center gap-3">
                                                        <img src={getGenderedAvatar(member.name, member.avatar)} alt={member.name} className="h-10 w-10 rounded-full bg-slate-200 object-cover border border-white shadow-sm" />
                                                        <div>
                                                            <div className="font-bold text-slate-900">{member.name}</div>
                                                            <div className="text-[10px] text-slate-400">{member.email || "Pas d'email"}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm text-slate-500">{member.role}</td>
                                                <td className="py-4 text-center">
                                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        {member.reviews_count}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
                                                        {member.average_rating > 0 ? member.average_rating.toFixed(1) : '-'} <Star className="h-3 w-3 text-amber-400 fill-current" />
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right flex items-center justify-end gap-2">
                                                    <button onClick={() => handleSendReward(member)} className="text-slate-400 hover:text-green-600 p-2" title="Féliciter">
                                                        <Gift className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(member.id)} className="text-slate-400 hover:text-red-500 p-2" title="Supprimer">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ADD FORM */}
                <div>
                    <Card className="bg-slate-50 border-indigo-100 sticky top-24">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-indigo-600" />
                                Ajouter un membre
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prénom (pour détection IA)</label>
                                <Input 
                                    placeholder="Ex: Thomas" 
                                    value={newStaffName}
                                    onChange={e => setNewStaffName(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Si un avis contient "Merci Thomas", il lui sera attribué.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email (pour récompenses)</label>
                                <Input 
                                    type="email"
                                    placeholder="thomas@restaurant.com" 
                                    value={newStaffEmail}
                                    onChange={e => setNewStaffEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                                <Select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </Select>
                            </div>
                            
                            <Button 
                                className="w-full mt-4" 
                                icon={Plus} 
                                onClick={handleAddStaff} 
                                isLoading={isAdding} 
                                disabled={!newStaffName}
                            >
                                Ajouter à l'équipe
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};