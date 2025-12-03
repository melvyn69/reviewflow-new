
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ReportConfig } from '../types';
import { Button, Card, Badge, Toggle, useToast, Input, Select, CardHeader, CardTitle, CardContent } from '../components/ui';
import { FileText, Plus, Download, Mail, Trash2, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ReportsPage = () => {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const toast = useToast();
  
  // Edit State
  const [editingReport, setEditingReport] = useState<ReportConfig | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<'weekly'|'monthly'|'daily'>('weekly');

  useEffect(() => {
    setReports([
      {
        id: 'rep1',
        name: 'Résumé Exécutif Hebdomadaire',
        format: 'pdf',
        frequency: 'weekly',
        time: '08:00',
        enabled: true,
        last_sent: '2023-10-23'
      },
      {
        id: 'rep2',
        name: 'Audit Concurrentiel Mensuel',
        format: 'pdf',
        frequency: 'monthly',
        time: '09:00',
        enabled: false,
        last_sent: '-'
      }
    ]);
  }, []);

  const handleCreate = () => {
      const newReport: ReportConfig = {
          id: 'rep-' + Date.now(),
          name: 'Nouveau Rapport',
          format: 'pdf',
          frequency: 'monthly',
          time: '09:00',
          enabled: true,
          last_sent: '-'
      };
      setReports([...reports, newReport]);
      toast.success("Rapport créé avec succès");
  };

  const handleToggle = (id: string) => {
      setReports(reports.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDelete = (id: string) => {
      setReports(reports.filter(r => r.id !== id));
      toast.success("Rapport supprimé");
  };

  const handleEdit = (report: ReportConfig) => {
      setEditingReport(report);
      setEditName(report.name);
      setEditFrequency(report.frequency);
  };

  const handleSaveEdit = () => {
      if (!editingReport) return;
      setReports(reports.map(r => r.id === editingReport.id ? { ...r, name: editName, frequency: editFrequency } : r));
      setEditingReport(null);
      toast.success("Rapport mis à jour");
  };

  const handleDownload = async (reportName: string) => {
      toast.info("Génération du rapport PDF...");
      try {
          const [analytics, reviews, competitors] = await Promise.all([
              api.analytics.getOverview(),
              api.reviews.list({ status: 'all' }),
              api.competitors.list()
          ]);

          const doc = new jsPDF();
          const isCompetitiveReport = reportName.toLowerCase().includes('concurrentiel') || reportName.toLowerCase().includes('audit');
          
          doc.setFontSize(22);
          doc.setTextColor(79, 70, 229); // Indigo
          doc.text("Reviewflow", 20, 20);
          
          doc.setFontSize(16);
          doc.setTextColor(30, 41, 59); // Slate-800
          doc.text(isCompetitiveReport ? "Audit de Veille Concurrentielle" : "Rapport de Performance", 20, 30);
          
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
          
          if (isCompetitiveReport) {
              // --- SECTION CONCURRENTIELLE ---
              doc.setFontSize(14);
              doc.setTextColor(0);
              doc.text("1. Analyse du Marché", 20, 60);
              
              const compData = competitors.map(c => [
                  c.name,
                  c.rating + "/5",
                  c.review_count,
                  c.strengths.slice(0,2).join(', '),
                  c.weaknesses.slice(0,2).join(', ')
              ]);

              // Ajouter notre entreprise
              compData.unshift([
                  "VOUS", 
                  analytics.average_rating + "/5", 
                  analytics.total_reviews, 
                  "Service, Qualité", 
                  "-"
              ]);

              autoTable(doc, {
                  startY: 65,
                  head: [['Établissement', 'Note', 'Avis', 'Forces', 'Faiblesses']],
                  body: compData,
                  theme: 'striped',
                  headStyles: { fillColor: [79, 70, 229] },
                  styles: { fontSize: 10 }
              });

              const finalY = (doc as any).lastAutoTable.finalY + 15;
              doc.setFontSize(12);
              doc.text("2. Insights Stratégiques", 20, finalY);
              doc.setFontSize(10);
              doc.setTextColor(80);
              const rank = compData.sort((a:any, b:any) => parseFloat(b[1]) - parseFloat(a[1])).findIndex((c:any) => c[0] === 'VOUS') + 1;
              doc.text(`Votre établissement est classé #${rank} sur ${compData.length} établissements analysés.`, 20, finalY + 10);
              doc.text(`La note moyenne du secteur est de ${(compData.reduce((acc:number, val:any) => acc + parseFloat(val[1]), 0) / compData.length).toFixed(2)}/5.`, 20, finalY + 16);

          } else {
              // --- SECTION PERFORMANCE CLASSIQUE ---
              doc.setFontSize(14);
              doc.setTextColor(0);
              doc.text("Résumé des KPI", 20, 60);
              
              const statsData = [
                  ["Total Avis", analytics.total_reviews.toString()],
                  ["Note Moyenne", `${analytics.average_rating}/5`],
                  ["Taux de Réponse", `${analytics.response_rate}%`],
                  ["NPS Score", analytics.nps_score.toString()]
              ];
              
              autoTable(doc, {
                  startY: 65,
                  head: [['Métrique', 'Valeur']],
                  body: statsData,
                  theme: 'striped',
                  headStyles: { fillColor: [79, 70, 229] },
                  styles: { fontSize: 11 }
              });

              doc.text("Derniers Avis Traités", 20, (doc as any).lastAutoTable.finalY + 20);
              
              const reviewsData = reviews.slice(0, 15).map(r => [
                  new Date(r.received_at).toLocaleDateString('fr-FR'),
                  r.source,
                  r.rating + "/5",
                  r.author_name,
                  r.body.substring(0, 50) + (r.body.length > 50 ? '...' : '')
              ]);

              autoTable(doc, {
                  startY: (doc as any).lastAutoTable.finalY + 25,
                  head: [['Date', 'Source', 'Note', 'Client', 'Extrait']],
                  body: reviewsData,
                  styles: { fontSize: 9 },
                  headStyles: { fillColor: [79, 70, 229] },
                  columnStyles: { 4: { cellWidth: 80 } }
              });
          }

          const pageCount = (doc as any).internal.getNumberOfPages();
          for(let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              doc.setFontSize(8);
              doc.setTextColor(150);
              doc.text('Généré par Reviewflow - Page ' + i, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
          }

          doc.save(`rapport_${reportName.toLowerCase().replace(/\s/g, '_')}.pdf`);
          toast.success("Téléchargement terminé");
      } catch (e) {
          console.error(e);
          toast.error("Erreur lors de la génération du PDF");
      }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
          <p className="text-slate-500">Exports et digests email programmés.</p>
        </div>
        <Button icon={Plus} onClick={handleCreate}>Créer un rapport</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nom du rapport</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fréquence</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Format</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dernier envoi</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${report.name.includes('Audit') ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{report.name}</div>
                      <div className="text-xs text-slate-500">Inclut tous les établissements</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900 capitalize">{report.frequency === 'weekly' ? 'Hebdomadaire' : report.frequency === 'monthly' ? 'Mensuel' : report.frequency}</div>
                  <div className="text-xs text-slate-500">à {report.time}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="neutral" className="uppercase">{report.format}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {report.last_sent || 'Jamais'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Toggle checked={report.enabled} onChange={() => handleToggle(report.id)} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
                  <button onClick={() => handleEdit(report)} className="text-indigo-600 hover:text-indigo-900">Éditer</button>
                  <button className="text-slate-400 hover:text-slate-600" onClick={() => handleDownload(report.name)} title="Télécharger"><Download className="h-4 w-4" /></button>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(report.id)}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Aucun rapport programmé.</td>
                </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Edit Modal */}
      {editingReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md animate-in zoom-in-95">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                      <CardTitle>Modifier le rapport</CardTitle>
                      <button onClick={() => setEditingReport(null)}><X className="h-5 w-5 text-slate-400" /></button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Fréquence</label>
                          <Select value={editFrequency} onChange={(e) => setEditFrequency(e.target.value as any)}>
                              <option value="daily">Quotidien</option>
                              <option value="weekly">Hebdomadaire</option>
                              <option value="monthly">Mensuel</option>
                          </Select>
                      </div>
                      <div className="flex justify-end pt-2">
                          <Button onClick={handleSaveEdit}>Enregistrer</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};
