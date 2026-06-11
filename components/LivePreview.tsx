import React, { useRef, useState, useEffect } from 'react';
import { RotateCw, ExternalLink, RefreshCw, Terminal, Eye, AlertCircle, Sparkles } from 'lucide-react';

interface LivePreviewProps {
  sessionId: string;
  files: any[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onForceSync: () => void;
}

export default function LivePreview({
  sessionId,
  files,
  syncStatus,
  onForceSync,
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); 
  const [currentPath, setCurrentPath] = useState(''); 
  const [logs, setLogs] = useState<Array<{ type: 'log' | 'error' | 'info'; text: string; time: string }>>([
    { type: 'info', text: 'Live preview server initialised.', time: new Date().toLocaleTimeString() }
  ]);

  const previewBaseUrl = `/api/preview/${sessionId}`;
  const fullPreviewUrl = currentPath ? `${previewBaseUrl}/${currentPath}` : `${previewBaseUrl}/`;

  useEffect(() => {
    if (syncStatus === 'syncing') {
      addLog('info', 'Synchronising workspace files with live preview engine...');
    } else if (syncStatus === 'success') {
      addLog('info', `Workspace synced successfully! Rendered ${files.length} active files.`);
      reloadIframe();
    } else if (syncStatus === 'error') {
      addLog('error', 'Sync failed. Ensure files are properly formatted without compile errors.');
    }
  }, [syncStatus, files.length]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.source === 'preview-iframe-console') {
        const { type, message } = e.data;
        addLog(type, message);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addLog = (type: 'log' | 'error' | 'info', text: string) => {
    setLogs((prev) => [
      ...prev,
      { type, text, time: new Date().toLocaleTimeString() }
    ].slice(-50)); 
  };

  const reloadIframe = () => {
    setKey((prev) => prev + 1);
  };

  const htmlFiles = files.filter(f => f.path.endsWith('.html'));
  const hasHtmlFiles = htmlFiles.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB] border-2 border-[#1A1A1A] rounded-none shadow-sm overflow-hidden" id="workspace-preview-panel">
      {/* Dynamic Browser Bar */}
      <div className="flex items-center space-x-2 px-3 py-2.5 bg-[#F2F1EE] border-b-2 border-[#1A1A1A] shrink-0">
        <div className="flex space-x-1 shrink-0">
          <div className="w-2.5 h-2.5 bg-[#1A1A1A]" />
          <div className="w-2.5 h-2.5 bg-[#1A1A1A]" />
          <div className="w-2.5 h-2.5 bg-[#1A1A1A]" />
        </div>

        {/* Address Input Simulation */}
        <div className="flex-1 flex items-center space-x-1 bg-white text-[#1A1A1A] rounded-none py-1 px-2.5 border-2 border-[#1A1A1A] overflow-hidden">
          <Eye className="w-3 h-3 text-[#1A1A1A] shrink-0" />
          <span className="font-mono text-[9px] text-[#A1A1A1] select-none shrink-0 uppercase tracking-wider">local/</span>
          <input
            id="preview-path-input"
            type="text"
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            placeholder="index.html"
            className="flex-1 outline-none border-none font-mono text-[10px] text-[#1A1A1A] bg-transparent w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                reloadIframe();
              }
            }}
          />
          {syncStatus === 'syncing' ? (
            <RefreshCw className="w-3 h-3 animate-spin text-[#FF4D00]" />
          ) : (
            <button
              id="preview-reload-btn"
              onClick={reloadIframe}
              className="hover:text-[#FF4D00] transition"
              title="Reload"
            >
              <RotateCw className="w-3 h-3 text-[#1A1A1A]" />
            </button>
          )}
        </div>

        {/* Multi-page viewport quick jumper selector */}
        {htmlFiles.length > 1 && (
          <select
            id="preview-page-select"
            value={currentPath}
            onChange={(e) => {
              setCurrentPath(e.target.value);
              reloadIframe();
            }}
            className="hidden sm:block text-[10px] font-mono font-bold uppercase bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-1 outline-none focus:border-[#FF4D00] max-w-[130px] rounded-none"
            title="Switch Active Page View"
          >
            <option value="">Index.html</option>
            {htmlFiles.map(hf => {
              if (hf.path === 'index.html') return null;
              return (
                <option key={hf.path} value={hf.path}>
                  {hf.path.length > 14 ? hf.path.substring(0, 12) + '..' : hf.path}
                </option>
              );
            })}
          </select>
        )}

        {/* Sync Action and Extract Link */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            id="force-sync-btn"
            onClick={onForceSync}
            className="p-1 px-2.5 bg-[#1A1A1A] hover:bg-[#FF4D00] text-white rounded-none text-[9px] font-mono font-bold uppercase border-2 border-[#1A1A1A] hover:border-[#FF4D00] transition"
            title="Immediate Live Sync"
          >
            Sync
          </button>
          
          <a
            id="preview-external-link"
            href={fullPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 bg-white hover:bg-[#F2F1EE] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-none transition"
            title="Open preview in a separate tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Frame Viewport or Explanatory State */}
      <div className="flex-1 bg-white relative flex flex-col min-h-[220px]">
        {files.length === 0 ? (
          <div className="m-auto p-6 text-center max-w-sm flex flex-col items-center">
            <Sparkles className="w-6 h-6 text-[#FF4D00] mb-2 animate-pulse" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">Preview Viewport</h4>
            <p className="text-[11px] font-serif italic text-slate-500 mt-2 leading-relaxed">
              Upload folder assets or bundle structures to render live outcomes.
            </p>
          </div>
        ) : !hasHtmlFiles ? (
          <div className="m-auto p-6 text-center max-w-sm flex flex-col items-center">
            <AlertCircle className="w-6 h-6 text-[#FF4D00] mb-2" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">No HTML Viewable</h4>
            <p className="text-[11px] font-serif italic text-slate-500 mt-2 leading-relaxed">
              Your static repository lacks an <b>index.html</b> or other HTML files inside the context.
            </p>
          </div>
        ) : (
          <iframe
            id="preview-iframe"
            key={key}
            ref={iframeRef}
            src={fullPreviewUrl}
            title="Static Web Preview"
            className="w-full h-full border-none flex-1 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>

      {/* Interactive Logs Console */}
      <div className="h-28 bg-[#1A1A1A] border-t-2 border-[#1A1A1A] flex flex-col text-[#FDFCFB] font-mono shrink-0" id="preview-console-container">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#F2F1EE] border-b-2 border-[#1A1A1A] text-[#1A1A1A] shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <Terminal className="w-3 h-3 text-[#FF4D00]" />
            <span>Telemetry Stream Logs</span>
          </span>
          <button
            id="clear-logs-btn"
            onClick={() => setLogs([])}
            className="text-[9px] font-bold uppercase text-[#1A1A1A]/60 hover:text-[#FF4D00]"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 p-2 overflow-y-auto space-y-1 text-[10px] leading-relaxed" id="preview-console-logs">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start space-x-1">
              <span className="text-neutral-500 font-bold">[{log.time}]</span>
              <span className={`px-1 text-[8px] font-bold uppercase tracking-wide select-none ${
                log.type === 'error' ? 'text-[#FF4D00]' :
                log.type === 'info' ? 'text-amber-500' :
                'text-neutral-300'
              }`}>
                {log.type}
              </span>
              <span className={`${log.type === 'error' ? 'text-[#FF4D00]' : log.type === 'info' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                {log.text}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-neutral-600 italic text-[9px] text-center pt-2">No active stream signals registered.</div>
          )}
        </div>
      </div>
    </div>
  );
}

