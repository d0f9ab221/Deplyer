import React, { useState, useEffect, useTransition } from 'react';
import { Sparkles, Terminal, Code, Upload, RefreshCw, Layers, ShieldCheck, Heart, Github, Info, FileCode } from 'lucide-react';
import FileTree from './components/FileTree';
import CodeEditor from './components/CodeEditor';
import LivePreview from './components/LivePreview';
import DeployPanel from './components/DeployPanel';
import { FileItem, DeployState } from './types';

// Elegant default project structure
const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Portfolio Web space</title>
  <!-- Tailwind for modern responsive presentation -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Space Grotesk', sans-serif;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col justify-between selection:bg-indigo-500/20">
  <header class="border-b border-zinc-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/80 z-10">
    <div class="flex items-center space-x-2.5">
      <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 animate-spin" style="animation-duration: 8s;"></div>
      <span class="font-bold text-sm tracking-tight text-white font-mono flex items-center">AuraSpace.dev</span>
    </div>
    <nav class="hidden sm:flex items-center space-x-6 text-xs text-zinc-400 font-medium">
      <a href="#about" class="hover:text-white transition">About</a>
      <a href="#capabilities" class="hover:text-white transition">Capabilities</a>
      <a href="#contact" class="hover:text-white transition">Get in Touch</a>
    </nav>
  </header>

  <main class="max-w-xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
    <div class="space-y-6">
      <span class="inline-flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-xxs font-mono px-2.5 py-0.5 rounded-full">
        <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
        <span>Online & Pages Workspace Ready</span>
      </span>

      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
        Dynamic code builds with modern aesthetics.
      </h1>

      <p class="text-zinc-400 text-sm leading-relaxed max-w-md">
        This is a fully-customisable live deployment workspace. Select the <code class="text-slate-200 font-mono italic">index.html</code> inside the editor panel, configure your GitHub repository title, and push seamlessly!
      </p>

      <div class="flex flex-wrap items-center gap-3 pt-2">
        <button onclick="triggerInteractiveDemo()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4.5 py-2.5 rounded-lg shadow-lg shadow-indigo-600/15 active:scale-98 transition cursor-pointer">
          Trigger Code Event
        </button>
        <a href="#capabilities" class="text-xs font-semibold text-zinc-400 hover:text-white transition">Explore Features &rarr;</a>
      </div>
    </div>
  </main>

  <footer class="border-t border-zinc-900/80 px-6 py-5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-3">
    <div>&copy; 2026 Valkyrie Space. Auto-pushed template</div>
    <div class="font-mono text-[10px] bg-zinc-900/60 border border-zinc-800/40 px-2 py-0.5 rounded">Deployed via Web Deployer System</div>
  </footer>

  <script>
    function triggerInteractiveDemo() {
      alert("Greetings! This dialog demonstrates script parsing and cross-frame event rendering inside our compiled preview container!");
    }
  </script>
</body>
</html>
`;

const defaultReadme = `# Aura Portfolio Web Space

Welcome to your pristine website workspace! This live code editor lets you modify everything inside the file list tree.

