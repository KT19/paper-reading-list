import { create } from 'zustand';
import type { Paper } from '@/types/paper';

const API_BASE = '/api/papers';

interface PaperStore {
  papers: Paper[];
  loading: boolean;
  error: string | null;

  fetchPapers: () => Promise<void>;
  addPaper: (title: string, source: string) => Promise<void>;
  uploadPaper: (file: File, title?: string) => Promise<void>;
  openPaper: (id: number) => Promise<void>;
  completePaper: (id: number) => Promise<void>;
  restorePaper: (id: number) => Promise<void>;
  removePaper: (id: number) => Promise<void>;
  updateNote: (id: number, note: string) => Promise<void>;
}

export const usePaperStore = create<PaperStore>((set, get) => ({
  papers: [],
  loading: false,
  error: null,

  fetchPapers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch papers');
      const papers: Paper[] = await res.json();
      set({ papers, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addPaper: async (title: string, source: string) => {
    set({ error: null });
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, source }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Failed to add paper');
      }
      await get().fetchPapers();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  uploadPaper: async (file: File, title?: string) => {
    set({ error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title?.trim()) {
        formData.append('title', title.trim());
      }

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Failed to upload paper');
      }
      await get().fetchPapers();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  openPaper: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/open`, { method: 'POST' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Failed to open paper');
      }
      const data = await res.json();
      // If server returns a URL or a serve endpoint, open it in the browser
      if (data.url) {
        window.open(data.url, '_blank');
      } else if (data.serve) {
        window.open(data.serve, '_blank');
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  completePaper: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/complete`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to complete paper');
      await get().fetchPapers();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  restorePaper: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/restore`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to restore paper');
      await get().fetchPapers();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  removePaper: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove paper');
      await get().fetchPapers();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  updateNote: async (id: number, note: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      // Optimistic local update to avoid full refetch
      set((state) => ({
        papers: state.papers.map((p) =>
          p.id === id ? { ...p, note: note.trim() || null } : p
        ),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
