import React, { useRef } from 'react';
import { Save, Code, CheckCircle, HelpCircle } from 'lucide-react';
import { FileItem } from '../types';

interface CodeEditorProps {
  activeFile: FileItem | null;
  onCodeChange: (path: string, newContent: string) => void;
  onSave: () => void;
  isModified: boolean;
}

export default function CodeEditor({
  activeFile,
  onCodeChange,
  onSave,
  isModified,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      
      onCodeChange(activeFile!.path, newVal);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lines = activeFile && !activeFile.isBinary ? activeFile.content.split('\n') : [];
  
  return (
    <div className="flex flex-col h-full bg-[#1A1A1A] border-2 border-[#1A1A1A] rounded-none shadow-md overflow-hidden text-neutral-100" id="workspace-editor">
      {/* Editorial Header Bar (High Contrast Light Background) */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F2F1EE] border-b-2 border-[#1A1A1A] text-[#1A1A1A] shrink-0">
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <Code className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
          {activeFile ? (
            <div className="flex items-center space-x-2 overflow-hidden">
              <span className="font-mono text-xs font-bold text-[#1A1A1A] truncate pr-1">
                {activeFile.path}
              </span>
              {isModified ? (
                <span className="shrink-0 bg-[#FF4D00] text-white text-[9px] font-mono px-1.5 py-0.2 rounded-none font-bold uppercase tracking-wider">
                  Modified
                </span>
              ) : (
                <span className="shrink-0 bg-transparent border border-gray-400 text-gray-600 text-[9px] font-mono px-1.5 py-0.2 rounded-none flex items-center space-x-1 uppercase">
                  <span>Synced</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 font-sans text-xs">No active file selected</span>
          )}
        </div>

        {activeFile && !activeFile.isBinary && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Ctrl + S</span>
            <button
              id="editor-save-btn"
              onClick={onSave}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-none transition duration-150 flex items-center space-x-1 shrink-0 ${
                isModified 
                  ? 'bg-[#FF4D00] border-[#FF4D00] text-white hover:bg-[#1A1A1A] hover:border-[#1A1A1A]' 
                  : 'bg-transparent border-[#1A1A1A]/20 text-[#1A1A1A]/40 cursor-not-allowed'
              }`}
              disabled={!isModified}
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Canvas Container */}
      <div className="flex-1 flex overflow-hidden relative bg-[#1D1D1D]">
        {!activeFile ? (
          <div className="flex flex-col items-center justify-center m-auto p-6 text-center max-w-xs">
            <Code className="w-8 h-8 text-neutral-600 mb-2" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">Workspace Editor</h4>
            <p className="text-[11px] font-serif italic text-neutral-500 mt-2 leading-relaxed">
              Select one of the payload items from the folder list to adjust the source code dynamically.
            </p>
          </div>
        ) : activeFile.isBinary ? (
          <div className="flex flex-col items-center justify-center m-auto p-6 text-center">
            <HelpCircle className="w-8 h-8 text-[#FF4D00]/80 mb-2" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">Binary Resource</h4>
            <p className="text-[11px] font-serif italic text-neutral-500 mt-2 leading-relaxed max-w-[240px]">
              This is a compiled binary payload. Text editing is disabled.
            </p>
            {activeFile.path.match(/\.(png|jpe?g|gif|svg|webp)$/i) && (
              <div className="mt-4 p-2 bg-[#1A1A1A] border-2 border-[#1A1A1A]">
                <img
                  src={`data:image/${activeFile.path.split('.').pop()};base64,${activeFile.content}`}
                  alt={activeFile.path}
                  referrerPolicy="no-referrer"
                  className="max-h-32 max-w-xs object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Line Numbers column */}
            <div className="py-4 select-none bg-[#1A1A1A] text-right pr-3 pl-4 border-r border-[#1D1D1D] font-mono text-[10px] text-[#A1A1A1]/40 leading-6 w-12 shrink-0 overflow-hidden">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editing field */}
            <textarea
              id="code-editor-textarea"
              ref={textareaRef}
              value={activeFile.content}
              onChange={(e) => onCodeChange(activeFile.path, e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 bg-transparent outline-none border-none resize-none font-mono text-xs leading-6 text-neutral-100 focus:ring-0 overflow-y-auto overflow-x-auto w-full h-full"
              spellCheck={false}
              autoFocus
            />
          </>
        )}
      </div>

      {/* Editor status info bar */}
      {activeFile && (
        <div className="bg-[#1D1D1D] px-4 py-1.5 border-t border-[#1D1D1D] flex items-center justify-between text-[10px] text-neutral-500 font-mono shrink-0">
          <div>src/{activeFile.path}</div>
          <div className="flex items-center space-x-2">
            <span>LINES: {lines.length}</span>
            <span>|</span>
            <span>UTF-8</span>
          </div>
        </div>
      )}
    </div>
  );
}