## Developer Quickstart
- Edit code inside the editor pane.
- Save changes using **Ctrl + S** or the **Sync Live Preview** buttons.
- Confirm alterations instantly via the interactive iframe emulator.
- Commit and publish to GitHub via the **Deploy Panel**.
`;

// Helper to strip common root directories from uploaded asset lists
function stripCommonDirectory(files: FileItem[]): FileItem[] {
  if (files.length <= 1) return files;
  
  const splitPaths = files.map(f => f.path.split('/'));
  const firstDir = splitPaths[0][0];
  
  if (splitPaths[0].length <= 1) return files;
  
  const allShareFirstDir = splitPaths.every(parts => parts.length > 1 && parts[0] === firstDir);
  
  if (allShareFirstDir) {
    const simplifiedFiles = files.map(f => ({
      ...f,
      path: f.path.substring(firstDir.length + 1)
    }));
    return stripCommonDirectory(simplifiedFiles);
  }
  
  return files;
}

export default function App() {
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 11));
  const [files, setFiles] = useState<FileItem[]>([
    { path: 'index.html', content: defaultHtml, isBinary: false },
    { path: 'README.md', content: defaultReadme, isBinary: false },
  ]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>('index.html');
  const [isPending, startTransition] = useTransition();

  // Track if the chosen active file is edited but unsaved to backend sync
  const [modifiedPaths, setModifiedPaths] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const [deployState, setDeployState] = useState<DeployState>({
    status: 'idle',
    message: '',
  });

  // Load the selected file info safely
  const activeFile = selectedFilePath ? files.find(f => f.path === selectedFilePath) || null : null;

  // Sync workspace files with the preview backend
  const syncWithBackend = async (filesToSync = files) => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/preview/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          files: filesToSync,
        }),
      });

      if (res.ok) {
        setSyncStatus('success');
        setModifiedPaths({});
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Core sync error:', err);
      setSyncStatus('error');
    }
  };

  // Sync automatically upon initial load
  useEffect(() => {
    syncWithBackend();
  }, []);

  // Hotkey support for saving (Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (Object.keys(modifiedPaths).length > 0) {
          syncWithBackend();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, modifiedPaths]);

  // Handle local text editing
  const handleCodeChange = (path: string, newContent: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.path === path ? { ...file, content: newContent } : file))
    );
    setModifiedPaths((prev) => ({ ...prev, [path]: true }));
  };

  // Add new file to workspace directory tree
  const handleCreateFile = (pathValue: string) => {
    // Basic validations
    if (!pathValue) return;
    const cleanPath = pathValue.startsWith('/') ? pathValue.substring(1) : pathValue;
    if (files.some((f) => f.path === cleanPath)) {
      alert('This file path already exists in workspace.');
      return;
    }

    const newFile: FileItem = {
      path: cleanPath,
      content: cleanPath.endsWith('.html') 
        ? '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>New Web Page</h1>\n</body>\n</html>'
        : cleanPath.endsWith('.css') 
        ? '/* CSS Stylesheet */'
        : '/* JavaScript modules */',
      isBinary: false,
    };

    const nextFiles = [...files, newFile];
    setFiles(nextFiles);
    setSelectedFilePath(cleanPath);
    syncWithBackend(nextFiles);
  };

  // Add new directories
  const handleCreateFolder = (dirPath: string) => {
    if (!dirPath) return;
    const cleanDir = dirPath.startsWith('/') ? dirPath.substring(1) : dirPath;
    const dummyFile = `${cleanDir}/.keep`; // standard keep file for empty git tracking
    
    if (files.some((f) => f.path === dummyFile)) {
      alert('This folder structure is already registered.');
      return;
    }

    const newKeep: FileItem = {
      path: dummyFile,
      content: '# Directory keep file',
      isBinary: false,
    };

    const nextFiles = [...files, newKeep];
    setFiles(nextFiles);
    syncWithBackend(nextFiles);
  };

  // Remove files
  const handleDeleteFile = (pathValue: string) => {
    const nextFiles = files.filter((f) => !f.path.startsWith(pathValue));
    setFiles(nextFiles);
    
    if (selectedFilePath?.startsWith(pathValue)) {
      const remainingText = nextFiles.find(f => !f.isBinary);
      setSelectedFilePath(remainingText ? remainingText.path : null);
    }
    
    syncWithBackend(nextFiles);
  };

  // Path renaming
  const handleRenameFile = (oldPath: string, newPath: string) => {
    if (!newPath || oldPath === newPath) return;
    
    const cleanNew = newPath.replace(/^\//, '');
    if (files.some((f) => f.path === cleanNew)) {
      alert('Destination name already details another resource.');
      return;
    }

    const nextFiles = files.map((file) => {
      if (file.path === oldPath) {
        return { ...file, path: cleanNew };
      }
      if (file.path.startsWith(oldPath + '/')) {
        const relativePart = file.path.substring(oldPath.length);
        return { ...file, path: cleanNew + relativePart };
      }
      return file;
    });

    setFiles(nextFiles);
    if (selectedFilePath === oldPath) {
      setSelectedFilePath(cleanNew);
    } else if (selectedFilePath?.startsWith(oldPath + '/')) {
      setSelectedFilePath(cleanNew + selectedFilePath.substring(oldPath.length));
    }
    syncWithBackend(nextFiles);
  };

  // Custom multi-files / unzip uploads
  const handleUploadFiles = (uploaded: FileItem[]) => {
    // Strip common parent folder names if they were uploaded as a nested single root folder
    const stripped = stripCommonDirectory(uploaded);
    
    // filter duplicates: overwrite existing matching paths
    const uploadedPaths = new Set(stripped.map((u) => u.path));
    const merged = [
      ...files.filter((f) => !uploadedPaths.has(f.path)),
      ...stripped,
    ];
    setFiles(merged);
    
    // Auto select first file if it's text
    const indexHtml = stripped.find((u) => u.path === 'index.html' || u.path.endsWith('/index.html'));
    if (indexHtml) {
      setSelectedFilePath(indexHtml.path);
    } else {
      const firstText = stripped.find((u) => !u.isBinary);
      if (firstText) setSelectedFilePath(firstText.path);
    }

    syncWithBackend(merged);
  };

  // Push compile direct deploy hook
  const handleDeploy = async (config: {
    token: string;
    repoName: string;
    description: string;
    isPrivate: boolean;
  }) => {
    setDeployState({
      status: 'preparing',
      message: 'Compiling project bundle files...',
    });

    try {
      const res = await fetch('/api/github/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          files,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeployState({
          status: 'success',
          message: data.message,
          repoUrl: data.repoUrl,
          pagesUrl: data.pagesUrl,
        });
      } else {
        setDeployState({
          status: 'error',
          message: 'Process interrupted.',
          error: data.error || 'Server rejected credentials or payload limits.',
        });
      }
    } catch (err: any) {
      setDeployState({
        status: 'error',
        message: 'Network timeout.',
        error: err?.message || 'Check terminal status values.',
      });
    }
  };

  const handleResetDeploy = () => {
    setDeployState({
      status: 'idle',
      message: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-sans select-none antialiased" id="web-deployer-root">
      {/* 1. Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline p-6 sm:p-8 border-b-2 border-[#1A1A1A] gap-4 bg-[#FDFCFB] sticky top-0 z-20 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-amber-600 mb-1">
            WORKSPACE SESSION ID / {sessionId}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none italic font-serif">
            MANIFEST_001
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end font-sans">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF4D00] rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest font-mono">Systems: Active</span>
          </div>
          <span className="text-[10px] mt-1 opacity-60 font-mono italic">
            Web Deployer v2.0.1 Stable
          </span>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#FDFCFB]/40">
        {/* Left Side Column: Files Tree (Span 3) */}
        <div className="lg:col-span-3 flex flex-col min-h-[380px]">
          <FileTree
            files={files}
            selectedFilePath={selectedFilePath}
            onSelectFile={setSelectedFilePath}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onUploadFiles={handleUploadFiles}
          />
        </div>

        {/* Center Main Column: Code Editor (Span 4) */}
        <div className="lg:col-span-4 flex flex-col min-h-[380px]">
          <CodeEditor
            activeFile={activeFile}
            onCodeChange={handleCodeChange}
            onSave={syncWithBackend}
            isModified={!!(selectedFilePath && modifiedPaths[selectedFilePath])}
          />
        </div>

        {/* Right Side Column: Live preview & Deploy layout (Span 5) */}
        <div className="lg:col-span-5 flex flex-col space-y-6 min-h-[380px]">
          <div className="flex-1 min-h-[300px]">
            <LivePreview
              sessionId={sessionId}
              files={files}
              syncStatus={syncStatus}
              onForceSync={() => syncWithBackend()}
            />
          </div>

          <div className="shrink-0">
            <DeployPanel
              files={files}
              onDeploy={handleDeploy}
              deployState={deployState}
              onResetDeploy={handleResetDeploy}
            />
          </div>
        </div>
      </main>

      {/* 3. Ticker / Status Footer */}
      <footer className="border-t-2 border-[#1A1A1A] py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between bg-[#FDFCFB] gap-4 shrink-0 font-mono text-[10px] leading-relaxed">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-widest text-[#FF4D00]">STABILITY STATUS</span>
          <div className="h-px w-6 bg-[#1A1A1A]"></div>
          <span className="opacity-70 truncate max-w-xs sm:max-w-md">
            [10:14:45] Auto-sync pipeline initialized correctly. {files.length} active workspace payloads available.
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-right">
          <span className="opacity-50 italic">verified build 8.22.4</span>
          <span className="font-bold uppercase tracking-wide">© 2026 DEPLOYER_CORE</span>
        </div>
      </footer>
    </div>
  );
}
