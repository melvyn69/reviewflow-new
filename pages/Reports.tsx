
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
      toast.info("Génération du rapport PDF...");
      
      try {
          const isCompetitiveReport = reportName.toLowerCase().includes('concurrentiel') || reportName.toLowerCase().includes('audit');
          const doc = new jsPDF();
          const primaryColor = [79, 70, 229]; // Indigo

          // Header Standard
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 0, 210, 30, 'F');
          doc.setFontSize(20);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text("Reviewflow", 15, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text("Intelligence Artificielle & Réputation", 15, 26);
          doc.text(`Généré le ${new Date().toLocaleDateString()}`, 150, 20);

          if (isCompetitiveReport) {
              // --- CHARGEMENT DES DONNÉES DEEP DIVE ---
              const deepData = await api.competitors.getDeepAnalysis();
              const analytics = await api.analytics.getOverview();

              // PAGE 1: VUE D'ENSEMBLE
              doc.setFontSize(26);
              doc.setTextColor(30);
              doc.text("Audit de Veille Concurrentielle", 15, 50);
              doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              doc.line(15, 55, 80, 55);

              doc.setFontSize(12);
              doc.text("Résumé Exécutif du Marché", 15, 70);
              
              const trendText = deepData.trends.map((t: string) => `• ${t}`).join('\n');
              doc.setFontSize(10);
              doc.setTextColor(80);
              doc.text(trendText, 15, 80);

              // Tableau de Part de Voix
              const marketData = deepData.competitors_detailed.map((c: any) => [
                  c.name,
                  c.rating + " ★",
                  c.review_count,
                  c.last_month_growth,
                  c.sentiment_trend
              ]);
              // Ajouter "Vous"
              marketData.unshift(["VOUS", analytics.average_rating + " ★", analytics.total_reviews, "+5%", "Positif"]);

              autoTable(doc, {
                  startY: 110,
                  head: [['Acteur', 'Note', 'Volume Total', 'Croissance', 'Tendance']],
                  body: marketData,
                  theme: 'grid',
                  headStyles: { fillColor: primaryColor as any },
                  styles: { fontSize: 10 }
              });

              // PAGE 2: SWOT
              doc.addPage();
              doc.setFontSize(16);
              doc.setTextColor(30);
              doc.text("Matrice SWOT Stratégique", 15, 20);
              
              const swotY = 30;
              const boxW = 85;
              const boxH = 60;
              const gap = 10;

              // Strengths
              doc.setFillColor(220, 252, 231); // Green 100
              doc.rect(15, swotY, boxW, boxH, 'F');
              doc.setFontSize(12); doc.setTextColor(22, 101, 52);
              doc.text("FORCES DU MARCHÉ", 20, swotY + 10);
              doc.setFontSize(9);
              deepData.swot.strengths.forEach((s:string, i:number) => doc.text(`+ ${s}`, 20, swotY + 20 + (i*6)));

              // Weaknesses
              doc.setFillColor(254, 226, 226); // Red 100
              doc.rect(15 + boxW + gap, swotY, boxW, boxH, 'F');
              doc.setFontSize(12); doc.setTextColor(153, 27, 27);
              doc.text("FAIBLESSES", 20 + boxW + gap, swotY + 10);
              doc.setFontSize(9);
              deepData.swot.weaknesses.forEach((s:string, i:number) => doc.text(`- ${s}`, 20 + boxW + gap, swotY + 20 + (i*6)));

              // Opportunities
              doc.setFillColor(219, 234, 254); // Blue 100
              doc.rect(15, swotY + boxH + gap, boxW, boxH, 'F');
              doc.setFontSize(12); doc.setTextColor(30, 64, 175);
              doc.text("OPPORTUNITÉS", 20, swotY + boxH + gap + 10);
              doc.setFontSize(9);
              deepData.swot.opportunities.forEach((s:string, i:number) => doc.text(`> ${s}`, 20, swotY + boxH + gap + 20 + (i*6)));

              // Threats
              doc.setFillColor(254, 243, 199); // Amber 100
              doc.rect(15 + boxW + gap, swotY + boxH + gap, boxW, boxH, 'F');
              doc.setFontSize(12); doc.setTextColor(146, 64, 14);
              doc.text("MENACES", 20 + boxW + gap, swotY + boxH + gap + 10);
              doc.setFontSize(9);
              deepData.swot.threats.forEach((s:string, i:number) => doc.text(`! ${s}`, 20 + boxW + gap, swotY + boxH + gap + 20 + (i*6)));

              // PAGE 3: DÉTAIL CONCURRENT
              doc.addPage();
              doc.setFontSize(16);
              doc.setTextColor(30);
              doc.text("Focus Concurrents", 15, 20);

              let currentY = 30;
              deepData.competitors_detailed.forEach((comp: any) => {
                  if (currentY > 250) { doc.addPage(); currentY = 20; }
                  
                  doc.setFillColor(248, 250, 252);
                  doc.rect(15, currentY, 180, 40, 'F');
                  
                  doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
                  doc.text(comp.name, 20, currentY + 10);
                  
                  doc.setFontSize(10); doc.setFont("helvetica", "normal");
                  doc.text(`Note: ${comp.rating}/5  |  Avis: ${comp.review_count}`, 20, currentY + 18);
                  
                  doc.setTextColor(22, 163, 74); // Green
                  doc.text(`Points forts: ${comp.strengths.join(', ')}`, 20, currentY + 26);
                  
                  doc.setTextColor(220, 38, 38); // Red
                  doc.text(`Points faibles: ${comp.weaknesses.join(', ')}`, 20, currentY + 34);
                  
                  currentY += 50;
              });

          } else {
              // --- RAPPORT PERFORMANCE STANDARD ---
              const analytics = await api.analytics.getOverview();
              const reviews = await api.reviews.list({ status: 'all' });

              doc.setFontSize(22);
              doc.setTextColor(0);
              doc.text("Rapport de Performance", 15, 50);
              
              const statsData = [
                  ["Volume d'avis", analytics.total_reviews.toString()],
                  ["Note Moyenne", `${analytics.average_rating}/5`],
                  ["Taux de Réponse", `${analytics.response_rate}%`],
                  ["Score NPS", analytics.nps_score.toString()]
              ];
              
              autoTable(doc, {
                  startY: 60,
                  head: [['Indicateur Clé', 'Valeur']],
                  body: statsData,
                  theme: 'striped',
                  headStyles: { fillColor: primaryColor as any },
                  styles: { fontSize: 12, cellPadding: 5 }
              });

              doc.text("Derniers Avis", 15, (doc as any).lastAutoTable.finalY + 20);
              
              const reviewsData = reviews.slice(0, 15).map(r => [
                  new Date(r.received_at).toLocaleDateString(),
                  r.source,
                  r.rating + "/5",
                  r.author_name,
                  r.body.substring(0, 60) + "..."
              ]);

              autoTable(doc, {
                  startY: (doc as any).lastAutoTable.finalY + 25,
                  head: [['Date', 'Source', 'Note', 'Client', 'Extrait']],
                  body: reviewsData,
                  styles: { fontSize: 9 },
                  headStyles: { fillColor: primaryColor as any }
              });
          }

          // Footer Numérotation
          const pageCount = (doc as any).internal.getNumberOfPages();
          for(let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              doc.setFontSize(8);
              doc.setTextColor(150);
              doc.text(`Page ${i} / ${pageCount}`, 190, 290);
          }

          doc.save(`Reviewflow_${reportName.replace(/\s/g, '_')}.pdf`);
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
          <p className="text-slate-500">Exports PDF et digests email programmés.</p>
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
                      <div className="text-xs text-slate-500">
                          {report.name.includes('Audit') ? 'Veille concurrentielle & SWOT' : 'Analyse de performance interne'}
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
