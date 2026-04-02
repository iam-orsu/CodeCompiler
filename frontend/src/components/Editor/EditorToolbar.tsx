'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, ChevronDown, Zap, Package, Search, Sparkles, Info, Database } from 'lucide-react';
import { useLanguages } from '../../hooks/useLanguages';
import { LanguageId, LanguageConfig } from '../../types';
import { LIBRARIES } from '../../lib/marketplace';
import LanguageIcon, { LANG_COLORS } from './LanguageIcon';

interface EditorToolbarProps {
  language: LanguageId;
  onLanguageChange: (lang: LanguageId) => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  isWebMode: boolean;
  isSpecial: boolean;
  selectedLibraries: string[];
  onLibraryChange: (libs: string[]) => void;
  isChatOpen: boolean;
  onChatToggle: () => void;
  sessionElement?: React.ReactNode;
}

const LIB_ICON: Record<string, string> = {
  css: '\u{1F3A8}', ui: '\u{1F9E9}', js: '\u26A1', icon: '\u2726',
};

export default function EditorToolbar({
  language, onLanguageChange, onRun, onStop, isRunning,
  isWebMode, isSpecial, selectedLibraries, onLibraryChange,
  isChatOpen, onChatToggle, sessionElement
}: EditorToolbarProps) {
  const { languages } = useLanguages();
  const [open, setOpen] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [pending, setPending] = useState<LanguageId | null>(null);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const mpRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open && searchRef.current) searchRef.current.focus(); }, [open]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
      if (mpRef.current && !mpRef.current.contains(e.target as Node)) { setMpOpen(false); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const current = languages.find((l: LanguageConfig) => l.id === language);
  const pendingConfig = languages.find((l: LanguageConfig) => l.id === pending);
  const filter = (list: LanguageConfig[]) => search ? list.filter((l: LanguageConfig) => l.name.toLowerCase().includes(search.toLowerCase())) : list;
  const prog = filter(languages.filter((l: LanguageConfig) => !l.isWebMode && !l.isSpecial));
  const web = filter(languages.filter((l: LanguageConfig) => l.isWebMode));
  const db = filter(languages.filter((l: LanguageConfig) => l.isSpecial));

  const pick = (id: LanguageId) => { if (id !== language) setPending(id); setOpen(false); setSearch(''); };
  const confirm = () => { if (pending) { onLanguageChange(pending); setPending(null); } };

  const toggleLib = (id: string) => {
    const lib = LIBRARIES.find(l => l.id === id);
    if (selectedLibraries.includes(id)) {
      const removed = new Set([id]);
      LIBRARIES.forEach(l => { if (l.requires?.includes(id)) removed.add(l.id); });
      onLibraryChange(selectedLibraries.filter(l => !removed.has(l)));
    } else {
      const newList = [...selectedLibraries, id];
      if (lib?.requires) {
        lib.requires.forEach(req => { if (!newList.includes(req)) newList.push(req); });
      }
      onLibraryChange(newList);
    }
  };

  const cssLibs = LIBRARIES.filter(l => l.type === 'css');
  const uiLibs = LIBRARIES.filter(l => l.type === 'ui');
  const jsLibs = LIBRARIES.filter(l => l.type === 'js');
  const iconLibs = LIBRARIES.filter(l => l.type === 'icon');

  const brandColor = LANG_COLORS[language] || '#3b82f6';

  const Section = ({ title, items }: { title: string; items: LanguageConfig[] }) => items.length === 0 ? null : (
    <>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
        padding: '10px 14px 4px', color: 'var(--text-ghost)',
      }}>{title}</div>
      {items.map((l: LanguageConfig, idx: number) => {
        const isActive = language === l.id;
        const isHovered = hoveredId === l.id;
        const itemColor = LANG_COLORS[l.id] || '#a1a1aa';
        return (
          <button key={l.id} onClick={() => pick(l.id)}
            onMouseEnter={() => setHoveredId(l.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: 'calc(100% - 8px)', margin: '1px 4px',
              padding: '7px 10px', fontSize: 12.5, borderRadius: 8,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontWeight: isActive ? 600 : 400,
              background: isActive
                ? `linear-gradient(135deg, ${itemColor}18, ${itemColor}08)`
                : isHovered ? 'var(--bg-hover)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              outline: isActive ? `1px solid ${itemColor}30` : 'none',
              animationDelay: `${idx * 20}ms`,
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? `${itemColor}20` : isHovered ? `${itemColor}10` : 'var(--bg-muted)',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? `0 0 12px ${itemColor}25` : 'none',
            }}>
              <LanguageIcon langId={l.id} size={16} />
            </div>
            <span style={{ flex: 1 }}>{l.name}</span>
            {isActive && (
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: itemColor,
                boxShadow: `0 0 8px ${itemColor}`,
              }} />
            )}
          </button>
        );
      })}
    </>
  );

  const LibSection = ({ title, items, icon }: { title: string; items: typeof LIBRARIES; icon: string }) => items.length === 0 ? null : (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1" style={{ color: 'var(--text-ghost)' }}>
        {icon} {title}
      </div>
      {items.map(lib => {
        const active = selectedLibraries.includes(lib.id);
        const disabled = lib.requires?.some(r => !selectedLibraries.includes(r)) || false;
        return (
          <button key={lib.id} onClick={() => !disabled && toggleLib(lib.id)}
            className="flex items-center gap-2.5 w-[calc(100%-8px)] mx-1 px-2 py-[5px] text-[12px] rounded-md transition-colors"
            style={{
              color: disabled ? 'var(--text-ghost)' : active ? 'var(--blue-400)' : 'var(--text-secondary)',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
              border: active ? '1px solid var(--blue-500)' : '1px solid var(--border-secondary)',
              background: active ? 'var(--blue-500)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', lineHeight: 1,
            }}>
              {active ? '\u2713' : ''}
            </span>
            <span style={{ fontWeight: active ? 500 : 400 }}>{lib.name}</span>
            {lib.requires && (
              <span className="ml-auto text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-base)', color: 'var(--text-ghost)' }}>
                +{lib.requires.join(', ')}
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-y-1 min-h-[44px] px-3 py-1 shrink-0"
           style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-primary)' }}>
        {/* Language Picker */}
        <div className="flex items-center gap-2">
          <div ref={ref} className="relative">
            <button id="language-selector" onClick={() => setOpen(!open)}
              className="flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium"
              style={{
                padding: '6px 12px 6px 8px',
                background: open ? `linear-gradient(135deg, ${brandColor}15, transparent)` : 'var(--bg-overlay)',
                border: open ? `1px solid ${brandColor}40` : '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
                boxShadow: open ? `0 0 16px ${brandColor}15` : 'none',
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${brandColor}18`,
              }}>
                <LanguageIcon langId={language} size={14} />
              </div>
              {current?.name || 'Select'}
              <ChevronDown size={12}
                style={{
                  color: 'var(--text-muted)',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }} />
            </button>

            {open && (
              <div id="language-dropdown" className="animate-slide-down"
                   style={{
                     position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                     width: 260, borderRadius: 12, overflow: 'hidden', zIndex: 50,
                     background: 'linear-gradient(180deg, #1e1e24, #1a1a1e)',
                     border: '1px solid var(--border-secondary)',
                     boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05) inset',
                   }}>
                {/* Search */}
                <div style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 10px', borderRadius: 8,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-primary)',
                  }}>
                    <Search size={12} style={{ color: 'var(--text-ghost)', flexShrink: 0 }} />
                    <input ref={searchRef} type="text" placeholder="Search languages..."
                      value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '7px 0', fontSize: 11.5,
                        background: 'transparent', color: 'var(--text-primary)',
                        border: 'none', outline: 'none',
                      }} />
                  </div>
                </div>
                {/* Items */}
                <div className="no-scrollbar" style={{ overflowY: 'auto', maxHeight: 380, padding: '2px 0 4px' }}>
                  <Section title="Languages" items={prog} />
                  <Section title="Frontend" items={web} />
                  <Section title="Databases" items={db} />
                  {prog.length === 0 && web.length === 0 && db.length === 0 && (
                    <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-ghost)' }}>
                      No results found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Marketplace */}
          {isWebMode && (
            <div ref={mpRef} className="relative">
              <button onClick={() => setMpOpen(!mpOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                style={{
                  background: selectedLibraries.length > 0 ? 'var(--blue-glow)' : 'var(--bg-overlay)',
                  border: selectedLibraries.length > 0 ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-primary)',
                  color: selectedLibraries.length > 0 ? 'var(--blue-400)' : 'var(--text-secondary)',
                }}>
                <Package size={12} />
                <span className="hidden sm:inline">Libraries</span>
                {selectedLibraries.length > 0 && (
                  <span className="flex items-center justify-center text-[9px] font-bold rounded-full"
                    style={{ width: 16, height: 16, background: 'var(--blue-500)', color: '#fff' }}>
                    {selectedLibraries.length}
                  </span>
                )}
                <ChevronDown size={10} className={`transition-transform ${mpOpen ? 'rotate-180' : ''}`} />
              </button>

              {mpOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-[240px] rounded-lg overflow-hidden z-50 animate-slide-down"
                     style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-secondary)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>CDN Libraries</span>
                    {selectedLibraries.length > 0 && (
                      <button onClick={() => onLibraryChange([])} className="text-[10px] px-1.5 py-0.5 rounded hover:opacity-80"
                        style={{ color: 'var(--text-ghost)' }}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[320px] no-scrollbar py-0.5">
                    <LibSection title="CSS Frameworks" items={cssLibs} icon={LIB_ICON.css} />
                    <LibSection title="UI Kits" items={uiLibs} icon={LIB_ICON.ui} />
                    <LibSection title="JavaScript" items={jsLibs} icon={LIB_ICON.js} />
                    <LibSection title="Icons" items={iconLibs} icon={LIB_ICON.icon} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sessionElement}
          
          {isSpecial && (
            <div className="group relative">
              <button className="flex items-center justify-center p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#27272a] transition-all">
                <Info size={14} />
              </button>
              <div className="absolute right-0 top-[100%] mt-2 hidden group-hover:block z-50 w-[280px] bg-[#1a1a1e] border border-gray-700/50 rounded-lg shadow-2xl p-3 text-[11px] animate-fade-in" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
                <div className="font-semibold text-gray-200 mb-2 flex items-center gap-1.5 text-[12px]">
                  <Database size={12} className="text-blue-400" /> Available Data
                </div>
                <div className="text-gray-400 space-y-2 leading-relaxed">
                  <p><strong className="text-blue-300 font-medium tracking-wide">movies</strong><br/>title, language, genre, lead_actor, director, release_year, rating, box_office_cr</p>
                  <p><strong className="text-blue-300 font-medium tracking-wide">actors</strong><br/>name, born_year, nationality</p>
                  <div className="h-px w-full bg-gray-700/50 my-2"></div>
                  <p className="text-[10px] text-gray-500 italic">Query these pre-loaded datasets alongside your own temporary tables.</p>
                </div>
              </div>
            </div>
          )}

          <kbd className="hidden sm:flex items-center text-[10px] px-1.5 py-0.5 rounded"
               style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-primary)', color: 'var(--text-ghost)', fontFamily: "'JetBrains Mono', monospace" }}>
            Ctrl+Enter
          </kbd>
          {!isRunning ? (
            <button className="btn btn-primary" onClick={onRun}>
              <Play size={12} fill="currentColor" />
              {isWebMode ? 'Preview' : isSpecial ? 'Query' : 'Run'}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onStop}>
              <Square size={12} fill="currentColor" />
              Stop
            </button>
          )}

          <button
            onClick={onChatToggle}
            className={`btn ${isChatOpen ? 'btn-ai-glow-active' : 'btn-ai-glow'}`}
            style={{
              background: isChatOpen ? 'var(--blue-glow-md)' : 'var(--bg-overlay)',
              color: isChatOpen ? 'var(--blue-400)' : 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">AI Assist</span>
          </button>
        </div>
      </div>

      {/* Switch Language Confirmation */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-[360px] rounded-lg overflow-hidden animate-scale-in"
               style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-secondary)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <Zap size={16} style={{ color: 'var(--amber-500)' }} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Switch to {pendingConfig?.name}?</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Your current code will be replaced.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border-primary)' }}>
              <button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirm}>Switch</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
