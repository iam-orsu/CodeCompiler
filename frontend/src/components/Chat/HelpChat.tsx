'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, AlertTriangle, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  highlighted_lines?: number[];
  codeSnapshot?: string;
}

interface HelpChatProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  code: string;
  onHighlight?: (lines: number[]) => void;
}

export default function HelpChat({ isOpen, onClose, language, code, onHighlight }: HelpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCodeSnippet = (c: string, lines: number[]) => {
    if (!lines || lines.length === 0) return null;
    const split = c.split('\n');
    const min = Math.min(...lines);
    const max = Math.max(...lines);
    return split.slice(Math.max(0, min - 1), max).join('\n');
  };

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    onHighlight?.([]); // Clear highlights when user sends a new message

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      codeSnapshot: code,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const resp = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          user_message: trimmed,
          code_attempted: code || undefined,
          session_id: sessionIdRef.current || undefined,
        }),
      });

      if (resp.status === 429) {
        setError('Daily limit reached. Try again tomorrow.');
        setRemaining(0);
        setIsLoading(false);
        return;
      }

      if (!resp.ok) {
        setError('Failed to reach AI Tutor. Please try again.');
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      sessionIdRef.current = data.metadata?.session_id || sessionIdRef.current;
      setRemaining(data.metadata?.remaining_requests ?? null);

      const lines = data.highlighted_lines || [];
      if (onHighlight) onHighlight(lines);

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'ai',
        content: data.response,
        timestamp: data.metadata?.timestamp || new Date().toISOString(),
        highlighted_lines: lines,
        codeSnapshot: code,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, language, code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
          <div className="flex items-center gap-2.5">
            <div className="chat-avatar-ai">
              <Bot size={14} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Tutor
              </h3>
              <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                Socratic Hints Only
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <span className="chat-remaining">
                <Zap size={10} />
                {remaining} left
              </span>
            )}
            <button onClick={onClose} className="chat-close-btn">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="chat-warning">
          <AlertTriangle size={12} style={{ flexShrink: 0 }} />
          <span>This AI won't write code for you - figure it out yourself!</span>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !isLoading && (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <Bot size={24} />
              </div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Ask me anything about your code
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-ghost)', maxWidth: 240, textAlign: 'center' }}>
                I'll guide you with hints and questions. No code, no shortcuts - just learning.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble-wrap ${msg.role === 'user' ? 'chat-bubble-wrap-user' : 'chat-bubble-wrap-ai'}`}>
              {msg.role === 'ai' && (
                <div className="chat-avatar-ai chat-avatar-sm">
                  <Bot size={11} />
                </div>
              )}
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {msg.highlighted_lines && msg.highlighted_lines.length > 0 && msg.codeSnapshot && (
                  <div className="chat-snippet">
                    <span className="chat-snippet-header">
                      User's code (Line {msg.highlighted_lines.length === 1 ? msg.highlighted_lines[0] : `${Math.min(...msg.highlighted_lines)}-${Math.max(...msg.highlighted_lines)}`}):
                    </span>
                    <code>{getCodeSnippet(msg.codeSnapshot, msg.highlighted_lines)}</code>
                  </div>
                )}
                <p className="chat-bubble-text" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
                <span className="chat-time">{formatTime(msg.timestamp)}</span>
              </div>
              {msg.role === 'user' && (
                <div className="chat-avatar-user chat-avatar-sm">
                  <User size={11} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="chat-bubble-wrap chat-bubble-wrap-ai">
              <div className="chat-avatar-ai chat-avatar-sm">
                <Bot size={11} />
              </div>
              <div className="chat-bubble-ai">
                <div className="chat-typing-indicator">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="chat-error">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={remaining === 0 ? 'Daily limit reached...' : 'Ask about your code...'}
              disabled={isLoading || remaining === 0}
              className="chat-input"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || remaining === 0}
              className="chat-send-btn"
            >
              <Send size={14} />
            </button>
          </div>
          <span className="text-[9px] mt-1 block" style={{ color: 'var(--text-ghost)', textAlign: 'center' }}>
            Shift+Enter for new line / Esc to close
          </span>
        </div>
    </div>
  );
}
