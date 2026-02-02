import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Analytics data types
export interface AnalyticsStats {
  totalEvents: number;
  eventsLast24h: number;
  uniquePublishers: number;
  totalRevenue: number;
  eventsByType: Record<string, number>;
}

export interface BidderStats {
  bidderCode: string;
  bidsRequested: number;
  bidsReceived: number;
  bidsWon: number;
  bidsTimeout: number;
  avgCpm: number;
  avgLatency: number;
}

// Fetch analytics stats from API
export async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/stats`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch analytics stats:', err);
  }
  return {
    totalEvents: 0,
    eventsLast24h: 0,
    uniquePublishers: 0,
    totalRevenue: 0,
    eventsByType: {},
  };
}

// Fetch bidder stats from API
export async function fetchBidderStats(): Promise<BidderStats[]> {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/bidders`);
    if (res.ok) {
      const data = await res.json();
      return data.bidders || [];
    }
  } catch (err) {
    console.error('Failed to fetch bidder stats:', err);
  }
  return [];
}

// Real-time SSE hook for analytics updates
export function useAnalyticsSSE(onStatsUpdate: (stats: AnalyticsStats) => void, onNewEvent?: (event: any) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Create EventSource connection
    const eventSource = new EventSource(`${API_BASE}/api/analytics/stream`);
    eventSourceRef.current = eventSource;

    // Define named event handlers to ensure proper cleanup
    const handleOpen = () => {
      setIsConnected(true);
    };

    const handleStats = (event: MessageEvent) => {
      try {
        const stats = JSON.parse(event.data);
        onStatsUpdate(stats);
        setLastUpdate(new Date());
      } catch (e) {
        console.error('Failed to parse stats event:', e);
      }
    };

    const handleNewEvent = (event: MessageEvent) => {
      try {
        const eventData = JSON.parse(event.data);
        if (onNewEvent) {
          onNewEvent(eventData);
        }
        setLastUpdate(new Date());
      } catch (e) {
        console.error('Failed to parse newEvent:', e);
      }
    };

    const handleHeartbeat = () => {
      // Keep-alive heartbeat received
    };

    const handleError = (error: Event) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      // EventSource will auto-reconnect
    };

    // Attach event listeners
    eventSource.onopen = handleOpen;
    eventSource.onerror = handleError;
    eventSource.addEventListener('stats', handleStats);
    eventSource.addEventListener('newEvent', handleNewEvent);
    eventSource.addEventListener('heartbeat', handleHeartbeat);

    // Cleanup: Remove all event listeners and close connection
    return () => {
      eventSource.removeEventListener('stats', handleStats);
      eventSource.removeEventListener('newEvent', handleNewEvent);
      eventSource.removeEventListener('heartbeat', handleHeartbeat);
      eventSource.onopen = null;
      eventSource.onerror = null;
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [onStatsUpdate, onNewEvent]);

  return { isConnected, lastUpdate };
}

// Hook for fetching analytics stats
export function useAnalyticsStats() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // SSE callback for stats updates
  const handleStatsUpdate = useCallback((newStats: AnalyticsStats) => {
    setStats(newStats);
    setLoading(false);
  }, []);

  // SSE callback for new events
  const handleNewEvent = useCallback((event: any) => {
    setRecentEvents(prev => [event, ...prev].slice(0, 10)); // Keep last 10 events
  }, []);

  const { isConnected, lastUpdate } = useAnalyticsSSE(handleStatsUpdate, handleNewEvent);

  // Initial fetch as fallback
  useEffect(() => {
    fetchAnalyticsStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  return { stats, loading, recentEvents, isConnected, lastUpdate };
}

// Hook for fetching bidder stats
export function useBidderStats() {
  const [bidders, setBidders] = useState<BidderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBidderStats().then((data) => {
      setBidders(data);
      setLoading(false);
    });
  }, []);

  return { bidders, loading };
}

// Helper to get token from auth store in localStorage
export function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
  } catch {
    // Fallback to direct token if auth-storage parsing fails
  }
  return localStorage.getItem('token');
}
