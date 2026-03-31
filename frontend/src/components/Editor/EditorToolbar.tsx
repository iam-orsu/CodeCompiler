'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, ChevronDown, Zap, Package } from 'lucide-react';
import { useLanguages } from '../../hooks/useLanguages';
import { LanguageId, LanguageConfig } from '../../types';
import { LIBRARIES } from '../../lib/marketplace';
import { LANG_EMOJI } from '../../lib/languages';

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
}



const LIB_ICON: Record<string, string> = {
  css: '🎨', ui: '🧩', js: '⚡', icon: '✦',
};

export default function EditorToolbar({
  language, onLanguageChange, onRun, onStop, isRunning,
  isWebMode, isSpecial, selectedLibraries, onLibraryChange,
}: EditorToolbarProps) {
  const { languages } = useLanguages();
  const [open, setOpen] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [pending, setPending] = useState<LanguageId | null>(null);
  const [search, setSearch] = useState('');
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
      // remove this lib + anything that requires it
      const removed = new Set([id]);
      LIBRARIES.forEach(l => { if (l.requires?.includes(id)) removed.add(l.id); });
      onLibraryChange(selectedLibraries.filter(l => !removed.has(l)));
    } else {
      const newList = [...selectedLibraries, id];
      // auto-add requirements
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

  const Section = ({ title, items }: { title: string; items: LanguageConfig[] }) => items.length === 0 ? null : (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-2.5 pb-1" style={{ color: 'var(--text-ghost)' }}>{title}</div>
      {items.map((l: LanguageConfig) => (
        <button key={l.id} onClick={() => pick(l.id)}
          className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2 py-[5px] text-[12px] rounded-md transition-colors"
          style={{
            background: language === l.id ? 'var(--blue-glow)' : 'transparent',
            color: language === l.id ? 'var(--blue-400)' : 'var(--text-secondary)',
            fontWeight: language === l.id ? 600 : 400,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (language !== l.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { if (language !== l.id) e.currentTarget.style.background = 'transparent'; }}
        >
          <span className="text-[13px] w-5 text-center">{LANG_EMOJI[l.id] || '📄'}</span>
          {l.name}
          {language === l.id && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--blue-500)' }} />}
        </button>
      ))}
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
            {/* Checkbox */}
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
      <div className="flex items-center justify-between h-[44px] px-3 shrink-0"
           style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-primary)' }}>
        {/* Language Picker */}
        <div className="flex items-center gap-2">
          <div ref={ref} className="relative">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors"
              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
              <span className="text-[13px]">{LANG_EMOJI[language] || '📄'}</span>
              {current?.name || 'Select'}
              <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {open && (
              <div className="absolute top-[calc(100%+4px)] left-0 w-[240px] rounded-lg overflow-hidden z-50 animate-slide-down"
                   style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-secondary)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                <div className="p-1.5" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <input ref={searchRef} type="text" placeholder="Search..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded text-[11px] outline-none"
                    style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                </div>
                <div className="overflow-y-auto max-h-[320px] no-scrollbar py-0.5">
                  <Section title="Languages" items={prog} />
                  <Section title="Frontend" items={web} />
                  <Section title="Databases" items={db} />
                  {prog.length === 0 && web.length === 0 && db.length === 0 && (
                    <div className="px-3 py-6 text-center text-[11px]" style={{ color: 'var(--text-ghost)' }}>No results</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Marketplace - only for web mode */}
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

        {/* Actions */}
        <div className="flex items-center gap-2">
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
