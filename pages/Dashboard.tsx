import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AnalyticsSummary, Review, SetupStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, useToast } from '../components/ui';
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Star, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  ChevronDown,
  Calendar, 
  Activity, 
  Zap, 
  CheckCircle2, 
  UploadCloud, // CORRECTION ICI
  Rocket, 
  ExternalLink,
  Eye,
  ShieldAlert
} from 'lucide-react';
// ... reste du fichier identique, mais j'utilise UploadCloud dans le composant
// ... (vers ligne 170)
              <Button size="lg" icon={UploadCloud} onClick={handleSeedData} isLoading={seeding} className="px-8 shadow-xl shadow-indigo-200 w-full md:w-auto">
                  Initialiser les Données Démo
              </Button>
// ...