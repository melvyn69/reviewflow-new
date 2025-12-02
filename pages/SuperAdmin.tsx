import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { Users, CreditCard, Activity, TrendingUp, Search, LogIn, ShieldAlert, DollarSign, Building } from 'lucide-react';
import { useHistory } from 'react-router-dom';

const AdminKPI = ({ title, value, subtext, icon: Icon, color }: any) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
            <p className="text-xs text-slate-500">{subtext}</p>
        </CardContent>
    </Card>
);

export const SuperAdminPage = () => {
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const history = useHistory();
    const toast = useToast();

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        const data = await api.admin.getStats();
        setStats(data);
        setTenants(data.tenants);
    };

    const handleImpersonate = async (tenantId: string) => {
        // In a real app, this would get a magic token for that user
        toast.success(`Connexion en tant que admin de ${tenantId}...`);
        // Simulate switch
        setTimeout(() => {
            history.push('/dashboard');
            toast.info("Mode 'Impersonation' actif. Vous voyez ce que le client voit.");
        }, 1000);
    };

    if (!stats) return <div className="p-8 text-center">Chargement du God Mode...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-indigo-600" />
                        Super Admin
                    </h1>
                    <p className="text-slate-500">Pilotage de votre business SaaS.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Logs Système</Button>
                    <Button>Inviter un Admin</Button>
                </div>
            </div>

            {/* Business KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AdminKPI 
                    title="MRR (Revenu Mensuel)" 
                    value={stats.mrr} 
                    subtext="+12% ce mois-ci" 
                    icon={DollarSign} 
                    color="bg-green-500" 
                />
                <AdminKPI 
                    title="Clients Actifs" 
                    value={stats.active_tenants} 
                    subtext="Sur 142 inscrits" 
                    icon={Building} 
                    color="bg-indigo-500" 
                />
                <AdminKPI 
                    title="Avis Traités (Global)" 
                    value={stats.total_reviews_processed} 
                    subtext="IA Usage: 45%" 
                    icon={Activity} 
                    color="bg-blue-500" 
                />
                <AdminKPI 
                    title="Taux de Churn" 
                    value="2.1%" 
                    subtext="Faible (< 5%)" 
                    icon={TrendingUp} 
                    color="bg-amber-500" 
                />
            </div>

            {/* Tenants List */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <CardTitle>Organisations Clientes</CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Rechercher une entreprise..." 
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Organisation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Avis / Mois</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Revenu</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tenants
                                    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
                                    .map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                                                    {tenant.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{tenant.name}</div>
                                                    <div className="text-xs text-slate-500">{tenant.admin_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={tenant.plan === 'pro' ? 'success' : tenant.plan === 'starter' ? 'default' : 'neutral'}>
                                                {tenant.plan.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {tenant.usage}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                            <span className="text-sm text-slate-600">Actif</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {tenant.mrr}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                icon={LogIn} 
                                                onClick={() => handleImpersonate(tenant.name)}
                                                title="Se connecter en tant que"
                                            >
                                                Accéder
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};