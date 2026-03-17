import {
  User,
  BotConfig,
  Thread,
  Message,
  ContactInfo,
  BotInstructions,
} from '../types';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  'http://localhost:8080';

const BOT_SERVICE_URL =
  (process.env.EXPO_PUBLIC_BOT_SERVICE_URL as string | undefined) ??
  'http://localhost:8000';

// ---------- internal helpers ----------

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 202 Accepted — may or may not have a body
  if (response.status === 202) {
    const text = await response.text();
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as unknown as T;
    }
  }

  return response.json() as Promise<T>;
}

function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(API_BASE_URL, path, options);
}

function botApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(BOT_SERVICE_URL, path, options);
}

// ---------- Auth ----------

export interface OTPRequestResponse {
  message?: string;
}

export interface OTPVerifyResponse {
  token: string;
  user: User;
}

export async function requestOTP(phone_number: string): Promise<OTPRequestResponse> {
  return api<OTPRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone_number }),
  });
}

export async function verifyOTP(
  phone_number: string,
  code: string
): Promise<OTPVerifyResponse> {
  return api<OTPVerifyResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone_number, code }),
  });
}

// ---------- Users ----------

export async function getMe(): Promise<User> {
  return api<User>('/users/me');
}

export async function updateMe(display_name: string): Promise<User> {
  return api<User>('/users/me', {
    method: 'PUT',
    body: JSON.stringify({ display_name }),
  });
}

// ---------- Bot ----------

export async function getMyBot(): Promise<BotConfig> {
  return api<BotConfig>('/users/me/bot');
}

export async function updateMyBot(url: string): Promise<BotConfig> {
  return api<BotConfig>('/users/me/bot', {
    method: 'PUT',
    body: JSON.stringify({ url }),
  });
}

export async function provisionManagedBot(): Promise<void> {
  return api<void>('/internal/managed-bot/provision', {
    method: 'POST',
  });
}

// ---------- Contacts ----------

export async function syncContacts(
  phone_numbers: string[]
): Promise<{ found: ContactInfo[] }> {
  return api<{ found: ContactInfo[] }>('/contacts/sync', {
    method: 'POST',
    body: JSON.stringify({ phone_numbers }),
  });
}

export async function getContacts(): Promise<ContactInfo[]> {
  return api<ContactInfo[]>('/contacts');
}

// ---------- Threads ----------

export async function getThreads(): Promise<Thread[]> {
  return api<Thread[]>('/threads');
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  return api<Message[]>(`/threads/${threadId}/messages`);
}

export async function startTakeover(threadId: string): Promise<void> {
  return api<void>(`/threads/${threadId}/takeover`, { method: 'POST' });
}

export async function endTakeover(threadId: string): Promise<void> {
  return api<void>(`/threads/${threadId}/takeover`, { method: 'DELETE' });
}

// ---------- Messages ----------

export interface SendMessagePayload {
  to: string;
  intent: string;
  payload: unknown;
}

export async function sendMessage(data: SendMessagePayload): Promise<void> {
  return api<void>('/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---------- Managed Bot Config ----------

export async function getBotInstructions(
  userId: string
): Promise<BotInstructions> {
  return botApi<BotInstructions>(`/config/${userId}/instructions`);
}

export async function setBotInstructions(
  userId: string,
  instructions: string
): Promise<void> {
  return botApi<void>(`/config/${userId}/instructions`, {
    method: 'PUT',
    body: JSON.stringify({ instructions }),
  });
}

export async function setLLMPreference(
  userId: string,
  preferred_llm: string
): Promise<void> {
  return botApi<void>(`/config/${userId}/preferences/llm`, {
    method: 'PUT',
    body: JSON.stringify({ preferred_llm }),
  });
}

// ---------- WebSocket URL ----------

export function getWebSocketUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws/feed?token=${encodeURIComponent(token)}`;
}
