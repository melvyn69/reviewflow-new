

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { StaffMember } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast } from '../components/ui';
import { Trophy, Users, Plus, Star, Award, TrendingUp, UserPlus, Trash2, Medal, Gift, Mail, Lightbulb, RefreshCw } from 'lucide-react';

const ROLES = [
    "Serveur", "Cuisinier", "Manager", "Réception", 
    "Responsable de salle", "Community Manager", 
    "Responsable SAV", "Vendeur", "Hôte(sse)", "Barman", "Autre"
];

const getGenderedAvatar = (name: string, currentAvatar?: string) => {
    if (currentAvatar && currentAvatar.length > 0) return currentAvatar;
    
    // Heuristic simple for gender guess based on name
    const cleanName = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Some common French name patterns/lists for basic heuristic
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

    // Using UI Avatars with gender-coded colors
    const bg = isFemale ? 'f472b6' : '60a5fa'; // Pink-400 : Blue-400
    const color = 'ffffff';
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}&size=128&bold=true`;
};

const Podium = ({ winners }: { winners: StaffMember[] }) => {
    if (winners.length === 0) return null;

    return (
        <div className="flex items-end justify-center gap-2 md:gap-6 mb-8 md:mb-12 mt-4 md:mt-8">
            {/* 2nd Place */}
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

            {/* 1st Place */}
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
                            <Star className="h-3 w-3 fill-current" /> <span className="hidden md:inline">Employé du Mois</span><span className="md:hidden">MVP</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3rd Place */}
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

    const toast = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const org = await api.organization.get();
        setStaff(org?.staff_members || []);
        if (org?.staff_members && org.staff_members.length > 0) {
            // Default to first member
            setAdviceMemberId(org.staff_members[0].id);
        }
        setLoading(false);
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
            // Internal modal logic simulated here
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
            
            // Calculate rank
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
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-8 w-8 text-indigo-600" />
                        Challenge d'Équipe
                    </h1>
                    <p className="text-slate-500">Transformez la collecte d'avis en jeu collectif.</p>
                </div>
            </div>

            {/* ASTUCE MANAGER AI */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <Lightbulb className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <h3 className="font-bold text-lg mb-2">💡 Astuce du Manager (IA)</h3>
                        
                        {!adviceText ? (
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <select 
                                        className="bg-white/20 border border-white/30 text-white text-sm rounded-lg px-3 py-2 outline-none focus:bg-white/30 cursor-pointer"
                                        value={adviceMemberId}
                                        onChange={(e) => setAdviceMemberId(e.target.value)}
                                    >
                                        {staff.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>)}
                                    </select>
                                    
                                    <select 
                                        className="bg-white/20 border border-white/30 text-white text-sm rounded-lg px-3 py-2 outline-none focus:bg-white/30 cursor-pointer"
                                        value={adviceType}
                                        onChange={(e) => setAdviceType(e.target.value as any)}
                                    >
                                        <option value="volume" className="text-slate-900">Objectif: Plus d'avis (Volume)</option>
                                        <option value="quality" className="text-slate-900">Objectif: Meilleure note (Qualité)</option>
                                    </select>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={handleGenerateAdvice} 
                                    isLoading={isAdviceLoading}
                                    className="bg-white text-emerald-700 hover:bg-emerald-50 border-none shadow-md w-full sm:w-auto"
                                    icon={RefreshCw}
                                >
                                    Générer conseil
                                </Button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-emerald-50 text-sm font-medium leading-relaxed italic bg-white/10 p-3 rounded-lg border border-white/20">
                                    "{adviceText}"
                                </p>
                                <button 
                                    onClick={() => setAdviceText('')} 
                                    className="text-xs text-emerald-200 hover:text-white mt-2 underline"
                                >
                                    Générer un autre conseil
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {staff.length > 0 ? (
                <div className="bg-gradient-to-b from-indigo-50 to-white p-4 md:p-8 rounded-2xl border border-indigo-100">
                    <h2 className="text-center font-bold text-indigo-900 uppercase tracking-widest text-sm mb-4">🏆 Champions du mois</h2>
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
                                                        <img src={getGenderedAvatar(member.name, member.avatar)} alt={member.name} className="h-10 w-10 rounded-full bg-slate-200 object-cover" />
                                                        <div>
                                                            <div className="font-bold text-slate-900">{member.name}</div>
                                                            <div className="text-[10px] text-slate-400">{member.email || "Pas d'email"}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm text-slate-500">{member.role}</td>
                                                <td className="py-4 text-center">
                                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
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
