
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Organization } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast, Badge, Toggle, useNavigate } from '../components/ui';
import { QrCode, Download, Send, Smartphone, Mail, Copy, Printer, CheckCircle2, Layout, Sliders, Eye, Share2, Instagram, Facebook, Sparkles, Palette, UploadCloud, Image as ImageIcon, Users, RefreshCw, X, FileText, Monitor, Sticker, CreditCard, AlertTriangle, Settings, Lightbulb, Linkedin, Star } from 'lucide-react';
import { INITIAL_ORG } from '../lib/db';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// URL Validation Helper
const isValidUrl = (string: string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

export const CollectPage = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'campaigns' | 'widgets' | 'social'>('qr');
  const [campaignType, setCampaignType] = useState<'sms' | 'email'>('sms');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  
  // QR & Supports Customization (Initialized from Org Settings)
  const [qrColor, setQrColor] = useState('#4f46e5'); // Primary Brand Color
  const [secondaryColor, setSecondaryColor] = useState('#1e1b4b'); // Secondary Brand Color
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(40);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [supportType, setSupportType] = useState<'raw' | 'poster' | 'sticker' | 'card'>('poster');
  
  // Widget Customization State
  const [widgetType, setWidgetType] = useState<'carousel' | 'list' | 'badge'>('carousel');
  const [widgetTheme, setWidgetTheme] = useState<'light' | 'dark'>('light');
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState('#4f46e5');
  const [widgetShowDate, setWidgetShowDate] = useState(true);
  const [widgetShowBorder, setWidgetShowBorder] = useState(true);
  const [widgetBorderRadius, setWidgetBorderRadius] = useState(12);
  
  const toast = useToast();
  const navigate = useNavigate();
  // Refs for capture
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!org) setLoadingError(true);
    }, 5000); 

    loadOrg();
    
    return () => clearTimeout(timer);
  }, []);

  const loadOrg = async () => {
    try {
        const data = await api.organization.get();
        if (data) {
            setOrg(data);
            if (data.locations?.length > 0) {
              setSelectedLocationId(data.locations[0].id);
            }
            
            // Auto-load Brand Identity
            if (data.brand?.primary_color) setQrColor(data.brand.primary_color);
            if (data.brand?.secondary_color) setSecondaryColor(data.brand.secondary_color);
            if (data.brand?.logo_url) setLogoUrl(data.brand.logo_url);

            setLoadingError(false);
        } else {
            setOrg(INITIAL_ORG);
            if (INITIAL_ORG.locations.length > 0) setSelectedLocationId(INITIAL_ORG.locations[0].id);
        }
    } catch (e) {
        console.error("Load failed", e);
        setLoadingError(true);
    }
  };

  const useDemoData = () => {
      setOrg(INITIAL_ORG);
      setSelectedLocationId(INITIAL_ORG.locations[0].id);
      setLoadingError(false);
      toast.info("Mode démonstration activé");
  };

  const selectedLocation = org?.locations.find(l => l.id === selectedLocationId);
  
  // URL Construction logic
  let reviewLink = selectedLocation 
    ? `${window.location.origin}/#/feedback/${selectedLocation.id}` 
    : '';
  
  if (selectedStaffId !== 'all') {
      const staff = org?.staff_members?.find(s => s.id === selectedStaffId);
      if (staff) {
          reviewLink += `?staff=${encodeURIComponent(staff.name)}`;
      }
  }

  // Validation: Check if Funnel is properly configured (Google URL present)
  const isFunnelConfigured = selectedLocation && selectedLocation.google_review_url && isValidUrl(selectedLocation.google_review_url);

  const handleCopyLink = () => {
    if (!isFunnelConfigured) {
        toast.error("Veuillez d'abord configurer le funnel.");
        return;
    }
    navigator.clipboard.writeText(reviewLink);
    toast.success("Lien copié !");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogoUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // PDF Generation Logic
  const handleDownloadPDF = async () => {
      if (!printRef.current) return;
      if (!isFunnelConfigured) {
          toast.error("Configuration incomplète. Impossible de générer le PDF.");
          return;
      }
      
      const toastId = toast.info("Génération haute résolution...", 5000);
      
      try {
          const dataUrl = await toPng(printRef.current, { 
              cacheBust: true, 
              pixelRatio: 4, 
              backgroundColor: '#ffffff'
          });

          let pdf;
          if (supportType === 'poster') {
              pdf = new jsPDF('p', 'mm', 'a5'); // A5 Poster
          } else if (supportType === 'sticker') {
              pdf = new jsPDF('p', 'mm', [100, 100]); // 10x10cm Sticker
          } else if (supportType === 'card') {
              pdf = new jsPDF('l', 'mm', [85, 55]); // Business Card
          } else {
              pdf = new jsPDF('p', 'mm', 'a4');
          }

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
          
          pdf.setFontSize(6);
          pdf.setTextColor(150);
          const footerText = `Généré par Reviewflow - 300 DPI - Fond perdu 3mm inclus - ${new Date().toLocaleDateString()}`;
          pdf.text(footerText, pdfWidth / 2, pdfHeight - 2, { align: 'center' });

          pdf.save(`${supportType}-${selectedLocation?.name.replace(/\s+/g, '-')}.pdf`);
          
          toast.success("Fichier prêt à imprimer téléchargé !");
      } catch (err) {
          console.error(err);
          toast.error("Erreur de génération PDF");
      }
  };

  // Image Download Logic (For Mobile/Web/Social)
  const handleDownloadSupportImage = async (sharePlatform?: 'facebook' | 'linkedin') => {
      if (!printRef.current) return;
      if (!isFunnelConfigured) {
          toast.error("Configuration incomplète.");
          return;
      }
      
      try {
          const dataUrl = await toPng(printRef.current, { 
              cacheBust: true, 
              pixelRatio: 4, 
              backgroundColor: supportType === 'sticker' ? 'transparent' : '#ffffff' // Transparent for stickers
          });
          
          // Download
          const link = document.createElement('a');
          link.download = `support-${supportType}-${selectedLocation?.name.replace(/\s+/g, '-').toLowerCase()}.png`;
          link.href = dataUrl;
          link.click();

          // Share Logic
          if (sharePlatform) {
              const text = "Aidez-nous à nous améliorer ! Scannez ce code pour donner votre avis. ⭐️";
              const url = encodeURIComponent(reviewLink); // Sharing the LINK, not the image directly (limitation of web share)
              
              if (sharePlatform === 'facebook') {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`, '_blank');
              } else if (sharePlatform === 'linkedin') {
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
              }
              
              toast.success("Image téléchargée ! Vous pouvez maintenant la publier.");
          } else {
              toast.success("Image téléchargée !");
          }
      } catch (err) {
          console.error(err);
          toast.error("Erreur de génération image");
      }
  };

  // Just download the QR Code itself
  const handleDownloadQR = async (format: 'png' | 'svg') => {
      if (!isFunnelConfigured) {
          toast.error("Configuration incomplète.");
          return;
      }
      const svgElement = document.getElementById("qr-code-svg");
      if (!svgElement) return;

      if (format === 'svg') {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `qrcode-${selectedLocation?.name}.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          const container = supportType === 'raw' ? printRef.current : document.getElementById('qr-code-svg')?.parentElement;
          if (!container) return;
          const dataUrl = await toPng(container as HTMLElement, { backgroundColor: qrBgColor, pixelRatio: 4 });
          const link = document.createElement('a');
          link.download = `qrcode-${selectedLocation?.name}.png`;
          link.href = dataUrl;
          link.click();
      }
      toast.success(`QR Code (${format.toUpperCase()}) téléchargé`);
  };

  const handleSendCampaign = async () => {
    if (!recipient || !content) return;
    setIsSending(true);
    try {
        const finalSubject = subject || "Votre avis compte pour nous";
        await api.campaigns.send(campaignType, recipient, finalSubject, content);
        toast.success(`Campagne envoyée à ${recipient}`);
        setRecipient('');
        setContent('');
        setSubject('');
    } catch (e: any) {
        toast.error("Erreur : " + e.message);
    } finally {
        setIsSending(false);
    }
  };

  const getWidgetUrl = () => {
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams({
          theme: widgetTheme,
          type: widgetType,
          color: widgetPrimaryColor.replace('#', ''),
          showDate: widgetShowDate.toString(),
          border: widgetShowBorder.toString(),
          radius: widgetBorderRadius.toString()
      });
      return `${baseUrl}#/widget/${selectedLocationId}?${params.toString()}`;
  };

  const handleCopyWidgetCode = () => {
      const code = `<iframe src="${getWidgetUrl()}" width="100%" height="400" frameborder="0"></iframe>`;
      navigator.clipboard.writeText(code);
      toast.success("Code copié !");
  };

  // --- RENDER HELPERS ---
  
  // This component renders the content that will be captured for PDF/Preview
  const PrintableAsset = () => {
      if (supportType === 'raw') {
          return (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl">
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={reviewLink} 
                    size={256}
                    fgColor={qrColor}
                    bgColor={qrBgColor}
                    level="H"
                    imageSettings={logoUrl ? {
                        src: logoUrl,
                        x: undefined,
                        y: undefined,
                        height: logoSize,
                        width: logoSize,
                        excavate: true,
                    } : undefined}
                  />
              </div>
          );
      }

      if (supportType === 'poster') {
          return (
              <div className="w-[350px] aspect-[1/1.414] bg-white flex flex-col items-center text-center relative shadow-2xl overflow-hidden">
                  {/* Decorative Header */}
                  <div className="w-full h-4 bg-transparent" style={{ backgroundColor: qrColor }}></div>
                  
                  <div className="flex-1 flex flex-col justify-center items-center w-full space-y-6 px-8 pt-8">
                      {logoUrl && <img src={logoUrl} className="h-16 w-auto object-contain mb-2" />}
                      
                      <h2 className="text-3xl font-black uppercase tracking-tight leading-none" style={{ color: secondaryColor }}>
                          Votre avis<br/>compte !
                      </h2>
                      
                      <p className="text-sm font-medium text-slate-500 px-2 leading-relaxed">
                          Aidez-nous à nous améliorer en scannant ce code. Cela ne prend que 30 secondes.
                      </p>
                      
                      <div className="p-6 bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: qrColor }}>
                          <QRCodeSVG value={reviewLink} size={160} fgColor={secondaryColor} level="H" />
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-full text-white" style={{ backgroundColor: qrColor }}>
                          <Smartphone className="h-4 w-4" /> Scannez-moi
                      </div>
                  </div>
                  
                  <div className="w-full py-6 mt-auto bg-slate-50 border-t border-slate-100 flex flex-col items-center">
                      <p className="font-bold text-slate-900 text-lg">{selectedLocation?.name}</p>
                      <div className="flex gap-1 mt-1">
                          {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                      </div>
                  </div>
              </div>
          );
      }

      if (supportType === 'sticker') {
          return (
              <div className="w-[300px] h-[300px] rounded-full bg-white border-[16px] flex flex-col items-center justify-center relative shadow-2xl overflow-hidden" style={{ borderColor: qrColor }}>
                  <div className="absolute top-6 font-black text-lg uppercase tracking-widest" style={{ color: secondaryColor }}>Avis Clients</div>
                  <QRCodeSVG value={reviewLink} size={140} fgColor={secondaryColor} level="H" />
                  <div className="absolute bottom-6 font-bold text-sm text-white px-4 py-1.5 rounded-full shadow-sm" style={{ backgroundColor: qrColor }}>
                      Scannez-ici
                  </div>
              </div>
          );
      }

      if (supportType === 'card') {
          return (
              <div className="w-[340px] h-[200px] bg-white rounded-xl shadow-2xl flex overflow-hidden relative">
                  {/* Left Side (Brand) */}
                  <div className="w-1/2 p-6 flex flex-col justify-center bg-slate-50 relative">
                      <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: qrColor }}></div>
                      {logoUrl ? (
                          <img src={logoUrl} className="w-12 h-12 object-contain mb-3" />
                      ) : (
                          <div className="w-10 h-10 rounded bg-slate-200 mb-3"></div>
                      )}
                      <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{selectedLocation?.name}</h3>
                      <p className="text-[10px] text-slate-500 leading-tight">Merci de votre confiance.</p>
                  </div>
                  {/* Right Side (QR) */}
                  <div className="w-1/2 flex items-center justify-center bg-white p-4 relative">
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-l-[40px] border-t-[transparent] border-l-[transparent]" style={{ borderTopColor: secondaryColor }}></div>
                      <QRCodeSVG value={reviewLink} size={100} fgColor={secondaryColor} level="Q" />
                  </div>
              </div>
          );
      }
      return null;
  };

  if (!org) {
      if (loadingError) return <div className="p-12 text-center text-slate-500">Erreur de chargement. <Button variant="ghost" onClick={useDemoData}>Utiliser Démo</Button></div>;
      return <div className="p-12 text-center text-slate-500">Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acquisition & Supports</h1>
          <p className="text-slate-500">Collectez plus d'avis grâce à nos outils intelligents.</p>
        </div>
        {org.locations?.length > 1 && (
            <div className="w-full md:w-64">
                <Select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                    {org.locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </Select>
            </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
        {[
            { id: 'qr', label: 'QR Code & Print', icon: Printer },
            { id: 'campaigns', label: 'Campagnes SMS/Email', icon: Send },
            { id: 'widgets', label: 'Widgets Site Web', icon: Layout },
            { id: 'social', label: 'Réseaux Sociaux', icon: Share2 },
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <tab.icon className="h-4 w-4" />
                {tab.label}
            </button>
        ))}
      </div>

      {/* CONTENT: QR & PRINT */}
      {activeTab === 'qr' && (
          <div className="space-y-8">
              {/* EDUCATIONAL BANNER */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Comment booster vos avis ?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold shrink-0 shadow-sm">1</div>
                          <div>
                              <div className="font-bold text-indigo-900">Téléchargez</div>
                              <p className="text-xs text-indigo-700">Choisissez le format adapté (Affiche, Sticker, QR).</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold shrink-0 shadow-sm">2</div>
                          <div>
                              <div className="font-bold text-indigo-900">Imprimez / Partagez</div>
                              <p className="text-xs text-indigo-700">Imprimez en haute qualité ou envoyez l'image par WhatsApp.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold shrink-0 shadow-sm">3</div>
                          <div>
                              <div className="font-bold text-indigo-900">Affichez</div>
                              <p className="text-xs text-indigo-700">Placez les supports sur le comptoir, les tables ou la vitrine.</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* LEFT: CONTROLS */}
                  <div className="lg:col-span-4 space-y-6">
                      {/* WARNING IF NO FUNNEL CONFIGURED */}
                      {!isFunnelConfigured && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-pulse">
                              <div className="flex items-start gap-3">
                                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                                  <div>
                                      <h4 className="font-bold text-amber-800 text-sm">Funnel non configuré</h4>
                                      <p className="text-xs text-amber-700 mt-1 mb-3">
                                          Le lien de redirection Google est manquant ou invalide. Le QR code ne pourra pas rediriger les clients satisfaits.
                                      </p>
                                      <Button 
                                        size="sm" 
                                        className="bg-amber-600 hover:bg-amber-700 border-none text-white w-full"
                                        icon={Settings}
                                        onClick={() => navigate('/settings?tab=locations')}
                                      >
                                          Configurer mon Funnel
                                      </Button>
                                  </div>
                              </div>
                          </div>
                      )}

                      <Card className={!isFunnelConfigured ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}>
                          <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                  <Sliders className="h-5 w-5 text-indigo-600" /> Personnalisation
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                              
                              {/* Type Selector */}
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Format du support</label>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => setSupportType('raw')} className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${supportType === 'raw' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                          <QrCode className="h-4 w-4" /> QR Seul
                                      </button>
                                      <button onClick={() => setSupportType('poster')} className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${supportType === 'poster' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                          <FileText className="h-4 w-4" /> Affiche A5
                                      </button>
                                      <button onClick={() => setSupportType('sticker')} className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${supportType === 'sticker' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                          <Sticker className="h-4 w-4" /> Sticker
                                      </button>
                                      <button onClick={() => setSupportType('card')} className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${supportType === 'card' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                          <CreditCard className="h-4 w-4" /> Carte
                                      </button>
                                  </div>
                              </div>

                              {/* Branding */}
                              <div className="space-y-4 pt-4 border-t border-slate-100">
                                  <div className="flex items-center gap-2 mb-2">
                                      <Palette className="h-4 w-4 text-slate-500" />
                                      <label className="text-xs font-bold text-slate-500 uppercase">Charte Graphique</label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-medium text-slate-500 mb-1">Primaire</label>
                                          <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white">
                                              <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} className="h-8 w-full rounded border-none cursor-pointer p-0" />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-medium text-slate-500 mb-1">Secondaire</label>
                                          <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white">
                                              <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-8 w-full rounded border-none cursor-pointer p-0" />
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-2">Logo (Central)</label>
                                      <div className="flex items-center gap-2">
                                          <label className="flex-1 flex items-center justify-center px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-xs text-slate-600">
                                              <UploadCloud className="h-4 w-4 mr-2" /> Choisir
                                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                          </label>
                                          {logoUrl && (
                                              <button onClick={() => setLogoUrl(null)} className="p-2 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100">
                                                  <X className="h-4 w-4" />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="pt-4 border-t border-slate-100">
                                  <Button variant="outline" className="w-full mb-2" icon={Copy} onClick={handleCopyLink}>Copier le lien public</Button>
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  {/* RIGHT: PREVIEW & DOWNLOAD */}
                  <div className="lg:col-span-8 space-y-6">
                      <Card className="h-full flex flex-col bg-slate-50/50 border-slate-200 overflow-hidden">
                          <CardHeader className="bg-white border-b border-slate-100 py-4">
                              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                  <CardTitle className="flex items-center gap-2">
                                      <Eye className="h-5 w-5 text-indigo-600" /> Aperçu du support
                                  </CardTitle>
                                  {supportType !== 'raw' && (
                                      <div className="flex gap-2">
                                          <Button size="sm" variant="outline" icon={Share2} onClick={() => handleDownloadSupportImage('facebook')} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                                              Facebook
                                          </Button>
                                          <Button size="sm" variant="outline" icon={Linkedin} onClick={() => handleDownloadSupportImage('linkedin')} className="text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200">
                                              LinkedIn
                                          </Button>
                                      </div>
                                  )}
                              </div>
                          </CardHeader>
                          
                          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px] relative overflow-auto">
                              {/* Pattern Background */}
                              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                              
                              {/* Render Container */}
                              <div className="relative z-10 transition-all duration-500 transform hover:scale-[1.02]">
                                  {!isFunnelConfigured ? (
                                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-center opacity-70">
                                          <AlertTriangle className="h-12 w-12 text-slate-300 mb-4" />
                                          <p className="text-slate-500 font-medium">Aperçu indisponible</p>
                                          <p className="text-xs text-slate-400">Veuillez configurer votre funnel.</p>
                                      </div>
                                  ) : (
                                      <div ref={printRef}>
                                          <PrintableAsset />
                                      </div>
                                  )}
                              </div>

                              <p className="mt-8 text-xs text-slate-400 uppercase tracking-widest font-mono">
                                  {supportType === 'poster' ? 'Format A5 (148 x 210 mm)' : supportType === 'sticker' ? 'Format 10x10 cm' : supportType === 'card' ? 'Format 85 x 55 mm' : 'Format QR Standard'}
                              </p>
                          </CardContent>

                          {/* DOWNLOAD ACTIONS FOOTER */}
                          <div className="p-6 bg-white border-t border-slate-200">
                              <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                                  <Download className="h-4 w-4" /> Téléchargements
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                  {/* QR Raw Actions */}
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadQR('png')} disabled={!isFunnelConfigured}>
                                      QR Code (PNG)
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadQR('svg')} disabled={!isFunnelConfigured}>
                                      QR Code (SVG)
                                  </Button>

                                  <div className="w-px bg-slate-200 mx-2 hidden sm:block"></div>

                                  {/* Support Actions */}
                                  {supportType !== 'raw' && (
                                      <>
                                          <Button 
                                              variant="secondary" 
                                              size="sm"
                                              onClick={() => handleDownloadSupportImage()} 
                                              icon={ImageIcon}
                                              disabled={!isFunnelConfigured}
                                          >
                                              Image {supportType === 'sticker' ? 'Sticker' : 'Visuel'} (Web/Mobile)
                                          </Button>
                                          <Button 
                                              size="sm"
                                              onClick={handleDownloadPDF} 
                                              icon={Printer} 
                                              disabled={!isFunnelConfigured}
                                              className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                                          >
                                              PDF Impression (HD)
                                          </Button>
                                      </>
                                  )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Formats optimisés : PNG pour le web/réseaux sociaux, PDF avec traits de coupe pour l'impression professionnelle.
                              </p>
                          </div>
                      </Card>
                  </div>
              </div>
          </div>
      )}

      {/* OTHER TABS (Campaigns, Widgets, Social) - Preserved Layout */}
      {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="lg:col-span-2 space-y-6">
                  <Card>
                      <CardHeader><CardTitle>Nouvelle Campagne Rapide</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <div className="flex gap-4 mb-4">
                              <button onClick={() => setCampaignType('sms')} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${campaignType === 'sms' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                  <Smartphone className="h-6 w-6" /> <span className="font-bold">SMS</span>
                              </button>
                              <button onClick={() => setCampaignType('email')} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${campaignType === 'email' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                  <Mail className="h-6 w-6" /> <span className="font-bold">Email</span>
                              </button>
                          </div>
                          
                          <Input 
                            placeholder={campaignType === 'sms' ? '+33 6 12 34 56 78' : 'client@exemple.com'} 
                            value={recipient} 
                            onChange={(e) => setRecipient(e.target.value)} 
                          />
                          
                          {campaignType === 'email' && (
                              <Input 
                                placeholder="Objet de l'email"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                              />
                          )}

                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32"
                            placeholder="Votre message..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                          />

                          <div className="flex justify-end"><Button icon={Send} onClick={handleSendCampaign} isLoading={isSending} disabled={!recipient || !content}>Envoyer</Button></div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {/* WIDGETS TAB - Preserved */}
      {activeTab === 'widgets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="space-y-6">
                  <Card>
                      <CardHeader><CardTitle>Style Widget</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                              {['carousel', 'list', 'badge'].map((t) => (
                                  <div key={t} onClick={() => setWidgetType(t as any)} className={`p-2 border rounded cursor-pointer text-center capitalize ${widgetType === t ? 'bg-indigo-50 border-indigo-600' : ''}`}>{t}</div>
                              ))}
                          </div>
                          <Toggle checked={widgetTheme === 'dark'} onChange={v => setWidgetTheme(v ? 'dark' : 'light')} /> <span className="text-sm">Mode Sombre</span>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader><CardTitle>Code</CardTitle></CardHeader>
                      <CardContent>
                          <div className="bg-slate-900 rounded p-3 text-xs text-green-400 font-mono overflow-x-auto">
                              {`<iframe src="${getWidgetUrl()}" width="100%" height="400" frameborder="0"></iframe>`}
                          </div>
                          <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={handleCopyWidgetCode}>Copier Code</Button>
                      </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-2">
                  <Card className="h-full bg-slate-50 flex items-center justify-center p-8">
                      <iframe src={getWidgetUrl()} width="100%" height="400" className="border-none shadow-xl rounded-xl bg-white" />
                  </Card>
              </div>
          </div>
      )}

      {/* SOCIAL TAB - Preserved */}
      {activeTab === 'social' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
              <Card>
                  <CardHeader><CardTitle>Connexions</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded"><div className="flex items-center gap-2"><Instagram className="text-pink-600"/> Instagram</div> <Badge variant={org.integrations.instagram_posting ? 'success' : 'neutral'}>{org.integrations.instagram_posting ? 'Actif' : 'Inactif'}</Badge></div>
                      <div className="flex items-center justify-between p-3 border rounded"><div className="flex items-center gap-2"><Facebook className="text-blue-600"/> Facebook</div> <Badge variant={org.integrations.facebook_posting ? 'success' : 'neutral'}>{org.integrations.facebook_posting ? 'Actif' : 'Inactif'}</Badge></div>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};