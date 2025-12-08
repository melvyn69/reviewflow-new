
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Customer, PipelineStage } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, useToast, Select } from '../components/ui';
import { Users, Search, Download, Star, Filter, Heart, AlertTriangle, X, Mail, MessageCircle, DollarSign, Calendar, LayoutGrid, List, Sparkles, Wand2, ArrowRight, Zap, UploadCloud, FileText, CheckCircle2, Phone, Info } from 'lucide-react';

// --- UTILS ---

const getStageLabel = (stage: PipelineStage) => {
    switch (stage) {
        case 'new': return { label: 'Nouveaux', color: 'bg-blue-50 border-blue-200 text-blue-700' };
        case 'risk': return { label: 'À Traiter', color: 'bg-red-50 border-red-200 text-red-700' };
        case 'loyal': return { label: 'Fidélisés', color: 'bg-green-50 border-green-200 text-green-700' };
        case 'churned': return { label: 'Inactifs', color: 'bg-slate-50 border-slate-200 text-slate-600' };
        default: return { label: stage, color: 'bg-slate-50' };
    }
};

const getCustomerStatusLabel = (status: string) => {
    switch (status) {
        case 'promoter': return { label: 'Ambassadeur', variant: 'success' as const };
        case 'detractor': return { label: 'Insatisfait', variant: 'error' as const };
        case 'passive': return { label: 'Neutre', variant: 'neutral' as const };
        default: return { label: 'Inconnu', variant: 'neutral' as const };
    }
};

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
};

