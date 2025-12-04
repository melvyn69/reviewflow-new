
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Customer } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, useToast } from '../components/ui';
import { Users, Search, Download, Star, Filter, Heart, AlertTriangle, X, Mail, MessageCircle, DollarSign, Calendar } from 'lucide-react';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
      let result = customers;
      if (search) {
          const q = search.toLowerCase();
          result = result.filter(c => c.name.toLowerCase().includes(q));
      }
      setFilteredCustomers(result);
  }, [search, customers]);

  const loadCustomers = async () => {
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base Clients</h1>
          <p className="text-slate-500">Gérez vos relations et identifiez vos ambassadeurs.</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExport}>Exporter CSV</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
              <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-slate-900">{customers.length}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase">Total Clients Uniques</div>
                  </div>
              </CardContent>
          </Card>
          <Card>
              <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                      <Heart className="h-6 w-6" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-slate-900">{customers.filter(c => c.status === 'promoter').length}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase">Promoteurs (VIP)</div>
                  </div>
              </CardContent>
          </Card>
          <Card>
              <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-slate-900">{customers.filter(c => c.status === 'detractor').length}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase">À Risque</div>
                  </div>
              </CardContent>
          </Card>
      </div>

      <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
              <CardTitle>Liste des Contacts</CardTitle>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher par nom..." 
                    className="pl-9" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Note Moy.</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source</th>
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
                                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs mr-3">
                                              {customer.name.charAt(0)}
                                          </div>
                                          <div className="font-medium text-slate-900">{customer.name}</div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-1 font-bold text-slate-700">
                                          {customer.average_rating.toFixed(1)} <Star className="h-3 w-3 text-amber-400 fill-current" />
                                      </div>
                                      <div className="text-xs text-slate-400">{customer.total_reviews} avis</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      {customer.status === 'promoter' && <Badge variant="success">Promoteur</Badge>}
                                      {customer.status === 'detractor' && <Badge variant="error">Détracteur</Badge>}
                                      {customer.status === 'passive' && <Badge variant="neutral">Neutre</Badge>}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="capitalize text-sm text-slate-600">{customer.source}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                      {new Date(customer.last_interaction).toLocaleDateString()}
                                  </td>
                              </tr>
                          ))}
                          {filteredCustomers.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Aucun client trouvé.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>

      {/* CRM DETAILS SIDEBAR */}
      {selectedCustomer && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 border-l border-slate-200 transform transition-transform duration-300 overflow-y-auto animate-in slide-in-from-right">
              <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xl text-slate-500">
                              {selectedCustomer.name.charAt(0)}
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                  {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {selectedCustomer.email}</span>}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                          <X className="h-5 w-5" />
                      </button>
                  </div>

                  {/* LTV & METRICS */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                              <DollarSign className="h-3 w-3" /> Valeur Vie (LTV)
                          </span>
                          <div className="text-2xl font-bold text-indigo-700 mt-1">{selectedCustomer.ltv_estimate ? selectedCustomer.ltv_estimate + '€' : 'N/A'}</div>
                      </div>
                      <div className={`p-4 rounded-xl border ${selectedCustomer.status === 'promoter' ? 'bg-green-50 border-green-100' : selectedCustomer.status === 'detractor' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                          <span className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${selectedCustomer.status === 'promoter' ? 'text-green-900' : selectedCustomer.status === 'detractor' ? 'text-red-900' : 'text-slate-900'}`}>
                              <Heart className="h-3 w-3" /> Fidélité
                          </span>
                          <div className={`text-2xl font-bold mt-1 capitalize ${selectedCustomer.status === 'promoter' ? 'text-green-700' : selectedCustomer.status === 'detractor' ? 'text-red-700' : 'text-slate-700'}`}>
                              {selectedCustomer.status}
                          </div>
                      </div>
                  </div>

                  {/* TIMELINE */}
                  <div className="mb-8">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Historique d'activité
                      </h3>
                      <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                          {selectedCustomer.history && selectedCustomer.history.length > 0 ? selectedCustomer.history.map(event => (
                              <div key={event.id} className="relative">
                                  <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${event.type === 'review' ? (event.sentiment === 'positive' ? 'bg-green-500' : 'bg-red-500') : 'bg-slate-400'}`}></div>
                                  <div className="text-xs text-slate-400 mb-1">{new Date(event.date).toLocaleDateString()}</div>
                                  <div className="text-sm font-medium text-slate-900">{event.details}</div>
                              </div>
                          )) : (
                              <p className="text-sm text-slate-400 italic">Aucun historique détaillé disponible.</p>
                          )}
                      </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="space-y-3">
                      <h3 className="font-bold text-slate-900 mb-2">Actions Rapides</h3>
                      <Button variant="outline" className="w-full justify-start" icon={MessageCircle} onClick={() => toast.info("Ouverture du module email...")}>
                          Envoyer un message privé
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100" icon={Star}>
                          Envoyer une demande d'avis
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
