'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, RotateCcw, Box, ChevronDown, AlertTriangle } from 'lucide-react';
import { useLanguages } from '../../hooks/useLanguages';
import { LanguageId } from '../../types';

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

const getLanguageIcon = (id: string) => {
  switch(id) {
    case 'python': return '🐍';
    case 'javascript': return '🟢';
    case 'typescript': return '📘';
    case 'c': return '🅲';
    case 'cpp': return '⚡';
    case 'java': return '☕';
    case 'go': return '🐹';
    case 'rust': return '🦀';
    case 'php': return '🐘';
    case 'bash': return '🐚';
    case 'r': return '📊';
    case 'csharp': return '🎯';
    case 'ruby': return '💎';
    case 'scala': return '🧗';
    case 'html': return '🌐';
    case 'react': return '⚛️';
    case 'vue': return '💚';
    case 'angular': return '🅰️';
    case 'sqlite': return '🗄️';
    case 'mongodb': return '🍃';
    default: return '📄';
  }
};

export default function EditorToolbar({
  language,
  onLanguageChange,
  onRun,
  onStop,
  isRunning,
  isWebMode,
  isSpecial,
  selectedLibraries,
  onLibraryChange
}: EditorToolbarProps) {
  const { languages } = useLanguages();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleLangChange = (newLang: LanguageId) => {
    if (newLang !== language) {
      setPendingLanguage(newLang);
    }
    setDropdownOpen(false);
  };

  const confirmLanguageChange = () => {
    if (pendingLanguage) {
      onLanguageChange(pendingLanguage);
      setPendingLanguage(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLangConfig = languages.find(l => l.id === language);
  const pendingLangConfig = languages.find(l => l.id === pendingLanguage);

  return (
    <>
      <div className="flex items-center justify-between w-full h-[41px] px-3 bg-[#161B22] shadow-sm relative z-40">
        {/* Left items: Custom Dropdown */}
        <div className="flex items-center gap-2" ref={dropdownRef}>
          <div className="relative">
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center bg-[#1E232B] hover:bg-[#2A303A] transition-colors rounded-md border border-[#3E4148] group cursor-pointer select-none shadow-sm"
            >
              <div className="px-2.5 py-1.5 flex items-center gap-2 text-xs text-gray-200 font-medium">
                 <span className="text-[13px]">{getLanguageIcon(language)}</span>
                 {currentLangConfig?.name || 'Select Language'}
              </div>
              <div className="px-2 py-1.5 border-l border-[#3E4148] flex items-center">
                 <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-gray-200' : 'group-hover:text-gray-200'}`} />
              </div>
            </div>

            {/* Custom Popover */}
            {dropdownOpen && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-[240px] bg-[#161B22] border border-[#2E3138] rounded-md shadow-xl overflow-hidden z-50 flex flex-col max-h-[400px]">
                <div className="overflow-y-auto w-full no-scrollbar pb-2">
                  
                  {/* Programming */}
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 pt-3 pb-1.5 sticky top-0 bg-[#161B22]/95 backdrop-blur-sm z-10 border-b border-[#2E3138]/50 mb-1">
                    Programming
                  </div>
                  <div className="flex flex-col px-1.5 space-y-0.5">
                    {languages.filter((l: any) => !l.isWebMode && !l.isSpecial).map((l: any) => (
                      <button
                        key={l.id} 
                        onClick={() => handleLangChange(l.id)}
                        className={`flex items-center gap-2.5 text-left px-2 py-1.5 text-xs rounded-md transition-colors ${language === l.id ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-gray-300 hover:bg-[#2E3138] hover:text-gray-100'}`}
                      >
                        <span className="text-[13px] w-4 text-center">{getLanguageIcon(l.id)}</span>
                        {l.name}
                      </button>
                    ))}
                  </div>

                  {/* Front End */}
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 pt-3 pb-1.5 sticky top-0 bg-[#161B22]/95 backdrop-blur-sm z-10 border-b border-[#2E3138]/50 mt-2 mb-1">
                    Front End
                  </div>
                  <div className="flex flex-col px-1.5 space-y-0.5">
                    {languages.filter((l: any) => l.isWebMode).map((l: any) => (
                      <button
                        key={l.id} 
                        onClick={() => handleLangChange(l.id)}
                        className={`flex items-center gap-2.5 text-left px-2 py-1.5 text-xs rounded-md transition-colors ${language === l.id ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-gray-300 hover:bg-[#2E3138] hover:text-gray-100'}`}
                      >
                        <span className="text-[13px] w-4 text-center">{getLanguageIcon(l.id)}</span>
                        {l.name}
                      </button>
                    ))}
                  </div>

                  {/* Databases */}
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 pt-3 pb-1.5 sticky top-0 bg-[#161B22]/95 backdrop-blur-sm z-10 border-b border-[#2E3138]/50 mt-2 mb-1">
                    Databases
                  </div>
                  <div className="flex flex-col px-1.5 space-y-0.5">
                    {languages.filter((l: any) => l.isSpecial).map((l: any) => (
                      <button
                        key={l.id} 
                        onClick={() => handleLangChange(l.id)}
                        className={`flex items-center gap-2.5 text-left px-2 py-1.5 text-xs rounded-md transition-colors ${language === l.id ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-gray-300 hover:bg-[#2E3138] hover:text-gray-100'}`}
                      >
                        <span className="text-[13px] w-4 text-center">{getLanguageIcon(l.id)}</span>
                        {l.name}
                      </button>
                    ))}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right items: Action buttons */}
        <div className="flex items-center gap-4">
          {isWebMode && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-300 hover:bg-[#2E3138] transition-colors">
              <Box size={14} />
              <span>Packages ({selectedLibraries.length})</span>
            </button>
          )}
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 font-medium hidden sm:block">Ctrl+Enter</span>
            {!isRunning ? (
              <button 
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                onClick={onRun}
              >
                {isWebMode ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />}
                <span>{isWebMode ? 'Refresh' : isSpecial ? 'Run Query' : 'Run'}</span>
              </button>
            ) : (
              <button 
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                onClick={onStop}
              >
                <Square size={14} fill="currentColor" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Language Change Modal Dialog */}
      {pendingLanguage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 ease-out">
          <div className="bg-[#161B22] border border-[#2E3138] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all duration-200 scale-100 opacity-100">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 shrink-0">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Change Language?</h3>
                </div>
              </div>
              <p className="text-sm text-gray-400 pl-16">
                Switching to <span className="text-white font-medium">{pendingLangConfig?.name}</span> will replace your current code. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#0E1117] border-t border-[#2E3138]">
              <button 
                onClick={() => setPendingLanguage(null)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-transparent hover:bg-[#2E3138] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLanguageChange}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
