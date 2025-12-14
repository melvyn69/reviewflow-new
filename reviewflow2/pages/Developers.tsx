
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, ApiKey } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, ProLock, Badge } from '../components/ui';
import { Terminal, Key, Copy, Trash2, Plus, AlertTriangle, Check, BookOpen, ShieldCheck, Database } from 'lucide-react';
import { useNavigate } from '../components/ui';

export const DevelopersPage = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.organization.get();
            setOrg(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateKey = async () => {
        setGenerating(true);
        try {
            await api.organization.generateApiKey(newKeyName || 'Clé API');
            toast.success("Nouvelle clé générée avec succès");
            setNewKeyName('');
            loadData();
        } catch (e) {
            toast.error("Erreur lors de la génération");
        } finally {
            setGenerating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (confirm("Êtes-vous sûr ? Cette action est irréversible et bloquera les applications utilisant cette clé.")) {
            try {
                await api.organization.revokeApiKey(id);
                toast.success("Clé révoquée");
                loadData();
            } catch (e) {
                toast.error("Erreur lors de la révocation");
            }
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copié !");
    };

    // Access Control Check
    if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
        return (
            <div className="max-w-5xl mx-auto mt-12 animate-in fade-in space-y-8 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
                        <Terminal className="h-8 w-8 text-indigo-600" /> API Développeur
                    </h1>
                    <p className="text-slate-500">Intégrez Reviewflow à vos propres outils et workflows.</p>
                </div>
                
                <ProLock 
                    title="Débloquez l'API Rest"
                    description="Accédez à vos données par programme, synchronisez vos avis avec votre CRM ou créez des dashboards sur mesure."
                    onUpgrade={() => navigate('/billing')}
                >
                    <div className="grid grid-cols-1 gap-6 p-8 filter blur-sm pointer-events-none opacity-50">
                        <div className="h-32 bg-slate-100 rounded-xl"></div>
                        <div className="h-64 bg-slate-100 rounded-xl"></div>
                    </div>
                </ProLock>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-4 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Terminal className="h-8 w-8 text-indigo-600" />
                        Espace Développeurs
                        <Badge variant="pro">PRO</Badge>
                    </h1>
                    <p className="text-slate-500">Documentation technique et gestion des accès API.</p>
                </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-amber-900">Zone Technique</h4>
                    <p className="text-sm text-amber-800 leading-relaxed mt-1">
                        Cette section est destinée aux développeurs et intégrateurs. La manipulation des clés API donne un accès direct à vos données.
                        Si vous n'êtes pas à l'aise avec les APIs REST, contactez notre support pour être accompagné.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Key Management */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Key className="h-4 w-4 text-indigo-600" /> Mes Clés API
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-3">
                                {org?.api_keys && org.api_keys.length > 0 ? (
                                    org.api_keys.map((key) => (
                                        <div key={key.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-indigo-200 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm text-slate-800">{key.name}</span>
                                                <button onClick={() => handleRevokeKey(key.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Révoquer">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-xs text-slate-600">
                                                <span className="truncate flex-1">{key.key.substring(0, 12)}...</span>
                                                <button onClick={() => copyToClipboard(key.key)} className="text-indigo-600 hover:text-indigo-800">
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2">
                                                Créée le {new Date(key.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-slate-500 italic">
                                        Aucune clé active.
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Nom (ex: Intégration Zapier)" 
                                        value={newKeyName}
                                        onChange={e => setNewKeyName(e.target.value)}
                                        className="text-sm"
                                    />
                                    <Button size="sm" onClick={handleGenerateKey} isLoading={generating} icon={Plus}>
                                        Générer
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Cas d'usage fréquents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>Afficher vos derniers avis sur votre intranet ou dashboard interne.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>Synchroniser les statistiques de réputation avec votre outil de BI (Tableau, PowerBI).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>Déclencher des workflows personnalisés via Zapier ou n8n.</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Documentation */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-slate-300 shadow-md">
                        <div className="bg-slate-900 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <BookOpen className="h-5 w-5 text-indigo-400" />
                                <span className="font-bold text-sm">Documentation Rapide</span>
                            </div>
                            <Badge variant="neutral" className="bg-slate-800 text-slate-300 border-slate-700">v1.0</Badge>
                        </div>
                        
                        <div className="divide-y divide-slate-200">
                            {/* Authentication Info */}
                            <div className="p-6">
                                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-green-600" /> Authentification
                                </h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    Toutes les requêtes doivent inclure votre clé API dans le header <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600">x-api-key</code>.
                                </p>
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-indigo-300 overflow-x-auto">
                                    curl -H "x-api-key: sk_live_..." https://api.reviewflow.com/v1/...
                                </div>
                            </div>

                            {/* Endpoint 1: Get Reviews */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Database className="h-4 w-4 text-blue-600" /> Récupérer les avis
                                    </h3>
                                    <Badge className="bg-blue-100 text-blue-700">GET</Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">
                                    Retourne une liste paginée de vos avis clients, triés par date de réception.
                                </p>
                                
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Requête Exemple</p>
                                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
{`curl -X GET https://reviewflow.vercel.app/api/public/reviews \\
  -H "x-api-key: ${org?.api_keys?.[0]?.key || 'VOTRE_CLE_ICI'}" \\
  -H "Content-Type: application/json"`}
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Réponse (200 OK)</p>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-700 overflow-x-auto max-h-40">
{`{
  "data": [
    {
      "id": "rv_123456",
      "author": "Jean Dupont",
      "rating": 5,
      "content": "Excellent service !",
      "source": "google",
      "date": "2023-10-27T10:00:00Z"
    }
  ],
  "meta": {
    "total": 128,
    "page": 1
  }
}`}
                                    </div>
                                </div>
                            </div>

                            {/* Endpoint 2: Get Stats */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Database className="h-4 w-4 text-blue-600" /> Récupérer les statistiques
                                    </h3>
                                    <Badge className="bg-blue-100 text-blue-700">GET</Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">
                                    Obtenez les KPIs globaux de votre organisation (Note moyenne, volume, NPS).
                                </p>
                                
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Requête Exemple</p>
                                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
{`curl -X GET https://reviewflow.vercel.app/api/public/stats \\
  -H "x-api-key: ${org?.api_keys?.[0]?.key || 'VOTRE_CLE_ICI'}"`}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
