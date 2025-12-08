import React, { useState } from 'react';
import { Card, CardContent, Button, Input, useToast, Badge } from '../components/ui';
import { ArrowLeft, Save, Palette, Layout, Type, Tag, X } from 'lucide-react';
import { useNavigate } from '../components/ui';
import { api } from '../lib/api';

export const SocialModelCreatePage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [name, setName] = useState('');
    const [bgStyle, setBgStyle] = useState('bg-white');
    const [textColor, setTextColor] = useState('text-slate-900');
    const [fontStyle, setFontStyle] = useState('font-sans');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSave = async () => {
        if (!name) return toast.error("Veuillez donner un nom à votre modèle.");
        setSaving(true);
        try {
            await api.social.saveTemplate({
                name,
                style: {
                    bg: bgStyle,
                    text: textColor,
                    font: fontStyle
                },
                tags
            });
            toast.success("Modèle créé avec succès !");
            setTimeout(() => navigate('/social'), 500);
        } catch (e) {
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 p-4">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/social')} className="text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Créer un modèle</h1>
                    <p className="text-slate-500">Personnalisez l'apparence de vos futurs posts sociaux.</p>
                </div>
                <div className="ml-auto">
                    <Button onClick={handleSave} icon={Save} isLoading={saving} className="shadow-lg shadow-indigo-200">
                        Enregistrer le modèle
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Preview Column */}
                <div className="order-2 lg:order-1 flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 p-8 min-h-[500px]">
                    <div 
                        className={`w-full max-w-sm aspect-square shadow-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 ${bgStyle} ${textColor}`}
                    >
                        <div className="flex gap-1 mb-6 opacity-80">
                            {[1,2,3,4,5].map(i => (
                                <svg key={i} className="h-6 w-6 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            ))}
                        </div>
                        <p className={`text-xl leading-relaxed italic ${fontStyle}`}>
                            "Ceci est un aperçu de votre modèle. Le texte de l'avis client s'affichera ici avec le style que vous avez défini."
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg opacity-80 border-2 border-current`}>
                                S
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">Sophie Martin</div>
                                <div className="text-[10px] opacity-70 uppercase tracking-wide">Client Vérifié</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls Column */}
                <div className="order-1 lg:order-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nom du modèle</label>
                                <Input 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Ex: Élégance Noire" 
                                    className="text-lg font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-indigo-600"/> Tags (Organisation)
                                </label>
                                <div className="flex gap-2">
                                    <Input 
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Ex: Promotion, Été..."
                                        className="text-sm"
                                    />
                                    <Button variant="secondary" onClick={handleAddTag}>Ajouter</Button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="neutral" className="pr-1">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-500">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Layout className="h-4 w-4 text-indigo-600"/> Arrière-plan
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'bg-white border-2 border-slate-100', label: 'Blanc' },
                                        { id: 'bg-slate-900', label: 'Noir' },
                                        { id: 'bg-indigo-600', label: 'Indigo' },
                                        { id: 'bg-[#fdfbf7]', label: 'Papier' },
                                        { id: 'bg-gradient-to-br from-indigo-500 to-purple-600', label: 'Gradient 1' },
                                        { id: 'bg-gradient-to-tr from-pink-500 to-orange-400', label: 'Gradient 2' },
                                        { id: 'bg-gradient-to-b from-slate-800 to-slate-900', label: 'Dark' },
                                        { id: 'bg-emerald-600', label: 'Vert' }
                                    ].map(bg => (
                                        <button 
                                            key={bg.id} 
                                            className={`h-12 rounded-lg shadow-sm transition-all ${bg.id} ${bgStyle === bg.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'hover:scale-105'}`}
                                            onClick={() => setBgStyle(bg.id)}
                                            title={bg.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Palette className="h-4 w-4 text-indigo-600"/> Couleur du texte
                                </label>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'text-slate-900', bg: 'bg-slate-900' },
                                        { id: 'text-white', bg: 'bg-white border border-slate-200' },
                                        { id: 'text-indigo-600', bg: 'bg-indigo-600' },
                                        { id: 'text-amber-400', bg: 'bg-amber-400' }
                                    ].map(color => (
                                        <button 
                                            key={color.id}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${color.bg} ${textColor === color.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                                            onClick={() => setTextColor(color.id)}
                                        >
                                            <span className={`text-xs font-bold ${color.id === 'text-white' ? 'text-slate-900' : 'text-white'}`}>Aa</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Type className="h-4 w-4 text-indigo-600"/> Typographie
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFontStyle('font-sans')}
                                        className={`p-3 border rounded-lg text-sm font-sans ${fontStyle === 'font-sans' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Moderne (Sans)
                                    </button>
                                    <button 
                                        onClick={() => setFontStyle('font-serif')}
                                        className={`p-3 border rounded-lg text-sm font-serif ${fontStyle === 'font-serif' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Classique (Serif)
                                    </button>
                                    <button 
                                        onClick={() => setFontStyle('font-mono')}
                                        className={`p-3 border rounded-lg text-sm font-mono ${fontStyle === 'font-mono' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Technique (Mono)
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};