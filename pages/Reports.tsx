
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { ReportConfig, AnalyticsSummary } from '../types';
import { Button, Card, Badge, Toggle, useToast, Input, Select, CardHeader, CardTitle, CardContent } from '../components/ui';
import { FileText, Plus, Download, Mail, Trash2, X, PieChart, TrendingUp, Award, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

// --- VISUAL TEMPLATES FOR PDF GENERATION ---
// Ces composants sont rendus hors écran, convertis en images, puis injectés dans le PDF.

const ReportCoverTemplate = React.forwardRef<HTMLDivElement, { title: string, date: string, orgName: string }>(({ title, date, orgName }, ref) => (
    <div ref={ref} className="w-[800px] h-[1130px] bg-slate-900 text-white p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-8">
                <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                Reviewflow Intelligence
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight leading-tight mb-6">
                {title}
            </h1>
            <p className="text-2xl text-indigo-200 font-light">
                Analyse de performance & E-réputation
            </p>
        </div>

        <div className="relative z-10 border-t border-white/20 pt-8 flex justify-between items-end">
            <div>
                <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Préparé pour</p>
                <h3 className="text-3xl font-bold">{orgName}</h3>
            </div>
            <div className="text-right">
                <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Date du rapport</p>
                <h3 className="text-xl font-medium">{date}</h3>
            </div>
        </div>
    </div>
));

const ReportSummaryTemplate = React.forwardRef<HTMLDivElement, { analytics: AnalyticsSummary }>(({ analytics }, ref) => (
    <div ref={ref} className="w-[800px] h-[1130px] bg-white p-16 flex flex-col">
        <div className="mb-12 border-b border-slate-100 pb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Executive Summary</h2>
            <p className="text-slate-500">Synthèse des indicateurs clés de performance sur la période.</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Award className="h-6 w-6"/></div>
                    <span className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Note Moyenne</span>
                </div>
                <div className="text-6xl font-bold text-indigo-600 mb-2">{analytics.average_rating}<span className="text-2xl text-indigo-400">/5</span></div>
                <p className="text-sm text-indigo-700">Basé sur {analytics.total_reviews} avis vérifiés.</p>
            </div>
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp className="h-6 w-6"/></div>
                    <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Score NPS</span>
                </div>
                <div className="text-6xl font-bold text-emerald-600 mb-2">{analytics.nps_score}</div>
                <p className="text-sm text-emerald-700">Indice de fidélisation client.</p>
            </div>
        </div>

        <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-slate-400" /> Répartition du Sentiment
            </h3>
            <div className="h-8 w-full rounded-full overflow-hidden flex">
                <div style={{ width: `${analytics.sentiment_distribution.positive * 100}%` }} className="h-full bg-emerald-500"></div>
                <div style={{ width: `${analytics.sentiment_distribution.neutral * 100}%` }} className="h-full bg-amber-400"></div>
                <div style={{ width: `${analytics.sentiment_distribution.negative * 100}%` }} className="h-full bg-rose-500"></div>
            </div>
            <div className="flex justify-between mt-3 text-sm font-medium">
                <span className="text-emerald-600">{Math.round(analytics.sentiment_distribution.positive * 100)}% Positif</span>
                <span className="text-amber-600">{Math.round(analytics.sentiment_distribution.neutral * 100)}% Neutre</span>
                <span className="text-rose-600">{Math.round(analytics.sentiment_distribution.negative * 100)}% Négatif</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
            <div className="border border-slate-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase">Points Forts (IA)</h4>
                <ul className="space-y-3">
                    {analytics.top_themes_positive.map((t, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 capitalize">{t.name}</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{Math.round(t.weight * 100)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="border border-slate-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase">Points d'Attention (IA)</h4>
                <ul className="space-y-3">
                    {analytics.top_themes_negative.map((t, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 capitalize">{t.name}</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">{Math.round(t.weight * 100)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        
        <div className="mt-auto pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            Généré automatiquement par Reviewflow AI Engine • {new Date().getFullYear()}
        </div>
    </div>
));

export const ReportsPage = () => {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const toast = useToast();
  
  // Refs for Image Generation
  const coverRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [generatingData, setGeneratingData] = useState<{title: string, date: string, orgName: string, analytics: AnalyticsSummary | null} | null>(null);
  
  // Edit State
  const [editingReport, setEditingReport] = useState<ReportConfig | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<'weekly'|'monthly'|'daily'>('weekly');

  useEffect(() => {
    // Mock initial data
    setReports([
      {
        id: 'rep1',
        name: 'Rapport Mensuel Performance',
        format: 'pdf',
        frequency: 'monthly',
        time: '08:00',
        enabled: true,
        last_sent: '2023-10-01'
      },
      {
        id: 'rep2',
        name: 'Audit Concurrentiel',
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
      toast.info("Génération du rapport Premium...");
      
      try {
          const org = await api.organization.get();
          const analytics = await api.analytics.getOverview();
          const reviews = await api.reviews.list({ status: 'all' });

          // 1. Prepare data for the hidden DOM nodes
          setGeneratingData({
              title: reportName,
              date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
              orgName: org?.name || 'Mon Entreprise',
              analytics: analytics
          });

          // Allow DOM to render hidden elements
          await new Promise(resolve => setTimeout(resolve, 500));

          const doc = new jsPDF('p', 'mm', 'a4');
          const width = doc.internal.pageSize.getWidth();
          const height = doc.internal.pageSize.getHeight();

          // 2. Capture Cover Page (From React Component)
          if (coverRef.current) {
              const coverImg = await toPng(coverRef.current, { cacheBust: true, pixelRatio: 2 });
              doc.addImage(coverImg, 'PNG', 0, 0, width, height);
          }

          // 3. Capture Summary Page (From React Component)
          if (summaryRef.current) {
              doc.addPage();
              const summaryImg = await toPng(summaryRef.current, { cacheBust: true, pixelRatio: 2 });
              doc.addImage(summaryImg, 'PNG', 0, 0, width, height);
          }

          // 4. Standard Data Tables (using AutoTable for multi-page overflow support)
          doc.addPage();
          doc.setFontSize(18);
          doc.setTextColor(30, 41, 59);
          doc.text("Détail des Avis", 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text("Liste exhaustive des derniers retours clients.", 14, 26);

          const tableData = reviews.slice(0, 50).map(r => [
              new Date(r.received_at).toLocaleDateString(),
              r.source,
              `${r.rating}/5`,
              r.author_name,
              r.body.substring(0, 80) + (r.body.length > 80 ? '...' : '')
          ]);

          autoTable(doc, {
              startY: 35,
              head: [['Date', 'Source', 'Note', 'Client', 'Commentaire']],
              body: tableData,
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [248, 250, 252] },
              columnStyles: {
                  4: { cellWidth: 'auto' } // Auto width for comment
              }
          });

          // Footer with Page Numbers
          const pageCount = (doc as any).internal.getNumberOfPages();
          for(let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              // Don't put footer on cover
              if (i > 1) {
                  doc.setFontSize(8);
                  doc.setTextColor(150);
                  doc.text(`Reviewflow Report - Page ${i} / ${pageCount}`, width - 20, height - 10, { align: 'right' });
              }
          }

          doc.save(`Reviewflow_${reportName.replace(/\s/g, '_')}.pdf`);
          toast.success("Rapport téléchargé !");

      } catch (e) {
          console.error(e);
          toast.error("Erreur lors de la génération du PDF");
      } finally {
          // Clean up hidden DOM
          setGeneratingData(null);
      }
  };

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* HIDDEN TEMPLATES FOR PDF GENERATION */}
      <div className="fixed top-0 left-0 overflow-hidden pointer-events-none opacity-0" style={{ zIndex: -1000 }}>
          {generatingData && (
              <>
                  <ReportCoverTemplate 
                      ref={coverRef}
                      title={generatingData.title}
                      date={generatingData.date}
                      orgName={generatingData.orgName}
                  />
                  {generatingData.analytics && (
                      <ReportSummaryTemplate 
                          ref={summaryRef}
                          analytics={generatingData.analytics}
                      />
                  )}
              </>
          )}
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
          <p className="text-slate-500">Génération de documents PDF qualité "Agence".</p>
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
              <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${report.name.includes('Audit') ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{report.name}</div>
                      <div className="text-xs text-slate-500">
                          {report.name.includes('Audit') ? 'Veille concurrentielle & SWOT' : 'Rapport de performance Premium'}
                      </div>
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
