
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Customer } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, useToast } from '../components/ui';
import { Users, Search, Download, Star, Filter, Heart, AlertTriangle } from 'lucide-react';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
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
                              <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
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
    </div>
  );
};
