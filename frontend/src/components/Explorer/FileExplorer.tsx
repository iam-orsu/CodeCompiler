import React, { useState, useRef, useEffect } from 'react';
import {
  Folder, FolderOpen, FileJson, FileCode2, FileType2, FileText,
  FileImage, File, ChevronRight, ChevronDown, Plus, FolderPlus,
  Pencil, Trash2
} from 'lucide-react';

export type FileNodeType = 'file' | 'folder';

export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  isOpen?: boolean;
  content?: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  activeFileId: string | null;
  onFileSelect: (id: string, path: string) => void;
}

const getIcon = (name: string) => {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return <FileJson size={14} style={{ color: '#3178c6' }} />;
  if (name.endsWith('.js') || name.endsWith('.jsx')) return <FileJson size={14} style={{ color: '#f7df1e' }} />;
  if (name.endsWith('.html')) return <FileCode2 size={14} style={{ color: '#e34f26' }} />;
  if (name.endsWith('.css')) return <FileType2 size={14} style={{ color: '#38bdf8' }} />;
  if (name.endsWith('.py')) return <FileCode2 size={14} style={{ color: '#4ade80' }} />;
  if (name.endsWith('.go')) return <FileCode2 size={14} style={{ color: '#00add8' }} />;
  if (name.endsWith('.rs')) return <FileCode2 size={14} style={{ color: '#ce422b' }} />;
  if (name.endsWith('.java')) return <FileCode2 size={14} style={{ color: '#ed8b00' }} />;
  if (name.endsWith('.md')) return <FileText size={14} style={{ color: 'var(--text-ghost)' }} />;
  if (name.match(/\.(png|jpe?g|svg|gif|ico)$/i)) return <FileImage size={14} style={{ color: '#a78bfa' }} />;
  return <File size={14} style={{ color: 'var(--text-ghost)' }} />;
};

export default function FileExplorer({ files, setFiles, activeFileId, onFileSelect }: FileExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      const dot = editValue.lastIndexOf('.');
      editRef.current.setSelectionRange(0, dot > 0 ? dot : editValue.length);
    }
  }, [editingId]);

  const updateNode = (nodes: FileNode[], id: string, fn: (n: FileNode) => FileNode | null): FileNode[] =>
    nodes.map(n => n.id === id ? (fn(n) || null as unknown as FileNode) : n.children ? { ...n, children: updateNode(n.children, id, fn) } : n).filter(Boolean);

  const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const n of nodes) { if (n.id === id) return n; if (n.children) { const f = findNode(n.children, id); if (f) return f; } }
    return null;
  };

  const getPath = (nodes: FileNode[], id: string, p = ''): string | null => {
    for (const n of nodes) { const np = p ? `${p}/${n.name}` : n.name; if (n.id === id) return np; if (n.children) { const f = getPath(n.children, id, np); if (f) return f; } }
    return null;
  };

  const handleClick = (id: string) => {
    const n = findNode(files, id);
    if (n?.type === 'file') onFileSelect(id, getPath(files, id) || n.name);
  };

  const handleCreate = (type: FileNodeType) => {
    const id = Date.now().toString();
    const node: FileNode = { id, name: type === 'folder' ? 'new_folder' : 'new_file.txt', type, isOpen: type === 'folder' ? true : undefined, children: type === 'folder' ? [] : undefined, content: type === 'file' ? '' : undefined };
    setFiles(prev => [...prev, node]);
    setEditingId(id);
    setEditValue(node.name);
  };

  const commitRename = (id: string, name: string) => {
    if (name.trim()) setFiles(prev => updateNode(prev, id, n => ({ ...n, name })));
    setEditingId(null);
  };

  const renderTree = (nodes: FileNode[], depth = 0) => nodes.map(node => (
    <div key={node.id}>
      <div
        onClick={node.type === 'file' ? () => handleClick(node.id) : (e: React.MouseEvent) => { e.stopPropagation(); setFiles(prev => updateNode(prev, node.id, n => ({ ...n, isOpen: !n.isOpen }))); }}
        className="group flex items-center justify-between py-[5px] cursor-pointer transition-colors"
        style={{
          paddingLeft: `${depth * 12 + 12}px`,
          paddingRight: '8px',
          background: activeFileId === node.id ? 'var(--blue-glow)' : 'transparent',
          color: activeFileId === node.id ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { if (activeFileId !== node.id) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { if (activeFileId !== node.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
      >
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden text-[12px]">
          {node.type === 'folder' ? (
            <span style={{ color: 'var(--text-ghost)' }}>{node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          ) : <span className="w-3" />}
          {node.type === 'folder'
            ? (node.isOpen ? <FolderOpen size={14} style={{ color: 'var(--blue-400)' }} /> : <Folder size={14} style={{ color: 'var(--blue-400)' }} />)
            : getIcon(node.name)}
          {editingId === node.id ? (
            <input ref={editRef} value={editValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
              onBlur={() => commitRename(node.id, editValue)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') commitRename(node.id, editValue); if (e.key === 'Escape') setEditingId(null); }}
              className="outline-none w-full ml-1 px-1 text-[12px] h-[18px] rounded"
              style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--blue-500)' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()} />
          ) : <span className="truncate">{node.name}</span>}
        </div>
        {editingId !== node.id && (
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditValue(node.name); setEditingId(node.id); }}
              className="p-0.5 rounded transition-colors" style={{ color: 'var(--text-ghost)' }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = 'var(--blue-400)'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = 'var(--text-ghost)'; }}>
              <Pencil size={11} />
            </button>
            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (confirm('Delete?')) setFiles(prev => updateNode(prev, node.id, () => null)); }}
              className="p-0.5 rounded transition-colors" style={{ color: 'var(--text-ghost)' }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = 'var(--red-400)'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = 'var(--text-ghost)'; }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
      {node.type === 'folder' && node.isOpen && node.children && renderTree(node.children, depth + 1)}
    </div>
  ));

  return (
    <div className="flex flex-col w-full h-full select-none" style={{ background: 'var(--bg-surface)' }}>
      <div className="flex items-center justify-between px-3 h-[44px] shrink-0" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-ghost)' }}>Explorer</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => handleCreate('file')} className="btn btn-ghost" style={{ padding: '3px' }}>
            <Plus size={14} />
          </button>
          <button onClick={() => handleCreate('folder')} className="btn btn-ghost" style={{ padding: '3px' }}>
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {files.length === 0 ? (
          <div className="text-center text-[11px] mt-12 px-4" style={{ color: 'var(--text-ghost)' }}>No files yet</div>
        ) : renderTree(files)}
      </div>
    </div>
  );
}
