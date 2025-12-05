import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Customer, PipelineStage } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, useToast, Select } from '../components/ui';
import { Users, Search, Download, Star, Filter, Heart, AlertTriangle, X, Mail, MessageCircle, DollarSign, Calendar, LayoutGrid, List, Sparkles, Wand2, ArrowRight, Zap } from 'lucide-react';

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
    { id: 'new', label: 'Nouveaux', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'risk', label: 'À Traiter (Risque)', color: 'bg-red-50 border-red-200 text-red-700' },
    { id: 'loyal', label: 'Fidélisés (VIP)', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'churned', label: 'Perdus / Archivés', color: 'bg-slate-50 border-slate-200 text-slate-600' }
];

const KanbanColumn = ({ stage, customers, onSelect }: { stage: typeof STAGES[0], customers: Customer[], onSelect: (c: Customer) => void }) => (
    <div className="flex-1 min-w-[280px] bg-slate-50/50 rounded-xl p-3 border border-slate-200 flex flex-col h-full">
        <div className={`mb-3 px-3 py-2 rounded-lg font-bold text-sm uppercase tracking-wide border ${stage.color} flex justify-between items-center`}>
            {stage.label}
            <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{customers.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {customers.map(c => (
                <div 
                    key={c.id} 
                    onClick={() => onSelect(c)}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-900 truncate max-w-[150px]">{c.name}</div>
                        <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {c.average_rating} <Star className="h-3 w-3 fill-current text-amber-400" />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>{c.total_reviews} avis</span>
                        <span className="text-indigo-600 font-medium">{c.ltv_estimate ? c.ltv_estimate + '€' : '-'}</span>
                    </div>

                    {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {c.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  
  // Filters
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterLtv, setFilterLtv] = useState('all');

  const toast = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
      let result = customers;
      
      // Search
      if (search) {
          const q = search.toLowerCase();
          result = result.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
      }

      // Filter Sentiment
      if (filterSentiment !== 'all') {
          result = result.filter(c => c.status === filterSentiment);
      }

      // Filter LTV
      if (filterLtv === 'high') {
          result = result.filter(c => (c.ltv_estimate || 0) > 200);
      }

      setFilteredCustomers(result);
  }, [search, customers, filterSentiment, filterLtv]);

  const loadCustomers = async () => {
      setLoading(true);
      try {
          const data = await api.customers.list();
          setCustomers(data);
          setFilteredCustomers(data);
      } catch (e) {
          console.error(e);
          toast.error("Erreur chargement clients");
      } finally {
          setLoading(false);
      }
  };

  const handleExport = () => {
      const rows = [
          ['Nom', 'Source', 'Note Moyenne', 'Total Avis', 'Statut', 'Dernière Interaction'],
          ...filteredCustomers.map(c => [c.name, c.source, c.average_rating.toFixed(1), c.total_reviews, c.status, new Date(c.last_interaction).toLocaleDateString()])
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "base_clients.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export terminé");
  };

  const handleStageChange = async (newStage: PipelineStage) => {
      if (!selectedCustomer) return;
      
      // Optimistic Update
      const updated = { ...selectedCustomer, stage: newStage };
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedCustomer(updated);

      try {
          await api.customers.update(updated.id, { stage: newStage });
          toast.success("Statut mis à jour");
      } catch (e) {
          toast.error("Erreur mise à jour");
          loadCustomers(); // Revert
      }
  };

  const handleEnrichProfile = async () => {
      if (!selectedCustomer) return;
      setEnriching(true);
      try {
          const insight = await api.customers.enrichProfile(selectedCustomer.id);
          const updated = { ...selectedCustomer, ai_insight: insight };
          
          setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
          setSelectedCustomer(updated);
          toast.success("Profil analysé par l'IA !");
      } catch (e) {
          toast.error("Erreur analyse IA");
      } finally {
          setEnriching(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              CRM Clients
              <Badge variant="neutral" className="text-sm font-normal">{customers.length}</Badge>
          </h1>
          <p className="text-slate-500">Gérez vos relations et identifiez vos ambassadeurs.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('board')} className={`p-2 rounded ${viewMode === 'board' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List className="h-4 w-4" />
                </button>
            </div>
            <Button variant="outline" icon={Download} onClick={handleExport}>Export</Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6 shrink-0 overflow-x-auto pb-2">
          <div className="relative w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-9" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
          </div>
          <Select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} className="w-40 shrink-0">
              <option value="all">Tous Status</option>
              <option value="promoter">Promoteurs</option>
              <option value="detractor">Détracteurs</option>
          </Select>
          <Select value={filterLtv} onChange={e => setFilterLtv(e.target.value)} className="w-40 shrink-0">
              <option value="all">LTV: Tous</option>
              <option value="high">VIP (> 200€)</option>
          </Select>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 min-h-0 relative">
          
          {/* BOARD VIEW */}
          {viewMode === 'board' && (
              <div className="h-full overflow-x-auto overflow-y-hidden">
                  <div className="flex gap-4 h-full min-w-[1000px]">
                      {STAGES.map(stage => (
                          <KanbanColumn 
                              key={stage.id} 
                              stage={stage} 
                              customers={filteredCustomers.filter(c => c.stage === stage.id)} 
                              onSelect={setSelectedCustomer}
                          />
                      ))}
                  </div>
              </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
              <Card className="h-full overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Étape</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Note Moy.</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">LTV</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dernier Avis</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-50">
                              {filteredCustomers.map(customer => (
                                  <tr 
                                    key={customer.id} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedCustomer(customer)}
                                  >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                              <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mr-3 border border-indigo-200">
                                                  {customer.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-medium text-slate-900">{customer.name}</div>
                                                  <div className="text-xs text-slate-500">{customer.email}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <Badge variant="neutral" className="uppercase text-[10px]">{STAGES.find(s => s.id === customer.stage)?.label}</Badge>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center gap-1 font-bold text-slate-700">
                                              {customer.average_rating.toFixed(1)} <Star className="h-3 w-3 text-amber-400 fill-current" />
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                                          {customer.ltv_estimate ? customer.ltv_estimate + '€' : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                          {new Date(customer.last_interaction).toLocaleDateString()}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </Card>
          )}
      </div>

      {/* CUSTOMER DETAIL DRAWER */}
      {selectedCustomer && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 border-l border-slate-200 transform transition-transform duration-300 overflow-y-auto animate-in slide-in-from-right flex flex-col">
              
              {/* HEADER */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                          <div className="h-16 w-16 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center font-bold text-2xl text-indigo-600 shadow-sm">
                              {selectedCustomer.name.charAt(0)}
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                  {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {selectedCustomer.email}</span>}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="h-5 w-5" />
                      </button>
                  </div>

                  {/* STAGE SELECTOR */}
                  <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
                      {STAGES.map((s, i) => (
                          <button
                              key={s.id}
                              onClick={() => handleStageChange(s.id)}
                              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${selectedCustomer.stage === s.id ? s.color + ' shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                              {s.label.split(' ')[0]}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                  
                  {/* METRICS */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                              <DollarSign className="h-3 w-3" /> Valeur Vie (LTV)
                          </span>
                          <div className="text-2xl font-bold text-slate-900">{selectedCustomer.ltv_estimate ? selectedCustomer.ltv_estimate + '€' : 'N/A'}</div>
                      </div>
                      <div className={`p-4 rounded-xl border ${selectedCustomer.status === 'promoter' ? 'bg-green-50 border-green-100' : selectedCustomer.status === 'detractor' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                              <Heart className="h-3 w-3" /> Fidélité
                          </span>
                          <div className={`text-2xl font-bold capitalize ${selectedCustomer.status === 'promoter' ? 'text-green-700' : selectedCustomer.status === 'detractor' ? 'text-red-700' : 'text-slate-700'}`}>
                              {selectedCustomer.status}
                          </div>
                      </div>
                  </div>

                  {/* AI ANALYSIS */}
                  <div className="relative">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-indigo-600" /> Profil IA
                          </h3>
                          {!selectedCustomer.ai_insight && (
                              <Button size="xs" variant="outline" onClick={handleEnrichProfile} isLoading={enriching} icon={Wand2}>
                                  Analyser le profil
                              </Button>
                          )}
                      </div>

                      {selectedCustomer.ai_insight ? (
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 shadow-sm animate-in fade-in zoom-in-95">
                              <div className="mb-4">
                                  <h4 className="text-xs font-bold text-indigo-800 uppercase mb-1">Analyse Psychologique</h4>
                                  <p className="text-sm text-indigo-900 leading-relaxed italic">"{selectedCustomer.ai_insight.profile}"</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3 border border-indigo-100/50">
                                  <h4 className="text-xs font-bold text-purple-800 uppercase mb-1 flex items-center gap-1">
                                      <Zap className="h-3 w-3" /> Next Best Action
                                  </h4>
                                  <p className="text-sm text-purple-900 font-medium">{selectedCustomer.ai_insight.suggestion}</p>
                              </div>
                          </div>
                      ) : (
                          <div className="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-300">
                              <p className="text-xs text-slate-400 mb-2">Aucune analyse générée.</p>
                              <Button size="xs" variant="ghost" onClick={handleEnrichProfile} disabled={enriching}>
                                  Lancer l'analyse Gemini
                              </Button>
                          </div>
                      )}
                  </div>

                  {/* TIMELINE */}
                  <div>
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" /> Historique
                      </h3>
                      <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                          {selectedCustomer.history && selectedCustomer.history.length > 0 ? selectedCustomer.history.map((event, i) => (
                              <div key={i} className="relative group">
                                  <div className={`absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm group-hover:scale-125 transition-transform ${event.type === 'review' ? (event.sentiment === 'positive' ? 'bg-green-500' : 'bg-red-500') : 'bg-slate-400'}`}></div>
                                  <div className="text-xs text-slate-400 mb-0.5">{new Date(event.date).toLocaleDateString()}</div>
                                  <div className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:border-slate-300 transition-colors">
                                      {event.details}
                                  </div>
                              </div>
                          )) : (
                              <p className="text-sm text-slate-400 italic">Aucun historique détaillé.</p>
                          )}
                      </div>
                  </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3">
                  <Button variant="outline" icon={MessageCircle} onClick={() => toast.info("Email ouvert")}>
                      Email
                  </Button>
                  <Button variant="primary" className="shadow-lg shadow-indigo-200" icon={ArrowRight}>
                      Voir détails complets
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
};