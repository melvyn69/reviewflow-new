
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'super_admin' | 'admin' | 'editor' | 'viewer';
  organizations: string[];
  organization_id?: string;
  status?: 'active' | 'invited';
}

export interface BrandSettings {
  description: string;
  tone: string;
  use_emojis: boolean;
  language_style: 'formal' | 'casual';
  signature: string;
  knowledge_base?: string;
}

export interface NotificationSettings {
  email_alerts: boolean;
  alert_threshold: number;
  weekly_digest: boolean;
  digest_day: string;
  marketing_emails: boolean;
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: 'positive' | 'negative' | 'neutral' | 'question';
}

export type IndustryType = 'restaurant' | 'hotel' | 'retail' | 'beauty' | 'health' | 'services' | 'automotive' | 'legal' | 'real_estate' | 'other';

export interface StaffMember {
    id: string;
    name: string;
    role: string; // "Serveur", "Caissier", etc.
    avatar?: string;
    email?: string;
    location_id?: string;
    reviews_count: number;
    average_rating: number;
}

export interface Organization {
  id: string;
  name: string;
  legal_name?: string;
  siret?: string;
  vat_number?: string;
  address?: string;
  industry?: IndustryType;
  created_at: string;
  locations: Location[];
  subscription_plan: 'free' | 'starter' | 'pro';
  ai_usage_count: number;
  integrations: {
    google: boolean;
    facebook: boolean;
    instagram_posting: boolean;
    facebook_posting: boolean;
    linkedin_posting: boolean;
    tiktok_posting: boolean;
  };
  brand?: BrandSettings;
  notification_settings?: NotificationSettings;
  saved_replies?: SavedReply[];
  workflows?: WorkflowRule[]; 
  stripe_customer_id?: string;
  staff_members?: StaffMember[]; 
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  website?: string;
  description?: string;
  external_reference?: string;
  group_id?: string;
  connection_status?: 'connected' | 'disconnected' | 'pending';
  platform_rating?: number;
  google_review_url?: string;
  facebook_review_url?: string;
  tripadvisor_review_url?: string;
}

export type ReviewStatus = 'pending' | 'draft' | 'sent' | 'manual';
export type ReviewSource = 'google' | 'facebook' | 'tripadvisor' | 'yelp' | 'direct' | 'trustpilot' | 'yellowpages';
export type Sentiment = 'positive' | 'neutral' | 'negative';

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
  model_used?: string;
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
  rating: number;
  language: string;
  title?: string;
  body: string;
  author_name: string;
  received_at: string;
  status: ReviewStatus;
  analysis?: ReviewAnalysis;
  ai_reply?: AIReplyData;
  internal_notes?: InternalNote[];
  assigned_to?: string;
  posted_reply?: string;
  replied_at?: string;
  staff_attributed_to?: string; // ID du staff
  staff_name_detected?: string; // Nom détecté par l'IA
}

export interface ThemeWeight {
  name: string;
  weight: number;
}

export interface AnalyticsSummary {
  period: string;
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
  top_themes_positive: ThemeWeight[];
  top_themes_negative: ThemeWeight[];
  top_keywords: { keyword: string; count: number }[];
  problems_summary?: string;
  strengths_summary?: string;
  global_rating?: number;
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

export type TriggerType = 'review_created'; 
export type Operator = 'equals' | 'gte' | 'lte' | 'contains' | 'not_contains';

export interface Condition {
  id: string;
  field: 'rating' | 'source' | 'content';
  operator: Operator;
  value: any;
}

export type ActionType = 'generate_ai_reply' | 'auto_reply' | 'email_alert' | 'add_tag';

export interface ActionConfig {
  tone?: string; 
  delay_minutes?: number; 
  email_to?: string; 
  tag_name?: string; 
}

export interface Action {
  id: string;
  type: ActionType;
  config: ActionConfig;
}

export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerType;
  conditions: Condition[];
  actions: Action[];
  last_triggered?: string;
  run_count?: number;
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

export interface CustomerInteraction {
    id: string;
    type: 'review' | 'email_sent' | 'coupon_used' | 'note';
    date: string;
    details: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
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
  ltv_estimate?: number; 
  history?: CustomerInteraction[];
}
