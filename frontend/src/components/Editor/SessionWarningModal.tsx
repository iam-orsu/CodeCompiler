import React, { useState } from 'react';

interface SessionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: () => void;
  sessionId: string;
  extensionCount: number;
}

export default function SessionWarningModal({
  isOpen,
  onClose,
  onExtend,
  sessionId,
  extensionCount,
}: SessionWarningModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtend = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost/api';
      const res = await fetch(`${apiUrl}/session/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onExtend();
      } else {
        setError(data.error || 'Failed to extend session.');
      }
    } catch (e) {
      setError('Network error. Failed to extend session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-modal-overlay">
      <div className="session-modal">
        <h3 className="text-lg font-semibold text-white">Session Expiring Soon</h3>
        
        {extensionCount >= 5 ? (
          <p className="session-warning-text text-red-400">
            Max session duration reached (6 hours). You cannot extend further. Please save your work and refresh the page.
          </p>
        ) : (
          <p className="session-warning-text">
            Your session expires in 10 minutes. Extend to keep your temporary databases?
          </p>
        )}

        {error && (
          <div className="mb-4 text-xs text-red-400 p-2 bg-red-900/20 rounded">
            {error}
          </div>
        )}

        <div className="session-modal-actions">
          <button 
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            No, I'm done
          </button>
          
          <button 
            className="extend-button"
            onClick={handleExtend}
            disabled={extensionCount >= 5 || loading}
          >
            {loading ? 'Extending...' : 'Yes, extend +1 hour'}
          </button>
        </div>
      </div>
    </div>
  );
}