const KanbanColumn: React.FC<{ stageId: PipelineStage, customers: Customer[], onSelect: (c: Customer) => void }> = ({ stageId, customers, onSelect }) => {
    const { label, color } = getStageLabel(stageId);
    
    return (
        <div className="flex-1 min-w-[280px] bg-slate-50/50 rounded-xl p-3 border border-slate-200 flex flex-col h-full snap-center">
            <div className={`mb-3 px-3 py-2 rounded-lg font-bold text-sm uppercase tracking-wide border ${color} flex justify-between items-center sticky top-0 bg-opacity-90 backdrop-blur-sm z-10`}>
                {label}
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{customers.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-2">
                {customers.map(c => (
                    <div 
                        key={c.id} 
                        onClick={() => onSelect(c)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group relative"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-slate-900 truncate max-w-[150px]">{c.name}</div>
                            <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {c.average_rating} <Star className="h-3 w-3 fill-current text-amber-400" />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span>{c.total_reviews} avis</span>
                            <span className="text-indigo-600 font-medium" title="Valeur Client Estimée">{formatCurrency(c.ltv_estimate)}</span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <Badge variant={getCustomerStatusLabel(c.status).variant} className="text-[10px] h-5 px-1.5">
                                {getCustomerStatusLabel(c.status).label}
                            </Badge>
                            {c.email && <Mail className="h-3 w-3 text-slate-300" />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- IMPORT MODAL COMPONENT ---
const ImportModal = ({ onClose, onImport }: { onClose: () => void, onImport: () => void }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState({ name: '', email: '', phone: '' });
    const [importing, setImporting] = useState(false);
    const toast = useToast();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target?.result as string;
                // Basic CSV parser (handles commas and semicolons)
                const rows = text.split('\n').map(row => {
                    // Detect separator
                    const separator = row.includes(';') ? ';' : ',';
                    return row.split(separator).map(cell => cell.trim().replace(/^"|"$/g, ''));
                });
                
                if (rows.length > 0) {
                    setHeaders(rows[0]);
                    // Auto-map if possible
                    const lowerHeaders = rows[0].map(h => h.toLowerCase());
                    setMapping({
                        name: rows[0][lowerHeaders.findIndex(h => h.includes('nom') || h.includes('name'))] || '',
                        email: rows[0][lowerHeaders.findIndex(h => h.includes('mail'))] || '',
                        phone: rows[0][lowerHeaders.findIndex(h => h.includes('tél') || h.includes('phone'))] || ''
                    });
                    
                    setCsvData(rows.slice(1).filter(r => r.length > 1));
                    setStep(2);
                }
            };
            reader.readAsText(f);
        }
    };

    const handleProcessImport = async () => {
        if (!mapping.email && !mapping.name) return toast.error("Le Nom ou l'Email est requis.");
        setImporting(true);
        try {
            const nameIdx = headers.indexOf(mapping.name);
            const emailIdx = headers.indexOf(mapping.email);
            const phoneIdx = headers.indexOf(mapping.phone);

            const customersToImport = csvData.map(row => ({
                name: nameIdx >= 0 ? row[nameIdx] : 'Client Importé',
                email: emailIdx >= 0 ? row[emailIdx] : undefined,
                phone: phoneIdx >= 0 ? row[phoneIdx] : undefined,
                source: 'import_csv'
            })).filter(c => c.name || c.email);

            await api.customers.import(customersToImport);
            toast.success(`${customersToImport.length} clients traités (les doublons email ont été mis à jour).`);
            onImport();
            onClose();
        } catch (e: any) {
            toast.error("Erreur d'import : " + e.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                    <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-indigo-600"/> Import CSV</CardTitle>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {step === 1 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer relative group">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="group-hover:scale-105 transition-transform duration-200">
                                <FileText className="h-12 w-12 text-indigo-200 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-700">Cliquez pour choisir un fichier CSV</p>
                                <p className="text-xs text-slate-500 mt-1">Séparateur virgule ou point-virgule supporté</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>Associez les colonnes de votre fichier. Les contacts existants (même email) seront mis à jour automatiquement.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nom <span className="text-red-500">*</span></label>
                                    <select className="w-full p-2 border rounded text-sm bg-white" value={mapping.name} onChange={e => setMapping({...mapping, name: e.target.value})}>
                                        <option value="">-- Ignorer --</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                    <select className="w-full p-2 border rounded text-sm bg-white" value={mapping.email} onChange={e => setMapping({...mapping, email: e.target.value})}>
                                        <option value="">-- Ignorer --</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                                    <select className="w-full p-2 border rounded text-sm bg-white" value={mapping.phone} onChange={e => setMapping({...mapping, phone: e.target.value})}>
                                        <option value="">-- Ignorer --</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mt-2 border border-slate-200">
                                <strong className="block mb-2 text-slate-700">Aperçu des données :</strong>
                                {csvData.slice(0, 2).map((row, i) => (
                                    <div key={i} className="truncate mt-1 font-mono">{row.join(' | ')}</div>
                                ))}
                                <div className="mt-1 text-slate-400 italic">... et {csvData.length - 2} autres lignes.</div>
                            </div>

                            <div className="flex justify-end pt-4 gap-2 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                                <Button onClick={handleProcessImport} isLoading={importing} disabled={!mapping.name && !mapping.email}>
                                    Importer {csvData.length} contacts
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
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
      // Prepare CSV Data with BOM for Excel UTF-8 compatibility
      const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Source', 'Date Création', 'Total Avis', 'Note Moyenne', 'Statut', 'Valeur Client (Est.)', 'Tags'];
      
      const rows = filteredCustomers.map(c => {
          const nameParts = c.name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const statusLabel = getCustomerStatusLabel(c.status).label;
          
          return [
              firstName,
              lastName,
              c.email || '',
              c.phone || '',
              c.source,
              new Date(c.last_interaction).toLocaleDateString(),
              c.total_reviews.toString(),
              c.average_rating.toFixed(1).replace('.', ','),
              statusLabel,
              c.ltv_estimate ? c.ltv_estimate.toString() : '0',
              c.tags?.join(', ') || ''
          ];
      });
      
      // Add Header
      const csvContent = [headers, ...rows]
          .map(e => e.map(cell => `"${cell}"`).join(";")) // Use semicolon for Excel Europe
          .join("\n");
      
      const bom = "\uFEFF"; 
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export terminé (Format Excel Compatible)");
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

  const PIPELINE_STAGES: PipelineStage[] = ['new', 'risk', 'loyal', 'churned'];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={loadCustomers} />}

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              CRM Clients
              <Badge variant="neutral" className="text-sm font-normal">{filteredCustomers.length}</Badge>
          </h1>
          <p className="text-slate-500 text-sm">Gérez vos relations et transformez vos clients en ambassadeurs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                <button onClick={() => setViewMode('board')} className={`p-2 rounded transition-all ${viewMode === 'board' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List className="h-4 w-4" />
                </button>
            </div>
            <Button variant="outline" size="sm" icon={UploadCloud} onClick={() => setShowImportModal(true)} className="flex-1 md:flex-none">Import</Button>
            <Button variant="outline" size="sm" icon={Download} onClick={handleExport} className="flex-1 md:flex-none">Export</Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 mb-6 shrink-0 overflow-x-auto pb-2 w-full no-scrollbar items-center">
          <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Nom, email..." 
                className="pl-9 w-full bg-white" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
          </div>
          <Select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} className="w-40 shrink-0 bg-white">
              <option value="all">Tous Status</option>
              <option value="promoter">Ambassadeurs</option>
              <option value="detractor">Critiques</option>
          </Select>
          <Select value={filterLtv} onChange={e => setFilterLtv(e.target.value)} className="w-40 shrink-0 bg-white">
              <option value="all">Valeur: Tous</option>
              <option value="high">VIP (&gt; 200€)</option>
          </Select>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 min-h-0 relative">
          
          {/* BOARD VIEW (Kanban) */}
          {viewMode === 'board' && (
              <div className="h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory">
                  <div className="flex gap-4 h-full min-w-[100%] md:min-w-0 pb-4 px-1">
                      {PIPELINE_STAGES.map(stageId => (
                          <KanbanColumn 
                              key={stageId} 
                              stageId={stageId} 
                              customers={filteredCustomers.filter(c => c.stage === stageId)} 
                              onSelect={setSelectedCustomer}
                          />
                      ))}
                  </div>
              </div>
          )}

          {/* LIST VIEW (Optimized) */}
          {viewMode === 'list' && (
              <Card className="h-full overflow-hidden flex flex-col border-slate-200 shadow-sm">
                  <div className="flex-1 overflow-auto bg-slate-50/30">
                      
                      {/* Mobile Card View */}
                      <div className="md:hidden divide-y divide-slate-100">
                          {filteredCustomers.map(customer => {
                              const status = getCustomerStatusLabel(customer.status);
                              return (
                                  <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="p-4 bg-white hover:bg-slate-50 active:bg-slate-100 cursor-pointer">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                  {customer.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-slate-900 line-clamp-1">{customer.name}</div>
                                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                                      {customer.email ? <Mail className="h-3 w-3"/> : <Phone className="h-3 w-3"/>}
                                                      <span className="truncate max-w-[150px]">{customer.email || customer.phone || 'N/A'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="font-bold text-slate-700 flex items-center justify-end gap-1">
                                                  {customer.average_rating.toFixed(1)} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                              </div>
                                              <div className="text-[10px] text-slate-400">{customer.total_reviews} avis</div>
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-3 pl-1">
                                          <Badge variant={status.variant} className="text-[10px] px-2 py-0.5">{status.label}</Badge>
                                          <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                               <DollarSign className="h-3 w-3 text-slate-400" />
                                               {formatCurrency(customer.ltv_estimate)}
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* Desktop Table View */}
                      <table className="min-w-full divide-y divide-slate-100 hidden md:table">
                          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Note Moyenne</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" title="Valeur estimée">Valeur Client</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dernier Avis</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-50">
                              {filteredCustomers.map(customer => {
                                  const status = getCustomerStatusLabel(customer.status);
                                  return (
                                      <tr 
                                        key={customer.id} 
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedCustomer(customer)}
                                      >
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex items-center">
                                                  <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mr-3 border border-indigo-200 group-hover:bg-indigo-200 transition-colors">
                                                      {customer.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <div className="font-semibold text-slate-900">{customer.name}</div>
                                                      <div className="text-xs text-slate-500 flex items-center gap-1">
                                                          {customer.email}
                                                      </div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <Badge variant={status.variant} className="uppercase text-[10px]">{status.label}</Badge>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex items-center gap-1 font-bold text-slate-700">
                                                  {customer.average_rating.toFixed(1)} <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                                                  <span className="text-xs font-normal text-slate-400 ml-1">({customer.total_reviews})</span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-indigo-600 font-medium">
                                              {formatCurrency(customer.ltv_estimate)}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                              {new Date(customer.last_interaction).toLocaleDateString()}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </Card>
          )}
      </div>

      {/* CUSTOMER DETAIL DRAWER */}
      {selectedCustomer && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 transition-opacity" onClick={() => setSelectedCustomer(null)}></div>
            <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 border-l border-slate-200 transform transition-transform duration-300 overflow-y-auto animate-in slide-in-from-right flex flex-col">
              
              {/* HEADER */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <div className="h-16 w-16 bg-white border-4 border-white ring-1 ring-slate-200 rounded-full flex items-center justify-center font-bold text-2xl text-indigo-600 shadow-md">
                              {selectedCustomer.name.charAt(0)}
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedCustomer.name}</h2>
                              <div className="flex flex-col text-sm text-slate-500 mt-1 space-y-0.5">
                                  {selectedCustomer.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400"/> {selectedCustomer.email}</span>}
                                  {selectedCustomer.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400"/> {selectedCustomer.phone}</span>}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="h-6 w-6" />
                      </button>
                  </div>

                  {/* STAGE SELECTOR */}
                  <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex shadow-sm overflow-x-auto no-scrollbar gap-1">
                      {PIPELINE_STAGES.map((sId) => {
                          const { label, color } = getStageLabel(sId);
                          const isActive = selectedCustomer.stage === sId;
                          return (
                              <button
                                  key={sId}
                                  onClick={() => handleStageChange(sId)}
                                  className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${isActive ? color + ' shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                              >
                                  {label}
                              </button>
                          );
                      })}
                  </div>
              </div>

              <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                  
                  {/* METRICS */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-5"><DollarSign className="h-16 w-16" /></div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                              Valeur Client (LTV)
                          </span>
                          <div className="text-2xl font-bold text-slate-900">{formatCurrency(selectedCustomer.ltv_estimate)}</div>
                      </div>
                      <div className={`p-4 rounded-xl border ${selectedCustomer.status === 'promoter' ? 'bg-green-50 border-green-100' : selectedCustomer.status === 'detractor' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                              <Heart className="h-3 w-3" /> Statut
                          </span>
                          <div className={`text-2xl font-bold ${selectedCustomer.status === 'promoter' ? 'text-green-700' : selectedCustomer.status === 'detractor' ? 'text-red-700' : 'text-slate-700'}`}>
                              {getCustomerStatusLabel(selectedCustomer.status).label}
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
              <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3 shrink-0 pb-safe">
                  <Button variant="outline" icon={MessageCircle} onClick={() => toast.info("Email ouvert")}>
                      Email
                  </Button>
                  <Button variant="primary" className="shadow-lg shadow-indigo-200" icon={ArrowRight}>
                      Voir détails complets
                  </Button>
              </div>
            </div>
          </>
      )}
    </div>
  );
};
