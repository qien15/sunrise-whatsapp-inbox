/**
 * Types & Interfaces for Sunrise Recruit WhatsApp Unified Inbox
 * 
 * Supports 1+2 Multi-number Hybrid Mode:
 * - 1 Official Cloud API Line (with n8n Bot auto-reply & Human Takeover)
 * - 2 BD / Recruit Coexistence Lines (via Dualhook with Phone App sync & anti-charge warning)
 */

export type LineType = 'official' | 'bd' | 'recruit';

export type LineFilterType = 'all' | LineType;

/**
 * Message source classification:
 * - candidate: Inbound from user/candidate
 * - bot: Automated reply from n8n workflow
 * - web_human: Staff manual reply from this Web Inbox
 * - phone_app: Coexistence outbound sent directly from physical WhatsApp app
 * - imported: Historical messages synced during initial migration
 */
export type MessageSource = 'candidate' | 'bot' | 'web_human' | 'phone_app' | 'imported';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type PricingCategory = 'service' | 'utility' | 'marketing' | 'authentication' | 'free';

export interface MessagePricing {
  billable: boolean;
  category: PricingCategory;
  estimatedCostUSD?: number;
  reason?: string;
}

export interface MessageMedia {
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  filename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  line: LineType;
  source: MessageSource;
  senderName?: string;
  senderWaId?: string;
  content: string;
  media?: MessageMedia;
  status: MessageStatus;
  timestamp: number; // Unix epoch ms
  pricing?: MessagePricing;
  templateName?: string;
  errorMessage?: string;
}

export type ConsentStatus = 'opt_in' | 'opt_out' | 'pending';

export interface Contact {
  id: string; // Internal identifier / contactKey
  name: string;
  waId: string; // International phone format: e.g., 85291234567
  bsuid?: string; // Meta Business Scoped User ID
  avatarUrl?: string;
  tags: string[];
  consentStatus: ConsentStatus;
  consentUpdatedAt?: number;
  notes?: string;
  assignedTo?: string; // Staff member username
}

export interface Conversation {
  id: string; // Format: `${line}_${contactKey}`
  line: LineType;
  contactKey: string;
  contact: Contact;
  lastMessage?: {
    id: string;
    content: string;
    source: MessageSource;
    timestamp: number;
    status: MessageStatus;
  };
  unreadCount: number;
  lastInboundAt?: number; // Crucial for CSW (24-hour Customer Service Window)
  lastOutboundAt?: number;
  humanTakeover: boolean; // For Official Line: true pauses n8n Bot, false delegates to Bot
  humanTakeoverAt?: number;
  humanTakeoverBy?: string;
  isPinned?: boolean;
  updatedAt: number;
}

export interface QuotaStats {
  usedServiceMessages: number;
  monthlyLimit: number; // default 1000
  periodStart: string; // ISO date
  periodEnd: string;
  warningThreshold: number; // default 900
}

export interface ApprovedTemplate {
  name: string;
  displayName: string;
  language: string;
  category: 'UTILITY' | 'MARKETING';
  body: string;
  parameters: string[]; // e.g. ["{{candidate_name}}", "{{interview_time}}"]
}

export interface SystemConfig {
  sendKillSwitch: boolean; // Global emergency brake
  dryRunMode: boolean; // Dry-run simulation mode
  healthStatus: 'healthy' | 'degraded' | 'down';
  dualhookStatus: {
    bdPhoneOnline: boolean;
    recruitPhoneOnline: boolean;
  };
}

export interface CSWCountdown {
  isActive: boolean;
  remainingMs: number;
  formattedRemaining: string; // e.g. "18h 42m 10s"
  expiresAt?: number;
}
