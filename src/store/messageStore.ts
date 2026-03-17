import { create } from 'zustand';
import { Message } from '../types';

interface MessageState {
  messages: Record<string, Message[]>;
  setMessages: (threadId: string, messages: Message[]) => void;
  addMessage: (threadId: string, message: Message) => void;
  updateMessageStatus: (messageId: string, threadId: string, status: string) => void;
  clearThread: (threadId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: {},

  setMessages: (threadId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [threadId]: messages },
    })),

  addMessage: (threadId, message) =>
    set((state) => {
      const existing = state.messages[threadId] ?? [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [threadId]: [...existing, message],
        },
      };
    }),

  updateMessageStatus: (messageId, threadId, status) =>
    set((state) => {
      const threadMessages = state.messages[threadId];
      if (!threadMessages) return state;
      const updated = threadMessages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      );
      return {
        messages: { ...state.messages, [threadId]: updated },
      };
    }),

  clearThread: (threadId) =>
    set((state) => {
      const { [threadId]: _, ...rest } = state.messages;
      return { messages: rest };
    }),
}));
