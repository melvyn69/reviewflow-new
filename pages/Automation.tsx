
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WorkflowRule, Organization, Condition, Action, ActionType, TriggerType } from '../types';
import { Card, CardContent, Button, Toggle, Badge, useToast, Input, Select } from '../components/ui';
import { Plus, Play, Zap, MoreVertical, Loader2, CheckCircle2, Trash2, Save, X, ArrowRight, Settings, Gift, AlertTriangle, MessageCircle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const generateId = () => Math.random().toString(36).substr(2, 9);

const WorkflowTemplateCard = ({ title, description, icon: Icon, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className="flex flex-col p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
    >
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
);

const WorkflowEditor = ({ workflow, onSave, onCancel }: { workflow: WorkflowRule | null, onSave: (w: WorkflowRule) => void, onCancel: () => void }) => {
    const [name, setName] = useState(workflow?.name || 'Nouveau Workflow');
    const [trigger, setTrigger] = useState<TriggerType>(workflow?.trigger || 'review_created');
    const [conditions, setConditions] = useState<Condition[]>(workflow?.conditions || []);
    const [actions, setActions] = useState<Action[]>(workflow?.actions || []);
    const [saving, setSaving] = useState(false);

    const handleAddCondition = () => {
        setConditions([...conditions, { id: generateId(), field: 'rating', operator: 'equals', value: 5 }]);
    };

    const handleRemoveCondition = (id: string) => {
        setConditions(conditions.filter(c => c.id !== id));
    };

    const updateCondition = (id: string, field: string, value: any) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleAddAction = () => {
        setActions([...actions, { id: generateId(), type: 'generate_ai_reply', config: { tone: 'professionnel' } }]);
    };

    const handleRemoveAction = (id: string) => {
        setActions(actions.filter(a => a.id !== id));
    };

    const updateAction = (id: string, field: string, value: any) => {
        setActions(actions.map(a => {
            if (a.id === id) {
                if (field === 'type') {
                    // Reset config when type changes
                    return { ...a, type: value, config: {} };
                }
                if (field === 'config') {
                    return { ...a, config: { ...a.config, ...value } };
                }
            }
            return a;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const rule: WorkflowRule = {
            id: workflow?.id || generateId(),
            name,
            enabled: true,
            trigger: trigger as any,
            conditions,
            actions
        };
        await onSave(rule);
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{workflow ? 'Modifier le Workflow' : 'Créer un Workflow'}</h2>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                    <Button icon={Save} onClick={handleSave} isLoading={saving}>Enregistrer</Button>
                </div>
            </div>

            <Card>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-600" /> DÉCLENCHEUR
                </div>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du workflow</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Réponse 5 étoiles" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quand...</label>
                            <Select value={trigger} onChange={(e) => setTrigger(e.target.value as any)}>
                                <option value="review_created">Nouvel avis reçu</option>
                                {/* Future: <option value="review_updated">Avis modifié</option> */}
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-indigo-600" /> CONDITIONS (SI)
                    </div>
                    <Button size="xs" variant="outline" icon={Plus} onClick={handleAddCondition}>Ajouter</Button>
                </div>
                <CardContent className="p-6 space-y-4">
                    {conditions.length === 0 && <p className="text-sm text-slate-400 italic text-center">Aucune condition (Le workflow s'exécutera toujours).</p>}
                    
                    {conditions.map((cond, index) => (
                        <div key={cond.id} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                            {index > 0 && <div className="absolute -top-5 left-8 text-xs font-bold text-slate-400 bg-white px-2 py-0.5 border rounded">ET</div>}
                            
                            <Select 
                                className="w-full sm:w-1/3" 
                                value={cond.field} 
                                onChange={(e) => updateCondition(cond.id, 'field', e.target.value)}
                            >
                                <option value="rating">Note (Étoiles)</option>
                                <option value="source">Source (Google, etc.)</option>
                                <option value="content">Contenu du message</option>
                            </Select>

                            <Select 
                                className="w-full sm:w-1/4" 
                                value={cond.operator} 
                                onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                            >
                                <option value="equals">Est égal à</option>
                                <option value="gte">Supérieur ou égal à</option>
                                <option value="lte">Inférieur ou égal à</option>
                                <option value="contains">Contient</option>
                                <option value="not_contains">Ne contient pas</option>
                            </Select>

                            <div className="flex-1 w-full">
                                {cond.field === 'rating' ? (
                                    <Select value={cond.value} onChange={(e) => updateCondition(cond.id, 'value', parseInt(e.target.value))}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
                                    </Select>
                                ) : cond.field === 'source' ? (
                                    <Select value={cond.value} onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}>
                                        <option value="google">Google</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="tripadvisor">TripAdvisor</option>
                                    </Select>
                                ) : (
                                    <Input 
                                        value={cond.value} 
                                        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                                        placeholder="Mot-clé..."
                                    />
                                )}
                            </div>

                            <button onClick={() => handleRemoveCondition(cond.id)} className="text-slate-400 hover:text-red-500 p-2">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-indigo-600" /> ACTIONS (ALORS)
                    </div>
                    <Button size="xs" variant="outline" icon={Plus} onClick={handleAddAction}>Ajouter</Button>
                </div>
                <CardContent className="p-6 space-y-4">
                    {actions.length === 0 && <p className="text-sm text-red-400 italic text-center">Ajoutez au moins une action.</p>}

                    {actions.map((action, index) => (
                        <div key={action.id} className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 relative">
                            <div className="flex justify-between mb-3">
                                <Select 
                                    className="w-full sm:w-1/2 font-bold" 
                                    value={action.type} 
                                    onChange={(e) => updateAction(action.id, 'type', e.target.value)}
                                >
                                    <option value="generate_ai_reply">Générer brouillon IA</option>
                                    <option value="auto_reply">Répondre automatiquement (Auto-pilot)</option>
                                    <option value="email_alert">M'envoyer une alerte email</option>
                                    <option value="add_tag">Ajouter un tag interne</option>
                                </Select>
                                <button onClick={() => handleRemoveAction(action.id)} className="text-slate-400 hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="pl-4 border-l-2 border-indigo-200">
                                {(action.type === 'generate_ai_reply' || action.type === 'auto_reply') && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Ton de la réponse</label>
                                            <Select 
                                                value={action.config.tone || 'professionnel'} 
                                                onChange={(e) => updateAction(action.id, 'config', { tone: e.target.value })}
                                            >
                                                <option value="professionnel">Professionnel</option>
                                                <option value="enthusiastic">Enthousiaste</option>
                                                <option value="empathic">Empathique</option>
                                                <option value="apologetic">Excusant (Désolé)</option>
                                            </Select>
                                        </div>
                                        {action.type === 'auto_reply' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Délai avant envoi</label>
                                                <Select 
                                                    value={action.config.delay_minutes || 0}
                                                    onChange={(e) => updateAction(action.id, 'config', { delay_minutes: parseInt(e.target.value) })}
                                                >
                                                    <option value={0}>Immédiat</option>
                                                    <option value={15}>15 minutes</option>
                                                    <option value={60}>1 heure</option>
                                                    <option value={120}>2 heures</option>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {action.type === 'email_alert' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Destinataire</label>
                                        <Input 
                                            placeholder="manager@entreprise.com" 
                                            value={action.config.email_to || ''}
                                            onChange={(e) => updateAction(action.id, 'config', { email_to: e.target.value })}
                                        />
                                    </div>
                                )}

                                {action.type === 'add_tag' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nom du tag</label>
                                        <Input 
                                            placeholder="Ex: Urgent, VIP, Spam..." 
                                            value={action.config.tag_name || ''}
                                            onChange={(e) => updateAction(action.id, 'config', { tag_name: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export const AutomationPage = () => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const [wfs, organization] = await Promise.all([
          api.automation.getWorkflows(),
          api.organization.get()
      ]);
      setWorkflows(wfs);
      setOrg(organization);
      setLoading(false);
  };

  const handleDelete = async (id: string) => {
      if(confirm("Supprimer ce workflow ?")) {
          await api.automation.deleteWorkflow(id);
          loadData();
          toast.success("Workflow supprimé");
      }
  };

  const handleSaveWorkflow = async (workflow: WorkflowRule) => {
      try {
          await api.automation.saveWorkflow(workflow);
          setIsEditing(false);
          setEditingWorkflow(null);
          loadData();
          toast.success("Workflow sauvegardé !");
      } catch (e: any) {
          toast.error("Erreur sauvegarde: " + e.message);
      }
  };

  const handleToggle = async (workflow: WorkflowRule) => {
      const updated = { ...workflow, enabled: !workflow.enabled };
      // Optimistic update
      setWorkflows(workflows.map(w => w.id === workflow.id ? updated : w));
      try {
          await api.automation.saveWorkflow(updated);
      } catch (e) {
          toast.error("Erreur mise à jour");
          loadData(); // Revert
      }
  };

  const handleRunManually = async () => {
      setIsRunning(true);
      const res = await api.automation.run();
      setIsRunning(false);
      if (res.processed > 0) {
          toast.success(`${res.processed} avis traités, ${res.actions} actions effectuées.`);
      } else {
          toast.info("Aucun avis ne correspond aux critères.");
      }
  };

  const applyTemplate = (template: any) => {
      const newWf: WorkflowRule = {
          id: generateId(),
          name: template.title,
          enabled: true,
          trigger: 'review_created',
          conditions: template.conditions,
          actions: template.actions
      };
      setEditingWorkflow(newWf);
      setIsEditing(true);
  };

  const TEMPLATES = [
      {
          title: "Win-Back VIP",
          description: "Générer une réponse enthousiaste et taguer les avis 5 étoiles pour fidélisation.",
          icon: Gift,
          color: "bg-purple-500",
          conditions: [{ id: generateId(), field: 'rating', operator: 'equals', value: 5 }],
          actions: [
              { id: generateId(), type: 'generate_ai_reply', config: { tone: 'enthusiastic' } },
              { id: generateId(), type: 'add_tag', config: { tag_name: 'VIP' } }
          ]
      },
      {
          title: "Gestion de Crise",
          description: "Alerte email immédiate et brouillon d'excuse pour tout avis négatif.",
          icon: AlertTriangle,
          color: "bg-red-500",
          conditions: [{ id: generateId(), field: 'rating', operator: 'lte', value: 2 }],
          actions: [
              { id: generateId(), type: 'email_alert', config: { email_to: 'manager@exemple.com' } },
              { id: generateId(), type: 'generate_ai_reply', config: { tone: 'apologetic' } }
          ]
      },
      {
          title: "Pilote Automatique",
          description: "Répondre automatiquement aux avis positifs sans texte (Note seule).",
          icon: CheckCircle2,
          color: "bg-green-500",
          conditions: [
              { id: generateId(), field: 'rating', operator: 'gte', value: 4 },
              { id: generateId(), field: 'content', operator: 'equals', value: '' } // Contenu vide
          ],
          actions: [
              { id: generateId(), type: 'auto_reply', config: { delay_minutes: 60, tone: 'professionnel' } }
          ]
      }
  ];

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600"/></div>;

  // PAYWALL - PRO (GROWTH) PLAN ONLY
  if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
      return (
          <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-200 mt-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-0"></div>
              <div className="relative z-10">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Automatisation Avancée</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    Créez des règles personnalisées pour répondre automatiquement, alerter votre équipe ou trier vos avis. 
                    <br/><strong>Fonctionnalité exclusive au plan Growth.</strong>
                </p>
                <Button onClick={() => navigate('/billing')} className="shadow-lg shadow-indigo-200">Passer au plan Growth</Button>
              </div>
          </div>
      );
  }

  if (isEditing) {
      return <WorkflowEditor workflow={editingWorkflow} onSave={handleSaveWorkflow} onCancel={() => { setIsEditing(false); setEditingWorkflow(null); }} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automatisation</h1>
          <p className="text-slate-500">Gagnez du temps avec des scénarios intelligents.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="secondary" icon={Play} onClick={handleRunManually} isLoading={isRunning}>Tester</Button>
            <Button icon={Plus} onClick={() => { setEditingWorkflow(null); setIsEditing(true); }}>Créer Manuellement</Button>
        </div>
      </div>

      {/* Templates Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TEMPLATES.map((tpl, i) => (
              <WorkflowTemplateCard key={i} {...tpl} onClick={() => applyTemplate(tpl)} />
          ))}
      </div>

      <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 mt-8 mb-4">
              <Zap className="h-5 w-5 text-indigo-600" />
              Vos Scénarios Actifs
          </h3>
          
          {workflows.length === 0 && (
              <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500 mb-4">Aucune règle active.</p>
                  <p className="text-xs text-slate-400">Cliquez sur un modèle ci-dessus pour commencer.</p>
              </div>
          )}

          {workflows.map(wf => (
              <Card key={wf.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${wf.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              <Zap className="h-6 w-6" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-900 text-lg">{wf.name}</h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                  {wf.conditions.map((c, i) => (
                                      <Badge key={i} variant="neutral" className="text-[10px]">
                                          {c.field} {c.operator === 'equals' ? '=' : c.operator} {c.value}
                                      </Badge>
                                  ))}
                                  <ArrowRight className="h-3 w-3 text-slate-300 self-center" />
                                  {wf.actions.map((a, i) => (
                                      <Badge key={i} variant="default" className="text-[10px]">
                                          {a.type === 'generate_ai_reply' ? 'Brouillon IA' : a.type === 'auto_reply' ? 'Réponse Auto' : a.type}
                                      </Badge>
                                  ))}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${wf.enabled ? 'text-indigo-600' : 'text-slate-400'}`}>{wf.enabled ? 'Actif' : 'Pause'}</span>
                              <Toggle checked={wf.enabled} onChange={() => handleToggle(wf)} />
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="xs" variant="ghost" icon={Settings} onClick={() => { setEditingWorkflow(wf); setIsEditing(true); }}>Éditer</Button>
                              <button onClick={() => handleDelete(wf.id)} className="p-2 text-slate-400 hover:text-red-500 rounded"><Trash2 className="h-4 w-4" /></button>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>
    </div>
  );
};
