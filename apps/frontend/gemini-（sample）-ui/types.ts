export interface SoulCore {
  guideline: string;
  values: string[];
  keywords: string[];
  version: string;
}

export interface Persona {
  id: 'dr_orb' | 'miss_madi';
  name: string;
  role: string;
  color: string;
  avatarUrl: string;
  // V2Card structure
  description: string;
  tone: 'logical' | 'friendly';
  style: string; // e.g., '短文・明瞭・論理的'
  sample_phrases: string[];
  memory: string[];
  // Soul Core
  soul_core: SoulCore;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | Persona['id'];
  timestamp: string;
  meta?: {
    provider: string;
    model: string;
    card: string;
  };
}

export interface PayPalLink {
  id: string;
  label: string;
  subLabel: string;
  url: string;
}

export interface ToastInfo {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
  icon: string;
}

export interface SoulState {
    persona_id: Persona['id'];
    resonance_level: string; // Updated to string as per new spec
    last_guideline: string;
    timestamp: string;
}

export interface TxHistoryItem {
    id: string;
    type: 'redeem' | 'consume';
    amount: number;
    timestamp: string;
}
