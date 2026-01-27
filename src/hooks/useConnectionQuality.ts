import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionQuality = 'offline' | 'slow' | 'fair' | 'fast' | 'excellent';

interface ConnectionInfo {
  quality: ConnectionQuality;
  effectiveType: string; // 4g, 3g, 2g, slow-2g
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
  isOnline: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Hook to monitor connection quality in real-time
 * Uses Network Information API where available, with fallback to ping-based detection
 */
export function useConnectionQuality() {
  const [info, setInfo] = useState<ConnectionInfo>({
    quality: navigator.onLine ? 'fair' : 'offline',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    isOnline: navigator.onLine,
  });
  
  const [estimatedSyncTime, setEstimatedSyncTime] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get network connection API
  const getConnection = useCallback((): NetworkInformation | null => {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }, []);

  // Calculate quality from metrics
  const calculateQuality = useCallback((rtt: number, downlink: number): ConnectionQuality => {
    if (!navigator.onLine) return 'offline';
    
    // Based on typical network metrics
    if (rtt < 50 && downlink > 10) return 'excellent';
    if (rtt < 100 && downlink > 5) return 'fast';
    if (rtt < 300 && downlink > 1) return 'fair';
    return 'slow';
  }, []);

  // Update from Network Information API
  const updateFromNetworkAPI = useCallback(() => {
    const connection = getConnection();
    if (!connection) return;

    const quality = calculateQuality(connection.rtt, connection.downlink);
    
    setInfo({
      quality,
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false,
      isOnline: navigator.onLine,
    });
  }, [getConnection, calculateQuality]);

  // Ping-based fallback for browsers without Network Information API
  const measureLatency = useCallback(async (): Promise<number> => {
    const start = performance.now();
    try {
      // Use a small endpoint for latency measurement
      await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-store',
      });
      return performance.now() - start;
    } catch {
      return Infinity;
    }
  }, []);

  // Fallback quality detection
  const updateFromPing = useCallback(async () => {
    if (!navigator.onLine) {
      setInfo((prev) => ({ ...prev, quality: 'offline', isOnline: false }));
      return;
    }

    const latency = await measureLatency();
    
    let quality: ConnectionQuality;
    if (latency === Infinity) {
      quality = 'slow';
    } else if (latency < 100) {
      quality = 'excellent';
    } else if (latency < 200) {
      quality = 'fast';
    } else if (latency < 500) {
      quality = 'fair';
    } else {
      quality = 'slow';
    }

    setInfo((prev) => ({
      ...prev,
      quality,
      rtt: latency === Infinity ? 9999 : Math.round(latency),
      isOnline: true,
    }));
  }, [measureLatency]);

  // Estimate sync time based on pending items
  const calculateSyncTime = useCallback((pendingItems: number, avgItemSizeKb: number = 2): number => {
    const totalSizeKb = pendingItems * avgItemSizeKb;
    const downloadSpeed = info.downlink * 1000 / 8; // Convert Mbps to KB/s
    
    if (downloadSpeed === 0) return 9999;
    
    // Account for RTT overhead per item
    const transferTime = totalSizeKb / downloadSpeed;
    const rttOverhead = (pendingItems * info.rtt) / 1000;
    
    return Math.ceil(transferTime + rttOverhead);
  }, [info.downlink, info.rtt]);

  // Update estimated sync time
  const updateSyncEstimate = useCallback((pendingItems: number) => {
    if (pendingItems === 0) {
      setEstimatedSyncTime(null);
    } else {
      setEstimatedSyncTime(calculateSyncTime(pendingItems));
    }
  }, [calculateSyncTime]);

  // Setup listeners
  useEffect(() => {
    const connection = getConnection();
    
    const handleOnline = () => {
      setInfo((prev) => ({ ...prev, isOnline: true }));
      updateFromNetworkAPI();
    };
    
    const handleOffline = () => {
      setInfo((prev) => ({ ...prev, quality: 'offline', isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (connection) {
      connection.addEventListener('change', updateFromNetworkAPI);
      updateFromNetworkAPI();
    } else {
      // Fallback: periodic ping-based detection
      updateFromPing();
      pingIntervalRef.current = setInterval(updateFromPing, 30000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateFromNetworkAPI);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [getConnection, updateFromNetworkAPI, updateFromPing]);

  // Format sync time for display
  const formatSyncTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return '';
    if (seconds >= 9999) return 'Very slow';
    if (seconds < 1) return 'Instant';
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.ceil(seconds / 60)}m`;
  }, []);

  return {
    ...info,
    estimatedSyncTime,
    formattedSyncTime: formatSyncTime(estimatedSyncTime),
    updateSyncEstimate,
    hasNetworkAPI: !!getConnection(),
  };
}
