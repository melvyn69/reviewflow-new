
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'editor' | 'viewer';
  organizations: string[];
  organization_id?: string;
}

export interface BrandSettings {
  description: string;
  tone: string; // ex: "professionnel et chaleureux"
  use_emojis: boolean;
  language_style: 'formal' | 'casual'; // vouvoiement vs tutoiement
  signature: string;
  knowledge_base?: string; // Faits et informations clés sur l'entreprise
}

export interface NotificationSettings {
  email_alerts: boolean;
  alert_threshold: number; // 1-5 (Notify if rating <= threshold)
  weekly_digest: boolean;
  digest_day: string; // 'monday', 'friday'
  marketing_emails: boolean;
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: 'positive' | 'negative' | 'neutral' | 'question';
}

export type IndustryType = 'restaurant' | 'hotel' | 'retail' | 'beauty' | 'health' | 'services' | 'automotive' | 'legal' | 'other';

export interface Organization {
  id: string;
  name: string;
  industry?: IndustryType;
  created_at: string;
  locations: Location[];
  subscription_plan: 'free' | 'starter' | 'pro';
  ai_usage_count: number;
  integrations: {
    google: boolean;
    facebook: boolean;
    instagram_posting: boolean; // New: For Marketing
    facebook_posting: boolean; // New: For Marketing
  };
  brand?: BrandSettings;
  notification_settings?: NotificationSettings;
  saved_replies?: SavedReply[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  external_reference?: string;
  group_id?: string;
  connection_status?: 'connected' | 'disconnected' | 'pending';
  platform_rating?: number;
  google_review_url?: string;
}

export type ReviewStatus = 'pending' | 'draft' | 'sent' | 'manual';
export type ReviewSource = 'google' | 'facebook' | 'tripadvisor' | 'yelp' | 'direct';
export type Sentiment = 'positive' | 'neutral' | 'negative';

// --- STABLE DATA CONTRACTS (AI ENGINE OUTPUTS) ---

export interface ReviewAnalysis {
  sentiment: Sentiment;
  themes: string[];
  keywords: string[];
  emotion?: string;
  summary?: string;
  flags: {
    hygiene: boolean; 
    discrimination: boolean;
    security: boolean;
    staff_conflict: boolean;
    pricing_issue: boolean;
    [key: string]: boolean;
  };
}

export interface AIReplyData {
  text: string;
  tone?: string;
  needs_manual_validation: boolean;
  reasons_for_validation?: string[];
  suggested_delay_hours?: number;
  created_at?: string;
}

export interface InternalNote {
  id: string;
  text: string;
  author_name: string;
  created_at: string;
}

export interface Review {
  id: string;
  source: ReviewSource;
  location_id: string;
  rating: number; // 1-5
  language: string;
  title?: string;
  body: string;
  author_name: string;
  received_at: string;
  status: ReviewStatus;
  
  // Nested structured data from AI
  analysis?: ReviewAnalysis;
  ai_reply?: AIReplyData;
  internal_notes?: InternalNote[];
  
  // Final decision/action
  assigned_to?: string;
  posted_reply?: string;
  replied_at?: string;
}

export interface ThemeWeight {
  name: string;
  weight: number; // 0-1
}

export interface AnalyticsSummary {
  period: string; // e.g. "last_30_days"
  total_reviews: number;
  average_rating: number;
  response_rate: number;
  nps_score: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  volume_by_date: { date: string; count: number }[];
  
  // Stable fields for AI Analytics
  top_themes_positive: ThemeWeight[];
  top_themes_negative: ThemeWeight[];
  top_keywords: { keyword: string; count: number }[];
  problems_summary?: string;
  strengths_summary?: string;
  global_rating?: number; // Redundant but often returned by AI
}

export interface Competitor {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  address: string;
  strengths: string[];
  weaknesses: string[];
}

export type TriggerType = 'review_created' | 'review_updated';

export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerType;
  conditions: Condition[];
  actions: Action[];
}

export interface Condition {
  field: string;
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'in';
  value: any;
}

export interface Action {
  type: 'assign' | 'notify' | 'generate_ai_reply' | 'auto_reply' | 'schedule_reply' | 'publish_social';
  config: Record<string, any>;
}

export interface ReportConfig {
  id: string;
  name: string;
  format: 'pdf' | 'excel';
  frequency: 'weekly' | 'monthly' | 'daily';
  time: string;
  enabled: boolean;
  last_sent?: string;
}

export interface SetupStatus {
  googleConnected: boolean;
  brandVoiceConfigured: boolean;
  firstReviewReplied: boolean;
  completionPercentage: number;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  last_interaction: string;
  total_reviews: number;
  average_rating: number;
  status: 'promoter' | 'passive' | 'detractor';
}
