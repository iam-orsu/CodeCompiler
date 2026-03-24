import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, FolderOpen, FileJson, FileCode2, FileType2, FileText,
  FileImage, File, ChevronRight, ChevronDown, Plus, FolderPlus,
  Pencil, Trash2, X
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

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx')) return <FileJson size={14} className="text-yellow-400" />;
  if (fileName.endsWith('.html')) return <FileCode2 size={14} className="text-orange-500" />;
  if (fileName.endsWith('.css')) return <FileType2 size={14} className="text-blue-500" />;
  if (fileName.endsWith('.py')) return <FileCode2 size={14} className="text-green-500" />;
  if (fileName.endsWith('.md')) return <FileText size={14} className="text-gray-400" />;
  if (fileName.match(/\.(png|jpe?g|svg|gif|ico)$/i)) return <FileImage size={14} className="text-purple-400" />;
  return <File size={14} className="text-gray-400" />;
};

export default function FileExplorer({ files, setFiles, activeFileId, onFileSelect }: FileExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input on edit
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      const dotIndex = editValue.lastIndexOf('.');
      if (dotIndex > 0) {
        editInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        editInputRef.current.select();
      }
    }
  }, [editingId]);

  // Recursively update a node
  const updateNode = (nodes: FileNode[], id: string, updater: (node: FileNode) => FileNode | null): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        const updated = updater(node);
        return updated ? updated : (null as unknown as FileNode); // We filter nulls out below
      }
      if (node.children) {
        return { ...node, children: updateNode(node.children, id, updater) };
      }
      return node;
    }).filter(Boolean); // Remove deleted nodes
  };

  // Recursively find a node by ID
  const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleToggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => updateNode(prev, id, node => ({ ...node, isOpen: !node.isOpen })));
  };

  const handleRenameCommit = (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    setFiles(prev => updateNode(prev, id, node => ({ ...node, name: newName })));
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this item?")) {
      setFiles(prev => updateNode(prev, id, () => null)); // Returning null marks for deletion via filter
    }
  };

  const constructPath = (nodes: FileNode[], targetId: string, currentPath = ""): string | null => {
    for (const node of nodes) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (node.id === targetId) return nodePath;
      if (node.children) {
        const found = constructPath(node.children, targetId, nodePath);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileClick = (id: string) => {
    const node = findNode(files, id);
    if (node?.type === 'file') {
      const fullPath = constructPath(files, id) || node.name;
      onFileSelect(id, fullPath);
    }
  };

  // Creates at root level for simplicity, can be expanded to create inside selected folder
  const handleCreate = (type: FileNodeType) => {
    const newId = Date.now().toString();
    const newNode: FileNode = {
      id: newId,
      name: type === 'folder' ? 'new_folder' : 'new_file.txt',
      type: type,
      isOpen: type === 'folder' ? true : undefined,
      children: type === 'folder' ? [] : undefined,
      content: type === 'file' ? '' : undefined,
    };
    
    setFiles(prev => [...prev, newNode]);
    setEditingId(newId);
    setEditValue(newNode.name);
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="w-full">
        {/* Node Row */}
        <div 
          onClick={node.type === 'file' ? () => handleFileClick(node.id) : (e) => handleToggleFolder(node.id, e)}
          className={`group flex items-center justify-between py-1.5 px-2 cursor-pointer transition-colors text-sm
            ${depth === 0 ? 'ml-0' : ''} 
            ${activeFileId === node.id ? 'bg-[#37373D] text-white' : 'text-gray-300 hover:bg-[#2A2D2E] hover:text-white'}
          `}
          style={{ paddingLeft: `${(depth * 12) + 8}px` }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            {/* Chevron for folders */}
            {node.type === 'folder' && (
              <span className="text-gray-400 group-hover:text-gray-200">
                {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            {/* Indent spacer for files if needed */}
            {node.type === 'file' && <span className="w-3" />}

            {/* Icon */}
            {node.type === 'folder' 
              ? (node.isOpen ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />)
              : getFileIcon(node.name)
            }

            {/* Name or Input */}
            {editingId === node.id ? (
              <input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleRenameCommit(node.id, editValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameCommit(node.id, editValue);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="bg-[#1E1E1E] text-white outline-none border border-blue-500 w-full ml-1 px-1 text-sm h-5"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}
          </div>

          {/* Hover Actions */}
          {editingId !== node.id && (
            <div className="hidden group-hover:flex items-center gap-1.5 pr-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setEditValue(node.name); setEditingId(node.id); }}
                className="text-gray-500 hover:text-blue-400 transition-colors"
                title="Rename"
              >
                <Pencil size={13} />
              </button>
              <button 
                onClick={(e) => handleDelete(node.id, e)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Children Render */}
        {node.type === 'folder' && node.isOpen && node.children && (
          <div className="flex flex-col">
            {renderTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#18181A] select-none text-gray-300">
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wider text-gray-400 border-b border-[#2B2D31]">
        <span>EXPLORER</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleCreate('file')}
            className="hover:text-white transition-colors p-0.5 rounded hover:bg-[#2B2D31]"
            title="New File"
          >
            <Plus size={15} />
          </button>
          <button 
            onClick={() => handleCreate('folder')}
            className="hover:text-white transition-colors p-0.5 rounded hover:bg-[#2B2D31]"
            title="New Folder"
          >
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {files.length === 0 ? (
          <div className="text-center text-xs text-gray-500 mt-10 px-4">
            No files currently open. Click the + icon to create a file.
          </div>
        ) : (
          renderTree(files, 0)
        )}
      </div>
    </div>
  );
}
