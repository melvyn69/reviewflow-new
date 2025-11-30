import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WorkflowRule } from '../types';
import { Card, CardContent, Button, Toggle, Badge, useToast, Input } from '../components/ui';
import { Plus, Play, Zap, MoreVertical, Loader2, CheckCircle2, AlertTriangle, Clock, Settings, Shield, Activity, Share2 } from 'lucide-react';

const WorkflowItem: React.FC<{ workflow: WorkflowRule }> = ({ workflow }) => {
  const [enabled, setEnabled] = useState(workflow.enabled);

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            <Zap className="h-5 w-5" />
          </div>
          <div>
             <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
             <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
               <span className="capitalize">{workflow.trigger === 'review_created' ? 'Nouvel avis' : 'Avis modifié'}</span>
               <span>•</span>
               <span>{workflow.conditions.length} conditions</span>
               <span>•</span>
               <span>{workflow.actions.length} actions</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${enabled ? 'text-indigo-600' : 'text-slate-400'}`}>
              {enabled ? 'Actif' : 'Inactif'}
            </span>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AutomationPage = () => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{processed: number, actions: number, alerts: number} | null>(null);
  
  // Builder State
  const [builderAction, setBuilderAction] = useState('notify');
  const [builderPlatform, setBuilderPlatform] = useState('instagram');

  const toast = useToast();

  useEffect(() => {
    // REAL LOAD
    api.automation.getWorkflows().then(setWorkflows);
  }, []);

  const handleCreateWorkflow = async () => {
    setIsCreating(true);
    
    const newWorkflow: WorkflowRule = {
        id: `wf-${Date.now()}`,
        name: builderAction === 'publish_social' ? `Auto-Publish sur ${builderPlatform}` : 'Nouveau Workflow Auto',
        enabled: true,
        trigger: 'review_created',
        conditions: [{ field: 'rating', operator: 'gte', value: 5}],
        actions: [{ 
            type: builderAction as any, 
            config: builderAction === 'publish_social' ? { platform: builderPlatform } : {}
        }]
    };

    // REAL SAVE via API
    await api.automation.create(newWorkflow);
    
    // Refresh list
    const updated = await api.automation.getWorkflows();
    setWorkflows(updated);

    setIsCreating(false);
    setShowBuilder(false);
    toast.success("Workflow créé et activé !");
  };

  const handleRunAutomation = async () => {
      setIsRunning(true);
      setLastRunResult(null);
      try {
          const result = await api.automation.run();
          setLastRunResult(result);
          if (result.actions > 0 || result.alerts > 0) {
              toast.success(`${result.actions} actions effectuées (Réponses/Posts) et ${result.alerts} alertes.`);
          } else {
              toast.info("Aucun avis ne correspond aux règles.");
          }
      } catch (e) {
          console.error(e);
          toast.error("Erreur lors de l'exécution");
      } finally {
          setIsRunning(false);
      }
  };

  if (showBuilder) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setShowBuilder(false)}>← Retour</Button>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau Workflow</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-4 border-b border-slate-200 font-semibold bg-slate-50 rounded-t-xl">1. Déclencheur</div>
            <CardContent>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quand ceci arrive :</label>
              <select className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                <option value="review_created">Nouvel Avis Reçu</option>
                <option value="review_updated">Avis Mis à jour</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <div className="p-4 border-b border-slate-200 font-semibold bg-slate-50 rounded-t-xl">2. Conditions</div>
            <CardContent>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Si la note est...</label>
                      <div className="flex gap-4 items-center">
                          <select className="block w-32 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 sm:text-sm px-3 py-2 border">
                              <option value="gte">Supérieur ou égal à</option>
                              <option value="equals">Égal à</option>
                          </select>
                          <select className="block w-20 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 sm:text-sm px-3 py-2 border">
                              <option value="5">5 ★</option>
                              <option value="4">4 ★</option>
                          </select>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-center">
                    <Button variant="outline" size="sm" icon={Plus}>Ajouter Condition</Button>
                  </div>
              </div>
            </CardContent>
          </Card>

          <Card>
             <div className="p-4 border-b border-slate-200 font-semibold bg-slate-50 rounded-t-xl">3. Actions</div>
             <CardContent>
               <div className="space-y-4">
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">Effectuer cette action :</label>
                       <select 
                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border mb-4"
                            value={builderAction}
                            onChange={(e) => setBuilderAction(e.target.value)}
                        >
                            <option value="notify">Envoyer une alerte Email</option>
                            <option value="generate_ai_reply">Générer un brouillon de réponse IA</option>
                            <option value="auto_reply">Répondre automatiquement (Auto-Pilot)</option>
                            <option value="publish_social">Publier sur les Réseaux Sociaux (Marketing)</option>
                       </select>

                       {builderAction === 'publish_social' && (
                           <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                               <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                   <Share2 className="h-4 w-4" /> Destination
                               </label>
                               <div className="flex gap-4">
                                   <label className="flex items-center gap-2 cursor-pointer">
                                       <input 
                                            type="radio" 
                                            name="platform" 
                                            value="instagram" 
                                            checked={builderPlatform === 'instagram'}
                                            onChange={() => setBuilderPlatform('instagram')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                       />
                                       <span className="text-sm">Instagram</span>
                                   </label>
                                   <label className="flex items-center gap-2 cursor-pointer">
                                       <input 
                                            type="radio" 
                                            name="platform" 
                                            value="facebook"
                                            checked={builderPlatform === 'facebook'}
                                            onChange={() => setBuilderPlatform('facebook')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                       />
                                       <span className="text-sm">Facebook</span>
                                   </label>
                               </div>
                               <p className="text-xs text-indigo-700 mt-2">
                                   L'IA générera automatiquement un visuel et une légende optimisée pour ce réseau.
                               </p>
                           </div>
                       )}
                   </div>
               </div>
             </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setShowBuilder(false)}>Annuler</Button>
             <Button variant="primary" icon={Play} onClick={handleCreateWorkflow} isLoading={isCreating}>Activer le Workflow</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automatisation</h1>
          <p className="text-slate-500">Gérez le pilote automatique de votre relation client.</p>
        </div>
        <div className="flex gap-3">
            <Button 
                variant="secondary" 
                icon={Play} 
                onClick={handleRunAutomation} 
                isLoading={isRunning}
                className="shadow-sm border-indigo-200 text-indigo-700 bg-indigo-50"
            >
                Exécuter les règles maintenant
            </Button>
            <Button onClick={() => setShowBuilder(true)} icon={Plus}>Nouveau Workflow</Button>
        </div>
      </div>

      {/* System Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-slate-900 text-white border-slate-800">
              <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
                          <Activity className="h-6 w-6" />
                      </div>
                      <div>
                          <h3 className="font-bold text-lg">Pilote Automatique Actif</h3>
                          <p className="text-slate-400 text-sm">Le système surveille vos avis 24h/24 et 7j/7.</p>
                      </div>
                  </div>
                  <div className="text-right hidden sm:block">
                      <div className="text-2xl font-bold text-green-400">100%</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Uptime</div>
                  </div>
              </CardContent>
          </Card>

          <Card>
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          Fréquence
                      </h4>
                      <Badge variant="neutral">10 min</Badge>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500">Prochaine exécution dans 7 minutes.</p>
              </CardContent>
          </Card>
      </div>

      {lastRunResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-bold text-green-800 text-sm">Exécution manuelle terminée</h4>
                  </div>
                  <ul className="text-sm text-green-700 list-disc list-inside ml-7">
                      <li>{lastRunResult.processed} avis analysés</li>
                      <li>{lastRunResult.actions} actions (Réponses ou Posts)</li>
                      <li>{lastRunResult.alerts} alertes envoyées</li>
                  </ul>
              </div>
          </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Règles de Workflow</h2>
            <Button variant="ghost" size="xs" icon={Settings}>Configurer</Button>
        </div>
        {workflows.map(wf => (
          <WorkflowItem key={wf.id} workflow={wf} />
        ))}
        {workflows.length === 0 && <div className="text-slate-400 italic text-center py-8">Aucun workflow configuré.</div>}
      </div>
      
      {/* Footer Hint */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-800">
          <Shield className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
              <strong>Sécurité activée :</strong> Par défaut, toutes les réponses automatiques sont enregistrées en tant que "Brouillon" pour validation humaine. Vous pouvez changer ce comportement dans les réglages avancés de chaque règle.
          </p>
      </div>
    </div>
  );
};