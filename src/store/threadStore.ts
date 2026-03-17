import { create } from 'zustand';
import { Thread } from '../types';

interface ThreadState {
  threads: Thread[];
  setThreads: (threads: Thread[]) => void;
  upsertThread: (thread: Thread) => void;
  moveToTop: (threadId: string) => void;
  updateTakeover: (threadId: string, byUserId: string | undefined) => void;
}

export const useThreadStore = create<ThreadState>((set) => ({
  threads: [],

  setThreads: (threads) => set({ threads }),

  upsertThread: (thread) =>
    set((state) => {
      const index = state.threads.findIndex((t) => t.id === thread.id);
      if (index === -1) {
        return { threads: [thread, ...state.threads] };
      }
      const updated = [...state.threads];
      updated[index] = thread;
      return { threads: updated };
    }),

  moveToTop: (threadId) =>
    set((state) => {
      const index = state.threads.findIndex((t) => t.id === threadId);
      if (index <= 0) return state;
      const updated = [...state.threads];
      const [item] = updated.splice(index, 1);
      return { threads: [item, ...updated] };
    }),

  updateTakeover: (threadId, byUserId) =>
    set((state) => {
      const index = state.threads.findIndex((t) => t.id === threadId);
      if (index === -1) return state;
      const updated = [...state.threads];
      updated[index] = { ...updated[index], human_takeover_by: byUserId };
      return { threads: updated };
    }),
}));
