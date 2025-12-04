
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { StaffMember } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast } from '../components/ui';
import { Trophy, Users, Plus, Star, Award, TrendingUp, UserPlus, Trash2, Medal, Gift, Mail } from 'lucide-react';

const Podium = ({ winners }: { winners: StaffMember[] }) => {
    if (winners.length === 0) return null;

    return (
        <div className="flex items-end justify-center gap-4 mb-12 mt-8">
            {/* 2nd Place */}
            {winners[1] && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 delay-100">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-slate-700">{winners[1].name}</div>
                        <div className="text-xs text-slate-500">{winners[1].reviews_count} avis</div>
                    </div>
                    <div className="h-32 w-24 bg-slate-300 rounded-t-lg relative flex items-center justify-center shadow-lg">
                        <span className="text-4xl font-black text-slate-400/50 absolute bottom-2">2</span>
                        <div className="h-16 w-16 bg-white rounded-full border-4 border-slate-300 absolute -top-8 flex items-center justify-center font-bold text-slate-500 text-xl overflow-hidden">
                            <img src={winners[1].avatar} alt={winners[1].name} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            )}

            {/* 1st Place */}
            {winners[0] && (
                <div className="flex flex-col items-center z-10 animate-in slide-in-from-bottom-12">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-amber-600 text-lg flex items-center gap-1">
                            <Trophy className="h-4 w-4" /> {winners[0].name}
                        </div>
                        <div className="text-sm text-slate-500 font-bold">{winners[0].reviews_count} avis (Top !)</div>
                    </div>
                    <div className="h-40 w-28 bg-gradient-to-b from-amber-300 to-amber-500 rounded-t-lg relative flex items-center justify-center shadow-xl">
                        <span className="text-5xl font-black text-white/50 absolute bottom-2">1</span>
                        <div className="h-20 w-20 bg-white rounded-full border-4 border-amber-400 absolute -top-10 flex items-center justify-center font-bold text-amber-600 text-2xl overflow-hidden shadow-md">
                            <img src={winners[0].avatar} alt={winners[0].name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-6 bg-white px-3 py-1 rounded-full text-xs font-bold text-amber-600 shadow-sm border border-amber-100 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" /> Employé du Mois
                        </div>
                    </div>
                </div>
            )}

            {/* 3rd Place */}
            {winners[2] && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 delay-200">
                    <div className="mb-2 text-center">
                        <div className="font-bold text-orange-800">{winners[2].name}</div>
                        <div className="text-xs text-slate-500">{winners[2].reviews_count} avis</div>
                    </div>
                    <div className="h-24 w-24 bg-orange-300 rounded-t-lg relative flex items-center justify-center shadow-lg">
                        <span className="text-4xl font-black text-orange-900/20 absolute bottom-2">3</span>
                        <div className="h-16 w-16 bg-white rounded-full border-4 border-orange-300 absolute -top-8 flex items-center justify-center font-bold text-orange-700 text-xl overflow-hidden">
                            <img src={winners[2].avatar} alt={winners[2].name} className="w-full h-full object-cover" />
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
    const [newStaffRole, setNewStaffRole] = useState('Serveur');
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const toast = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const org = await api.organization.get();
        setStaff(org?.staff_members || []);
        setLoading(false);
    };

    const handleAddStaff = async () => {
        if (!newStaffName) return;
        setIsAdding(true);
        try {
            await api.organization.addStaffMember(newStaffName, newStaffRole);
            setNewStaffName('');
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

    const handleSendReward = async (member: StaffMember) => {
        if(confirm(`Envoyer un email de félicitations à ${member.name} ?`)) {
            await api.organization.sendCongratulationEmail(member.id);
            toast.success(`Bravo ! Email envoyé à ${member.name}.`);
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

            {/* ASTUCE MANAGER */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <Gift className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">💡 Astuce du Manager</h3>
                        <p className="text-emerald-100 text-sm">
                            Mettez en jeu une prime de 50€ pour l'employé du mois. 
                            <br/>Un avis 5 étoiles détecté automatiquement = 1 point.
                        </p>
                    </div>
                </div>
                {sortedStaff[0] && (
                    <Button 
                        className="bg-white text-emerald-700 hover:bg-emerald-50 border-none whitespace-nowrap shadow-md"
                        icon={Mail}
                        onClick={() => handleSendReward(sortedStaff[0])}
                    >
                        Féliciter {sortedStaff[0].name}
                    </Button>
                )}
            </div>

            {staff.length > 0 ? (
                <div className="bg-gradient-to-b from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100">
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
                                                        <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-full bg-slate-200 object-cover" />
                                                        <div className="font-bold text-slate-900">{member.name}</div>
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
                                                <td className="py-4 text-right">
                                                    <button onClick={() => handleDelete(member.id)} className="text-slate-400 hover:text-red-500 p-2">
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                                <Select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                                    <option value="Serveur">Serveur</option>
                                    <option value="Vendeur">Vendeur</option>
                                    <option value="Caisse">Caisse</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Cuisinier">Cuisinier</option>
                                    <option value="Autre">Autre</option>
                                </Select>
                            </div>
                            
                            <div className="border-t border-slate-200 pt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Photo</label>
                                <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs" disabled>Choisir (Bientôt)</Button>
                                </div>
                            </div>

                            <Button 
                                className="w-full" 
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
