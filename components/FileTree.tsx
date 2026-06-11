import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, FileCode, Trash2, Edit, Plus, FolderPlus, Upload, FileArchive } from 'lucide-react';
import { FileItem, FileTreeItem } from '../types';

interface FileTreeProps {
  files: FileItem[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onUploadFiles: (uploaded: FileItem[]) => void;
}

export default function FileTree({
  files,
  selectedFilePath,
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  onCreateFolder,
  onUploadFiles,
  onSelectFile,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '': true, // Expand root folder
  });
  const [newFileName, setNewFileName] = useState('');
  const [activeFolderCreate, setActiveFolderCreate] = useState<string | null>(null); // path of folder being added to
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Build nest Tree Structure from flat list of files
  const treeData = useMemo(() => {
    const root: FileTreeItem = { name: 'Root', path: '', type: 'dir', children: [] };
    
    files.forEach((file) => {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;
      
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = i === parts.length - 1;
        
        let found = current.children?.find((node) => node.name === part);
        if (!found) {
          found = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'dir',
            children: isLast ? undefined : [],
          };
          current.children?.push(found);
        }
        current = found;
      }
    });

    const sortTree = (node: FileTreeItem) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortTree);
      }
    };
    
    sortTree(root);
    return root.children || [];
  }, [files]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const list = Array.from(e.target.files) as File[];
    await processUploadedFileList(list);
    e.target.value = ''; 
  };

  const processUploadedFileList = async (list: File[]) => {
    const resolved: FileItem[] = [];
    for (const rawFile of list) {
      const pathValue = (rawFile as any).webkitRelativePath || rawFile.name;
      const isBinary = !rawFile.type.startsWith('text/') && 
                       !rawFile.name.endsWith('.html') && 
                       !rawFile.name.endsWith('.css') && 
                       !rawFile.name.endsWith('.js') && 
                       !rawFile.name.endsWith('.json') &&
                       !rawFile.name.endsWith('.svg') &&
                       !rawFile.name.endsWith('.md');
      
      const filePromise = new Promise<FileItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          let contents = '';
          if (isBinary) {
            const arr = new Uint8Array(e.target?.result as ArrayBuffer);
            let binary = '';
            for (let i = 0; i < arr.length; i++) {
              binary += String.fromCharCode(arr[i]);
            }
            contents = btoa(binary);
          } else {
            contents = e.target?.result as string;
          }
          resolve({
            path: pathValue,
            content: contents,
            isBinary,
            size: rawFile.size,
          });
        };
        
        if (isBinary) {
          reader.readAsArrayBuffer(rawFile);
        } else {
          reader.readAsText(rawFile);
        }
      });
      resolved.push(await filePromise);
    }
    onUploadFiles(resolved);
  };

  const renderTree = (nodes: FileTreeItem[], level = 0) => {
    return nodes.map((node) => {
      const isDir = node.type === 'dir';
      const isExpanded = !!expandedFolders[node.path];
      const isSelected = selectedFilePath === node.path;
      
      return (
        <div key={node.path} className="select-none">
          <div
            id={`node-${node.path.replace(/[^a-zA-Z0-9-]/g, '_')}`}
            style={{ paddingLeft: `${level * 10 + 6}px` }}
            className={`group py-1 px-2 flex items-center justify-between cursor-pointer font-mono text-[11px] transition-all duration-150 ${
              isSelected 
                ? 'bg-[#1A1A1A] text-white border-l-2 border-[#FF4D00] font-bold' 
                : 'text-[#1A1A1A]/80 hover:bg-[#F2F1EE] hover:text-[#1A1A1A]'
            }`}
            onClick={() => {
              if (isDir) {
                toggleFolder(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
          >
            <div className="flex items-center space-x-1.5 overflow-hidden mr-1">
              {isDir ? (
                isExpanded ? (
                  <span className="text-[10px] font-bold text-[#FF4D00] shrink-0 font-sans">[-]</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 font-sans">[+]</span>
                )
              ) : (
                <span className={`text-[10px] shrink-0 font-sans ${isSelected ? 'text-[#FF4D00]' : 'text-slate-400'}`}>•</span>
              )}
              
              {editingPath === node.path ? (
                <input
                  id={`rename-input-${node.path}`}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRenameFile(node.path, renameValue);
                      setEditingPath(null);
                    } else if (e.key === 'Escape') {
                      setEditingPath(null);
                    }
                  }}
                  onBlur={() => {
                    onRenameFile(node.path, renameValue);
                    setEditingPath(null);
                  }}
                  className="bg-white border border-[#1A1A1A] rounded-none px-1 py-0.5 text-[10px] outline-none text-slate-800 w-32 font-mono"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}
            </div>

            <div className="hidden group-hover:flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                id={`rename-btn-${node.path.replace(/[^a-zA-Z0-9-]/g, '_')}`}
                onClick={() => {
                  setEditingPath(node.path);
                  setRenameValue(node.path);
                }}
                className={`p-0.5 rounded-none ${isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-[#1A1A1A]'}`}
                title="Rename"
              >
                <Edit className="w-3 h-3" />
              </button>
              
              {isDir && (
                <button
                  id={`add-file-btn-${node.path.replace(/[^a-zA-Z0-9-]/g, '_')}`}
                  onClick={() => {
                    setActiveFolderCreate(node.path);
                    setExpandedFolders(prev => ({ ...prev, [node.path]: true }));
                  }}
                  className={`p-0.5 rounded-none ${isSelected ? 'text-white/60 hover:text-[#FF4D00]' : 'text-slate-400 hover:text-[#FF4D00]'}`}
                  title="New File Inside"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
              
              <button
                id={`delete-btn-${node.path.replace(/[^a-zA-Z0-9-]/g, '_')}`}
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${node.name}"${isDir ? ' and all its file contents' : ''}?`)) {
                    onDeleteFile(node.path);
                  }
                }}
                className={`p-0.5 rounded-none ${isSelected ? 'text-white/60 hover:text-rose-400' : 'text-slate-400 hover:text-red-500'}`}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isDir && isExpanded && (
            <div className="mt-0.5 border-l border-[#E0DED7] ml-2">
              {activeFolderCreate === node.path && (
                <div className="py-1 px-1.5 flex items-center space-x-1" style={{ paddingLeft: `${(level + 1) * 10 + 6}px` }}>
                  <input
                    id={`folder-new-file-input-${node.path}`}
                    type="text"
                    placeholder="filename..."
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="bg-white border border-[#1A1A1A] rounded-none px-1.5 py-0.5 text-[10px] outline-none text-slate-800 font-mono w-28"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (newFileName.trim()) {
                          onCreateFile(`${node.path}/${newFileName.trim()}`);
                          setNewFileName('');
                          setActiveFolderCreate(null);
                        }
                      } else if (e.key === 'Escape') {
                        setActiveFolderCreate(null);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    id={`folder-new-file-ok-${node.path}`}
                    onClick={() => {
                      if (newFileName.trim()) {
                        onCreateFile(`${node.path}/${newFileName.trim()}`);
                        setNewFileName('');
                        setActiveFolderCreate(null);
                      }
                    }}
                    className="p-1 px-2 bg-[#1A1A1A] text-white text-[9px] hover:bg-[#FF4D00] rounded-none font-mono"
                  >
                    OK
                  </button>
                </div>
              )}
              {node.children && renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB] border-2 border-[#1A1A1A] rounded-none shadow-sm overflow-hidden" id="workspace-filetree">
      {/* Structural Header with border-b-2 */}
      <div className="p-4 border-b-2 border-[#1A1A1A] flex items-center justify-between bg-[#F2F1EE]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center space-x-2">
          <span>Tree Structure</span>
          <span className="bg-white text-[#1A1A1A] border border-[#1A1A1A] text-[9px] font-mono px-1.5 py-0.2 rounded-none font-bold">
            {files.length} PAYLOADS
          </span>
        </h3>
        
        <div className="flex items-center space-x-1">
          <button
            id="root-create-file-btn"
            onClick={() => {
              const name = prompt('Enter a new filename (e.g. index.html or styles/main.css):');
              if (name) onCreateFile(name);
            }}
            className="p-1 hover:bg-white border border-[#1A1A1A] rounded-none text-[#1A1A1A] hover:text-[#FF4D00] transition"
            title="Create File at root"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          
          <button
            id="root-create-folder-btn"
            onClick={() => {
              const name = prompt('Enter a folder name:');
              if (name) onCreateFolder(name);
            }}
            className="p-1 hover:bg-white border border-[#1A1A1A] rounded-none text-[#1A1A1A] hover:text-[#FF4D00] transition"
            title="Create Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Structured Payload section */}
      <div className="p-4 border-b border-[#E0DED7] bg-[#F2F1EE]/40 text-center space-y-3">
        <label className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/60 block text-left">
          Load Assets
        </label>
        
        <div className="flex items-center justify-between gap-3">
          <label 
            id="upload-files-label"
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#B8B6AF] bg-white hover:border-[#1A1A1A] p-3 rounded-none cursor-pointer transition text-[10px] font-mono text-[#1A1A1A] font-semibold"
          >
            <Upload className="w-4 h-4 mb-1 text-[#FF4D00]" />
            <span>Files</span>
            <input 
              id="upload-files-file-input"
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>
          
          <label 
            id="upload-folder-label"
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#B8B6AF] bg-white hover:border-[#1A1A1A] p-3 rounded-none cursor-pointer transition text-[10px] font-mono text-[#1A1A1A] font-semibold"
          >
            <Folder className="w-4 h-4 mb-1 text-slate-500" />
            <span>Folder</span>
            <input 
              id="upload-folder-dir-input"
              type="file" 
              multiple 
              {...({ webkitdirectory: "", directory: "" } as any)}
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>
        </div>
        
        {/* Zip Extraction */}
        <div 
          id="zip-dropzone"
          className="text-xs flex items-center justify-center space-x-2 py-2 border border-[#1A1A1A] rounded-none bg-white font-mono hover:bg-[#F2F1EE] text-[#1A1A1A] transition cursor-pointer"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              
              try {
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(file);
                const extractedFiles: FileItem[] = [];
                
                for (const relativePath of Object.keys(zip.files)) {
                  const zipObj = zip.files[relativePath];
                  if (zipObj.dir) continue;
                  
                  const isBinary = !relativePath.endsWith('.html') && 
                                   !relativePath.endsWith('.css') && 
                                   !relativePath.endsWith('.js') && 
                                   !relativePath.endsWith('.json') &&
                                   !relativePath.endsWith('.svg') &&
                                   !relativePath.endsWith('.md');
                  
                  if (isBinary) {
                    const contentBase64 = await zipObj.async('base64');
                    extractedFiles.push({
                      path: relativePath,
                      content: contentBase64,
                      isBinary: true,
                    });
                  } else {
                    const contentText = await zipObj.async('string');
                    extractedFiles.push({
                      path: relativePath,
                      content: contentText,
                      isBinary: false,
                    });
                  }
                }
                
                if (extractedFiles.length > 0) {
                  onUploadFiles(extractedFiles);
                }
              } catch (err) {
                alert('Failed to parse ZIP archive correctly! Please try another package file.');
                console.error(err);
              }
            };
            input.click();
          }}
        >
          <FileArchive className="w-3.5 h-3.5 text-[#FF4D00]" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Upload ZIP Payload</span>
        </div>
      </div>

      {/* Directory content list */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 bg-[#FDFCFB]" id="filetree-scroller">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
            <FileCode className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-slate-500 font-serif italic text-xs">
              No files in current workspace.
            </p>
          </div>
        ) : (
          renderTree(treeData)
        )}
      </div>
    </div>
  );
}

