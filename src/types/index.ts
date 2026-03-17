export interface User {
  id: string;
  phone_number: string;
  display_name: string;
}

export interface BotConfig {
  user_id: string;
  url: string;
  is_active: boolean;
}

export interface Thread {
  id: string;
  participant_a: string;
  participant_b: string;
  human_takeover_by?: string;
  last_message?: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  intent: string;
  payload: unknown;
  status: string;
  human_override: boolean;
  created_at: string;
}

export interface ContactInfo {
  user_id: string;
  phone_number: string;
  display_name: string;
}

export type FeedEventType =
  | 'new_message'
  | 'status_update'
  | 'takeover_started'
  | 'takeover_ended';

export interface FeedEvent {
  type: FeedEventType;
  data: unknown;
}

export interface StatusUpdateData {
  message_id: string;
  status: string;
}

export interface TakeoverData {
  thread_id: string;
  by_user_id?: string;
}

// Navigation param types
export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OTPVerify: { phone_number: string };
  ProfileSetup: undefined;
  BotChoice: undefined;
  BotCapabilities: { onboarding?: boolean };
};

export type MainTabsParamList = {
  Chats: undefined;
  MyBot: undefined;
  Settings: undefined;
};

export type ChatsStackParamList = {
  ChatsScreen: undefined;
  ChatView: { threadId: string; contactName: string; contactPhone: string };
  Contacts: undefined;
};

export type MessageStatus =
  | 'queued'
  | 'delivered'
  | 'client_delivered'
  | 'processed'
  | 'failed';

export interface BotInstructions {
  instructions: string;
}

export interface LLMPreferences {
  preferred_llm: string;
}
