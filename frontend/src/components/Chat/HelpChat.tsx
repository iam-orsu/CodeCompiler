'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, AlertTriangle, Zap, Sparkles, Code2, HelpCircle, Lightbulb } from 'lucide-react';

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

const SUGGESTIONS = [
  { icon: HelpCircle, label: 'What is wrong with my code?', color: 'blue' },
  { icon: Lightbulb, label: 'How can I optimize this?', color: 'amber' },
  { icon: Code2, label: 'Explain this logic to me', color: 'green' },
];

/** Simple markdown-ish rendering: bold, line references */
function renderAIText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Split by **bold** markers and `code` markers
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|Lines?\s+\d+(?:\s*[-]\s*\d+)?:?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const m = match[0];
    if (m.startsWith('**') && m.endsWith('**')) {
      parts.push(<strong key={key++} className="chat-text-bold">{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('`') && m.endsWith('`')) {
      parts.push(<code key={key++} className="chat-inline-code">{m.slice(1, -1)}</code>);
    } else {
      // Line reference
      parts.push(<span key={key++} className="chat-line-ref">{m}</span>);
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return parts;
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
  const codeRef = useRef(code);

  // Keep code ref in sync without recreating callbacks
  useEffect(() => { codeRef.current = code; }, [code]);

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

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCodeSnippet = (c: string, lines: number[]) => {
    if (!lines || lines.length === 0) return null;
    const split = c.split('\n');
    const min = Math.min(...lines);
    const max = Math.max(...lines);
    return split.slice(Math.max(0, min - 1), max).map((line, i) => ({
      num: min + i,
      text: line,
    }));
  };

  const sendMessage = useCallback(async (overrideMsg?: string) => {
    const trimmed = (overrideMsg || input).trim();
    if (!trimmed || isLoading) return;

    setError(null);
    onHighlight?.([]);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      codeSnapshot: codeRef.current,
    };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideMsg) setInput('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const resp = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          user_message: trimmed,
          code_attempted: codeRef.current || undefined,
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
        codeSnapshot: codeRef.current,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, language]);

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

  const showEmptyState = messages.length === 0 && !isLoading;

  return (
    <div className="hc-panel">
      {/* === HEADER === */}
      <div className="hc-header">
        <div className="hc-header-inner">
          <div className="hc-header-left">
            <div className="hc-logo">
              <div className="hc-logo-icon">
                <Sparkles size={14} />
              </div>
              <div className="hc-logo-text">
                <span className="hc-title">AI Tutor</span>
                <span className="hc-subtitle">Hints only, no code</span>
              </div>
            </div>
          </div>
          <div className="hc-header-right">
            {remaining !== null && (
              <div className="hc-credits">
                <Zap size={10} />
                <span>{remaining}</span>
              </div>
            )}
            <button onClick={onClose} className="hc-close-btn" aria-label="Close chat">
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Gradient accent line */}
        <div className="hc-header-accent" />
      </div>

      {/* === WARNING BANNER === */}
      <div className="hc-banner">
        <AlertTriangle size={11} />
        <span>This AI won't write code for you. Think through it!</span>
      </div>

      {/* === MESSAGE AREA === */}
      <div className="hc-messages">
        {showEmptyState && (
          <div className="hc-empty">
            <div className="hc-empty-glow" />
            <div className="hc-empty-avatar">
              <Bot size={28} />
            </div>
            <h4 className="hc-empty-title">How can I help?</h4>
            <p className="hc-empty-desc">
              Ask about bugs, logic, or optimization.<br/>I'll guide you with questions and hints.
            </p>
            <div className="hc-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className={`hc-suggestion hc-suggestion-${s.color}`}
                  onClick={() => sendMessage(s.label)}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <s.icon size={13} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`hc-msg ${msg.role === 'user' ? 'hc-msg-user' : 'hc-msg-ai'}`}
            style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
          >
            {msg.role === 'ai' && (
              <div className="hc-msg-avatar hc-msg-avatar-ai">
                <Sparkles size={12} />
              </div>
            )}
            <div className={msg.role === 'user' ? 'hc-bubble-user' : 'hc-bubble-ai'}>
              {/* Code snippet reference */}
              {msg.role === 'ai' && msg.highlighted_lines && msg.highlighted_lines.length > 0 && msg.codeSnapshot && (
                <div className="hc-code-ref">
                  <div className="hc-code-ref-header">
                    <Code2 size={11} />
                    <span>
                      {msg.highlighted_lines.length === 1
                        ? `Line ${msg.highlighted_lines[0]}`
                        : `Lines ${Math.min(...msg.highlighted_lines)}-${Math.max(...msg.highlighted_lines)}`}
                    </span>
                  </div>
                  <div className="hc-code-ref-body">
                    {getCodeSnippet(msg.codeSnapshot, msg.highlighted_lines)?.map((l) => (
                      <div key={l.num} className="hc-code-line">
                        <span className="hc-code-line-num">{l.num}</span>
                        <span className="hc-code-line-text">{l.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="hc-bubble-text">
                {msg.role === 'ai' ? renderAIText(msg.content) : msg.content}
              </p>
              <span className="hc-msg-time">{formatTime(msg.timestamp)}</span>
            </div>
            {msg.role === 'user' && (
              <div className="hc-msg-avatar hc-msg-avatar-user">
                <User size={12} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="hc-msg hc-msg-ai hc-typing-wrap">
            <div className="hc-msg-avatar hc-msg-avatar-ai">
              <Sparkles size={12} />
            </div>
            <div className="hc-bubble-ai hc-typing-bubble">
              <div className="hc-typing">
                <span className="hc-typing-dot" />
                <span className="hc-typing-dot" />
                <span className="hc-typing-dot" />
              </div>
              <span className="hc-typing-label">Thinking...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="hc-error">
            <AlertTriangle size={12} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* === INPUT AREA === */}
      <div className="hc-input-area">
        <div className="hc-input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={remaining === 0 ? 'Daily limit reached...' : `Ask about your ${language} code...`}
            disabled={isLoading || remaining === 0}
            className="hc-textarea"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading || remaining === 0}
            className="hc-send-btn"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="hc-input-hints">
          <span><kbd>Enter</kbd> send</span>
          <span className="hc-input-sep" />
          <span><kbd>Shift+Enter</kbd> new line</span>
          <span className="hc-input-sep" />
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
