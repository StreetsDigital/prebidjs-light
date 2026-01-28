import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actions?: Array<{
    tool: string;
    status: 'success' | 'error';
    details?: string;
  }>;
}

export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
}

interface ChatState {
  // Current session
  currentSessionId: string | null;
  messages: ChatMessage[];
  sessions: ChatSession[];

  // UI state
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewSession: () => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentSessionId: null,
  messages: [],
  sessions: [],
  isLoading: false,
  isSending: false,
  error: null,

  // Send a message
  sendMessage: async (content: string) => {
    const { currentSessionId } = get();

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isSending: true,
      error: null,
    }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        actions: data.actions,
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        currentSessionId: data.session_id,
        isSending: false,
      }));

      // Update session ID in localStorage
      if (data.session_id) {
        localStorage.setItem('lastChatSession', data.session_id);
      }

      // Reload sessions to update list
      get().loadSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isSending: false,
      });

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '❌ Error: Failed to send message. Please try again.',
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
      }));
    }
  },

  // Load a specific session
  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();

      set({
        currentSessionId: sessionId,
        messages: data.session.messages || [],
        isLoading: false,
      });

      localStorage.setItem('lastChatSession', sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  // Load all sessions
  loadSessions: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();

      set({
        sessions: data.sessions || [],
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Don't set error state for session list failures
    }
  },

  // Create a new session
  createNewSession: () => {
    set({
      currentSessionId: null,
      messages: [],
      error: null,
    });
    localStorage.removeItem('lastChatSession');
  },

  // Set error message
  setError: (error: string | null) => {
    set({ error });
  },

  // Clear messages
  clearMessages: () => {
    set({ messages: [], currentSessionId: null });
  },
}));
