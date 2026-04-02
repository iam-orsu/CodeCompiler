import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Database } from 'lucide-react';

interface SessionStatus {
  creates: number;
  inserts: number;
  remaining_time: number;
  extended_count: number;
  expired: boolean;
}

interface SessionTimerDisplayProps {
  language: string;
  sessionId: string;
  refreshTrigger: number;
  onTimerWarning: (count: number) => void;
  onStatusChange: (expired: boolean) => void;
}

export default function SessionTimerDisplay({
  language,
  sessionId,
  refreshTrigger,
  onTimerWarning,
  onStatusChange,
}: SessionTimerDisplayProps) {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [localSeconds, setLocalSeconds] = useState<number>(3600);
  const [warningShown, setWarningShown] = useState(false);

  const isDb = language === 'sqlite' || language === 'mongodb';

  const fetchStatus = useCallback(async () => {
    if (!sessionId || !isDb) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';
      const res = await fetch(`${apiUrl}/session/status`, {
        headers: { 'X-Session-ID': sessionId }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLocalSeconds(data.remaining_time);
        onStatusChange(data.expired);
        
        // Reset warning state if we got extended
        if (data.remaining_time > 600) {
          setWarningShown(false);
        }
      }
    } catch (e) {
      console.error('Failed to fetch session status', e);
    }
  }, [sessionId, isDb, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, refreshTrigger]);

  // Periodic re-sync with server every 60s to combat JS timer drift
  useEffect(() => {
    if (!isDb) return;
    const syncInterval = setInterval(() => {
      fetchStatus();
    }, 60000);
    return () => clearInterval(syncInterval);
  }, [isDb, fetchStatus]);

  useEffect(() => {
    if (!isDb) return;
    
    const interval = setInterval(() => {
      setLocalSeconds(prev => {
        const next = Math.max(0, prev - 1);
        if (next <= 600 && next > 598 && !warningShown) {
          setWarningShown(true);
          onTimerWarning(status?.extended_count || 0);
        }
        if (next === 0) {
          onStatusChange(true);
        }
        return next;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isDb, warningShown, onTimerWarning, status?.extended_count, onStatusChange]);

  if (!isDb) return null;

  const m = Math.floor(localSeconds / 60).toString().padStart(2, '0');
  const s = (localSeconds % 60).toString().padStart(2, '0');
  
  const isDanger = localSeconds <= 300; // 5 mins
  const creates = status?.creates || 0;
  const inserts = status?.inserts || 0;
  
  const isMongo = language === 'mongodb';
  const labelCreate = isMongo ? 'Col' : 'Tbl';

  return (
    <div className={`session-timer-display ${isDanger ? 'danger' : ''}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        <Database size={12} className="text-blue-400 shrink-0" />
        <span>{labelCreate}: {creates}/10</span>
        <span className="text-gray-600">|</span>
        <span>Ops: {inserts}/100</span>
      </div>
      <div className="text-gray-600 mx-1 shrink-0">|</div>
      <div className="timer-countdown flex items-center gap-1 shrink-0">
        <Clock size={12} />
        {m}:{s}
      </div>
    </div>
  );
}
